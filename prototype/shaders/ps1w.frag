// PS1 world generator: SEED picks location, instrument, fog, weather, camera, rare events
float sd(float k){return fract(sin(SEED*12.9898+k*78.233+SEED*k*.137)*43758.5453);}
float bayer(vec2 p){ivec2 i=ivec2(mod(p,4.));int m[16]=int[](0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5);return float(m[i.y*4+i.x])/16.-.5;}
float box(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
int LOC,INST,WX; vec3 FOG; float FOGD; bool FIG, FLASH, NIGHT; float IROT;
void setup(){
 LOC=int(floor(sd(1.)*4.)); INST=int(floor(sd(2.)*3.)); WX=int(floor(sd(3.)*3.));
 float f=sd(4.);
 FOG= f<.35? vec3(.55,.56,.58) : f<.55? vec3(.27,.31,.42) : f<.75? vec3(.43,.46,.36) : vec3(.035,.035,.045);
 NIGHT = f>=.75;
 if(LOC==3){FOG=vec3(.16,.045,.035); NIGHT=true;}
 FOGD=mix(6.,13.,sd(5.)); FLASH = NIGHT || LOC==1 && sd(9.)<.5;
 FIG = sd(6.)<.4; IROT=mix(-.9,.9,sd(7.));
}
float M; float KU;
vec3 rotY(vec3 p,float a){p.xz=rot(a)*p.xz;return p;}
float instrument(vec3 p){
 vec3 pp=rotY(p-vec3(.0,0,-1.),IROT); float d=1e3; KU=-9.;
 if(INST==0){ // grand piano
  float body=box(pp-vec3(0,.62,0),vec3(.55,.13,.75)); body=max(body,-(length((pp.xz-vec2(.75,.35))*vec2(1.,.8))-.55));
  vec3 lp=pp-vec3(-.2,.95,0); lp.xy=rot(-.55)*lp.xy; float lid=box(lp,vec3(.5,.015,.72));
  float legs=box(vec3(abs(pp.x)-.42,pp.y-.25,abs(pp.z)-.55),vec3(.04,.25,.04));
  d=min(min(body,lid),legs); M=4.;
  float k=box(pp-vec3(0,.62,.82),vec3(.5,.04,.08)); if(k<d){d=k;M=5.;KU=pp.x;}
 } else if(INST==1){ // upright piano
  float body=box(pp-vec3(0,.62,-.1),vec3(.62,.62,.2));
  float shelf=box(pp-vec3(0,.6,.18),vec3(.62,.05,.16));
  float legs=box(vec3(abs(pp.x)-.55,pp.y-.25,pp.z-.28),vec3(.04,.25,.04));
  d=min(min(body,shelf),legs); M=4.;
  float k=box(pp-vec3(0,.67,.24),vec3(.56,.02,.09)); if(k<d){d=k;M=5.;KU=pp.x*.9;}
 } else { // cheap keyboard on X-stand
  vec3 a=pp-vec3(0,.42,0); a.xy=rot(.75)*a.xy; vec3 b=pp-vec3(0,.42,0); b.xy=rot(-.75)*b.xy;
  float st=min(box(vec3(a.x,a.y,abs(a.z)-.12),vec3(.03,.6,.02)),box(vec3(b.x,b.y,abs(b.z)-.12),vec3(.03,.6,.02)));
  float body=box(pp-vec3(0,.86,0),vec3(.6,.04,.16));
  d=min(st,body); M=4.;
  float k=box(pp-vec3(0,.9,.06),vec3(.52,.015,.08)); if(k<d){d=k;M=5.;KU=pp.x;}
 }
 return d;
}
float pyramid(vec3 q,float w,float h){ return max((abs(q.x)+abs(q.z))*h/w*.7+q.y*.7-h*.7,-q.y); }
float map(vec3 p){
 float d=1e3; M=0.;
 if(LOC==0||LOC==3){ // street
  d=p.y;
  float sw=box(vec3(abs(p.x)-2.6,p.y-.08,p.z),vec3(.8,.08,40.)); if(sw<d){d=sw;M=1.;}
  vec3 q=p; q.x=abs(q.x)-4.6; float id=floor(q.z/3.); q.z=mod(q.z,3.)-1.5;
  float hb=2.5+3.*hash(vec2(id,sign(p.x)+SEED));
  float b=box(q-vec3(0,hb*.5,0),vec3(1.2,hb*.5,1.35)); if(b<d){d=b;M=2.;}
  vec3 l=p; l.x=abs(l.x)-1.95; l.z=mod(l.z+2.,8.)-4.;
  float lp=min(box(l-vec3(0,1.4,0),vec3(.04,1.4,.04)),box(l-vec3(-.25,2.78,0),vec3(.3,.04,.06))); if(lp<d){d=lp;M=3.;}
  if(LOC==3){ // otherworld: chain-link fences + hanging chains
   float fn=box(vec3(abs(p.x)-3.3,p.y-1.,p.z),vec3(.01,1.,40.)); if(fn<d){d=fn;M=8.;}
  }
 } else if(LOC==1){ // forest
  d=p.y-.12*noise(p.xz*.8); M=6.;
  vec2 cell=floor(p.xz/2.2); 
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){ vec2 c=cell+vec2(i,j);
   vec2 cp=(c+.5+.35*(vec2(hash(c+SEED),hash(c.yx+SEED))-.5))*2.2;
   if(abs(cp.x)<1.8&&cp.y>-3.5&&cp.y<2.5) continue;
   vec3 q=p-vec3(cp.x,0,cp.y); float h=2.2+1.5*hash(c*3.1);
   float tr=box(q-vec3(0,.6,0),vec3(.08,.6,.08)); if(tr<d){d=tr;M=7.;}
   float fo=min(pyramid(q-vec3(0,.9,0),.8,h*.6),pyramid(q-vec3(0,1.7,0),.6,h*.5)); if(fo<d){d=fo;M=9.;}
  }
 } else { // corridor (school / hospital)
  d=p.y; M=10.;
  float w=1.6-abs(p.x); if(w<d){d=w;M=11.;}
  float c=2.6-p.y; if(c<d){d=c;M=12.;}
  vec3 dq=vec3(abs(p.x)-1.6,p.y-1.,mod(p.z,3.)-1.5); float door=box(dq,vec3(.08,1.,.45));
  if(-door>d){} // keep wall
  d=max(d,-door);
  float frame=box(dq-vec3(-.02,0,0),vec3(.1,1.04,.5)); frame=max(frame,-box(dq,vec3(.2,1.,.45))); if(frame<d){d=frame;M=13.;}
 }
 if(FIG){ vec3 q=p-vec3(mix(-1.3,1.3,sd(11.)),0,-6.5-2.*sd(12.)); float fig=min(box(q-vec3(0,.75,0),vec3(.16,.42,.09)),length(q-vec3(0,1.32,0))-.12);
  fig=min(fig,box(vec3(abs(q.x)-.07,q.y-.18,q.z),vec3(.06,.2,.07))); if(fig<d){d=fig;M=14.;} }
 float ms=M; float ins=instrument(p);
 if(ins<d) d=ins; else M=ms;
 return d;
}

