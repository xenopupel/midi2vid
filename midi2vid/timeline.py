"""Turn a MIDI file into per-frame animation values for the shader.

Every frame gets a flat row of floats (see FRAME_FIELDS + 24 key intensities):
envelopes for kick/snare/hat/808, smooth section states (drop, break, riser)
and the current camera shot.
"""
from dataclasses import dataclass
import math

import mido

NUM_KEYS = 24
FRAME_FIELDS = ["t", "kick", "snare", "hat", "bass", "drop", "brk", "riser", "shot", "shotT"]

DRUM_CHANNEL = 9
KICKS = {35, 36}
SNARES = {37, 38, 39, 40}
HATS = {42, 44, 46, 49, 51, 52, 53, 55, 57, 59}
BASS_MAX_PITCH = 47  # melodic notes at or below B2 count as 808 / bass


@dataclass
class Note:
    start: float
    end: float
    pitch: int
    velocity: int
    channel: int


def read_notes(path):
    """Return (notes, bpm) with note times in seconds."""
    mid = mido.MidiFile(path)
    notes, open_notes = [], {}
    bpm = None
    t = 0.0
    for msg in mid:  # merged tracks, msg.time is a delta in seconds
        t += msg.time
        if msg.type == "set_tempo" and bpm is None:
            bpm = mido.tempo2bpm(msg.tempo)
        if msg.type == "note_on" and msg.velocity > 0:
            open_notes.setdefault((msg.channel, msg.note), []).append((t, msg.velocity))
        elif msg.type in ("note_off", "note_on"):
            stack = open_notes.get((msg.channel, msg.note))
            if stack:
                start, vel = stack.pop(0)
                notes.append(Note(start, max(t, start + 0.05), msg.note, vel, msg.channel))
    for (ch, pitch), stack in open_notes.items():
        for start, vel in stack:
            notes.append(Note(start, start + 0.5, pitch, vel, ch))
    notes.sort(key=lambda n: n.start)
    return notes, bpm or 120.0


def _split(notes):
    drums = [n for n in notes if n.channel == DRUM_CHANNEL]
    melodic = [n for n in notes if n.channel != DRUM_CHANNEL]
    kicks = [n.start for n in drums if n.pitch in KICKS]
    snares = [n.start for n in drums if n.pitch in SNARES]
    hats = [n.start for n in drums if n.pitch in HATS]
    bass = [n for n in melodic if n.pitch <= BASS_MAX_PITCH]
    keys = [n for n in melodic if n.pitch > BASS_MAX_PITCH] or melodic
    if not kicks and bass:  # no drum track: let the 808 drive the kick too
        kicks = [n.start for n in bass]
    return kicks, snares, hats, bass, keys


def _sections(notes, bar_len, n_bars):
    """Label each bar as intro / drop / break from note density."""
    energy = [0.0] * n_bars
    for n in notes:
        b = int(n.start / bar_len)
        if 0 <= b < n_bars:
            energy[b] += 2.0 if n.channel == DRUM_CHANNEL else 1.0
    peak = max(energy) or 1.0
    labels, dropped = [], False
    for e in energy:
        if e >= 0.6 * peak or (dropped and e >= 0.45 * peak):
            labels.append("drop")
            dropped = True
        elif dropped and e < 0.35 * peak:
            labels.append("break")
        else:
            labels.append("calm" if dropped else "intro")
    return labels


def _env(times, t, decay):
    """Exponential envelope from the most recent hit before t (times sorted)."""
    lo, hi = 0, len(times)
    while lo < hi:
        mid = (lo + hi) // 2
        if times[mid] <= t:
            lo = mid + 1
        else:
            hi = mid
    if lo == 0:
        return 0.0
    return math.exp(-(t - times[lo - 1]) / decay)


def build(path, fps=30, start=0.0, duration=None, tail=1.5):
    notes, bpm = read_notes(path)
    if not notes:
        raise SystemExit(f"{path}: no notes found")
    kicks, snares, hats, bass, keys = _split(notes)
    bar_len = 4 * 60.0 / bpm
    song_end = max(n.end for n in notes) + tail
    n_bars = int(math.ceil(song_end / bar_len)) + 1
    labels = _sections(notes, bar_len, n_bars)

    # fold the melodic range onto 24 keys, starting at the C below the lowest note
    base = 12 * (min(n.pitch for n in keys) // 12)

    # camera shots: new shot every 4 bars and whenever the section changes
    shot_starts = []
    for b in range(n_bars):
        if b % 4 == 0 or (b > 0 and labels[b] != labels[b - 1]):
            shot_starts.append(b * bar_len)
    first_drop = next((b for b, l in enumerate(labels) if l == "drop"), None)

    end = song_end if duration is None else min(song_end, start + duration)
    frames = []
    dt = 1.0 / fps
    t = start
    first_label = labels[min(int(start / bar_len), n_bars - 1)]
    drop = 1.0 if first_label == "drop" else 0.0
    brk = 1.0 if first_label == "break" else 0.0
    while t < end:
        bar = int(t / bar_len)
        label = labels[min(bar, n_bars - 1)]
        drop += ((1.0 if label == "drop" else 0.0) - drop) * min(1.0, dt / 0.12)
        brk += ((1.0 if label == "break" else 0.0) - brk) * min(1.0, dt / 0.25)
        riser = 0.0
        if first_drop is not None and bar == first_drop - 1:
            riser = (t - bar * bar_len) / bar_len
        shot_idx = max(i for i, s in enumerate(shot_starts) if s <= t + 1e-6)
        shot_t = t - shot_starts[shot_idx]

        key_vals = [0.0] * NUM_KEYS
        for n in keys:
            if n.start > t:
                break
            if t - n.end > 0.6:
                continue
            k = (n.pitch - base) % NUM_KEYS
            vel = n.velocity / 127.0
            v = vel * (0.75 + 0.25 * math.exp(-(t - n.start) / 0.15)) if t <= n.end else vel * math.exp(-(t - n.end) / 0.12)
            key_vals[k] = max(key_vals[k], v)

        bass_env = 0.0
        for n in bass:
            if n.start > t:
                break
            if n.start <= t <= n.end + 0.3:
                bass_env = max(bass_env, n.velocity / 127.0 * math.exp(-(t - n.start) / 0.6))

        frames.append([
            round(t, 4),
            round(_env(kicks, t, 0.11), 4),
            round(_env(snares, t, 0.09), 4),
            round(_env(hats, t, 0.05), 4),
            round(bass_env, 4),
            round(drop, 4), round(brk, 4), round(riser, 4),
            shot_idx, round(shot_t, 3),
            *[round(v, 3) for v in key_vals],
        ])
        t += dt
    return {"fps": fps, "bpm": bpm, "sections": labels, "fields": FRAME_FIELDS, "frames": frames}
