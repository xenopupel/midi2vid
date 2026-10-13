// usage: node render.js shader.frag out.png W H [T]
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs');
(async () => {
  const [,, frag, out, W='720', H='1280', T='1.0', SEED='0'] = process.argv;
  const common = fs.readFileSync(__dirname + '/shaders/common.glsl', 'utf8');
  const src = common + '\n' + fs.readFileSync(frag, 'utf8');
  const html = `<html><body style="margin:0;background:#000"><canvas id=c width=${W} height=${H}></canvas><script>
  const c=document.getElementById('c');const gl=c.getContext('webgl2',{preserveDrawingBuffer:true});
  function sh(t,s){const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o}
  const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,'#version 300 es\\nin vec2 a;void main(){gl_Position=vec4(a,0,1);}'));
  gl.attachShader(p,sh(gl.FRAGMENT_SHADER,${JSON.stringify(src)}));gl.linkProgram(p);gl.useProgram(p);
  const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  gl.uniform2f(gl.getUniformLocation(p,'R'),${W},${H});gl.uniform1f(gl.getUniformLocation(p,'T'),${T});gl.uniform1f(gl.getUniformLocation(p,'SEED'),${SEED});
  // render in horizontal strips to avoid GPU watchdog
  gl.enable(gl.SCISSOR_TEST);const S=${process.env.S||64};for(let y=0;y<${H};y+=S){gl.scissor(0,y,${W},S);gl.drawArrays(gl.TRIANGLES,0,3);gl.finish();}
  window.done=true;</script></body></html>`;
  const browser = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: +W, height: +H } });
  page.on('pageerror', e => { console.error('ERR', e.message); process.exit(1); });
  page.on('console', m => console.log('console:', m.text()));
  await page.setContent(html);
  await page.waitForFunction('window.done===true', null, { timeout: 600000 });
  const d = await page.evaluate(() => document.getElementById('c').toDataURL('image/png'));
  fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64'));
  await browser.close();
  console.log('saved', out);
})();
