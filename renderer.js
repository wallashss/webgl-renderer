"use strict"

const Shaders = require("./shaders");
const ShaderBuilder = require("./shaderbuilder");
const FrameBuffer = require("./framebuffer");
// Global gl context... It is nice to debug.
let gl = null;

let TARGET_FPS = 60.0;
let dt = 1.0 / TARGET_FPS;

const glMatrix = require("gl-matrix");
const vec3 = glMatrix.vec3;
const vec4 = glMatrix.vec4;
const mat4 = glMatrix.mat4;

function Renderer()
{
	let self = this;
	let mainProgram = null;
	let instanceProgram = null;
	let programsMap = {}
	let dummyTexture = null;
	let batches = [];
	let lines = [];
	let textureMap = {};
	let hasInstancing = false;
	let backgroundColor = {r: 0.5, g: 0.5, b: 0.5, a: 1.0};
	let canvas = {width: 0, 
				  height: 0, 
				  element: undefined};
	let isAnimating = false;

	let _viewMatrix = mat4.create();

	this.translation = vec3.create();
	this.scale = vec3.fromValues(1.0, 1.0, 1.0);
	this.rotation = mat4.create();

	let enabledVertexAttribMap = [];
	let attribDivisors = {};

	let instanceExt = null;
	
	function enableAttribs (attribs)
	{
		for(let i = enabledVertexAttribMap.length - 1; i >= 0; i--)
		{
			let a = enabledVertexAttribMap[i];
			let idx = attribs.indexOf(a);
			if(idx < 0)
			{
				gl.disableVertexAttribArray(a);
				enabledVertexAttribMap.splice(idx, 1);
			}
		}
		
		for(let i = 0; i < attribs.length; i++)
		{
			let a = attribs[i];
			gl.enableVertexAttribArray(a);
			enabledVertexAttribMap.push(a);
		}
		let oldIds = Object.keys(attribDivisors);
		for(let i = 0; i < oldIds.length; i++)
		{
			let a = oldIds[i];
			if(attribs.indexOf(a) < 0)
			{
				if(attribDivisors[a] > 0)
				{
					
					instanceExt.vertexAttribDivisorANGLE(a, 0);
					attribDivisors[a] = 0;
				}
			}
		}
	}

	function setAttribDivisors(attribs, size)
	{
		for(let i = 0; i < attribs.length; i++)
		{
			let a = attribs[i];
			if(attribDivisors.hasOwnProperty(a))
			{
				if(attribDivisors[a] !== size)
				{
					instanceExt.vertexAttribDivisorANGLE(a, size);
					attribDivisors[a] = size;
				}
			}
			else
			{
				instanceExt.vertexAttribDivisorANGLE(a, size);
				attribDivisors[a] = size;
			}
		}
		
	}

	this.loadShaders = function(vertexSource, fragmentSource, id)
	{
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
			
			
			let modelViewProjection = gl.getUniformLocation(program, "modelViewProjection");
			let modelViewUniform = gl.getUniformLocation(program, "modelView");
			let normalMatrixUniform = gl.getUniformLocation(program, "normalMatrix");
			let lightPositionUniform = gl.getUniformLocation(program, "lightPosition");
			let colorUniform = gl.getUniformLocation(program, "color");
			let useTextureUniform = gl.getUniformLocation(program, "useTexture");
			let unlitUniform = gl.getUniformLocation(program, "unlit");
			let texSamplerUniform = gl.getUniformLocation(program, "texSampler");

			let isInstance = programId === Renderer.INSTACE_PROGRAM;

			let newProgram = {program: program,
					positionVertex: positionVertex,
					normalVertex: normalVertex,
					texcoord: texcoord,
					model: model,
					colorInstance: colorInstance,
					modelViewProjectionUniform: modelViewProjection,
					modelViewUniform: modelViewUniform,
					normalMatrixUniform: normalMatrixUniform,
					lightPositionUniform: lightPositionUniform,
					colorUniform: colorUniform,
					useTextureUniform: useTextureUniform,
					unlitUniform: unlitUniform,
					texSamplerUniform: texSamplerUniform,
					id: programId,
					attribs: attribs,
					modelAttribs: modelAttribs,
					isInstance: isInstance
					};

			if(programId === Renderer.DEFAULT_PROGRAM)
			{
				mainProgram = newProgram;
			}
			else if(programId === Renderer.INSTACE_PROGRAM)
			{
				instanceProgram = newProgram;
			}
			programsMap[programId] = newProgram;
			gl.useProgram(null);

		}
	}

	this.uploadBuffer = function(vertices)
	{
		let newBufferId = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, newBufferId);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
		
		return newBufferId;
	}

	this.uploadMesh = function(vertices, elements)
	{
		if(!vertices)
		{
			let err = "Vertices can not be null";
			throw err;
		}

		if(!elements)
		{
			let err = "Elements can not be null";
			throw err;
		}


		let verticesBufferId = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, verticesBufferId);

		if(vertices.constructor === Float32Array)
		{
			gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
		}
		else
		{
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
		}
		
		let elementsBufferId = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementsBufferId);
		if(elements.constructor !== Uint16Array)
		{
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(elements), gl.STATIC_DRAW);
		}
		else
		{
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elements, gl.STATIC_DRAW);
		}
		return {verticesBufferId: verticesBufferId, elementsBufferId: elementsBufferId, count: elements.length};
	}

	this.addObject = function(vertices, elements, color, transform, textureName)
	{
		let mesh = self.uploadMesh(vertices, elements);

		let t = mat4.create();
		if(transform)
		{
			mat4.copy(t, transform);
		}
		
		let c = vec4.fromValues(0.8, 0.8, 0.8, 1.0);
		if(!color)
		{
			c = vec4.clone(color);
		}
		
		
		batches.push({mesh: mesh,
				transform: t,
				color: color,
				textureName: textureName, 
				programId: Renderer.DEFAULT_PROGRAM});
	}

	function _addInstance(mesh, colors, matrices, textureName)
	{
		if(hasInstancing)
		{
			let modelBufferId = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, modelBufferId);

			let instanceCount = 0;
			if(matrices.constructor === Float32Array)
			{
				instanceCount = matrices.length / 16;
				gl.bufferData(gl.ARRAY_BUFFER, matrices, gl.STATIC_DRAW);
			}
			else
			{
				instanceCount = matrices.length;
				let matricesArray = new Float32Array(matrices.length * 16);
				for(let i = 0; i < matrices.length; i++)
				{
					let m = matrices[i];
					for(let j = 0; j < 16; j++)
					{
						matricesArray[i*16 + j] = m[j];
					}
				}
				gl.bufferData(gl.ARRAY_BUFFER, matricesArray, gl.STATIC_DRAW);
			}


			let colorBufferId = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, colorBufferId);

			if(colors.constructor === Float32Array)
			{
				gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
			}
			else
			{
				let colorArray = new Float32Array(colors.length * 4);
				for(let i = 0; i < colors.length; i++)
				{
					let c = colors[i];
					for(let j = 0; j < 4; j++)
					{
						colorArray[i*4 + j] = c[j];
					}
				}
				gl.bufferData(gl.ARRAY_BUFFER, colorArray, gl.STATIC_DRAW);
			}

			batches.push({mesh,
				modelBufferId: modelBufferId,
				instanceCount: instanceCount,
				colorBufferId: colorBufferId,
				textureName: textureName,
				programId: Renderer.INSTACE_PROGRAM});
			
		}
		else
		{
			for(let i  =0 ; i < matrices.length; i++)
			{
				let t = mat4.clone(matrices[i]);
				let c = vec4.clone(colors[i]);
	
				batches.push({mesh,
					transform: t,
					color: c,
					textureName: textureName,
					programId: Renderer.DEFAULT_PROGRAM});
			}
		}

	}
	this.addInstances = function(mesh, colors, matrices, textureName)
	{
		if(!matrices)
		{
			let err = "Matrices can not be null";
			throw err;
		}

		if(!colors)
		{
			let err = "Colors can not be null";
			throw err;
		}

		if((matrices.constructor != Float32Array || colors.constructor != Float32Array) && 
			colors.length !== matrices.length)
		{
			console.log("Colors and instances must have same length");
			return;
		}
		if((matrices.constructor === Float32Array || colors.constructor === Float32Array) && 
			(matrices.length / 16 !== colors.length /4 ))
		{
			console.log("Colors and instances must have same length");
			return;
		}
		_addInstance(mesh, colors, matrices, textureName);

	}
	this.addObjectInstances = function(vertices, elements, colors, matrices, textureName)
	{
		if(!matrices)
		{
			let err = "Matrices can not be null";
			throw err;
		}

		if(!colors)
		{
			let err = "Colors can not be null";
			throw err;
		}

		if((matrices.constructor != Float32Array || colors.constructor != Float32Array) &&
			colors.length !== matrices.length)
		{
			console.log("Colors and instances must have same length");
			return;
		}
		if((matrices.constructor === Float32Array || colors.constructor === Float32Array) && 
		(matrices.length / 16 !== colors.length /4 ))
		{
			console.log("Colors and instances must have same length");
			return;
		}

		let mesh = self.uploadMesh(vertices, elements);
		_addInstance(mesh, colors, matrices, textureName);
	}
	
	this.addLines = function(vertices, color)
	{
		let verticesBufferId = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, verticesBufferId);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);	
		
		if(!color)
		{
			color = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
		}
		
		lines.push({verticesBufferId: verticesBufferId,
					count: vertices.length / 3,
					vertexSize: 3 * 4, // 3 components * 4 bytes per float
					color: color});
	}
	
	this.addTexture = function(textureName, texture, isNearest)
	{
		let textureId = gl.createTexture();

		gl.bindTexture(gl.TEXTURE_2D, textureId);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture);

		isNearest = (isNearest !== null && isNearest !== undefined) ? isNearest : false;

		if(isNearest)
		{
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		}
		else
		{
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		}
		
		gl.bindTexture(gl.TEXTURE_2D, null);
		
		textureMap[textureName] = textureId;
		
		self.draw();
	}

	this.clearBatches = function()
	{
		for(let i = 0; i < batches.length; i++)
		{
			let b = batches[i];
			gl.deleteBuffer(b.verticesBufferId);
			gl.deleteBuffer(b.elementsBufferId);
		}
		batches = [];
	}

	this.draw = function()
	{
		// Clear screen
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		if(batches.length == 0 && lines.length == 0)
		{
			return;
		}
	
		// Bind shader
		
		let m = mat4.create();
		let v = _viewMatrix;
		let p = mat4.create();
		let mv = mat4.create();
		let mvp = mat4.create();
		mat4.perspective(p, 45, canvas.width / canvas.height, 0.1, 100000.0);
		
		let currentProgram = null;
		let currentVertexBufferId = null;
		let currentElementBufferId = null;
		let currentModelBufferId = null;
		let currentColorBufferId = null;
		let currentTextureId = null;
		let blendEnabled = false;

		gl.activeTexture(gl.TEXTURE0);
		for(let i = 0; i < batches.length; i++)
		{
			let b = batches[i];
			let program = null;
			if(!b.programId)
			{
				program = mainProgram;
			}
			else if(programsMap.hasOwnProperty(b.programId))
			{
				program = programsMap[b.programId];
			}
			else
			{
				console.log("Program not found!");
				continue;
			}

			if(currentProgram !== program)
			{
				currentProgram = program;
				enableAttribs(currentProgram.attribs);
				gl.useProgram(currentProgram.program)
				
				// Eye light position 
				let eyeLightPosition = vec3.fromValues(0.0, 0.0, 0.0);
				gl.uniform3fv(currentProgram.lightPositionUniform, eyeLightPosition);
				
				gl.uniform1f(currentProgram.unlitUniform, 0.0);
			}
			
			// Matrices
			if(!currentProgram.isInstance)
			{
				mat4.copy(m, b.transform);
			}
		
			let normalMatrix = mat4.create();
			
			// Model view projection
			mat4.scale(m, m, self.scale);
			mat4.multiply(m, self.rotation, m);
			mat4.multiply(mv, v, m);
			mat4.multiply(mvp, p, mv);

			// Normal matrix
			mat4.invert(normalMatrix, mv);
			mat4.transpose(normalMatrix, normalMatrix);

			// Transforms
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

			if(currentProgram.isInstance)
			{
				if(currentModelBufferId !== b.modelBufferId)
				{
					gl.bindBuffer(gl.ARRAY_BUFFER, b.modelBufferId);
					let rowSize = 4 * 4 ; //  4 columns * 4 bytes
					let matrixSize = 4 * rowSize; // 4  * rows
					for(let i = 0; i < 4; i++)
					{
						gl.vertexAttribPointer(currentProgram.model + i, 4, gl.FLOAT, false, matrixSize, i * rowSize);
					}
					setAttribDivisors(currentProgram.modelAttribs, 1);
					currentModelBufferId = b.modelBufferId;
				}

				if(currentColorBufferId !== b.colorBufferId)
				{
					let colorSize = 4 * 4;
					gl.bindBuffer(gl.ARRAY_BUFFER, b.colorBufferId);
					gl.vertexAttribPointer(currentProgram.colorInstance, 4, gl.FLOAT, false, colorSize, 0);
					setAttribDivisors([currentProgram.colorInstance], 1);
					currentColorBufferId = b.colorBufferId;
				}
			}
			
			if(currentElementBufferId !== b.mesh.elementsBufferId)
			{
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.mesh.elementsBufferId);
				currentElementBufferId = b.mesh.elementsBufferId;
			}
			
			if(b.textureName && textureMap.hasOwnProperty(b.textureName) )
			{
				let textureId = textureMap[b.textureName];
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
				if(currentTextureId !== dummyTexture)
				{
					gl.uniform1i(program.texSamplerUniform, 0);
					gl.bindTexture(gl.TEXTURE_2D, dummyTexture);
					gl.uniform1f(currentProgram.useTextureUniform, 0.0);
					currentTextureId = dummyTexture;
				}
			}

			if(!currentProgram.isInstance)
			{
				if(b.color >= 1.0 && blendEnabled)
				{
					gl.disable(gl.BLEND);
					blendEnabled = false;
				}
				else if(b.color < 1.0 && !blendEnabled)
				{
					gl.enable(gl.BLEND);
					blendEnabled = true;
				}
				gl.uniform4fv(currentProgram.colorUniform, b.color);
			}

			
			if(currentProgram.isInstance)
			{
				instanceExt.drawElementsInstancedANGLE(gl.TRIANGLES, b.mesh.count, gl.UNSIGNED_SHORT, 0, b.instanceCount);
			}
			else
			{
				gl.drawElements(gl.TRIANGLES, b.mesh.count, gl.UNSIGNED_SHORT, 0);
			}
		}

		gl.uniform1f(currentProgram.unlitUniform, 1.0);		
		for(let i =0 ; i < lines.length; i++)
		{
			let l = lines[i];

			gl.uniform1i(program.texSamplerUniform, 0);
			gl.bindTexture(gl.TEXTURE_2D, dummyTexture);
			gl.uniform1f(currentProgram.useTextureUniform, 0.0);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, l.verticesBufferId);
			gl.vertexAttribPointer(currentProgram.positionVertex, 3, gl.FLOAT, false, l.vertexSize, 0);
			gl.vertexAttribPointer(currentProgram.normalVertex, 3, gl.FLOAT, false, l.vertexSize, 0); // 3 components x 4 bytes per float		
			gl.vertexAttribPointer(currentProgram.texcoord, 2, gl.FLOAT, false, l.vertexSize, 0);
			
			gl.drawArrays(gl.LINES, 0, l.count);
		}
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.useProgram(null);
		enabledVertexAttribMap = [];
	}

	this.updateViewBounds = function()
	{
		let bounds = canvas.element.getBoundingClientRect();
		
		canvas.element.width = bounds.width;
		canvas.element.height = bounds.height;
		canvas.width = bounds.width;
		canvas.height = bounds.height;
	}

	this.onResize = function()
	{
		if(canvas.element)
		{
			self.updateViewBounds();

			if(mainProgram)
			{
				gl.viewport(0, 0, canvas.width, canvas.height);
				self.draw();
			}
		}
	}

	this.setBackgroundColor = function(r, g, b)
	{
		backgroundColor.r = r;
		backgroundColor.g = g;
		backgroundColor.b = b;

		if(gl)
		{
			gl.clearColor(r, g, b, 1);
		}
		
	}

	this.load = function(canvasElement)
	{
		canvas.element = canvasElement;

		gl = canvasElement.getContext("webgl");

		if(gl.getExtension("ANGLE_instanced_arrays"))
		{
			console.log("Context has ANGLE_instanced_arrays");
			instanceExt = gl.getExtension('ANGLE_instanced_arrays');			
			hasInstancing = true;
		}
		
		self.updateViewBounds();

		gl.viewport(0, 0, canvas.width, canvas.height);
		
		window.addEventListener("resize", (e)=>
		{
			self.onResize();
		});
		
		self.loadShaders(Shaders.VERTEX_SHADER_SOURCE, Shaders.FRAGMENT_SHADER_SOURCE, Renderer.DEFAULT_PROGRAM);

		if(hasInstancing)
		{
			self.loadShaders(Shaders.INSTANCE_VERTEX_SHADER_SOURCE, Shaders.FRAGMENT_SHADER_SOURCE, Renderer.INSTACE_PROGRAM);
		}
		
		gl.clearColor(backgroundColor.r, backgroundColor.g, backgroundColor.b, backgroundColor.a);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		gl.enable(gl.DEPTH_TEST);

		dummyTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, dummyTexture);
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

		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		

		return true;
	}
	
	this.getContext = function()
	{
		return gl;
	}
	
	this.setViewMatrix = function(viewMatrix)
	{
		_viewMatrix = mat4.clone(viewMatrix);
	}
	
	this.setScale = function(newScale)
	{
		self.scale = vec3.clone(newScale);
	}
}

Renderer.DEFAULT_PROGRAM = "_default";
Renderer.INSTACE_PROGRAM = "_instance";

module.exports = Renderer;