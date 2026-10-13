// gothic cathedral: organ pipes = keys; active notes glow; rose window backlight, incense haze, candles
const vec3 WIN=vec3(0.,4.7,-4.);
bool isOn(float i){return i==-4.||i==3.||i==7.;}
float pipeH(float i,float row){return .7+2.2*(1.-pow(abs(i)/13.,1.4))+.15*hash(vec2(i,row))-row*.5 + .35*smoothstep(3.,0.,abs(abs(i)-6.));}
vec2 pipes(vec3 p,float row,float zoff,float sp){
 float i=clamp(floor(p.x/sp+.5),-13.,13.); vec3 q=p-vec3(i*sp,0,zoff);
 float h=pipeH(i,row); float r=sp*.36;
 float body=max(length(q.xz)-r,abs(q.y-h*.5-.35)-h*.5);
 float foot=max(length(q.xz)-r*mix(.25,1.,clamp((q.y-.05)/.3,0.,1.)),abs(q.y-.2)-.15);
 float mouth=max(max(abs(q.x)-r*.6,q.z-r-.01),abs(q.y-.55)-.05); // carved mouth
 float d=max(min(body,foot),-mouth);
 return vec2(d,i);
}
float pillar(vec3 p){vec3 q=p; q.x=abs(q.x)-2.1; float d=1e3;
 for(int k=0;k<4;k++){float a=float(k)*PI*.5+.4; d=min(d,length(q.xz-vec2(cos(a),sin(a))*.17)-.11);} 
 d=min(d,length(q.xz)-.2); return max(d,q.y-7.);}
vec3 M; // material: x=id, y=pipe index
float map(vec3 p){
 float d=p.y; M=vec3(0);
 vec2 a=pipes(p,0.,-1.6,.15); if(a.x<d){d=a.x;M=vec3(1,a.y,0);}
 vec2 b=pipes(p-vec3(.075,0,0),1.,-2.1,.15); if(b.x<d){d=b.x;M=vec3(2,b.y,0);}
 // organ case base
 float cs=sdRBox(p-vec3(0,.17,-1.8),vec3(2.05,.17,.45),.02); if(cs<d){d=cs;M=vec3(3);}
 float pl=pillar(p+vec3(0,0,1.)); if(pl<d){d=pl;M=vec3(4);}
 float wall=p.z+4.; if(wall<d){d=wall;M=vec3(5);}
 // candles
 for(int k=0;k<5;k++){float x=-1.2+float(k)*.6; float hh=.12+.12*hash(vec2(k,3)); float c=max(length(p.xz-vec2(x,-.5+.15*sin(float(k)*2.)))-.035,abs(p.y-hh*.5)-hh*.5); if(c<d){d=c;M=vec3(6);}}
 return d;
}
vec3 nrm(vec3 p){vec2 e=vec2(.001,0);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}
vec3 rose(vec2 u){ // stained glass rose window in wall plane coords
 vec2 q=u-WIN.xy; float r=length(q),a=atan(q.y,q.x);
 vec3 c=vec3(0);
 float R0=1.25; if(r>R0) return vec3(0);
 float seg=floor((a+PI)/(2.*PI)*16.);
 float pet=abs(fract((a+PI)/(2.*PI)*16.)-.5);
 vec3 glass= mod(seg,2.)<1.? vec3(.9,.08,.06):vec3(.08,.2,1.);
 if(r<.35) glass=vec3(1.,.7,.15);
 else if(r>.95) glass=mod(seg,4.)<2.?vec3(.1,.55,.25):vec3(.75,.15,.8);
 float lead=smoothstep(.02,.0,abs(r-.35)-.012)+smoothstep(.02,.0,abs(r-.95)-.012)+smoothstep(.02,0.,pet*r-.012)*step(.35,r);
 lead+=smoothstep(.02,0.,abs(r-R0)+.0-.03);
 c=glass*(.35+.9*fbm(u*9.))*clamp(1.-lead,0.,1.)*smoothstep(R0,.2,r*.9);
 return c*c*1.6;
}
float lancet(vec2 u,float x0){ // pointed arch window
 vec2 q=u-vec2(x0,1.2); if(q.y<0.) return step(abs(q.x),.3)*step(-1.4,q.y);
 float d=max(length(q-vec2(-.3,0.))-.6,length(q-vec2(.3,0.))-.6); return step(d,0.)*step(abs(q.x),.3);
}
float shadow(vec3 ro,vec3 rd,float maxt){float r=1.,t=.02;for(int i=0;i<40;i++){float h=map(ro+rd*t);r=min(r,8.*h/t);t+=clamp(h,.03,.3);if(r<.002||t>maxt)break;}return clamp(r,0.,1.);}
vec3 candleGlow(vec3 ro,vec3 rd,float tmax){ vec3 g=vec3(0);
 for(int k=0;k<5;k++){float x=-1.2+float(k)*.6; float hh=.12+.12*hash(vec2(k,3)); vec3 f=vec3(x,hh+.04,-.5+.15*sin(float(k)*2.));
  float t=dot(f-ro,rd); if(t<0.||t>tmax+.1) continue; float d=length(ro+rd*t-f);
  g+=vec3(1.,.55,.18)*(.0006/(d*d+.0002)+ .02*exp(-d*12.));}
 return g;}
