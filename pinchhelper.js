"use strict";

function PinchHelper (element)
{
	this.prevDist = null;
	this.map = {};
	this.arr = [];
	this.count = 0;

	this.initPoint = null;
	this.lastPoint = null;
	this.pinchCallback = () => {};

	element.addEventListener("pointerdown", (e) =>
	{
		if(e.pointerId)
		{
			this.map[e.pointerId] = e;
			this.arr = Object.values(this.map);


			if(this.arr.length === 2)
			{
				let a = this.arr[0];
				let b = this.arr[1];


				this.initPoint = [(a.clientX + b.clientX) * 0.5, 
								  (a.clientY + b.clientY) * 0.5];
				// e.preventDefault();
			}
		}
		// e.preventDefault();
	});

	element.addEventListener("pointermove", (e) =>
	{
		// console.log(e);
		if(e.pointerId)
		{
			this.map[e.pointerId] = e;
			this.arr = Object.values(this.map);
		}
		else
		{
			return;
		}

	
		if(this.arr.length === 2)
		{
			let a = this.arr[0];
			let b = this.arr[1];

			let dist = Math.pow(a.clientX - b.clientX, 2) +
					   Math.pow(a.clientY - b.clientY, 2);
			dist = Math.sqrt(dist);
			let currPoint = [(a.clientX + b.clientX) * 0.5, 
							  (a.clientY + b.clientY) * 0.5];

			let deltaPos = [0, 0];
		
			
			if(this.lastPoint)
			{
				deltaPos[0] = -(this.lastPoint[0] - currPoint[0]);
				deltaPos[1] = -(this.lastPoint[1] - currPoint[1]);
			}
			
			if(this.prevDist !== null && this.lastPoint)
			{
				let diff = this.prevDist - dist;
				this.pinchCallback(diff, this.initPoint.slice(0), deltaPos);
			}
			this.prevDist = dist;
			this.lastPoint = currPoint;

			// e.preventDefault();

		}
		// e.preventDefault();
	}, {passive: true});

	let finish = (e) =>
	{
		delete this.map[e.pointerId];
		this.arr = Object.values(this.map);

		if(this.arr.length < 2)
		{
			this.prevDist = null;
			this.map = {};
			this.arr = [];
		}
	}


	element.addEventListener("pointerup", (e) =>
	{
		finish(e);
	}, {passive: true});

	element.addEventListener("pointercancel", (e) =>
	{
		finish(e);
	}, {passive: true});

	element.addEventListener("pointerout", (e) =>
	{
		finish(e);
	}, {passive: true});

	element.addEventListener("pointerleave", (e) =>
	{
		finish(e);
	}, {passive: true});
}

PinchHelper.prototype.setPinchCallback = function(pinchCallback)
{
	this.pinchCallback = pinchCallback;

}

module.exports = PinchHelper;

