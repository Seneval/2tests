# Herramientas del video "Computer Science 2026"

1. `XI_KEY=<api key> node narrate.js ../cs-career.html ../../../.narration 1 5` genera un mp3 por subtítulo con ElevenLabs
   (con caché, tope de gasto en USD y verificación de créditos antes de gastar) y escribe `timing.json`.
2. `python3 retime.py ../cs-career.html ../../../.narration ../cs-career-narration.mp3` ajusta los tiempos del video a la narración y mezcla el audio.
3. `node ../render-cs-career.js full ../cs-career.html ../cs-career.mp4` renderiza los cuadros (Chromium + ffmpeg); el script muxea `cs-career-narration.mp3` si existe junto al HTML.

Nunca guardes la API key en el repo.
