// white/black keys + liquid mercury strands dripping onto them
const float KW=.25;
vec2 keys(vec3 p){ // returns dist, id(1 white,2 black)
 float i=clamp(floor(p.x/KW+.5),-7.,7.); vec3 q=p; q.x-=i*KW;
 float press= (i==-1.||i==2.)? -.035:0.;
 float w=sdRBox(q-vec3(0,-.15+press,0),vec3(KW*.47,.15,.9),.015);
 float m=mod(i,7.); vec2 r=vec2(w,1.);
 // black keys sit between white keys (skip after E and B)
 float j=floor(p.x/KW); float mj=mod(j,7.);
 if(mj!=2.&&mj!=6.&&j>=-7.&&j<7.){vec3 b=p; b.x-= (j+.5)*KW; float bk=sdRBox(b-vec3(0,.04,-.35),vec3(KW*.27,.09,.52),.02); if(bk<r.x) r=vec2(bk,2.);}
 return r;
}
float strand(vec3 p,float x,float z,float y0,float k){
 // tapered liquid column from sky down to blob at y0, with pinch
 vec3 q=p-vec3(x,0,z);
 float y=q.y-y0;
 float r=mix(.11,.022,smoothstep(.0,.9,y))*(1.-.25*smoothstep(.15,.35,y)*smoothstep(.55,.35,y));
 r+= .012*sin(y*18.+k);
 float col=length(q.xz)-r; col=max(col,-y);
 float blob=length(q-vec3(0,y0+.02,0))*vec3(1).x - .13;
 blob=length((q-vec3(0,y0+.04,0))*vec3(1,1.15,1))-.13;
 return smin(col,blob,.08);
}
vec2 map(vec3 p){
 vec2 k=keys(p);
 float m=1e3;
 m=min(m,strand(p,-KW,.2,.32,1.));
 m=min(m,strand(p,2.*KW,.05,.6,2.));
 m=smin(m, strand(p,-4.*KW,.35,1.15,3.),.01);
 // puddles on pressed keys + splash beads
 m=smin(m, length((p-vec3(-KW,-.03,.2))*vec3(1,4.,1))/4.-.075,.06);
 m=smin(m, length((p-vec3(2.*KW,-.03,.05))*vec3(1,4.,1))/4.-.06,.05);
 for(int i=0;i<7;i++){float a=float(i)*.9+.3; vec3 c=vec3(2.*KW+cos(a)*.22, .05+.15*fract(a*3.7), .05+sin(a)*.22); m=min(m,length(p-c)-.018-.012*fract(a*5.3));}
 for(int i=0;i<5;i++){float a=float(i)*1.3; vec3 c=vec3(-KW+cos(a)*.28, .1+.2*fract(a*2.3), .2+sin(a)*.2); m=min(m,length(p-c)-.015-.01*fract(a*7.1));}
 float fl=p.y+.31; // floor
 vec2 r=k; if(m<r.x) r=vec2(m,3.); if(fl<r.x) r=vec2(fl,4.);
 return r;
}
vec3 nrm(vec3 p){vec2 e=vec2(.001,0);return normalize(vec3(map(p+e.xyy).x-map(p-e.xyy).x,map(p+e.yxy).x-map(p-e.yxy).x,map(p+e.yyx).x-map(p-e.yyx).x));}
vec3 env(vec3 d){
 vec3 c=mix(vec3(.01,.008,.02),vec3(.06,.05,.09),smoothstep(-.3,.6,d.y));
 // softboxes
 c+=vec3(9.)*smoothstep(.06,.0,abs(d.x-.3)-.25)*smoothstep(.04,0.,abs(d.z+.2)-.35)*step(.7,d.y);
 c+=vec3(3.,.4,1.8)*smoothstep(.1,0.,abs(d.x+.85)-.04)*smoothstep(.0,.3,d.y);     // magenta strip
 c+=vec3(.3,1.5,3.5)*smoothstep(.1,0.,abs(d.x-.9)-.03)*smoothstep(-.2,.4,d.y);    // cyan strip
 return c;
}
vec2 march(vec3 ro,vec3 rd){float t=0.;vec2 h;for(int i=0;i<220;i++){h=map(ro+rd*t);if(abs(h.x)<.0005*t||t>20.)break;t+=h.x*.8;}return vec2(t,h.y);}
float shadow(vec3 ro,vec3 rd){float r=1.,t=.02;for(int i=0;i<48;i++){float h=map(ro+rd*t).x;r=min(r,10.*h/t);t+=clamp(h,.01,.2);if(r<.001||t>6.)break;}return clamp(r,0.,1.);}
float ao(vec3 p,vec3 n){float o=0.,s=1.;for(int i=1;i<6;i++){float h=.03*float(i);o+=(h-map(p+n*h).x)*s;s*=.7;}return clamp(1.-3.*o,0.,1.);}
vec3 shade(vec3 ro,vec3 rd,int depth){
 vec3 col=vec3(0); vec3 thr=vec3(1);
 for(int b=0;b<3;b++){
  vec2 h=march(ro,rd); if(h.x>20.){col+=thr*env(rd)*.6;break;}
  vec3 p=ro+rd*h.x,n=nrm(p);vec3 L=normalize(vec3(.4,1.,.3));
  float fr=pow(1.-max(dot(n,-rd),0.),5.);
  float sh=shadow(p+n*.002,L),a=ao(p,n);
  if(h.y==3.){ // mercury: mirror
   thr*=vec3(.85,.87,.9)*(.6+.4*fr); ro=p+n*.003; rd=reflect(rd,n); continue;}
  vec3 alb = h.y==1.? vec3(.85,.82,.77): h.y==2.? vec3(.01): vec3(.012,.01,.016);
  float dif=max(dot(n,L),0.)*sh;
  vec3 c=alb*(dif*2.2+ .15*a*vec3(.6,.6,1.));
  c+=alb*vec3(2.,.3,1.)*.5*max(dot(n,normalize(vec3(-1,.3,0))),0.)*a; // magenta fill
  col+=thr*c;
  float ks = h.y==1.?.04:h.y==2.?.06:.03; ks+= (1.-ks)*fr;
  thr*=ks; ro=p+n*.003; rd=reflect(rd,n);
  if(h.y==4.) {thr*=.3;}
 }
 return col;
}
void main(){
 vec2 fc=gl_FragCoord.xy; vec3 acc=vec3(0);
 for(int s=0;s<2;s++){
  vec2 uv=(2.*(fc+vec2(s)*.5-.25)-R)/R.y;
  vec3 ro=vec3(1.25,1.25,2.1),ta=vec3(-.05,.35,0.);
  vec3 rd=camRay(uv,ro,ta,2.2);
  acc+=shade(ro,rd,0);
 }
 O=vec4(post(acc*.5,fc),1);
}
