# Project Picker Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a permanent left project sidebar for the desktop app that reads the registry-backed catalog, supports immediate project switching on click, exposes `Open/Add project...`, and shows an unavailable-project state.

**Architecture:** Keep the existing catalog registry/store from 3.2.1 as the data source, add a dedicated picker model/store for sorting and view state, add an explicit desktop bridge for folder picker and host-icon resolution, and render a separate sidebar UI that coordinates with board/project state without burying host-specific logic inside components.

**Tech Stack:** Svelte 5, TypeScript, Tauri 2 frontend APIs, Vitest, existing desktop stores/components.

---

## File Map

### Existing files to modify

- `packages/desktop/src/App.svelte` — place permanent left sidebar into app layout.
- `packages/desktop/src/lib/components/Board.svelte` — support unavailable/switching board-adjacent states if needed.
- `packages/desktop/src/lib/stores/project.svelte.ts` — expose/extend immediate switch orchestration for click-to-switch.
- `packages/desktop/src/lib/stores/project-catalog.svelte.ts` — keep catalog source aligned if picker needs refresh hooks.
- `tests/desktop/catalog.test.ts` — extend for sidebar-related catalog behavior if needed.
- `tests/desktop/project-store.test.ts` — extend for immediate switch scenarios triggered by picker actions.
- `packages/desktop/package.json` — add Tauri dialog plugin dependency if required.

### New files to create

- `packages/desktop/src/lib/project-picker.ts` — desktop bridge for folder picker, project validation orchestration, and host icon metadata contract.
- `packages/desktop/src/lib/stores/project-picker.svelte.ts` — picker model/store: sorting, visibility, unavailable state, switching state, add/open flow.
- `packages/desktop/src/lib/components/ProjectSidebar.svelte` — permanent left sidebar UI.
- `packages/desktop/src/lib/components/ProjectUnavailable.svelte` — special state shown when unavailable project is clicked.
- `tests/desktop/project-picker.test.ts` — picker store and desktop bridge tests.
- `tests/desktop/project-sidebar.test.ts` — sidebar rendering/wiring tests.

### Docs / task files to update after implementation

- `docs/kanban-plugin/LAUNCH_CONTRACT.md` — mention sidebar picker behavior and add/open flow if implementation affects launch/runtime contract.
- `.tasks/done/task-3.2.2-project-picker-sidebar.md` — record implementation and verification.

---

## Task 1: Add picker model/store for sidebar-ready state

**Files:**
- Create: `packages/desktop/src/lib/stores/project-picker.svelte.ts`
- Test: `tests/desktop/project-picker.test.ts`

- [ ] **Step 1: Write the failing store tests**

Add tests for:
- default visible list hides unavailable projects;
- `Show unavailable` exposes them;
- fallback sorting is `active project first`, then descending `lastOpenedAt`;
- clicking unavailable project sets unavailable state instead of switch intent;
- clicking available project enters switching intent/state.

```ts
it('sorts fallback list as active project first then most recent lastOpenedAt', () => {
  seedProjectPicker([
    { projectPath: '/b', name: 'B', lastOpenedAt: '2026-04-13T10:00:00Z', source: 'opened', isAvailable: true },
    { projectPath: '/a', name: 'A', lastOpenedAt: '2026-04-13T11:00:00Z', source: 'opened', isAvailable: true },
  ], '/b')

  expect(getVisibleProjects().map((p) => p.projectPath)).toEqual(['/b', '/a'])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/desktop/project-picker.test.ts`
Expected: FAIL because picker store does not exist yet.

- [ ] **Step 3: Write the minimal picker store implementation**

Implement store functions with minimal API:
- `hydrateProjectPicker(projects, activeProject)`
- `getVisibleProjects()`
- `getProjectPickerState()`
- `setShowUnavailable(boolean)`
- `openProjectFromSidebar(projectPath)`
- `clearProjectPickerTransientState()`

