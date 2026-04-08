# M2: Tauri Desktop Kanban — Design Spec

**Date:** 2026-04-07
**Status:** approved
**Depends on:** M1 monorepo + plugin (complete, main at 8077ae2)
**Supersedes:** desktop sections of 2026-04-07-kanban-dual-architecture-design.md

## Overview

M2 delivers a standalone Tauri desktop application with a visual kanban board. Users and agents see the same board. Drag & drop moves tasks, file-system changes appear in real-time, and resources (agents, skills, MCPs, tools) can be assigned to task cards from a unified registry.

### Product Requirements

1. **Visual kanban board** — columns per status, draggable cards
2. **Live sync** — `.tasks/` file changes reflect instantly (agent moves task → board updates)
3. **Bidirectional** — humans drag cards, agents call plugin tools — same `.tasks/` files
4. **Resource assignment** — browse and assign agents, skills, MCPs, tools to tasks
5. **Adaptive theming** — UI inherits colors/fonts from host application via CSS custom properties
6. **Keyboard navigation** — full board navigation without mouse
7. **Node sidecar** — Tauri spawns Node process running core library; JSON-RPC over stdin/stdout

### Key Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Svelte 5 for webview | Reactive state (live updates), compiles to vanilla JS, Tauri-recommended, staged files port 1:1 to components |
| D2 | Node sidecar via stdin/stdout JSON-RPC | Core depends on chokidar + Node fs; no rewrite needed; entire core works as-is |
| D3 | Approach C: Unified ResourceRecord + backward compatible | Does not break M1 plugin; one UI for all resource kinds; legacy fields preserved |
| D4 | Keyboard shortcuts in M2 | Staged file exists; cheap to port as Svelte action |

## Monorepo Structure (after M2)

```
openkanban/
├── packages/
│   ├── core/                         # shared domain — extended with resources
│   │   ├── src/
│   │   │   ├── resources/            # 🆕 ResourceRecord, normalize, registry
│   │   │   └── ...existing modules
│   │   └── package.json
│   │
│   ├── plugin/                       # OpenCode headless plugin — unchanged
│   │   └── ...
│   │
│   ├── sidecar/                      # 🆕 Node JSON-RPC server
│   │   ├── src/
│   │   │   ├── server.ts             # stdin/stdout JSON-RPC handler
│   │   │   ├── watcher.ts            # chokidar → push notifications
│   │   │   └── methods/              # RPC method handlers
│   │   │       ├── board.ts          # board.load
│   │   │       ├── task.ts           # task.create, task.move, task.get, task.update
│   │   │       └── resources.ts      # resources.list, resources.assign, resources.unassign
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── desktop/                      # 🆕 Tauri app (Rust + Svelte 5)
│   │   ├── src-tauri/
│   │   │   ├── Cargo.toml
│   │   │   ├── tauri.conf.json
│   │   │   ├── src/
│   │   │   │   ├── main.rs           # Tauri entry, sidecar management
│   │   │   │   ├── sidecar.rs        # Spawn/kill Node process, stdin/stdout bridge
│   │   │   │   └── commands.rs       # Tauri IPC commands (proxy to sidecar)
│   │   │   └── icons/
│   │   ├── src/                      # Svelte 5 frontend
│   │   │   ├── App.svelte
│   │   │   ├── main.ts
│   │   │   ├── lib/
│   │   │   │   ├── components/
│   │   │   │   │   ├── Board.svelte
│   │   │   │   │   ├── Column.svelte
│   │   │   │   │   ├── Card.svelte
│   │   │   │   │   ├── TaskDetails.svelte
│   │   │   │   │   ├── TaskForm.svelte
│   │   │   │   │   ├── ResourcePicker.svelte
│   │   │   │   │   ├── ResourceBadge.svelte
│   │   │   │   │   └── ThemeProvider.svelte
│   │   │   │   ├── stores/
│   │   │   │   │   ├── board.ts      # Svelte store: board state, tasks
│   │   │   │   │   ├── resources.ts  # Svelte store: available resources
│   │   │   │   │   └── theme.ts      # Svelte store: CSS custom properties
│   │   │   │   ├── actions/
│   │   │   │   │   ├── draggable.ts  # use:draggable Svelte action
│   │   │   │   │   ├── droptarget.ts # use:droptarget Svelte action
│   │   │   │   │   └── shortcuts.ts  # use:shortcuts Svelte action
│   │   │   │   └── rpc/
│   │   │   │       └── client.ts     # Tauri invoke() wrapper → JSON-RPC
│   │   │   └── app.css               # CSS custom property definitions
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── svelte.config.js
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── desktop-staging/              # 🗑️ deleted after port to desktop/
│
├── package.json                      # workspace root: packages/*
├── tsconfig.json
└── vitest.config.ts
```

