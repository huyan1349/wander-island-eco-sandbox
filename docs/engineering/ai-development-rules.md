# AI Development Rules

## Purpose

AI can accelerate this project, but every AI change must make the codebase more verifiable and easier to maintain.

## Rules For Every AI Task

1. State the target module before editing.
2. Keep unrelated files out of the diff.
3. Prefer pure helper extraction before component rewrites.
4. Do not change save formats without migration notes and tests.
5. Do not change core game rules without unit tests.
6. Do not leave temporary files in the TypeScript compile scope.
7. Run `npm run verify` before claiming completion.
8. Report any skipped checks explicitly.

## Safe Task Sizes

- Good: fix one type drift, add one pure test file, extract one simple asset family.
- Risky: rewrite `store.ts`, move all assets, redesign UI and alter game logic in one pass.

## Human Review Checklist

- Did the game loop still behave the same?
- Did the save/load path remain compatible?
- Did build output show new chunk or asset warnings?
- Are new files intentional and named clearly?
