"""Reescribe data-at / data-dur del video según timing.json y mezcla la narración en un solo mp3.
Uso: python3 retime.py <video.html> <audiodir> <narration.mp3>"""
import json, re, sys, subprocess, os
html_path, adir, out_mp3 = sys.argv[1:4]
timing = json.load(open(os.path.join(adir, 'timing.json')))
s = open(html_path, encoding='utf-8').read()
secs = list(re.finditer(r'<section class="scene" data-dur="([\d.]+)" data-name="([^"]*)">([\s\S]*?)</section>', s))
assert len(secs) == len(timing), (len(secs), len(timing))
out = []; pos = 0; inputs = []; delays = []; t0 = 0.0
for m, sc in zip(secs, timing):
    body = m.group(3); caps = sc['caps']; k = iter(caps)
    def sub(mm):
        c = next(k); inputs.append(os.path.join(adir, c['file'])); delays.append(int(round((t0 + c['at']) * 1000)))
        return f'<p data-at="{c["at"]}">'
    body = re.sub(r'<p data-at="[\d.]+">', sub, body)
    out.append(s[pos:m.start()]); out.append(f'<section class="scene" data-dur="{sc["dur"]}" data-name="{m.group(2)}">{body}</section>'); pos = m.end()
    t0 += sc['dur']
out.append(s[pos:]); open(html_path, 'w', encoding='utf-8').write(''.join(out))
print('html retimed; total', round(t0, 1), 's')
# mezcla: cada clip con su retraso, normalización ligera, cola de silencio hasta el final
fc = ''.join(f'[{i}:a]adelay={d}|{d}[a{i}];' for i, d in enumerate(delays)) + ''.join(f'[a{i}]' for i in range(len(delays))) + f'amix=inputs={len(delays)}:normalize=0[mix];[mix]apad=whole_dur={t0:.2f}[out]'
cmd = ['ffmpeg', '-y', '-v', 'error'] + sum([['-i', f] for f in inputs], []) + ['-filter_complex', fc, '-map', '[out]', '-ac', '1', '-b:a', '96k', out_mp3]
subprocess.run(cmd, check=True); print('narración mezclada:', out_mp3)