### Package Roles (updated)

| Package | Role | Runtime |
|---------|------|---------|
| `@openkanban/core` | Types, schemas, transitions, repository, watch, bridge, **resources** | Node (isomorphic) |
| `@openkanban/plugin` | OpenCode plugin entry, 6 tools (unchanged) | Node (OpenCode sandbox) |
| `@openkanban/sidecar` | JSON-RPC server wrapping core; chokidar file watcher | Node (child process) |
| `@openkanban/desktop` | Tauri shell + Svelte 5 webview; sidecar management | Rust + Browser |

## 1. Resource Model (core extension)

### New Types

```ts
// packages/core/src/resources/types.ts

export const RESOURCE_KINDS = ["agent", "skill", "mcp", "tool"] as const
export type ResourceKind = (typeof RESOURCE_KINDS)[number]

export interface ResourceRecord {
  id: string
  kind: ResourceKind
  label?: string
  description?: string
}

export interface ResourceAssignment {
  resource_id: string
  kind: ResourceKind
}
```

### New Schemas

```ts
// packages/core/src/resources/schemas.ts

export const ResourceKindSchema = z.enum(RESOURCE_KINDS)

export const ResourceRecordSchema = z.object({
  id: z.string().min(1),
  kind: ResourceKindSchema,
  label: z.string().optional(),
  description: z.string().optional(),
})

export const ResourceAssignmentSchema = z.object({
  resource_id: z.string().min(1),
  kind: ResourceKindSchema,
})
```

### TaskCard Extension (backward compatible)

```ts
// packages/core/src/types.ts — extended

export interface TaskCard {
  // ...all existing fields preserved...
  required_agents?: string[]           // legacy — continues to work
  required_skills?: string[]           // legacy — continues to work
  resources?: ResourceAssignment[]     // 🆕 unified, preferred for new resources
}
```

The `resources` field is **additive**. Existing `.tasks/*.md` files with `required_agents` and `required_skills` YAML frontmatter continue to parse correctly. New resource types (mcp, tool) use the `resources` field.

### Normalization

```ts
// packages/core/src/resources/normalize.ts

export function normalizeResources(task: TaskCard): ResourceAssignment[] {
  const result: ResourceAssignment[] = []
  const seen = new Set<string>()

  // Legacy fields → ResourceAssignment
  for (const id of task.required_agents ?? []) {
    const key = `agent:${id}`
    if (!seen.has(key)) {
      result.push({ resource_id: id, kind: "agent" })
      seen.add(key)
    }
  }

  for (const id of task.required_skills ?? []) {
    const key = `skill:${id}`
    if (!seen.has(key)) {
      result.push({ resource_id: id, kind: "skill" })
      seen.add(key)
    }
  }

  // Explicit resources (may include mcp, tool, or override agent/skill)
  for (const r of task.resources ?? []) {
    const key = `${r.kind}:${r.resource_id}`
    if (!seen.has(key)) {
      result.push(r)
      seen.add(key)
    }
  }

  return result
}
```

### Preflight Extension

The existing preflight checks `availableAgents` and `availableSkills`. Extended to also accept `availableResources: ResourceRecord[]` for unified checking:

```ts
// packages/core/src/preflight/run-preflight.ts — extended

// New: check all resource assignments against available resources
const required = normalizeResources(task)
const missing = required.filter(r =>
  !availableResources.some(ar => ar.id === r.resource_id && ar.kind === r.kind)
)
if (missing.length > 0) {
  return block(`Missing resources: ${missing.map(r => `${r.kind}:${r.resource_id}`).join(", ")}`)
}
```

The legacy `availableAgents`/`availableSkills` string arrays continue to work. When `availableResources` is provided, it takes precedence.

### Resource Registry

