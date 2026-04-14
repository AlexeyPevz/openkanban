# Task 3.2.1: Project catalog source

**Status:** done
**Milestone:** 3 — OpenCode companion integration
**Slice:** 3.2 — Known projects catalog and manual switching foundation

## Goal

Сделать companion-global источник известных OpenCode проектов в Tauri app data,
обновляемый после успешного open/rebind flow, чтобы он стал базой для будущего
project picker и controlled switching.

## What was implemented

1. **Rust project catalog registry**
   - Added `packages/desktop/src-tauri/src/project_catalog.rs`.
   - Registry lives in Tauri app data directory as `projects.json`.
   - Missing file is treated as empty registry.
   - Merge rules implemented:
     - `opened` outranks `discovered`
     - `lastOpenedAt` updates only on opened upsert
     - name falls back to basename
     - availability requires existing directory plus `.tasks/` or `opencode.json`

2. **Desktop command surface**
   - Registered direct Tauri commands in `packages/desktop/src-tauri/src/main.rs`:
     - `catalog_list_projects`
     - `catalog_upsert_opened_project`
   - Catalog commands stay desktop-local and do not use sidecar JSON-RPC.

3. **Frontend catalog API and store**
   - Added `packages/desktop/src/lib/catalog.ts` for direct Tauri `invoke(...)` wrappers.
   - Added `packages/desktop/src/lib/stores/project-catalog.svelte.ts` for:
     - `loadProjectCatalog()`
     - `getProjectCatalog()`
     - `upsertOpenedProject(projectPath, name?)`

4. **Active-project sync into catalog**
   - Updated `packages/desktop/src/lib/stores/project.svelte.ts`.
   - Successful `initializeActiveProject()` now upserts current project into catalog.
   - Successful `handleLaunchDirectory()` / rebind now upserts rebound project into catalog.
   - Failed rebind does not write catalog state.

5. **Startup orchestration**
   - Updated `packages/desktop/src/App.svelte`.
   - Added `initializeDesktopStartup(...)` helper.
   - App startup hydrates catalog before active-project initialization.

6. **Docs and tests**
   - Updated `docs/kanban-plugin/LAUNCH_CONTRACT.md` with project catalog contract.
   - Added/updated desktop tests for catalog wrappers/store/startup sync.

## Verification

- `cargo test` in `packages/desktop/src-tauri` → passed (19 passed, 0 failed)
- `npx vitest run tests/desktop/catalog.test.ts` → passed (5 passed)
- `npx vitest run tests/desktop/project-store.test.ts tests/desktop/catalog.test.ts` → passed (10 passed)
- `npx vitest run` → pending final full verification in orchestrator session

## Files changed

- `packages/desktop/src-tauri/src/project_catalog.rs`
- `packages/desktop/src-tauri/src/main.rs`
- `packages/desktop/src-tauri/Cargo.toml`
- `packages/desktop/src-tauri/Cargo.lock`
- `packages/desktop/src/lib/catalog.ts`
- `packages/desktop/src/lib/stores/project-catalog.svelte.ts`
- `packages/desktop/src/lib/stores/project.svelte.ts`
- `packages/desktop/src/App.svelte`
- `tests/desktop/catalog.test.ts`
- `tests/desktop/project-store.test.ts`
- `docs/kanban-plugin/LAUNCH_CONTRACT.md`
- `.tasks/done/task-3.2.1-project-catalog-source.md`

## Risks / follow-up

- Project picker UI is still out of scope for 3.2.1.
- Discovery remains intentionally bounded to successful open/rebind flow only.
- Full-project Vitest verification must remain green before commit/merge.
