"use strict"

const Shaders = require("./shaders");
const ShaderBuilder = require("./shaderbuilder");
const vec2 = require("gl-matrix").vec2;

function Framebuffer(gl, width, height)
{
    let self = this;
    let _framebuffer = null;

    let _width  = width;
    let _height = height;

    let _vWidth = 0;
    let _vHeight = 0;

    let _framebufferSize = 0;

    let _textures = [];
    let _depthTexture = null;
    let _depthExt = null;

    Framebuffer.defaultQuad = null;
    Framebuffer.defaultShader = null;
    Framebuffer.defaultAttrib = null;

    function createDefaultShader()
    {
        let defaultProgram = ShaderBuilder.createProgram(Shaders.FRAMEBUFFER_VERTEX_SHADER_SOURCE, 
            Shaders.FRAMEBUFFER_FRAGMENT_SHADER_SOURCE, gl);
        if(defaultProgram)
        {
            console.log("Created framebuffer default");
            gl.useProgram(defaultProgram);
            Framebuffer.defaultAttrib = gl.getAttribLocation(defaultProgram, "position");
            Framebuffer.defaultProgram = defaultProgram;
            gl.useProgram(null);
        }
        else
        {
            console.log("Failed to load default framebuffer program");
        }
    }

    function  uploadDefaultQuad()
    {
        let verticesBufferId = gl.createBuffer();
        
        let quad = new Float32Array(12);
        quad[0] = -1; quad[1] =  1;
        quad[2] =  1; quad[3] =  1;
        quad[4] =  1; quad[5] = -1;
        quad[6] =  1; quad[7] = -1;
        quad[8] = -1; quad[9] = -1;
        quad[10] = -1; quad[11] =  1;

        
        let defaultQuad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, defaultQuad);
        gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        Framebuffer.defaultQuad = defaultQuad;
    }

    // function updateDefaultQuad()
    // {
    //     gl.bindBuffer(gl.ARRAY_BUFFER, defaultQuad);
    //     gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
    //     gl.bindBuffer(gl.ARRAY_BUFFER, null);
    // }

    function updateSizes()
    {
        
        let sw = Math.ceil(Math.log2(_width));
        let sh = Math.ceil(Math.log2(_height));
        _framebufferSize = Math.pow(2, Math.max(sw, sh));
     
        _vWidth = _width / _framebufferSize;
        _vHeight = _height / _framebufferSize;

    }
    function addTexture(attach, internalFormat, format, type)
    {
        let textureId = gl.createTexture();
        buildTexture(textureId, attach, internalFormat, format, type);
        _textures.push({attach: attach,
                        internalFormat: internalFormat, 
                        format: format, 
                        type: type,
                        textureId: textureId});
        return _textures.length - 1;
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
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, _framebufferSize,_framebufferSize, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
            gl.framebufferTexture2D(gl.FRAMEBUFFER,  gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, _depthTexture, 0);
            // gl.bindTexture(gl.TEXTURE_2D, null);
        }
    }

    function buildTexture(texture, attach, internalFormat, format, type)
    {
        
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, _framebufferSize, _framebufferSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, _framebufferSize, _framebufferSize, 0, format, type, null);
        
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + attach, gl.TEXTURE_2D, texture, 0);

        gl.bindTexture(gl.TEXTURE_2D, null);
    }

    this.resize = function(w, h)
    {
        _width = w;
        _height = h;

        updateSizes();
        for(let i = 0; i < _textures.length; i++)
        {
            let t = _textures[i];
            buildTexture(t.textureId, t.attach, t.internalFormat, t.format, t.type);
        }
        buildDepthTexture();
        // buildTexture(_texture.textureId, _tex);
    }

    this.bind = function()
    {
        gl.bindFramebuffer(gl.FRAMEBUFFER, _framebuffer);
    }

    this.release = function()
    {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    this.drawToScreen = function(idx)
    {
        if(idx === null || idx === undefined)
        {
            idx = 0;
        }
        if(_textures.length <= 0)
        {
            console.log("Framebuffer with no textures!");
            return;
        }
        gl.useProgram(Framebuffer.defaultProgram);
        
        const vertexSize = 2 * 4
        gl.bindBuffer(gl.ARRAY_BUFFER, Framebuffer.defaultQuad);
        gl.enableVertexAttribArray(Framebuffer.defaultAttrib);
        gl.vertexAttribPointer(Framebuffer.defaultAttrib, 2, gl.FLOAT, false, vertexSize, 0);

        let texSamplerUniform = gl.getUniformLocation(Framebuffer.defaultProgram, "texSampler");
        let sizeUniform = gl.getUniformLocation(Framebuffer.defaultProgram, "size");

        let texture = _textures[idx];
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture.textureId);
        gl.uniform1i(texSamplerUniform, 0);

        gl.uniform2f(sizeUniform, _vWidth, _vHeight);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        gl.disableVertexAttribArray(Framebuffer.defaultAttrib);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.useProgram(null);
    }



    let init = function()
    {
        if(!gl)
        {
            console.log("Invalid context");
            return;
        }
        if(!Framebuffer.defaultQuad)
        {
            uploadDefaultQuad();
            createDefaultShader();
        }

        updateSizes();


        let ext = gl.getExtension('WEBGL_depth_texture');
        if(ext)
        {
            _depthExt = ext;
            console.log(ext);
            console.log(gl.DEPTH_STENCIL_ATTACHMENT)
            console.log("Context has WEBGL_depth_texture");
        }
        _framebuffer = gl.createFramebuffer();

        self.bind();
        addTexture(0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE);
        self.addDepthTexture();
        self.release();
    }()
}

module.exports = Framebuffer;