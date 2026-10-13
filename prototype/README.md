# midi2vid style prototypes

Still-frame style tests rendered with GLSL fragment shaders in headless Chromium (SwiftShader, no GPU needed).

```
S=8 node render.js shaders/ps1w.frag out.png 1080 1920 <time> <seed>
```

- `S` is the strip height in rows; lower it for heavy shaders so SwiftShader does not drop the context.
- `ps1w.frag` is the PS1 world generator: the seed picks location (street, forest, corridor, otherworld), instrument (grand, upright, keyboard on stand), fog palette, weather, camera and rare events (a silhouette in the fog).
- The other shaders are earlier style explorations (gothic organ, industrial presses, mercury, ferrofluid, monoliths, ink, jelly).
