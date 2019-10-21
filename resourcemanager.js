
"use strict";

// Vertex Size = (2 * (vertex & normal) + 2 * nom) * 3 components (x, y, z) * 4 bytes (float)
const MESH_VERTEX_SIZE = (3 + 3 + 2) * 4;
const LINE_VERTEX_SIZE = 8 * 4;

function ResourceManager(context)
{
	this.gl = context;
	this.textureMap = {};
}


ResourceManager.prototype.getTexture = function(id)
{
	return this.textureMap[id] || null;
}

ResourceManager.prototype.hasTexture = function(id)
{
	return this.textureMap.hasOwnProperty(id);
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

ResourceManager.prototype.uploadLineSet = function(vertices, width)
{
	let gl = this.gl;

	let vertexSize = 3;
	let verticesCount = vertices.length / vertexSize;

	let lineCount = verticesCount * 0.5;

	let vertexBufferVerticeSize = 16;

	let elementCount = lineCount * 6;

	let elementBuffer = new Uint16Array(elementCount);
	let vertexBuffer = new Float32Array(verticesCount * vertexBufferVerticeSize );

	let vertexBufferCount = 2 * verticesCount;

	let elementIdx = 0;
	for(let i = 0; i < lineCount; i++)
	{
		let idx = i * 4;
		elementBuffer[elementIdx++] = idx ;
		elementBuffer[elementIdx++] = idx + 1;
		elementBuffer[elementIdx++] = idx + 2;

		elementBuffer[elementIdx++] = idx + 1;
		elementBuffer[elementIdx++] = idx + 3;
		elementBuffer[elementIdx++] = idx + 2;
	}

	for(let i = 0; i < vertexBufferCount; i++)
	{
		let bidx = i * vertexBufferVerticeSize;
		let lidx = i * vertexSize;


		vertexBuffer[bidx + 0] = vertices[lidx + 0];
		vertexBuffer[bidx + 1] = vertices[lidx + 1];
		vertexBuffer[bidx + 2] = vertices[lidx + 2];
		vertexBuffer[bidx + 3] = -width;

		if(i % 2 === 0)
		{
			let nlidx = (i+1) * vertexSize;
			vertexBuffer[bidx + 4] = vertices[nlidx + 0];
			vertexBuffer[bidx + 5] = vertices[nlidx + 1];
			vertexBuffer[bidx + 6] = vertices[nlidx + 2];
			vertexBuffer[bidx + 7] = -width;
		}
		else
		{
			let nlidx = (i-1) * vertexSize;
			vertexBuffer[bidx + 4] = vertices[nlidx + 0];
			vertexBuffer[bidx + 5] = vertices[nlidx + 1];
			vertexBuffer[bidx + 6] = vertices[nlidx + 2];
			vertexBuffer[bidx + 7] = +width;

		}

		vertexBuffer[bidx + 8] = vertices[lidx + 0];
		vertexBuffer[bidx + 9] = vertices[lidx + 1];
		vertexBuffer[bidx + 10] = vertices[lidx + 2];
		vertexBuffer[bidx + 11] = +width;

		
		if(i % 2 === 0)
		{
			let nlidx = (i+1) * vertexSize;
			vertexBuffer[bidx + 12] = vertices[nlidx + 0];
			vertexBuffer[bidx + 13] = vertices[nlidx + 1];
			vertexBuffer[bidx + 14] = vertices[nlidx + 2];
			vertexBuffer[bidx + 15] = +width;
		}
		else
		{
			let nlidx = (i-1) * vertexSize;
			vertexBuffer[bidx + 12] = vertices[nlidx + 0];
			vertexBuffer[bidx + 13] = vertices[nlidx + 1];
			vertexBuffer[bidx + 14] = vertices[nlidx + 2];
			vertexBuffer[bidx + 15] = -width;
		}

	}
	
	let verticesBufferId = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, verticesBufferId);
	gl.bufferData(gl.ARRAY_BUFFER, vertexBuffer, gl.STATIC_DRAW);

	let elementsBufferId = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementsBufferId);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elementBuffer, gl.STATIC_DRAW);

	// return {verticesBufferId: verticesBufferId, elementsBufferId: elementsBufferId, count: elementCount};
	return {verticesBufferId: verticesBufferId,
			elementsBufferId: elementsBufferId,
			vertexSize: LINE_VERTEX_SIZE,
			lengths: {position: 4, normal: 4},
			offsets: {position: 0, normal: 16},
			count: elementCount};
}

