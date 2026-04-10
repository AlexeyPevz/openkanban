# Task 3.1.1: Launch Contract — Plugin -> Companion App

**Status:** done
**Milestone:** 3 — OpenCode companion integration
**Slice:** 3.1 — Launch and current project binding

## What was done

1. **Rust CLI parsing** (`packages/desktop/src-tauri/src/main.rs`):
   - Added `parse_directory_from_args()` — pure function for testable arg extraction
   - Added `parse_directory_arg()` — wrapper using `std::env::args()`
   - No external crate (`clap`) — uses only `std::env::args()` + `.windows(2)`

2. **Directory propagation to sidecar**:
   - `start_sidecar(path, project_dir)` now accepts optional directory
   - Sets `cmd.current_dir(dir)` so sidecar's `process.cwd()` is the project dir

3. **State storage**:
   - Added `project_dir: Mutex<Option<String>>` to `SidecarState`
   - Parsed on startup in `main()`, stored in managed state

4. **Webview notification**:
   - Emits `launch:directory` Tauri event to webview on startup if directory is set

5. **Unit tests** (3 new Rust tests):
   - `parse_directory_from_args_extracts_path` — happy path
   - `parse_directory_from_args_returns_none_when_missing` — no flag
   - `parse_directory_from_args_returns_none_when_no_value` — flag without value

6. **Documentation**:
   - Created `docs/kanban-plugin/LAUNCH_CONTRACT.md` — full contract specification

## Verification

- `cargo test` — 5/5 passed (2 existing + 3 new)
- `npx vitest run` — 173 passed, 10 skipped, 0 failed (no regressions)

## Files changed

- `packages/desktop/src-tauri/src/main.rs` — CLI parsing, sidecar dir, state, webview emit
- `docs/kanban-plugin/LAUNCH_CONTRACT.md` — contract documentation (new)
- `.tasks/done/task-3.1.1-launch-contract.md` — this file (new)

## What's next

- Task 3.1.2: Current-project default binding (deterministic)
- Task 3.1.3: Project catalog and manual project switching
