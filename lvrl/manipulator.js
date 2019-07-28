"use strict";

const glMatrix = require("gl-matrix");

const mat4 = glMatrix.mat4;

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