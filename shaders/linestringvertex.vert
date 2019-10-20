attribute vec4 position;
attribute vec4 normal;
attribute vec4 texcoord;
attribute highp mat4 model;
attribute highp vec4 colorInstance;

varying vec4 currentColor;
uniform highp vec2 screen;
uniform highp mat4 modelViewProjection;
uniform highp mat4 modelView;


float perDot(vec2 a, vec2 b)
{
	vec2 p = vec2(-a.y, a.x);
	return dot(a, b);
}

void main (void)
{
	vec4 a = modelViewProjection * model * vec4(position.xyz, 1.0);
	vec4 b = modelViewProjection * model * vec4(normal.xyz, 1.0);
	vec4 c = modelViewProjection * model * vec4(texcoord.xyz, 1.0);

	a.xy /= a.w;
	b.xy /= b.w;
	c.xy /= c.w;

	vec2 dir1 = b.xy - a.xy;
	vec2 dir2 = c.xy - b.xy;

	dir1 = normalize(dir1);
	dir2 = normalize(dir2);

	vec2 perpendicular1 = normalize(vec2(dir1.y, -dir1.x));
	vec2 perpendicular2 = normalize(vec2(dir2.y, -dir2.x));


	vec2 p1 = b.xy + perpendicular1 * texcoord.w / screen;
	vec2 p2 = b.xy + perpendicular2 * texcoord.w / screen;

	vec2 as = p1;
	vec2 bs = p2;

	vec2 ad = dir1;
	vec2 bd = -dir2;

	// u := (as.y*bd.x + bd.y*bs.x - bs.y*bd.x - bd.y*as.x ) / (ad.x*bd.y - ad.y*bd.x)
	float u = (as.y*bd.x + bd.y*bs.x - bs.y*bd.x - bd.y*as.x ) / (ad.x*bd.y - ad.y*bd.x);
	float v = (as.x + ad.x * u - bs.x) / bd.x;

	if(abs(dot(dir1, -dir2)) > 0.9)
	{
		ad = vec2(0);
	}

	b.xy = vec2(as.x + ad.x * u,  as.y + ad.y * u);

	// b.xy = p1.xy ;

	// b.xy = p1.xy;
	// b.xy = p2.xy + 100.0 * dir2 / screen;
	// b.xy = b.xy + 100.0 * (dir1 + dir2) / screen ;

	// b.xy += perpendicular1 * (texcoord.w) / screen;
	// 
	b.xy *= b.w;


	// currentColor = vec4( ((texcoord.w / abs(texcoord.w) + 1.0) * 0.5) * vec3(1.0) , colorInstance.a);
	// currentColor = vec4(1, 0, 0, 1);
	currentColor = colorInstance;

	gl_Position = b;
}