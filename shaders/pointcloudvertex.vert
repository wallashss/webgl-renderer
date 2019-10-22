attribute vec3 position;
attribute vec3 normal;
attribute vec2 texcoord;
attribute vec3 translation;
attribute vec4 colorInstance;

uniform highp vec2 screen;
uniform highp mat4 projection;
uniform highp mat4 modelViewProjection;
uniform highp mat4 modelView;
uniform highp mat4 normalMatrix;
uniform float isBillboard;
uniform float billboardSize;
uniform float billboardRotation;
uniform vec4 color;

// varying highp vec4 vPicking;
varying vec4 currentColor;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vTexcoord;


void main (void)
{
	currentColor = colorInstance;
    vTexcoord = texcoord;

    // if(isBillboard > 0.0)
    // {
    //     gl_Position =  projection * (modelView * vec4(translation, 1.0) +  vec4(position, 0));
    //     vNormal = normalize(mat3(modelView) * normal);
    //     return;
    // }

	if(isBillboard > 0.0)
    {
        gl_Position =  projection * (modelView * vec4(translation, 1.0) +  vec4(position, 0));
        vNormal = normalize(mat3(modelView) * normal);
    }
	else if(billboardSize > 0.0)
    {
		// mat3 m = mat3(model);
		// vec4 pos = model[3];

		gl_Position = modelViewProjection * vec4(translation, 1.0);
		gl_Position.xy /= gl_Position.w;
		gl_Position.xy += (position.xyz).xy / screen;
		gl_Position.xy *= gl_Position.w;

        vNormal = normalize(mat3(modelView) * normal);
    }
	else if(billboardRotation > 0.0)
    {
        gl_Position =  projection * (modelView * vec4(translation, 1.0)  * vec4(position, 0));
        vNormal = normalize(mat3(modelView) * normal);
    }
	else
	{
		gl_Position =  modelViewProjection *  vec4(translation + position , 1.0);

		vec4 vPosition4 = modelView  *  vec4(position, 1.0);
		vPosition = vPosition4.xyz / vPosition4.w;
		
		vNormal = mat3(modelView) * normal;
		vNormal = normalize(vNormal);
	}
    
}