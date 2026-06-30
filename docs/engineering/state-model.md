# State Model And Store Split Plan

## Current Risk

`src/store.ts` is the main coupling point. UI fields, game-world fields, save fields, and social fields live in one interface, so small refactors can break distant components.

## Target Slices

```text
store/
  index.ts
  slices/
    appSlice.ts          screen, splash, welcome guide
    uiSlice.ts           panels, modals, selected entity, tutorial UI
    worldSlice.ts        assets, terrain data, biome, ecology counters
    toolSlice.ts         selected tool, brush, placement helpers
    timeWeatherSlice.ts  time of day, weather, season, forecast alerts
    playerSlice.ts       auth user, profile, XP, unlocks, achievements
    saveSlice.ts         slots, load/save/import/export, cloud mapping
    socialSlice.ts       visiting, friends, mail, unread counts
    modeSlice.ts         creative/flourish mode, hand, deck, pending card
```

## Safe Order

1. Extract types from `src/store.ts` into a stable domain file.
2. Move pure helpers out of store actions.
3. Split UI-only state first.
4. Split time/weather state next.
5. Split save/social state after API tests exist.
6. Split world/assets/ecology last.

## Completed Foundation

- Core domain types now live in `src/game/types.ts`.
- `src/store.ts` re-exports those types so existing imports remain compatible.
- This is intentionally a zero-runtime-behavior step: it reduces future store split risk without changing gameplay.

## Invariants

- Existing `useGameStore` import remains valid until the final cleanup.
- Save format must not change accidentally.
- Card placement and asset placement must keep current behavior.
- Each slice extraction requires `npm run verify`.