```ts
// packages/core/src/resources/registry.ts

export interface ResourceRegistry {
  resources: ResourceRecord[]
}

export function filterByKind(
  registry: ResourceRegistry,
  kind: ResourceKind,
): ResourceRecord[] {
  return registry.resources.filter(r => r.kind === kind)
}

export function findResource(
  registry: ResourceRegistry,
  id: string,
  kind: ResourceKind,
): ResourceRecord | undefined {
  return registry.resources.find(r => r.id === id && r.kind === kind)
}
```

### Core Barrel Export

```ts
// packages/core/src/index.ts — additions

// === Resources ===
export type { ResourceKind, ResourceRecord, ResourceAssignment, ResourceRegistry } from "./resources/types.js"
export { RESOURCE_KINDS } from "./resources/types.js"
export { ResourceRecordSchema, ResourceAssignmentSchema, ResourceKindSchema } from "./resources/schemas.js"
export { normalizeResources } from "./resources/normalize.js"
export { filterByKind, findResource } from "./resources/registry.js"
```

### Relationship to Existing AgentRecord / AgentRegistry

The existing `AgentRecord { id, label }` and `AgentRegistry { local, host, ad_hoc }` in `contracts.ts` are **not removed**. They continue to serve the board-level agent registry stored in `board.yml`.

The new `ResourceRecord` is a **superset** concept used by the desktop UI. The sidecar's `resources.list` method merges:
- `AgentRegistry` from `board.yml` → `ResourceRecord[]` with `kind: "agent"`
- Discovered skills → `ResourceRecord[]` with `kind: "skill"`
- Discovered MCPs → `ResourceRecord[]` with `kind: "mcp"`
- Discovered tools → `ResourceRecord[]` with `kind: "tool"`

## 2. Sidecar (Node JSON-RPC Server)

### Purpose

The sidecar is a long-running Node.js process that:
1. Wraps `@openkanban/core` in a JSON-RPC 2.0 interface
2. Watches `.tasks/` via chokidar and pushes change notifications
3. Discovers available resources from the project/host

### Transport

- **stdin/stdout** — newline-delimited JSON-RPC 2.0
- Tauri spawns sidecar via `Command::new("node").args(["sidecar/dist/server.js", "--directory", dir])`
- One sidecar per board (one per `.tasks/` directory)

### JSON-RPC Protocol

#### Requests (webview → sidecar, via Tauri commands)

| Method | Params | Result | Description |
|--------|--------|--------|-------------|
| `board.load` | `{}` | `{ board, tasks, diagnostics }` | Load full board state |
| `task.get` | `{ id }` | `TaskCard \| null` | Get single task |
| `task.create` | `{ title, status?, priority?, ... }` | `TaskCard` | Create new task |
| `task.move` | `{ id, targetStatus }` | `TaskCard` | Move task with preflight + contract |
| `task.update` | `{ id, patch }` | `TaskCard` | Update task metadata |
| `resources.list` | `{ kind?, refresh? }` | `ResourceRecord[]` | List available resources |
| `resources.assign` | `{ taskId, resource_id, kind }` | `TaskCard` | Assign resource to task |
| `resources.unassign` | `{ taskId, resource_id, kind }` | `TaskCard` | Remove resource from task |

#### Notifications (sidecar → webview, via Tauri events)

| Method | Data | Description |
|--------|------|-------------|
| `board.changed` | `{ board, tasks, diagnostics }` | Full board reload after file change |
| `task.changed` | `{ task, changeType }` | Single task added/modified/deleted |

### Lifecycle

1. Tauri app starts → spawns sidecar with `--directory <path>`
2. Sidecar initializes core, loads board, starts chokidar watcher
3. Sidecar sends `ready` notification when initialized
4. Tauri proxies all webview `invoke()` calls to sidecar via stdin
5. Sidecar responses come back on stdout → Tauri returns to webview
6. File changes → chokidar → sidecar pushes `board.changed` notification → Tauri emits event to webview
7. Tauri app closes → sends SIGTERM to sidecar → sidecar cleans up watcher

### Error Handling

- JSON-RPC errors use standard error codes (-32600 to -32603)
- Application errors use codes 1000+
- Sidecar crash → Tauri detects via process exit → shows error in UI, offers restart

## 3. Tauri Shell (Rust)

