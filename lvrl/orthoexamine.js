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

			this.bounds.left *= scale;
			this.bounds.right *= scale;
			this.bounds.top *= scale;
			this.bounds.bottom *= scale;

			state.zoomIntensity = 0;
		}

		let hasPan = !glMatrix.equals(state.pan[0], 0.0) ||  !glMatrix.equals(state.pan[1], 0.0);
		if(hasPan)
		{
			let p = vec4.fromValues(state.pan[0] * 4, state.pan[1] * 4, 1, 1);

			vec4.transformMat4(p, p, this.invProjection);

			// Pan is length domain [-1, 1], to set on domain [0, 1] just divide 2
			let dx = (state.pan[0] * 0.5) * (this.bounds.right - this.bounds.left); 
			let dy = (state.pan[1] * 0.5) * (this.bounds.top - this.bounds.bottom);

			this.origin[0] += dx;
			this.origin[1] += dy;

			state.pan[0] = 0;
			state.pan[1] = 0;
		}

		// Constrain offset
		if(this.bounds.top + this.origin[1] > this.top)
		{
			let offset = (this.bounds.top + this.origin[1]) - this.top;
			this.origin[1] -= offset;

			if(this.bounds.bottom + this.origin[1] < this.bottom)
			{
				this.origin[1] = 0;
			}
		}
		else if(this.bounds.bottom + this.origin[1] < this.bottom)
		{
			let offset = (this.bounds.bottom + this.origin[1]) - this.bottom;
			this.origin[1] -= offset;

			if(this.bounds.top + this.origin[1] > this.top)
			{
				this.origin[1] = 0;
			}
		}

		if(this.bounds.right + this.origin[0] > this.right)
		{
			let offset = (this.bounds.right + this.origin[0]) - this.right;
			this.origin[0] -= offset;

			if(this.bounds.left + this.origin[0] < this.left)
			{
				this.origin[0] = 0;
			}
		}
		else if(this.bounds.left + this.origin[0] < this.left)
		{
			let offset = (this.bounds.left + this.origin[0]) - this.left;
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