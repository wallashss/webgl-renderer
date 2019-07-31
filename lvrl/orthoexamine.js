"use strict";

const _glMatrix = require("gl-matrix");
const Manipulator = require("./manipulator");

const vec3 = _glMatrix.vec3;
const vec4 = _glMatrix.vec4;
const mat4 = _glMatrix.mat4;

const glMatrix = _glMatrix.glMatrix;

function OrthoExamine()
{
	Manipulator.call(this);
	this.left = 0;
	this.right = 0;
	this.top = 0;
	this.bottom = 0;
	this.scale = 1;
	this.near = 1e-1;
	this.far = 1e5;

	this.padding = [0, 0];

	this.origin = [0, 0];

	this.fullProjection = mat4.create();
	this.invProjection = mat4.create();

	this.bounds = {
		left: 0,
		right: 0,
		top: 0,
		bottom: 0,
	};
}

OrthoExamine.prototype = Object.create(Manipulator.prototype);


OrthoExamine.prototype.setPadding = function(x, y)
{
	this.padding[0] = x;
	this.padding[1] = y;

}

OrthoExamine.prototype.setProjectionMatrix = function(projectionMatrix)
{
	mat4.copy(this.projectionMatrix, projectionMatrix);
	mat4.copy(this.fullProjection, projectionMatrix);
	mat4.invert(this.invProjection, projectionMatrix);

	let max = vec4.fromValues(1, 1, 1, 1);
	let min = vec4.fromValues(-1, -1, -1, 1);
	vec4.transformMat4(max, max, this.invProjection);
	vec4.transformMat4(min, min, this.invProjection);

	this.origin = [0, 0];

	this.bounds.left = this.left = min[0];
	this.bounds.right = this.right = max[0];
	this.bounds.bottom = this.bottom = min[1];
	this.bounds.top = this.top = max[1];
}

OrthoExamine.prototype.updateProjection = function(dt, state)
{
	if( !glMatrix.equals(state.zoomIntensity, 0.0) ||
		!glMatrix.equals(state.pan[0], 0.0) ||  
		!glMatrix.equals(state.pan[1], 0.0))
	{
		let hasZoom = !glMatrix.equals(state.zoomIntensity, 0.0);

		// Scale (zoom) in  orthographic
		
		if(hasZoom)
		{
			let scale = 1 + state.zoomIntensity;

			// Relative to screen 
			let width = this.bounds.right - this.bounds.left;
			let height = this.bounds.top - this.bounds.bottom;

			let originX = (state.pickedScreenPoint[0] * 0.5) * width;
			let originY = (state.pickedScreenPoint[1] * 0.5) * height;

			let destX = (state.pickedScreenPoint[0] * 0.5) * scale * width;
			let destY = (state.pickedScreenPoint[1] * 0.5) * scale * height;

			this.bounds.left *= scale;
			this.bounds.right *= scale;
			this.bounds.top *= scale;
			this.bounds.bottom *= scale;

			this.origin[0] += originX - destX;
			this.origin[1] += originY - destY;

			state.zoomIntensity = 0;
		}

		let hasPan = !glMatrix.equals(state.pan[0], 0.0) ||  !glMatrix.equals(state.pan[1], 0.0);
		if(hasPan)
		{
			let p = vec4.fromValues(state.pan[0] * 4, state.pan[1] * 4, 1, 1);

			vec4.transformMat4(p, p, this.invProjection);

			// Relative to bounds
			let width = this.bounds.right - this.bounds.left;
			let height = this.bounds.top - this.bounds.bottom;

			// Pan is length domain [-1, 1], to set on domain [0, 1] just divide 2
			let dx = (state.pan[0] * 0.5) * width; 
			let dy = (state.pan[1] * 0.5) * height;

			this.origin[0] += dx;
			this.origin[1] += dy;

			state.pan[0] = 0;
			state.pan[1] = 0;
		}

		// Constrain offset
		if(this.bounds.top + this.origin[1] > this.top - this.padding[1])
		{
			let offset = (this.bounds.top + this.origin[1]) - (this.top - this.padding[1]);
			this.origin[1] -= offset;

			if(this.bounds.bottom + this.origin[1] < this.bottom)
			{
				this.origin[1] = 0;
			}
		}
		else if(this.bounds.bottom + this.origin[1] < this.bottom + this.padding[1])
		{
			let offset = (this.bounds.bottom + this.origin[1]) - (this.bottom + this.padding[1]);
			this.origin[1] -= offset;

			if(this.bounds.top + this.origin[1] > this.top)
			{
				this.origin[1] = 0;
			}
		}

		if(this.bounds.right + this.origin[0] > this.right - this.padding[0])
		{
			let offset = (this.bounds.right + this.origin[0]) - (this.right - this.padding[0]);
			this.origin[0] -= offset;

			if(this.bounds.left + this.origin[0] < this.left)
			{
				this.origin[0] = 0;
			}
		}
		else if(this.bounds.left + this.origin[0] < this.left + this.padding[0])
		{
			let offset = (this.bounds.left + this.origin[0]) - (this.left + this.padding[0]);
			this.origin[0] -= offset;

			if(this.bounds.right + this.origin[0] > this.right)
			{
				this.origin[0] = 0;
			}
		}

		if(this.bounds.top > this.top)
		{
			this.bounds.top = this.top;
		}

		if(this.bounds.bottom < this.bottom)
		{
			this.bounds.bottom = this.bottom;
		}

		if(this.bounds.right > this.right)
		{
			this.bounds.right = this.right;
		}

		if(this.bounds.left < this.left)
		{
			this.bounds.left = this.left;
		}

		let boundsWidth = this.bounds.right - this.bounds.left;
		let boundsHeight = this.bounds.top - this.bounds.bottom;

		let fullWidth = this.right - this.left;
		let fullHeight = this.top - this.bottom;

		if(boundsWidth > fullWidth - 2 * this.padding[0])
		{
			this.origin[0] = 0;
		}

		if(boundsHeight > fullHeight - 2 * this.padding[1])
		{
			this.origin[1] = 0;
		}

		console.log(this.padding);
		console.log(this.origin);
		console.log(this.bounds.left, this.bounds.right, this.bounds.top, this.bounds.bottom);
		console.log(this.left, this.right, this.top, this.bottom);
		console.log("====");

		mat4.ortho(this.projectionMatrix, 
				   this.bounds.left + this.origin[0], 
				   this.bounds.right + this.origin[0], 
				   this.bounds.bottom + this.origin[1], 
				   this.bounds.top + this.origin[1],
				   this.near,
				   this.far);

		return true;
	}
	else
	{
		return false;
	}
}

module.exports = OrthoExamine;