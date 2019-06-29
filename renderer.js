"use strict"

const Shaders = require("./shaders");
const ShaderBuilder = require("./shaderbuilder");

const glMatrix = require("gl-matrix");
const vec3 = glMatrix.vec3;
const mat4 = glMatrix.mat4;

function Renderer()
{	
	this.contextGL = null;
	this.mainProgram = null;
	this.programsMap = {};

	this.wireFrameBuffer = null;
	
	this.dummyTexture = null;
	this.lines = [];
	this.points = [];

	this.resourceManager = null;
	

	// let hasDrawBuffer = false;
	this.backgroundColor = {r: 0.5, g: 0.5, b: 0.5, a: 1.0};
	this.canvas = {width: 0, 
				  height: 0, 
				  element: null};

	this.viewMatrix = mat4.create();
	this.projectionMatrix = mat4.create();
	

	this.translation = vec3.create();
	this.scale = vec3.fromValues(1.0, 1.0, 1.0);
	this.rotation = mat4.create();

	this.version = 1;

	this.cullFace = false;

	this.enabledVertexAttribMap = [];
	this.attribDivisors = {};


	this.idManager = {_nextInstanceId : 1};

	this.disableClearDepth = false;
	this.disableClearColor = false;

	this.forceUseBlend = null; // null - set to batch decide, true - always use blend, false - never use blending
}

Renderer.prototype.loadShaders = function(id, vertexSource, fragmentSource, isInstance)
{
	let gl = this.contextGL.gl;
	let programId = id ? id : "_default";
	gl.useProgram(null);

	let program = ShaderBuilder.createProgram(vertexSource, fragmentSource, gl);
	
	if(program)
	{
		gl.useProgram(program);
		
		let positionVertex = gl.getAttribLocation(program, "position");
		
		let normalVertex = gl.getAttribLocation(program, "normal");
		
		let texcoord = gl.getAttribLocation(program, "texcoord");

		let model = gl.getAttribLocation(program, "model");

		let colorInstance = gl.getAttribLocation(program, "colorInstance");

		let translation = gl.getAttribLocation(program, "translation");

		let barycentric = gl.getAttribLocation(program, "barycentric");

		// let pickingInstance = gl.getAttribLocation(program, "pickingInstance");

		let attribs = [];
		if(positionVertex >= 0)
		{
			attribs.push(positionVertex);
		}
		if(normalVertex >= 0)
		{
			attribs.push(normalVertex);
		}

		if(texcoord >= 0)
		{
			attribs.push(texcoord);
		}

		if(colorInstance >= 0)
		{
			attribs.push(colorInstance);
		}

		if(translation >= 0)
		{
			attribs.push(translation);
		}

		if(barycentric >= 0)
		{
			attribs.push(barycentric);
		}

		let modelAttribs = []

		if(model >= 0)
		{
			attribs.push(model);
			modelAttribs.push(model);
			attribs.push(model+1);
			modelAttribs.push(model+1);
			attribs.push(model+2);
			modelAttribs.push(model+2);
			attribs.push(model+3);
			modelAttribs.push(model+3);
		}
		
		
		let projection = gl.getUniformLocation(program, "projection");
		let modelViewProjection = gl.getUniformLocation(program, "modelViewProjection");
		let modelViewUniform = gl.getUniformLocation(program, "modelView");
		let normalMatrixUniform = gl.getUniformLocation(program, "normalMatrix");
		let lightPositionUniform = gl.getUniformLocation(program, "lightPosition");
		let colorUniform = gl.getUniformLocation(program, "color");
		let useTextureUniform = gl.getUniformLocation(program, "useTexture");
		let unlitUniform = gl.getUniformLocation(program, "unlit");
		let isBillboardUniform = gl.getUniformLocation(program, "isBillboard");
		let texSamplerUniform = gl.getUniformLocation(program, "texSampler");

		let newProgram = {program: program,
				positionVertex: positionVertex,
				normalVertex: normalVertex,
				texcoord: texcoord,
				model: model,
				colorInstance: colorInstance,
				translation: translation,
				barycentric: barycentric,
				projectionUniform: projection,
				modelViewProjectionUniform: modelViewProjection,
				modelViewUniform: modelViewUniform,
				normalMatrixUniform: normalMatrixUniform,
				lightPositionUniform: lightPositionUniform,
				colorUniform: colorUniform,
				useTextureUniform: useTextureUniform,
				unlitUniform: unlitUniform,
				isBillboardUniform: isBillboardUniform,
				texSamplerUniform: texSamplerUniform,
				id: programId,
				attribs: attribs,
				modelAttribs: modelAttribs,
				isInstance: isInstance,
				};

		this.addProgram(newProgram, programId)
		gl.useProgram(null);
	}
}

