"use strict";

const _glMatrix = require("gl-matrix");
const vec3  = _glMatrix.vec3;
const mat4  = _glMatrix.mat4;

const Fly = require("./lvrl/fly");
const Examine = require("./lvrl/examine");
const OrthoExamine = require("./lvrl/orthoexamine");
const Timer = require("./timer");
const PinchHelper = require("./pinchhelper");


function Camera()
{
	this.examineManipulator = new Examine();
	this.flyManipulator = new Fly();
	this.orthoManipulator = new OrthoExamine();
	
	this.manipulator = null;
	
	this.mouseState = {x: 0, y: 0, mousePress: false, index: -1}; // index: button index or touch count
	this.state = {yawIntensity: 0.0,
				pitchIntensity: 0.0,
				pivot: vec3.fromValues(0.0, 0.0, 0.0),
				pan: vec3.fromValues(0.0, 0.0, 0.0),
				pickedPoint: vec3.fromValues(0, 0, 0),
				angularVelocity: 0.0,
				zoomIntensity: 0.0,
				maximumZoom: 0.0,
				screen: [0, 0],
				scale: vec3.fromValues[1, 1, 1],
				velocity: vec3.fromValues(0.0, 0.0, 0.0),
				forward: 0, backward: 0,
				left: 0, right: 0,
				up: 0, down: 0,
				isOrtho: false};

	this.near = 1e-1;
	this.far = 1e5;
	this.fov = 45;

	this.forceDraw = false;
	this.isPanPrimary = false;
	
	this.velocity = 1.0;
	this.velocityScale = 1.0;
	
	this.manipulatorType = 0;

	this.onKey = () => {};
	
	
	this.setExamineMode();

	// Init view matrix
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

	// Init projection matrix
	let m = mat4.create();
	mat4.perspective(m, this.fov, 1, this.near, this.far);
	this.manipulator.setProjectionMatrix(m);

	this.pickCallback = () =>{};

	this.iddleUpdate = false;
}

Camera.EXAMINE_MANIPULATOR_TYPE = 0;
Camera.FLY_MANIPULATOR_TYPE = 1;
Camera.ORTHO_MANIPULATOR_TYPE = 2;


Camera.prototype.rotate = function(yawIntensity, pitchIntensity)
{
	this.state.yawIntensity = yawIntensity;
	this.state.pitchIntensity = pitchIntensity;
}

Camera.prototype.setPickcallback = function(callback)
{
	this.pickCallback = callback;
}

Camera.prototype.beginPan = function(x, y)
{
	this.pickCallback(x, y, (pos, projectionMatrix, screenBounds) =>
	{
		if(pos)
		{
			// let vp = mat4.create();
			// mat4.mul(vp, projectionMatrix, this.viewMatrix);


			// vec3.transformMat4(pivot, pivot, viewMatrix);

			// vec3.trans
			// console.log(x, y);
			// this.manipulator.setPanning(true);
			this.state.projectionMatrix = projectionMatrix;
			this.state.screen[0] = screenBounds.width;
			this.state.screen[1] = screenBounds.height;

			
			vec3.set(this.state.pickedPoint, pos[0], pos[1], pos[2] || 0);
			// console.log(pos);
		}
		
	});
}

// Camera.prototype.pan = function(x, y)
// {
// 	this.pickCallback(x, y, (pos, projectionMatrix, bounds) =>
// 	{
// 		if(pos)
// 		{
// 			// let vp = mat4.create();
// 			// mat4.mul(vp, projectionMatrix, this.viewMatrix);


// 			// vec3.transformMat4(pivot, pivot, viewMatrix);

// 			// vec3.trans
// 			// console.log(x, y);
// 			this.manipulator.setPanning(true);
// 			this.state.projectionMatrix = projectionMatrix;
// 			this.state.screen = {width: bounds.width, height: bounds.height};
// 			vec3.set(this.state.pickedPoint, pos[0], pos[1], pos[2] || 0);
// 			// console.log(pos);
// 		}
		
// 	});
// }

Camera.prototype.setPanAsPrimary = function(isPrimary = true)
{
	this.isPanPrimary = isPrimary;
}

Camera.prototype.zoom = function(intensity)
{
	this.state.zoomIntensity = intensity;
}

