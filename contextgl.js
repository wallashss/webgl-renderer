"use strict";

function ContextGL(canvas = null, version = 1)
{
	this.version = version;

	this.gl = null;

	this.ext = {};

	this.state = {vertexAttribPointer: {}, vertexAttribDivisor: {} }; // for fallback purpose

	this.canvas = null;

	this.hasInstancing = false;

	if(canvas)
	{
		this.load(canvas, {}, this.version)
	}
}

ContextGL.prototype.load = function(canvas, options = {},  version = 1)
{	
	if(options)
	{
		console.log(options);
	}

	if(!canvas)
	{
		throw `No canvas specified`;
	}
	this.canvas = canvas;
	this.version = version;

	// if(this.version === 2)
	// {
	// 	this.gl = canvas.getContext("webgl2", options);
	// }
	
	if(!this.gl)
	{
		this.gl = canvas.getContext("webgl", options);

		if(this.version !== 1)
		{
			console.warn(`Failed to load webgl version ${version}. Loaded v1 instead.`)

			this.version = 1;
		}
	}
	
	this.loadExtensions();
}

ContextGL.prototype.loadExtensions = function()
{
	if(this.version === 2)
	{
		this.hasInstancing = true;

		this.ext.vertexAttribDivisor = (a, b) =>
		{
			this.gl.vertexAttribDivisor(a, b);
		}

		this.ext.drawElementsInstanced = (a, b, c, d, e) =>
		{
			this.gl.drawElementsInstanced(a, b, c, d, e);
		}
		// this.instanceExt = 
		// {
		// 	vertexAttribDivisorANGLE: (a, b) =>
		// 	{
		// 		this.gl.vertexAttribDivisor(a, b);
		// 	},
		// 	drawElementsInstancedANGLE : (a, b, c, d, e) =>
		// 	{
		// 		this.gl.drawElementsInstanced(a, b, c, d, e);
		// 	}
		// }

	}
	else
	{
		this.hasInstancing = true;
		if(this.gl.getExtension("ANGLE_instanced_arrays"))
		{
			// this.hasInstancing = true;
			console.info("Context has ANGLE_instanced_arrays");
			// this.instanceExt = this.gl.getExtension('ANGLE_instanced_arrays');

			let instanceExt = this.gl.getExtension('ANGLE_instanced_arrays');

			this.ext.vertexAttribDivisor = (a, b) =>
			{
				// this.gl.vertexAttribDivisor(a, b);
				instanceExt.vertexAttribDivisorANGLE(a, b);
			}

			this.ext.drawElementsInstanced = (a, b, c, d, e) =>
			{
				instanceExt.drawElementsInstancedANGLE(a, b, c, d, e);
			}
		}
		else
		{
			console.info("Context does not have ANGLE_instanced_arrays");



			this.ext.vertexAttribDivisor = (index, divisor) =>
			{
				// this.gl.vertexAttribDivisor(a, b);
				// instanceExt.vertexAttribDivisorANGLE(a, b);
				// this.state.vertexAttribPointer

			}

			this.gl.disableVertexAttribArray = (index) =>
			{
				// this.gl.vertexAttribDivisor(a, b);
				// instanceExt.vertexAttribDivisorANGLE(a, b);

				delete this.state.vertexAttribPointer[index];

				WebGLRenderingContext.prototype.disableVertexAttribArray.call(this.gl, index);
			}

			this.gl.vertexAttribPointer = (index, size, type, normalized, stride, offset) =>
			{
				// this.gl.vertexAttribDivisor(a, b);
				// instanceExt.vertexAttribDivisorANGLE(a, b);

				this.state.vertexAttribPointer[index] = {size: size, type: type, normalized: normalized, stride: stride, offset: offset};

				WebGLRenderingContext.prototype.vertexAttribPointer.call(this.gl, index, size, type, normalized, stride, offset);
			}

			this.ext.drawElementsInstanced = (mode, count, type, offset, instanceCount) =>
			{
				// instanceExt.drawElementsInstancedANGLE(a, b, c, d, e);
				for(let i = 0; i < instanceCount; i++)
				{
					this.gl.drawElements(mode, count, type, offset);
				}
			}
			
		}

		if(!this.gl.getExtension("WEBGL_draw_buffers"))
		{
			console.log("Does not have draw buffer");
		}
	}
}

module.exports = ContextGL;