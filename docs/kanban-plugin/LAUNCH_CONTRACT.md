# Launch Contract: Plugin -> Companion App

This document defines the launch contract between the OpenCode plugin and the
OpenKanban desktop companion app. It covers argument passing, process lifecycle,
directory propagation to the sidecar, and duplicate-launch prevention.

## Overview

```
Plugin (OpenCode)                Desktop Binary (Tauri/Rust)        Sidecar (Node.js)
─────────────────                ───────────────────────────        ─────────────────
spawnDetached(binary,     ──>    parse_directory_arg()
  ["--directory", dir])          start_sidecar(path, dir)    ──>   process.cwd() == dir
                                 emit("launch:directory", dir)──>  Webview receives event
```

## 1. Plugin Side (Sender)

**File:** `packages/plugin/src/tools/open-board.ts`

The plugin spawns the desktop binary as a detached process:

```typescript
deps.spawnDetached(binary, ["--directory", deps.directory]);
```

### Arguments

| Position | Value              | Description                          |
| -------- | ------------------ | ------------------------------------ |
| 0        | `--directory`      | Flag indicating project directory    |
| 1        | `<absolute-path>`  | Absolute path to the project root    |

### Binary Resolution

**File:** `packages/plugin/src/plugin.ts`

The binary path is resolved via `resolveBinaryPath()`:

- **Location:** `~/.openkanban/bin/openkanban-desktop` (Unix) or
  `~/.openkanban/bin/openkanban-desktop.exe` (Windows)
- The plugin verifies the binary exists before spawning.

### Duplicate Launch Prevention

**File:** `packages/plugin/src/plugin.ts`

A lock file at `.tasks/.board-ui.lock` (relative to project root) prevents
duplicate launches:

1. Before spawning, the plugin calls `isLockActive(lockPath)`.
2. If the lock file exists, the tool returns early with a message that the board
   is already open.
3. The desktop app is responsible for creating and removing the lock file via the
   sidecar.

## 2. Desktop Side (Receiver)

**File:** `packages/desktop/src-tauri/src/main.rs`

### CLI Argument Parsing

The binary parses `--directory <path>` from `std::env::args()` at startup:

```rust
fn parse_directory_from_args(args: &[String]) -> Option<String> {
    args.windows(2)
        .find(|pair| pair[0] == "--directory")
        .map(|pair| pair[1].clone())
}
```

- Uses `std::env::args()` only (no external crate like `clap`).
- Returns `None` if `--directory` is missing or has no value.
- The parsed directory is stored in `SidecarState.project_dir`.

### Directory Propagation to Sidecar

The `start_sidecar` function sets `current_dir` on the spawned Node.js process:

```rust
fn start_sidecar(sidecar_path: &str, project_dir: Option<&str>) -> Result<Child, String> {
    let mut cmd = Command::new("node");
    cmd.arg(sidecar_path);
    if let Some(dir) = project_dir {
        cmd.current_dir(dir);
    }
    // ...
}
```

This means the sidecar's `process.cwd()` will be the project directory.

### Webview Notification

On startup, if a project directory was provided, the app emits a Tauri event:

```rust
if let Some(ref dir) = project_dir {
    let _ = app.handle().emit("launch:directory", dir);
}
```

The webview can listen for `launch:directory` to display or store the active
project path.

## 3. Sidecar Side (Consumer)

**File:** `packages/sidecar/src/index.ts`

The sidecar reads its project directory from `process.cwd()`:

```typescript
const projectDir = process.cwd();
```

No explicit argument parsing is needed in the sidecar -- the desktop binary
sets `current_dir` before spawning it.

## 4. Data Flow Summary

```
1. User invokes "open board" tool in OpenCode
2. Plugin reads input.directory (project root from OpenCode)
3. Plugin checks .tasks/.board-ui.lock -- if active, return early
4. Plugin resolves binary at ~/.openkanban/bin/openkanban-desktop[.exe]
5. Plugin calls spawnDetached(binary, ["--directory", directory])
6. Desktop binary starts, parses --directory from CLI args
7. Desktop stores project_dir in SidecarState
8. Desktop spawns sidecar with current_dir = project_dir
9. Sidecar uses process.cwd() as project root for all file operations
10. Desktop emits "launch:directory" event to webview
```

## 5. Error Handling

| Scenario                        | Behavior                                      |
| ------------------------------- | --------------------------------------------- |
| `--directory` flag missing      | Sidecar uses its own `cwd` (fallback)         |
| `--directory` path invalid      | Sidecar will fail on file operations           |
| Binary not found                | Plugin reports error to user                   |
| Lock file active                | Plugin reports board already open               |
| Sidecar spawn fails             | Desktop shows error dialog via Tauri           |

## 6. Test Coverage

### Plugin side

- `tests/unit/plugin/tools/open-board-tool.test.ts`: Verifies
  `spawnDetached` is called with `["--directory", "/project"]`.

### Desktop side (Rust)

- `packages/desktop/src-tauri/src/main.rs` (unit tests):
  - `parse_directory_from_args_extracts_path`: Happy path.
  - `parse_directory_from_args_returns_none_when_missing`: No flag.
  - `parse_directory_from_args_returns_none_when_no_value`: Flag without value.

## 7. Future Considerations

- **Project switching:** Currently one project per app instance. Future work
  (task 3.1.2+) may add project catalog and runtime rebinding.
- **Sidecar lifecycle:** Restarting vs multiplexing when switching projects
  is deferred to post-MVP.
- **Lock file cleanup:** The sidecar should clean up the lock file on graceful
  shutdown. Crash recovery may require stale-lock detection.