Keep responsibilities bounded to view/model state only. Do **not** put folder picker or host icon fetching here.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/desktop/project-picker.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/desktop/src/lib/stores/project-picker.svelte.ts tests/desktop/project-picker.test.ts
git commit -m "feat(desktop): add project picker store"
```

---

## Task 2: Add desktop bridge for folder picker and host icon contract

**Files:**
- Create: `packages/desktop/src/lib/project-picker.ts`
- Modify: `packages/desktop/package.json`
- Test: `tests/desktop/project-picker.test.ts`

- [ ] **Step 1: Write the failing bridge tests**

Add tests for:
- folder picker cancel => returns no-op result;
- valid directory => validation + registry upsert + switch intent result;
- invalid directory => validation error result;
- host icon available => returns host icon metadata;
- host icon unavailable => returns explicit temporary fallback metadata.

```ts
it('returns fallback icon metadata when host icon is unavailable', async () => {
  mockHostIconLookup.mockResolvedValueOnce(null)

  const meta = await getProjectDisplayMeta('/workspace/demo')

  expect(meta.icon.kind).toBe('fallback')
  expect(meta.icon.temporary).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/desktop/project-picker.test.ts`
Expected: FAIL because desktop bridge does not exist yet.

- [ ] **Step 3: Write the minimal bridge implementation**

Implement in `project-picker.ts`:
- `openAddProjectDialog()` using Tauri 2 dialog `open({ directory: true, multiple: false })`
- `validatePickedProject(path)` reusing existing validity rules via explicit desktop/local contract
- `getProjectDisplayMeta(projectPath)` with primary host-icon path and temporary fallback
- helper return types that make cancel / invalid / valid outcomes explicit

If `@tauri-apps/plugin-dialog` is required, add it to desktop package dependencies.

Do **not** overbuild exact OpenCode icon integration if API is not available. Keep primary contract + temporary fallback explicit.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/desktop/project-picker.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/desktop/src/lib/project-picker.ts packages/desktop/package.json tests/desktop/project-picker.test.ts
git commit -m "feat(desktop): add project picker desktop bridge"
```

---

## Task 3: Build the permanent sidebar UI

**Files:**
- Create: `packages/desktop/src/lib/components/ProjectSidebar.svelte`
- Create: `tests/desktop/project-sidebar.test.ts`
- Modify: `packages/desktop/src/App.svelte`

- [ ] **Step 1: Write the failing sidebar component tests**

Add tests for:
- sidebar renders permanently alongside board layout;
- rows render icon + name + active/unavailable markers;
- `Show unavailable` toggle hides/shows unavailable rows;
- `Open/Add project...` action is rendered and wired.

```ts
it('shows unavailable rows only when toggle is enabled', async () => {
  seedSidebarProjects([
    { projectPath: '/a', name: 'A', isAvailable: true },
    { projectPath: '/b', name: 'B', isAvailable: false },
  ])

  expect(screen.queryByText('B')).toBeNull()
  await user.click(screen.getByRole('checkbox', { name: /show unavailable/i }))
  expect(screen.getByText('B')).toBeTruthy()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/desktop/project-sidebar.test.ts`
Expected: FAIL because sidebar component does not exist yet.

- [ ] **Step 3: Write the minimal sidebar implementation**

Implement `ProjectSidebar.svelte`:
- permanent left sidebar container;
- header `Projects`;
- `Open/Add project...` button;
- `Show unavailable` toggle;
- project rows with icon slot/rendering, name, markers;
- event wiring to picker store actions.

Update `App.svelte` layout so sidebar is always visible next to board.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/desktop/project-sidebar.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/desktop/src/lib/components/ProjectSidebar.svelte packages/desktop/src/App.svelte tests/desktop/project-sidebar.test.ts
git commit -m "feat(desktop): add permanent project sidebar"
```

---

## Task 4: Add unavailable-project state and immediate click-to-switch integration

**Files:**
- Create: `packages/desktop/src/lib/components/ProjectUnavailable.svelte`
- Modify: `packages/desktop/src/lib/components/Board.svelte`
- Modify: `packages/desktop/src/lib/stores/project.svelte.ts`
- Modify: `packages/desktop/src/lib/stores/project-picker.svelte.ts`
- Modify: `tests/desktop/project-store.test.ts`
- Modify: `tests/desktop/project-picker.test.ts`
- Modify: `tests/desktop/project-sidebar.test.ts`

- [ ] **Step 1: Write the failing integration tests**

Add tests for:
- clicking available project immediately switches board/project context;
- failed switch keeps previous active project and reports switch error;
- clicking unavailable project shows `project unavailable` state;
- unavailable click does not silently overwrite current active runtime state.

```ts
it('clicking unavailable project opens project unavailable state', async () => {
  seedPickerProjects([
    { projectPath: '/offline', name: 'Offline', isAvailable: false },
  ])

  await openProjectFromSidebar('/offline')

  expect(getProjectPickerState().mode).toBe('unavailable')
  expect(getProjectPickerState().unavailableProjectPath).toBe('/offline')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/desktop/project-picker.test.ts tests/desktop/project-store.test.ts tests/desktop/project-sidebar.test.ts`
Expected: FAIL until unavailable state and click-to-switch integration are implemented.

- [ ] **Step 3: Write the minimal integration implementation**

Implement:
- `ProjectUnavailable.svelte` for unavailable state rendering;
- picker store mode transitions: `idle | switching | unavailable | validation_error`;
- immediate switch orchestration that calls the existing successful rebind/current flow;
- explicit failure path that preserves previous active project;
- board/app rendering path that swaps board content when picker mode is `unavailable`.

Keep switch orchestration explicit and do not bury it inside sidebar row components.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/desktop/project-picker.test.ts tests/desktop/project-store.test.ts tests/desktop/project-sidebar.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/desktop/src/lib/components/ProjectUnavailable.svelte packages/desktop/src/lib/components/Board.svelte packages/desktop/src/lib/stores/project.svelte.ts packages/desktop/src/lib/stores/project-picker.svelte.ts tests/desktop/project-picker.test.ts tests/desktop/project-store.test.ts tests/desktop/project-sidebar.test.ts
git commit -m "feat(desktop): wire project sidebar switching states"
```

---

## Task 5: Add `Open/Add project...` end-to-end flow and final docs sync

**Files:**
- Modify: `packages/desktop/src/lib/project-picker.ts`
- Modify: `packages/desktop/src/lib/stores/project-picker.svelte.ts`
- Modify: `packages/desktop/src/lib/stores/project-catalog.svelte.ts`
- Modify: `tests/desktop/project-picker.test.ts`
- Modify: `tests/desktop/project-sidebar.test.ts`
- Modify: `docs/kanban-plugin/LAUNCH_CONTRACT.md`
- Create: `.tasks/done/task-3.2.2-project-picker-sidebar.md`

- [ ] **Step 1: Write the failing add/open flow tests**

Add tests for:
- cancel from folder picker => no state mutation;
- invalid folder => validation error state;
- valid folder => registry upsert + immediate switch;
- successful add/open refreshes visible project list and active project marker.

```ts
it('valid Open/Add project flow upserts registry and immediately switches', async () => {
  mockOpenDialog.mockResolvedValueOnce('/workspace/demo')
  mockValidateProject.mockResolvedValueOnce({ ok: true, directory: '/workspace/demo' })

  await openAndSwitchProject()

  expect(mockCatalogUpsert).toHaveBeenCalledWith('/workspace/demo')
  expect(mockProjectSwitch).toHaveBeenCalledWith('/workspace/demo')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/desktop/project-picker.test.ts tests/desktop/project-sidebar.test.ts`
Expected: FAIL until add/open flow is fully wired.

- [ ] **Step 3: Write the minimal add/open implementation and docs sync**

Implement:
- end-to-end `Open/Add project...` orchestration;
- registry refresh after successful add/open;
- validation error behavior;
- docs update for sidebar picker and add/open flow;
- done-file summary.

Do **not** add search or heavy discovery here.

- [ ] **Step 4: Run full verification**

Run:
- `npx vitest run tests/desktop/project-picker.test.ts tests/desktop/project-sidebar.test.ts tests/desktop/project-store.test.ts tests/desktop/catalog.test.ts`
- `npx vitest run`
- `cargo test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/desktop/src/lib/project-picker.ts packages/desktop/src/lib/stores/project-picker.svelte.ts packages/desktop/src/lib/stores/project-catalog.svelte.ts tests/desktop/project-picker.test.ts tests/desktop/project-sidebar.test.ts docs/kanban-plugin/LAUNCH_CONTRACT.md .tasks/done/task-3.2.2-project-picker-sidebar.md
git commit -m "feat(desktop): add project picker sidebar"
```

---

## Final Verification Checklist

- [ ] Permanent left sidebar is present.
- [ ] Sidebar reads registry-backed catalog.
- [ ] Host-like icon contract exists with temporary fallback path.
- [ ] `Show unavailable` toggle works.
- [ ] Available project click switches board immediately.
- [ ] Unavailable project click opens unavailable state.
- [ ] `Open/Add project...` uses folder picker and validates project.
- [ ] Valid add/open upserts registry and immediately switches.
- [ ] Sorting uses host-like strategy or declared fallback.
- [ ] Search and heavy scan were not introduced.
- [ ] Targeted Vitest suites pass.
- [ ] Full `npx vitest run` passes.
- [ ] `cargo test` passes.

## Suggested Execution Order

1. Task 1 — picker model/store
2. Task 2 — desktop bridge
3. Task 3 — sidebar UI
4. Task 4 — unavailable state + immediate switch integration
5. Task 5 — add/open flow + docs + final verification
