# Save Format And Compatibility

## Stable Fields

```text
format
version
name
savedAt
timeOfDay
weather
season
biome
assets
grassHealth
deerCount
wolfCount
ecoPoints
playerXP
playerLevel
unlockedAssets
stats
terrainPositions
terrainTypes
```

## Compatibility Rules

- Never rename an asset `type` without a migration.
- Unknown optional fields must be ignored, not crash loading.
- Missing older fields must receive defaults.
- Terrain arrays must remain serializable as plain arrays in saves.
- `localStorage` saves and server island payloads must share the same migration path.

## Next Implementation Steps

1. Add a `saveVersion` migration function.
2. Add unit tests for old saves with missing fields.
3. Add tests for terrain array round trips.
4. Add a small schema validator before cloud sync.