### Responsibilities

1. **Window management** — single window, titlebar, resize
2. **Sidecar lifecycle** — spawn, monitor, restart on crash
3. **IPC bridge** — proxy webview `invoke()` to sidecar stdin, return stdout response
4. **Event bridge** — forward sidecar notifications as Tauri events to webview
5. **CLI args** — accept `--directory <path>` to know which project to open

### Tauri Commands (IPC)

```rust
// src-tauri/src/commands.rs

#[tauri::command]
async fn rpc_call(method: String, params: Value, state: State<SidecarState>) -> Result<Value, String>

// Webview calls: invoke("rpc_call", { method: "board.load", params: {} })
// Command forwards to sidecar stdin, waits for response on stdout, returns
```

### Sidecar Management

```rust
// src-tauri/src/sidecar.rs

pub struct SidecarState {
    child: Mutex<Option<Child>>,
    // stdin/stdout handles for JSON-RPC
}

impl SidecarState {
    pub fn spawn(directory: &str) -> Result<Self, Error>
    pub async fn call(&self, method: &str, params: Value) -> Result<Value, Error>
    pub fn kill(&self) -> Result<(), Error>
}
```

### Configuration

```json
// src-tauri/tauri.conf.json
{
  "app": {
    "windows": [{
      "title": "OpenKanban",
      "width": 1200,
      "height": 800,
      "minWidth": 800,
      "minHeight": 600
    }]
  },
  "bundle": {
    "identifier": "dev.openkanban.desktop"
  }
}
```

## 4. Svelte 5 Frontend

### Component Architecture

```
App.svelte
└── ThemeProvider.svelte           # Injects CSS custom properties
    └── Board.svelte               # Main board, subscribes to board store
        ├── TaskForm.svelte        # Create task form (top of board)
        ├── Column.svelte          # Per-status column (use:droptarget)
        │   └── Card.svelte        # Task card (use:draggable)
        │       └── ResourceBadge.svelte  # Resource chip (icon + label)
        ├── TaskDetails.svelte     # Slide-out detail panel
        │   └── ResourcePicker.svelte     # Browse/assign resources
        └── (diagnostics banner)
```

### Component Mapping (from desktop-staging)

| Staging file | Svelte component | Port notes |
|---|---|---|
| `view/render-board.ts` | `Board.svelte` | ViewState → reactive `$board` store; switch on `$board.state` |
| `view/render-column.ts` | `Column.svelte` | Props: `column`, `tasks`; `use:droptarget` action |
| `view/render-card.ts` | `Card.svelte` | Props: `task`; `use:draggable`; shows `ResourceBadge` per resource |
| `view/render-details.ts` | `TaskDetails.svelte` | Props: `task`; slide-out panel; contains `ResourcePicker` |
| `view/render-task-form.ts` | `TaskForm.svelte` | Two-way binding for form fields; calls `task.create` RPC |
| `interactions/drag-drop.ts` | `actions/draggable.ts` + `actions/droptarget.ts` | Svelte actions; validation logic stays in core `canTransition` |
| `interactions/keyboard-shortcuts.ts` | `actions/shortcuts.ts` | Svelte action `use:shortcuts`; configurable keymap |
| `interactions/details-panel.ts` | Merged into `TaskDetails.svelte` | Toggle via store |
| `interactions/task-form.ts` | Merged into `TaskForm.svelte` | Form logic in component |
| (new) | `ResourcePicker.svelte` | Tabbed by kind; search/filter; click to assign |
| (new) | `ResourceBadge.svelte` | Chip: icon per kind + label; click to remove |
| (new) | `ThemeProvider.svelte` | Sets CSS custom properties on root element |

### Svelte Stores

```ts
// stores/board.ts
import { writable } from "svelte/store"
import type { BoardViewState } from "@openkanban/core"

export const board = writable<BoardViewState>({ state: "loading" })

// Updated by:
// 1. Initial load: rpc("board.load") → board.set({ state: "success", ... })
// 2. Tauri events: listen("board.changed", data => board.set({ state: "success", ...data }))
```

```ts
// stores/resources.ts
import { writable } from "svelte/store"
import type { ResourceRecord } from "@openkanban/core"

export const availableResources = writable<ResourceRecord[]>([])

// Loaded on init: rpc("resources.list") → availableResources.set(result)
```

