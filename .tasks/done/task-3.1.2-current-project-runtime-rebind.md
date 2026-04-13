# Task 3.1.2: Current project runtime rebind (no sidecar restart)

**Status:** done
**Milestone:** 3 — OpenCode companion integration
**Slice:** 3.1 — Launch and current project binding

## Goal

Сделать active OpenCode project default context детерминированным и поддержать
переключение уже открытого companion app на новый project root без перезапуска
sidecar процесса.

## What was implemented

1. **Sidecar runtime root holder**
   - Added `packages/sidecar/src/runtime.ts` with `ProjectRuntime { current }`.
   - Method factories (`board`, `task`, `resources`) now read root from runtime,
     not from immutable startup closure.

2. **Project RPC methods**
   - Added `packages/sidecar/src/methods/project.ts`:
     - `project.current`
     - `project.rebind`
   - Rebind validates path, restarts watcher, updates runtime root only after
     successful restart.

3. **Server-side watcher rebinding plumbing**
   - Updated `packages/sidecar/src/server.ts` to accept `projectRuntime` and
     register project methods with restart callback.
   - Watcher restart is managed in server runtime without sidecar process restart.

4. **Desktop RPC + project store orchestration**
   - Added `projectApi.current` / `projectApi.rebind` in
     `packages/desktop/src/lib/rpc.ts`.
   - Added `packages/desktop/src/lib/stores/project.svelte.ts` with:
     - `initializeActiveProject()`
     - `handleLaunchDirectory()`
     - `getActiveProject()`

5. **Frontend launch-event integration**
   - Updated `packages/desktop/src/App.svelte` to:
     - initialize active project on mount;
     - listen to `launch:directory` and trigger rebind flow.

6. **Desktop Rust repeat-launch delivery**
   - Added `tauri-plugin-single-instance` dependency.
   - Registered plugin in `main.rs`.
   - Repeat launch args now reach running instance, which emits
     `launch:directory` and updates `SidecarState.project_dir`.

7. **Docs updated**
   - Rewrote `docs/kanban-plugin/LAUNCH_CONTRACT.md` with runtime rebind contract
     (`project.current`, `project.rebind`, single-instance repeat-launch flow).

## Tests added/updated

- `tests/sidecar/project-methods.test.ts` (new)
- `tests/desktop/project-store.test.ts` (new)
- `tests/desktop/rpc.test.ts` (extended)

## Verification run

- `npx vitest run tests/sidecar/project-methods.test.ts tests/sidecar/server.test.ts tests/sidecar/watcher.test.ts tests/sidecar/resources-methods-persistence.test.ts`
- `npx vitest run tests/desktop/rpc.test.ts tests/desktop/project-store.test.ts tests/desktop/stores.test.ts`
- `npx vitest run tests/sidecar/*.test.ts tests/desktop/*.test.ts`
- `cargo test` in `packages/desktop/src-tauri`

## Follow-up implications (3.1.3)

- 3.1.3 can now focus on removing residual ambiguity and edge-path consistency,
  not on introducing first-time runtime rebind itself.