vec3 nrm(vec3 p){vec2 e=vec2(.002,0);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}
bool keyLit(float k){ return hash(vec2(k,floor(SEED)+.5))<.16; }
vec3 tex(vec3 p,vec3 n,float m){
 vec2 uv= abs(n.y)>.5? p.xz : abs(n.x)>.5? p.zy : p.xy;
 vec2 tc=floor(uv*16.)/16.; float nz=hash(tc*3.1+.17);
 bool ow= LOC==3;
 vec3 rust=vec3(.28,.09,.05)*(.5+.8*nz)*(.6+.6*noise(uv*3.));
 if(m==0.){ float line=step(abs(p.x),.04)*step(.5,fract(p.z*.5)); vec3 a=mix(vec3(.16,.16,.17)*(.7+.5*nz),vec3(.7,.65,.4),line);
   if(ow){ vec2 g=fract(uv*2.); a=mix(rust*.5,vec3(.02),step(.9,g.x)+step(.9,g.y)); } return a;}  // otherworld: grated floor
 if(m==1.) return ow? rust*.8 : vec3(.32,.3,.28)*(.75+.4*nz)*(.8+.2*step(.06,fract(uv.x*2.))*step(.06,fract(uv.y*2.)));
 if(m==2.){ vec2 w=fract(uv); float win=step(.3,w.x)*step(w.x,.7)*step(.35,w.y)*step(w.y,.8);
   vec3 brick=ow? rust : vec3(.35,.22,.18)*(.7+.5*nz);
   return mix(brick,vec3(.05,.06,.07)+(ow?vec3(0):vec3(.5,.35,.1)*step(.93,hash(floor(uv)+SEED))),win);}
 if(m==3.) return vec3(.15);
 if(m==4.){ float wood=hash(vec2(floor(uv.y*20.),1.)); return INST==2? vec3(.08,.08,.09)+.03*nz : vec3(.03,.025,.03)+.04*nz+ (ow?rust*.3:vec3(0)); }
 if(m==5.){ float k=floor((KU+.6)*24.); bool blk = mod(k,7.)==2.||mod(k,7.)==5.;
   vec3 kc= blk? vec3(.05): vec3(.85)*(.9+.1*nz); return keyLit(k)? vec3(1.,.12,.08)*3. : kc; }
 if(m==6.) return mix(vec3(.12,.14,.08),vec3(.2,.17,.1),nz)*(.7+.4*noise(uv*2.));          // forest floor
 if(m==7.) return vec3(.12,.08,.05)*(.7+.5*nz);
 if(m==8.){ vec2 g=uv*10.; vec2 f=abs(fract(vec2(g.x+g.y,g.x-g.y)*.5)-.5); return vec3(.25,.2,.18)*step(f.x,.08)+vec3(.0); }
 if(m==9.) return vec3(.06,.1,.06)*(.6+.8*nz);
 if(m==10.){ vec2 g=floor(uv*2.); return mod(g.x+g.y,2.)<1.? vec3(.5,.48,.42)*(.8+.3*nz):vec3(.12,.14,.13)*(.8+.3*nz);} // checker tiles
 if(m==11.) return mix(vec3(.45,.5,.42),vec3(.6,.58,.5),step(1.,p.y))*(.75+.35*nz);
 if(m==12.){ float panel=step(abs(fract(p.z/3.)-.5),.12)*step(abs(p.x),.45); return mix(vec3(.4)*(.8+.3*nz),vec3(4.,3.9,3.4),panel);}
 if(m==13.) return vec3(.22,.12,.08)*(.7+.4*nz);
 if(m==14.) return vec3(.01);
 return vec3(.5);
}
vec3 lightAt(vec3 p,vec3 n,vec3 ro,vec3 fw){
 vec3 L=vec3(0);
 if(LOC==0||LOC==3){
  for(int k=-2;k<1;k++){vec3 a=vec3(1.65,2.7,float(k)*8.-2.), b=vec3(-1.65,2.7,float(k)*8.+2.);
   vec3 lc= LOC==3? vec3(1.,.25,.15):vec3(1.,.85,.6);
   L+=lc*max(dot(n,normalize(a-p)),0.)*3./(1.+dot(a-p,a-p));
   L+=lc*max(dot(n,normalize(b-p)),0.)*3./(1.+dot(b-p,b-p));}
 } else if(LOC==2){
  float z0=floor(p.z/3.)*3.+1.5; for(int k=-1;k<=1;k++){vec3 a=vec3(0,2.5,z0+float(k)*3.); L+=vec3(1.,.97,.85)*max(dot(n,normalize(a-p)),0.)*2.5/(1.+dot(a-p,a-p)*.8);}
 } else { L+=vec3(.35,.4,.55)*max(dot(n,normalize(vec3(.3,1.,.2))),0.)*(NIGHT?.4:.9); }
 if(FLASH){ vec3 d=p-ro; float dl=length(d); float cone=smoothstep(.86,.97,dot(d/dl,fw));
  L+=vec3(1.,.95,.8)*cone*max(dot(n,-d/dl),0.)*5./(1.+dl*dl*.6); }
 vec3 kl=rotY(vec3(0,.85,-.1),-IROT)+vec3(0,0,-1.)+vec3(0,0,0); float dk=length(kl-p);
 L+=vec3(1.,.15,.08)*max(dot(n,normalize(kl-p)),0.)*1.6/(1.+dk*dk*5.);
 return L;
}
vec3 weather(vec3 ro,vec3 rd,float tmax,vec2 uv){
 vec3 c=vec3(0); if(WX==0||LOC==2) return c;
 for(int k=1;k<7;k++){ float t=float(k)*.9; if(t>tmax) break; vec3 p=ro+rd*t;
  vec2 g = WX==1? vec2(p.x,p.y+T*.3)*vec2(9.,9.) : vec2(p.x*14.,p.y*1.5+T*4.);
  vec2 id=floor(g); vec2 f=fract(g)-.5; float h=hash(id+float(k)*13.);
  if(h>.9){ vec2 o=(vec2(hash(id+1.),hash(id+2.))-.5)*.6; float d= WX==1? length(f-o) : abs(f.x-o.x)+max(abs(f.y)-.4,0.)*4.;
   vec3 col= LOC==3? vec3(.25,.22,.2) : vec3(.85); c+=col*smoothstep(.12,.0,d)*exp(-t*.15); } }
 return c;
}
void main(){
 setup();
 float PX=floor(R.y/300.);
 vec2 fc=(floor(gl_FragCoord.xy/PX)+.5)*PX;
 vec2 uv=(2.*fc-R)/R.y;
 float ca=mix(-.7,.7,sd(13.)), cd=mix(2.2,3.3,sd(14.)), ch=mix(.55,1.9,sd(15.));
 vec3 ta=vec3(0,.75,-1.); vec3 ro=ta+vec3(sin(ca)*cd,ch-.75,cos(ca)*cd);
 if(LOC==2) ro.x=clamp(ro.x,-1.3,1.3);
 vec3 rd=camRay(uv,ro,ta,1.5); vec3 fw=normalize(ta-ro);
 float t=0.; for(int i=0;i<180;i++){float h=map(ro+rd*t);if(h<.001||t>30.)break;t+=h*.9;}
 vec3 c=FOG;
 if(t<30.){
  vec3 p=ro+rd*t; float m=M; vec3 n=nrm(p);
  vec3 alb=tex(p,n,m);
  vec3 amb= NIGHT? vec3(.04,.04,.06): FOG*.6;
  c=alb*(amb+lightAt(p,n,ro,fw));
  if(m==5.&&alb.r>1.) c=alb; if(m==12.&&alb.r>1.) c=alb;
  c=mix(c,FOG,smoothstep(1.2,FOGD,t));
 }
 if(!NIGHT) c+=vec3(.05)*smoothstep(-.2,1.,uv.y);
 c+=weather(ro,rd,t,uv);
 c=pow(c,vec3(1./1.1));
 c=floor(c*31.+bayer(fc/PX)+.5)/31.;
 O=vec4(clamp(c,0.,1.),1);
}
