// the track as a monolith city in a desert at dusk: x=time, z=pitch, height=velocity; playhead = light wall
const vec3 SUN=normalize(vec3(-.8,.12,-.6));
float cellH(vec2 id){ float h=hash(id*1.37); return h>.72? .12+1.1*pow(hash(id+3.1),2.5):0.; }
vec2 map(vec3 p){
 float g=p.y - .06*fbm(p.xz*.6) - .03*sin(p.x*1.3+p.z*.7);
 vec2 r=vec2(g,0.);
 vec2 s=vec2(.55,.32); vec2 id=floor(p.xz/s);
 for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
  vec2 c=id+vec2(i,j); if(abs(c.y)>9.||c.x>2.||c.x<-30.) continue;
  float h=cellH(c); if(h==0.) continue;
  float len=.2+.32*hash(c+9.);
  vec3 q=p-vec3((c.x+.5)*s.x,h*.5,(c.y+.5)*s.y);
  float d=sdRBox(q,vec3(len*.5,h*.5,.045),.006);
  if(d<r.x) r=vec2(d,c.x>=0.?2.:1.);
 }
 return r;
}
vec3 nrm(vec3 p){vec2 e=vec2(.002,0);return normalize(vec3(map(p+e.xyy).x-map(p-e.xyy).x,map(p+e.yxy).x-map(p-e.yxy).x,map(p+e.yyx).x-map(p-e.yyx).x));}
vec2 march(vec3 ro,vec3 rd){float t=0.;vec2 h;for(int i=0;i<200;i++){h=map(ro+rd*t);if(abs(h.x)<.0008*t||t>40.)break;t+=h.x*.6;}return vec2(t,h.y);}
float shadow(vec3 ro,vec3 rd){float r=1.,t=.02;for(int i=0;i<80;i++){float h=map(ro+rd*t).x;r=min(r,12.*h/t);t+=clamp(h,.02,.4);if(r<.001||t>15.)break;}return clamp(r,0.,1.);}
vec3 sky(vec3 d){
 vec3 c=mix(vec3(1.,.55,.32),vec3(.18,.2,.42),pow(clamp(d.y*1.6,0.,1.),.6));
 float s=max(dot(d,SUN),0.); c+=vec3(1.,.6,.3)*pow(s,8.)*.8+vec3(4.,2.4,1.3)*pow(s,900.);
 return c;
}
void main(){
 vec2 fc=gl_FragCoord.xy; vec3 acc=vec3(0);
 for(int s=0;s<2;s++){
  vec2 uv=(2.*(fc+vec2(s)*.5-.25)-R)/R.y;
  vec3 ro=vec3(1.9,2.3,3.4),ta=vec3(-1.2,.0,-.4);
  vec3 rd=camRay(uv,ro,ta,2.0);
  vec2 h=march(ro,rd); vec3 c=sky(rd);
  if(h.x<40.){
   vec3 p=ro+rd*h.x,n=nrm(p);
   float sh=shadow(p+n*.004,SUN);
   float dif=max(dot(n,SUN),0.)*sh;
   vec3 alb= h.y==0.? vec3(.75,.48,.32)*(.85+.3*fbm(p.xz*8.)) : vec3(.12,.11,.12);
   vec3 skyl=vec3(.25,.25,.45)*(.5+.5*n.y);
   c=alb*(vec3(3.2,1.9,1.1)*dif+skyl*.7);
   if(h.y>0.){ vec3 rf=reflect(rd,n); c+= .15*sky(rf)*pow(1.-max(dot(n,-rd),0.),3.); }
   // playhead light wall at x=0
   float ph=exp(-abs(p.x)*25.); c+=vec3(1.,.35,.1)*ph*2.5; if(h.y>0.&&abs(p.x)<.3) c+=vec3(1.,.5,.2)*smoothstep(.0,.05,p.y)*1.2*exp(-abs(p.x)*6.);
   if(h.y==2.) c*=.35; // future notes darker
   // tops of active (crossing playhead) pillars glow
   c=mix(sky(rd)*.95,c,exp(-h.x*.018));
  }
  // volumetric playhead glow
  float tw=-ro.x/rd.x; if(tw>0.&&tw<h.x){vec3 pw=ro+rd*tw; c+=vec3(1.,.4,.12)*.35*exp(-abs(pw.y-.6)*1.5)*smoothstep(3.5,0.,abs(pw.z));}
  acc+=c;
 }
 O=vec4(post(acc*.5,fc),1);
}
