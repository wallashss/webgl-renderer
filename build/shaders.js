'use strict'; 
exports.defaultfragment=`
precision mediump float;
varying vec4 currentColor;
varying vec3 vNormal;
varying vec2 vTexcoord;
varying vec3 vPosition;
uniform vec3 lightPosition;
uniform sampler2D texSampler;
uniform float useTexture;
uniform float unlit;

void main(void)
{
    if(unlit >0.0)
    {
        if(useTexture == 0.0)
        {
            gl_FragColor = currentColor;
        }
        else
        {
            vec4 texel = texture2D(texSampler, vTexcoord);
            gl_FragColor = currentColor * texel;
        }
    }
    else
    {
        vec3 lightDir = normalize(lightPosition - vPosition);
    
        // Ambient
        vec3 ambient = vec3(0.1);
        float d = abs(dot(vNormal, lightDir));
        
        // Diffuse
        vec3 diffuse = vec3(d);
        // diffuse = vNormal;
        
        vec3 illumination = diffuse + ambient;
        vec4 finalColor;
        if(useTexture == 0.0)
        {
            finalColor = vec4(illumination * currentColor.rgb, currentColor.a);
        }
        else
        {
            vec4 texel = texture2D(texSampler, vTexcoord);
            finalColor = vec4(illumination * currentColor.rgb * texel.rgb, texel.a * currentColor.a);            
        }

        gl_FragColor = finalColor;
    }
}`;
exports.defaultvertex=`
attribute vec3 position;
attribute vec3 normal;
attribute vec2 texcoord;
attribute highp mat4 model;
attribute vec4 colorInstance;

uniform highp vec2 screen;
uniform highp mat4 projection;
uniform highp mat4 modelViewProjection;
uniform highp mat4 modelView;
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
        gl_Position =  projection * (modelView * model * vec4(0, 0, 0, 1.0) + model * vec4(position, 0));
        vNormal = normalize(mat3(modelView) * normal);
		currentColor = vec4(1, 0, 1, 1);
    }
	else if(billboardSize > 0.0)
    {
		mat3 m = mat3(model);
		vec4 pos = model[3];

		gl_Position = modelViewProjection * pos;
		gl_Position.xy /= gl_Position.w;
		gl_Position.xy += (m * position.xyz).xy / screen;
		gl_Position.xy *= gl_Position.w;

        vNormal = normalize(mat3(modelView) * normal);
    }
	else if(billboardRotation > 0.0)
    {
        gl_Position =  projection * (modelView * model * vec4(0, 0, 0, 1.0) + model * vec4(position, 0));
        vNormal = normalize(mat3(modelView) * normal);
    }
	else
	{
		gl_Position =  modelViewProjection * model * vec4(position, 1.0);

		vec4 vPosition4 = modelView  * model * vec4(position, 1.0);
		vPosition = vPosition4.xyz / vPosition4.w;
		
		vNormal = mat3(modelView) * mat3(model) * normal;
		vNormal = normalize(vNormal);
	}
}`;
exports.linefragment=`
precision mediump float;
varying vec4 currentColor;

void main(void)
{
    gl_FragColor = currentColor;
}`;
exports.linestringvertex=`
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
}`;
exports.linevertex=`
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
	
	a.xy += perpendicular * normal.w / screen ; // normal.w = line screen space width

	a.xy *= a.w;

	currentColor = colorInstance;
	// currentColor = vec4(1, 0, 0, 1);

	gl_Position = a;
}`;
exports.pointcloudvertex=`
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
		gl_Position = modelViewProjection * vec4(translation, 1.0);
		gl_Position.xy /= gl_Position.w;
		gl_Position.xy += position.xy / screen;
		gl_Position.xy *= gl_Position.w;

		// gl_Position.z = 0.0;

		// currentColor = vec4(gl_Position.z, gl_Position.z, gl_Position.z, 1);

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
    
}`;
exports.wireframefragment=`
precision mediump float;
varying vec4 currentColor;
varying vec3 vNormal;
varying vec2 vTexcoord;
varying vec3 vPosition;
varying vec3 vBarycentric;

uniform vec3 lightPosition;
uniform sampler2D texSampler;
uniform float useTexture;
uniform float unlit;

void main(void)
{
    vec4 finalColor;
    if(unlit >0.0)
    {
        if(useTexture == 0.0)
        {
            gl_FragColor = currentColor;
        }
        else
        {
            vec4 texel = texture2D(texSampler, vTexcoord);
            gl_FragColor = currentColor * texel;
        }
    }
    else
    {
        vec3 lightDir = normalize(lightPosition - vPosition);
    
        // Ambient
        vec3 ambient = vec3(0.1);
        float d = abs(dot(vNormal, lightDir));
        
        // Diffuse
        vec3 diffuse = vec3(d);        
        
        vec3 illumination = diffuse + ambient;
        if(useTexture == 0.0)
        {
            finalColor = vec4(illumination * currentColor.rgb, currentColor.a);
        }
        else
        {
            vec4 texel = texture2D(texSampler, vTexcoord);
            finalColor = vec4(illumination * currentColor.rgb * texel.rgb, currentColor.a);            
        }
    }

#ifdef HAS_DERIVATIVES
        
    if(any(lessThan(vBarycentric, vec3(0.02))))
    {
        // finalColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
    else
    {
        // finalColor = vec4(0);
        discard;
        return;
    }

#else

    if(any(lessThan(vBarycentric, vec3(0.02)))){
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
    // else{
    //     gl_FragColor = vec4(0.5, 0.5, 0.5, 1.0);
    // }
#endif
    
    gl_FragColor = finalColor;
}`;
exports.wireframevertex=`
attribute vec3 position;
attribute vec3 normal;
attribute vec2 texcoord;
attribute vec3 barycentric;

uniform highp mat4 modelView;
uniform highp mat4 modelViewProjection;
uniform highp mat4 normalMatrix;
uniform vec4 color;
// uniform highp vec4 picking;

// varying vec4 vPicking;
varying vec4 currentColor;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vTexcoord;
varying vec3 vBarycentric;


void main (void)
{
    gl_Position =  modelViewProjection * vec4(position, 1.0);

    vBarycentric = barycentric;
    
    currentColor = color;

    vTexcoord = texcoord;

    // vPicking = picking;
    vec4 vPosition4 = modelView * vec4(position, 1.0);
    vPosition = vPosition4.xyz / vPosition4.w;
    
    vNormal = mat3(normalMatrix) * normal;
    vNormal = normalize(vNormal);
}`;
