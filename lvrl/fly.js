"use strict";

function Fly()
{
	var _viewMatrix = mat4.create();
	var _forwardDirection = vec3.fromValues(0.0, 0.0, -1.0);
		
	var EPSILON = 1e-5;
	
	
	this.setFowardDirection = function(forward)
	{
		_forwardDirection = vec3.clone(forward);
	}
	this.setViewMatrix = function(viewMatrix)
	{
		_viewMatrix = mat4.clone(viewMatrix);
	}
	
	this.getViewMatrix = function()
	{
		return _viewMatrix;
	}
	
	this.update = function(dt, state)
	{
        if(Utils.epsilonEqual(state.yawIntensity, 0.0, EPSILON) && Utils.epsilonEqual(state.pitchIntensity, 0.0, EPSILON) &&
           Utils.epsilonEqual(state.forward, 0.0, EPSILON) && Utils.epsilonEqual(state.backward, 0.0, EPSILON) &&
           Utils.epsilonEqual(state.left, 0.0, EPSILON) && Utils.epsilonEqual(state.right, 0.0, EPSILON) &&
           Utils.epsilonEqual(state.up, 0.0, EPSILON) && Utils.epsilonEqual(state.down, 0.0, EPSILON))
		{
			return false;
		}

        let viewMatrix = mat4.clone(_viewMatrix);
        let up4 = vec4.fromValues(state.worldUp[0], state.worldUp[1], state.worldUp[2], 0.0);
					
		vec4.transformMat4(up4, up4,viewMatrix);
		let up = vec3.fromValues(up4[0], up4[1], up4[2]);
		vec3.normalize(up, up);

        if(!Utils.epsilonEqual(state.yawIntensity, 0.0, EPSILON) || !Utils.epsilonEqual(state.pitchIntensity, 0.0, EPSILON))
		{
			if(!state.lockUpRotation)
			{
                // glm::dmat4 yawRot = glm::rotate(glm::dmat4(), glm::radians(state->yawIntensity * state->angularVelocity * dt), up);
//                 viewMatrix = yawRot * viewMatrix;
				let yawRot = mat4.create();
				mat4.rotate(yawRot, yawRot, Utils.radians(state.yawIntensity * state.angularVelocity * dt), up);
                mat4.multiply(viewMatrix, yawRot, viewMatrix);
			}

			if(!state.lockRightRotation)
			{
                // glm::dmat4 invViewMatrix = glm::inverse(viewMatrix);
//                 glm::dvec3 front = -glm::normalize(glm::dvec3(invViewMatrix[2][0], invViewMatrix[2][1], invViewMatrix[2][2]));
//                 double absPitch  = glm::acos(glm::dot(glm::make_vec3(state->worldUp), front));

				let invViewMatrix = mat4.create();
				mat4.invert(invViewMatrix, viewMatrix);
				
				let front = vec3.fromValues(-invViewMatrix[2*4+0], -invViewMatrix[2*4+1], -invViewMatrix[2*4+2]);
				vec3.normalize(front, front);
				let absPitch = Utils.degrees(Math.acos(vec3.dot(state.worldUp, front)));
				
				let deltaPitch = state.pitchIntensity * state.angularVelocity * dt;
				let auxAbsPitch = absPitch + deltaPitch;
				
				if(auxAbsPitch < 179.0 && auxAbsPitch > 1.0)
				{
					let pitchRot = mat4.create();
					
					mat4.rotate(pitchRot, pitchRot, Utils.radians(deltaPitch), vec3.fromValues(1.0, 0.0, 0.0));
					
// 					mat4.multiply(viewMatrix, tInvPivot, viewMatrix);
					mat4.multiply(viewMatrix, pitchRot, viewMatrix);
// 					mat4.multiply(viewMatrix, tPivot, viewMatrix);
				}
			}

			state.yawIntensity   = 0.0;
			state.pitchIntensity = 0.0;
		}

//         glm::dvec3 deltaS;
		let deltaS = vec3.create();
		
        deltaS[0] = state.velocity[0] * (state.left - state.right) * dt;
        deltaS[1] = state.velocity[1] * (state.down - state.up) * dt;
        deltaS[2] = state.velocity[2] * (state.backward - state.forward) * dt;

        // glm::dvec3 forward = glm::normalize(glm::make_vec3(_forwardDirection));
//         glm::dvec3 right   = glm::normalize(glm::cross(forward, up));
//         glm::dvec3 upCam   = glm::normalize(glm::cross(right, forward));
		let forward = vec3.clone(_forwardDirection);
		vec3.normalize(forward, forward);

		let right = vec3.create();
		vec3.cross(right, forward, up);
		vec3.normalize(right, right);

//         glm::dvec3 upCam   = glm::normalize(glm::cross(right, forward));
		let upCam = vec3.create();
		vec3.cross(upCam, right, forward);
		vec3.normalize(upCam, upCam);

//         glm::dvec3 totalTrans  = forward * deltaS[2] + upCam * deltaS[1] + right * deltaS[0];
// 		glm::dmat4 translation = glm::translate(glm::dmat4(), totalTrans);
		let totalTrans = vec3.fromValues(forward[0] * deltaS[2] + upCam[0] * deltaS[1] + right[0]*deltaS[0], 
										forward[1] * deltaS[2] + upCam[1] * deltaS[1] + right[1]*deltaS[0],
										forward[2] * deltaS[2] + upCam[2] * deltaS[1] + right[2]*deltaS[0]);
        let translation = mat4.create();
        mat4.translate(translation, translation, totalTrans);
        mat4.multiply(viewMatrix, translation, viewMatrix);
        
        _viewMatrix = mat4.clone(viewMatrix);

		return true;
	}
	
	this.applyRestrictions = function(up)
	{
// 		glm::dmat4 viewMatrix = glm::make_mat4(m1Array16);
//         glm::dmat4 invViewMatrix = glm::inverse(viewMatrix);
// 
//         glm::dvec4 eye(invViewMatrix[3][0], invViewMatrix[3][1], invViewMatrix[3][2], invViewMatrix[3][3]);
//         eye = eye / eye[3];
// 
//         // Calculate center
//         auto front  = -glm::dvec3(invViewMatrix[2][0], invViewMatrix[2][1], invViewMatrix[2][2]);
//         auto center = glm::dvec3(eye) + front;
// 
//         glm::dmat4 newMatrix = glm::lookAt(glm::make_vec3(glm::value_ptr(eye)), center, glm::make_vec3(state->worldUp));
//         std::memcpy(m2Array16, glm::value_ptr(newMatrix), 16 * sizeof(double));

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

window.Fly = Fly;