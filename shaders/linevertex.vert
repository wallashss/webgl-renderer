attribute vec4 position;
attribute vec4 normal;
attribute highp mat4 model;
attribute highp vec4 colorInstance;

varying vec4 currentColor;
uniform highp vec2 screen;
uniform highp mat4 modelViewProjection;


void main (void)
{
	vec4 a = modelViewProjection * model * vec4(position.xyz, 1.0);
	vec4 b = modelViewProjection * model * vec4(normal.xyz, 1.0);
	
	// vec4 a = modelViewProjection * vec4(position.xyz, 1.0);
	// vec4 b = modelViewProjection * vec4(normal.xyz, 1.0);

	a.xy /= a.w;
	b.xy /= b.w;

	vec2 diff = a.xy - b.xy;
	vec2 perpendicular = normalize(vec2(diff.y, -diff.x));
	
	a.xy += perpendicular * normal.w / screen ;

	a.xy *= a.w;

	currentColor = colorInstance;
	// currentColor = vec4(1, 0, 0, 1);

	gl_Position = a;
}