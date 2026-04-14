# Task 3.2.2: Project picker sidebar

**Status:** done
**Milestone:** 3 — OpenCode companion integration
**Slice:** 3.2 — Known projects catalog and manual switching foundation

## Goal

Добавить постоянную левую панель проектов в desktop companion app, которая
читает registry-backed catalog, показывает проекты в host-like виде и позволяет
сразу переключать основной kanban по клику.

## What was implemented

1. **Picker model/store**
   - Added state and helpers in `packages/desktop/src/lib/stores/project-picker.svelte.ts`.
   - Implemented visible-project filtering, fallback sorting, transient picker modes
     (`idle`, `switching`, `unavailable`, `switch_error`) and in-memory upsert for
     newly added projects.

2. **Desktop bridge for picker actions**
   - Added `packages/desktop/src/lib/project-picker.ts`.
   - Implemented `openAddProjectDialog(...)` over folder picker with validation
     result contract: `cancelled` / `invalid` / `added`.
   - Implemented `getProjectDisplayMeta(...)` with host-meta contract and temporary
     fallback icon path.

3. **Permanent sidebar UI**
   - Added `packages/desktop/src/lib/components/ProjectSidebar.svelte`.
   - Sidebar renders catalog-backed project rows, active state marker, unavailable
     rows, fallback icon, `Show unavailable` toggle and `Open/Add project...` action.
   - Updated `packages/desktop/src/App.svelte` to render sidebar alongside board.

4. **Immediate switch and unavailable-state integration**
   - Updated `packages/desktop/src/lib/stores/project.svelte.ts` with
     `switchProject(...)` for explicit manual switching.
   - Picker state now distinguishes available click -> switching state and
     unavailable click -> unavailable state without overwriting active project.

5. **Open/Add project flow**
   - Sidebar button now opens folder picker through bridge.
   - Cancel leaves state untouched.
   - Invalid selection does not upsert or switch active project.
   - Valid selection upserts into catalog, adds project to picker list and marks it
     as switching immediately.

6. **Docs and tests**
   - Updated `docs/kanban-plugin/LAUNCH_CONTRACT.md` to reflect project picker UI,
     add/open flow and test coverage.
   - Added/expanded tests for picker store, desktop bridge, sidebar rendering and
     add/open flows.

## Verification

- `npx vitest run tests/desktop/project-picker.test.ts tests/desktop/project-store.test.ts tests/desktop/project-sidebar.test.ts tests/desktop/catalog.test.ts` → passed (36 passed)
- `npx vitest run` → pending orchestrator final verification
- `cargo test` in `packages/desktop/src-tauri` → pending orchestrator final verification

## Files changed

- `packages/desktop/src/lib/project-picker.ts`
- `packages/desktop/src/lib/components/ProjectSidebar.svelte`
- `packages/desktop/src/lib/stores/project-picker.svelte.ts`
- `packages/desktop/src/lib/stores/project.svelte.ts`
- `packages/desktop/src/App.svelte`
- `tests/desktop/project-picker.test.ts`
- `tests/desktop/project-sidebar.test.ts`
- `tests/desktop/project-store.test.ts`
- `vitest.config.ts`
- `package.json`
- `package-lock.json`
- `packages/desktop/package.json`
- `docs/kanban-plugin/LAUNCH_CONTRACT.md`
- `.tasks/done/task-3.2.2-project-picker-sidebar.md`

## Risks / follow-up

- Host-like icon path still allows temporary fallback metadata when host icon lookup
  is unavailable.
- Sidebar currently relies on bounded validation contract from desktop bridge;
  future slices may replace temporary validation logic with real host parity.
- Full-project Vitest and Rust verification must remain green before commit/merge.
