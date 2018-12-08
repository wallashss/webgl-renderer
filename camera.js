"use strict";

const _glMatrix = require("gl-matrix");
const vec3  = _glMatrix.vec3;
const mat4  = _glMatrix.mat4;

const Fly = require("./lvrl/fly");
const Examine = require("./lvrl/examine");
const Timer = require("./timer");


function Camera()
{
	this.examineManipulator = new Examine();
	this.flyManipulator = new Fly();
	
	this.manipulator = null;
	
	this.mouseState = {x: 0, y: 0, mousePress: false};
	this.state = {yawIntensity: 0.0,
				pitchIntensity: 0.0,
				pivot: vec3.fromValues(0.0, 0.0, 0.0),
				angularVelocity: 0.0,
				zoomIntensity: 0.0,
				maximumZoom: 0.0,
				velocity: vec3.fromValues(0.0, 0.0, 0.0),
				forward: 0, backward: 0,
				left: 0, right: 0,
				up: 0, down: 0};
	this.forceDraw = false;
	
	this.velocity = 1.0;
	this.velocityScale = 1.0;
	
	this.manipulatorType = 0;

	this.onKey = () => {};
	
	
	this.setExamineMode();
	let eye = vec3.fromValues(0, 0, -5);
	let center = vec3.fromValues(0, 0, 0);
	let up = vec3.fromValues(0, 1, 0);
	
	let v = mat4.create();
	mat4.lookAt(v, eye, center, up);
	this.manipulator.setViewMatrix(v);
	
	this.state.pivot = vec3.clone(center);
	this.state.worldUp = vec3.clone(up);
	this.state.angularVelocity = 30.0;
	this.state.maximumZoom = 1.0;
	this.state.velocity = vec3.fromValues(this.velocity, this.velocity, this.velocity);

	this.iddleUpdate = false;
}


Camera.EXAMINE_MANIPULATOR_TYPE = 0;
Camera.FLY_MANIPULATOR_TYPE = 1;

const EXAMINE_MANIPULATOR_TYPE = Camera.EXAMINE_MANIPULATOR_TYPE;
const FLY_MANIPULATOR_TYPE = Camera.FLY_MANIPULATOR_TYPE;	


Camera.prototype.rotate = function(yawIntensity, pitchIntensity)
{
	this.state.yawIntensity = yawIntensity;
	this.state.pitchIntensity = pitchIntensity;
}

Camera.prototype.zoom = function(intensity)
{
	this.state.zoomIntensity = intensity;
}

Camera.prototype.setViewMatrix = function(viewMatrix, forceDraw = true)
{
	this.forceDraw = forceDraw;
	this.manipulator.setViewMatrix(viewMatrix);
}

Camera.prototype.getViewMatrix = function()
{
	return this.manipulator.getViewMatrix();
}


Camera.prototype.setCamera = function(eye, center, up)
{
	let v = mat4.create();
	mat4.lookAt(v, eye, center, up);
	this.manipulator.setViewMatrix(v);
	
	this.state.pivot = vec3.clone(center);
	this.state.worldUp = vec3.clone(up);
	
	this.forceDraw = true;
}

Camera.prototype.setFlyMode = function()
{
	this.manipulatorType = FLY_MANIPULATOR_TYPE;

	if(this.manipulator)
	{
		let viewMatrix = this.manipulator.getViewMatrix();
		this.flyManipulator.setViewMatrix(viewMatrix);
		this.flyManipulator.applyRestrictions(this.state.worldUp);
	}
	this.manipulator = this.flyManipulator;
	
}

Camera.prototype.setOnKey = function(callback = () =>{})
{
	this.onKey = callback;
}

Camera.prototype.setExamineMode = function()
{
	this.manipulatorType = EXAMINE_MANIPULATOR_TYPE;
	
	if(this.manipulator)
	{
		let viewMatrix = this.manipulator.getViewMatrix();
		this.examineManipulator.setViewMatrix(viewMatrix);
	}
	this.manipulator = this.examineManipulator;
}

Camera.prototype.moveFoward = function(v)
{
	if(v > 0)
	{
		this.state.forward = 1.0;
		this.state.backward = 0.0;
	}
	else if ( v < 0 )
	{
		this.state.forward = 0.0;
		this.state.backward = 1.0;

	}
	else
	{
		this.state.forward = 0.0;
		this.state.backward = 0.0;
	}
}

Camera.prototype.moveUp = function(v)
{
	if(v > 0)
	{
		this.state.up = 1.0;
		this.state.down = 0.0;
	}
	else if ( v < 0 )
	{
		this.state.forward = 0.0;
		this.state.down = 1.0;
	}
	else
	{
		this.state.up = 0.0;
		this.state.down = 0.0;
	}
}

Camera.prototype.moveRight = function(v)
{
	if(v > 0)
	{
		this.state.right = 1.0;
		this.state.left = 0.0;
	}
	else if ( v < 0 )
	{
		this.state.right = 0.0;
		this.state.left = 1.0;
	}
	else
	{
		this.state.right = 0.0;
		this.state.left = 0.0;
	}
}

Camera.prototype.reset = function()
{
	this.state.right = 0.0;
	this.state.left = 0.0;
	this.state.up = 0.0;
	this.state.down = 0.0;
	this.state.forward = 0.0;
	this.state.backward = 0.0;
}
					 