```ts
// stores/theme.ts
import { writable } from "svelte/store"

export interface ThemeVars {
  "--kanban-bg": string
  "--kanban-bg-surface": string
  "--kanban-text": string
  "--kanban-text-muted": string
  "--kanban-border": string
  "--kanban-accent": string
  "--kanban-accent-text": string
  "--kanban-font-family": string
  "--kanban-font-size": string
  "--kanban-radius": string
  // per-status colors
  "--kanban-status-planned": string
  "--kanban-status-active": string
  "--kanban-status-review": string
  "--kanban-status-done": string
  "--kanban-status-blocked": string
  "--kanban-status-parked": string
  "--kanban-status-cancelled": string
}

export const theme = writable<ThemeVars>(defaultTheme)
```

### Svelte Actions

```ts
// actions/draggable.ts
// use:draggable={{ task }}
// Sets dataTransfer with task id on dragstart
// Adds visual drag feedback CSS class

// actions/droptarget.ts
// use:droptarget={{ column, onDrop }}
// Validates canTransition before accepting drop
// Calls onDrop(taskId, targetStatus) which invokes task.move RPC

// actions/shortcuts.ts
// use:shortcuts={keymap}
// Listens for keyboard events on the board container
// Default keymap defined in component, overridable
```

### RPC Client

```ts
// rpc/client.ts
import { invoke } from "@tauri-apps/api/core"

export async function rpc<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  return invoke<T>("rpc_call", { method, params })
}
```

## 5. Theming / Adaptive CSS

### Design Principle

The UI uses **zero hardcoded colors**. Every visual property comes from CSS custom properties (variables). The host application provides a theme preset, and the kanban board adapts.

### How It Works

1. Tauri app receives `--host <name>` CLI arg (e.g., `opencode`, `claude-code`, `vscode`)
2. App loads corresponding theme preset from `themes/<name>.json`
3. `ThemeProvider.svelte` sets CSS custom properties on the root `<div>`
4. All components use `var(--kanban-*)` exclusively
5. Fallback: if no host specified, use system `prefers-color-scheme` to pick light/dark default

### Theme Presets

```json
// themes/opencode.json (black & white)
{
  "--kanban-bg": "#000000",
  "--kanban-bg-surface": "#111111",
  "--kanban-text": "#ffffff",
  "--kanban-text-muted": "#888888",
  "--kanban-border": "#333333",
  "--kanban-accent": "#ffffff",
  "--kanban-accent-text": "#000000",
  "--kanban-font-family": "'JetBrains Mono', monospace",
  "--kanban-font-size": "13px",
  "--kanban-radius": "4px"
}
```

### Component Example

```svelte
<!-- Card.svelte -->
<article
  class="card"
  use:draggable={{ task }}
  data-task-id={task.id}
>
  <h3>{task.title}</h3>
  <p class="status">{task.status}</p>
  {#each resources as r}
    <ResourceBadge {r} />
  {/each}
</article>

<style>
  .card {
    background: var(--kanban-bg-surface);
    color: var(--kanban-text);
    border: 1px solid var(--kanban-border);
    border-radius: var(--kanban-radius);
    font-family: var(--kanban-font-family);
    font-size: var(--kanban-font-size);
    padding: 0.75rem;
  }
  .status {
    color: var(--kanban-text-muted);
  }
</style>
```

## 6. Resource Discovery

The sidecar discovers available resources at startup and caches them. The cache refreshes on file changes or explicit `resources.list({ refresh: true })`.

### Discovery Sources

| Kind | Source | Method |
|------|--------|--------|
| `agent` | `board.yml` → `agent_registry` | Parse YAML, merge local/host/ad_hoc via existing `mergeAgentSources()` |
| `agent` | `AGENTS.md` | Parse markdown table rows with agent role definitions |
| `skill` | `skills/` directory | Glob `skills/*/SKILL.md`, extract name from frontmatter or dirname |
| `skill` | `.config/opencode/skills/` | Same glob pattern for global skills |
| `mcp` | `opencode.json` → `mcpServers` | Read JSON, extract server names and descriptions |
| `tool` | MCP server tool lists | At sidecar startup, list tools from known MCP servers (best-effort, non-blocking) |

### Discovery Module