Renderer.prototype.addProgram = function(newProgram, programId)
{
	this.programsMap[programId] = newProgram;
}

Renderer.prototype.draw = function(batches)
{
	let gl = this.contextGL.gl;
	let ext = this.contextGL.ext;

	if(!gl)
	{
		return;
	}
	
	// Clear screen
	if(!this.disableClearColor && !this.disableClearDepth)
	{
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	}
	else if(this.disableClearColor && !this.disableClearDepth)
	{
		gl.clear(gl.DEPTH_BUFFER_BIT);
	}
	else if(!this.disableClearColor && this.disableClearDepth)
	{
		gl.clear(gl.COLOR_BUFFER_BIT );
	}
	
	if(!batches.hasBatches())
	{
		return;
	}

	
	// Default matrices
	let m = mat4.create();
	let mv = mat4.create();
	let mvp = mat4.create();
	let p = this.projectionMatrix;
	let v = this.viewMatrix;
	let normalMatrix = mat4.create();
	
	// Variables to hold program state
	let currentProgram = null;
	let currentVertexBufferId = null;
	let currentElementBufferId = null;
	let currentModelBufferId = null;
	let currentColorBufferId = null;
	let currentTextureId = null;
	let blendEnabled = false;
	let depthMaskEnabled = true;
	let unlintSet = false;
	let billboardSet = false;

	gl.activeTexture(gl.TEXTURE0);

	for(let i = 0; i < batches.batchesKeys.length; i++)
	{
		// let b = this.batches[batches.batchesKeys[i]];
		let b = batches.batches[batches.batchesKeys[i]];
		if(!b.visible)
		{
			continue;
		}

		// Bind shader
		let program = null;
		if(!b.programId)
		{
			program = this.mainProgram;
		}

		program = this.programsMap[b.programId];

		if(program === null)
		{
			continue;
		}

		// Setup initial parameters for program
		if(currentProgram !== program)
		{
			currentProgram = program;
			_enableAttribs.call(this, currentProgram.attribs);
			gl.useProgram(currentProgram.program);
			
			// Eye light position 
			let eyeLightPosition = vec3.fromValues(0.0, 0.0, 0.0);
			gl.uniform3fv(currentProgram.lightPositionUniform, eyeLightPosition);
			
			unlintSet = b.unlit;
			gl.uniform1f(currentProgram.unlitUniform, unlintSet ? 1.0 : 0.0);

			billboardSet = b.isBillboard;
			gl.uniform1f(currentProgram.isBillboardUniform, billboardSet ? 1.0 : 0.0);
		
		}
		
		if(b.unlit !== unlintSet)
		{
			unlintSet = b.unlit;
			gl.uniform1f(currentProgram.unlitUniform, unlintSet ? 1.0 : 0.0);
		}

		if(b.isBillboard !== billboardSet)
		{
			billboardSet = b.isBillboard;
			gl.uniform1f(currentProgram.isBillboardUniform, billboardSet ? 1.0 : 0.0);
		}
		
		// Setup model matrix
		if(!currentProgram.isInstance || b.isPointMesh)
		{
			mat4.copy(m, b.transform);
		}
		else
		{
			mat4.identity(m);
		}
		
		mat4.identity(normalMatrix);
		
		// Model view projection
		mat4.scale(m, m, this.scale);
		mat4.multiply(m, this.rotation, m);
		mat4.multiply(mv, v, m);
		mat4.multiply(mvp, p, mv);

		// gl.uniform1f(currentProgram.unlitUniform, 1.0);

		// Normal matrix
		mat4.invert(normalMatrix, mv);
		mat4.transpose(normalMatrix, normalMatrix);

		// Transforms
		gl.uniformMatrix4fv(currentProgram.projectionUniform, false, p);
		gl.uniformMatrix4fv(currentProgram.modelViewUniform, false, mv);
		gl.uniformMatrix4fv(currentProgram.modelViewProjectionUniform, false, mvp);
		gl.uniformMatrix4fv(currentProgram.normalMatrixUniform, false, normalMatrix);
		
		// Vertex Size = (2 * (vertex & normal) + 2 * nom) * 3 components (x, y, z) * 4 bytes (float)
		let vertexSize = (3 + 3 + 2) * 4;
		
		if(currentVertexBufferId !== b.mesh.verticesBufferId)
		{
			gl.bindBuffer(gl.ARRAY_BUFFER, b.mesh.verticesBufferId);
			gl.vertexAttribPointer(currentProgram.positionVertex, 3, gl.FLOAT, false, vertexSize, 0);
			gl.vertexAttribPointer(currentProgram.normalVertex, 3, gl.FLOAT, false, vertexSize, 3 * 4); // 3 components x 4 bytes per float		
			gl.vertexAttribPointer(currentProgram.texcoord, 2, gl.FLOAT, false, vertexSize, 3 * 4 + 3 * 4);

			currentVertexBufferId = b.mesh.verticesBufferId;
		}

		if(b.isWireframe && this.wireFrameBuffer)
		{
			gl.bindBuffer(gl.ARRAY_BUFFER, this.wireFrameBuffer);
			gl.vertexAttribPointer(currentProgram.barycentric, 3, gl.FLOAT, false, 3 * 4, 0);
		}

		if(currentProgram.isInstance)
		{
			if(currentModelBufferId !== b.modelBufferId && b.isPointMesh)
			{
				gl.bindBuffer(gl.ARRAY_BUFFER, b.modelBufferId);
				gl.vertexAttribPointer(currentProgram.translation, 3, gl.FLOAT, false, 3 * 4, 0);
				_setAttribDivisors.call(this, currentProgram.translation, 1);
				currentModelBufferId = b.modelBufferId;
			}
			else if(currentModelBufferId !== b.modelBufferId)
			{
				gl.bindBuffer(gl.ARRAY_BUFFER, b.modelBufferId);
				let rowSize = 4 * 4 ; //  4 columns * 4 bytes
				let matrixSize = 4 * rowSize; // 4  * rows
				for(let i = 0; i < 4; i++)
				{
					gl.vertexAttribPointer(currentProgram.model + i, 4, gl.FLOAT, false, matrixSize, i * rowSize);
				}
				_setAttribDivisors.call(this, currentProgram.modelAttribs, 1);
				currentModelBufferId = b.modelBufferId;
			}

			if(currentColorBufferId !== b.colorBufferId)
			{
				let colorSize = 4;
				gl.bindBuffer(gl.ARRAY_BUFFER, b.colorBufferId);
				gl.vertexAttribPointer(currentProgram.colorInstance, 4, gl.UNSIGNED_BYTE, true, colorSize, 0);
				_setAttribDivisors.call(this, [currentProgram.colorInstance], 1);
				currentColorBufferId = b.colorBufferId;
			}
		}
		
		if(currentElementBufferId !== b.mesh.elementsBufferId)
		{
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.mesh.elementsBufferId);
			currentElementBufferId = b.mesh.elementsBufferId;
		}
		
		// if(b.textureName && this.textureMap.hasOwnProperty(b.textureName) )
		if(b.textureName && this.resourceManager.textureMap.hasOwnProperty(b.textureName) )
		{
			// let textureId = this.textureMap[b.textureName];
			let textureId = this.resourceManager.textureMap[b.textureName];
			
			if(currentTextureId !== textureId)
			{
				gl.uniform1i(program.texSamplerUniform, 0);
				gl.bindTexture(gl.TEXTURE_2D, textureId);
				gl.uniform1f(currentProgram.useTextureUniform, 1.0);
				currentTextureId = textureId;
			}
		}			
		else 
		{
			if(currentTextureId !== this.dummyTexture)
			{
				gl.uniform1i(program.texSamplerUniform, 0);
				gl.bindTexture(gl.TEXTURE_2D, this.dummyTexture);
				gl.uniform1f(currentProgram.useTextureUniform, 0.0);
				currentTextureId = this.dummyTexture;
			}
		}

		if(!currentProgram.isInstance)
		{
			gl.uniform4fv(currentProgram.colorUniform, b.color);
		}

		// Setup blend for proper drawing transparent objects
		if(this.forceUseBlend === true && !blendEnabled)
		{
			gl.enable(gl.BLEND);
			blendEnabled = true;
		}
		else if(this.forceUseBlend === false && blendEnabled)
		{
			gl.disable(gl.BLEND);
			blendEnabled = false;
		}
		else if((!b.useBlending && !b.isWireframe) && blendEnabled)
		{
			gl.disable(gl.BLEND);
			blendEnabled = false;
		}
		else if((b.useBlending || b.isWireframe) && !blendEnabled)
		{
			gl.enable(gl.BLEND);
			blendEnabled = true;
		}

		if(!b.useDepthMask && !depthMaskEnabled)
		{
			gl.depthMask(true);
			depthMaskEnabled = true;
		}
		else if(b.useDepthMask && depthMaskEnabled)
		{
			gl.depthMask(false);
			depthMaskEnabled = false;
		}
		
		if(currentProgram.isInstance)
		{
			ext.drawElementsInstanced(gl.TRIANGLES, b.mesh.count, gl.UNSIGNED_SHORT, 0, b.instanceCount);
			// this.instanceExt.drawElementsInstancedANGLE(gl.LINES, b.mesh.count, gl.UNSIGNED_SHORT, 0, b.instanceCount);
		}
		else
		{
			gl.drawElements(gl.TRIANGLES, b.mesh.count, gl.UNSIGNED_SHORT, 0);
			// gl.drawElements(gl.LINES, b.mesh.count, gl.UNSIGNED_SHORT, 0);
		}
	}

	// Draw Lines
	if(batches.lines.length > 0)
	{
		currentProgram = this.mainProgram;
		_enableAttribs.call(this, currentProgram.attribs);
		gl.useProgram(currentProgram.program);

		mat4.identity(m);
		mat4.multiply(mv, v, m);
		mat4.multiply(mvp, p, mv);

		gl.uniform1f(currentProgram.unlitUniform, 1.0);
		gl.uniformMatrix4fv(currentProgram.modelViewUniform, false, mv);
		gl.uniformMatrix4fv(currentProgram.modelViewProjectionUniform, false, mvp);

		for(let i =0 ; i < batches.lines.length; i++)
		{
			let l = batches.lines[i];

			gl.uniform1i(currentProgram.texSamplerUniform, 0);
			gl.bindTexture(gl.TEXTURE_2D, this.dummyTexture);
			gl.uniform1f(currentProgram.useTextureUniform, 0.0);
			gl.uniform4fv(currentProgram.colorUniform, l.color);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, l.verticesBufferId);
			gl.vertexAttribPointer(currentProgram.positionVertex, 3, gl.FLOAT, false, l.vertexSize, 0);
			gl.vertexAttribPointer(currentProgram.normalVertex, 3, gl.FLOAT, false, l.vertexSize, 0); // 3 components x 4 bytes per float		
			gl.vertexAttribPointer(currentProgram.texcoord, 2, gl.FLOAT, false, l.vertexSize, 0);
			
			gl.drawArrays(gl.LINES, 0, l.count);
		}
	}
	

	// Draw Points
	if(batches.points.length > 0)
	{
		currentProgram = this.mainProgram;
		_enableAttribs.call(this, currentProgram.attribs);
		gl.useProgram(currentProgram.program);		

		gl.uniform1f(currentProgram.unlitUniform, 1.0);
		
		for(let i = 0; i < batches.points.length; i++)
		{
			let point = this.points[i];

			mat4.copy(m, point.transform);
			mat4.multiply(mv, v, m);
			mat4.multiply(mvp, p, mv);

			gl.uniformMatrix4fv(currentProgram.modelViewUniform, false, mv);
			gl.uniformMatrix4fv(currentProgram.modelViewProjectionUniform, false, mvp);

			gl.uniform1i(currentProgram.texSamplerUniform, 0);
			gl.bindTexture(gl.TEXTURE_2D, this.dummyTexture);
			gl.uniform1f(currentProgram.useTextureUniform, 0.0);
			gl.uniform4fv(currentProgram.colorUniform, point.color);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, point.verticesBufferId);
			gl.vertexAttribPointer(currentProgram.positionVertex, 3, gl.FLOAT, false, point.vertexSize, 0);
			gl.vertexAttribPointer(currentProgram.normalVertex, 3, gl.FLOAT, false, point.vertexSize, 0); // 3 components x 4 bytes per float		
			gl.vertexAttribPointer(currentProgram.texcoord, 2, gl.FLOAT, false, point.vertexSize, 0);
			
			gl.drawArrays(gl.LINES, 0, point.count);
			// gl.drawArrays(gl.POINTS, 0, point.count);
		}
	}

	// Restore default state
	if(blendEnabled)
	{
		gl.disable(gl.BLEND);
	}

	if(!depthMaskEnabled)
	{
		gl.depthMask(true);
	}

	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.useProgram(null);
	_enableAttribs.call(this, []);
	this.enabledVertexAttribMap = [];

	return true;
}