Camera.prototype.installCamera = function(element, drawcallback)
{
	let self = this;

	let startTouch = (e) =>
	{
		mouseState.mousePress = true;
		mouseState.x = e.clientX;
		mouseState.y = e.clientY;
	}

	let moveTouch = (e) =>
	{
		// mouseState.mousePress = true;
		// mouseState.x = e.clientX;
		// mouseState.y = e.clientY;

		if (self.mouseState.mousePress)
		{
			// self.rotate(-mouseState.x + e.clientX, -mouseState.y + e.clientY);
			// mouseState.x = e.clientX;
			// mouseState.y = e.clientY;
			self.rotate(-mouseState.x + e.clientX, -mouseState.y + e.clientY);
			mouseState.x = e.clientX;
			mouseState.y = e.clientY;
		}

	}

	let endTouch = (e) =>
	{
		// mouseState.mousePress = true;
		// mouseState.x = e.clientX;
		// mouseState.y = e.clientY;
		mouseState.mousePress = false;
		// endTouch();
	}
	
	let mouseState = this.mouseState;
	if(element)
	{
		window.addEventListener("mousedown", (e) =>
		{
			if(e.target === element)
			{
				// mouseState.mousePress = true;
				// mouseState.x = e.clientX;
				// mouseState.y = e.clientY;
				startTouch(e);
			}
		});
		
		window.addEventListener("mouseup", (e) =>
		{
			// mouseState.mousePress = false;
			endTouch(e);
		});

		
		window.addEventListener("mousemove", (e) =>
		{
			moveTouch(e);
		});

		element.addEventListener("touchstart", (e) =>
		{

			if(e.touches)
			{
				if(e.touches.length === 1)
				{
					startTouch(e.touches[0]);
				}
			}
		}, false);

		element.addEventListener("touchmove", (e) =>
		{
			if(e.touches)
			{
				if(e.touches.length > 0)
				{
					moveTouch(e.touches[0]);
				}
			}

		}, false);

		element.addEventListener("touchend", (e) =>
		{
			endTouch();
		}, false);

		element.addEventListener("touchcancel", (e) =>
		{
			endTouch();
		}, false);
		
		
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
        
			
			if(self.manipulatorType === EXAMINE_MANIPULATOR_TYPE)
			{
				self.zoom(delta * 0.001);
			}
			else if(self.manipulatorType === FLY_MANIPULATOR_TYPE)
			{
				let deltaV = delta * self.velocityScale * 0.1;
				self.velocity += deltaV;
				if(self.velocity < Math.abs(deltaV))
				{
					self.velocity = Math.abs(deltaV);
				}
				self.state.velocity = vec3.fromValues(self.velocity, self.velocity, self.velocity);
			}
		});
		
		// WORKAROUND
		window.addEventListener("keydown", function(e)
		{
			if(document.activeElement)
			{
				if(document.activeElement.tagName === "TEXTAREA" || 
				   document.activeElement.tagName === "INPUT" || 
				   document.activeElement.tagName === "SELECT")
				{
					return;
				}
			}
			if(e.shiftKey && (e.key === "W" || e.key === "w" || e.key === "ArrowUp"))
			{
				self.state.up = 1.0;
			}
			else if(e.shiftKey && (e.key === "S" || e.key === "s" || e.key === "ArrowDown"))
			{
				self.state.down = 1.0;
			}
			else if(e.key === "W" || e.key === "w" || e.key === "ArrowUp")
			{
				self.state.forward = 1.0;
			}
			else if(e.key === "S" || e.key === "s" || e.key === "ArrowDown")
			{
				self.state.backward = 1.0;
			}
			else if(e.key === "A" || e.key === "a" || e.key === "ArrowLeft")
			{
				self.state.left = 1.0;
			}
			else if(e.key === "D" || e.key === "d" || e.key === "ArrowRight")
			{
				self.state.right = 1.0;
			}
			
		});
		
		element.addEventListener("blur", () =>
		{	
			self.reset();
		});

		window.addEventListener("keyup", (e) =>
		{
			if(document.activeElement)
			{
				if(document.activeElement.tagName === "TEXTAREA" || 
				   document.activeElement.tagName === "INPUT" || 
				   document.activeElement.tagName === "SELECT")
				{
					self.reset();
					return;
				}
			}
			if(e.key === "W" || e.key === "w" || e.key === "ArrowUp")
			{
				self.state.up = 0.0;
				self.state.forward = 0.0;
			}
			else if(e.key === "S" || e.key === "s" || e.key === "ArrowDown")
			{
				self.state.backward = 0.0;
				self.state.down = 0.0;
			}
			else if(e.key === "A" || e.key === "a" || e.key === "ArrowLeft")
			{
				self.state.left = 0.0;
			}
			else if(e.key === "D" || e.key === "d" || e.key === "ArrowRight")
			{
				self.state.right = 0.0;
			}

			self.onKey(e);
		});
		
	}
	
	
	self.onProcessData(drawcallback);
}

Camera.prototype.onProcessData = function(drawcallback = ()=>{})
{
	let timer = new Timer();
	let self = this;
	let frameCallback = function()
	{
		let dt = timer.elapsedTime();
		// console.log("camera update");
		if(self.manipulator.update(dt, self.state) || self.iddleUpdate || self.forceDraw)
		{
			// console.log("after camera update");
			drawcallback(self.manipulator.getViewMatrix(), dt);
			self.forceDraw = false;
		}
		window.requestAnimationFrame(frameCallback);
		timer.restart();
	};
	
	if(this.drawcallback)
	{
		drawcallback(self.manipulator.getViewMatrix(), 0);
	}
	
	frameCallback();
}

Camera.prototype.setVelocity = function(newVelocity)
{
	// velocityScale = newVelocity;
	this.velocityScale = 5;
	this.velocity = newVelocity;
	this.state.velocity = vec3.fromValues(this.velocity, this.velocity, this.velocity);
}

module.exports = Camera;