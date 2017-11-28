function epsilonEqual(a, b, E)
{
	return Math.abs(a-b) < E;
}

function degrees(r)
{
	return r * (180.0 / Math.PI);
}

function radians(angle)
{
	return angle * Math.PI / 180.0
}

window.Utils = {};
window.Utils.epsilonEqual = epsilonEqual;
window.Utils.degrees = degrees;
window.Utils.radians = radians;