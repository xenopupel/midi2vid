"""Very small MIDI synth so a video can be previewed without the real beat audio."""
import wave

import numpy as np

from .timeline import read_notes, DRUM_CHANNEL, KICKS, SNARES, HATS, BASS_MAX_PITCH

SR = 44100


def _hz(p):
    return 440.0 * 2 ** ((p - 69) / 12)


def render(midi_path, wav_path, tail=1.5):
    notes, _ = read_notes(midi_path)
    length = max(n.end for n in notes) + tail
    out = np.zeros(int(length * SR) + SR)
    rng = np.random.default_rng(0)
    for n in notes:
        s = int(n.start * SR)
        vel = n.velocity / 127.0
        if n.channel == DRUM_CHANNEL:
            if n.pitch in KICKS:
                t = np.arange(int(0.35 * SR)) / SR
                f = 45 + 120 * np.exp(-t * 30)
                sig = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
            elif n.pitch in SNARES:
                t = np.arange(int(0.25 * SR)) / SR
                sig = (rng.standard_normal(len(t)) * 0.6 + np.sin(2 * np.pi * 190 * t)) * np.exp(-t * 18)
            elif n.pitch in HATS:
                t = np.arange(int(0.06 * SR)) / SR
                noise = rng.standard_normal(len(t))
                sig = np.diff(noise, prepend=0) * 0.35 * np.exp(-t * 60)
            else:
                continue
        elif n.pitch <= BASS_MAX_PITCH:  # 808
            dur = n.end - n.start + 0.3
            t = np.arange(int(dur * SR)) / SR
            f = _hz(n.pitch) * (1 + 0.6 * np.exp(-t * 25))
            sig = np.tanh(2.2 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t * 1.2) * 0.8
        else:  # dark bell-ish piano
            dur = n.end - n.start + 1.2
            t = np.arange(int(dur * SR)) / SR
            f = _hz(n.pitch)
            sig = sum(a * np.sin(2 * np.pi * f * h * t) for h, a in ((1, 1), (2, .4), (3, .15), (4.2, .08)))
            sig *= np.exp(-t * 2.5) * 0.35
        out[s:s + len(sig)] += sig * vel
    out /= max(1e-6, np.abs(out).max()) / 0.9
    pcm = (out * 32767).astype(np.int16)
    with wave.open(wav_path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return wav_path
