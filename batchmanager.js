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

BatchManager.prototype.addInstances = function(geometry, matrices, colors, options = {})
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
		return _addInstances.call(this, geometry, matrices, colors, options);
	}
	if((matrices.constructor != Float32Array || colors.constructor != Uint8Array) && 
		colors.length !== matrices.length)
	{
		console.error("Colors and instances must have same length");
		return;
	}
	if((matrices.constructor === Float32Array || colors.constructor === Uint8Array) && 
		(matrices.length / 16 !== colors.length / 4 ))
	{
		console.error("Colors and instances must have same length");
		return;
	}
	return _addInstances.call(this, geometry, matrices, colors, options);
}

//  TODO: Clear memory resources
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
	if(this.batchesKeys.length === 0)
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

function _addInstances(geometry, matrices, colors, options)
{
	let out = [];


	let isBillboard 	= options.isBillboard || options.billboard || false;
	let useDepthMask 	= !!options.useDepthMask;
	let billboardSize 	= options.billboardSize || false;
	let billboardRot 	= options.billboardRotation || false;
	let textureName 	= options.textureName || null;
	let inverseCullFace = options.inverseCullFace || false;
	let cullFace 		= inverseCullFace || options.cullFace || false;
	let visible 		= options.visible === false ? false : true;
	let unlit 			= options.hasOwnProperty("unlit") ? options.unlit : false;

	let programId 		= options.programId || null; 

	let useBlending = false;

	let b = {
			cullFace: cullFace,
			inverseCullFace: inverseCullFace,
			isBillboard: isBillboard || false,
			billboardSize: billboardSize,
			billboardRotation: billboardRot,
			isWireframe: false,
			geometry: geometry,
			textureName: textureName,
			useBlending: useBlending,
			useDepthMask: useDepthMask,			
			unlit : unlit || false,
			visible: visible
			}
	
	if(!this.contextGL.hasInstancing)
	{
		const outIdx = this.generateId();

		if(matrices.constructor === Float32Array)
		{
			// Replace to vector
			let temp = [];

			let length = matrices.length / 16;

			for(let i = 0; i < length; i++)
			{
				let t = new Float32Array(16);
				for(let j = 0; j < 16; j++)
				{

				}
				temp.push(t);
			}
			matrices = temp;
		}
		
		for(let i = 0; i < matrices.length; i++)
		{
			let idx = this.generateId();
			out.push(idx);
			let t = mat4.clone(matrices[i]);
			let c = vec4.clone(colors[i]);

			b.transform= t;
			b.color= c;

			b.isInstance = false;
			b.programId = programId;
			
			this.batchesKeys.push(idx);
			this.batches[idx] = b;
		}
		return outIdx;
	}
	else
	{
		
		let instanceCount = options.count || 0;
		
		// Bind buffer ids
		let modelBufferId = null; 
		let colorBufferId = null;
		if(matrices.constructor === WebGLBuffer)
		{
			modelBufferId = matrices;
		}

		if(colors.constructor === WebGLBuffer)
		{
			colorBufferId = colors;
		}
		
		// Generate id for each instance
		let offsetMap = {};
		for(let i = 0 ; i < instanceCount; i++)
		{
			let idx = this.generateId();
			offsetMap[idx] = i;
			out.push(idx);
		}

		if(textureName)
		{
			useBlending = true;
		}
		
		b.instanceCount = instanceCount ;
		b.useBlending = options.hasOwnProperty("useBlending") ? options.useBlending : useBlending;
		b.useDepthMask = options.hasOwnProperty("useDepthMask") ? options.useDepthMask : useDepthMask;
		b.transform = options.transform || null; 
		b.modelBufferId = modelBufferId;
		b.colorBufferId = colorBufferId;
		b.offsetMap = offsetMap;

		b.isInstance = true;
		b.programId =  programId;
		
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


module.exports = BatchManager;