# midi2vid

Turns a MIDI file (plus the beat's audio) into a vertical 1080×1920 video for Reels / TikTok / Shorts.

The first style is **ps1**: a PS1 / Silent Hill world with an instrument standing in the fog.
A seed builds the world, the MIDI animates it.

## Quick start

```
pip install -r requirements.txt
npm install                     # playwright, used for headless WebGL rendering
python -m midi2vid beat.mid --audio beat.mp3 -o beat.mp4
```

Without `--audio` a rough preview synth is rendered from the MIDI so you can still hear the sync.
Try it on the bundled demo beat:

```
python examples/make_demo_midi.py          # writes examples/demo.mid
python -m midi2vid examples/demo.mid --seed 3
```

Useful flags:

| flag | what it does |
| --- | --- |
| `--seed N` | world seed; by default it is derived from the MIDI file, so the same beat always gets the same world |
| `--start S --duration D` | render only a window of the song (seconds) |
| `--audio-offset S` | shift the audio if the MIDI and the bounce are not aligned |
| `--lines N` | internal vertical resolution, 240-360 looks like PS1 (default 320) |
| `--fps N` | frame rate (default 30) |

## What the seed picks

- location: foggy street, forest, school/hospital corridor, Otherworld
- instrument: grand piano, upright piano, cheap keyboard on an X-stand
- fog colour and time of day (grey, blue dusk, sick green, pitch black with a flashlight)
- weather: none, snow/ash, rain
- camera framings for every shot
- rare events: a silhouette standing in the fog

## How the MIDI drives the picture

| MIDI | on screen |
| --- | --- |
| melodic notes (above B2) | keys light up red, folded onto 24 keys |
| kick (GM 35/36, or the 808 if there is no drum track) | lamps and ceiling panels buzz and cut out |
| snare / clap (GM 37-40) | the frame drops resolution, rows tear, colour depth collapses |
| hats / cymbals | faint brightness noise |
| 808 / bass (B2 and below) | fog breathes, camera shakes |
| bar before the first drop | siren pulse and strobe |
| drop (dense bars) | the world turns into the Otherworld: rust, grated floor, red fog, ash |
| break (sparse bars after the drop) | every light dies except one bulb over the instrument, the figure appears |

Sections are detected from note density per bar. Drums are read from MIDI channel 10.
A new camera shot starts every 4 bars and on every section change.

## Layout

- `midi2vid/timeline.py`: MIDI → per-frame values (envelopes, sections, shots, key intensities)
- `midi2vid/shaders/`: GLSL styles (`common.glsl` declares the uniforms)
- `midi2vid/render/render.js`: renders frames in headless Chromium (SwiftShader, no GPU needed) and pipes them into ffmpeg
- `midi2vid/synth.py`: preview synth used when no audio is given
- `prototype/`: still-frame style explorations
