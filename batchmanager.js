"use strict";

const glMatrix = require("gl-matrix");
const vec3 = glMatrix.vec3;
const vec4 = glMatrix.vec4;
const mat4 = glMatrix.mat4;

let DEFAULT_NEXT_ID = 1;

function BatchManager(contextGL)
{
	this.batchesKeys = [];
	this.batches = {};
	this.lines = [];
	this.points = [];

	this.contextGL = contextGL;

	this.generateId = () =>
	{
		let id = DEFAULT_NEXT_ID;
		DEFAULT_NEXT_ID++;
		return id;
	}
}


BatchManager.prototype.setGenerateId = function(callback)
{
	this.generateId = callback || (() => {});
}

BatchManager.prototype.getBatches = function()
{
	return this;
}

BatchManager.prototype.addInstances = function(mesh, matrices, colors, options = {})
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

	if(matrices.constructor === WebGLBuffer)
	{
		// go on
		return _addInstances.call(this, mesh, matrices, colors, options);
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
	return _addInstances.call(this, mesh, matrices, colors, options);
}

//  TODO: Clear memeory resources
BatchManager.prototype.removeObject = function(id)
{
	let idx  = this.batchesKeys.indexOf(id);
	if(idx >= 0)
	{
		this.batchesKeys.splice(idx, 1);
	}
	if(this.batches.hasOwnProperty(id))
	{
		delete this.batches[id];
	}
}

BatchManager.prototype.getBatch = function(id)
{
	if(this.batches.hasOwnProperty(id))
	{
		return this.batches[id];
	}
	return null;
}

BatchManager.prototype.addBatch = function(b, idx = null)
{
	if(idx)
	{
		this.batchesKeys.push(idx);
		this.batches[idx] = b;
	}
	else
	{
		let idx = this.generateId();
		this.batchesKeys.push(idx);
		this.batches[idx] = b;
	}

	return null;
}

BatchManager.prototype.addPointMesh = function(meshId, points, colors, transform, textureName = null, unlit = false, isBillboard = false)
{
	let gl = this.contextGL.gl;
	const outIdx = this.generateId();

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
		programId: BatchManager.POINTMESH_PROGRAM_ID,
		isInstance: true}

	this.batches[outIdx] = b;	
	this.batchesKeys.push(outIdx);
	return outIdx;
	
}

BatchManager.prototype.addObject = function(vertices, elements, color, transform, textureName, unlit)
{
	let mesh = this.uploadMesh(vertices, elements);

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
	
	let idx = this.generateId();
	
	let b = {mesh: mesh,
		transform: t,
		color: c,
		visible: true,
		textureName: textureName, 
		programId: BatchManager.DEFAULT_PROGRAM_ID,
		isInstance: false,
		unlit: unlit || false};

	this.batchesKeys.push(idx);
	this.batches[idx] = b;
	return idx;
}

BatchManager.prototype.getSharedMatrices = function(idx)
{
	if(this.batches.hasOwnProperty(idx))
	{
		let b = this.batches[idx];

		return b.modelBufferId;
	}
	return null;

}

BatchManager.prototype.addObjectInstances = function(vertices, elements, colors, matrices, textureName, unlit, isBillboard)
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

	let mesh = this.uploadMesh(vertices, elements);
	_addInstances.call(this,mesh, colors, matrices, textureName, unlit, isBillboard);
}

BatchManager.prototype.updateColorBuffer = function(idx, colors)
{
	let gl = this.contextGL.gl;
	if(this.batches.hasOwnProperty(idx))
	{
		let b = this.batches[idx];

		gl.bindBuffer(gl.ARRAY_BUFFER, b.colorBufferId);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, colors);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}
}