```ts
// packages/sidecar/src/methods/resources.ts

export async function discoverResources(rootDir: string): Promise<ResourceRecord[]> {
  const [agents, skills, mcps, tools] = await Promise.allSettled([
    discoverAgents(rootDir),
    discoverSkills(rootDir),
    discoverMcps(rootDir),
    discoverTools(rootDir),
  ])

  return [
    ...(agents.status === "fulfilled" ? agents.value : []),
    ...(skills.status === "fulfilled" ? skills.value : []),
    ...(mcps.status === "fulfilled" ? mcps.value : []),
    ...(tools.status === "fulfilled" ? tools.value : []),
  ]
}
```

Each discovery function is **best-effort** — if a source is missing (no `AGENTS.md`, no `opencode.json`), it returns an empty array, not an error. Tool discovery from MCP servers is async and may populate after initial load.

## 7. Keyboard Shortcuts

### Default Keymap

| Key | Action | Context |
|-----|--------|---------|
| `ArrowLeft` / `ArrowRight` | Move focus between columns | Board focused |
| `ArrowUp` / `ArrowDown` | Move focus between cards in column | Column focused |
| `Enter` | Open task details panel | Card focused |
| `Escape` | Close details panel / cancel form | Panel or form open |
| `n` | Open new task form | Board focused, no input focused |
| `m` then `ArrowLeft` | Move focused task one column left | Card focused |
| `m` then `ArrowRight` | Move focused task one column right | Card focused |
| `/` | Focus search/filter (future) | Board focused |

### Implementation

```ts
// actions/shortcuts.ts

export interface ShortcutMap {
  [key: string]: (event: KeyboardEvent) => void
}

export function shortcuts(node: HTMLElement, keymap: ShortcutMap) {
  function handler(event: KeyboardEvent) {
    // Skip if user is typing in an input/textarea
    if (isInputFocused(event)) return

    const action = keymap[event.key]
    if (action) {
      event.preventDefault()
      action(event)
    }
  }

  node.addEventListener("keydown", handler)

  return {
    destroy() {
      node.removeEventListener("keydown", handler)
    },
    update(newKeymap: ShortcutMap) {
      keymap = newKeymap
    },
  }
}
```

The `use:shortcuts` action is applied to the board root element. Focus management uses `tabindex` and `aria-activedescendant` for accessibility.

## 8. Data Flow

### Full Request-Response Cycle

```
User drags Card from "planned" → "active"

1. Card.svelte        dragstart → sets dataTransfer { taskId }
2. Column.svelte      dragover → validates canTransition(planned, active)
3. Column.svelte      drop → calls onDrop(taskId, "active")
4. Board.svelte       onDrop handler → rpc("task.move", { id, targetStatus: "active" })
5. rpc/client.ts      invoke("rpc_call", { method: "task.move", params })
6. Rust commands.rs    writes JSON-RPC to sidecar stdin
7. Node server.ts     receives request, calls handleTaskMove()
8. methods/task.ts    core.canTransition() → core.runPreflight() → core.enforceKanbanContract()
                      → core.writeTaskStatus() → writes .tasks/task-XXX.md
9.                    returns updated TaskCard
10. Rust commands.rs   reads stdout response, returns to webview
11. Board.svelte       updates board store with new task state

Meanwhile:
12. chokidar           detects .tasks/task-XXX.md changed
13. watcher.ts         pushes board.changed notification on stdout
14. Rust sidecar.rs    emits Tauri event "board-changed"
15. Board.svelte       listens for event → refreshes board store
    (deduplicated — if task.move response already applied the change, event is a no-op)
```

### Agent Moves a Task (headless plugin)

```
Agent calls kanban_move_task via plugin

1. plugin/tools/move-task.ts    core.writeTaskStatus() → writes .tasks/task-XXX.md
2. chokidar                      detects file change
3. sidecar/watcher.ts            pushes board.changed notification
4. Rust sidecar.rs               emits Tauri event
5. Svelte Board.svelte           updates store → card moves to new column
```

## 9. Accessibility

### WCAG AA Compliance

- All interactive elements have ARIA labels
- Keyboard navigation covers full board (no mouse required)
- Focus indicators visible on all focusable elements
- Color is never the only indicator (status text + color)
- Drag & drop has keyboard alternative (`m` + arrow keys)
- Details panel and form are focus-trapped when open
- Live regions (`aria-live`) for board updates and diagnostics

