#!/usr/bin/env python3
"""Create the MP3 files for every day folder from its audio.json (free neural German voices via edge-tts + ffmpeg).

Usage (PowerShell):  python gen_audio.py docs
Safe to re-run: MP3s that already exist are skipped. Use --force to rebuild.
Optional: --only=D02,D03 builds just folders whose names start with those prefixes.
Needs: pip install edge-tts ; ffmpeg on PATH.
"""
import asyncio, json, os, subprocess, sys, tempfile, shutil

import edge_tts

FORCE = "--force" in sys.argv
ONLY = [a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--only=")]
ONLY = [x for x in ",".join(ONLY).split(",") if x]
FILES = [x for a in sys.argv[1:] if a.startswith("--files=") for x in a.split("=", 1)[1].split(",") if x]
args = [a for a in sys.argv[1:] if not a.startswith("--")]
ROOT = args[0] if args else os.path.dirname(os.path.abspath(__file__))


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


async def synth(text, voice, rate, out, tries=4):
    last = None
    for k in range(tries):
        try:
            await edge_tts.Communicate(text, voice, rate=rate).save(out)
            if os.path.getsize(out) > 500:
                return
        except Exception as e:  # network hiccup -> retry
            last = e
            await asyncio.sleep(1.5 * (k + 1))
    raise RuntimeError(f"TTS failed for: {text[:40]!r} ({last})")


def silence(seconds, path):
    run(["ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", f"{seconds}", "-c:a", "libmp3lame", "-b:a", "48k", path])


async def build_file(segs, target):
    tmp = tempfile.mkdtemp(prefix="dtz_")
    try:
        parts = []
        sil_cache = {}
        cache = {}
        for i, s in enumerate(segs):
            f = os.path.join(tmp, f"s{i:04d}.mp3")
            if s["t"]:
                key = (s["t"], s["v"], s.get("r", "+0%"))
                if key in cache:
                    parts.append(cache[key])
                else:
                    await synth(s["t"], s["v"], s.get("r", "+0%"), f)
                    cache[key] = f
                    parts.append(f)
            p = round(float(s.get("p", 0.6)), 1)
            if p > 0:
                if p not in sil_cache:
                    sf = os.path.join(tmp, f"sil_{p}.mp3")
                    silence(p, sf)
                    sil_cache[p] = sf
                parts.append(sil_cache[p])
        lst = os.path.join(tmp, "list.txt")
        with open(lst, "w", encoding="utf-8") as fh:
            for p in parts:
                fh.write("file '" + p.replace("\\", "/").replace("'", "'\\''") + "'\n")
        run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-ar", "24000", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "56k", target])
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


async def main():
    total = 0
    for name in sorted(os.listdir(ROOT)):
        folder = os.path.join(ROOT, name)
        manifest = os.path.join(folder, "audio.json")
        if not os.path.isfile(manifest):
            continue
        if ONLY and not any(name.startswith(p) for p in ONLY):
            continue
        with open(manifest, encoding="utf-8") as fh:
            audio = json.load(fh)
        for fname, segs in audio.items():
            if FILES and fname not in FILES:
                continue
            target = os.path.join(folder, fname)
            if os.path.exists(target) and not FORCE:
                continue
            print("making", name, fname, f"({len(segs)} segments)", flush=True)
            await build_file(segs, target)
            total += 1
    print("done, files created:", total)


asyncio.run(main())
