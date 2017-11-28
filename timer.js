"use strict";
function Timer()
{
	let self = this;
	let currentTime = new Date();
	
	this.elapsedTime = function()
	{
		let past = parseFloat(currentTime.getTime());
		
		let now = new Date().getTime();
		now = parseFloat(now);
		
		return (now - past)/1000.0;
	}
	
	this.restart = function()
	{
		currentTime = new Date();
	}

	this.tick = function(label)
	{
		console.log(label + " " + self.elapsedTime());
		self.restart();
	}
}

window.Timer = Timer;