BatchManager.prototype.updateColor = function(idx, color, forceBlending =  false)
{
	let gl = this.contextGL.gl;
	if(this.batches.hasOwnProperty(idx))
	{
		let b = this.batches[idx];

		if(color[3] >= 1 && !forceBlending)
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
			// let offset =  idx - b.firstIdx;
			let offset = b.offsetMap[idx];
			let c = vec4fToVec4b(color); 
			gl.bindBuffer(gl.ARRAY_BUFFER, b.colorBufferId);
			gl.bufferSubData(gl.ARRAY_BUFFER, offset * 4, c);
			gl.bindBuffer(gl.ARRAY_BUFFER, null);
		}
	}
}

BatchManager.prototype.updateTransform = function(idx, transform)
{
	let gl = this.contextGL.gl;
	if(this.batches.hasOwnProperty(idx))
	{
		let b = this.batches[idx];

		if(!b.isInstance)
		{
			b.transform = transform;
		}
		else
		{
			// let offset =  idx - b.firstIdx;
			// let c = vec4fToVec4b(color); 
			let offset = b.offsetMap[idx];
			gl.bindBuffer(gl.ARRAY_BUFFER, b.modelBufferId);
			gl.bufferSubData(gl.ARRAY_BUFFER, offset * 16 * 4, transform);
			gl.bindBuffer(gl.ARRAY_BUFFER, null);
		}
	}
}

BatchManager.prototype.setVisibility = function(idx, visible)
{
	if(this.batches.hasOwnProperty(idx))
	{
		let b = this.batches[idx];

		b.visible = visible;
	}
}

BatchManager.prototype.setWireframe = function(idx, wireframe)
{
	if(this.batches.hasOwnProperty(idx))
	{
		let b = this.batches[idx];

		b.isWireframe = wireframe;
		if(b.isInstance)
		{
			b.programId = wireframe ? BatchManager.INSTANCE_WIREFRAME_PROGRAM_ID : BatchManager.INSTANCE_PROGRAM_ID;
		}
		else
		{
			b.programId = wireframe ? BatchManager.DEFAULT_WIREFRAME_PROGRAM_ID : BatchManager.DEFAULT_PROGRAM_ID;
		}
	}
}

BatchManager.prototype.addPoints = function(vertices, color, transform)
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
				vertexSize: 4, // 3 components * 4 bytes per float
				color: color,
				transform: transform});
}

// BatchManager.prototype.addLines = function(vertices, color, width)
// {
// 	let verticesBufferId = gl.createBuffer();
	
// 	gl.bindBuffer(gl.ARRAY_BUFFER, verticesBufferId);
// 	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);	
	
// 	if(!color)
// 	{
// 		color = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
// 	}
	
// 	this.lines.push({verticesBufferId: verticesBufferId,
// 				count: vertices.length / 3,
// 				vertexSize: 3 * 4, // 3 components * 4 bytes per float
// 				color: color});
// }

BatchManager.prototype.addLines = function(verticesBufferId, lineCount, transform = mat4.create(), color = new Uint8Array([255, 255, 255, 255]))
{	
	this.lines.push({verticesBufferId: verticesBufferId,
				count: lineCount * 4 ,
				transform: transform,
				color: color,
				vertexSize: 8 * 4});
}

BatchManager.prototype.clearBatches = function()
{
	let gl = this.contextGL.gl;
	for(let i = 0; i < this.batchesKeys.length; i++)
	{
		let b = this.batches[this.batchesKeys[i]];
		gl.deleteBuffer(b.verticesBufferId);
		gl.deleteBuffer(b.elementsBufferId);
	}
	this.batches = {};
	this.batchesKeys = [];
	this.points = [];
}

BatchManager.prototype.hasBatches = function()
{
	if(this.batchesKeys.length === 0 && this.lines.length === 0 && this.points.length === 0)
	{
		return false;
	}
	return true;
}

