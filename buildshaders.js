"use strict";


const fs = require("fs");

const SHADERS_SOURCES_PATH = "shaders";
const BUILD_PATH = "build/shaders.js";



let files = fs.readdirSync(SHADERS_SOURCES_PATH);

let shaderSourceFiles = "'use strict'; \n";



for(let i = 0; i < files.length; i++)
{
	let filepath = files[i];

	if(filepath.endsWith(".vert") || filepath.endsWith(".frag"))
	{
		let path = filepath.substr(0, filepath.length - 5);

		shaderSourceFiles += `exports.${path}`;
		shaderSourceFiles += "=";
		shaderSourceFiles += "`\n";
		shaderSourceFiles += fs.readFileSync(SHADERS_SOURCES_PATH + "/" + filepath);
		shaderSourceFiles += "`;\n";
	}
}



fs.writeFileSync(BUILD_PATH, shaderSourceFiles, "utf-8");