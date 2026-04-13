# Current Project Runtime Rebind Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the companion app switch to a newly launched OpenCode project immediately, without restarting the sidecar process, while keeping one active project context at a time.

**Architecture:** Introduce a shared runtime `currentProjectRoot` holder inside the sidecar, add explicit `project.current` and `project.rebind` RPC methods, rebuild watcher/repository bindings on successful rebind, and wire the desktop app to receive repeat launch arguments via Tauri single-instance delivery. Frontend remains the coordinator: it waits for sidecar ack before committing active-project UI state.

**Tech Stack:** TypeScript, Vitest, Svelte 5 state stores, Tauri 2 (Rust), JSON-RPC, chokidar, zod.

---

## File Map

### Existing files to modify

- `packages/sidecar/src/index.ts` — stop capturing immutable `process.cwd()` as the only project root; build methods from runtime root holder.
- `packages/sidecar/src/bundle-entry.ts` — same runtime-root bootstrap for bundled sidecar entry.
- `packages/sidecar/src/server.ts` — add runtime watcher lifecycle and support project runtime methods.
- `packages/sidecar/src/methods/board.ts` — read root from runtime holder instead of closed-over string.
- `packages/sidecar/src/methods/task.ts` — read root from runtime holder instead of closed-over string.
- `packages/sidecar/src/methods/resources.ts` — read root from runtime holder instead of closed-over string.
- `packages/desktop/src/lib/rpc.ts` — add `projectApi.current()` and `projectApi.rebind()` wrappers.
- `packages/desktop/src/lib/stores/board.svelte.ts` — expose reset/switch-safe helpers for rebind flow.
- `packages/desktop/src/App.svelte` — subscribe to `launch:directory`, orchestrate frontend-side rebind, clean up listeners.
- `packages/desktop/src-tauri/src/main.rs` — register single-instance plugin, forward repeat-launch args to running app, reuse existing CLI parsing helper.
- `packages/desktop/src-tauri/Cargo.toml` — add `tauri-plugin-single-instance` dependency.

### New files to create

- `packages/sidecar/src/runtime.ts` — shared runtime project root holder and helper functions.
- `packages/sidecar/src/methods/project.ts` — `project.current` and `project.rebind` methods.
- `packages/desktop/src/lib/stores/project.svelte.ts` — active project state + rebind orchestration helpers.
- `tests/sidecar/project-methods.test.ts` — unit tests for `project.current` / `project.rebind` behavior.
- `tests/desktop/project-store.test.ts` — focused tests for launch-event → rebind flow and active-project state rules.

### Existing tests to modify

- `tests/sidecar/server.test.ts` — verify dispatcher/server supports new project methods and rebind lifecycle behavior.
- `tests/sidecar/watcher.test.ts` — verify watcher can be torn down and recreated cleanly for a new root.
- `tests/desktop/rpc.test.ts` — verify new `projectApi` wrappers call `rpc_call` correctly.
- `tests/desktop/stores.test.ts` — extend board-store-related tests with no-op same-directory and refresh-after-ack paths.

### Docs to update after implementation

- `docs/kanban-plugin/LAUNCH_CONTRACT.md` — reflect repeat-launch / runtime rebind behavior.
- `.tasks/done/task-3.1.2-current-project-runtime-rebind.md` — record what was implemented and verified.

---

### Task 1: Introduce sidecar runtime project root holder

**Files:**
- Create: `packages/sidecar/src/runtime.ts`
- Modify: `packages/sidecar/src/index.ts`
- Modify: `packages/sidecar/src/bundle-entry.ts`
- Modify: `packages/sidecar/src/methods/board.ts`
- Modify: `packages/sidecar/src/methods/task.ts`
- Modify: `packages/sidecar/src/methods/resources.ts`
- Test: `tests/sidecar/project-methods.test.ts`
- Test: `tests/sidecar/methods-board.test.ts`

- [ ] **Step 1: Write the failing tests for runtime-root reads**

Add tests showing that methods read the current root from a shared holder instead of a closed-over string.

