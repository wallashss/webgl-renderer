
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

ResourceManager.prototype.uploadLines = function(vertices, colors, width)
{
	let gl = this.gl;
	let verticesBufferId = gl.createBuffer();

	let vertexSize = 3;
	let lineCount = vertices.length / vertexSize;

	let buffer = new Float32Array( (vertices.length / 3) * 4 * 4 );
	let bufferVerticeSize = 16;

	let bufferCount = 2 * lineCount;
	for(let i = 0; i < bufferCount; i++)
	{
		let bidx = i * bufferVerticeSize;
		let lidx = i * vertexSize;


		buffer[bidx + 0] = vertices[lidx + 0];
		buffer[bidx + 1] = vertices[lidx + 1];
		buffer[bidx + 2] = vertices[lidx + 2];
		buffer[bidx + 3] = -width;

		if(i % 2 === 0)
		{
			let nlidx = (i+1) * vertexSize;
			buffer[bidx + 4] = vertices[nlidx + 0];
			buffer[bidx + 5] = vertices[nlidx + 1];
			buffer[bidx + 6] = vertices[nlidx + 2];
			buffer[bidx + 7] = -width;
		}
		else
		{
			let nlidx = (i-1) * vertexSize;
			buffer[bidx + 4] = vertices[nlidx + 0];
			buffer[bidx + 5] = vertices[nlidx + 1];
			buffer[bidx + 6] = vertices[nlidx + 2];
			buffer[bidx + 7] = +width;
		}

		buffer[bidx + 8] = vertices[lidx + 0];
		buffer[bidx + 9] = vertices[lidx + 1];
		buffer[bidx + 10] = vertices[lidx + 2];
		buffer[bidx + 11] = +width;

		if(i % 2 === 0)
		{
			let nlidx = (i+1) * vertexSize;
			buffer[bidx + 12] = vertices[nlidx + 0];
			buffer[bidx + 13] = vertices[nlidx + 1];
			buffer[bidx + 14] = vertices[nlidx + 2];
			buffer[bidx + 15] = +width;
			
		}
		else
		{
			let nlidx = (i-1) * vertexSize;
			buffer[bidx + 12] = vertices[nlidx + 0];
			buffer[bidx + 13] = vertices[nlidx + 1];
			buffer[bidx + 14] = vertices[nlidx + 2];
			buffer[bidx + 15] = -width;
		}
	}
	
	gl.bindBuffer(gl.ARRAY_BUFFER, verticesBufferId);
	gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW);	

	console.log(vertices);
	console.log(buffer);
	return verticesBufferId;
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