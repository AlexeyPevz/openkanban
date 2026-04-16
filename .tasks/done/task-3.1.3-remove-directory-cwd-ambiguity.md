# Task 3.1.3: Remove ambiguity between `--directory` and `process.cwd()`

**Status:** done
**Milestone:** 3 — OpenCode companion integration
**Slice:** 3.1 — Launch and current project binding

## Goal

Убрать неоднозначность initial project root при запуске sidecar, чтобы выбор
рабочего проекта был детерминирован и не зависел от случайного `cwd`.

## What was done

1. **Explicit initial-root resolver in sidecar**
   - Added `resolveInitialProjectRoot({ env, cwd })` in
     `packages/sidecar/src/runtime.ts`.
   - Resolution order is now explicit:
     1) `OPENKANBAN_PROJECT_DIR` (if non-empty)
     2) `cwd` fallback

2. **Sidecar entrypoints switched to resolver**
   - Updated `packages/sidecar/src/index.ts`
   - Updated `packages/sidecar/src/bundle-entry.ts`
   - Both now initialize runtime via:
     `resolveInitialProjectRoot({ env: process.env, cwd: process.cwd() })`

3. **Desktop cold-start passes explicit project root via env**
   - Updated `packages/desktop/src-tauri/src/main.rs`:
     `start_sidecar` now sets `OPENKANBAN_PROJECT_DIR` alongside `current_dir`.

4. **Tests added for root resolution**
   - Added `tests/sidecar/runtime.test.ts`:
     - env has priority over cwd
     - fallback to cwd when env missing
     - fallback to cwd when env blank

5. **Contract docs updated**
   - Updated `docs/kanban-plugin/LAUNCH_CONTRACT.md` with explicit
     initial-root precedence and startup determinism note.

## Verification

- `npx vitest run tests/sidecar/runtime.test.ts`
- `npx vitest run tests/sidecar/runtime.test.ts tests/sidecar/project-methods.test.ts tests/sidecar/*.test.ts`
- `npx vitest run tests/desktop/*.test.ts tests/desktop/project-store.test.ts`
- `npx vitest run` (full) -> 190 passed, 10 skipped
- `cargo test` in `packages/desktop/src-tauri` -> 6/6 passed

## Files changed (3.1.3 scope)

- `packages/sidecar/src/runtime.ts`
- `packages/sidecar/src/index.ts`
- `packages/sidecar/src/bundle-entry.ts`
- `packages/desktop/src-tauri/src/main.rs`
- `tests/sidecar/runtime.test.ts`
- `docs/kanban-plugin/LAUNCH_CONTRACT.md`
- `.tasks/done/task-3.1.3-remove-directory-cwd-ambiguity.md`