```ts
it('project.current returns the runtime root', async () => {
  const runtime = createProjectRuntime('/tmp/project-a');
  const methods = createProjectMethods(runtime);

  await expect(methods['project.current']({})).resolves.toEqual({ directory: '/tmp/project-a' });
});

it('board.load reads from runtime.current after mutation', async () => {
  const runtime = createProjectRuntime(projectA);
  const boardMethods = createBoardMethods(runtime);

  runtime.current = projectB;
  const result = await boardMethods['board.load']({});

  expect(result).toMatchObject({ state: 'success' });
  expect(result.board.title).toBe('Project B');
});

it('task.list reads from runtime.current after mutation', async () => {
  const runtime = createProjectRuntime(projectA);
  const taskMethods = createTaskMethods(runtime);

  runtime.current = projectB;
  const tasks = await taskMethods['task.list']({});

  expect(tasks).toMatchObject([{ id: 'project-b-task' }]);
});

it('resources.discover uses runtime.current after mutation', async () => {
  const runtime = createProjectRuntime(projectA);
  const resourceMethods = createResourceMethods(runtime);

  runtime.current = projectB;
  const resources = await resourceMethods['resources.discover']({});

  expect(resources).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: 'project-b-skill' }),
  ]));
});
```

- [ ] **Step 2: Run targeted tests and verify RED**

Run: `npx vitest run tests/sidecar/project-methods.test.ts tests/sidecar/methods-board.test.ts`

Expected: fail because `runtime.ts` and `project.current` do not exist and method factories still accept raw strings.

- [ ] **Step 3: Implement the minimal runtime holder**

Add `runtime.ts` with an explicit holder type and helper.

```ts
export interface ProjectRuntime {
  current: string;
}

export function createProjectRuntime(initial: string): ProjectRuntime {
  return { current: initial };
}
```

Update method factories to accept `ProjectRuntime` and instantiate repositories inside each handler from `runtime.current`.

Important implementation rules:
- do **not** keep `TaskMarkdownRepository` instances created once at factory construction time;
- do **not** keep closed-over `projectDir` for `discoverResources(runtime.current)` calls;
- invalidate or rebuild any in-memory resource cache when runtime root changes, so `resources.list` cannot leak records from the previous project.

- [ ] **Step 4: Run targeted tests and verify GREEN**

Run: `npx vitest run tests/sidecar/project-methods.test.ts tests/sidecar/methods-board.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/sidecar/src/runtime.ts packages/sidecar/src/index.ts packages/sidecar/src/bundle-entry.ts packages/sidecar/src/methods/board.ts packages/sidecar/src/methods/task.ts packages/sidecar/src/methods/resources.ts tests/sidecar/project-methods.test.ts tests/sidecar/methods-board.test.ts
git commit -m "feat(sidecar): add runtime project root holder"
```

---

### Task 2: Add `project.current` and `project.rebind` with watcher rebinding

**Files:**
- Create: `packages/sidecar/src/methods/project.ts`
- Modify: `packages/sidecar/src/server.ts`
- Modify: `packages/sidecar/src/index.ts`
- Modify: `packages/sidecar/src/bundle-entry.ts`
- Test: `tests/sidecar/project-methods.test.ts`
- Test: `tests/sidecar/server.test.ts`
- Test: `tests/sidecar/watcher.test.ts`

- [ ] **Step 1: Write the failing tests for rebind semantics**

Add tests for:
- `project.rebind` returns no-op success on same directory;
- `project.rebind` updates runtime root only after successful validation;
- server tears down old watcher and starts a new watcher on the rebound root.

```ts
it('project.rebind returns rebound false for same directory', async () => {
  const runtime = createProjectRuntime(projectA);
  const methods = createProjectMethods(runtime, deps);

  await expect(methods['project.rebind']({ directory: projectA }))
    .resolves.toEqual({ directory: projectA, rebound: false });
});

it('project.rebind updates runtime and restarts watcher', async () => {
  const restartWatcher = vi.fn().mockResolvedValue(undefined);
  const methods = createProjectMethods(runtime, { restartWatcher, validateRoot });

  await methods['project.rebind']({ directory: projectB });

  expect(runtime.current).toBe(projectB);
  expect(restartWatcher).toHaveBeenCalledWith(projectB);
});
```

- [ ] **Step 2: Run targeted tests and verify RED**

Run: `npx vitest run tests/sidecar/project-methods.test.ts tests/sidecar/server.test.ts tests/sidecar/watcher.test.ts`

Expected: fail because rebind methods and watcher restart plumbing do not exist yet.

- [ ] **Step 3: Implement minimal rebind support**

Implementation requirements:
- add `project.current` and `project.rebind` method registry;
- in `server.ts`, keep watcher in mutable server runtime state;
- add a restart helper that stops the current watcher, updates `runtime.current`, and starts a new watcher for the new root;
- only mutate `runtime.current` after path validation and watcher bootstrap succeed.
- register `createProjectMethods(runtime, deps)` into the combined sidecar method set in both `packages/sidecar/src/index.ts` and `packages/sidecar/src/bundle-entry.ts`.

