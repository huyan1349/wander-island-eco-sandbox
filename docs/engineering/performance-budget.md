# Performance Budget

## Current Build Snapshot

Latest observed production build:

```text
index css:          156.40 kB
main index chunk:   385.16 kB
react-vendor:       195.06 kB
socket chunk:        41.59 kB
GameCanvas chunk: 1,080.52 kB
Assets chunk:       179.69 kB
PostProcessing:      88.86 kB
EnvironmentScene:    46.41 kB
TitleScreen chunk:  13.48 kB
LoginScreen chunk:   9.38 kB
SaveSelect chunk:   14.89 kB
Onboarding chunk:   16.68 kB
```

`GameCanvas` is lazy-loaded, which protects the shell from loading the whole Three/R3F scene immediately. The player panel, mailbox, gift modal, social panel, photo mode overlay, telescope overlay, pomodoro timer, title screen, login screen, onboarding flow, save selector, title settings, privacy policy, and credits modal are also lazy-loaded. Inside the canvas, environment rendering, asset rendering, and postprocessing are now separate async boundaries. The eager main chunk dropped from the previous 1,622.89 kB snapshot to 385.16 kB, and the production build no longer emits chunk-size warnings.

## Budgets

- Title screen should stay interactive before the 3D scene chunk is needed.
- Keep the eager main chunk trending downward.
- Desktop target: 50-60 FPS in a normal island.
- Mobile target: 30 FPS with reduced shadows/particles/water detail.
- Avoid adding uncompressed audio or GLB assets without size review.

## Next Steps

1. Keep large asset renderers out of eager UI imports; shared icons should live in lightweight icon modules.
2. Split the remaining `Assets.tsx` monolith by domain only when each slice has focused tests or screenshot smoke coverage.
3. Add quality presets for shadows, particles, water, and postprocessing.
4. Prefer instancing for repeated small props.
5. Add a lightweight debug performance readout for FPS and asset count.
