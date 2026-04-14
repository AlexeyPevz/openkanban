# Project Catalog Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a companion-global known-project registry in Tauri app data, keep it updated from successful open/rebind flow, and expose it as the source for future project picker work.

**Architecture:** Store the project catalog in a JSON file under Tauri app data directory, manage file I/O and merge rules in Rust (desktop layer), and expose a small command surface to frontend for loading and upserting known projects. Frontend project state stays responsible for current active project, while a dedicated catalog store hydrates and syncs the future picker source.

**Tech Stack:** Rust (Tauri 2 commands), TypeScript, Svelte 5 stores, Vitest, serde/serde_json.

---

## File Map

### Existing files to modify

- `packages/desktop/src-tauri/src/main.rs` — register new Tauri commands and wire project-catalog module.
- `packages/desktop/src/lib/stores/project.svelte.ts` — upsert active project into catalog after successful init/rebind.
- `packages/desktop/src/App.svelte` — initialize project catalog on mount.
- `tests/desktop/project-store.test.ts` — extend to verify catalog upsert side effects.

### New files to create

- `packages/desktop/src-tauri/src/project_catalog.rs` — file path resolution, JSON format, merge rules, read/write helpers, unit tests.
- `packages/desktop/src/lib/catalog.ts` — Tauri invoke wrappers for catalog commands.
- `packages/desktop/src/lib/stores/project-catalog.svelte.ts` — hydrated catalog store and refresh helpers.
- `tests/desktop/catalog.test.ts` — frontend wrapper/store tests for project catalog source.

### Docs / task files to update after implementation

- `docs/kanban-plugin/LAUNCH_CONTRACT.md` — mention registry upsert on open/rebind if needed.
- `.tasks/done/task-3.2.1-project-catalog-source.md` — what was implemented and how it was verified.

---

### Task 1: Add Rust project catalog model and merge rules

**Files:**
- Create: `packages/desktop/src-tauri/src/project_catalog.rs`
- Modify: `packages/desktop/src-tauri/src/main.rs`
- Test: `packages/desktop/src-tauri/src/project_catalog.rs` (unit tests module)

- [ ] **Step 1: Write the failing Rust tests for catalog merge behavior**

Add unit tests for:
- empty registry default;
- `opened` outranks `discovered`;
- `last_opened_at` updates only on opened upsert;
- basename fallback for `name`;
- missing file => implicit empty registry.

```rust
#[test]
fn upsert_promotes_discovered_to_opened() {
    let existing = vec![ProjectRecord::discovered("/a/project")];
    let next = upsert_project(existing, UpsertProjectInput::opened("/a/project"));
    assert_eq!(next[0].source, ProjectSource::Opened);
}
```

- [ ] **Step 2: Run Rust tests and verify RED**

Run: `cargo test`

Expected: FAIL because `project_catalog.rs` and merge helpers do not exist.

- [ ] **Step 3: Write the minimal Rust implementation**

Implement in `project_catalog.rs`:
- `ProjectRecord`
- `ProjectSource`
- `ProjectRegistryFile { projects: Vec<ProjectRecord> }`
- path resolver for Tauri app data directory + `projects.json`
- `load_registry_or_empty(...)`
- `save_registry(...)`
- `upsert_project(...)`

Implementation detail:
- resolve app-data path from `AppHandle` inside Tauri commands/helpers via
  `app_handle.path().app_data_dir()`;
- keep path resolution in Rust, not in frontend or sidecar.
- store `last_opened_at` as ISO-8601 `String` for 3.2.1;
- do not add `chrono` unless tests show the std/time formatting path is inadequate.

Use file format:

```json
{ "projects": [] }
```

- [ ] **Step 4: Run Rust tests and verify GREEN**

Run: `cargo test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/desktop/src-tauri/src/project_catalog.rs packages/desktop/src-tauri/src/main.rs
git commit -m "feat(desktop): add project catalog registry model"
```

---

### Task 2: Expose Tauri commands for catalog load/upsert

