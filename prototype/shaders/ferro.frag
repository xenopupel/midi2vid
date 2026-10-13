// ferrofluid: chord notes = spike crowns rising out of a black glossy pool
const vec3 N1=vec3(-.55,.0,.9), N2=vec3(.35,.0,.75), N3=vec3(-.05,.0,-.35); // xz pos, strength in y slot
float mound(vec2 p,vec2 c,float r,float h){float d=length(p-c)/r;return h*exp(-d*d*2.2);}
float spikes(vec2 p,vec2 c,float r,float h){
 // hex-ish lattice of cones, height follows mound envelope
 float best=-.2; vec2 s=vec2(.11,.095);
 vec2 g=p/s; vec2 id0=floor(g);
 for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
  vec2 id=id0+vec2(i,j); vec2 cc=(id+vec2(.5+.5*mod(id.y,2.),.5))*s;
  cc+= (vec2(hash(id),hash(id+7.))-.5)*.02;
  float env=exp(-pow(length(cc-c)/r,2.)*2.);
  float hh=h*env; if(hh<.03) continue;
  float cone=hh - length(p-cc)*(1.9+hh*2.);
  best=max(best,cone);
 }
 return best;
}
float H(vec2 p){
 float m=mound(p,vec2(-.05,.1),.5,.2)+mound(p,vec2(.55,-.5),.3,.1)+mound(p,vec2(-.6,-.7),.3,.08);
 float s=max(spikes(p,vec2(-.05,.1),.42,.55),max(spikes(p,vec2(.55,-.5),.25,.25),spikes(p,vec2(-.6,-.7),.25,.2)));
 return smax(m, s, .025)+.0;
}
vec2 map(vec3 p){
 float pool=p.y-max(H(p.xz),0.004);
 float plate=p.y; // mirror-ish plate
 return pool<plate+.003? vec2(pool*.45,1.):vec2(plate,2.);
}
vec3 nrm(vec3 p){vec2 e=vec2(.0008,0);return normalize(vec3(map(p+e.xyy).x-map(p-e.xyy).x,map(p+e.yxy).x-map(p-e.yxy).x,map(p+e.yyx).x-map(p-e.yyx).x));}
vec3 env(vec3 d){
 vec3 c=vec3(.004,.004,.008)+vec3(.02,.015,.04)*smoothstep(-.2,.8,d.y);
 float a=atan(d.x,d.z);
 c+=vec3(4.5,1.6,.5)*smoothstep(.05,0.,abs(d.y-.35)-.05)*smoothstep(.4,0.,abs(a-.9)-.25);   // amber strip
 c+=vec3(.4,1.2,5.)*smoothstep(.05,0.,abs(d.y-.2)-.03)*smoothstep(.6,0.,abs(a+1.6)-.4);    // blue strip
 c+=vec3(8.)*smoothstep(.1,0.,abs(d.y-.85)-.07)*smoothstep(.5,0.,abs(a+.2)-.5);            // top softbox
 c+=vec3(3.,.3,1.5)*smoothstep(.05,0.,abs(a-2.6)-.12)*smoothstep(-.1,.5,d.y);
 return c;
}
vec2 march(vec3 ro,vec3 rd){float t=0.;vec2 h;for(int i=0;i<300;i++){h=map(ro+rd*t);if(abs(h.x)<.0002*t||t>15.)break;t+=h.x;}return vec2(t,h.y);}
vec3 shade(vec3 ro,vec3 rd){
 vec3 col=vec3(0),thr=vec3(1);
 for(int b=0;b<3;b++){
  vec2 h=march(ro,rd); if(h.x>15.){col+=thr*env(rd);break;}
  vec3 p=ro+rd*h.x,n=nrm(p);
  float fr=pow(1.-max(dot(n,-rd),0.),5.);
  if(h.y==1.){ float F=.04+.96*fr; col+=thr*vec3(.004); thr*=vec3(F)+.06; }
  else { // dark brushed plate with faint grid ripples
   float rings=.5+.5*sin(length(p.xz-vec2(-.05,.1))*60.);
   col+=thr*vec3(.006)*(1.+rings*.3); thr*=.08+.5*fr; }
  ro=p+n*.002; rd=reflect(rd,n);
 }
 return col;
}
void main(){
 vec2 fc=gl_FragCoord.xy; vec3 acc=vec3(0);
 for(int s=0;s<2;s++){
  vec2 uv=(2.*(fc+vec2(s)*.5-.25)-R)/R.y;
  vec3 ro=vec3(.15,.42,1.25),ta=vec3(-.05,.2,-.1);
  vec3 rd=camRay(uv,ro,ta,1.9);
  acc+=shade(ro,rd);
 }
 O=vec4(post(acc*.5,fc),1);
}
