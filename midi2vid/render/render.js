// Render a midi2vid job: one shader, one timeline, frames piped into ffmpeg.
// usage: node render.js job.json
// job: { shader, common, width, height, outWidth, outHeight, fps, seed, fields, frames, out }
const fs = require('fs');
const { spawn } = require('child_process');

function loadPlaywright() {
  for (const p of ['playwright', '/opt/node-tools/node_modules/playwright']) {
    try { return require(p); } catch (e) { /* try next */ }
  }
  throw new Error('playwright not found: run `npm install` in the repo root');
}

(async () => {
  const job = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const src = fs.readFileSync(job.common, 'utf8') + '\n' + fs.readFileSync(job.shader, 'utf8');
  const { width: W, height: H } = job;

  const ffmpeg = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(job.fps), '-i', '-',
    '-vf', `vflip,scale=${job.outWidth}:${job.outHeight}:flags=neighbor`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
    job.out,
  ], { stdio: ['pipe', 'inherit', 'inherit'], detached: true });  // own process group: Ctrl+C must not kill the encoder
  const ffDone = new Promise((res, rej) => ffmpeg.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exited ' + c)))));

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ handleSIGINT: false, handleSIGTERM: false, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage();
  page.on('pageerror', e => { console.error('shader page error:', e.message); process.exit(1); });
  await page.setContent(`<canvas id="c" width="${W}" height="${H}"></canvas>`);
  await page.evaluate(({ src, W, H, seed }) => {
    const gl = document.getElementById('c').getContext('webgl2', { preserveDrawingBuffer: true });
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o);
      if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, '#version 300 es\nin vec2 a;void main(){gl_Position=vec4(a,0,1);}'));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, src));
    gl.linkProgram(p); gl.useProgram(p);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const u = n => gl.getUniformLocation(p, n);
    gl.uniform2f(u('R'), W, H); gl.uniform1f(u('SEED'), seed);
    const pixels = new Uint8Array(W * H * 4);
    const names = { t: 'T', kick: 'uKick', snare: 'uSnare', hat: 'uHat', bass: 'uBass', drop: 'uDrop',
      brk: 'uBreak', riser: 'uRiser', shot: 'uShot', shotT: 'uShotT' };
    window.renderFrame = (fields, row) => {
      fields.forEach((f, i) => gl.uniform1f(u(names[f]), row[i]));
      gl.uniform1fv(u('uKeys'), row.slice(fields.length));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let s = ''; const CH = 0x8000;
      for (let i = 0; i < pixels.length; i += CH) s += String.fromCharCode.apply(null, pixels.subarray(i, i + CH));
      return btoa(s);
    };
  }, { src, W, H, seed: job.seed });

  // Ctrl+C stops rendering but still finishes the video with the frames done so far
  let stop = false;
  const onStop = () => {
    if (stop) process.exit(130);
    stop = true;
    process.stderr.write('\nstopping: finishing the video with the frames rendered so far (Ctrl+C again to abort)\n');
  };
  process.on('SIGINT', onStop);
  process.on('SIGTERM', onStop);

  const n = job.frames.length;
  const t0 = Date.now();
  for (let i = 0; i < n && !stop; i++) {
    const b64 = await page.evaluate(([f, r]) => window.renderFrame(f, r), [job.fields, job.frames[i]]);
    if (!ffmpeg.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ffmpeg.stdin.once('drain', r));
    if (i % 30 === 0 || i === n - 1) {
      const fps = (i + 1) / ((Date.now() - t0) / 1000);
      process.stderr.write(`\rframe ${i + 1}/${n}  ${fps.toFixed(1)} fps`);
    }
  }
  process.stderr.write('\n');
  ffmpeg.stdin.end();
  await ffDone;
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
