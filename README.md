# DTZ B1 Prep

Daily full mock **Deutsch-Test für Zuwanderer (DTZ) B1** – one mock per day, exam on 10 Dec 2026.

**Live page:** https://lnmk970.github.io/German_Exam_Prep/

GitHub Pages: branch `main`, source folder `/docs`.

Layout: `docs/index.html` (hub), `docs/dtz/b1/mock-test-01-day-01/`, ... and `docs/telc/b1/mock-test-01/` ...; DTZ: `docs/dtz/b1/mock-test-01-day-01/`, `docs/dtz/b1/mock-test-02-day-02/`, ... (Hören, Lesen, Schreiben, Sprechen, Ergebnis).

Rebuild: `python build.py` then `python gen_audio.py docs` (needs `pip install edge-tts` and ffmpeg).
