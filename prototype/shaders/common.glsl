#version 300 es
precision highp float;
uniform vec2 R; uniform float T; uniform float SEED;
out vec4 O;
#define PI 3.14159265
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<6;i++){s+=a*noise(p);p=rot(.5)*p*2.03+3.1;a*=.5;}return s;}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float smax(float a,float b,float k){return -smin(-a,-b,k);}
float sdRBox(vec3 p,vec3 b,float r){vec3 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;}
vec3 camRay(vec2 uv,vec3 ro,vec3 ta,float fl){vec3 f=normalize(ta-ro),r=normalize(cross(f,vec3(0,1,0))),u=cross(r,f);return normalize(uv.x*r+uv.y*u+fl*f);}
vec3 post(vec3 c,vec2 fc){vec2 q=fc/R;c*=.5+.5*pow(16.*q.x*q.y*(1.-q.x)*(1.-q.y),.2);c=aces(c);c=pow(c,vec3(1./2.2));
 c+=(hash(fc+T)-.5)/120.;return c;}
