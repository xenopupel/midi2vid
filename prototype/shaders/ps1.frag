// PS1 / Silent Hill: grand piano abandoned in a foggy street, keys light up per note. low-res, dithered, 15-bit color
float bayer(vec2 p){ivec2 i=ivec2(mod(p,4.));int m[16]=int[](0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5);return float(m[i.y*4+i.x])/16.-.5;}
float box(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
float M;
vec3 rot3(vec3 p){p.xy=rot(-.55)*p.xy;return p;}
float map(vec3 p){
 float d=p.y; M=0.;                                      // asphalt
 float sw=box(vec3(abs(p.x)-2.6,p.y-.08,p.z),vec3(.8,.08,40.)); if(sw<d){d=sw;M=1.;}
 // buildings: repeated blocks
 vec3 q=p; q.x=abs(q.x)-4.6; float id=floor(q.z/3.); q.z=mod(q.z,3.)-1.5;
 float hb=2.5+3.*hash(vec2(id,sign(p.x)));
 float b=box(q-vec3(0,hb*.5,0),vec3(1.2,hb*.5,1.35)); if(b<d){d=b;M=2.;}
 // street lamps
 vec3 l=p; l.x=abs(l.x)-1.95; l.z=mod(l.z+2.,8.)-4.;
 float lp=min(box(l-vec3(0,1.4,0),vec3(.04,1.4,.04)),box(l-vec3(-.25,2.78,0),vec3(.3,.04,.06))); if(lp<d){d=lp;M=3.;}
 // grand piano (low poly)
 vec3 pp=p-vec3(.15,0,-1.); pp.xz=rot(.5)*pp.xz;
 float body=box(pp-vec3(0,.62,0),vec3(.55,.13,.75)); body=max(body,-(length((pp.xz-vec2(.75,.35))*vec2(1.,.8))-.55)); // curved notch, faceted by low res anyway
 float lid=box(rot3(pp-vec3(-.2,.95,0)),vec3(.5,.015,.72));
 float legs=box(vec3(abs(pp.x)-.42,pp.y-.25,abs(pp.z)-.55),vec3(.04,.25,.04));
 float pianoD=min(min(body,lid),legs); if(pianoD<d){d=pianoD;M=4.;}
 float keys=box(pp-vec3(0,.62,.82),vec3(.5,.04,.08)); if(keys<d){d=keys;M=5.;}
 return d;
}

vec3 nrm(vec3 p){vec2 e=vec2(.002,0);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}
vec3 tex(vec3 p,vec3 n,float m){
 vec2 uv= abs(n.y)>.5? p.xz : abs(n.x)>.5? p.zy : p.xy;
 vec2 tc=floor(uv*16.)/16.;               // 16 texels per unit, nearest filtering
 float nz=hash(tc*3.1);
 if(m==0.){ float line=step(abs(p.x),.04)*step(.5,fract(p.z*.5)); return mix(vec3(.16,.16,.17)*(.7+.5*nz),vec3(.7,.65,.4),line);}
 if(m==1.) return vec3(.32,.3,.28)*(.75+.4*nz)*(.8+.2*step(.06,fract(uv.x*2.))*step(.06,fract(uv.y*2.)));
 if(m==2.){ vec2 w=fract(uv*vec2(1.,1.)); float win=step(.3,w.x)*step(w.x,.7)*step(.35,w.y)*step(w.y,.8);
   vec3 brick=vec3(.35,.22,.18)*(.7+.5*nz); return mix(brick,vec3(.05,.06,.07)+vec3(.5,.35,.1)*step(.93,hash(floor(uv))),win);}
 if(m==3.) return vec3(.15);
 if(m==4.) return vec3(.03,.03,.035)+.04*nz;
 // keys: white/black pattern, some lit
 float k=floor((uv.x+.5)*26.); float lit= (k==6.||k==11.||k==15.)?1.:0.;
 vec3 kc= mod(k,7.)==2.||mod(k,7.)==5.? vec3(.05): vec3(.85);
 return mix(kc,vec3(1.,.15,.1)*3.,lit);
}
void main(){
 float PX=floor(R.y/300.);                // ~300 vertical lines
 vec2 fc=(floor(gl_FragCoord.xy/PX)+.5)*PX;
 vec2 uv=(2.*fc-R)/R.y;
 vec3 ro=vec3(-.9,1.25,2.6),ta=vec3(.25,.75,-1.);
 vec3 rd=camRay(uv,ro,ta,1.55);
 float t=0.; for(int i=0;i<160;i++){float h=map(ro+rd*t);if(h<.001||t>30.)break;t+=h;}
 vec3 fogc=vec3(.55,.56,.58);
 vec3 c=fogc;
 if(t<30.){
  vec3 p=ro+rd*t; float m=M; vec3 n=nrm(p);
  vec3 alb=tex(p,n,m);
  // gouraud-ish: lamp lights + flat ambient
  vec3 L1=vec3(1.6,2.7,mod(p.z+2.,8.)-4.<0.?p.z-mod(p.z+2.,8.)+4.:p.z-mod(p.z+2.,8.)+4.);
  float lamp=0.;
  for(int k=-2;k<1;k++){vec3 lp=vec3(1.65,2.7,float(k)*8.-2.); vec3 lp2=vec3(-1.65,2.7,float(k)*8.+2.);
   lamp+=max(dot(n,normalize(lp-p)),0.)*3./(1.+dot(lp-p,lp-p));
   lamp+=max(dot(n,normalize(lp2-p)),0.)*3./(1.+dot(lp2-p,lp2-p));}
  vec3 kl=vec3(.15,.75,-.25); float dk=length(kl-p); // red glow of lit keys
  vec3 redl=vec3(1.,.15,.08)*max(dot(n,normalize(kl-p)),0.)*.6/(1.+dk*dk*6.);
  c=alb*(vec3(.35,.36,.4)+vec3(1.,.85,.6)*lamp)+alb*redl*3.;
  if(m==5.) c=alb;
  c=mix(c,fogc,smoothstep(1.5,11.,t));
 }
 c+=vec3(.06)*smoothstep(-.2,1.,uv.y);
 // 15-bit color with ordered dither
 c=pow(c,vec3(1./1.1));
 c=floor(c*31.+bayer(fc/PX)*1.0+.5)/31.;
 O=vec4(clamp(c,0.,1.),1);
}
