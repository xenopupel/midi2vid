// PS1 / Silent Hill world. SEED builds the world, the MIDI uniforms animate it:
// keys light up per note, kick flickers the lamps, snare glitches the frame,
// 808 makes the fog breathe, the drop turns the world into the Otherworld,
// the break kills every light but one.
float sd(float k){return fract(sin(SEED*12.9898+k*78.233+SEED*k*.137)*43758.5453);}
float bayer(vec2 p){ivec2 i=ivec2(mod(p,4.));int m[16]=int[](0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5);return float(m[i.y*4+i.x])/16.-.5;}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float sdRBox(vec3 p,vec3 b,float r){vec3 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;}
float box(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
int LOC,INST,WX; vec3 FOG; float FOGD; bool FIG,FLASH,NIGHT; float IROT,OW;
void keyFrame();
void setup(){
 LOC=int(floor(sd(1.)*4.)); INST=int(floor(sd(2.)*3.)); WX=int(floor(sd(3.)*3.));
 float f=sd(4.);
 FOG= f<.35? vec3(.55,.56,.58) : f<.55? vec3(.27,.31,.42) : f<.75? vec3(.43,.46,.36) : vec3(.035,.035,.045);
 NIGHT=f>=.75;
 OW = LOC==3? 1. : uDrop;                       // Otherworld amount
 FOG=mix(FOG,vec3(.16,.045,.035),OW);
 FOG=mix(FOG,vec3(.5,.06,.04),uRiser*.5*step(.5,fract(T*3.)));   // siren pulse before the drop
 FOG*=1.-.6*uBreak;
 FOGD=mix(6.,13.,sd(5.))*(1.-.35*uBass);         // fog breathes with the 808
 FLASH = NIGHT || OW>.5 || (LOC==1 && sd(9.)<.5);
 FIG = sd(6.)<.4 || uBreak>.5;
 IROT=mix(-.9,.9,sd(7.));
 keyFrame();
}
float M; float KU;
vec3 rotY(vec3 p,float a){p.xz=rot(a)*p.xz;return p;}
float instrument(vec3 p){
 vec3 pp=rotY(p-vec3(0,0,-1.),IROT); float d=1e3; KU=-9.;
 if(INST==0){
  float body=box(pp-vec3(0,.62,0),vec3(.55,.13,.75)); body=max(body,-(length((pp.xz-vec2(.75,.35))*vec2(1.,.8))-.55));
  vec3 lp=pp-vec3(-.2,.95,0); lp.xy=rot(-.55)*lp.xy; float lid=box(lp,vec3(.5,.015,.72));
  float legs=box(vec3(abs(pp.x)-.42,pp.y-.25,abs(pp.z)-.55),vec3(.04,.25,.04));
  d=min(min(body,lid),legs); M=4.;
  float k=box(pp-vec3(0,.62,.82),vec3(.5,.04,.08)); if(k<d){d=k;M=5.;KU=pp.x;}
 } else if(INST==1){
  float body=box(pp-vec3(0,.62,-.1),vec3(.62,.62,.2));
  float shelf=box(pp-vec3(0,.6,.18),vec3(.62,.05,.16));
  float legs=box(vec3(abs(pp.x)-.55,pp.y-.25,pp.z-.28),vec3(.04,.25,.04));
  d=min(min(body,shelf),legs); M=4.;
  float k=box(pp-vec3(0,.67,.24),vec3(.5,.02,.09)); if(k<d){d=k;M=5.;KU=pp.x;}
 } else {
  vec3 a=pp-vec3(0,.42,0); a.xy=rot(.75)*a.xy; vec3 b=pp-vec3(0,.42,0); b.xy=rot(-.75)*b.xy;
  float st=min(box(vec3(a.x,a.y,abs(a.z)-.12),vec3(.03,.6,.02)),box(vec3(b.x,b.y,abs(b.z)-.12),vec3(.03,.6,.02)));
  float body=box(pp-vec3(0,.86,0),vec3(.6,.04,.16));
  d=min(st,body); M=4.;
  float k=box(pp-vec3(0,.9,.06),vec3(.5,.015,.08)); if(k<d){d=k;M=5.;KU=pp.x;}
 }
 return d;
}
// ---------- performers (instrument space: keys along x, player on +z) ----------
float KEYY,KEYZ,PB;           // key top height, key row depth, performer bounding hit
void keyFrame(){ KEYY = INST==0? .66 : INST==1? .69 : .915; KEYZ = INST==0? .82 : INST==1? .24 : .06; }
float sdEll(vec3 p,vec3 r){ float k0=length(p/r),k1=length(p/(r*r)); return k0*(k0-1.)/k1; }
float sdCap(vec3 p,vec3 a,vec3 b,float r){ vec3 pa=p-a,ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*h)-r; }
vec3 handPos(vec4 h){ return vec3(h.x, KEYY+.025+h.z*.09-h.y*.018, KEYZ+.03+h.z*.03); }
vec3 elbow(vec3 s,vec3 h,float side){
 vec3 m=(s+h)*.5; vec3 d=h-s; float L=length(d); float bend=sqrt(max(.32*.32-L*L*.25,0.));
 vec3 out_=normalize(vec3(side,-.6,.5)); out_=normalize(out_-d*dot(out_,d)/(L*L)); return m+out_*bend; }
