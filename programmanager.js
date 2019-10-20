"use strict";


function ProgramManager(context)
{
	this.gl = context;

	this.programsMap = {};
}

ProgramManager.prototype.addProgram = function(id, vertexSource, fragmentSource, isInstance)
{
	let gl = this.gl;
	gl.useProgram(null);

	let program = _createProgram.call(this, vertexSource, fragmentSource, gl);

	let programData = {
		id: id,
		isInstance: isInstance,
		program: program
	};

	if(program)
	{
		_loadProgramBinds.call(this, program, programData);
	}

	this.programsMap[id] = programData;

	return programData;

}

ProgramManager.prototype.getProgram = function(id)
{
	return this.programsMap[id] || null;
}

function _loadProgramBinds (program, programData)
{
	let gl = this.gl;
	
	gl.useProgram(program);
		
	programData.positionVertex = gl.getAttribLocation(program, "position");
	
	programData.normalVertex = gl.getAttribLocation(program, "normal");
	
	programData.texcoord = gl.getAttribLocation(program, "texcoord");

	programData.model = gl.getAttribLocation(program, "model");

	programData.colorInstance = gl.getAttribLocation(program, "colorInstance");

	programData.translation = gl.getAttribLocation(program, "translation");

	programData.barycentric = gl.getAttribLocation(program, "barycentric");

	let attribs = [];
	if(programData.positionVertex >= 0)
	{
		attribs.push(programData.positionVertex);
	}
	if(programData.normalVertex >= 0)
	{
		attribs.push(programData.normalVertex);
	}

	if(programData.texcoord >= 0)
	{
		attribs.push(programData.texcoord);
	}

	if(programData.colorInstance >= 0)
	{
		attribs.push(programData.colorInstance);
	}

	if(programData.translation >= 0)
	{
		attribs.push(programData.translation);
	}

	if(programData.barycentric >= 0)
	{
		attribs.push(programData.barycentric);
	}

	let modelAttribs = []

	if(programData.model >= 0)
	{
		for(let i = 0 ; i < 4; i++)
		{
			attribs.push(programData.model + i);
			modelAttribs.push(programData.model + i);
		}
	}
	
	
	programData.projectionUniform = gl.getUniformLocation(program, "projection");
	programData.modelViewProjectionUniform = gl.getUniformLocation(program, "modelViewProjection");
	programData.modelViewUniform = gl.getUniformLocation(program, "modelView");
	programData.normalMatrixUniform = gl.getUniformLocation(program, "normalMatrix");
	programData.lightPositionUniform = gl.getUniformLocation(program, "lightPosition");
	programData.colorUniform = gl.getUniformLocation(program, "color");
	programData.useTextureUniform = gl.getUniformLocation(program, "useTexture");
	programData.unlitUniform = gl.getUniformLocation(program, "unlit");
	programData.isBillboardUniform = gl.getUniformLocation(program, "isBillboard");
	programData.billboardSizeUniform = gl.getUniformLocation(program, "billboardSize");
	programData.billboardRotUniform = gl.getUniformLocation(program, "billboardRotation");
	programData.texSamplerUniform = gl.getUniformLocation(program, "texSampler");
	programData.screenUniform = gl.getUniformLocation(program, "screen");

	programData.attribs = attribs;
	programData.modelAttribs = modelAttribs;

	gl.useProgram(null);
}

function buildShader(source, type, gl)
{
    let shader = gl.createShader(type);
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    {
        console.log(gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}

function _createProgram(vertexSource, fragmentSource, gl)
{  
    let header = "";
    let WebGL2RenderingContext = window.WebGL2RenderingContext;
    if(gl.constructor === WebGL2RenderingContext)
    {        
        header += "#define HAS_WEBGL_2 \n";
    }
    if(gl.getExtension('OES_standard_derivatives'))
    {
        header += "#define HAS_DERIVATIVES \n";
    }

    let vertexShader = buildShader(header + vertexSource, gl.VERTEX_SHADER, gl);
    let fragmentShader = buildShader(header + fragmentSource, gl.FRAGMENT_SHADER, gl);

    
    if(vertexShader && fragmentShader)
    {
        let program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if(!gl.getProgramParameter(program, gl.LINK_STATUS))
        {
            console.log("Error initing shader program");
            return null;
        }
        return program;
    }
    return null;
    
}

module.exports = ProgramManager;