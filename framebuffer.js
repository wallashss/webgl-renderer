"use strict"

const Shaders = require("./shaders");
const ShaderBuilder = require("./shaderbuilder");

function uploadDefaultQuad(gl)
{    
    let quad = new Float32Array(12);
    quad[0] = -1; quad[1] =  1;
    quad[2] =  1; quad[3] =  1;
    quad[4] = -1; quad[5] = -1;
    quad[6] =  1; quad[7] = -1;

    
    let defaultQuad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, defaultQuad);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    Framebuffer.defaultQuad = defaultQuad;
}

function Framebuffer(gl, width, height)
{
    let self = this;
    let _framebuffer = null;

    let _width  = width;
    let _height = height;


    let _textures = [];
    let _depthTexture = null;
    let _depthExt = null;
    let _drawBufferExt = null;

    let _colorAttachs = [];

    Framebuffer.defaultQuad = null;
    Framebuffer.defaultShader = null;
    Framebuffer.defaultAttrib = null;

    function _createDefaultProgram()
    {
        let defaultProgram = ShaderBuilder.createProgram(Shaders.FRAMEBUFFER_VERTEX_SHADER_SOURCE, Shaders.FRAMEBUFFER_FRAGMENT_SHADER_SOURCE, gl);
        if(defaultProgram)
        {
            gl.useProgram(defaultProgram);
            Framebuffer.defaultAttrib = gl.getAttribLocation(defaultProgram, "position");
            Framebuffer.texSamplerUniform = gl.getUniformLocation(defaultProgram, "texSampler");
            gl.useProgram(null);
            Framebuffer.defaultProgram = defaultProgram;
        }
        else
        {
            console.log("Failed to load default framebuffer program");
        }
    }

    function _createDefaultDepthProgram()
    {
        let program = ShaderBuilder.createProgram(Shaders.FRAMEBUFFER_VERTEX_SHADER_SOURCE, Shaders.FRAMEBUFFER_DEPTH_FRAGMENT_SHADER_SOURCE, gl);
        if(program)
        {
            gl.useProgram(program);
            Framebuffer.defaultDepthAttrib = gl.getAttribLocation(program, "position");
            Framebuffer.texDepthSamplerUniform = gl.getUniformLocation(program, "texSampler");
            Framebuffer.nearUniform = gl.getUniformLocation(program, "near");
            Framebuffer.farUniform = gl.getUniformLocation(program, "far");
            gl.useProgram(null);
            Framebuffer.defaultDepthProgram = program;
        }
        else
        {
            console.log("Failed to load default depth framebuffer program");
        }
    }

    this.addTexture = function(attach = 0, internalFormat = gl.RGBA, format =  gl.RGBA, type= gl.UNSIGNED_BYTE)
    {
        let textureId = gl.createTexture();
        buildTexture(textureId, attach, internalFormat, format, type);
        _textures.push({attach: attach,
                        internalFormat: internalFormat, 
                        format: format, 
                        type: type,
                        textureId: textureId});
        if(_drawBufferExt)
        {
            _drawBufferExt.drawBuffersWEBGL(_colorAttachs);
        }
        
        return _textures.length - 1;
    }

    this.setDepthTexture = function(textureId)
    {
        _depthTexture = textureId;
        buildDepthTexture();
    }

    this.addDepthTexture = function()
    {
        _depthTexture = gl.createTexture();
        buildDepthTexture();
    }

    function buildDepthTexture()
    {
        if(_depthTexture)
        {
            gl.bindTexture(gl.TEXTURE_2D, _depthTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, _width, _height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
            gl.framebufferTexture2D(gl.FRAMEBUFFER,  gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, _depthTexture, 0);
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
    }

    function buildTexture(texture, attach, internalFormat, format, type)
    {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, _width, _height, 0, format, type, null);
        
        if(_drawBufferExt)
        {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, _drawBufferExt.COLOR_ATTACHMENT0_WEBGL + attach, gl.TEXTURE_2D, texture, 0);
            _colorAttachs.push(_drawBufferExt.COLOR_ATTACHMENT0_WEBGL+attach);
        }
        else
        {
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        }
        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    this.resize = function(w, h)
    {
        _width = w;
        _height = h;

        for(let i = 0; i < _textures.length; i++)
        {
            let t = _textures[i];
            buildTexture(t.textureId, t.attach, t.internalFormat, t.format, t.type);
        }
        buildDepthTexture();
    }

    this.bind = function()
    {
        gl.bindFramebuffer(gl.FRAMEBUFFER, _framebuffer);
    }

    this.release = function()
    {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    this.getTexture = function(idx = 0)
    {
        return _textures[idx].textureId;
    }

    this.getDepthTexture = function()
    {
        return _depthTexture;
    }

    this.draw = function(idx = 0)
    {
        if(_textures.length <= 0)
        {
            console.log("Framebuffer with no textures!");
            return;
        }

        let texture = null;
        if(texture >= 0)
        {
            texture = _textures[idx];
        }

        if(!texture)
        {
            return;
        }

        // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.disable(gl.DEPTH_TEST);
        // gl.disable(gl.CULL_FACE);
        gl.useProgram(Framebuffer.defaultProgram);
        
        const vertexSize = 2 * 4
        gl.bindBuffer(gl.ARRAY_BUFFER, Framebuffer.defaultQuad);
        gl.enableVertexAttribArray(Framebuffer.defaultAttrib);
        gl.vertexAttribPointer(Framebuffer.defaultAttrib, 2, gl.FLOAT, false, vertexSize, 0);

        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture.textureId);

        gl.uniform1i(Framebuffer.texSamplerUniform, 0);
        // gl.uniform2f(Framebuffer.sizeUniform, _vWidth, _vHeight);
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.disableVertexAttribArray(Framebuffer.defaultAttrib);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.useProgram(null);
        // gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
    }

    this.drawDepth = function(near, far)
    {
        if(!_depthTexture)
        {
            return;
        }

        // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.disable(gl.DEPTH_TEST);
        gl.useProgram(Framebuffer.defaultDepthProgram);
        
        const vertexSize = 2 * 4
        gl.bindBuffer(gl.ARRAY_BUFFER, Framebuffer.defaultQuad);
        gl.enableVertexAttribArray(Framebuffer.defaultDepthAttrib);
        gl.vertexAttribPointer(Framebuffer.defaultDepthAttrib, 2, gl.FLOAT, false, vertexSize, 0);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, _depthTexture);

        gl.uniform1i(Framebuffer.texDepthSamplerUniform, 0);
        gl.uniform1f(Framebuffer.nearUniform, near);
        gl.uniform1f(Framebuffer.farUniform, far);
        // gl.uniform2f(Framebuffer.sizeUniform, _vWidth, _vHeight);
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.disableVertexAttribArray(Framebuffer.defaultDepthAttrib);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.useProgram(null);
        // gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
    }

    this.loadDefault  = function()
    {
        self.bind();
        self.addTexture(0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
        self.addDepthTexture();
        self.release();
    }

    this.setTexture = function(textureId)
    {
        self.bind();
        let attach = 0; 
        let internalFormat = gl.RGBA; 
        let format = gl.RGBA; 
        let type = gl.UNSIGNED_BYTE;

        buildTexture(textureId, attach, internalFormat, format, type);
        _textures.push({attach: attach,
                        internalFormat: internalFormat, 
                        format: format, 
                        type: type,
                        textureId: textureId});
        if(_drawBufferExt)
        {
            _drawBufferExt.drawBuffersWEBGL(_colorAttachs);
        }
        
        return _textures.length - 1;

        self.release();
    }

    this.pick = function(x, y, idx = 0)
    {
        let pixel = new Uint8Array(4);
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

        return pixel;
    }

    let init = function()
    {
        if(!gl)
        {
            console.log("Invalid context");
            return;
        }

        if(!Framebuffer.defaultProgram)
        {
            _createDefaultProgram(self);
        }

        if(!Framebuffer.defaultDepthProgram)
        {
            _createDefaultDepthProgram();
        }
        
        if(!Framebuffer.defaultQuad)
        {
            uploadDefaultQuad(gl);
        }

        _depthExt = gl.getExtension('WEBGL_depth_texture');
        if(_depthExt)
        {
            console.log("Context has WEBGL_depth_texture");
        }
        
        _drawBufferExt = gl.getExtension('WEBGL_draw_buffers');
        if (_drawBufferExt) 
        {
            console.log("Context has WEBGL_draw_buffers");
        }

        window._drawBufferExt = _drawBufferExt;

        _framebuffer = gl.createFramebuffer();
    }();
}


Framebuffer.getDefaultQuad = function(gl)
{
    if(!Framebuffer.defaultQuad)
    {
        uploadDefaultQuad(gl);
    }
    return Framebuffer.defaultQuad;
}

module.exports = Framebuffer;