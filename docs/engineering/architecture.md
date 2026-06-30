# Wander Island Engineering Architecture

## Goal

Turn the current feature-rich prototype into a maintainable product without rewriting the game or changing its core loop.

## Current Boundary

- `src/App.tsx` owns app-level orchestration, global overlays, and high-level screen composition.
- `src/store.ts` owns too many domains today: world state, UI state, save state, social state, ecology, and card mode.
- `src/components/Assets.tsx` owns too much 3D rendering and should be split by asset family.
- `server/` is a demo-capable Express backend with auth, islands, social, mail, gifts, admin, Socket.IO, and AI narration.

## Target Module Shape

```text
src/
  app/              boot, screen routing, global providers
  features/         mail, social, music, settings, achievements, photo mode
  game/             pure rules: ecology, cards, fragments, terrain, train
  render/           Three/R3F scene and asset renderers
  services/         api, socket, audio, cloud sync, storage
  store/            Zustand store plus domain slices
  ui/               reusable non-game UI primitives
  shared/           stable types, constants, utility functions
```

## Rules

- Preserve import compatibility until tests cover the moved domain.
- Move pure functions before moving React components.
- Never split a large file and change behavior in the same step.
- Every structural change must pass `npm run verify`.
