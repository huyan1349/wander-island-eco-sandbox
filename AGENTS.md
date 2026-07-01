# Wander Island AI Collaboration Contract

This repository can be edited by multiple AI coding agents. Every agent must
follow this contract before changing files.

## First Read

Read these files before making non-trivial changes:

- `docs/engineering/architecture.md`
- `docs/engineering/state-model.md`
- `docs/engineering/asset-system.md`
- `docs/engineering/save-format.md`
- `docs/engineering/performance-budget.md`
- `docs/engineering/backend-contracts.md`
- `docs/engineering/ai-development-rules.md`

## Project Invariants

- Preserve the existing game loop, island editing flow, save/load behavior, and
  camera/gameplay feel unless the task explicitly changes them.
- Never rewrite `src/store.ts`, `src/components/Assets.tsx`, terrain, water, or
  save-format code in one broad pass. Split first, test second, then continue.
- Do not change save data shape without a migration path and tests.
- Do not delete runtime assets unless `rg` proves they are unused.
- Do not commit generated folders such as `dist/`, `coverage/`, `.vite/`, or
  `outputs/`.
- Keep academic/coursework artifacts, ad hoc render exports, and one-off scripts
  out of the app repository.

## Agent Coordination

- Claim a narrow module before editing. Examples: "crop logic", "mailbox UI",
  "waterfall path fitting", "smoke test".
- One agent should own one behavioral area at a time. If another agent has just
  touched the same file, read its diff before editing.
- Prefer extracting pure logic and adding tests over changing React/Three
  components directly.
- For risky files, leave behavior in place and extract surrounding structure:
  `src/store.ts`, `src/components/Assets.tsx`, `src/components/Terrain.tsx`,
  `src/game/water/*`, `src/utils/islandIO.ts`.
- If a task spans UI plus gameplay logic, finish the gameplay invariant tests
  before polishing visuals.

## Validation Gates

Run the smallest relevant gate during work, then the full gate before completion:

- Type and unit checks: `npm run verify`
- Browser smoke check: `npm run smoke`
- Dependency audit: `npm run security:audit`
- Diff hygiene: `git diff --check`
- Cleanup: `npm run clean`

Docs-only changes may skip browser smoke, but must say that explicitly.

## Handoff Format

Every AI final report should include:

- What changed.
- What files or modules were touched.
- What behavior was intentionally preserved.
- Commands run and results.
- Any skipped checks or remaining risk.

## Commit Hygiene

- Keep commits scoped to one engineering theme.
- Do not include local secrets, `.env.local`, dependency folders, build output,
  screenshots generated for inspection, or temporary research artifacts.
- Commit generated runtime assets only when source code references them from
  `public/`.
