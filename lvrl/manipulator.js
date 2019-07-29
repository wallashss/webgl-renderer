"use strict";

const glMatrix = require("gl-matrix");

const mat4 = glMatrix.mat4;
const vec4 = glMatrix.vec4;
const vec3 = glMatrix.vec3;

function Manipulator()
{
	this.viewMatrix = mat4.create();
	this.projectionMatrix = mat4.create();
}

Manipulator.prototype.setProjectionMatrix = function(projectionMatrix)
{
	mat4.copy(this.projectionMatrix, projectionMatrix);
}

Manipulator.prototype.getProjectionMatrix = function(out = mat4.create())
{
	mat4.copy(out, this.projectionMatrix);
	return out;
}

Manipulator.prototype.getPanOffset = function(state)
{
	let vp = mat4.create();
	mat4.mul(vp, state.projectionMatrix, this.viewMatrix);

	let projectedPoint = vec4.create();

	vec4.transformMat4(projectedPoint, 
						vec4.fromValues(state.pickedPoint[0], state.pickedPoint[1], state.pickedPoint[2], 1), 
						vp);

	let vpx = state.pan[0];
	let vpy = state.pan[1];

	let inVP = mat4.create();
	mat4.invert(inVP, vp);

	let rp = vec4.create();

	rp[0] = ((projectedPoint[0] / projectedPoint[3]) + vpx) * projectedPoint[3];
	rp[1] = ((projectedPoint[1] / projectedPoint[3]) + vpy) * projectedPoint[3];
	rp[2] = projectedPoint[2];
	rp[3] = projectedPoint[3];


	vec4.transformMat4(rp, rp, inVP);

	let t = vec3.fromValues(state.pickedPoint[0] - rp[0], 
							state.pickedPoint[1] - rp[1], 
							state.pickedPoint[2] - rp[2]);
	return t;
}

Manipulator.prototype.setViewMatrix = function(viewMatrix)
{
	// this._viewMatrix = mat4. clone(viewMatrix);
	mat4.copy(this.viewMatrix, viewMatrix);
}

Manipulator.prototype.getViewMatrix = function(outMatrix = mat4.create())
{
	mat4.copy(outMatrix, this.viewMatrix);
	return outMatrix;
}

Manipulator.prototype.updateView = function(dt, state)
{
	return false;
}

Manipulator.prototype.updateProjection = function(dt, state)
{
	return false;
}

module.exports = Manipulator;