ResourceManager.prototype.uploadLineString = function(vertices, width)
{
	let gl = this.gl;

	let vertexSize = 3;
	let verticesCount = vertices.length / vertexSize;

	let lineCount = verticesCount - 1;

	let vertexBufferVerticeSize = 2 * 4; // 4 compoennts * 4 bytes

	let elementCount = (lineCount) * 2 * 3; // 2 vertices * 3 triangle indices


	let elementBuffer = new Uint16Array(elementCount);
	let vertexBuffer = new Float32Array(verticesCount * vertexBufferVerticeSize + 2 * vertexBufferVerticeSize );

	let elementIdx = 0;
	for(let i = 0; i < lineCount ; i++)
	{
		let idx = i * 4 - (i * 2);
		elementBuffer[elementIdx++] = idx ;
		elementBuffer[elementIdx++] = idx + 1;
		elementBuffer[elementIdx++] = idx + 2;

		elementBuffer[elementIdx++] = idx + 1;
		elementBuffer[elementIdx++] = idx + 3;
		elementBuffer[elementIdx++] = idx + 2;
	}

	for(let i = 0; i < verticesCount; i++)
	{
		let bidx = (i+1) * vertexBufferVerticeSize;
		let lidx = i * vertexSize;


		vertexBuffer[bidx + 0] = vertices[lidx + 0];
		vertexBuffer[bidx + 1] = vertices[lidx + 1];
		vertexBuffer[bidx + 2] = vertices[lidx + 2];
		vertexBuffer[bidx + 3] = -width;

		vertexBuffer[bidx + 4] = vertices[lidx + 0];
		vertexBuffer[bidx + 5] = vertices[lidx + 1];
		vertexBuffer[bidx + 6] = vertices[lidx + 2];
		vertexBuffer[bidx + 7] = +width;
	}

	// Extend first vertex
	{
		let bidx = 0;	
		let lidx = (0) * vertexSize;
		let nlidx = (1) * vertexSize;

		vertexBuffer[bidx + 0] = vertices[lidx + 0] + (vertices[lidx + 0] - vertices[nlidx + 0]);
		vertexBuffer[bidx + 1] = vertices[lidx + 1] + (vertices[lidx + 1] - vertices[nlidx + 1]);
		vertexBuffer[bidx + 2] = vertices[lidx + 2] + (vertices[lidx + 2] - vertices[nlidx + 2]);
		vertexBuffer[bidx + 3] = -width;

		vertexBuffer[bidx + 4] = vertices[lidx + 0] + (vertices[lidx + 0] - vertices[nlidx + 0]);
		vertexBuffer[bidx + 5] = vertices[lidx + 1] + (vertices[lidx + 1] - vertices[nlidx + 1]);
		vertexBuffer[bidx + 6] = vertices[lidx + 2] + (vertices[lidx + 2] - vertices[nlidx + 2]);
		vertexBuffer[bidx + 7] = +width;
	}

	// Extend last vertex
	{
		let bidx = (verticesCount + 1) * vertexBufferVerticeSize;	
		let lidx = (verticesCount - 1) * vertexSize;
		let plidx = (verticesCount - 2) * vertexSize;

		vertexBuffer[bidx + 0] = vertices[lidx + 0] + (vertices[lidx + 0] - vertices[plidx + 0]);
		vertexBuffer[bidx + 1] = vertices[lidx + 1] + (vertices[lidx + 1] - vertices[plidx + 1]);
		vertexBuffer[bidx + 2] = vertices[lidx + 2] + (vertices[lidx + 2] - vertices[plidx + 2]);
		vertexBuffer[bidx + 3] = -width;

		vertexBuffer[bidx + 4] = vertices[lidx + 0]+ (vertices[lidx + 0] - vertices[plidx + 0]);
		vertexBuffer[bidx + 5] = vertices[lidx + 1]+ (vertices[lidx + 1] - vertices[plidx + 1]);
		vertexBuffer[bidx + 6] = vertices[lidx + 2]+ (vertices[lidx + 2] - vertices[plidx + 2]);
		vertexBuffer[bidx + 7] = +width;
	}
	
	let verticesBufferId = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, verticesBufferId);
	gl.bufferData(gl.ARRAY_BUFFER, vertexBuffer, gl.STATIC_DRAW);

	let elementsBufferId = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementsBufferId);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, elementBuffer, gl.STATIC_DRAW);

	return {verticesBufferId: verticesBufferId,
			elementsBufferId: elementsBufferId,
			vertexSize: 16,
			lengths: {position: 4, normal: 4, texcoord: 4},
			offsets: {position: 0, normal: 32, texcoord: 64},
			count: elementCount};
}

ResourceManager.prototype.uploadPointCloud = function(points)
{
	let gl = this.gl;

	let pointsBufferId = gl.createBuffer();
	
	let pointsCount = points.length / 3;
	
	// Upload points
	gl.bindBuffer(gl.ARRAY_BUFFER, pointsBufferId);
	gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);

	return pointsBufferId;
}

ResourceManager.prototype.uploadColors = function(colors)
{
	let gl = this.gl;

	let colorBufferId = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, colorBufferId);

	if(colors.constructor === Uint8Array)
	{
		gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
	}
	else
	{
		let colorBuffer = new Uint8Array(colors.length * 4);
		for(let i = 0; i < colors.length ; i++)
		{
			let c = vec4fToVec4b(colors[i]);
			for(let j = 0; j < 4; j++)
			{
				colorBuffer[i*4 + j] = c[j];
			}
		}
		gl.bufferData(gl.ARRAY_BUFFER, colorBuffer, gl.STATIC_DRAW);
	}

	return colorBufferId;

}

ResourceManager.prototype.uploadMatrices = function(matrices)
{
	let gl = this.gl;
	let modelBufferId = null; 

	if(matrices.constructor === Float32Array)
	{
		modelBufferId = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, modelBufferId);

		gl.bufferData(gl.ARRAY_BUFFER, matrices, gl.STATIC_DRAW);
	}
	else
	{
		modelBufferId = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, modelBufferId);
		
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

	return modelBufferId;
	
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

	return {verticesBufferId: verticesBufferId, 
			elementsBufferId: elementsBufferId, 
			vertexSize: MESH_VERTEX_SIZE,
			lengths: {position: 3, normal: 3, texcoord: 2},
			offsets: {position: 0, normal: 12, texcoord: 3 * 4 + 3 * 4},
			count: count };
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

module.exports = ResourceManager;