"use strict";

const _glMatrix = require("gl-matrix");

const vec3 = _glMatrix.vec3;
const vec4 = _glMatrix.vec4;
const mat4 = _glMatrix.mat4;

const glMatrix = _glMatrix.glMatrix;

function Examine()
{
	var _isPanning = false;
	var _viewMatrix = mat4.create();
	var _initViewMatrix = mat4.create();
	
	this.setViewMatrix = function(viewMatrix)
	{
		_isPanning = false;
		_viewMatrix = mat4.clone(viewMatrix);
		_initViewMatrix = mat4.clone(viewMatrix);
	}
	
	this.getViewMatrix = function()
	{
		return _viewMatrix;
	}
	
	this.update = function(dt, state)
	{
		if(!glMatrix.equals(state.yawIntensity, 0.0) || 
			!glMatrix.equals(state.pitchIntensity, 0.0) || 
			!glMatrix.equals(state.zoomIntensity, 0.0) || _isPanning)
		{
            let viewMatrix = mat4.clone(_viewMatrix);

			if(_isPanning)
			{
                viewMatrix = mat4.clone(_initViewMatrix);
			}

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

            if(!glMatrix.equals(state.zoomIntensity, 0.0))
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

			if(_isPanning)
			{

				// THis is a future pan implementation
				
                // glm::dmat4 projectionMatrix = glm::make_mat4(_state->projectionMatrix);
//                 glm::dmat4 worldToScreenMatrix = projectionMatrix * viewMatrix;
// 
//                 glm::dvec4 pickedPoint = glm::dvec4(_pickedPoint[0], _pickedPoint[1], _pickedPoint[2], 1.0);
//                 glm::dvec4 projectedPoint = worldToScreenMatrix * pickedPoint;
// 
// 				projectedPoint.x = projectedPoint.x / projectedPoint.w;
// 				projectedPoint.y = projectedPoint.y / projectedPoint.w;
// 
// 				projectedPoint.x = ((projectedPoint.x + 1.0) / 2.0) * _state->viewport[2] + _state->viewport[0];
// 				projectedPoint.y = ((projectedPoint.y + 1.0) / 2.0) * _state->viewport[3] + _state->viewport[1];
// 
// 				projectedPoint.x = projectedPoint.x + _dx;
// 				projectedPoint.y = projectedPoint.y + _dy;
// 
// 				projectedPoint.x = (projectedPoint.x - _state->viewport[0]) * 2.0 / _state->viewport[2] - 1.0;
// 				projectedPoint.y = (projectedPoint.y - _state->viewport[1]) * 2.0 / _state->viewport[3] - 1.0;
// 
// 				projectedPoint.x = projectedPoint.x * projectedPoint.w;
// 				projectedPoint.y = projectedPoint.y * projectedPoint.w;
// 
// 
//                 glm::dmat4 screenToWorldMatrix = glm::inverse(worldToScreenMatrix);
//                 glm::dvec4 unprojectedPoint = screenToWorldMatrix * projectedPoint;
// 
//                 glm::dvec4 panTranslation = unprojectedPoint - pickedPoint;
// 
//                 glm::dmat4 translation = glm::translate(glm::dmat4(), glm::dvec3(panTranslation));
// 
// 				viewMatrix = viewMatrix * translation;
// 
//                 glm::dvec4 pivot = glm::dvec4(_initPivot[0], _initPivot[1], _initPivot[2], 1.0);
//                 glm::dvec4 projectedPivot = worldToScreenMatrix * pivot;
//                 worldToScreenMatrix = projectionMatrix * viewMatrix;
//                 screenToWorldMatrix = glm::inverse(worldToScreenMatrix);
//                 glm::dvec4 newPivot = screenToWorldMatrix * projectedPivot;
// 
// 				_state->pivot[0] = newPivot[0];
// 				_state->pivot[1] = newPivot[1];
// 				_state->pivot[2] = newPivot[2];
			}
			_viewMatrix = mat4.clone(viewMatrix);

			return true;
		}
		else
		{
			return false;
		}
	}

}
module.exports = Examine;