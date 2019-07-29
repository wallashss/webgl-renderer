"use strict";

const _glMatrix = require("gl-matrix");
const Manipulator = require("./manipulator");

const vec3 = _glMatrix.vec3;
const vec4 = _glMatrix.vec4;
const mat4 = _glMatrix.mat4;

const glMatrix = _glMatrix.glMatrix;

function Examine()
{
	Manipulator.call(this);
}

Examine.prototype = Object.create(Manipulator.prototype);


Examine.prototype.updateView = function(dt, state)
{
	if(!glMatrix.equals(state.yawIntensity, 0.0) || 
		!glMatrix.equals(state.pitchIntensity, 0.0) || 
		!glMatrix.equals(state.zoomIntensity, 0.0) ||
		!glMatrix.equals(state.pan[0], 0.0) ||  
		!glMatrix.equals(state.pan[1], 0.0))
	{
		let viewMatrix = mat4.clone(this.viewMatrix);

		let hasZoom = !glMatrix.equals(state.zoomIntensity, 0.0);

		// Scale (zoom) in  orthographic
		if(hasZoom && state.isOrtho)
		{
			
			let s = 1;
			s -= state.zoomIntensity;
			
			let pivot = vec3.fromValues(state.pivot[0], state.pivot[1], state.pivot[2]);
			vec3.transformMat4(pivot, pivot, viewMatrix);

			let tPivot = mat4.create();
			mat4.translate(tPivot, tPivot, pivot);

			let tInvPivot = mat4.create();
			let minusPivot = vec3.fromValues(-pivot[0], -pivot[1], -pivot[2]);
			mat4.translate(tInvPivot, tInvPivot, minusPivot);

			let scale = mat4.create();
			mat4.fromScaling(scale, vec3.fromValues(s, s, s));

			mat4.multiply(viewMatrix, tInvPivot, viewMatrix);
			mat4.multiply(viewMatrix, scale, viewMatrix);
			mat4.multiply(viewMatrix, tPivot, viewMatrix);

			state.zoomIntensity = 0.0;
		}

		// Rotation
		if(!glMatrix.equals(state.yawIntensity, 0.0) || 
			!glMatrix.equals(state.pitchIntensity, 0.0))
		{
			let pivot = vec3.fromValues(state.pivot[0], state.pivot[1], state.pivot[2]);
			vec3.transformMat4(pivot, pivot, viewMatrix);

			let tPivot = mat4.create();
			mat4.translate(tPivot, tPivot, pivot);

			let tInvPivot = mat4.create();
			let minusPivot = vec3.fromValues(-pivot[0], -pivot[1], -pivot[2]);
			mat4.translate(tInvPivot, tInvPivot, minusPivot);

			if(!state.lockUpRotation)
			{
				let yaw = glMatrix.toRadian(state.yawIntensity * state.angularVelocity * dt);
				
				let up4 = vec4.fromValues(state.worldUp[0], state.worldUp[1], state.worldUp[2], 0.0);
				
				vec4.transformMat4(up4, up4,viewMatrix);
				let up = vec3.fromValues(up4[0], up4[1], up4[2]);
				vec3.normalize(up, up);
				
				let yawRot = mat4.create();
				mat4.rotate(yawRot, yawRot, yaw, up);
				
				mat4.multiply(viewMatrix, tInvPivot, viewMatrix);
				mat4.multiply(viewMatrix, yawRot, viewMatrix);
				mat4.multiply(viewMatrix, tPivot, viewMatrix);
			}

			if(!state.lockRightRotation)
			{
				let invViewMatrix = mat4.create();
				mat4.invert(invViewMatrix, viewMatrix);
				
				let front = vec3.fromValues(-invViewMatrix[2*4+0], -invViewMatrix[2*4+1], -invViewMatrix[2*4+2]);
				vec3.normalize(front, front);
				let absPitch = Math.acos(vec3.dot(state.worldUp, front));
				
				let deltaPitch = glMatrix.toRadian(state.pitchIntensity * state.angularVelocity * dt);
				let auxAbsPitch = absPitch + deltaPitch;
				
				if(auxAbsPitch < Math.PI && auxAbsPitch > 0.0)
				{
					let pitchRot = mat4.create();
					
					mat4.rotate(pitchRot, pitchRot, deltaPitch, vec3.fromValues(1.0, 0.0, 0.0));
					
					mat4.multiply(viewMatrix, tInvPivot, viewMatrix);
					mat4.multiply(viewMatrix, pitchRot, viewMatrix);
					mat4.multiply(viewMatrix, tPivot, viewMatrix);
				}
				
			}

			state.yawIntensity = 0.0;
			state.pitchIntensity = 0.0;
		}

		// Zoom in perspective
		if(hasZoom && !state.isOrtho)
		{
			let invViewMatrix = mat4.create(); 
			mat4.invert(invViewMatrix, viewMatrix);

			let eye = vec3.fromValues(invViewMatrix[3*4+0], invViewMatrix[3*4+1], invViewMatrix[3*4+2]);
			let pivot = vec3.fromValues(state.pivot[0], state.pivot[1], state.pivot[2]);

			if(!(glMatrix.equals(eye[0], pivot[0]) && glMatrix.equals(eye[1], pivot[1]) && glMatrix.equals(eye[2], pivot[2])))
			{
				let t = vec3.create();
				vec3.normalize(t, vec3.fromValues(pivot[0] - eye[0], pivot[1]- eye[1], pivot[2] - eye[2]));

				let focusDistance = vec3.distance(pivot, eye);
				let zoomTrans = focusDistance * state.zoomIntensity;

				if(focusDistance + zoomTrans > state.maximumZoom)
				{
					let translation = mat4.create();
					mat4.translate(translation, translation, vec3.fromValues(t[0] * zoomTrans, t[1] * zoomTrans, t[2] * zoomTrans));
					mat4.multiply(viewMatrix, viewMatrix, translation);
				}
			}

			state.zoomIntensity = 0.0;
		}

		if(!glMatrix.equals(state.pan[0], 0.0) ||  !glMatrix.equals(state.pan[1], 0.0) )
		{
			// let vp = mat4.create();
			// mat4.mul(vp, state.projectionMatrix, this.viewMatrix);

			// let projectedPoint = vec4.create();

			// vec4.transformMat4(projectedPoint, 
			// 					vec4.fromValues(state.pickedPoint[0], state.pickedPoint[1], state.pickedPoint[2], 1), 
			// 					vp);

			// let vpx = state.pan[0];
			// let vpy = state.pan[1];

			// let inVP = mat4.create();
			// mat4.invert(inVP, vp);

			// let rp = vec4.create();

			// rp[0] = ((projectedPoint[0] / projectedPoint[3]) + vpx) * projectedPoint[3];
			// rp[1] = ((projectedPoint[1] / projectedPoint[3]) + vpy) * projectedPoint[3];
			// rp[2] = projectedPoint[2];
			// rp[3] = projectedPoint[3];


			// vec4.transformMat4(rp, rp, inVP);

			// let t = vec3.fromValues(state.pickedPoint[0] - rp[0], 
			// 						state.pickedPoint[1] - rp[1], 
			// 						state.pickedPoint[2] - rp[2]);
			let t = this.getPanOffset(state);

			let tm = mat4.create();
			mat4.fromTranslation(tm, t);
			mat4.mul(viewMatrix, viewMatrix, tm);

			vec3.add(state.pivot, state.pivot, t);

			state.pan[0] = 0;
			state.pan[1] = 0;
		}
		this.viewMatrix = mat4.clone(viewMatrix);

		return true;
	}
	else
	{
		return false;
	}
}

module.exports = Examine;