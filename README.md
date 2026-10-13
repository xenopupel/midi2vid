# midi2vid

Turns a MIDI file (plus the beat's audio) into a vertical 1080×1920 video for Reels / TikTok / Shorts.

The first style is **ps1**: a low-poly PS1-look world. By default the instrument floats on a cloud in the sky
(`--place heaven`); `street`, `forest` and `corridor` are the foggy Silent Hill places.
A seed builds the world, the MIDI animates it.

## Quick start

```
pip install -r requirements.txt
npm install                     # playwright, used for headless WebGL rendering
python -m midi2vid beat.mid --audio beat.mp3 -o beat.mp4
```

Press Ctrl+C while rendering to stop early: the video is still written with the frames rendered so far.

Without `--audio` a rough preview synth is rendered from the MIDI so you can still hear the sync.
Try it on the bundled demo beat:

```
python examples/make_demo_midi.py          # writes examples/demo.mid
python -m midi2vid examples/demo.mid --seed 3
```

Useful flags:

| flag | what it does |
| --- | --- |
| `--place heaven` | where the instrument stands: `heaven` (default), `street`, `forest`, `corridor` |
| `--seed N` | world seed; by default it is derived from the MIDI file, so the same beat always gets the same world |
| `--start 0:45 --duration 20` | render only a window of the song; times are seconds or m:ss |
| `--end 1:05` | end of the window instead of (or together with) `--duration` |
| `--drop` | clip around the first drop: starts 2 bars before it, 20 s unless `--duration`/`--end` is given |
| `--audio-offset S` | shift the audio if the MIDI and the bounce are not aligned |
| `--lines N` | internal vertical resolution, 240-360 looks like PS1 (default 320) |
| `--fps N` | frame rate (default 30) |

## What the seed picks

- instrument: grand piano, upright piano, cheap keyboard on an X-stand
- heaven: sky palette (noon, sunset, pink dawn, white overcast), sun position, cloud islands
- other places: fog colour and time of day (grey, blue dusk, sick green, pitch black with a flashlight)
- weather: none, snow (drifting feathers in heaven), rain
- camera framings for every shot
- rare events: a silhouette standing in the fog

## Performers

- **The goth** sits at the instrument and plays the lead with both hands (2-bone arms reaching for the right keys, the head nods on the kick).
  The lead is picked per 4 bars: long, high notes win over fast arps and low pads, so it is the chords in the intro and the melody in the drop.
  Force a track with `--lead "Serum 2 #4"` (any part of the track name).
- **A crow** hops onto the keys for the second melodic part, **a toad** jumps on the 808, **a beetle** scuttles along a third part when there is one.
- Creatures only appear while their part plays and skip notes too fast to reach, and only keys someone actually presses light up, so the keyboard stays readable.

## How the MIDI drives the picture

| MIDI | on screen |
| --- | --- |
| notes played by the goth or a creature | keys light up red, folded onto 24 keys |
| kick (or the 808 if there is no kick) | the sun swells (heaven); lamps and ceiling panels buzz and cut out (other places) |
| snare / clap | the frame drops resolution, rows tear, colour depth collapses |
| hats / cymbals | faint brightness noise |
| 808 / bass | fog breathes, camera shakes |
| bar before the first drop | light pulses and strobes |
| drop (drums and 808 playing) | the sun gets brighter and warmer |
| break (no drums after the drop) | the sky turns to dusk, every light dies except one bulb over the instrument, the figure appears |

Note roles come from track names first (FL Studio exports one track per channel, named after it):
`kick`, `snare`/`clap`/`rim`, `hat`/`OH`/`ride`/`crash`, `perc`/`tom`, `808`/`bass`/`sub`.
Unnamed tracks fall back to General MIDI drums on channel 10 and pitch (B2 and below = bass).
With no kick track the 808 notes drive the kick.
The drop is where drums and 808 play; before it is the intro, gaps after it are breaks.
A new camera shot starts every 4 bars and on every section change.

## Layout

- `midi2vid/timeline.py`: MIDI → per-frame values (envelopes, sections, shots, key intensities)
- `midi2vid/performers.py`: picks the parts and animates the goth's hands and the creatures' hops
- `midi2vid/shaders/`: GLSL styles (`common.glsl` declares the uniforms)
- `midi2vid/render/render.js`: renders frames in headless Chromium (SwiftShader, no GPU needed) and pipes them into ffmpeg
- `midi2vid/synth.py`: preview synth used when no audio is given
- `prototype/`: still-frame style explorations
