
"use strict";

function ResourceManager(context)
{
	this.gl = context;
	this.textureMap = {};
}

ResourceManager.prototype.setTexture = function(textureName, texture, isNearest)
{
	let gl = this.gl;
	if(!this.textureMap.hasOwnProperty(textureName))
	{
		this.addTexture(textureName, texture, isNearest);
		return;
	}

	let textureId = this.textureMap[textureName];

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
	
	this.textureMap[textureName] = textureId;
}

ResourceManager.prototype.addTexture = function(textureName, texture, isNearest)
{
	let gl = this.gl;
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
	
	this.textureMap[textureName] = textureId;
}

ResourceManager.prototype.uploadMesh = function(vertices, elements)
{
	let gl = this.gl;
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


module.exports = ResourceManager;