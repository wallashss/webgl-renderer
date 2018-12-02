"use strict";

const Shaders = require("./shaders");
const ShaderBuilder = require("./shaderbuilder");
const FrameBuffer = require("./framebuffer");


function FrameRenderer(gl, fragmentShader, version)
{
    this.version = version;

    if(version === 2)
    {
        this.program = ShaderBuilder.createProgram(Shaders.FRAMEBUFFER_VERTEX_SHADER_SOURCE_2, fragmentShader, gl);
    }
    else
    {
        this.program = ShaderBuilder.createProgram(Shaders.FRAMEBUFFER_VERTEX_SHADER_SOURCE, fragmentShader, gl);
    }

    gl.useProgram(this.program);
    this.defaultAttrib = gl.getAttribLocation(this.program, "position");
    this.sizeUniform = gl.getUniformLocation(this.program, "size");
    gl.useProgram(null);

    // this.frameBuffer = null;
    this.gl = gl;

    this.textures = {};

    this.onBind = null;

}

// FrameRenderer.prototype.setFrameBuffer = function(frameBuffer)
// {
//     this.frameBuffer = frameBuffer;
// }


FrameRenderer.prototype.setTexture = function(idx, textureName, textureId, _gl = null)
{
    let gl = this.gl || gl;
    if(gl)
    {
        if(this.program)
        {
            gl.useProgram(this.program);

            let location = gl.getUniformLocation(this.program, textureName);

            this.textures[idx] = 
            {
                id: textureId,
                name: textureName,
                location: location
            };

            gl.useProgram(null);

        }
    }

}


FrameRenderer.prototype.draw = function(willClear = false, _gl = null)
{
    let gl  = this.gl || _gl;

    if(!gl)
    {
        return;
    }
    const vertexSize = 2 * 4;

    if(willClear)
    {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
    gl.disable(gl.DEPTH_TEST);
    // gl.disable(gl.CULL_FACE);
    gl.bindBuffer(gl.ARRAY_BUFFER, Framebuffer.getDefaultQuad(this.gl));
    gl.enableVertexAttribArray(this.defaultAttrib);
    gl.vertexAttribPointer(this.defaultAttrib, 2, gl.FLOAT, false, vertexSize, 0);

    gl.useProgram(this.program);
    for(let k in this.textures)
    {
        let texture = this.textures[k];
        gl.activeTexture(gl.TEXTURE0 + parseInt(k));
        gl.bindTexture(gl.TEXTURE_2D, texture.id);
        gl.uniform1i(texture.location, k);
    }

    if(this.onBind)
    {
        this.onBind();
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    
    gl.disableVertexAttribArray(this.defaultAttrib);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);
    gl.enable(gl.DEPTH_TEST);
    // gl.enable(gl.CULL_FACE);

}

module.exports = FrameRenderer;