Renderer.prototype.setViewport = function(x, y, width, height, willDraw = false)
{
	let gl = this.contextGL.gl;
	if(gl)
	{
		gl.viewport(x, y, width, height);
	}
}


Renderer.prototype.clearForceBlending = function()
{
	this.forceUseBlend = null;
}

Renderer.prototype.setForceBlending = function(force)
{
	this.forceUseBlend = force;
}

Renderer.prototype.enablePolygonOffset = function(factor = -2, units = -3)
{
	let gl = this.contextGL.gl;
	gl.enable(gl.POLYGON_OFFSET_FILL);
	gl.polygonOffset(factor, units);
}

Renderer.prototype.disablePolygonOffset = function()
{
	let gl = this.contextGL.gl;
	gl.disable(gl.POLYGON_OFFSET_FILL);
}

Renderer.prototype.setDisableClear = function(disable)
{
	this.disableClearColor = disable;
	this.disableClearDepth = disable;
}

Renderer.prototype.setDisableClearDepth = function(disable)
{
	this.disableClearDepth = disable;
}

Renderer.prototype.setDisableClearColor = function(disable)
{
	this.disableClearColor = disable;
}

Renderer.prototype.enableCullface = function(cullFace)
{
	this.enableCullface = cullFace;
}

Renderer.prototype.setBackgroundColor = function(r, g, b, a)
{
	this.backgroundColor.r = r;
	this.backgroundColor.g = g;
	this.backgroundColor.b = b;
	this.backgroundColor.a = a;

	let gl = this.contextGL.gl;
	if(gl)
	{
		this.contextGL.gl.clearColor(r, g, b, a);
	}		
}

