#version 300 es
precision highp float;
uniform vec2 R;          // render size in pixels
uniform float T;         // time in seconds
uniform float SEED;      // world seed
// per-frame MIDI state (see midi2vid/timeline.py)
uniform float uKick, uSnare, uHat, uBass;   // drum / 808 envelopes 0..1
uniform float uDrop, uBreak, uRiser;        // section states 0..1
uniform float uShot, uShotT;                // camera shot index, seconds since cut
uniform float uKeys[24];                    // key intensities 0..1
uniform vec4 uHands[2];                     // left, right: key x, press, lift, active
uniform vec4 uCrit[3];                      // crow, toad, beetle: key x, hop height, squash, visible
out vec4 O;
#define PI 3.14159265
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
vec3 camRay(vec2 uv,vec3 ro,vec3 ta,float fl){vec3 f=normalize(ta-ro),r=normalize(cross(f,vec3(0,1,0))),u=cross(r,f);return normalize(uv.x*r+uv.y*u+fl*f);}
