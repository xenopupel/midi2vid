"""midi2vid command line.

    python -m midi2vid beat.mid --audio beat.mp3 -o beat.mp4
    python -m midi2vid beat.mid --seed 1337 --start 20 --duration 15
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile

from . import synth, timeline

HERE = os.path.dirname(os.path.abspath(__file__))
STYLES = {"ps1": "ps1.frag"}


def seed_from_file(path):
    """Same MIDI file -> same world, unless --seed overrides it."""
    with open(path, "rb") as f:
        return int(hashlib.sha1(f.read()).hexdigest()[:8], 16) % 100000


def main(argv=None):
    ap = argparse.ArgumentParser(prog="midi2vid", description="Turn a MIDI file into a vertical video.")
    ap.add_argument("midi")
    ap.add_argument("-o", "--out", help="output .mp4 (default: <midi name>_<style>_s<seed>.mp4)")
    ap.add_argument("--audio", help="the beat's audio; without it a rough preview synth is used")
    ap.add_argument("--audio-offset", type=float, default=0.0, help="seconds to shift the audio (positive = later)")
    ap.add_argument("--style", default="ps1", choices=sorted(STYLES))
    ap.add_argument("--seed", type=int, help="world seed (default: derived from the MIDI file)")
    ap.add_argument("--start", type=float, default=0.0, help="start time in seconds")
    ap.add_argument("--duration", type=float, help="length in seconds (default: whole song)")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--lines", type=int, default=320, help="internal vertical resolution (PS1 look: 240-360)")
    ap.add_argument("--size", default="1080x1920", help="output size WxH")
    args = ap.parse_args(argv)

    seed = args.seed if args.seed is not None else seed_from_file(args.midi)
    out_w, out_h = (int(v) for v in args.size.lower().split("x"))
    h = args.lines
    w = round(h * out_w / out_h / 2) * 2
    name = os.path.splitext(os.path.basename(args.midi))[0]
    out = args.out or f"{name}_{args.style}_s{seed}.mp4"

    print(f"midi2vid: {args.midi} -> {out}  style={args.style} seed={seed}")
    tl = timeline.build(args.midi, fps=args.fps, start=args.start, duration=args.duration)
    print(f"  {tl['bpm']:.0f} bpm, {len(tl['frames'])} frames, sections: {' '.join(tl['sections'])}")

    with tempfile.TemporaryDirectory() as tmp:
        silent = os.path.join(tmp, "video.mp4")
        job = {
            "shader": os.path.join(HERE, "shaders", STYLES[args.style]),
            "common": os.path.join(HERE, "shaders", "common.glsl"),
            "width": w, "height": h, "outWidth": out_w, "outHeight": out_h,
            "fps": args.fps, "seed": seed, "fields": tl["fields"], "frames": tl["frames"], "out": silent,
        }
        job_path = os.path.join(tmp, "job.json")
        with open(job_path, "w") as f:
            json.dump(job, f)
        subprocess.run(["node", os.path.join(HERE, "render", "render.js"), job_path], check=True)

        audio = args.audio
        if not audio:
            audio = synth.render(args.midi, os.path.join(tmp, "preview.wav"))
            print("  no --audio given, using the preview synth")
        # audio starts at song time 0; trim to the rendered window
        offset = args.start - args.audio_offset
        audio_in = ["-ss", f"{offset:.3f}", "-i", audio] if offset >= 0 else ["-itsoffset", f"{-offset:.3f}", "-i", audio]
        subprocess.run([
            "ffmpeg", "-y", "-loglevel", "error", "-i", silent, *audio_in,
            "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", out,
        ], check=True)
    print(f"  done: {out}")


if __name__ == "__main__":
    sys.exit(main())
