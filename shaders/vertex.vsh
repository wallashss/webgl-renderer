attribute vec3 position;
attribute vec3 normal;
attribute vec2 texcoord;

uniform highp mat4 modelView;
uniform highp mat4 modelViewProjection;
uniform highp mat4 normalMatrix;

uniform vec4 color;

varying vec4 currentColor;

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vTexcoord;


void main (void)
{
    gl_Position =  modelViewProjection * vec4(position, 1.0);
	
    currentColor = color;

	vTexcoord = texcoord;

	vec4 vPosition4 = modelView * vec4(position, 1.0);
	vPosition = vPosition4.xyz / vPosition4.w;
	
	vNormal = mat3(normalMatrix) * normal;
	vNormal = normalize(vNormal);
}