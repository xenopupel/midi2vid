"""midi2vid command line.

    python -m midi2vid beat.mid --audio beat.mp3 -o beat.mp4
    python -m midi2vid beat.mid --seed 1337 --start 0:20 --duration 15
    python -m midi2vid beat.mid --audio beat.mp3 --drop          # 20 s around the first drop

Ctrl+C while rendering stops early and still writes the video rendered so far.
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
PLACES = ["street", "forest", "corridor", "heaven"]


def parse_time(text):
    """'45', '45.5', '0:45' or '1:02:03' -> seconds."""
    try:
        secs = 0.0
        for part in str(text).split(":"):
            secs = secs * 60 + float(part)
        return secs
    except ValueError:
        raise argparse.ArgumentTypeError(f"bad time {text!r}: use seconds (45) or m:ss (0:45)")


def media_duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         capture_output=True, text=True)
    try:
        return float(out.stdout.strip())
    except ValueError:
        return None


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
    ap.add_argument("--place", default="heaven", choices=PLACES, help="where the instrument stands (default: heaven)")
    ap.add_argument("--seed", type=int, help="world seed (default: derived from the MIDI file)")
    ap.add_argument("--start", type=parse_time, default=None, help="start time: seconds or m:ss (default 0)")
    ap.add_argument("--end", type=parse_time, help="end time: seconds or m:ss")
    ap.add_argument("--duration", type=parse_time, help="length: seconds or m:ss (default: to the end of the song)")
    ap.add_argument("--drop", action="store_true",
                    help="cut a clip around the first drop: starts 2 bars before it, 20 s unless --duration/--end")
    ap.add_argument("--lead", help="track name (or part of it) the goth plays; default: picked per 4 bars")
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

    print(f"midi2vid: {args.midi} -> {out}  style={args.style} place={args.place} seed={seed}")
    start, duration = resolve_window(args)
    tl = timeline.build(args.midi, fps=args.fps, start=start, duration=duration, lead=args.lead)
    clip = len(tl["frames"]) / args.fps
    print(f"  {tl['bpm']:.0f} bpm, sections: {' '.join(tl['sections'])}")
    for who, tracks in tl["parts"].items():
        print(f"  {who:6} plays: {', '.join(tracks) or '-'}")
    print(f"  clip {fmt(start)} - {fmt(start + clip)} ({clip:.1f} s, {len(tl['frames'])} frames)")

    with tempfile.TemporaryDirectory() as tmp:
        silent = os.path.join(tmp, "video.mp4")
        job = {
            "shader": os.path.join(HERE, "shaders", STYLES[args.style]),
            "common": os.path.join(HERE, "shaders", "common.glsl"),
            "width": w, "height": h, "outWidth": out_w, "outHeight": out_h,
            "fps": args.fps, "seed": seed, "place": PLACES.index(args.place), "layout": tl["layout"], "frames": tl["frames"], "out": silent,
        }
        job_path = os.path.join(tmp, "job.json")
        with open(job_path, "w") as f:
            json.dump(job, f)
        render = subprocess.Popen(["node", os.path.join(HERE, "render", "render.js"), job_path])
        try:
            code = render.wait()
        except KeyboardInterrupt:  # node got the Ctrl+C too and is finishing the partial video
            code = render.wait()
        if code != 0:
            raise SystemExit(f"renderer failed (exit {code})")
        rendered = media_duration(silent) or clip

        audio = args.audio
        if not audio:
            audio = synth.render(args.midi, os.path.join(tmp, "preview.wav"))
            print("  no --audio given, using the preview synth")
        # audio starts at song time 0; trim to the rendered window
        offset = start - args.audio_offset
        audio_in = ["-ss", f"{offset:.3f}", "-i", audio] if offset >= 0 else ["-itsoffset", f"{-offset:.3f}", "-i", audio]
        subprocess.run([
            "ffmpeg", "-y", "-loglevel", "error", "-i", silent, *audio_in,
            "-map", "0:v", "-map", "1:a", "-c:v", "copy",
            "-af", f"afade=t=in:d=0.05,afade=t=out:st={max(0.0, rendered - 0.4):.3f}:d=0.4",
            "-c:a", "aac", "-b:a", "192k", "-t", f"{rendered:.3f}", out,
        ], check=True)
    print(f"  done: {out} ({rendered:.1f} s)")


def fmt(secs):
    return f"{int(secs // 60)}:{secs % 60:04.1f}"


def resolve_window(args):
    """Turn --start/--end/--duration/--drop into (start, duration or None)."""
    start = args.start
    if args.drop:
        info = timeline.build(args.midi, fps=1, duration=0)
        if info["drop_start"] is None:
            print("  no drop found, starting at 0")
            start = 0.0 if start is None else start
        elif start is None:
            start = max(0.0, info["drop_start"] - 2 * info["bar_len"])
    start = start or 0.0
    duration = args.duration
    if args.end is not None:
        if args.end <= start:
            raise SystemExit(f"--end ({fmt(args.end)}) must be after the start ({fmt(start)})")
        duration = args.end - start if duration is None else min(duration, args.end - start)
    if duration is None and args.drop:
        duration = 20.0
    return start, duration


if __name__ == "__main__":
    sys.exit(main())