float goth(vec3 p,out float mat){
 // seated (or standing at a high keyboard) facing -z toward the keys
 float hip=KEYY-.22; float zc=KEYZ+.5;
 vec3 q=p-vec3(0,0,zc);
 mat=15.;
 if(length(q-vec3(0,hip+.35,0))>1.1) return length(q-vec3(0,hip+.35,0))-1.;
 float bob=uKick*.035+uBass*.01;                                   // head nods on the kick
 float lean=-.08-bob;                                              // leaning in toward the keys
 vec3 sh=vec3(0,hip+.48,lean);
 // torso: tapered black coat
 vec3 tq=q-vec3(0,hip+.24,lean*.5); float w=mix(.15,.12,clamp(tq.y/.24*.5+.5,0.,1.));
 float torso=sdRBox(tq,vec3(w,.24,.085),.04);
 float d=torso;
 // coat tails over the bench
 d=min(d,sdRBox(q-vec3(0,hip-.02,.05),vec3(.16,.03,.16),.02));
 // legs down to the floor, knees under the keys
 for(int s=0;s<2;s++){ float sx=s==0?-.09:.09;
  vec3 knee=vec3(sx,hip,-.18); vec3 foot=vec3(sx*1.1,.05,-.2);
  d=min(d,sdCap(q,vec3(sx,hip,.02),knee,.055)); d=min(d,sdCap(q,knee,foot,.05));
  d=min(d,sdRBox(q-foot-vec3(0,-.02,-.04),vec3(.04,.03,.08),.01)); }
 // arms reaching to the hands (2-bone IK)
 vec3 hpL=handPos(uHands[0])-vec3(0,0,zc), hpR=handPos(uHands[1])-vec3(0,0,zc);
 vec3 sL=sh+vec3(-.15,0,0), sR=sh+vec3(.15,0,0);
 vec3 eL=elbow(sL,hpL,-1.), eR=elbow(sR,hpR,1.);
 float arms=min(min(sdCap(q,sL,eL,.042),sdCap(q,eL,hpL,.035)),min(sdCap(q,sR,eR,.042),sdCap(q,eR,hpR,.035)));
 d=min(d,arms);
 // head + hair
 vec3 hc=sh+vec3(0,.17,-.03-bob*.8);
 float head=sdEll(q-hc,vec3(.075,.095,.085));
 float hands=min(sdEll(q-hpL,vec3(.035,.018,.045)),sdEll(q-hpR,vec3(.035,.018,.045)));
 vec3 hq=q-hc-vec3(0,-.07,.035);
 float hair=sdRBox(hq,vec3(.1,.17,.07),.05);                        // long straight black hair down the back
 hair=max(hair,-(q.z-hc.z+.06));                                    // keep the face clear
 hair=min(hair,sdEll(q-hc-vec3(0,.03,.0),vec3(.088,.085,.09)));     // crown
 float face=head;
 if(hair<d){d=hair;mat=17.;}
 if(face<d){d=face;mat=16.;}
 if(hands<d){d=hands;mat=16.;}
 // bench
 float bench=sdRBox(q-vec3(0,hip-.1,.08),vec3(.3,.04,.14),.01); bench=min(bench,sdRBox(vec3(abs(q.x)-.25,q.y-(hip-.1)*.5,q.z-.08),vec3(.025,(hip-.1)*.5,.025),.0));
 if(bench<d){d=bench;mat=21.;}
 return d;
}
float critter(vec3 p,int i,out float mat){
 vec4 c=uCrit[i]; if(c.w<.01) return 1e3;
 float sc= i==0? 1. : i==1? 1.15 : .7;
 sc*=smoothstep(0.,1.,c.w);                                         // pops in/out of existence
 if(sc<.02) return 1e3;
 float sq=c.z*.35;
 vec3 base=vec3(c.x, KEYY+c.y, KEYZ-.01);
 vec3 q=(p-base)/sc; q.y/=1.-sq; q.xz/=1.+sq*.5;
 float d;
 if(i==0){ // crow
  mat=18.;
  d=sdEll(q-vec3(0,.06,0),vec3(.045,.045,.075));
  d=smin(d,length(q-vec3(0,.11,.06))-.032,.02);
  float beak=sdEll(q-vec3(0,.105,.105),vec3(.012,.01,.03)); if(beak<d){d=beak;mat=19.5;}
  d=min(d,sdRBox(q-vec3(0,.07,-.09),vec3(.025,.006,.04),.003));             // tail
  d=min(d,sdCap(q,vec3(-.015,.02,0),vec3(-.015,0,.01),.006)); d=min(d,sdCap(q,vec3(.015,.02,0),vec3(.015,0,.01),.006));
  vec3 e=vec3(abs(q.x)-.022,q.y-.12,q.z-.08); if(length(e)-.007<d){d=length(e)-.007;mat=22.;}
 } else if(i==1){ // toad
  mat=19.;
  d=sdEll(q-vec3(0,.045,0),vec3(.075,.045,.07));
  d=smin(d,sdEll(vec3(abs(q.x)-.06,q.y-.025,q.z+.035),vec3(.035,.025,.045)),.02);   // haunches
  vec3 e=vec3(abs(q.x)-.035,q.y-.085,q.z-.035); float eye=length(e)-.02; if(eye<d){d=eye;mat=22.;}
 } else { // beetle
  mat=20.;
  d=sdEll(q-vec3(0,.025,0),vec3(.035,.022,.05));
  d=min(d,sdEll(q-vec3(0,.02,.05),vec3(.018,.014,.016)));
  for(int k=0;k<3;k++){ float z=-.02+float(k)*.02; d=min(d,sdCap(vec3(abs(q.x),q.y,q.z),vec3(.03,.018,z),vec3(.055,0.,z+.01),.004)); }
 }
 return d*sc*(1.-sq*.3);
}
float performers(vec3 p,out float mat){
 vec3 pp=rotY(p-vec3(0,0,-1.),IROT);
 float m; float d=goth(pp,mat);
 for(int i=0;i<3;i++){ float cm; float c=critter(pp,i,cm); if(c<d){d=c;mat=cm;} }
 return d;
}
float pyramid(vec3 q,float w,float h){ return max((abs(q.x)+abs(q.z))*h/w*.7+q.y*.7-h*.7,-q.y); }
float map(vec3 p){
 float d=1e3; M=0.;
 if(LOC==0||LOC==3){
  d=p.y;
  float sw=box(vec3(abs(p.x)-2.6,p.y-.08,p.z),vec3(.8,.08,40.)); if(sw<d){d=sw;M=1.;}
  vec3 q=p; q.x=abs(q.x)-4.6; float id=floor(q.z/3.); q.z=mod(q.z,3.)-1.5;
  float hb=2.5+3.*hash(vec2(id,sign(p.x)+SEED));
  float b=box(q-vec3(0,hb*.5,0),vec3(1.2,hb*.5,1.35)); if(b<d){d=b;M=2.;}
  vec3 l=p; l.x=abs(l.x)-1.95; l.z=mod(l.z+2.,8.)-4.;
  float lp=min(box(l-vec3(0,1.4,0),vec3(.04,1.4,.04)),box(l-vec3(-.25,2.78,0),vec3(.3,.04,.06))); if(lp<d){d=lp;M=3.;}
  if(OW>.5){ float fn=box(vec3(abs(p.x)-3.3,p.y-1.,p.z),vec3(.01,1.,40.)); if(fn<d){d=fn;M=8.;} }
 } else if(LOC==1){
  d=p.y-.12*noise(p.xz*.8); M=6.;
  vec2 cell=floor(p.xz/2.2);
  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){ vec2 c=cell+vec2(i,j);
   vec2 cp=(c+.5+.35*(vec2(hash(c+SEED),hash(c.yx+SEED))-.5))*2.2;
   if(abs(cp.x)<1.8&&cp.y>-3.5&&cp.y<2.5) continue;
   vec3 q=p-vec3(cp.x,0,cp.y); float h=2.2+1.5*hash(c*3.1);
   float tr=box(q-vec3(0,.6,0),vec3(.08,.6,.08)); if(tr<d){d=tr;M=7.;}
   float fo=min(pyramid(q-vec3(0,.9,0),.8,h*.6),pyramid(q-vec3(0,1.7,0),.6,h*.5)); if(fo<d){d=fo;M=9.;}
  }
 } else {
  d=p.y; M=10.;
  float w=1.6-abs(p.x); if(w<d){d=w;M=11.;}
  float c=2.6-p.y; if(c<d){d=c;M=12.;}
  vec3 dq=vec3(abs(p.x)-1.6,p.y-1.,mod(p.z,3.)-1.5); float door=box(dq,vec3(.08,1.,.45));
  d=max(d,-door);
  float frame=box(dq-vec3(-.02,0,0),vec3(.1,1.04,.5)); frame=max(frame,-box(dq,vec3(.2,1.,.45))); if(frame<d){d=frame;M=13.;}
 }
 if(FIG){ vec3 q=p-vec3(mix(-1.3,1.3,sd(11.)),0,-6.5-2.*sd(12.)); float fig=min(box(q-vec3(0,.75,0),vec3(.16,.42,.09)),length(q-vec3(0,1.32,0))-.12);
  fig=min(fig,box(vec3(abs(q.x)-.07,q.y-.18,q.z),vec3(.06,.2,.07))); if(fig<d){d=fig;M=14.;} }
 float ms=M; float ins=instrument(p);
 if(ins<d) d=ins; else M=ms;
 float pm; float pd=performers(p,pm); if(pd<d){d=pd;M=pm;}
 return d;
}
vec3 nrm(vec3 p){vec2 e=vec2(.002,0);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}
float keyIdx(){ return clamp(floor((KU+.5)*24.),0.,23.); }
float keyVal(){ int i=int(keyIdx()); return uKeys[i]; }
vec3 rustTex(vec2 uv,float nz){ return vec3(.28,.09,.05)*(.5+.8*nz)*(.6+.6*noise(uv*3.)); }
vec3 tex(vec3 p,vec3 n,float m){
 vec2 uv= abs(n.y)>.5? p.xz : abs(n.x)>.5? p.zy : p.xy;
 vec2 tc=floor(uv*16.)/16.; float nz=hash(tc*3.1+.17);
 vec3 rust=rustTex(uv,nz);
 vec3 a=vec3(.5); bool rustable=true;
 if(m==0.){ float line=step(abs(p.x),.04)*step(.5,fract(p.z*.5)); a=mix(vec3(.16,.16,.17)*(.7+.5*nz),vec3(.7,.65,.4),line);
   vec2 g=fract(uv*2.); rust=mix(rust*.5,vec3(.02),clamp(step(.9,g.x)+step(.9,g.y),0.,1.)); }
 else if(m==1.) a=vec3(.32,.3,.28)*(.75+.4*nz)*(.8+.2*step(.06,fract(uv.x*2.))*step(.06,fract(uv.y*2.)));
 else if(m==2.){ vec2 w=fract(uv); float win=step(.3,w.x)*step(w.x,.7)*step(.35,w.y)*step(w.y,.8);
   a=mix(vec3(.35,.22,.18)*(.7+.5*nz),vec3(.05,.06,.07)+vec3(.5,.35,.1)*step(.93,hash(floor(uv)+SEED)),win);
   rust=mix(rust,vec3(.02),win); }
 else if(m==3.) a=vec3(.15);
 else if(m==4.){ a=INST==2? vec3(.08,.08,.09)+.03*nz : vec3(.03,.025,.03)+.04*nz; rust=mix(a,rust*.4,.5); }
 else if(m==5.){ float k=keyIdx(); float s=mod(k,12.); bool blk= s==1.||s==3.||s==6.||s==8.||s==10.;
   vec3 kc= blk? vec3(.05): vec3(.85)*(.9+.1*nz); return mix(kc,vec3(1.,.1,.06)*1.8,keyVal()); }
 else if(m==6.) a=mix(vec3(.12,.14,.08),vec3(.2,.17,.1),nz)*(.7+.4*noise(uv*2.));
 else if(m==7.) a=vec3(.12,.08,.05)*(.7+.5*nz);
 else if(m==8.){ vec2 g=uv*10.; vec2 f=abs(fract(vec2(g.x+g.y,g.x-g.y)*.5)-.5); return vec3(.25,.2,.18)*step(f.x,.08); }
 else if(m==9.) a=vec3(.06,.1,.06)*(.6+.8*nz);
 else if(m==10.){ vec2 g=floor(uv*2.); a=mod(g.x+g.y,2.)<1.? vec3(.5,.48,.42)*(.8+.3*nz):vec3(.12,.14,.13)*(.8+.3*nz);}
 else if(m==11.) a=mix(vec3(.45,.5,.42),vec3(.6,.58,.5),step(1.,p.y))*(.75+.35*nz);
 else if(m==12.){ float panel=step(abs(fract(p.z/3.)-.5),.12)*step(abs(p.x),.45);
   float fl=1.-uKick*step(.4,hash(vec2(floor(p.z/3.),floor(T*24.))));             // panels buzz on the kick
   fl*=1.-uBreak*step(.5,abs(floor(p.z/3.)+.5)); fl*=1.-uRiser*.8*step(.5,fract(T*6.));
   a=mix(vec3(.4)*(.8+.3*nz),vec3(4.,3.9,3.4)*fl*mix(vec3(1),vec3(1.,.3,.2),OW),panel); if(panel>.5) return a; }
 else if(m==13.) a=vec3(.22,.12,.08)*(.7+.4*nz);
 else if(m==14.) return vec3(.01);
 else if(m==15.) return vec3(.035,.03,.04)*(.8+.4*nz)+vec3(.02,0,.03)*step(.96,hash(floor(uv*48.)));   // black coat, faint purple threads
 else if(m==16.) return vec3(.78,.74,.76)*(.92+.1*nz);                               // corpse-pale skin
 else if(m==17.) return vec3(.02,.02,.025)*(.7+.6*step(.5,fract(uv.x*40.)));         // straight black hair
 else if(m==18.) return vec3(.03,.03,.045)+vec3(.02,.03,.06)*nz;                      // crow, blue-black sheen
 else if(m==19.) return mix(vec3(.2,.23,.08),vec3(.1,.08,.04),step(.7,noise(uv*30.)))*(.8+.4*nz);  // warty toad
 else if(m==19.5) return vec3(.12,.11,.1);
 else if(m==20.) return mix(vec3(.02,.08,.06),vec3(.08,.03,.12),nz)*1.5;             // iridescent beetle shell
 else if(m==21.) return vec3(.12,.07,.04)*(.7+.5*nz);
 else if(m==22.) return vec3(.9,.7,.1);
 return rustable? mix(a,rust,OW) : a;
}
float lampFlicker(float id){
 float f=1.-uKick*.95*step(.35,hash(vec2(id,floor(T*24.))));   // old lamp buzz on each kick
 f*=1.-uRiser*.85*step(.5,fract(T*6.));                        // strobe before the drop
 return f;
}
vec3 lightAt(vec3 p,vec3 n,vec3 ro,vec3 fw){
 vec3 L=vec3(0);
 vec3 lc=mix(vec3(1.,.85,.6),vec3(1.,.25,.15),OW);
 if(LOC==0||LOC==3){
  for(int k=-2;k<1;k++){vec3 a=vec3(1.65,2.7,float(k)*8.-2.), b=vec3(-1.65,2.7,float(k)*8.+2.);
   float fa=lampFlicker(float(k)*2.)*(1.-uBreak), fb=lampFlicker(float(k)*2.+1.)*(1.-uBreak);
   L+=lc*fa*max(dot(n,normalize(a-p)),0.)*3./(1.+dot(a-p,a-p));
   L+=lc*fb*max(dot(n,normalize(b-p)),0.)*3./(1.+dot(b-p,b-p));}
 } else if(LOC==2){
  float z0=floor(p.z/3.)*3.+1.5; for(int k=-1;k<=1;k++){vec3 a=vec3(0,2.5,z0+float(k)*3.);
   float fl=lampFlicker(floor(a.z/3.))*(1.-uBreak);
   L+=lc*fl*max(dot(n,normalize(a-p)),0.)*2.5/(1.+dot(a-p,a-p)*.8);}
 } else { L+=vec3(.35,.4,.55)*max(dot(n,normalize(vec3(.3,1.,.2))),0.)*(NIGHT?.4:.9)*(1.-uBreak)*mix(1.,.3,OW); }
 if(FLASH){ vec3 d=p-ro; float dl=length(d); float cone=smoothstep(.86,.97,dot(d/dl,fw));
  L+=vec3(1.,.95,.8)*cone*max(dot(n,-d/dl),0.)*5./(1.+dl*dl*.6)*(1.-uBreak)*lampFlicker(99.); }
 // the one light left on in the break: a bare bulb over the instrument
 vec3 bulb=vec3(0,2.4,-1.); vec3 db=bulb-p; L+=vec3(1.,.88,.65)*uBreak*max(dot(n,normalize(db)),0.)*5./(1.+dot(db,db)*.7);
 // red glow thrown by the lit keys
 float kv=0.; for(int i=0;i<24;i++) kv+=uKeys[i];
 vec3 kl=rotY(vec3(0,.85,.25),-IROT)+vec3(0,0,-1.); float dk=length(kl-p);
 L+=vec3(1.,.15,.08)*min(kv,3.)*max(dot(n,normalize(kl-p)),0.)*.8/(1.+dk*dk*4.);
 return L;
}
vec3 weather(vec2 uv,float tmax){
 // screen-space layers: cheap, straight, and very PS1
 vec3 c=vec3(0); int wx= OW>.5? 1 : WX; if(wx==0||LOC==2) return c;   // the Otherworld always snows ash
 for(int k=0;k<4;k++){ float fk=float(k); float depth=1.+fk*1.3; if(depth>tmax) break;
  vec2 q = wx==1? vec2(uv.x*(6.+fk*3.)+sin(T*.7+fk)*.3, uv.y*(6.+fk*3.)+T*(.6+fk*.25))
                : vec2(uv.x*(18.+fk*8.)+uv.y*.6, uv.y*(1.2+fk*.4)+T*(2.6+fk*.6));
  vec2 id=floor(q); vec2 f=fract(q)-.5; float h=hash(id+fk*13.);
  if(h>.87){ vec2 o=(vec2(hash(id+1.),hash(id+2.))-.5)*.5;
   float d= wx==1? length(f-o)*2. : abs(f.x-o.x)*1.2+max(abs(f.y-o.y)-.3,0.)*3.;
   vec3 col=mix(vec3(.8),vec3(.3,.26,.24),OW); c+=col*smoothstep(.25,.0,d)*(.9-fk*.18); } }
 return c*mix(1.,.6,uBreak);
}
void main(){
 setup();
 // snare: the frame drops resolution for a moment and rows tear sideways
 float px=1.+floor(uSnare*uSnare*3.);
 vec2 fc=gl_FragCoord.xy;
 fc.x+=floor((hash(vec2(floor(fc.y/(4.*px)),floor(T*30.)))-.5)*uSnare*uSnare*24.);
 fc=(floor(fc/px)+.5)*px;
 vec2 uv=(2.*fc-R)/R.y;
 // camera: one framing per shot, built in instrument space so the keys, the goth's
 // hands and the creatures are always in view (side / over-the-shoulder angles),
 // with PS1-style jerky drift (12 fps) and an 808 shake
 float s=uShot;
 float side=sd(16.+s)<.5? -1. : 1.;
 float ang=side*mix(.55,1.25,sd(13.+s*3.1));                 // angle away from the player's axis
 float dist=mix(1.35,2.1,sd(14.+s*3.1)), hgt=mix(.45,1.05,sd(15.+s*3.1));
 float tq=floor(uShotT*12.)/12.;
 ang+=side*.025*tq; dist-=.03*tq;
 vec3 taL=vec3(mix(-.15,.15,sd(17.+s)),KEYY+.12,KEYZ+.12);
 vec3 roL=taL+vec3(sin(ang)*dist,hgt,cos(ang)*dist);
 vec3 ro=rotY(roL,-IROT)+vec3(0,0,-1.), ta=rotY(taL,-IROT)+vec3(0,0,-1.);
 ro.y+=uBass*.02*sin(T*45.); ro.x+=uKick*.012*sin(T*60.);
 if(LOC==2) ro.x=clamp(ro.x,-1.4,1.4);
 vec3 rd=camRay(uv,ro,ta,1.35); vec3 fw=normalize(ta-ro);
 // polygon wobble on the snare
 rd.xy+=(vec2(hash(vec2(floor(T*15.),1.)),hash(vec2(floor(T*15.),2.)))-.5)*.02*uSnare;
 float t=0.; for(int i=0;i<180;i++){float h=map(ro+rd*t);if(h<.001||t>30.)break;t+=h*.9;}
 vec3 c=FOG;
 if(t<30.){
  vec3 p=ro+rd*t; float m=M; vec3 n=nrm(p);
  vec3 alb=tex(p,n,m);
  vec3 amb= NIGHT? vec3(.04,.04,.06): FOG*.6; amb=mix(amb,vec3(.09,.035,.03),OW)*(1.-.7*uBreak);
  c=alb*(amb+lightAt(p,n,ro,fw));
  if(m==5.&&keyVal()>.05) c=max(c,alb*.9);
  if(m==12.&&alb.r>1.) c=alb;
  if(m==22.) c=max(c,alb*.6);                                        // eyes catch the light
  c=mix(c,FOG,smoothstep(1.2,FOGD,t));
 }
 if(!NIGHT) c+=vec3(.05)*smoothstep(-.2,1.,uv.y)*(1.-OW)*(1.-uBreak);
 c+=weather(uv,t);
 c*=1.+.06*uHat*(hash(fc+T)-.5);
 c=pow(c,vec3(1./1.1));
 float levels=mix(31.,9.,uSnare*uSnare);                       // colour depth collapses on the snare
 c=floor(c*levels+bayer(fc/px)+.5)/levels;
 O=vec4(clamp(c,0.,1.),1);
}
