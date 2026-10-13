"""Write a small dark trap demo beat to examples/demo.mid (140 BPM, 12 bars).

Bars 1-4 intro (piano only), 5-10 drop (drums + 808), 11-12 break (sparse piano).
"""
import random
import sys

import mido

BPM, TPB = 140, 480
BEAT = TPB
random.seed(4)

mid = mido.MidiFile(ticks_per_beat=TPB)
events = []  # (tick, msg)


def note(ch, pitch, start_beats, len_beats, vel):
    s = int(start_beats * BEAT)
    e = s + max(1, int(len_beats * BEAT))
    events.append((s, mido.Message("note_on", channel=ch, note=pitch, velocity=vel)))
    events.append((e, mido.Message("note_off", channel=ch, note=pitch, velocity=0)))


# C minor-ish progression: Cm - Ab - Eb - G
chords = [[60, 63, 67], [56, 60, 63], [63, 67, 70], [55, 59, 62]]
roots = [36, 32, 39, 31]
melody = [72, 75, 74, 72, 70, 67, 68, 67]

for bar in range(12):
    b0 = bar * 4
    chord, root = chords[bar % 4], roots[bar % 4]
    drop = 4 <= bar < 10
    brk = bar >= 10
    # piano arpeggio in 8ths
    for i in range(8):
        if brk and i % 4:
            continue
        p = chord[i % 3] + (12 if i % 4 == 3 else 0)
        note(0, p, b0 + i * 0.5, 0.45, 70 + random.randint(0, 25))
    # melody line on top
    if not brk:
        for i, p in enumerate(melody[(bar % 2) * 4:(bar % 2) * 4 + 4]):
            note(0, p, b0 + i, 0.9, 95)
    if drop:
        # 808
        note(1, root, b0, 2.5, 115)
        note(1, root, b0 + 2.75, 1.0, 105)
        # kick / snare / hats
        for k in (0, 1.75, 2.5):
            note(9, 36, b0 + k, 0.2, 120)
        note(9, 38, b0 + 2, 0.2, 120)
        for i in range(8):
            note(9, 42, b0 + i * 0.5, 0.1, 80)
        if bar % 2 == 1:  # hat roll
            for i in range(6):
                note(9, 42, b0 + 3 + i / 6, 0.05, 70)

events.sort(key=lambda e: (e[0], e[1].type == "note_on"))
track = mido.MidiTrack()
track.append(mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(BPM)))
last = 0
for tick, msg in events:
    track.append(msg.copy(time=tick - last))
    last = tick
mid.tracks.append(track)
out = sys.argv[1] if len(sys.argv) > 1 else "examples/demo.mid"
mid.save(out)
print("wrote", out)
