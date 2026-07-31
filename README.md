# Math Symphony

**Translate music into the language of mathematics.**

![Math Symphony demo — a beat-triggered shockwave burst reshaping the particle field in real time](docs/demo.gif)

Math Symphony is not a music visualizer in the usual sense. Typical visualizers map audio loudness directly onto a bar height or a color — a shortcut that produces something reactive but not *meaningful*. This project inserts a real translation layer in between: every visual you see is the output of an explicit, documented, unit-tested mathematical function of an explicit, named musical property. Pitch becomes orbit radius on a golden spiral. Chord quality becomes the symmetry of a rose curve. A beat becomes the impulse response of a critically-damped spring. Nothing on screen is arbitrary, and nothing is `Math.random()`.

```
Audio (file or microphone)
  → Feature Extraction        (pitch, chroma, chord, tempo, spectral centroid, MFCC, …)
  → Math Translation Engine   (feature → orbit radius, angular velocity, topology, color…)
  → Particle Physics (GPU)    (springs, curl-noise fields, strange attractors)
  → Render                    (bloom, depth of field, ACES tone mapping)
```

---

## Why this exists

Music already *is* mathematics — ratios of frequencies, periodic waveforms, harmonic series, symmetry groups of chord shapes. Most visualizers hide that and replace it with generic eye candy. This project's intention is the opposite: make the mathematical structure that was always latently present in the music *visible*, so that watching it feels less like "reacting to a song" and more like "watching the song's own shape." It's a portfolio piece built to demonstrate that a creative-coding project can be simultaneously rigorous (real signal processing, real unit-tested algorithms) and expressive (calm, elegant, premium visual design) — the two are not in tension.

## Why these specific functions

Every feature in this repo was chosen because it maps a *specific, named* musical property to a *specific, explainable* visual property — never a generic "make it move when loud":

| Music property | How it's extracted | What it drives |
|---|---|---|
| Pitch | Autocorrelation-based YIN pitch detection | Orbit radius, layer height, octave-independent spiral phase |
| Chord (root + quality) | 12-bin chroma → template correlation matching, whole-track offline pass | Rose-curve/attractor topology (major = symmetric, minor = organic, diminished = broken, augmented = expanding), the right-side chord chart |
| Beat / onset | Metronome-grid phase tracking (offline tempo estimate) + adaptive spectral-flux onset detection | A literal expanding shockwave ring — an impulse that decays like a struck bell, not a scripted animation |
| Timbre (MFCC) | Mel-frequency cepstral coefficients | Particle shape roughness, noise amount, sprite edge softness |
| Spectral centroid | FFT magnitude spectrum centroid | Color temperature, on a blue → green → gold → white ramp |
| Volume / RMS energy | Time-domain peak + RMS | Particle size, brightness, opacity |
| Stereo balance | L/R channel RMS | World offset |
| Tempo + energy + chord quality | A rule-based placement on Russell's circumplex model of affect (arousal × valence) — deliberately *not* a black-box ML model, so the mapping stays auditable | Fog density, bloom intensity, light intensity, camera speed ("emotion mode") |

Four interchangeable mathematical systems generate the particle field's base structure — Lissajous/rose curves in polar coordinates, a golden-spiral (Vogel/phyllotaxis) arrangement, a curl-noise flow field, and a family of strange attractors (Lorenz, Thomas, Aizawa) — and can be blended (the curl-noise field is always available as an additive perturbation on top of any of the others). All four are documented, and the architecture (`MathSystem` interface) is designed so more can be added without touching anything else.

## Why this is good human-technology interaction

- **Legibility over magic.** A live readout (pitch, chord, tempo, topology) and the chord chart are always visible during playback — the system shows its work instead of being an opaque black box. If you can name the input, you can predict the output.
- **Calm technology.** The visual language is dark, soft-lit, low-saturation, and deliberately avoids the "EDM visualizer" aesthetic (rainbow bars, strobing, cyberpunk glow). It's designed to be watched for minutes without fatigue, the way a lava lamp or an aquarium is.
- **Never truly static, never demanding attention.** The camera auto-orbits and "breathes" (a slow FOV oscillation) even at idle, so the piece always feels alive — but it yields immediately to user input (dragging pauses auto-rotation, resuming only after a few seconds of inactivity) rather than fighting for control.
- **Honesty in empty states.** When the system genuinely can't detect a confident chord (silence, noise, an unfamiliar chord shape), it says so — *"No confident chords detected yet"* — rather than fabricating a plausible-looking answer. Trustworthy systems admit uncertainty.
- **Two natural entry points, no learning curve.** Upload a file, or hit one button to let the app listen through the microphone to whatever's playing nearby (a phone, a speaker, a piano in the room) — matching how people actually encounter music, not just files on a hard drive.
- **No surprise side effects.** Microphone capture is deliberately routed only into analysis nodes, never into the speaker output — so turning on the mic can never cause feedback or an unexpected sound.

