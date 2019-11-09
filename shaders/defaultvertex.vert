attribute vec3 position;
attribute vec3 normal;
attribute vec2 texcoord;
attribute highp mat4 model;
attribute vec4 colorInstance;

uniform highp vec2 screen;
uniform highp mat4 projection;
uniform highp mat4 modelViewProjection;
uniform highp mat4 modelView;
uniform highp mat4 view;
uniform float isBillboard;
uniform float billboardSize;
uniform float billboardRotation;

uniform vec4 color;

varying vec4 currentColor;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vTexcoord;


void main (void)
{
	currentColor = colorInstance;
    vTexcoord = texcoord;
    if(isBillboard > 0.0)
    {
       mat3 m = mat3(model);
		mat3 v = mat3(view);
		vec4 center = model[3];

		gl_Position = modelViewProjection * center;
		gl_Position.xy /= gl_Position.w;
		gl_Position.xy += ( m * position.xyz).xy / screen;
		gl_Position.xy *= gl_Position.w;

		vec4 worldPos = model * vec4(position, 1.0);

		vec4 vPosition4 = worldPos;
		vPosition = vPosition4.xyz / vPosition4.w;

		vNormal =  mat3(model) * normal;
		vNormal = normalize(vNormal);
    }
	else if(billboardSize > 0.0)
    {
		mat3 m = mat3(model);
		mat3 v = mat3(view);
		vec4 center = model[3];

		gl_Position = modelViewProjection * center;
		gl_Position.xy /= gl_Position.w;
		gl_Position.xy += (v * m * position.xyz).xy / screen;
		gl_Position.xy *= gl_Position.w;

		vec4 worldPos = model * vec4(position, 1.0);

		vec4 vPosition4 = view * worldPos;
		vPosition = vPosition4.xyz / vPosition4.w;

		vNormal = mat3(view) * mat3(model) * normal;
		vNormal = normalize(vNormal);
    }
	else if(billboardRotation > 0.0)
    {
        gl_Position = projection * (modelView * model * vec4(0, 0, 0, 1.0) + model * vec4(position, 0));
        vNormal = normalize(mat3(modelView) * normal);

		vec4 worldPos = model * vec4(0, 0, 0, 1.0) + model * vec4(position, 0);

		vec4 vPosition4 = view * worldPos;
		vPosition = vPosition4.xyz / vPosition4.w;

		vNormal =  mat3(model) * normal;
		vNormal = normalize(vNormal);
    }
	else
	{
		vec4 worldPos = model * vec4(position, 1.0);
		gl_Position =  modelViewProjection * worldPos;

		vec4 vPosition4 = view * worldPos;
		vPosition = vPosition4.xyz / vPosition4.w;
		
		vNormal = mat3(view) * mat3(model) * normal;
		vNormal = normalize(vNormal);
	}
}