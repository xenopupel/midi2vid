// pastel jelly blocks laid out as a 3D piano roll; the playing note squishes
vec4 notes[7];
void initN(){
 notes[0]=vec4(-.55,.0,1.,0.); notes[1]=vec4(-.2,.35,.6,1.); notes[2]=vec4(.25,.1,.9,2.);
 notes[3]=vec4(.45,-.45,.5,3.); notes[4]=vec4(-.4,-.6,.7,4.); notes[5]=vec4(.0,-.15,.55,5.);notes[6]=vec4(-.05,.7,.8,0.);
}
vec3 pal(float i){return i<.5?vec3(1.,.45,.55):i<1.5?vec3(.45,.8,1.):i<2.5?vec3(1.,.8,.35):i<3.5?vec3(.6,.95,.6):i<4.5?vec3(.75,.55,1.):vec3(1.,.6,.35);}
vec2 map(vec3 p){
 vec2 r=vec2(p.y,-1.);
 for(int i=0;i<7;i++){
  vec4 n=notes[i]; vec3 q=p-vec3(n.x,0,n.y);
  float sq = i==1? .55:1.; // squished note
  float bulge= i==1? 1.18:1.;
  q.xz/=bulge;
  float hgt=.09*sq;
  float d=sdRBox(q-vec3(0,hgt,0),vec3(n.z*.5,hgt,.09),.06*sq+.02)*bulge*.9;
  if(d<r.x) r=vec2(d,float(i));
 }
 float ball=length(p-vec3(-.2,.2,.35))-.1; if(ball<r.x) r=vec2(ball,10.);
 return r;
}
vec3 nrm(vec3 p){vec2 e=vec2(.001,0);return normalize(vec3(map(p+e.xyy).x-map(p-e.xyy).x,map(p+e.yxy).x-map(p-e.yxy).x,map(p+e.yyx).x-map(p-e.yyx).x));}
vec2 march(vec3 ro,vec3 rd){float t=0.;vec2 h;for(int i=0;i<160;i++){h=map(ro+rd*t);if(abs(h.x)<.0004*t||t>12.)break;t+=h.x*.9;}return vec2(t,h.y);}
float shadow(vec3 ro,vec3 rd){float r=1.,t=.02;for(int i=0;i<64;i++){float h=map(ro+rd*t).x;r=min(r,6.*h/t);t+=clamp(h,.01,.15);if(r<.001||t>4.)break;}return clamp(r,0.,1.);}
float thick(vec3 p,vec3 n){float o=0.;for(int i=1;i<6;i++){float h=.04*float(i);o+=max(-map(p-n*h).x,0.)/h;}return o/5.;}
float ao(vec3 p,vec3 n){float o=0.,s=1.;for(int i=1;i<6;i++){float h=.04*float(i);o+=(h-map(p+n*h).x)*s;s*=.75;}return clamp(1.-2.5*o,0.,1.);}
vec3 bg=vec3(1.,.86,.8);
void main(){
 initN();
 vec2 fc=gl_FragCoord.xy; vec3 acc=vec3(0);
 vec3 L=normalize(vec3(-.5,1.,.4));
 for(int s=0;s<2;s++){
  vec2 uv=(2.*(fc+vec2(s)*.5-.25)-R)/R.y;
  vec3 ro=vec3(.0,2.6,2.1),ta=vec3(-.05,0.,.05);
  vec3 rd=camRay(uv,ro,ta,2.3);
  vec2 h=march(ro,rd); vec3 c=bg;
  if(h.x<12.){
   vec3 p=ro+rd*h.x,n=nrm(p); float sh=shadow(p+n*.003,L),a=ao(p,n);
   if(h.y<0.){ // floor: soft colored shadows
    c=bg*(.55+.45*sh)*(.6+.4*a);
    // colored caustic tint under jellies
    for(int i=0;i<7;i++){vec4 nn=notes[i];float d=length((p.xz-vec2(nn.x,nn.y)-vec2(.12,-.1))/vec2(nn.z*.6,.17));c+=pal(nn.w)*.18*exp(-d*d*2.)*(1.-sh);}
   } else if(h.y==10.){ // chrome ball
    vec3 r=reflect(rd,n); float fr=pow(1.-max(dot(n,-rd),0.),5.);
    c=mix(bg*.9,vec3(1.),smoothstep(.6,.9,r.y))*(.5+.5*smoothstep(-.2,.2,r.y))+vec3(3.)*pow(max(dot(r,L),0.),80.);
    c*=.5+.5*a;
   } else {
    vec3 alb=pal(notes[int(h.y)].w);
    float th=thick(p,n);
    vec3 trans=mix(alb,vec3(1.),.25)*exp(-th*1.2*(1.-alb))*1.35;          // light through jelly
    float wrap=max(dot(n,L)*.5+.5,0.);
    vec3 dif=alb*alb*wrap*(.5+.5*sh);
    c=mix(trans,dif,.3)*(.8+.2*a); c+=alb*.25*pow(max(dot(rd,L)*.5+.5,0.),2.);
    float fr=pow(1.-max(dot(n,-rd),0.),4.);
    c+=fr*bg*.5;
    vec3 hv=normalize(L-rd); c+=vec3(1.4)*pow(max(dot(n,hv),0.),120.)*sh;
    c+=vec3(.5)*pow(max(dot(n,normalize(vec3(.6,.5,.8)-rd)),0.),60.);
    if(h.y==1.) c+= alb*.35; // active note glows
   }
  }
  acc+=c;
 }
 vec3 c=acc*.5; vec2 q=fc/R; c*=.85+.15*pow(16.*q.x*q.y*(1.-q.x)*(1.-q.y),.2);
 c=pow(clamp(c,0.,1.),vec3(.95));
 O=vec4(c+(hash(fc)-.5)/150.,1);
}
