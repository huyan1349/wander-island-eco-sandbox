# AI Development Rules

`AGENTS.md` is the entry contract for all AI agents. This document expands the
daily engineering rules for Wander Island.

## Working Agreement

1. Read the relevant engineering document before editing the matching area.
2. State the target module in the working notes or final handoff.
3. Keep unrelated files out of the diff.
4. Prefer pure helper extraction before component rewrites.
5. Preserve core gameplay behavior unless the user explicitly asks to change it.
6. Add or update tests when touching pure game rules, save/load, backend
   contracts, weather, fragments, crops, train/track logic, or serialization.
7. Do not leave temporary files in the TypeScript compile scope.
8. Run the required validation gate before claiming completion.

## Ownership Map

- App shell and lazy loading: `src/App.tsx`, `src/components/GameCanvas.tsx`,
  `src/components/canvas/*`.
- Asset registry: `src/components/Assets.tsx`. Keep this file as a thin
  switch/dispatcher.
- Asset rendering modules:
  - `src/components/assets/marine.tsx`: rafts, boats, balloons, bridges,
    marine physics.
  - `src/components/assets/SubIsland.tsx`: local island terrain editing.
  - `src/components/assets/buildings.tsx`: house, windmill, lighthouse,
    streetlamp, lantern girl.
  - `src/components/assets/creatures.tsx`: deer and wolf locomotion/AI.
  - `src/components/assets/ambientCreatures.tsx`: fish, dolphin, seagull.
  - `src/components/assets/waterAssets.tsx`: spring, pond, stream, waterfall.
  - `src/components/assets/landmarks.tsx`: spirit tree, observatory, ruins,
    waterwheel.
  - `src/components/assets/interactiveProps.tsx`: birdhouse, campfire, sign,
    mailbox, bench.
- Pure game rules: `src/game/*`.
- Save/load and import/export: `src/game/saveFormat.ts`,
  `src/utils/islandIO.ts`, `src/store.ts`.
- Backend API and sockets: `server/*`.
- Music, overlays, and panels: `src/components/ui/*`,
  `src/components/*Panel.tsx`, `src/components/*Modal.tsx`.
- Engineering docs: `docs/engineering/*`.

Only edit outside the owned area when the change requires a contract update.

## Risk Levels

### Low Risk

- Add tests for extracted pure helpers.
- Move a self-contained static component to a new file.
- Improve docs, scripts, or CI without touching runtime behavior.
- Remove generated or unreferenced artifacts after an `rg` reference check.

### Medium Risk

- Split a UI panel while preserving props and store selectors.
- Extract shared rendering helpers from asset components.
- Adjust backend error handling without changing response semantics.
- Add lazy loading for already independent screens.

### High Risk

- Rewrite `src/store.ts`.
- Change save format, import/export, or default island data.
- Change terrain, water, camera, locomotion, or build-mode interaction.
- Delete or rename runtime assets under `public/`.
- Combine UI redesign with gameplay logic changes.

High-risk work must be done in smaller commits with tests and a smoke check.

## Validation Matrix

| Change Type | Required Checks |
| --- | --- |
| Docs only | `git diff --check` |
| Pure game helper | `npm run verify`, `git diff --check` |
| UI/component split | `npm run verify`, `npm run smoke`, `git diff --check` |
| Backend/API | `npm run verify`, `npm run security:audit`, `git diff --check` |
| Asset cleanup | `rg` reference check, `npm run verify`, `npm run smoke` |
| Broad cleanup | `npm run verify`, `npm run smoke`, `npm run security:audit`, `npm run clean` |

If a check is skipped, the final handoff must say why.

## Deletion Policy

- Before deleting, prove the file is generated, duplicated, or unreferenced.
- Use `rg` for code references and `git ls-files` for tracked state.
- Keep files in `public/` only when code, HTML, manifest, or docs reference
  them as runtime assets.
- Keep `data/` local runtime state out of commits unless the task is explicitly
  about seed or fixture data.
- Remove academic/coursework materials, one-off render folders, nested
  `node_modules`, and temporary scripts from this repository.

## Multi-Agent Handoff

When one AI hands work to another, use this structure:

```text
Goal:
Files touched:
Behavior preserved:
Validation run:
Known risks:
Next safe step:
```

Do not ask the next AI to "continue cleanup" without naming the module and risk
level.

## Completion Definition

A task is complete only when:

- The requested change is implemented.
- Core gameplay invariants are preserved.
- Required validation passes.
- Generated artifacts are cleaned.
- Git status is intentionally clean or intentionally staged.
- The final report includes exact commands run.