## Where the UX shows up concretely

- **Familiar mental models, reused.** Transport controls (▶ / ⏸, a scrubber, elapsed/remaining time) look and behave exactly like every media player you've already used — zero new interaction vocabulary to learn there, so attention stays on the visualization.
- **Standard notation, not a custom format.** The chord chart renders chords the way any musician's lead sheet does (`C`, `Am`, `F#dim`) — recognizable and copy-pasteable, not an app-specific representation you'd have to decode.
- **Immediate feedback loop while recording.** The visualization reacts to the microphone *while you're still recording*, not only after you stop — so there's no dead air where the app looks unresponsive while capturing.
- **Progressive disclosure.** The control panel (math system, sensitivity, particle count, bloom, emotion mode) only appears once a track is loaded; before that, the interface is just two clear choices (upload or record) and nothing else competing for attention.
- **Direct manipulation with instant visual consequence.** Every slider changes something you can see moving within one frame — no "apply" button, no hidden state.
- **Motion respects the content.** Parameter changes are frame-rate-independent exponentially damped (not raw per-frame jitter), so the piece reads as continuous and intentional even though it's being driven by inherently noisy real-time audio analysis.

## Tech stack

- **Rendering:** Three.js, React Three Fiber, `@react-three/drei`, `@react-three/postprocessing` (bloom, depth of field, ACES filmic tone mapping)
- **GPU simulation:** `GPUComputationRenderer` (ping-pong FBOs) running hand-written GLSL — the particle physics (springs, curl-noise fields, attractor integration) execute entirely on the GPU for 100k+ particles at interactive frame rates
- **Audio / DSP:** Web Audio API, [Meyda](https://meyda.js.org/) for low-level feature extraction (RMS, spectral centroid, ZCR, MFCC, chroma), original implementations of pitch detection (YIN), onset detection (adaptive spectral flux), tempo estimation (autocorrelation), and chord recognition (chroma template correlation with a tonality gate)
- **App layer:** React 19, TypeScript (strict), Vite, Zustand for UI state
- **Testing:** Vitest — 40+ unit tests covering the math translation engine, all four particle generators, and every DSP algorithm (including synthetic-noise stress tests for the chord detector)

## Architecture

```
src/
  types/      Shared types — MusicFeatures, MathParameters, MathSystemType, …
  audio/      AudioEngine (Web Audio graph), FeatureExtractor, PitchDetector,
              OnsetDetector, BeatTracker, ChordDetector, OfflineTempoAnalyzer,
              OfflineChordAnalyzer, MicrophoneRecorder
  math/       MathTranslationEngine (the feature → parameter mapping table),
              colorTemperature, emotion (rule-based arousal/valence), noise,
              generators/ (the four MathSystem implementations)
  systems/    ParticleSimulation — GPUComputationRenderer wiring
  shaders/    GLSL, mirrored 1:1 with the TypeScript math for auditability
  engine/     MathSymphonyEngine — the top-level per-frame orchestrator
  scenes/     R3F scene graph — Particles, CameraRig, PostFX, lighting/fog
  components/ UI — transport, control panel, chord chart, upload/record
  hooks/      useMathSymphonyEngine (engine singleton), useAppStore (Zustand)
```

## Getting started

```bash
npm install
npm run dev        # start the dev server
npm test           # run the unit test suite
npm run typecheck  # strict TypeScript check
npm run build       # production build
```

Open the app, then either drop in an audio file or click **Record from microphone** and play something nearby.

## Roadmap

- **Music genre / style classification** (classical, jazz, pop, electronic, …), used to select a distinct visual "personality" per genre — different default math system, palette, and motion character depending on what kind of music is playing, rather than one fixed mapping for everything.
- **Richer chord vocabulary.** The chord chart currently recognizes major/minor/diminished/augmented triads; extending template matching to sevenths, suspended, and extended jazz voicings would meaningfully improve accuracy on real-world (non-triadic) music.
- **PNG / MP4 export** of the live visualization (buttons are already present in the UI, currently disabled).
- **Additional math systems** — Boids/flocking, Voronoi/Delaunay tessellation, and reaction-diffusion are documented as extension points in the `MathSystem` architecture but not yet implemented.
- **Key signature detection**, to disambiguate enharmonic chord spellings and improve topology stability across a whole track.

## License

MIT