Suggested shape:

```ts
async function restartWatcher(directory: string): Promise<void> {
  await watcher?.stop();
  const nextWatcher = new FileWatcher({ projectDir: directory, ...callbacks });
  nextWatcher.start();
  watcher = nextWatcher;
}
```

- [ ] **Step 4: Run targeted tests and verify GREEN**

Run: `npx vitest run tests/sidecar/project-methods.test.ts tests/sidecar/server.test.ts tests/sidecar/watcher.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/sidecar/src/methods/project.ts packages/sidecar/src/server.ts packages/sidecar/src/index.ts packages/sidecar/src/bundle-entry.ts tests/sidecar/project-methods.test.ts tests/sidecar/server.test.ts tests/sidecar/watcher.test.ts
git commit -m "feat(sidecar): add runtime project rebind rpc"
```

---

### Task 3: Add desktop RPC wrappers and project-switch store

**Files:**
- Create: `packages/desktop/src/lib/stores/project.svelte.ts`
- Modify: `packages/desktop/src/lib/rpc.ts`
- Modify: `packages/desktop/src/lib/stores/board.svelte.ts`
- Modify: `packages/desktop/src/App.svelte`
- Test: `tests/desktop/rpc.test.ts`
- Test: `tests/desktop/project-store.test.ts`
- Test: `tests/desktop/stores.test.ts`

- [ ] **Step 1: Write the failing desktop tests**

Add tests covering:
- `projectApi.current()` and `projectApi.rebind()` wrappers;
- `launch:directory` with same path does not call rebind;
- different path triggers rebind, waits for ack, then refreshes board;
- failed rebind keeps previous active project state.

```ts
it('rebinds on launch:directory only when directory changed', async () => {
  mockProjectApi.current.mockResolvedValueOnce({ ok: true, data: { directory: '/a' } });
  mockProjectApi.rebind.mockResolvedValueOnce({ ok: true, data: { directory: '/b', rebound: true } });

  await handleLaunchDirectory('/b');

  expect(mockProjectApi.rebind).toHaveBeenCalledWith('/b');
  expect(mockBoardRefresh).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run targeted tests and verify RED**

Run: `npx vitest run tests/desktop/rpc.test.ts tests/desktop/project-store.test.ts tests/desktop/stores.test.ts`

Expected: fail because `projectApi` and project-store orchestration do not exist.

- [ ] **Step 3: Implement minimal desktop project state**

Implementation requirements:
- add `projectApi.current()` → `rpcCall<{ directory: string }>('project.current')`;
- add `projectApi.rebind(directory)` → `rpcCall<{ directory: string; rebound: boolean }>('project.rebind', { directory })`;
- create a small project store with `getActiveProject()`, `initializeActiveProject()`, `handleLaunchDirectory()`;
- in App `onMount`, initialize active project from `project.current`, subscribe to `launch:directory`, and call rebind handler;
- keep board refresh out of `rpc.ts`; orchestration belongs in the project store / app layer.

- [ ] **Step 4: Run targeted tests and verify GREEN**

Run: `npx vitest run tests/desktop/rpc.test.ts tests/desktop/project-store.test.ts tests/desktop/stores.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/desktop/src/lib/stores/project.svelte.ts packages/desktop/src/lib/rpc.ts packages/desktop/src/lib/stores/board.svelte.ts packages/desktop/src/App.svelte tests/desktop/rpc.test.ts tests/desktop/project-store.test.ts tests/desktop/stores.test.ts
git commit -m "feat(desktop): add active project rebind flow"
```

---

### Task 4: Wire Tauri single-instance repeat-launch delivery

**Files:**
- Modify: `packages/desktop/src-tauri/Cargo.toml`
- Modify: `packages/desktop/src-tauri/src/main.rs`

- [ ] **Step 1: Write the failing Rust tests for repeat-launch behavior helpers**

Keep the already existing `parse_directory_from_args` tests as baseline. Add a **new** helper test only for repeat-launch behavior that is not already covered.

```rust
#[test]
fn maybe_launch_directory_event_returns_directory_for_repeat_launch() {
    let args = vec!["binary".into(), "--directory".into(), "/next/project".into()];
    assert_eq!(maybe_launch_directory_event(&args), Some("/next/project".to_string()));
}

