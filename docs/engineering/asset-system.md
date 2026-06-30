# Asset System Refactor Plan

## Current Risk

`src/components/Assets.tsx` is a high-change, high-risk file because it mixes asset rendering, interaction wrappers, placement behavior, water effects, and one-off models.

## Target Shape

```text
src/render/assets/
  registry.ts
  AssetInstance.tsx
  vegetation/
  animals/
  buildings/
  water/
  marine/
  transport/
  decorations/
  special/
```

## Refactor Order

1. Create a registry that maps asset `type` to renderer.
2. Move already extracted assets first: plants, marine assets, train assets, raft.
3. Move simple stateless assets next: rocks, signs, benches, fences.
4. Move animated animals after locomotion tests exist.
5. Move water and terrain-coupled assets last.

## Rules

- Asset components render only; placement rules live in game/tool modules.
- Asset metadata lives in one catalog, not duplicated across toolbar and renderer.
- Every move keeps save `PlacedAsset.type` values stable.
