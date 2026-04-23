# Doppler-shift in Three.js

**Credits**
- Subscriber class structure: [Federico Valla](https://www.federic.ooo/)


## The Doppler Effect
TLDR: The change of a sounds frequency based on the relative distance to the listener.

[Wiki](https://en.wikipedia.org/wiki/Doppler_effect)

Examples:
- Ambulance passsing by
- Jet engine passing overhead


## The method to the madness
- panner vs stereoPanner and the mid pitch hop

## How this chain feels to your ears

Think of this system like a tiny live mix engineer that updates every frame.
It keeps asking: "Where is the source, how fast is it moving, how far is it, and what should that feel like in your headphones right now?"

### Core options (ear-first explanation)

- `doppler.enabled`  
  Turns on the "pitch sweep" you hear when something rushes past.

- `doppler.depth`  
  How dramatic the pitch bend feels. Higher = more dramatic pass-by scream/dive.

- `doppler.smoothingSec`  
  Smooths pitch changes so they glide instead of stepping or glitching.

- `doppler.rateClamp`  
  Safety rails. Prevents chipmunk/crawl artifacts when speed gets extreme.

- `distance.enabled`  
  Turns on distance loudness falloff (near feels louder, far feels quieter).

- `distance.model` (`inverse`, `inverseSquare`, `linear`)  
  Chooses how quickly loudness drops with range.  
  - `inverse`: natural-ish game feel  
  - `inverseSquare`: faster drop, more dramatic "gone in the distance"  
  - `linear`: predictable, less physical

- `distance.minDistance`  
  "Personal space" radius before heavy attenuation starts.

- `distance.maxDistance`  
  Point where extra distance stops reducing level further.

- `pan.mode` (`stereo`, `hrtf3d`, `equalpower3d`)  
  How sideways/3D placement is rendered.  
  - `stereo`: simple left/right image  
  - `equalpower3d`: 3D panner, cheaper than HRTF  
  - `hrtf3d`: more convincing 3D cues (front/back, depth feel), best on headphones

- `pan.smoothing`  
  Prevents fast left/right zippering when positions update quickly.

- `reverb.enabled`  
  Adds space/air around the dry signal so it does not feel bone-dry.

- `reverb.wet`  
  How much room tail you hear vs direct source.

- `reverb.wetByDistance`  
  Pushes more reverb feel as things get farther away (less direct, more space).

### Layers: why they sound more real

Layers let different parts of the sound react differently, like in real life:

- low band = body/rumble (usually hangs around farther)
- mid band = character / note
- high band = bite/air/hiss (usually drops off sooner)

Per-layer controls:

- `gain`: static level balance per band
- `filter`: carve each band (`lowpass`, `bandpass`, `highpass`, etc.)
- `dopplerDepth`: how much that band bends in pitch with motion
- `distanceDepth`: how fast that band fades with distance
- `detuneCents`: tiny tonal offset for texture/width

If you only use one full-range file, it is cheaper and simpler.  
If you split into layers, it usually feels more alive in motion because each band can behave differently.

### Quick practical presets

- Headphone "wow" preset: `pan.mode: 'hrtf3d'`, moderate `doppler.depth`, conservative `reverb.wet`.
- Performance preset: `pan.mode: 'equalpower3d'` (or `stereo`), fewer layers.
- Heavy jet feel: stronger low layer, slightly lower low-band `dopplerDepth`, higher high-band `distanceDepth`.