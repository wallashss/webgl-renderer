exports.VERTEX_SHADER_SOURCE = 
`
attribute vec3 position;
attribute vec3 normal;
attribute vec2 texcoord;

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


void main (void)
{
    gl_Position =  modelViewProjection * vec4(position, 1.0);
    
    currentColor = color;

    vTexcoord = texcoord;

    // vPicking = picking;
    vec4 vPosition4 = modelView * vec4(position, 1.0);
    vPosition = vPosition4.xyz / vPosition4.w;
    
    vNormal = mat3(normalMatrix) * normal;
    vNormal = normalize(vNormal);
}
`

exports.WIREFRAME_VERTEX_SHADER_SOURCE = 
`
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
}
`



exports.INSTANCE_VERTEX_SHADER_SOURCE =
`
attribute vec3 position;
attribute vec3 normal;
attribute vec2 texcoord;
attribute highp mat4 model;
attribute vec4 colorInstance;
// attribute vec4 pickingInstance;

uniform highp mat4 projection;
uniform highp mat4 modelViewProjection;
uniform highp mat4 modelView;
uniform highp mat4 normalMatrix;
uniform float isBillboard;
uniform vec4 color;

// varying highp vec4 vPicking;
varying vec4 currentColor;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vTexcoord;


void main (void)
{
    if(isBillboard > 0.0)
    {
        gl_Position =  projection * (modelView * model * vec4(0, 0, 0, 1.0) + model * vec4(position, 0));
        currentColor = colorInstance;
        vNormal = normalize(mat3(modelView) * normal);
        vTexcoord = texcoord;
        return;
    }
    gl_Position =  modelViewProjection * model * vec4(position, 1.0);
    
    currentColor = colorInstance;

    vTexcoord = texcoord;

    vec4 vPosition4 = modelView  * model * vec4(position, 1.0);
    vPosition = vPosition4.xyz / vPosition4.w;
    
    // vPicking = pickingInstance;
    vNormal = mat3(modelView) * mat3(model) * normal;
    vNormal = normalize(vNormal);
}
`

exports.WIREFRAME_INSTANCE_VERTEX_SHADER_SOURCE =
`
attribute vec3 position;
attribute vec3 normal;
attribute vec2 texcoord;
attribute vec3 barycentric;
attribute highp mat4 model;
attribute vec4 colorInstance;

uniform highp mat4 projection;
uniform highp mat4 modelViewProjection;
uniform highp mat4 modelView;
uniform highp mat4 normalMatrix;
uniform float isBillboard;
uniform vec4 color;

// varying highp vec4 vPicking;
varying vec4 currentColor;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vTexcoord;
varying vec3 vBarycentric;


void main (void)
{
    vBarycentric = barycentric;

    if(isBillboard > 0.0)
    {
        gl_Position =  projection * (modelView * model * vec4(0, 0, 0, 1.0) + model * vec4(position, 0));
        currentColor = colorInstance;
        vNormal = normalize(mat3(modelView) * normal);

        return;
    }
    gl_Position =  modelViewProjection * model * vec4(position, 1.0);
    
    currentColor = colorInstance;

    vTexcoord = texcoord;

    vec4 vPosition4 = modelView  * model * vec4(position, 1.0);
    vPosition = vPosition4.xyz / vPosition4.w;
    
    // vPicking = pickingInstance;
    vNormal = mat3(modelView) * mat3(model) * normal;
    vNormal = normalize(vNormal);
}
`

exports.INSTANCE_POINT_MESH_VERTEX_SHADER =
`
attribute vec3 position;
attribute vec3 normal;
attribute vec2 texcoord;
attribute vec3 translation;
attribute vec4 colorInstance;

uniform highp mat4 projection;
uniform highp mat4 modelViewProjection;
uniform highp mat4 modelView;
uniform highp mat4 normalMatrix;
uniform float isBillboard;
uniform vec4 color;

// varying highp vec4 vPicking;
varying vec4 currentColor;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vTexcoord;


void main (void)
{
    if(isBillboard > 0.0)
    {
        gl_Position =  projection * (modelView * vec4(translation, 1.0) +  vec4(position, 0));
        currentColor = colorInstance;
        vNormal = normalize(mat3(modelView) * normal);
        return;
    }
    gl_Position =  modelViewProjection *  vec4(translation + position , 1.0);
    
    currentColor = colorInstance;
    // currentColor = vec4(gl_VertexID, gl_VertexID, gl_VertexID, 1.0);

    vTexcoord = texcoord;

    vec4 vPosition4 = modelView  *  vec4(position, 1.0);
    vPosition = vPosition4.xyz / vPosition4.w;
    
    // vPicking = pickingInstance;
    vNormal = mat3(modelView) * normal;
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
}
`

exports.WIREFRAME_FRAGMENT_SHADER_SOURCE = 
`
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
}
`

exports.PICK_FRAGMENT_SHADER_SOURCE = 
`
#extension GL_EXT_draw_buffers : require 

precision highp float;

varying vec4 currentColor;
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
    if(unlit > 0.0)
    {
        if(useTexture == 0.0)
        {
            gl_FragData[0] = currentColor;
        }
        else
        {
            vec4 texel = texture2D(texSampler, vTexcoord);
            gl_FragData[0] = currentColor * texel;
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

        // gl_FragData[1] = vec4(diffuse, 1);
        // return;
        
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
    }
    gl_FragData[1] = vPicking;
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

exports.FRAMEBUFFER_DEPTH_FRAGMENT_SHADER_SOURCE = 
`
precision mediump float;
varying vec2 pos; 
uniform sampler2D texSampler;
uniform float near;
uniform float far;

float linearizeDepth(float z_b)
{
    //float z_n = 2.0 * z_b - 1.0;
    // return 2.0 * near * far / (far + near - z_n * (far - near));
    // return (far * near) / (far + near - z_b * (far - near));


    return near * far / (far + z_b * (near - far));
}

void main(void)
{
    float texel = texture2D(texSampler, pos).x;

    float d = 1.0 - linearizeDepth(texel);

    gl_FragColor = vec4(d, d, d, 1.0);
}
`