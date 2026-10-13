"""Turn a MIDI file into per-frame animation values for the shader.

Every frame gets a flat row of floats (see FRAME_FIELDS + 24 key intensities):
envelopes for kick/snare/hat/808, smooth section states (drop, break, riser)
and the current camera shot.
"""
from dataclasses import dataclass
import math
import re

import mido

NUM_KEYS = 24
FRAME_FIELDS = ["t", "kick", "snare", "hat", "bass", "drop", "brk", "riser", "shot", "shotT"]

DRUM_CHANNEL = 9
KICKS = {35, 36}
SNARES = {37, 38, 39, 40}
HATS = {42, 44, 46, 49, 51, 52, 53, 55, 57, 59}
BASS_MAX_PITCH = 47  # unnamed melodic notes at or below B2 count as 808 / bass
DRUMS = ("kick", "snare", "hat", "perc")

# Track-name keywords, checked in this order (FL Studio exports one track per channel,
# named after the channel, with drums on arbitrary MIDI channels).
ROLE_WORDS = [
    ("kick", re.compile(r"kick|kik|\bbd\b")),
    ("snare", re.compile(r"snare|clap|\bsd\b|\bcp\b|rim")),
    ("hat", re.compile(r"hat|\bhh\b|\boh\b|\bch\b|ride|cym|crash|shaker")),
    ("perc", re.compile(r"perc|tom|conga|bongo|tamb")),
    ("bass", re.compile(r"808|bass|\bsub\b")),
]


@dataclass
class Note:
    start: float
    end: float
    pitch: int
    velocity: int
    channel: int
    role: str  # kick / snare / hat / perc / bass / keys


def track_role(name):
    name = (name or "").lower()
    for role, rx in ROLE_WORDS:
        if rx.search(name):
            return role
    return None


def note_role(track, channel, pitch, low_is_bass=True):
    if track:
        return track
    if channel == DRUM_CHANNEL:
        return "kick" if pitch in KICKS else "snare" if pitch in SNARES else "hat" if pitch in HATS else "perc"
    return "bass" if low_is_bass and pitch <= BASS_MAX_PITCH else "keys"


def read_notes(path):
    """Return (notes, bpm) with note times in seconds and a role for every note."""
    mid = mido.MidiFile(path)
    tpb = mid.ticks_per_beat
    # tempo map from all tracks: [(tick, seconds at tick, tempo)]
    changes = sorted((tick, msg.tempo) for tick, msg in _abs(mid) if msg.type == "set_tempo")
    tempo_map, sec, last_tick, tempo = [(0, 0.0, 500000)], 0.0, 0, 500000
    for tick, new in changes:
        sec += mido.tick2second(tick - last_tick, tpb, tempo)
        last_tick, tempo = tick, new
        tempo_map.append((tick, sec, tempo))

    def to_sec(tick):
        for t0, s0, tp in reversed(tempo_map):
            if tick >= t0:
                return s0 + mido.tick2second(tick - t0, tpb, tp)
        return 0.0

    # if some track is named as bass/808, other tracks are not split by pitch
    low_is_bass = not any(track_role(t.name) == "bass" and any(m.type == "note_on" for m in t) for t in mid.tracks)
    notes = []
    for track in mid.tracks:
        role = track_role(track.name)
        open_notes, tick = {}, 0
        for msg in track:
            tick += msg.time
            if msg.type == "note_on" and msg.velocity > 0:
                open_notes.setdefault((msg.channel, msg.note), []).append((tick, msg.velocity))
            elif msg.type in ("note_off", "note_on"):
                stack = open_notes.get((msg.channel, msg.note))
                if stack:
                    st, vel = stack.pop(0)
                    s = to_sec(st)
                    notes.append(Note(s, max(to_sec(tick), s + 0.05), msg.note, vel, msg.channel,
                                      note_role(role, msg.channel, msg.note, low_is_bass)))
        for (ch, pitch), stack in open_notes.items():
            for st, vel in stack:
                s = to_sec(st)
                notes.append(Note(s, s + 0.5, pitch, vel, ch, note_role(role, ch, pitch, low_is_bass)))
    notes.sort(key=lambda n: n.start)
    bpm = mido.tempo2bpm(changes[0][1]) if changes else 120.0
    return notes, bpm


def _abs(mid):
    for track in mid.tracks:
        tick = 0
        for msg in track:
            tick += msg.time
            yield tick, msg


def _split(notes):
    kicks = [n.start for n in notes if n.role == "kick"]
    snares = [n.start for n in notes if n.role == "snare"]
    hats = [n.start for n in notes if n.role in ("hat", "perc")]
    bass = [n for n in notes if n.role == "bass"]
    keys = [n for n in notes if n.role == "keys"] or bass
    if not kicks and bass:  # no kick notes: let the 808 drive the kick (they usually line up in trap)
        kicks = sorted({round(n.start, 3) for n in bass})
    return kicks, snares, hats, bass, keys


def _sections(notes, bar_len, n_bars):
    """Label each bar intro / drop / break.

    The drop is where the drums and the 808 play. Without any drums or bass in the
    file, fall back to overall note density.
    """
    beat = [n for n in notes if n.role in DRUMS or n.role == "bass"]
    source, weight = (beat, 1.0) if beat else (notes, 1.0)
    energy = [0.0] * n_bars
    for n in source:
        b = int(n.start / bar_len)
        if 0 <= b < n_bars:
            energy[b] += weight
    peak = max(energy) or 1.0
    hot = [e >= (0.25 if beat else 0.6) * peak for e in energy]
    # fill one-bar holes so the Otherworld does not flicker on and off
    for b in range(1, n_bars - 1):
        if not hot[b] and hot[b - 1] and hot[b + 1]:
            hot[b] = True
    labels, dropped = [], False
    for b in range(n_bars):
        if hot[b]:
            labels.append("drop")
            dropped = True
        else:
            labels.append("break" if dropped else "intro")
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
    return {
        "fps": fps, "bpm": bpm, "bar_len": bar_len, "song_end": song_end,
        "drop_start": None if first_drop is None else first_drop * bar_len,
        "sections": labels, "fields": FRAME_FIELDS, "frames": frames,
    }