fn maybe_launch_directory_event(args: &[String]) -> Option<String> {
    parse_directory_from_args(args)
}
```

- [ ] **Step 2: Run targeted Rust tests and verify RED when using new helper assertions**

Run: `cargo test`

Expected: fail for the newly added helper expectations or missing single-instance setup.

- [ ] **Step 3: Implement single-instance delivery**

Implementation requirements:
- add `tauri-plugin-single-instance` to `Cargo.toml`;
- register the plugin **before** other plugin/setup work;
- in the single-instance callback, parse incoming `args`, focus the main window if present, and emit `launch:directory` with the parsed directory;
- update `SidecarState.project_dir` when a new launch directory is accepted, so Rust-side state remains consistent with the active project;
- keep existing cold-start behavior intact.

Suggested shape:

```rust
.plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
    if let Some(dir) = parse_directory_from_args(&args) {
        let _ = app.emit("launch:directory", dir);
    }
}))
```

- [ ] **Step 4: Run Rust tests and verify GREEN**

Run: `cargo test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/desktop/src-tauri/Cargo.toml packages/desktop/src-tauri/src/main.rs
git commit -m "feat(desktop): deliver repeat launch args to running app"
```

---

### Task 5: End-to-end rebind verification and docs sync

**Files:**
- Modify: `tests/desktop/stores.test.ts`
- Modify: `tests/sidecar/project-methods.test.ts`
- Modify: `docs/kanban-plugin/LAUNCH_CONTRACT.md`
- Create: `.tasks/done/task-3.1.2-current-project-runtime-rebind.md`

- [ ] **Step 1: Write the failing integration-style tests**

Add tests for the final outcome:
- repeat launch switches active project without sidecar restart;
- `project.current` reflects the rebound root;
- same-directory launch is a no-op;
- old watcher no longer behaves as the active watcher after rebind.

```ts
it('project.current reflects the rebound root after repeat launch flow', async () => {
  await handleLaunchDirectory('/project-b');

  const current = await projectApi.current();
  expect(current).toEqual({ ok: true, data: { directory: '/project-b' } });
});
```

- [ ] **Step 2: Run targeted tests and verify RED**

Run: `npx vitest run tests/desktop/stores.test.ts tests/desktop/project-store.test.ts tests/sidecar/project-methods.test.ts`

Expected: fail until the final flow is fully wired.

- [ ] **Step 3: Implement final fixes and docs updates**

Update `LAUNCH_CONTRACT.md` to include:
- repeat-launch handling via single-instance delivery;
- `project.current` / `project.rebind` runtime contract;
- rule that frontend commits active project only after ack.

Write `.tasks/done/task-3.1.2-current-project-runtime-rebind.md` with:
- goal;
- files changed;
- tests run;
- follow-up implications for 3.1.3.

- [ ] **Step 4: Run full verification**

Run:
- `npx vitest run`
- `cargo test`

Expected: all tests pass, no regressions.

- [ ] **Step 5: Commit**

```bash
git add tests/desktop/stores.test.ts tests/desktop/project-store.test.ts tests/sidecar/project-methods.test.ts docs/kanban-plugin/LAUNCH_CONTRACT.md .tasks/done/task-3.1.2-current-project-runtime-rebind.md
git commit -m "feat: add current project runtime rebind without sidecar restart"
```

---

## Final Verification Checklist

- [ ] `project.current` returns the active runtime root.
- [ ] `project.rebind` no-ops on same directory.
- [ ] `project.rebind` updates runtime root only after successful watcher/bootstrap.
- [ ] `task.list` and `resources.discover` read from the updated runtime root after rebind.
- [ ] `resources.list` does not leak stale cached data from the previous project.
- [ ] Sidecar process is not restarted during project switch.
- [ ] Repeat launch in Tauri reaches the running window via single-instance callback.
- [ ] `project.current` and `project.rebind` are registered in the sidecar dispatcher.
- [ ] Frontend does not commit the new active project before rebind ack.
- [ ] Old watcher does not keep behaving as active after rebind.
- [ ] Rust `SidecarState.project_dir` stays consistent with accepted repeat-launch directory.
- [ ] `npx vitest run` passes.
- [ ] `cargo test` passes.

## Suggested Execution Order

1. Task 1 — introduce runtime root holder
2. Task 2 — add sidecar project RPC + watcher restart
3. Task 3 — add desktop project state and launch handling
4. Task 4 — add Tauri single-instance delivery
5. Task 5 — final verification and docs sync
