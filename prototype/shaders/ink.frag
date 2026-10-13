// ink drops in water: each note injects a plume, color=pitch, size=velocity
vec2 warp(vec2 p,float t){
 vec2 q=vec2(fbm(p+vec2(0,t*.1)),fbm(p+vec2(5.2,1.3)));
 vec2 r=vec2(fbm(p+3.*q+vec2(1.7,9.2)),fbm(p+3.*q+vec2(8.3,2.8)));
 return r;
}
float plume(vec2 p,vec2 c,float s,float seed){
 vec2 d=(p-c)/s; d.y*=.7;
 vec2 w=warp(d*1.3+seed,seed);
 float f=fbm(d*1.8+w*2.2+seed);
 float shape=exp(-dot(d,d)*.9) * smoothstep(.0,1.,f*1.6-.25+.35*exp(-dot(d,d)*2.5));
 // trailing tendril downward
 float tr=exp(-pow(d.x+.25*sin(d.y*2.+seed),2.)*30.)*smoothstep(1.,-2.5,d.y)*smoothstep(-6.,-1.,d.y)*.7;
 return clamp(shape+tr*f,0.,1.);
}
void main(){
 vec2 fc=gl_FragCoord.xy; vec2 uv=(2.*fc-R)/R.y;
 vec3 water=mix(vec3(.93,.95,.97),vec3(.78,.84,.9),smoothstep(1.2,-1.2,uv.y));
 vec3 c=water;
 // subtractive ink layering
 vec3 ink[4]=vec3[](vec3(.9,.15,.45),vec3(.05,.35,.85),vec3(.95,.6,.05),vec3(.25,.05,.55));
 vec2 pos[4]=vec2[](vec2(-.22,.55),vec2(.25,.1),vec2(-.15,-.35),vec2(.2,-.8));
 float sz[4]=float[](.3,.36,.26,.22);
 for(int i=0;i<4;i++){
  float d=plume(uv,pos[i],sz[i],float(i)*3.7);
  vec3 absorb=1.-ink[i];
  c*=exp(-absorb*d*2.2);
  // bright fringe where plume is thin
  c+=ink[i]*.18*smoothstep(.05,.25,d)*smoothstep(.6,.2,d);
 }
 // light shafts from top
 float rays=pow(fbm(vec2(uv.x*3.+uv.y*.6,0.)*1.5),3.)*smoothstep(-1.,1.2,uv.y);
 c+=vec3(1.,.97,.9)*rays*.25;
 // tiny bubbles
 vec2 g=uv*18.; vec2 id=floor(g); vec2 f=fract(g)-.5; float b=hash(id);
 if(b>2.){ float r=.08+.1*hash(id+1.); float d=length(f-(vec2(hash(id+2.),hash(id+3.))-.5)*.6); c+=vec3(.6)*smoothstep(r,r-.03,d)*smoothstep(r-.07,r-.03,d);}
 vec2 q=fc/R; c*=.88+.12*pow(16.*q.x*q.y*(1.-q.x)*(1.-q.y),.2);
 O=vec4(pow(clamp(c,0.,1.),vec3(1.05))+(hash(fc)-.5)/120.,1);
}
