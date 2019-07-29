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

	this.bounds.left = this.left = min[0];
	this.bounds.right = this.right = max[0];
	this.bounds.bottom = this.bottom = min[1];
	this.bounds.top = this.top = max[1];
}

OrthoExamine.prototype.updateProjection = function(dt, state)
{
	if(
		!glMatrix.equals(state.zoomIntensity, 0.0) ||
		!glMatrix.equals(state.pan[0], 0.0) ||  
		!glMatrix.equals(state.pan[1], 0.0))
	{
		let hasZoom = !glMatrix.equals(state.zoomIntensity, 0.0);

		// Scale (zoom) in  orthographic
		if(hasZoom)
		{
			console.log(state.zoomIntensity)
			let scale = 1 + state.zoomIntensity;

			this.bounds.left *= scale;
			this.bounds.right *= scale;
			this.bounds.top *= scale;
			this.bounds.bottom *= scale;

			if(this.bounds.left < this.left)
			{
				this.bounds.left = this.left;
			}
			if(this.bounds.right > this.right)
			{
				this.bounds.right = this.right;
			}
			if(this.bounds.top > this.top)
			{
				this.bounds.top = this.top;
			}
			if(this.bounds.bottom < this.bottom)
			{
				this.bounds.bottom = this.bottom;
			}

			console.log(this.bounds);

			state.zoomIntensity = 0;
		}

		let hasPan = !glMatrix.equals(state.pan[0], 0.0) ||  !glMatrix.equals(state.pan[1], 0.0);
		if(hasPan)
		{
			let p = vec4.fromValues(state.pan[0] * 4, state.pan[1] * 4, 1, 1);

			vec4.transformMat4(p, p, this.invProjection);



			let pan = this.getPanOffset(state);	

			console.log(pan);

			let dx = -pan[0];
			let dy = -pan[1];
			// let dx = p[0];
			// let dy = p[1];

			// if(this.bounds.right + dx < this.right && 
			//    this.bounds.left + dx > this.left)
			{
				this.bounds.left += dx;
				this.bounds.right += dx;
			}
			// else if(this.bounds.right + dx > this.right)
			// {
			// 	this.bounds.left += this.right - this.bounds.right;
			// 	this.bounds.right = this.right;
			// }
			// else if(this.bounds.left + dx < this.left)
			// {
			// 	this.bounds.right += this.left - this.bounds.left;
			// 	this.bounds.left = this.left;
			// }


			// if(this.bounds.top + dy < this.top && 
			//    this.bounds.bottom + dy > this.bottom)
			{
				this.bounds.top += dy;
				this.bounds.bottom += dy;
			}
			// else if(this.bounds.top + dy > this.top)
			// {
			// 	this.bounds.bottom += this.top - this.bounds.top;
			// 	this.bounds.top = this.top;
			// }
			// else if(this.bounds.bottom + dy < this.bottom)
			// {
			// 	this.bounds.top += this.bottom - this.bounds.bottom;
			// 	this.bounds.bottom = this.bottom;
			// }


			// this.bounds.left += dx;
			// this.bounds.right += dx;
			state.pan[0] = 0;
			state.pan[1] = 0;
		}

		console.log("lalal");

		mat4.ortho(this.projectionMatrix, 
				   this.bounds.left, 
				   this.bounds.right, 
				   this.bounds.bottom, 
				   this.bounds.top,
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