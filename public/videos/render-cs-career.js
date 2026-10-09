const { chromium } = require('playwright-core');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const mode = process.argv[2] || 'preview';
const src = 'file://' + path.resolve(process.argv[3]);
const out = process.argv[4] || 'out.mp4';
const FPS = 24;
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--font-render-hinting=none'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto(src + '?render=1');
  await page.waitForFunction(() => window.__video);
  const total = await page.evaluate(() => window.__video.total);
  console.log('total seconds', total);
  if (mode === 'preview') {
    const times = JSON.parse(process.argv[5] || '[]');
    for (const t of times) {
      await page.evaluate(s => window.__video.seek(s), t);
      await page.screenshot({ path: `prev_${String(t).replace('.','_')}.png` });
    }
  } else {
    const ff = spawn('ffmpeg', ['-y','-f','image2pipe','-vcodec','mjpeg','-framerate',String(FPS),'-i','-','-c:v','libx264','-pix_fmt','yuv420p','-preset','medium','-crf','20','-movflags','+faststart', out], { stdio: ['pipe','inherit','inherit'] });
    const n = Math.ceil(total * FPS);
    const t0 = Date.now();
    for (let i = 0; i < n; i++) {
      await page.evaluate(s => window.__video.seek(s), i / FPS);
      const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 480 === 0) console.log(`frame ${i}/${n} ${(Date.now()-t0)/1000|0}s`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    const nar = path.join(path.dirname(path.resolve(process.argv[3])), 'cs-career-narration.mp3');
    if (fs.existsSync(nar)) {
      const tmp = out + '.silent.mp4'; fs.renameSync(out, tmp);
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', tmp, '-i', nar, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out]);
      fs.unlinkSync(tmp); console.log('audio muxed from', nar);
    }
    console.log('done', out);
  }
  await browser.close();
})();