**Files:**
- Modify: `packages/desktop/src-tauri/src/project_catalog.rs`
- Modify: `packages/desktop/src-tauri/src/main.rs`
- Test: `packages/desktop/src-tauri/src/project_catalog.rs` (unit tests)

- [ ] **Step 1: Write the failing tests for command-facing helpers**

Add tests for helper functions that back commands:
- `load_projects_for_ui` returns `projects[]` from file;
- `upsert_opened_project` writes/merges record;
- invalid/missing path sets `is_available = false` or rejects per helper contract;
- directory without `.tasks/` and without `opencode.json` is not treated as valid project.

```rust
#[test]
fn load_registry_returns_empty_when_file_missing() {
    let projects = load_projects_for_ui(temp_app_data_dir()).unwrap();
    assert!(projects.is_empty());
}
```

- [ ] **Step 2: Run Rust tests and verify RED**

Run: `cargo test`

Expected: FAIL until command helpers exist.

- [ ] **Step 3: Implement minimal Tauri command surface**

Add commands in Rust:
- `catalog_list_projects() -> Vec<ProjectRecord>`
- `catalog_upsert_opened_project(project_path: String, name: Option<String>) -> ProjectRecord`

Implementation rules:
- path resolution stays in Rust, not frontend;
- Tauri commands accept `app_handle: AppHandle` and use it to resolve app-data path;
- if file missing, `catalog_list_projects` returns empty array;
- `catalog_upsert_opened_project` updates `last_opened_at`, `source`, `is_available`.

Also update invoke registration explicitly:

```rust
.invoke_handler(tauri::generate_handler![
    rpc_call,
    catalog_list_projects,
    catalog_upsert_opened_project,
])
```

- [ ] **Step 4: Run Rust tests and verify GREEN**

Run: `cargo test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/desktop/src-tauri/src/project_catalog.rs packages/desktop/src-tauri/src/main.rs
git commit -m "feat(desktop): expose project catalog commands"
```

---

### Task 3: Add frontend catalog API wrappers and store

**Files:**
- Create: `packages/desktop/src/lib/catalog.ts`
- Create: `packages/desktop/src/lib/stores/project-catalog.svelte.ts`
- Create: `tests/desktop/catalog.test.ts`

- [ ] **Step 1: Write the failing frontend tests**

Add tests for:
- `listProjects()` invokes `catalog_list_projects`;
- `upsertOpenedProject()` invokes `catalog_upsert_opened_project`;
- catalog store hydrates from command result;
- empty registry becomes empty list, not error.

```ts
it('loadProjectCatalog hydrates empty list from missing registry', async () => {
  mockInvoke.mockResolvedValueOnce([]);
  await loadProjectCatalog();
  expect(getProjectCatalog()).toEqual([]);
});
```

- [ ] **Step 2: Run targeted tests and verify RED**

Run: `npx vitest run tests/desktop/catalog.test.ts`

Expected: FAIL because catalog wrappers/store do not exist.

- [ ] **Step 3: Implement the minimal frontend API and store**

Implement:
- `catalog.ts` using `invoke(...)` directly
- `project-catalog.svelte.ts` with:
  - `loadProjectCatalog()`
  - `getProjectCatalog()`
  - `upsertOpenedProject(projectPath, name?)`

Keep catalog API separate from `rpc.ts`, because this is desktop-local state,
not sidecar JSON-RPC.

Add a short comment/JSDoc in `catalog.ts` explaining why catalog commands use
direct Tauri `invoke()` and do not belong in sidecar `rpc.ts`.

- [ ] **Step 4: Run targeted tests and verify GREEN**

Run: `npx vitest run tests/desktop/catalog.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/desktop/src/lib/catalog.ts packages/desktop/src/lib/stores/project-catalog.svelte.ts tests/desktop/catalog.test.ts
git commit -m "feat(desktop): add frontend project catalog store"
```

---

### Task 4: Sync active project into catalog on init/rebind

**Files:**
- Modify: `packages/desktop/src/lib/stores/project.svelte.ts`
- Modify: `packages/desktop/src/App.svelte`
- Modify: `tests/desktop/project-store.test.ts`
- Modify: `tests/desktop/catalog.test.ts`

