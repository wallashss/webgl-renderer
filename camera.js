"use strict";

function Camera()
{
	var self = this;
	let examineManipulator = new Examine();
	let flyManipulator = new Fly();
	
// 	let manipulator = flyManipulator;
// 	let manipulator = examineManipulator;
	let manipulator = null;
	
	let mouseState = {x: 0, y: 0,
						 mousePress: false};
	let state = {yawIntensity: 0.0,
				pitchIntensity: 0.0,
				pivot: vec3.fromValues(0.0, 0.0, 0.0),
				angularVelocity: 0.0,
				zoomIntensity: 0.0,
				maximumZoom: 0.0,
				velocity: vec3.fromValues(0.0, 0.0, 0.0),
				forward: 0, backward: 0,
				left: 0, right: 0,
				up: 0, down: 0};
	let forceDraw = false;
	
	let velocity = 1.0;
	let velocityScale = 1.0;
	
	let manipulatorType = 0;
	let EXAMINE_MANIPULATOR_TYPE = 0;
	let FLY_MANIPULATOR_TYPE = 1;	
	
	this.rotate = function(yawIntensity, pitchIntensity)
	{
		state.yawIntensity = yawIntensity;
		state.pitchIntensity = pitchIntensity;
	}
	
	this.zoom = function(intensity)
	{
		state.zoomIntensity = intensity;
	}
	
	this.setViewMatrix = function(viewMatrix)
	{
		forceDraw = true;
		manipulator.setViewMatrix(viewMatrix);
	}
	
	this.getViewMatrix = function()
	{
		return manipulator.getViewMatrix();
	}
	
	this.setCamera = function(eye, center, up)
	{
		let v = mat4.create();
		mat4.lookAt(v, eye, center, up);
		manipulator.setViewMatrix(v);
		
		state.pivot = vec3.clone(center);
		state.worldUp = vec3.clone(up);
		
		forceDraw = true;
	}
	
	this.setFlyMode = function()
	{
		manipulatorType = FLY_MANIPULATOR_TYPE;
	
		if(manipulator)
		{
			let viewMatrix = manipulator.getViewMatrix();
			flyManipulator.setViewMatrix(viewMatrix);
			flyManipulator.applyRestrictions(state.worldUp);
		}
		manipulator = flyManipulator;
		
	}
	
	this.setExamineMode = function()
	{
		manipulatorType = EXAMINE_MANIPULATOR_TYPE;
		
		if(manipulator)
		{
			let viewMatrix = manipulator.getViewMatrix();
			examineManipulator.setViewMatrix(viewMatrix);
		}
		manipulator = examineManipulator;
	}
						 
	this.installCamera = function(element, drawcallback)
	{
		let timer = new Timer();
		
		if(element)
		{
			element.addEventListener("mousedown", function(e)
			{
				mouseState.mousePress = true;
				mouseState.x = e.clientX;
				mouseState.y = e.clientY;
			});
			
			element.addEventListener("mouseup", function(e)
			{
				mouseState.mousePress = false;
			});
			
			element.addEventListener("mousemove", function(e)
			{
				if(mouseState.mousePress)
				{
					self.rotate(-mouseState.x + e.clientX, -mouseState.y + e.clientY);
					mouseState.x = e.clientX;
					mouseState.y = e.clientY;
				}
			});
			
			element.addEventListener("wheel", function(e)
			{
				let delta = 0.0;
				if(e.deltaMode == WheelEvent.DOM_DELTA_PIXEL)
				{
					delta = e.deltaY;
				}
				else if(e.deltaMode == WheelEvent.DOM_DELTA_LINE)
				{
					delta = e.deltaY * 33;
				}
				else
				{
					if(e.deltaY > 0)
					{
						delta = 10;
					}
					else if(e.delta < 0)
					{
						delta = -10;
					}
				}
				self.zoom(delta * 0.001);
			});
			
			// WORKAROUND
			window.addEventListener("keydown", function(e)
			{
				if(document.activeElement)
				{
					if(document.activeElement.tagName === "textarea" || document.activeElement.tagName === "input")
					{
						return;
					}
				}
				if(e.shiftKey && (e.key === "W" || e.key === "w" || e.key === "ArrowUp"))
				{
					state.up = 1.0;
				}
				else if(e.shiftKey && (e.key === "S" || e.key === "s" || e.key === "ArrowDown"))
				{
					state.down = 1.0;
				}
				else if(e.key === "W" || e.key === "w" || e.key === "ArrowUp")
				{
					state.forward = 1.0;
				}
				else if(e.key === "S" || e.key === "s" || e.key === "ArrowDown")
				{
					state.backward = 1.0;
				}
				else if(e.key === "A" || e.key === "a" || e.key === "ArrowLeft")
				{
					state.left = 1.0;
				}
				else if(e.key === "D" || e.key === "d" || e.key === "ArrowRight")
				{
					state.right = 1.0;
				}
				
			});
			
			window.addEventListener("keyup", function(e)
			{
				if(e.key === "W" || e.key === "w" || e.key === "ArrowUp")
				{
					state.up = 0.0;
					state.forward = 0.0;
				}
				else if(e.key === "S" || e.key === "s" || e.key === "ArrowDown")
				{
					state.backward = 0.0;
					state.down = 0.0;
				}
				else if(e.key === "A" || e.key === "a" || e.key === "ArrowLeft")
				{
					state.left = 0.0;
				}
				else if(e.key === "D" || e.key === "d" || e.key === "ArrowRight")
				{
					state.right = 0.0;
				}
			});
			
		}
		
		let frameCallback = function()
		{
			let dt = timer.elapsedTime();
			if(drawcallback)
			{
				if(manipulator.update(dt, state) || forceDraw)
				{
					drawcallback(manipulator.getViewMatrix(), dt);
					forceDraw = false;
				}
			}
			window.requestAnimationFrame(frameCallback);
			timer.restart();
		};
		
		if(drawcallback)
		{
			drawcallback(manipulator.getViewMatrix(), 0);
		}
		
		frameCallback();
	}
	
	
	this.setVelocity = function(newVelocity)
	{
		velocityScale = newVelocity;
		state.velocity = vec3.fromValues(velocity * velocityScale, velocity * velocityScale, velocity * velocityScale);
	}
	
	var init = function()
	{
		self.setExamineMode();
		let eye = vec3.fromValues(0, 0, -5);
		let center = vec3.fromValues(0, 0, 0);
		let up = vec3.fromValues(0, 1, 0);
		
		let v = mat4.create();
		mat4.lookAt(v, eye, center, up);
		manipulator.setViewMatrix(v);
		
		state.pivot = vec3.clone(center);
		state.worldUp = vec3.clone(up);
		state.angularVelocity = 30.0;
		state.maximumZoom = 1.0;
		state.velocity = vec3.fromValues(velocity, velocity, velocity);
	}();
}
window.Camera = Camera;