Renderer.prototype.setContext = function(context)
{
	this.contextGL = context;
}

Renderer.prototype.setResourceManager = function(manager)
{
	this.resourceManager = manager;
}

Renderer.prototype.setDummyTexture = function(texture)
{
	this.dummyTexture = texture;
}

Renderer.prototype.loadWireframeBuffer = function(sizeBytes = Math.pow(2, 16))
{
	let gl = this.contextGL.gl;
	let trianglesCount = Math.floor(sizeBytes / (3 * 3 * 4)); // 3 components x 3 vertices x 4 bytes per float

	let buffer = new Float32Array(trianglesCount * 3 * 3);

	for(let i =0; i < trianglesCount; i++)
	{
		// First triangle
		buffer[i * 9 + 0] = 1.0;
		buffer[i * 9 + 1] = 0.0;
		buffer[i * 9 + 2] = 0.0;

		// Second triangle
		buffer[i * 9 + 3] = 0.0;
		buffer[i * 9 + 4] = 1.0;
		buffer[i * 9 + 5] = 0.0;

		// Third triangle
		buffer[i * 9 + 6] = 0.0;
		buffer[i * 9 + 7] = 0.0;
		buffer[i * 9 + 8] = 1.0;
	}

	this.wireFrameBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.wireFrameBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW);
}