BatchManager.prototype.sortBatches = function(callback)
{
	this.batchesKeys.sort(callback);
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

function _addInstances(mesh, matrices, colors, options)
{
	let gl = this.contextGL.gl;
	// const outIdx = this.generateId();
	let out = [];


	let isBillboard = options.isBillboard || options.billboard || false;
	let billboardSize = options.billboardSize || false;
	let billboardRot = options.billboardRotation || false;
	let textureName = options.textureName || null;
	let inverseCullFace = options.inverseCullFace || false;
	let cullFace = inverseCullFace || options.cullFace || false;
	let unlit = options.hasOwnProperty("unlit") ? options.unlit : false;

	let useBlending = false;
	let useDepthMask = false;


	let b = {
			cullFace: cullFace,
			inverseCullFace: inverseCullFace,
			isBillboard: isBillboard || false,
			billboardSize: billboardSize,
			billboardRotation: billboardRot,
			isWireframe: false,
			mesh: mesh,
			textureName: textureName,
			useBlending: useBlending,
			useDepthMask: useDepthMask,			
			unlit : unlit || false,
			visible: true
			}
	if(!this.contextGL.hasInstancing)
	{
		const outIdx = this.generateId();
		for(let i = 0; i < matrices.length; i++)
		{
			// let idx = outIdx + i; 
			let idx = this.generateId();
			out.push(idx);
			let t = mat4.clone(matrices[i]);
			let c = vec4.clone(colors[i]);

			b.transform= t;
			b.color= c;

			b.isInstance = false;
			b.programId = BatchManager.DEFAULT_PROGRAM_ID;
			
			this.batchesKeys.push(idx);
			this.batches[idx] = b;
		}
		return outIdx;
	}
	else
	{
		let modelBufferId = null; 
		
		// Upload matrices
		let instanceCount = 0;
		if(matrices.constructor === WebGLBuffer)
		{
			modelBufferId = matrices;
			if(colors.constructor === Uint8Array)
			{
				instanceCount = colors.length / 4;
			}
			else
			{
				instanceCount = colors.length;
			}
		}
		else if(matrices.constructor === Float32Array)
		{
			modelBufferId = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, modelBufferId);

			instanceCount = matrices.length / 16;
			gl.bufferData(gl.ARRAY_BUFFER, matrices, gl.STATIC_DRAW);
		}
		else
		{
			modelBufferId = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, modelBufferId);

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

		let offsetMap = {};
		for(let i = 0 ; i < instanceCount; i++)
		{
			// let idx = outIdx + i; 
			let idx = this.generateId();
			offsetMap[idx] = i;
			out.push(idx);
		}


		// Upload colors
		let colorBufferId = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, colorBufferId);

		if(textureName)
		{
			useBlending = true;
		}

		if(isBillboard || billboardSize || billboardRot)
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

		b.useBlending = useBlending;
		b.useDepthMask = useDepthMask;
		b.modelBufferId = modelBufferId;
		b.instanceCount = instanceCount;
		b.colorBufferId = colorBufferId;
		b.offsetMap = offsetMap;

		b.isInstance = true;
		b.programId = BatchManager.INSTANCE_PROGRAM_ID;
		
		for(let i = 0 ; i < out.length; i++)
		{
			let idx = out[i];
			this.batches[idx] = b;	
		}
		this.batchesKeys.push(out[0]);
	}
	return out;
}

BatchManager.prototype.forceUseBlending = function(blending = false)
{
	for(let i = 0 ; i < this.batchesKeys.length; i++)
	{
		let b = this.batches[this.batchesKeys[i]];
		b.useBlending = blending;
	}
}

BatchManager.DEFAULT_PROGRAM_ID = "_default";
BatchManager.INSTANCE_PROGRAM_ID = "_instance";
BatchManager.POINTMESH_PROGRAM_ID = "_pointMesh";
BatchManager.DEFAULT_WIREFRAME_PROGRAM_ID = "_defaultWireframe";
BatchManager.INSTANCE_WIREFRAME_PROGRAM_ID = "_instanceWireframe";

module.exports = BatchManager;