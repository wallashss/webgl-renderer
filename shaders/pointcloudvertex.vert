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