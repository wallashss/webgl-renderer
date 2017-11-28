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