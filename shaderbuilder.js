"use strict"

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

function createProgram(vertexSource, fragmentSource, gl)
{  
    let vertexShader = buildShader(vertexSource, gl.VERTEX_SHADER, gl);
    let fragmentShader = buildShader(fragmentSource, gl.FRAGMENT_SHADER, gl);

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

exports.createProgram = createProgram;