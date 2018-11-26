"use strict"

const Shaders = require("./shaders");
const ShaderBuilder = require("./shaderbuilder");

// Global gl context... It is nice to debug.
let gl = null;

const glMatrix = require("gl-matrix");
const vec3 = glMatrix.vec3;
const vec4 = glMatrix.vec4;
const mat4 = glMatrix.mat4;

function Renderer()
{
	let self = this;
	
	let mainProgram = null;
	let instanceProgram = null;
	let pointMeshProgram = null;
	
	let pickProgram = null;
	let instancePickProgram = null;
	let programsMap = {};

	this.wireFrameBuffer = null;
	
	let dummyTexture = null;
	let batchesKeys = [];
	this.batchesKeys = batchesKeys;
	let batches = {};
	let lines = [];
	this.points = [];
	this.textureMap = {};

	let hasInstancing = false;
	let hasDrawBuffer = false;
	let backgroundColor = {r: 0.5, g: 0.5, b: 0.5, a: 1.0};
	let canvas = {width: 0, 
				  height: 0, 
				  element: undefined};

	let _viewMatrix = mat4.create();
	let _projectionMatrix = mat4.create();

	this.viewMatrix = _viewMatrix;
	this.projectionMatrix = _projectionMatrix;
	
	this.drawPicking = false;
	this.translation = vec3.create();
	this.scale = vec3.fromValues(1.0, 1.0, 1.0);
	this.rotation = mat4.create();

	this.version = 1;

	this.cullFace = false;

	let enabledVertexAttribMap = [];
	let attribDivisors = {};

	let instanceExt = null;

	let _nextInstanceId = 1;

	this.disableClearDepth = false;
	this.disableClearColor = false;

	
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

	function intToVec4(iValue)
	{
		iValue = iValue << 8;
		let a1 = ((0xFF000000 & iValue) >> 24) /255.0;
		let a2 = ((0x00FF0000 & iValue) >> 16) /255.0;
		let a3 = ((0x0000FF00 & iValue) >> 8) /255.0;
		// let a4 = ((0x000000FF & iValue)) /255.0;
		let out = vec4.fromValues(a1, a2, a3, 1);
		return out;
	}

	function vec4fToVec4b(v)
	{
		let out = new Uint8Array(4);
		out[0] = Math.min(Math.max(v[0], 0), 1) * 255;
		out[1] = Math.min(Math.max(v[1], 0), 1) * 255;
		out[2] = Math.min(Math.max(v[2], 0), 1) * 255;
		out[3] = Math.min(Math.max(v[3], 0), 1) * 255;
		
		return out;
	}

	function setAttribDivisors(attribs, size)
	{
		if(!Array.isArray(attribs))
		{
			attribs = [attribs];
		}
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

	this.loadShaders = function(id, vertexSource, fragmentSource, isInstance)
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

			// if(pickingInstance >= 0)
			// {
			// 	attribs.push(pickingInstance);
			// }

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
			// let pickingUniform = gl.getUniformLocation(program, "picking");

			// let isInstance = programId === Renderer.INSTANCE_PROGRAM_ID || programId === Renderer.POINTMESH_PROGRAM_ID;//  || programId === Renderer.INSTANCE_PICKING_PROGRAM;

			let newProgram = {program: program,
					positionVertex: positionVertex,
					normalVertex: normalVertex,
					texcoord: texcoord,
					model: model,
					colorInstance: colorInstance,
					translation: translation,
					barycentric: barycentric,
					// pickingInstance: pickingInstance,
					projectionUniform: projection,
					modelViewProjectionUniform: modelViewProjection,
					modelViewUniform: modelViewUniform,
					normalMatrixUniform: normalMatrixUniform,
					lightPositionUniform: lightPositionUniform,
					colorUniform: colorUniform,
					useTextureUniform: useTextureUniform,
					unlitUniform: unlitUniform,
					isBillboardUniform: isBillboardUniform,
					// pickingUniform: pickingUniform,
					texSamplerUniform: texSamplerUniform,
					id: programId,
					attribs: attribs,
					modelAttribs: modelAttribs,
					isInstance: isInstance,
					};

			self.addProgram(newProgram, programId)
			gl.useProgram(null);
		}
	}

	this.addProgram = function(newProgram, programId)
	{
		programsMap[programId] = newProgram;
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

		let count = elements.length;

		return {verticesBufferId: verticesBufferId, elementsBufferId: elementsBufferId, count: count};
	}

	this.addObject = function(vertices, elements, color, transform, textureName, unlit)
	{
		let mesh = self.uploadMesh(vertices, elements);

		let t = mat4.create();
		if(transform)
		{
			mat4.copy(t, transform);
		}
		
		let c = vec4.fromValues(0.8, 0.8, 0.8, 1.0);
		if(color)
		{
			c = vec4.clone(color);
		}
		
		let idx = _nextInstanceId; // we must resever alpha component
		let id = intToVec4(idx);
		_nextInstanceId++;
		// _nextInstanceId+=255;
		
		let b = {mesh: mesh,
			transform: t,
			color: c,
			id: id,
			visible: true,
			textureName: textureName, 
			programId: Renderer.DEFAULT_PROGRAM_ID,
			isInstance: false,
		    unlit: unlit || false};

		batchesKeys.push(idx);
		batches[idx] = b;
		return idx;
	}

	this.removeObject = function(id)
	{
		let idx  = batchesKeys.indexOf(id);
		if(idx >= 0)
		{
			batchesKeys.splice(idx, 1);
		}
		if(batches.hasOwnProperty(id))
		{
			delete batches[id];
		}
	}

	this.getBatch = function(id)
	{
		if(batches.hasOwnProperty(id))
		{
			return batches[id];
		}
		return null;
	}

	this.addBatch = function(b, idx = null)
	{
		if(idx)
		{
			batchesKeys.push(idx);
			batches[idx] = b;
		}
		else
		{
			let idx = _nextInstanceId; // we must resever alpha component
			batchesKeys.push(idx);
			batches[idx] = b;
			_nextInstanceId++;
		}

		return null;
	}

	this.addPointMesh = function(meshId, points, colors, transform, textureName = null, unlit = false, isBillboard = false)
	{
		const outIdx = _nextInstanceId;
		let pointsBufferId = gl.createBuffer();
		
		let pointsCount = points.length / 3;
		
		// Upload points
		gl.bindBuffer(gl.ARRAY_BUFFER, pointsBufferId);
		gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);

		// Upload colors
		let colorBufferId = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, colorBufferId);

		let useBlending = false;
		// let colorsCount = colors.length / 4;
		for(let i = 0; i < pointsCount; i++)
		{
			if(colors[i*4+3] < 255)
			{
				useBlending = true;
				break;
			}
		}
		gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

		
		let b = {mesh : meshId,
			modelBufferId: pointsBufferId,
			instanceCount: pointsCount,
			colorBufferId: colorBufferId,
			textureName: textureName,
			color: vec4.fromValues(1, 1, 1, 1),
			visible: true,
			firstIdx: outIdx,
			transform: transform || mat4.create(),
			// pickBufferId: pickBufferId,
			useBlending: useBlending,
			unlit : unlit || false,
			isBillboard: true,
			isPointMesh: true,
			programId: Renderer.POINTMESH_PROGRAM_ID,
			isInstance: true}
	
		// for(let i = 0 ; i < instanceCount; i++)
		// {
		// 	let idx = outIdx + i;
		// 	batches[idx] = b;	
		// }
		batches[outIdx] = b;	
		batchesKeys.push(outIdx);
		_nextInstanceId++;
		return outIdx;
		
	}

	function _addInstance(mesh, colors, matrices, textureName, unlit = false, isBillboard = false)
	{
		const outIdx = _nextInstanceId;
		let out = [];

		let useBlending = false;
		let useDepthMask = false;
		if(!hasInstancing || matrices.length === 1)
		{
			_nextInstanceId += matrices.length ;
			for(let i = 0; i < matrices.length; i++)
			{
				let idx = outIdx + i; 
				out.push(idx);
				let id = intToVec4(idx);
				let t = mat4.clone(matrices[i]);
				let c = vec4.clone(colors[i]);
	
				let b = {mesh,
					transform: t,
					color: c,
					visible: true,
					isWireframe: false,
					textureName: textureName,
					id: id,
					programId: Renderer.DEFAULT_PROGRAM_ID,
					unlit: unlit || false,
					isBillboard: isBillboard || false,
					isInstance: false}
				batchesKeys.push(idx);
				batches[idx] = b;
			}
			return outIdx;
		}
		else
		{
			let modelBufferId = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, modelBufferId);

			// Upload matrices
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

			_nextInstanceId += instanceCount;

			for(let i = 0 ; i < instanceCount; i++)
			{
				let idx = outIdx + i; 
				out.push(idx);
			}

			// Upload colors
			let colorBufferId = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, colorBufferId);



			if(textureName)
			{
				useBlending = true;
			}

			if(isBillboard)
			{
				useDepthMask = true;
			}

		    if(colors.constructor === Uint8Array)
			{
				let colorsCount = colors.length / 4;
				for(let i = 0; i < colorsCount; i++)
				{
					if(colors[i*4+3] < 255)
					{
						useBlending = true;
						useDepthMask = true;
						break;
					}
				}
				gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
			}
			else
			{
				let colorArray = new Uint8Array(colors.length * 4);
				for(let i = 0; i < colors.length ; i++)
				{
					let c = vec4fToVec4b(colors[i]);
					for(let j = 0; j < 4; j++)
					{
						colorArray[i*4 + j] = c[j];
						if(j == 3 && c[j] < 1.0)
						{
							useBlending = true;
						}
					}
					
				}
				gl.bufferData(gl.ARRAY_BUFFER, colorArray, gl.STATIC_DRAW);
			}

			let b = {mesh,
				modelBufferId: modelBufferId,
				instanceCount: instanceCount,
				colorBufferId: colorBufferId,
				textureName: textureName,
				visible: true,
				firstIdx: outIdx,
				isWireframe: false,
				useBlending: useBlending,
				useDepthMask: useDepthMask,
				unlit : unlit || false,
				isBillboard: isBillboard || false,
				programId: Renderer.INSTANCE_PROGRAM_ID,
				isInstance: true}
		
			for(let i = 0 ; i < instanceCount; i++)
			{
				let idx = outIdx + i;
				batches[idx] = b;	
			}
			batchesKeys.push(outIdx);
		}
		return out;
	}

	this.addInstances = function(mesh, colors, matrices, textureName, unlit, isBillboard)
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

		if((matrices.constructor != Float32Array || colors.constructor != Uint8Array) && 
			colors.length !== matrices.length)
		{
			console.log("Colors and instances must have same length");
			return;
		}
		if((matrices.constructor === Float32Array || colors.constructor === Uint8Array) && 
			(matrices.length / 16 !== colors.length /4 ))
		{
			console.log("Colors and instances must have same length");
			return;
		}
		return _addInstance(mesh, colors, matrices, textureName, unlit, isBillboard);

	}
	this.addObjectInstances = function(vertices, elements, colors, matrices, textureName, unlit, isBillboard)
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
		_addInstance(mesh, colors, matrices, textureName, unlit, isBillboard);
	}

	this.updateColor = function(idx, color)
	{
		if(batches.hasOwnProperty(idx))
		{
			let b = batches[idx];

			if(color[3] >= 1)
			{
				b.useBlending = false;
			}
			else
			{
				b.useBlending = true;
			}
			if(!b.isInstance)
			{
				b.color = color;
			}
			else
			{
				let offset =  idx - b.firstIdx;
				let c = vec4fToVec4b(color); 
				gl.bindBuffer(gl.ARRAY_BUFFER, b.colorBufferId);
				gl.bufferSubData(gl.ARRAY_BUFFER, offset * 4, c);
				gl.bindBuffer(gl.ARRAY_BUFFER, null);
			}
		}
	}

	this.updateTransform = function(idx, transform)
	{
		if(batches.hasOwnProperty(idx))
		{
			let b = batches[idx];

			if(!b.isInstance)
			{
				b.transform = transform;
			}
			else
			{
				let offset =  idx - b.firstIdx;
				// let c = vec4fToVec4b(color); 
				gl.bindBuffer(gl.ARRAY_BUFFER, b.modelBufferId);
				gl.bufferSubData(gl.ARRAY_BUFFER, offset * 16 * 4, transform);
				gl.bindBuffer(gl.ARRAY_BUFFER, null);
			}
		}
	}

	this.setVisibility = function(idx, visible)
	{
		if(batches.hasOwnProperty(idx))
		{
			let b = batches[idx];

			b.visible = visible;
		}
	}

	this.setWireframe = function(idx, wireframe)
	{
		if(batches.hasOwnProperty(idx))
		{
			let b = batches[idx];

			b.isWireframe = wireframe;
			if(b.isInstance)
			{
				b.programId = wireframe ? Renderer.INSTANCE_WIREFRAME_PROGRAM_ID : Renderer.INSTANCE_PROGRAM_ID;
			}
			else
			{
				b.programId = wireframe ? Renderer.DEFAULT_WIREFRAME_PROGRAM_ID : Renderer.DEFAULT_PROGRAM_ID;
			}
		}
	}

	this.addPoints = function(vertices, color, transform)
	{
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
		
		if(!transform)
		{
			transform = mat4.create();
		}
		
		if(!color)
		{
			color = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
		}
		
		this.points.push({verticesBufferId: verticesBufferId,
					count: vertices.length / 3,
					vertexSize: 3 * 4, // 3 components * 4 bytes per float
					color: color,
					transform: transform});
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

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		
		gl.bindTexture(gl.TEXTURE_2D, null);
		
		self.textureMap[textureName] = textureId;
    }
    
    this.setTexture = function(textureName, texture, isNearest)
	{
        if(!self.textureMap.hasOwnProperty(textureName))
        {
            self.addTexture(textureName, texture, isNearest);
            return;
        }

		let textureId = self.textureMap[textureName];

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

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		
		gl.bindTexture(gl.TEXTURE_2D, null);
		
		self.textureMap[textureName] = textureId;
	}

	this.clearBatches = function()
	{
		for(let i = 0; i < batchesKeys.length; i++)
		{
			let b = batches[batchesKeys[i]];
			gl.deleteBuffer(b.verticesBufferId);
			gl.deleteBuffer(b.elementsBufferId);
		}
		batches = {};
		batchesKeys = [];
		self.points = [];
	}


	this.draw = function()
	{
		// Clear screen
		if(!self.disableClearColor && !self.disableClearDepth)
		{
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		}
		else if(self.disableClearColor && !self.disableClearDepth)
		{
			gl.clear(gl.DEPTH_BUFFER_BIT);
		}
		else if(!self.disableClearColor && self.disableClearDepth)
		{
			gl.clear(gl.COLOR_BUFFER_BIT );
		}
		
		if(!self.hasBatches())
		{
			return;
		}
	
		
		// Default matrices
		let m = mat4.create();
		let mv = mat4.create();
		let mvp = mat4.create();
		let p = _projectionMatrix;
		let v = _viewMatrix;
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
		for(let i = 0; i < batchesKeys.length; i++)
		{
			let b = batches[batchesKeys[i]];
			if(!b.visible)
			{
				continue;
			}

			// Bind shader
			let program = null;
			if(!b.programId)
			{
				program = mainProgram;
			}

			program = programsMap[b.programId];

			if(program === null)
			{
				continue;
			}

			// Setup initial parameters for program
			if(currentProgram !== program)
			{
				currentProgram = program;
				enableAttribs(currentProgram.attribs);
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
			mat4.scale(m, m, self.scale);
			mat4.multiply(m, self.rotation, m);
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

			if(b.isWireframe && self.wireFrameBuffer)
			{
				gl.bindBuffer(gl.ARRAY_BUFFER, self.wireFrameBuffer);
				gl.vertexAttribPointer(currentProgram.barycentric, 3, gl.FLOAT, false, 3 * 4, 0);
			}

			if(currentProgram.isInstance)
			{
				if(currentModelBufferId !== b.modelBufferId && b.isPointMesh)
				{
					gl.bindBuffer(gl.ARRAY_BUFFER, b.modelBufferId);
					gl.vertexAttribPointer(currentProgram.translation, 3, gl.FLOAT, false, 3 * 4, 0);
					setAttribDivisors(currentProgram.translation, 1);
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
					setAttribDivisors(currentProgram.modelAttribs, 1);
					currentModelBufferId = b.modelBufferId;
				}

				if(currentColorBufferId !== b.colorBufferId)
				{
					let colorSize = 4;
					gl.bindBuffer(gl.ARRAY_BUFFER, b.colorBufferId);
					gl.vertexAttribPointer(currentProgram.colorInstance, 4, gl.UNSIGNED_BYTE, true, colorSize, 0);
					setAttribDivisors([currentProgram.colorInstance], 1);
					currentColorBufferId = b.colorBufferId;
				}
			}
			
			if(currentElementBufferId !== b.mesh.elementsBufferId)
			{
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.mesh.elementsBufferId);
				currentElementBufferId = b.mesh.elementsBufferId;
			}
			
			if(b.textureName && self.textureMap.hasOwnProperty(b.textureName) )
			{
				let textureId = self.textureMap[b.textureName];
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
				gl.uniform4fv(currentProgram.colorUniform, b.color);
			}
			

			// Setup blend for proper drawing transparent objects
			if((!b.useBlending && !b.isWireframe) && blendEnabled)
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
				instanceExt.drawElementsInstancedANGLE(gl.TRIANGLES, b.mesh.count, gl.UNSIGNED_SHORT, 0, b.instanceCount);
				// instanceExt.drawElementsInstancedANGLE(gl.LINES, b.mesh.count, gl.UNSIGNED_SHORT, 0, b.instanceCount);
			}
			else
			{
				gl.drawElements(gl.TRIANGLES, b.mesh.count, gl.UNSIGNED_SHORT, 0);
				// gl.drawElements(gl.LINES, b.mesh.count, gl.UNSIGNED_SHORT, 0);
			}
		}

		// Draw Lines
		if(lines.length > 0)
		{
			currentProgram = mainProgram;
			enableAttribs(currentProgram.attribs);
			gl.useProgram(currentProgram.program);

			mat4.identity(m);
			mat4.multiply(mv, v, m);
			mat4.multiply(mvp, p, mv);

			gl.uniform1f(currentProgram.unlitUniform, 1.0);
			gl.uniformMatrix4fv(currentProgram.modelViewUniform, false, mv);
			gl.uniformMatrix4fv(currentProgram.modelViewProjectionUniform, false, mvp);
		}
		for(let i =0 ; i < lines.length; i++)
		{
			let l = lines[i];

			gl.uniform1i(currentProgram.texSamplerUniform, 0);
			gl.bindTexture(gl.TEXTURE_2D, dummyTexture);
			gl.uniform1f(currentProgram.useTextureUniform, 0.0);
			gl.uniform4fv(currentProgram.colorUniform, l.color);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, l.verticesBufferId);
			gl.vertexAttribPointer(currentProgram.positionVertex, 3, gl.FLOAT, false, l.vertexSize, 0);
			gl.vertexAttribPointer(currentProgram.normalVertex, 3, gl.FLOAT, false, l.vertexSize, 0); // 3 components x 4 bytes per float		
			gl.vertexAttribPointer(currentProgram.texcoord, 2, gl.FLOAT, false, l.vertexSize, 0);
			
			gl.drawArrays(gl.LINES, 0, l.count);
		}

		// Draw Points
		if(this.points.length > 0)
		{
			currentProgram = mainProgram;
			enableAttribs(currentProgram.attribs);
			gl.useProgram(currentProgram.program);

			// mat4.identity(m);
			

			gl.uniform1f(currentProgram.unlitUniform, 1.0);
			
		}

		for(let i = 0; i < this.points.length; i++)
		{
			let point = this.points[i];

			mat4.copy(m, point.transform);
			mat4.multiply(mv, v, m);
			mat4.multiply(mvp, p, mv);

			gl.uniformMatrix4fv(currentProgram.modelViewUniform, false, mv);
			gl.uniformMatrix4fv(currentProgram.modelViewProjectionUniform, false, mvp);

			gl.uniform1i(currentProgram.texSamplerUniform, 0);
			gl.bindTexture(gl.TEXTURE_2D, dummyTexture);
			gl.uniform1f(currentProgram.useTextureUniform, 0.0);
			gl.uniform4fv(currentProgram.colorUniform, point.color);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, point.verticesBufferId);
			gl.vertexAttribPointer(currentProgram.positionVertex, 3, gl.FLOAT, false, point.vertexSize, 0);
			gl.vertexAttribPointer(currentProgram.normalVertex, 3, gl.FLOAT, false, point.vertexSize, 0); // 3 components x 4 bytes per float		
			gl.vertexAttribPointer(currentProgram.texcoord, 2, gl.FLOAT, false, point.vertexSize, 0);
			
			gl.drawArrays(gl.LINES, 0, point.count);
			// gl.drawArrays(gl.POINTS, 0, point.count);
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
		enableAttribs([]);
		enabledVertexAttribMap = [];

		return true;
	}

	this.updateViewBounds = function()
	{
		let bounds = canvas.element.getBoundingClientRect();
		
		canvas.element.width = bounds.width;
		canvas.element.height = bounds.height;
		canvas.width = bounds.width;
		canvas.height = bounds.height;
	}

	this.forceUseBlending = function(blending = false)
	{
		for(let i = 0 ; i < batchesKeys.length; i++)
		{
			let b = batches[batchesKeys[i]];
			b.useBlending = blending;
		}
	}

	this.setViewport = function(x, y, width, height, willDraw = false)
	{
		if(gl)
		{
			gl.viewport(x, y, width, height);
		}
	}

	this.onResize = function()
	{
		if(canvas.element)
		{
			self.updateViewBounds();
		}
	}

	this.enablePolygonOffset = function()
	{
		gl.enable(gl.POLYGON_OFFSET_FILL);
		gl.polygonOffset(0, 1);
	}

	this.disablePolygonOffset = function()
	{
		gl.disable(gl.POLYGON_OFFSET_FILL);
	}

	this.setDisableClear = function(disable)
	{
		self.disableClearColor = disable;
		self.disableClearDepth = disable;
	}

	this.setDisableClearDepth = function(disable)
	{
		self.disableClearDepth = disable;
	}

	this.setDisableClearColor = function(disable)
	{
		self.disableClearColor = disable;
	}

	this.enableCullface = function(cullFace)
	{
		this.enableCullface = cullFace;
	}

	this.setBackgroundColor = function(r, g, b, a)
	{
		backgroundColor.r = r;
		backgroundColor.g = g;
		backgroundColor.b = b;
		backgroundColor.a = a;

		if(gl)
		{
			gl.clearColor(r, g, b, a);
		}		
	}

	this.setContext = function(context)
	{
		gl = context;
	}

	this.setDummyTexture = function(texture)
	{
		dummyTexture = texture;
	}

	this.loadWireframeBuffer = function(sizeBytes = Math.pow(2, 16))
	{
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

		self.wireFrameBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, self.wireFrameBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW);
	}

	this.getSharedRenderer = function()
	{
		let newRenderer = new Renderer();

		newRenderer.loadExtensions();

		newRenderer.setContext(gl);
		
		newRenderer.setDummyTexture(dummyTexture);

		newRenderer.setCanvasElement(canvas.element);

		newRenderer.textureMap = self.textureMap;

		newRenderer.wireFrameBuffer = self.wireFrameBuffer;

		newRenderer.viewMatrix = _viewMatrix;

		newRenderer.projectionMatrix = _projectionMatrix;

		for(let k in programsMap)
		{
			newRenderer.addProgram(programsMap[k], k);
		}
		// newRenderer.addProgram(pickProgram, Renderer.PICKING_PROGRAM);
		// newRenderer.addProgram(instancePickProgram, Renderer.INSTANCE_PICKING_PROGRAM);

		// newRenderer.setProjectionMatrix(_projectionMatrix);
		// newRenderer.setViewMatrix(_viewMatrix);
		newRenderer.finishSharing();
		return newRenderer;
	}

	this.finishSharing = function()
	{
		_viewMatrix = self.viewMatrix;
		_projectionMatrix = self.projectionMatrix;
	}

	this.hasBatches = function()
	{
		if(batchesKeys.length === 0 && lines.length === 0 && this.points.length === 0)
		{
			return false;
		}
		return true;
	}

	this.loadExtensions = function()
	{
		
		// alert(gl.getExtension("EXT_frag_depth"));
		// console.log(gl.getSupportedExtensions());
		if(this.version === 2)
		{
			hasInstancing = true;
			instanceExt = 
			{
				vertexAttribDivisorANGLE: (a, b)=>
				{
					gl.vertexAttribDivisor(a, b);
				},
				drawElementsInstancedANGLE : (a, b, c, d, e) =>
				{
					gl.drawElementsInstanced(a, b, c, d, e);
				}
			}

		}
		else
		{
			if(gl.getExtension("ANGLE_instanced_arrays"))
			{
				console.log("Context has ANGLE_instanced_arrays");
				instanceExt = gl.getExtension('ANGLE_instanced_arrays');			
				hasInstancing = true;
			}
	
			if(gl.getExtension("WEBGL_draw_buffers"))
			{
				hasDrawBuffer = true;
			}

			

		}
	}

	this.setCanvasElement = function(canvasElement)
	{
		canvas.element = canvasElement;
		self.updateViewBounds();
	}

	this.load = function(canvasElement, options)
	{
		self.setCanvasElement(canvasElement);

		this.version = 1;

        
        if(options)
        {
            console.log(options);
        }
		if(this.version === 2)
		{
			gl = canvasElement.getContext("webgl2", options);
			
		}
		else
		{
			gl = canvasElement.getContext("webgl", options);
		}
		
		window.gl = gl;
		self.loadExtensions();
		
		
		gl.viewport(0, 0, canvas.width, canvas.height);
		

		// Load shaders
		self.loadShaders(Renderer.DEFAULT_PROGRAM_ID, Shaders.VERTEX_SHADER_SOURCE, Shaders.FRAGMENT_SHADER_SOURCE, false);

		self.loadShaders(Renderer.DEFAULT_WIREFRAME_PROGRAM_ID, Shaders.WIREFRAME_VERTEX_SHADER_SOURCE, Shaders.WIREFRAME_FRAGMENT_SHADER_SOURCE, false);

		if(hasInstancing)
		{
			self.loadShaders(Renderer.INSTANCE_PROGRAM_ID, Shaders.INSTANCE_VERTEX_SHADER_SOURCE, Shaders.FRAGMENT_SHADER_SOURCE, true);

			self.loadShaders(Renderer.POINTMESH_PROGRAM_ID, Shaders.INSTANCE_POINT_MESH_VERTEX_SHADER, Shaders.FRAGMENT_SHADER_SOURCE, true);

			self.loadShaders(Renderer.INSTANCE_WIREFRAME_PROGRAM_ID, Shaders.WIREFRAME_INSTANCE_VERTEX_SHADER_SOURCE, Shaders.WIREFRAME_FRAGMENT_SHADER_SOURCE, true);
		}
		
		// Set clear color
		gl.clearColor(backgroundColor.r, backgroundColor.g, backgroundColor.b, backgroundColor.a);

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

		// Init perspective matrix
		mat4.perspective(_projectionMatrix, 45, canvas.width / canvas.height, 0.1, 100000.0);

		return true;
	}
	
	this.getContext = function()
	{
		return gl;
	}

	this.setNextId = function(id)
	{
		_nextInstanceId = id;
	}
	
	this.setViewMatrix = function(viewMatrix)
	{
		// _viewMatrix = mat4.clone(viewMatrix);
		mat4.copy(_viewMatrix, viewMatrix);
	}

	this.setProjectionMatrix = function(projectionMatrix)
	{
		// _projectionMatrix = mat4.clone(projectionMatrix);
		mat4.copy(_projectionMatrix, projectionMatrix);
	}

	this.setPerspective = function(fov, ratio, near, far)
	{
		// mat4.perspective(_projectionMatrix, 45, canvas.width / canvas.height, 0.1, 100000.0);
		mat4.perspective(_projectionMatrix, fov, ratio, near, far);
	}
	
	this.setScale = function(newScale)
	{
		self.scale = vec3.clone(newScale);
	}

	this.sortBatches = function(callback)
	{
		batchesKeys.sort(callback);
	}
}

Renderer.DEFAULT_PROGRAM_ID = "_default";
Renderer.INSTANCE_PROGRAM_ID = "_instance";
Renderer.POINTMESH_PROGRAM_ID = "_pointMesh";
Renderer.DEFAULT_WIREFRAME_PROGRAM_ID = "_defaultWireframe";
Renderer.INSTANCE_WIREFRAME_PROGRAM_ID = "_instanceWireframe";

module.exports = Renderer;