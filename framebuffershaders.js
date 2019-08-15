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

exports.FRAMEBUFFER_VERTEX_SHADER_SOURCE_2 = 
`
#version 300 es
attribute vec2 position;
uniform vec2 size;
out vec2 vPosition;
out vec2 pos;

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