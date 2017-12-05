exports.VERTEX_SHADER_SOURCE = 
`
attribute vec3 position;
attribute vec3 normal;
attribute vec2 texcoord;

uniform highp mat4 modelView;
uniform highp mat4 modelViewProjection;
uniform highp mat4 normalMatrix;
uniform vec4 color;
uniform highp vec4 picking;

varying vec4 vPicking;
varying vec4 currentColor;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vTexcoord;


void main (void)
{
    gl_Position =  modelViewProjection * vec4(position, 1.0);
    
    currentColor = color;

    vTexcoord = texcoord;

    vPicking = picking;
    vec4 vPosition4 = modelView * vec4(position, 1.0);
    vPosition = vPosition4.xyz / vPosition4.w;
    
    vNormal = mat3(normalMatrix) * normal;
    vNormal = normalize(vNormal);
}
`

exports.INSTANCE_VERTEX_SHADER_SOURCE =
`
attribute vec3 position;
attribute vec3 normal;
attribute vec2 texcoord;
attribute highp mat4 model;
attribute vec4 colorInstance;

uniform highp mat4 modelViewProjection;
uniform highp mat4 modelView;
uniform highp mat4 normalMatrix;
uniform vec4 color;
uniform highp vec4 picking;

varying vec4 vPicking;
varying vec4 currentColor;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vTexcoord;


void main (void)
{
    gl_Position =  modelViewProjection * model * vec4(position, 1.0);
    
    currentColor = colorInstance;

    vTexcoord = texcoord;

    vec4 vPosition4 = modelView  * model * vec4(position, 1.0);
    vPosition = vPosition4.xyz / vPosition4.w;
    
    vPicking = vec4(0);
    vNormal = mat3(modelView) * mat3(model) * normal;
    vNormal = normalize(vNormal);
}

`

exports.FRAGMENT_SHADER_SOURCE = 
`
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
        gl_FragColor = currentColor;
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
            gl_FragColor = vec4(illumination * currentColor.rgb, currentColor.a);
        }
        else
        {
            vec4 texel = texture2D(texSampler, vTexcoord);
            gl_FragColor = vec4(illumination * currentColor.rgb * texel.rgb, currentColor.a);            
        }
    }
}
`

exports.PICK_FRAGMENT_SHADER_SOURCE = 
`
#extension GL_EXT_draw_buffers : require 

precision highp float;

varying highp vec4 currentColor;
varying vec3 vNormal;
varying vec2 vTexcoord;
varying vec3 vPosition;
varying vec4 vPicking;

uniform vec3 lightPosition;
uniform sampler2D texSampler;
uniform float useTexture;
uniform float unlit;

void main(void)
{
    if(unlit >0.0)
    {
        gl_FragData[0] = currentColor;
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
            gl_FragData[0] = vec4(illumination * currentColor.rgb, currentColor.a);
        }
        else
        {
            vec4 texel = texture2D(texSampler, vTexcoord);
            gl_FragData[0] = vec4(illumination * currentColor.rgb * texel.rgb, currentColor.a);            
        }
        gl_FragData[1] = currentColor;
    }
}
`


exports.FRAMEBUFFER_VERTEX_SHADER_SOURCE = 
`
attribute vec2 position;
varying vec2 vPosition;
uniform vec2 size;
varying vec2 pos;

void main (void)
{
    gl_Position = vec4(position, 0, 1);
    pos = (position + vec2(1)) * 0.5;

    // if(pos.x > 0.1) // extra check because of numerical precision...
    // {
    //     pos.x =  size.x;
    // }
    // if(pos.y > 0.1)
    // {
    //     pos.y = size.y;
    // }
}
`

exports.FRAMEBUFFER_FRAGMENT_SHADER_SOURCE = 
`
precision mediump float;
varying vec2 pos; 
uniform sampler2D texSampler;

void main(void)
{
    gl_FragColor = texture2D(texSampler, pos);
}
`