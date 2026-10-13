// industrial: row of hydraulic presses, each note slams one down -> sparks. sodium light, haze, rust
const float SP=.62;
float headY(float i){ if(i==-1.||i==2.) return .78; return 1.25+.75*hash(vec2(i,4.)); }
float M; float MI;
float cyl(vec3 p,float r,float h){vec2 d=vec2(length(p.xz)-r,abs(p.y)-h);return min(max(d.x,d.y),0.)+length(max(d,0.));}
float map(vec3 p){
 float d=p.y; M=0.;
 float i=clamp(floor(p.x/SP+.5),-4.,4.); vec3 q=p-vec3(i*SP,0,0);
 float hy=headY(i);
 float rod=cyl(q-vec3(0,(hy+4.)*.5,0),.07,(4.-hy)*.5); if(rod<d){d=rod;M=1.;}
 float sleeve=cyl(q-vec3(0,3.3,0),.13,.7); if(sleeve<d){d=sleeve;M=2.;}
 float head=sdRBox(q-vec3(0,hy+.12,0),vec3(.24,.12,.24),.015); if(head<d){d=head;M=3.;}
 float die=sdRBox(q-vec3(0,.6,0),vec3(.26,.06,.26),.01); if(die<d){d=die;M=4.;}
 // conveyor base
 float base=sdRBox(p-vec3(0,.27,0),vec3(3.,.27,.42),.02); if(base<d){d=base;M=5.;}
 // workpiece being crushed (glowing hot) under active presses
 vec3 w=q-vec3(0,.69,0); float wp=sdRBox(w,vec3(.2,(i==-1.||i==2.)?.025:.05,.2),.01); if(wp<d){d=wp;M=(i==-1.||i==2.)?7.:6.;}
 // ceiling girder
 float g=sdRBox(p-vec3(0,4.,0),vec3(3.,.18,.3),.0); if(g<d){d=g;M=8.;}
 // back wall
 float wall=p.z+2.2; if(wall<d){d=wall;M=9.;}
 MI=i; return d;
}
vec3 nrm(vec3 p){vec2 e=vec2(.001,0);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}
float shadow(vec3 ro,vec3 rd){float r=1.,t=.02;for(int i=0;i<48;i++){float h=map(ro+rd*t);r=min(r,10.*h/t);t+=clamp(h,.02,.3);if(r<.002||t>8.)break;}return clamp(r,0.,1.);}
float ao(vec3 p,vec3 n){float o=0.,s=1.;for(int i=1;i<6;i++){float h=.05*float(i);o+=(h-map(p+n*h))*s;s*=.75;}return clamp(1.-2.*o,0.,1.);}
vec3 albedo(vec3 p,vec3 n,float m,out float metal,out float rough){
 float rust=fbm(p.xy*5.+p.z*3.); metal=0.; rough=.6;
 vec3 steel=vec3(.5,.52,.55); vec3 rc=mix(vec3(.25,.09,.03),vec3(.5,.22,.08),fbm(p.xz*12.+p.y*9.));
 if(m==1.){metal=1.;rough=.15;return vec3(.85,.87,.9);}                 // chrome rod
 if(m==3.){ float st=step(.5,fract((p.x+p.y)*7.)); vec3 hz=mix(vec3(.85,.55,.02),vec3(.02),st);
   bool side=abs(n.y)<.5; metal=side?0.:.6; return side? mix(hz,rc*.6,smoothstep(.6,.8,rust)) : mix(steel*.6,rc,smoothstep(.45,.7,rust));}
 if(m==6.) {metal=.8;rough=.3;return vec3(.6,.6,.62);}
 if(m==7.) return vec3(1.,.4,.1);
 if(m==0.){ vec2 g=p.xz*6.; vec2 c=fract(g)-.5; float plate=step(.08,abs(c.x+c.y))*step(.08,abs(c.x-c.y)); metal=.7; rough=.35;
   return mix(vec3(.12,.11,.1), vec3(.22,.21,.2),plate)*(.6+.6*fbm(p.xz*3.)); }
 if(m==9.){ vec2 b=p.xy*vec2(2.,4.); b.x+=.5*floor(b.y); vec2 f=fract(b); float mortar=step(.06,f.x)*step(.08,f.y);
   return mix(vec3(.01),vec3(.07,.05,.045)*(.6+.6*hash(floor(b))),mortar);}
 metal=.5; return mix(steel*.5,rc,smoothstep(.4,.7,rust));
}
vec3 sparks(vec3 ro,vec3 rd,float tmax){
 vec3 g=vec3(0);
 for(int c=0;c<2;c++){ vec3 o=vec3(c==0?-SP:2.*SP,.72,.0);
  for(int k=0;k<70;k++){ float fk=float(k)+float(c)*50.;
   float a=hash(vec2(fk,1.))*6.283; float sp=1.+2.5*hash(vec2(fk,2.)); float up=.4+1.6*hash(vec2(fk,3.)); float tt=.05+.35*hash(vec2(fk,4.));
   vec3 v=vec3(cos(a)*sp,up,sin(a)*sp*.6);
   vec3 p1=o+v*tt+vec3(0,-4.9*tt*tt,0), p0=o+v*(tt-.06)+vec3(0,-4.9*(tt-.06)*(tt-.06),0);
   // distance ray to segment p0-p1
   vec3 ba=p1-p0; vec3 oa=ro-p0; vec3 n=cross(rd,ba); float dn=length(n);
   float s=clamp(dot(cross(oa,rd),n)/(dn*dn),0.,1.); // param on segment
   vec3 ps=p0+ba*s; float tr=dot(ps-ro,rd); if(tr<0.||tr>tmax) continue;
   float d=length(cross(ps-ro,rd));
   g+=vec3(1.,.55,.18)*.00012/(d*d+.000012)*(.4+.6*s)*(1.-tt*1.5);
  }}
 return g;
}
void main(){
 vec2 fc=gl_FragCoord.xy; vec3 acc=vec3(0);
 vec3 L=normalize(vec3(-.5,1.,.35)); vec3 Lc=vec3(1.,.5,.18)*1.6; // sodium key
 vec3 F=normalize(vec3(.9,.2,.3)); vec3 Fc=vec3(.2,.45,1.)*.22;   // cold fill
 for(int s=0;s<2;s++){
  vec2 uv=(2.*(fc+vec2(s)*.5-.25)-R)/R.y;
  vec3 ro=vec3(1.5,.95,2.6),ta=vec3(.15,1.55,0.);
  vec3 rd=camRay(uv,ro,ta,1.6);
  float t=0.; for(int i=0;i<200;i++){float h=map(ro+rd*t);if(h<.0005*t||t>25.)break;t+=h*.9;}
  vec3 c=vec3(0);
  if(t<25.){
   vec3 p=ro+rd*t; float m=M; vec3 n=nrm(p);
   float metal,rough; vec3 alb=albedo(p,n,m,metal,rough);
   float sh=shadow(p+n*.003,L), a=ao(p,n);
   vec3 h=normalize(L-rd); float spp=mix(8.,200.,1.-rough);
   float fr=pow(1.-max(dot(n,-rd),0.),5.);
   vec3 spec=mix(vec3(.04),alb,metal)*(1.-fr)+fr;
   float spot=.15+.85*smoothstep(1.1,.2,min(abs(p.x+SP),abs(p.x-2.*SP)));
   vec3 Lk=Lc*spot;
   c=(1.-metal)*alb*(Lk*max(dot(n,L),0.)*sh + Fc*max(dot(n,F),0.)*a + vec3(.05,.05,.07)*a);
   c+=spec*(Lk*pow(max(dot(n,h),0.),spp)*sh*spp*.02 + Fc*pow(max(dot(n,normalize(F-rd)),0.),spp)*spp*.01);
   // chrome reflects the warm/cold environment
   if(m==1.){vec3 r=reflect(rd,n); c+=alb*mix(vec3(.05,.08,.12),vec3(1.,.5,.2)*1.5,smoothstep(-.2,.6,r.x*-.6+r.y*.5))*.9;}
   if(m==7.) c=vec3(2.2,.55,.08);                                    // red-hot crushed metal
   // hot glow spill around active presses
   for(int k=0;k<2;k++){vec3 hp=vec3(k==0?-SP:2.*SP,.7,0.); float dh=length(hp-p); c+=alb*vec3(1.,.35,.08)*max(dot(n,normalize(hp-p)),0.)*4./(1.+dh*dh*12.);}
   // red warning beacon on wall
   vec3 bp=vec3(-2.2,3.,-2.1); float db=length(bp-p); c+=alb*vec3(1.,.05,.03)*.6/(1.+db*db*4.);
  }
  // height fog / haze lit by sodium light
  float fogA=1.-exp(-t*.035);
  vec3 fogC=mix(vec3(.01,.012,.016),vec3(.25,.11,.04),pow(max(dot(rd,L),0.),4.));
  c=mix(c,fogC,fogA);
  // light shafts through roof slats
  float sh2=0.; float jit=hash(fc+float(s));
  for(int k=0;k<20;k++){float tt=(float(k)+jit)/20.*min(t,12.); vec3 q=ro+rd*tt;
   vec3 qq=q+L*((4.6-q.y)/L.y); float slat=step(.55,fract(qq.x*1.4+qq.z*.3));
   sh2+=slat*shadow(q,L)*.012*smoothstep(4.5,1.,q.y);}
  c+=vec3(1.,.5,.2)*sh2*min(t,12.)*.04;
  c+=sparks(ro,rd,t);
  acc+=c;
 }
 vec3 c=acc*.5; c=mix(c,vec3(dot(c,vec3(.3,.59,.11))),.15);
 O=vec4(post(c*.55,fc),1);
}