Renderer.prototype.load = function()
{
	let gl = this.contextGL.gl;

	this.hasInstancing = this.contextGL.hasInstancing;

	// gl.viewport(0, 0, this.canvas.width, this.canvas.height);

	// Load shaders
	this.loadShaders(Renderer.DEFAULT_PROGRAM_ID, Shaders.VERTEX_SHADER_SOURCE, Shaders.FRAGMENT_SHADER_SOURCE, false);

	this.loadShaders(Renderer.DEFAULT_WIREFRAME_PROGRAM_ID, Shaders.WIREFRAME_VERTEX_SHADER_SOURCE, Shaders.WIREFRAME_FRAGMENT_SHADER_SOURCE, false);

	if(this.contextGL.hasInstancing)
	{
		this.loadShaders(Renderer.INSTANCE_PROGRAM_ID, Shaders.INSTANCE_VERTEX_SHADER_SOURCE, Shaders.FRAGMENT_SHADER_SOURCE, true);

		this.loadShaders(Renderer.POINTMESH_PROGRAM_ID, Shaders.INSTANCE_POINT_MESH_VERTEX_SHADER, Shaders.FRAGMENT_SHADER_SOURCE, true);

		this.loadShaders(Renderer.INSTANCE_WIREFRAME_PROGRAM_ID, Shaders.WIREFRAME_INSTANCE_VERTEX_SHADER_SOURCE, Shaders.WIREFRAME_FRAGMENT_SHADER_SOURCE, true);
	}
	
	// Set clear color
	gl.clearColor(this.backgroundColor.r, this.backgroundColor.g, this.backgroundColor.b, this.backgroundColor.a);

	// Clear frame buffer
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	// Default setup
	gl.enable(gl.DEPTH_TEST);
	// gl.disable(gl.CULL_FACE);
	// gl.cullFace(gl.BACK);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	gl.depthFunc(gl.LEQUAL);
	gl.disable(gl.BLEND);

	// We always bind a default dummy texture
	this.dummyTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, this.dummyTexture);
	let dummyArray = [];
	let dummySize = 4;
	for(let i = 0; i < dummySize*dummySize; i++)
	{
		dummyArray.push(0);
	}
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(dummyArray));
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.bindTexture(gl.TEXTURE_2D, null);		

	// Init perspective matrix
	mat4.perspective(this.projectionMatrix, 45, this.canvas.width / this.canvas.height, 0.1, 100000.0);

	return true;
}


