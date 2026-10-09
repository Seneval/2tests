// Genera la narración del video con ElevenLabs, un clip por subtítulo, con caché y tope de gasto.
// Uso: XI_KEY=... node narrate.js <video.html> <outdir> [voiceId] [maxUsd]
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const [,, htmlPath, outDir, voiceArg, maxUsdArg] = process.argv;
const KEY = process.env.XI_KEY; if (!KEY) throw new Error('falta XI_KEY');
const MAX_USD = Number(maxUsdArg || 5);
const MODEL = process.env.XI_MODEL || 'eleven_multilingual_v2';   // 1 crédito por carácter
const USD_PER_CREDIT = 0.30 / 1000; // estimación conservadora (plan Starter: 30k créditos por 5 USD = 0.17; Creator 0.22)
const API = 'https://api.elevenlabs.io/v1';
const H = { 'xi-api-key': KEY, 'content-type': 'application/json' };
fs.mkdirSync(outDir, { recursive: true });

function captions(html) {
  const scenes = [...html.matchAll(/<section class="scene" data-dur="([\d.]+)" data-name="([^"]*)">([\s\S]*?)<\/section>/g)];
  return scenes.map((m, si) => ({
    scene: si, name: m[2], dur: +m[1],
    caps: [...m[3].matchAll(/<p data-at="([\d.]+)">([\s\S]*?)<\/p>/g)].map((c, ci) => ({
      scene: si, idx: ci, at: +c[1],
      text: c[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
    }))
  }));
}
async function j(url, opt) { const r = await fetch(url, opt); if (!r.ok) throw new Error(url + ' -> ' + r.status + ' ' + (await r.text()).slice(0, 300)); return r; }
function dur(f) { return +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim(); }

(async () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const scenes = captions(html);
  const all = scenes.flatMap(s => s.caps);
  const pending = all.filter(c => !fs.existsSync(path.join(outDir, `s${String(c.scene).padStart(2,'0')}_c${c.idx}.mp3`)));
  const chars = pending.reduce((a, c) => a + c.text.length, 0);
  const estUsd = chars * USD_PER_CREDIT * (MODEL.includes('flash') || MODEL.includes('turbo') ? 0.5 : 1);
  console.log(`${all.length} subtítulos, ${pending.length} pendientes, ${chars} caracteres, costo estimado ≤ $${estUsd.toFixed(2)} (tope $${MAX_USD})`);
  if (estUsd > MAX_USD) throw new Error('Supera el tope de gasto; no se genera nada.');

  if (process.env.XI_FAKE) { // prueba del pipeline sin gastar: tonos sintéticos con la duración aproximada de la lectura
    for (const c of pending) { const file = path.join(outDir, `s${String(c.scene).padStart(2,'0')}_c${c.idx}.mp3`);
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `sine=frequency=330:duration=${(c.text.length / 16).toFixed(2)}`, '-b:a', '64k', file]); }
    pending.length = 0;
  }
  const sub = process.env.XI_FAKE ? { tier: 'fake', character_count: 0, character_limit: 1e9 } : await (await j(`${API}/user/subscription`, { headers: H })).json();
  const left = (sub.character_limit || 0) - (sub.character_count || 0);
  console.log(`plan: ${sub.tier}, créditos usados ${sub.character_count}/${sub.character_limit}, disponibles ${left}`);
  if (left < chars) throw new Error(`Créditos insuficientes en el plan (${left} < ${chars}); generar más causaría cargos extra. Detenido.`);

  let voice = voiceArg || (process.env.XI_FAKE ? 'fake' : '');
  if (!voice) {
    const vs = (await (await j(`${API}/voices`, { headers: H })).json()).voices || [];
    const es = vs.find(v => /^es/i.test(v.labels?.language || '') || /spanish|español/i.test(JSON.stringify(v.labels || {})));
    voice = (es || vs.find(v => v.name === 'George') || vs.find(v => v.name === 'Daniel') || vs[0]).voice_id;
    console.log('voz:', (es || {}).name || 'George/Daniel/primera', voice);
  }
  if (pending.length === 0) { console.log('nada que generar'); }
  for (let i = 0; i < pending.length; i++) {
    const c = pending[i];
    const file = path.join(outDir, `s${String(c.scene).padStart(2,'0')}_c${c.idx}.mp3`);
    const prev = all[all.indexOf(c) - 1], next = all[all.indexOf(c) + 1];
    const body = { text: c.text, model_id: MODEL,
      previous_text: prev && prev.scene === c.scene ? prev.text : undefined,
      next_text: next && next.scene === c.scene ? next.text : undefined,
      voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: 1.0 } };
    const r = await j(`${API}/text-to-speech/${voice}?output_format=mp3_44100_128`, { method: 'POST', headers: H, body: JSON.stringify(body) });
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
    console.log(`${i + 1}/${pending.length} ${path.basename(file)} ${dur(file).toFixed(1)}s`);
  }
  // timing: cada subtítulo arranca cuando termina el anterior (+ pausa); la escena dura lo que la narración necesite
  const GAP = 0.45, TAIL = 1.4;
  const timing = scenes.map(s => {
    let end = 0; const caps = s.caps.map(c => {
      const file = path.join(outDir, `s${String(c.scene).padStart(2,'0')}_c${c.idx}.mp3`);
      const d = dur(file); const at = +Math.max(c.at, end ? end + GAP : 0.5).toFixed(2); end = at + d;
      return { idx: c.idx, at, dur: +d.toFixed(2), file: path.basename(file) };
    });
    return { scene: s.scene, name: s.name, dur: +Math.max(s.dur, end + TAIL).toFixed(2), caps };
  });
  fs.writeFileSync(path.join(outDir, 'timing.json'), JSON.stringify(timing, null, 1));
  const total = timing.reduce((a, s) => a + s.dur, 0);
  console.log(`timing.json escrito; duración total ${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, '0')}`);
  if (process.env.XI_FAKE) return;
  const sub2 = await (await j(`${API}/user/subscription`, { headers: H })).json();
  console.log(`créditos tras generar: ${sub2.character_count}/${sub2.character_limit} (usados en esta corrida: ${sub2.character_count - sub.character_count})`);
})().catch(e => { console.error('ERROR', e.message); process.exit(1); });
