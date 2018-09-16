"use strict";

const _glMatrix = require("gl-matrix");

const vec3 = _glMatrix.vec3;
const vec4 = _glMatrix.vec4;
const mat4 = _glMatrix.mat4;

const glMatrix = _glMatrix.glMatrix;

function Fly()
{
	let _viewMatrix = mat4.create();
	let _forwardDirection = vec3.fromValues(0.0, 0.0, -1.0);
	
	const PITCH_LIMIAR = glMatrix.toRadian(179.0);
	
	this.setFowardDirection = function(forward)
	{
		_forwardDirection = vec3.clone(forward);
	}
	this.setViewMatrix = function(viewMatrix)
	{
		mat4.copy(_viewMatrix, viewMatrix);
	}
	
	this.getViewMatrix = function()
	{
		return _viewMatrix;
	}
	
	this.update = function(dt, state)
	{
        if(glMatrix.equals(state.yawIntensity, 0.0) && glMatrix.equals(state.pitchIntensity, 0.0) &&
           glMatrix.equals(state.forward, 0.0) && glMatrix.equals(state.backward, 0.0) &&
           glMatrix.equals(state.left, 0.0) && glMatrix.equals(state.right, 0.0) &&
           glMatrix.equals(state.up, 0.0) && glMatrix.equals(state.down, 0.0))
		{
			return false;
		}

        let viewMatrix = mat4.clone(_viewMatrix);
        let up4 = vec4.fromValues(state.worldUp[0], state.worldUp[1], state.worldUp[2], 0.0);
					
		vec4.transformMat4(up4, up4, viewMatrix);
		let up = vec3.fromValues(up4[0], up4[1], up4[2]);
		vec3.normalize(up, up);

        if(!glMatrix.equals(state.yawIntensity, 0.0) || !glMatrix.equals(state.pitchIntensity, 0.0))
		{
			if(!state.lockUpRotation)
			{
				let yawRot = mat4.create();
				mat4.rotate(yawRot, yawRot, glMatrix.toRadian(state.yawIntensity * state.angularVelocity * dt), up);
                mat4.multiply(viewMatrix, yawRot, viewMatrix);
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
				
				if(auxAbsPitch < PITCH_LIMIAR && auxAbsPitch > 1.0)
				{
					let pitchRot = mat4.create();
					
					mat4.rotate(pitchRot, pitchRot, deltaPitch, vec3.fromValues(1.0, 0.0, 0.0));
					
					mat4.multiply(viewMatrix, pitchRot, viewMatrix);
				}
			}

			state.yawIntensity   = 0.0;
			state.pitchIntensity = 0.0;
		}

		let deltaS = vec3.create();
		
        deltaS[0] = state.velocity[0] * (state.left - state.right) * dt;
        deltaS[1] = state.velocity[1] * (state.down - state.up) * dt;
        deltaS[2] = state.velocity[2] * (state.backward - state.forward) * dt;
		let forward = vec3.clone(_forwardDirection);
		vec3.normalize(forward, forward);

		let right = vec3.create();
		vec3.cross(right, forward, up);
		vec3.normalize(right, right);

		let upCam = vec3.create();
		vec3.cross(upCam, right, forward);
		vec3.normalize(upCam, upCam);

		let totalTrans = vec3.fromValues(forward[0] * deltaS[2] + upCam[0] * deltaS[1] + right[0] * deltaS[0], 
										 forward[1] * deltaS[2] + upCam[1] * deltaS[1] + right[1] * deltaS[0],
										 forward[2] * deltaS[2] + upCam[2] * deltaS[1] + right[2] * deltaS[0]);
        let translation = mat4.create();
        mat4.translate(translation, translation, totalTrans);
        mat4.multiply(viewMatrix, translation, viewMatrix);
        
		// console.log(viewMatrix, _viewMatrix);
		mat4.copy(_viewMatrix, viewMatrix);


		return true;
	}
	
	this.applyRestrictions = function(up)
	{
        let invViewMatrix = mat4.create();
        mat4.invert(invViewMatrix, _viewMatrix);

		let w = invViewMatrix[3*4+3];
        let eye = vec3.fromValues(invViewMatrix[3*4+0]/w, invViewMatrix[3*4+1]/w, invViewMatrix[3*4+2]/w);

        // Calculate center
        let front = vec3.fromValues(-invViewMatrix[2*4+0], -invViewMatrix[2*4+1], -invViewMatrix[2*4+2]);
        let center = vec3.fromValues(eye[0] + front[0], eye[1] + front[1], eye[2] + front[2]);
        
        mat4.lookAt(_viewMatrix, eye, center, up);
	}

}

module.exports = Fly;