Renderer.prototype.setViewMatrix = function(viewMatrix)
{
	mat4.copy(this.viewMatrix, viewMatrix);
}

Renderer.prototype.setProjectionMatrix = function(projectionMatrix)
{
	// this.projectionMatrix = mat4.clone(projectionMatrix);
	mat4.copy(this.projectionMatrix, projectionMatrix);
}

Renderer.prototype.setPerspective = function(fov, ratio, near, far)
{
	// mat4.perspective(this.projectionMatrix, 45, canvas.width / canvas.height, 0.1, 100000.0);
	mat4.perspective(this.projectionMatrix, fov, ratio, near, far);
}

Renderer.prototype.setScale = function(newScale)
{
	this.scale = vec3.clone(newScale);
}

function _enableAttribs (attribs)
{
	let gl = this.contextGL.gl;
	for(let i = this.enabledVertexAttribMap.length - 1; i >= 0; i--)
	{
		let a = this.enabledVertexAttribMap[i];
		let idx = attribs.indexOf(a);
		if(idx < 0)
		{
			gl.disableVertexAttribArray(a);
			this.enabledVertexAttribMap.splice(idx, 1);
		}
	}
	
	for(let i = 0; i < attribs.length; i++)
	{
		let a = attribs[i];
		gl.enableVertexAttribArray(a);
		this.enabledVertexAttribMap.push(a);
	}
	let oldIds = Object.keys(this.attribDivisors);
	for(let i = 0; i < oldIds.length; i++)
	{
		let a = oldIds[i];
		if(attribs.indexOf(a) < 0)
		{
			if(this.attribDivisors[a] > 0)
			{
				this.contextGL.ext.vertexAttribDivisor(a, 0);
				this.attribDivisors[a] = 0;
			}
		}
	}
}

function _setAttribDivisors(attribs, size)
{
	if(!Array.isArray(attribs))
	{
		attribs = [attribs];
	}
	for(let i = 0; i < attribs.length; i++)
	{
		let a = attribs[i];
		if(this.attribDivisors.hasOwnProperty(a))
		{
			if(this.attribDivisors[a] !== size)
			{
				this.contextGL.ext.vertexAttribDivisor(a, size);
				this.attribDivisors[a] = size;
			}
		}
		else
		{
			this.contextGL.ext.vertexAttribDivisor(a, size);
			this.attribDivisors[a] = size;
		}
	}
	
}
	
Renderer.DEFAULT_PROGRAM_ID = "_default";
Renderer.INSTANCE_PROGRAM_ID = "_instance";
Renderer.POINTMESH_PROGRAM_ID = "_pointMesh";
Renderer.DEFAULT_WIREFRAME_PROGRAM_ID = "_defaultWireframe";
Renderer.INSTANCE_WIREFRAME_PROGRAM_ID = "_instanceWireframe";

module.exports = Renderer;