- [ ] **Step 1: Write the failing sync tests**

Add tests covering:
- `initializeActiveProject()` upserts opened project into catalog after success;
- `handleLaunchDirectory()` upserts only after successful rebind;
- failed rebind does not upsert;
- App startup triggers initial catalog hydration.

```ts
it('handleLaunchDirectory upserts opened project only after successful rebind', async () => {
  mockProjectApi.rebind.mockResolvedValueOnce({ ok: true, data: { directory: '/project-b', rebound: true } });
  await handleLaunchDirectory('/project-b');
  expect(mockCatalogUpsert).toHaveBeenCalledWith('/project-b');
});
```

- [ ] **Step 2: Run targeted tests and verify RED**

Run: `npx vitest run tests/desktop/project-store.test.ts tests/desktop/catalog.test.ts`

Expected: FAIL until sync orchestration is added.

- [ ] **Step 3: Implement minimal sync behavior**

Rules:
- after successful `project.current`, upsert current project into catalog;
- after successful `project.rebind`, upsert rebound project into catalog;
- `App.svelte` loads catalog on mount before/alongside active-project init;
- no picker UI yet — just keep the source updated.

- [ ] **Step 4: Run targeted tests and verify GREEN**

Run: `npx vitest run tests/desktop/project-store.test.ts tests/desktop/catalog.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/desktop/src/lib/stores/project.svelte.ts packages/desktop/src/App.svelte tests/desktop/project-store.test.ts tests/desktop/catalog.test.ts
git commit -m "feat(desktop): sync active project into catalog registry"
```

---

### Task 5: Final verification and docs sync

**Files:**
- Modify: `docs/kanban-plugin/LAUNCH_CONTRACT.md`
- Create: `.tasks/done/task-3.2.1-project-catalog-source.md`
- Modify: `tests/desktop/catalog.test.ts`

- [ ] **Step 1: Add final edge-case coverage (if still missing)**

Only add tests here for genuinely new edge-cases not already covered in Tasks 1-4,
for example:
- registry file contains invalid JSON;
- project path exists but lacks both `.tasks/` and `opencode.json`;
- unavailable project remains in catalog with `isAvailable: false`.

- [ ] **Step 2: Run targeted tests and verify RED only for new edge-cases**

Run: `npx vitest run tests/desktop/catalog.test.ts tests/desktop/project-store.test.ts`

Expected: FAIL only if you added truly new edge-case tests in Step 1.
If no new tests are needed, skip RED and proceed directly to Step 3.

- [ ] **Step 3: Implement final fixes and update docs**

Update docs and task file to reflect:
- registry location = Tauri app data dir;
- file format = `{ projects: [] }`;
- 3.2.1 bounded discovery = successful open/rebind flow only.

- [ ] **Step 4: Run full verification**

Run:
- `npx vitest run`
- `cargo test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/kanban-plugin/LAUNCH_CONTRACT.md .tasks/done/task-3.2.1-project-catalog-source.md tests/desktop/catalog.test.ts packages/desktop/src-tauri/src/project_catalog.rs packages/desktop/src/lib/catalog.ts packages/desktop/src/lib/stores/project-catalog.svelte.ts
git commit -m "feat(desktop): add project catalog source registry"
```

---

## Final Verification Checklist

- [ ] Registry file lives in Tauri app data directory.
- [ ] Missing registry file resolves to empty `projects[]` list.
- [ ] Registry file format is `{ "projects": [] }`.
- [ ] Project validity requires existing directory plus `.tasks/` or `opencode.json` marker.
- [ ] `opened` source outranks `discovered`.
- [ ] `lastOpenedAt` updates only on opened upsert.
- [ ] Active project init/rebind upserts into registry after success only.
- [ ] No picker UI or heavy filesystem scan introduced in 3.2.1.
- [ ] `npx vitest run` passes.
- [ ] `cargo test` passes.

## Suggested Execution Order

1. Task 1 — Rust model and merge rules
2. Task 2 — Tauri commands
3. Task 3 — frontend catalog API + store
4. Task 4 — sync active project into catalog
5. Task 5 — final verification and docs sync
