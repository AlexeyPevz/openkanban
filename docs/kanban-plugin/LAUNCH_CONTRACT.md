# Launch Contract: Plugin -> Companion App

This document defines the launch and project-binding contract between the
OpenCode plugin and the OpenKanban desktop companion app.

It covers:

- initial launch argument passing;
- repeat launch delivery to an already-running app instance;
- runtime project rebinding in sidecar without sidecar process restart;
- duplicate-launch prevention on plugin side.

## Overview

```
Plugin (OpenCode)                  Desktop Binary (Tauri/Rust)            Sidecar (Node.js)
─────────────────                  ───────────────────────────             ─────────────────
spawnDetached(binary,       ──>    parse --directory on startup
  ["--directory", dir])            start sidecar with current_dir         initial runtime root

repeat launch with --directory ─>   single-instance callback in running app
                                    emit launch:directory(dir)      ──>   frontend calls project.rebind(dir)
                                                                       └─> updates runtime root + watcher
```

## 1. Plugin Side (Sender)

**Files:**

- `packages/plugin/src/tools/open-board.ts`
- `packages/plugin/src/plugin.ts`

The plugin launches desktop as detached process:

```ts
deps.spawnDetached(binary, ["--directory", deps.directory]);
```

### Arguments

| Position | Value             | Description                       |
| -------- | ----------------- | --------------------------------- |
| 0        | `--directory`     | project-root flag                 |
| 1        | `<absolute-path>` | absolute path of OpenCode project |

### Binary resolution

- Unix: `~/.openkanban/bin/openkanban-desktop`
- Windows: `~/.openkanban/bin/openkanban-desktop.exe`

### Duplicate launch guard

Plugin checks lock file at `.tasks/.board-ui.lock` before launching.
If lock is active, plugin returns early with "already open" response.

## 2. Desktop Side (Receiver)

**File:** `packages/desktop/src-tauri/src/main.rs`

### Startup parsing

Desktop parses `--directory` from CLI args using `std::env::args()`:

```rust
fn parse_directory_from_args(args: &[String]) -> Option<String> {
    args.windows(2)
        .find(|pair| pair[0] == "--directory")
        .map(|pair| pair[1].clone())
}
```

No `clap` dependency is used.

### Cold start behavior

On first launch:

1. parsed directory is stored in `SidecarState.project_dir`;
2. sidecar is spawned with `current_dir(parsed_directory)`;
3. desktop emits `launch:directory` to webview.

### Repeat launch behavior (single-instance)

Desktop registers Tauri single-instance plugin.

When user triggers a second launch while app is already running:

1. second process forwards args to running instance;
2. running instance parses forwarded `--directory`;
3. updates `SidecarState.project_dir`;
4. emits `launch:directory` event to frontend;
5. focuses main window (best effort).

This avoids opening a second independent runtime.

## 3. Frontend Side (Coordinator)

**Files:**

- `packages/desktop/src/App.svelte`
- `packages/desktop/src/lib/stores/project.svelte.ts`

Frontend listens for `launch:directory` and coordinates switch via RPC:

1. receives launch target directory;
2. if directory equals current active project -> no-op;
3. otherwise calls `project.rebind`;
4. commits active project state only after success ack;
5. refreshes board.

## 4. Sidecar Side (Runtime project binding)

**Files:**

- `packages/sidecar/src/runtime.ts`
- `packages/sidecar/src/methods/project.ts`
- `packages/sidecar/src/server.ts`

Sidecar uses runtime project binding (`runtime.current`) as source of truth
for repository/discovery/watcher operations.

`process.cwd()` is now only initial bootstrap value.

### RPC methods

#### `project.current`

Request:

```json
{}
```

Response:

```json
{ "directory": "/abs/project/path" }
```

#### `project.rebind`

Request:

```json
{ "directory": "/abs/new/project/path" }
```

Success response:

```json
{ "directory": "/abs/new/project/path", "rebound": true }
```

No-op response for same directory:

```json
{ "directory": "/abs/current/project/path", "rebound": false }
```

### Rebind semantics

- validate target path;
- restart watcher for new root (without sidecar process restart);
- update runtime current root only after successful watcher restart;
- keep previous root if restart fails.

## 4.1 Initial root resolution (ambiguity removed)

Initial sidecar project root now follows explicit precedence:

1. `OPENKANBAN_PROJECT_DIR` environment variable (set by desktop on cold start)
2. `process.cwd()` fallback

This removes ambiguity between launch path and runtime cwd at startup.

Desktop sets both on cold start:

- `current_dir(projectDir)`
- `OPENKANBAN_PROJECT_DIR=projectDir`

Sidecar bootstrap resolves initial root with:

```ts
resolveInitialProjectRoot({ env: process.env, cwd: process.cwd() })
```

So startup behavior is deterministic even if cwd and launch intent diverge.

## 5. Data Flow Summary

### Scenario A: cold start

1. plugin launches desktop with `--directory`;
2. desktop starts sidecar with `current_dir` = directory;
3. frontend initializes active project via `project.current`;
4. board loads from that project.

### Scenario B: app already running

1. plugin launches desktop with another `--directory`;
2. single-instance callback on running app receives forwarded args;
3. desktop emits `launch:directory`;
4. frontend calls `project.rebind`;
5. sidecar rebinds watcher/runtime root;
6. frontend refreshes board and updates active project.

## 6. Error Handling

| Scenario                                 | Behavior |
| ---------------------------------------- | -------- |
| `--directory` missing                    | fallback to startup root resolution (`OPENKANBAN_PROJECT_DIR` -> `cwd`) |
| `project.rebind` same directory          | no-op (`rebound: false`) |
| invalid rebind directory                 | RPC error, keep previous active project |
| watcher restart fails on rebind          | RPC error, keep previous active project |
| binary not found                         | plugin reports launch error |
| sidecar spawn fails on cold start        | desktop startup fails with error |

## 7. Test Coverage

### Plugin

- `tests/unit/plugin/tools/open-board-tool.test.ts`
  - validates `spawnDetached(..., ["--directory", "/project"])`
- `tests/integration/launch/plugin-opened-board-root.test.ts`
  - validates plugin `--directory` launch arg is used as sidecar initial root input

### Desktop Rust

- `packages/desktop/src-tauri/src/main.rs` unit tests:
  - `parse_directory_from_args_extracts_path`
  - `parse_directory_from_args_returns_none_when_missing`
  - `parse_directory_from_args_returns_none_when_no_value`
  - `maybe_launch_directory_event_returns_directory_for_repeat_launch`

### Sidecar

- `tests/sidecar/project-methods.test.ts`
  - runtime-root reads after mutation (`board.load`, `task.list`, `resources.discover`)
  - `project.current`
  - `project.rebind` success / no-op / failure behavior
  - no stale resource-cache leakage after runtime root switch

### Desktop frontend

- `tests/desktop/rpc.test.ts`
  - `projectApi.current` / `projectApi.rebind` wrappers
- `tests/desktop/project-store.test.ts`
  - launch-directory same-path no-op
  - rebind + refresh on changed path
  - keep previous active project on rebind failure

## 8. Current boundaries

In scope now:

- one active project at a time;
- runtime rebind without sidecar process restart;
- launch-driven switching via `--directory`.

Out of scope (next slices):

- project picker UI;
- known-projects catalog;
- multi-project board/session.
