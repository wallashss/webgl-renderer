"use strict";


function BatchManager()
{
	this.batchesKeys = [];
	this.batches = {};
	this.layers = {};

	this._nextId = 1;

	this.generateId = () =>
	{
		let id = this._nextId;
		this._nextId++;
		return id;
	}
}


BatchManager.prototype.addLayer = function(layer)
{
	this.layers[layer] = [];
}

BatchManager.prototype.setGenerateId = function(callback)
{
	this.generateId = callback || (() => {});
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

	return _addInstances.call(this, geometry, matrices, colors, options);
}

//  TODO: Clear memory resources
BatchManager.prototype.removeObject = function(id)
{
	// let idx  = this.batchesKeys.indexOf(id);
	// if(idx >= 0)
	// {
	// 	this.batchesKeys.splice(idx, 1);
	// }
	if(this.batches.hasOwnProperty(id))
	{
		for(let i in this.layers)
		{
			let layer = this.layers[i];
			let idx = layer.indexOf(id);

			if(idx >= 0)
			{
				layer.splice(idx, 1);
			}
		}
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

BatchManager.prototype.getOffset = function(id)
{
	if(this.batches.hasOwnProperty(id))
	{
		let b = this.batches[id];

		return b.offsetMap[id];
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

BatchManager.prototype.clearBatches = function()
{
	// let gl = this.contextGL.gl;
	// for(let i = 0; i < this.batchesKeys.length; i++)
	// {
	// 	let b = this.batches[this.batchesKeys[i]];
	// 	// gl.deleteBuffer(b.verticesBufferId);
	// 	// gl.deleteBuffer(b.elementsBufferId);
	// }
	// this.batches = {};
	// this.batchesKeys = [];
	// this.points = [];

	for(let k in this.layers)
	{
		this.layers[k] = [];
	}

	this.batches = {};
}

BatchManager.prototype.hasObject = function(id)
{
	return this.batches.hasOwnProperty(id);
}
BatchManager.prototype.hasBatches = function(layer = 0)
{
	let batchesKeys = this.layers[layer] || [];

	return batchesKeys.length > 0 ;
}

BatchManager.prototype.sortBatches = function(callback)
{
	this.batchesKeys.sort(callback);
}


function _addInstances(geometry, modelBufferId, colorBufferId, options)
{
	let out = [];

	let isBillboard 	= options.isBillboard || options.billboard || false;
	let billboardSize 	= options.billboardSize || false;
	let billboardRot 	= options.billboardRotation || false;
	let textureName 	= options.textureName || null;
	let inverseCullFace = options.inverseCullFace || false;
	let visible 		= options.visible === false ? false : true;
	let mergeIds		= !!options.mergeIds;

	let programId 		= options.programId || null; 

	let useBlending 	= !!options.useBlending;
	let useDepthMask 	= !!options.useDepthMask;

	let unlit 			= !!options.unlit;
	let instanceCount 	= options.count || 0;

	let transform 		= options.transform || null;

	let layer 			= options.layer || 0;

	let cullFace 		= inverseCullFace || options.cullFace || false;
	
	if(textureName)
	{
		useBlending = true;
	}

	let b = {
			billboardSize: billboardSize,
			billboardRotation: billboardRot,
			colorBufferId: colorBufferId,
			cullFace: cullFace,
			instanceCount: instanceCount,
			inverseCullFace: inverseCullFace,
			isBillboard: isBillboard,
			isInstance: true,
			isWireframe: false,
			geometry: geometry,
			modelBufferId: modelBufferId,
			programId: programId,
			textureName: textureName,
			transform: transform,
			useBlending: useBlending,
			useDepthMask: useDepthMask,			
			unlit : unlit,
			visible: visible
			}
	
	// Generate id for each instance
	let offsetMap = {};

	if(mergeIds)
	{
		let idx = this.generateId();
		out.push(idx);
	}
	else
	{
		for(let i = 0 ; i < instanceCount && !mergeIds; i++)
		{
			let idx = this.generateId();
			offsetMap[idx] = i;
			out.push(idx);
		}
	}

	b.offsetMap = offsetMap;

	
	for(let i = 0 ; i < out.length; i++)
	{
		let idx = out[i];
		this.batches[idx] = b;	
	}

	let batchesKeys = this.layers[layer];
	batchesKeys.push(out[0]);
	return out;
}


module.exports = BatchManager;