void main(){
 vec2 fc=gl_FragCoord.xy; vec3 acc=vec3(0);
 for(int s=0;s<2;s++){
  vec2 uv=(2.*(fc+vec2(s)*.5-.25)-R)/R.y;
  vec3 ro=vec3(0.,.8,3.6),ta=vec3(0.,2.5,-2.);
  vec3 rd=camRay(uv,ro,ta,1.75);
  float t=0.; for(int i=0;i<200;i++){float h=map(ro+rd*t);if(h<.0005*t||t>20.)break;t+=h*.85;}
  vec3 p=ro+rd*t; vec3 m=M; vec3 n=nrm(p); vec3 c=vec3(0);
  vec3 Ld=normalize(WIN-p);
  float sh=shadow(p+n*.003,Ld,length(WIN-p));
  if(m.x==5.){ c=rose(p.xy); c+=vec3(.5,.45,1.)*1.2*(lancet(p.xy,-1.3)+lancet(p.xy,1.3))*(.7+.3*hash(floor(p.xy*10.)));
   c+=vec3(.012,.01,.012)*(1.+fbm(p.xy*6.)); }
  else {
   vec3 alb = (m.x==1.||m.x==2.)? vec3(.42,.42,.46) : m.x==3.? vec3(.06,.03,.02): m.x==6.? vec3(.9,.85,.7): vec3(.09,.085,.08)*(.6+.8*fbm(p.xz*4.+p.y*2.));
   float spec = (m.x<3.)? 1.:.15;
   vec3 hv=normalize(Ld-rd);
   vec3 winCol=vec3(.55,.3,.9);
   c=alb*winCol*max(dot(n,Ld),0.)*sh*1.4;
   c+=spec*winCol*pow(max(dot(n,hv),0.),40.)*sh*3.;
   // candle light from below
   vec3 cl=vec3(0,.2,-.5); vec3 Lc=normalize(cl-p); float dc=length(cl-p);
   c+=alb*vec3(1.,.5,.2)*max(dot(n,Lc),0.)*.9/(1.+dc*dc*1.5);
   c+=spec*vec3(1.,.5,.2)*pow(max(dot(n,normalize(Lc-rd)),0.),30.)*.6/(1.+dc*dc);
   if((m.x==1.||m.x==2.)&&isOn(m.y)){ // singing pipe
     float mouthGlow=exp(-abs(p.y-.55)*8.); c+=vec3(1.,.42,.1)*(2.5*mouthGlow+.12+.5*exp(-abs(p.y-.55)*2.)); }
  }
  // volumetric haze: god rays from window
  vec3 fog=vec3(0); float tm=min(t,20.); float jit=hash(fc+float(s));
  for(int k=0;k<28;k++){ float tt=(float(k)+jit)/28.*tm; vec3 q=ro+rd*tt; vec3 L=WIN-q;
   float vis=shadow(q,normalize(L),length(L)-.3);
   float dens=.03*pow(fbm(q.xy*1.5+q.z*.7),2.)*2.;
   float ph=pow(max(dot(rd,normalize(L)),0.),3.)+.15;
   fog+=vec3(.55,.3,1.)*vis*dens*ph*(tm/28.);}
  c=c*exp(-.05*tm)+fog*.8;
  c+=candleGlow(ro,rd,t);
  acc+=c;
 }
 vec3 c=acc*.5; c=mix(c,c*vec3(1.05,.95,1.1),.5);
 O=vec4(post(c,fc),1);
}