Camera.prototype.setOrthoMode = function(isOrtho = true)
{
	// this.state.isOrtho = isOrtho;
	this.manipulatorType = Camera.ORTHO_MANIPULATOR_TYPE;

	if(this.manipulator)
	{
		let projectionMatrix = this.manipulator.getProjectionMatrix();
		this.orthoManipulator.setProjectionMatrix(projectionMatrix);
	}
	this.manipulator.near = this.near;
	this.manipulator.far = this.far;
	this.manipulator = this.orthoManipulator;
	
	this.isPanPrimary = true;
}

Camera.prototype.setFlyMode = function()
{
	this.manipulatorType = Camera.FLY_MANIPULATOR_TYPE;

	if(this.manipulator)
	{
		let viewMatrix = this.manipulator.getViewMatrix();
		this.flyManipulator.setViewMatrix(viewMatrix);
		this.flyManipulator.applyRestrictions(this.state.worldUp);
	}
	this.manipulator = this.flyManipulator;
}

Camera.prototype.setExamineMode = function()
{
	this.manipulatorType = Camera.EXAMINE_MANIPULATOR_TYPE;
	
	if(this.manipulator)
	{
		let viewMatrix = this.manipulator.getViewMatrix();
		this.examineManipulator.setViewMatrix(viewMatrix);
	}
	this.manipulator = this.examineManipulator;
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

Camera.prototype.setProjectionMatrix = function(projectionMatrix, forceDraw = true)
{
	this.forceDraw = forceDraw;
	this.manipulator.setProjectionMatrix(projectionMatrix);
}

Camera.prototype.getProjectionMatrix = function()
{
	return this.manipulator.getProjectionMatrix();
}

Camera.prototype.setPivot = function(pivot)
{
	this.state.pivot = vec3.clone(pivot);
}

Camera.prototype.setCamera = function(eye, center, up)
{
	let v = mat4.create();
	mat4.lookAt(v, eye, center, up);
	this.manipulator.setViewMatrix(v);
	
	this.state.pivot = vec3.clone(center);
	this.state.worldUp = vec3.clone(up);
	
	this.forceDraw = true;
	return v;
}

Camera.prototype.setOnKey = function(callback = () =>{})
{
	this.onKey = callback;
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
					 
Camera.prototype.installCamera = function(element, viewCallback, projectionCallback, resizeCallback)
{
	let startTouch = (e, index = 0) =>
	{
		mouseState.mousePress = true;
		mouseState.x = e.clientX;
		mouseState.y = e.clientY;
		mouseState.index = index;

		if(this.isPanPrimary || this.mouseState.index === 2)
		{
			this.beginPan(e.clientX, e.clientY);
			mouseState.x = e.clientX;
			mouseState.y = e.clientY;
		}
	}

	let moveTouch = (e) =>
	{
		if(this.mouseState.mousePress && (this.isPanPrimary || this.mouseState.index === 2))
		{
			let sx = mouseState.x / this.state.screen[0];
			let sy = mouseState.y / this.state.screen[1];

			let ex = e.clientX / this.state.screen[0];
			let ey = e.clientY / this.state.screen[1];

			// vec3.set(this.state.pan, mouseState.x - e.clientX, -mouseState.y + e.clientY, 0);

			vec3.set(this.state.pan, sx - ex, -sy + ey, 0);
			// console.log(e.clientX / this.state.screen[0], e.clientY / this.state.screen[1]);
			// console.log(this.state.pan);
			mouseState.x = e.clientX;
			mouseState.y = e.clientY;
		}
		else if (this.mouseState.mousePress && this.mouseState.index === 0)
		{
			this.rotate(-mouseState.x + e.clientX, -mouseState.y + e.clientY);
			mouseState.x = e.clientX;
			mouseState.y = e.clientY;
		}
	}

	let endTouch = (e) =>
	{
		mouseState.mousePress = false;
		mouseState.index = -1;		
	}
	
	let mouseState = this.mouseState;
	if(element)
	{
		window.addEventListener("mousedown", (e) =>
		{
			if(e.target === element)
			{
				startTouch(e, e.button);
			}
			// e.preventDefault();
		});
		
		window.addEventListener("mouseup", (e) =>
		{
			endTouch(e);
		});

		window.addEventListener("mouseout", (e) =>
		{
			endTouch(e);
		});

		// Disable context menu on mac os x
		// Ctrl key + click set to context menu... and we do not want it now
		if(navigator && navigator.platform == "MacIntel")
		{
			window.addEventListener('contextmenu', (e) =>
			{
				if(e.target === element)
				{
					e.preventDefault();
				}
			});

			element.addEventListener('contextmenu', (e) =>
			{
				e.preventDefault();
			});
		}

		
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
				if(e.touches.length === 1)
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
		
		let _scroll = (delta) =>
		{
			
			if(this.manipulatorType === Camera.FLY_MANIPULATOR_TYPE)
			{
				let deltaV = delta * this.velocityScale * 0.1;
				this.velocity += deltaV;
				if(this.velocity < Math.abs(deltaV))
				{
					this.velocity = Math.abs(deltaV);
				}
				this.state.velocity = vec3.fromValues(this.velocity, this.velocity, this.velocity);
			}
			else 
			{
				this.zoom(delta * 0.005);
			}
		}
		
		element.addEventListener("wheel", (e) =>
		{
			e.preventDefault();
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
        
			_scroll(delta);
		});

		let pinchHelper = new PinchHelper(element);
		pinchHelper.setPinchCallback((diff, position, pan) =>
		{
			_scroll(diff*10);
		})

		
		// WORKAROUND
		window.addEventListener("keydown", (e) =>
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
				this.state.up = 1.0;
			}
			else if(e.shiftKey && (e.key === "S" || e.key === "s" || e.key === "ArrowDown"))
			{
				this.state.down = 1.0;
			}
			else if(e.key === "W" || e.key === "w" || e.key === "ArrowUp")
			{
				this.state.forward = 1.0;
			}
			else if(e.key === "S" || e.key === "s" || e.key === "ArrowDown")
			{
				this.state.backward = 1.0;
			}
			else if(e.key === "A" || e.key === "a" || e.key === "ArrowLeft")
			{
				this.state.left = 1.0;
			}
			else if(e.key === "D" || e.key === "d" || e.key === "ArrowRight")
			{
				this.state.right = 1.0;
			}
			
		});
		
		element.addEventListener("blur", () =>
		{	
			this.reset();
		});

		window.addEventListener("keyup", (e) =>
		{
			if(document.activeElement)
			{
				if(document.activeElement.tagName === "TEXTAREA" || 
				   document.activeElement.tagName === "INPUT" || 
				   document.activeElement.tagName === "SELECT")
				{
					this.reset();
					return;
				}
			}
			if(e.key === "W" || e.key === "w" || e.key === "ArrowUp")
			{
				this.state.up = 0.0;
				this.state.forward = 0.0;
			}
			else if(e.key === "S" || e.key === "s" || e.key === "ArrowDown")
			{
				this.state.backward = 0.0;
				this.state.down = 0.0;
			}
			else if(e.key === "A" || e.key === "a" || e.key === "ArrowLeft")
			{
				this.state.left = 0.0;
			}
			else if(e.key === "D" || e.key === "d" || e.key === "ArrowRight")
			{
				this.state.right = 0.0;
			}

			this.onKey(e);
		});

		let resize = () =>
		{
			let bounds = element.getBoundingClientRect();
			let w = bounds.width;
			let h = bounds.height;

			if(this.manipulatorType !== Camera.ORTHO_MANIPULATOR_TYPE)
			{
				let m = mat4.create();
				mat4.perspective(m, this.fov, w / h, this.near, this.far);
				this.manipulator.setProjectionMatrix(m);
			}
			else
			{

			}

			resizeCallback(w, h);
			this.forceDraw = true;
		}

		resize();
		window.addEventListener("resize", (e)=>
		{
			resize();
		});
		
	}
	
	_startProccesData.call(this, viewCallback, projectionCallback);
}

function _startProccesData(viewCallback = () => {}, projectionCallback = () => {})
{
	let timer = new Timer();
	let frameCallback = () =>
	{
		let dt = timer.elapsedTime();
		if(this.manipulator.updateView(dt, this.state) || this.iddleUpdate || this.forceDraw)
		{
			viewCallback(this.manipulator.getViewMatrix(), dt);
		}

		if(this.manipulator.updateProjection(dt, this.state) || this.iddleUpdate || this.forceDraw)
		{
			projectionCallback(this.manipulator.getProjectionMatrix(), dt);
		}

		this.forceDraw = false;

		window.requestAnimationFrame(frameCallback);
		timer.restart();
	};
	
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