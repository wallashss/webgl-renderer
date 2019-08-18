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