### Semantic Structure

```
region[aria-label="Board Title"]
├── h1 "Board Title"
├── section[role="status"] (diagnostics, if any)
└── div[aria-label="Board Title columns"]
    ├── section[aria-label="planned"] (Column)
    │   ├── h2 "planned (3)"
    │   └── article[aria-labelledby] (Card) × N
    │       ├── h3 "Task Title"
    │       ├── p "Status: planned"
    │       ├── ResourceBadge × N
    │       └── button "Open details"
    ├── section[aria-label="active"] ...
    └── ...
```

## 10. Build & Dev

### Development

```bash
# Install all dependencies
npm install

# Dev mode (sidecar + Tauri + Svelte hot reload)
npm run dev:desktop
# Internally:
#   1. tsc --watch on packages/core
#   2. tsc --watch on packages/sidecar
#   3. cargo tauri dev (starts Rust + Vite dev server)
```

### Production Build

```bash
npm run build:core       # tsc → packages/core/dist/
npm run build:sidecar    # tsc → packages/sidecar/dist/ + bundle to single file
npm run build:desktop    # vite build + cargo tauri build → platform binary

# Output:
# packages/desktop/src-tauri/target/release/bundle/
#   Windows: openkanban_x.y.z_x64-setup.exe
#   macOS:   openkanban_x.y.z_aarch64.dmg
#   Linux:   openkanban_x.y.z_amd64.AppImage
```

### Sidecar Bundling

The sidecar is bundled into a single `.js` file (via esbuild or similar) and included in the Tauri binary's resource directory. At runtime, Tauri runs `node <resource>/sidecar.js --directory <path>`.

**Alternative:** If the target machine doesn't have Node installed, the sidecar can be bundled with a Node runtime via `pkg` or Tauri's sidecar feature with a Node binary. This is a M3 optimization — for M2, Node is a prerequisite.

### Tests

```bash
npm test                 # vitest across all packages
```

New test files for M2:
- `tests/unit/core/resources/normalize.test.ts`
- `tests/unit/core/resources/registry.test.ts`
- `tests/unit/sidecar/server.test.ts`
- `tests/unit/sidecar/methods/*.test.ts`
- `tests/integration/sidecar-rpc.test.ts` (spawn sidecar, send requests, verify responses)

Svelte component tests via `@testing-library/svelte` (stretch goal, not blocking).

## 11. Migration from desktop-staging

After all 9 staged files are ported to Svelte components:

1. Verify all functionality is covered by new components
2. Delete `packages/desktop-staging/` directory
3. Remove from `tsconfig.json` references (if any)
4. Update workspace `package.json` if `desktop-staging` was listed

## 12. Constraints & Non-Goals

### In Scope (M2)

- Tauri desktop app with Svelte 5 webview
- Node sidecar with JSON-RPC
- Visual kanban board: columns, cards, drag & drop
- Live file-watching with auto-refresh
- Task CRUD (create, read, update, move)
- Resource assignment UI (agents, skills, MCPs, tools)
- Adaptive theming via CSS custom properties
- Keyboard navigation
- Accessibility (WCAG AA)

### Out of Scope (M3+)

- Mobile app (Tauri v2 mobile)
- Sending prompts/commands to agents from the board
- Multi-project support (switching between `.tasks/` directories)
- Filters / search / sorting
- Board customization (reorder columns, custom statuses)
- GitHub Releases with platform binaries (CI/CD pipeline)
- Bundled Node runtime (Node is a prerequisite for M2)
- Plugin changes (M1 plugin is untouched)
- User authentication / multi-user

## 13. Milestones (updated)

| # | Milestone | Scope | Status |
|---|-----------|-------|--------|
| **M1** | Monorepo + plugin | Restructure, 6 tools, tests, README, GitHub | ✅ Complete |
| **M2** | Desktop MVP | Tauri + Svelte + sidecar + resources + theming + keyboard | 🔜 This spec |
| **M3** | Polish + Distribution | CI/CD, bundled Node, GitHub Releases, filters, multi-project | Future |
| **M4** | Mobile + Agent commands | Tauri v2 mobile, prompt agents from board | Future |
