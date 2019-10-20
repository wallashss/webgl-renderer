attribute vec4 position;
attribute vec4 normal;
attribute vec4 texcoord;
attribute highp mat4 model;
attribute highp vec4 colorInstance;

varying vec4 currentColor;
uniform highp vec2 screen;
uniform highp mat4 modelViewProjection;
uniform highp mat4 modelView;


void main (void)
{
	vec4 a = modelViewProjection * model * vec4(position.xyz, 1.0);
	vec4 b = modelViewProjection * model * vec4(normal.xyz, 1.0);
	vec4 c = modelViewProjection * model * vec4(texcoord.xyz, 1.0);

	a.xy /= a.w;
	b.xy /= b.w;
	c.xy /= c.w;

	vec2 ad = b.xy - a.xy; // a direction
	vec2 bd = c.xy - b.xy; // b direction

	ad = normalize(ad);
	bd = normalize(bd);

	vec2 perpendicular1 = normalize(vec2(ad.y, -ad.x));
	vec2 perpendicular2 = normalize(vec2(bd.y, -bd.x));

	bd = -bd;

	vec2 as = b.xy + perpendicular1 * texcoord.w / screen;
	vec2 bs = b.xy + perpendicular2 * texcoord.w / screen;

	float u = (as.y*bd.x + bd.y*bs.x - bs.y*bd.x - bd.y*as.x ) / (ad.x*bd.y - ad.y*bd.x);

	if(abs(dot(bd, ad)) > 0.9)
	{
		ad = vec2(0);
	}

	b.xy = vec2(as.x + ad.x * u,  as.y + ad.y * u);

	b.xy *= b.w;

	currentColor = colorInstance;

	gl_Position = b;
}