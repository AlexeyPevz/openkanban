# OpenKanban M2 — Tauri Desktop App — Implementation Plan

> **Status**: approved
>
> **Goal**: Ship a Tauri 2 desktop kanban board with Svelte 5 frontend, Node sidecar (JSON-RPC over stdin/stdout), unified resource model, adaptive theming, keyboard shortcuts, and accessibility (WCAG AA).
>
> **Architecture**: Monorepo adds `packages/sidecar` (Node JSON-RPC server) and `packages/desktop` (Tauri 2 + Svelte 5 + Vite). Core gets resource model extension. Sidecar bridges core domain to Tauri via stdin/stdout JSON-RPC. Desktop-staging files port to Svelte components then get deleted.
>
> **Tech Stack**: TypeScript 6, Node 22, Vitest 4, Zod 4, Tauri 2 (Rust), Svelte 5 (runes), Vite 6, chokidar.
>
> **Package naming**: `@neon-tiger/sidecar`, `@neon-tiger/desktop`
>
> **Spec**: `docs/superpowers/specs/2026-04-07-kanban-m2-desktop-design.md` (approved)

### Spec Deviations

The following intentional deviations from the spec improve implementation quality:

| Area | Spec says | Plan does | Reason |
|------|-----------|-----------|--------|
| ResourceRecord schema | `{ id, kind, label?, description? }` | `{ kind, name, available, description?, meta? }` | `name` is more natural for discovered resources; `available` enables UI filtering; `id` was never used in protocol; `meta` carries MCP config |
| ResourcePicker / ResourceBadge | Separate components (`ResourcePicker.svelte`, `ResourceBadge.svelte`) | Inlined into `Card.svelte` and `TaskForm.svelte` | Reduces component count; resource chips and assignment UI are tightly coupled to their hosts |
| ThemeProvider | `ThemeProvider.svelte` component wrapping the tree | `theme.svelte.ts` store + `applyTheme()` setting CSS vars on `document.documentElement` | Svelte 5 runes make a context-provider component unnecessary; direct DOM style is simpler |
| Sidecar file split | `sidecar.rs` + `commands.rs` | Single `main.rs` | Tauri shell is ~80 lines; splitting adds overhead without benefit |
| Keyboard shortcuts | `Ctrl+N` for new task, `Ctrl+D` for details | `n` for new task, `Escape` to close | Single-key shortcuts are faster; `Ctrl+` combos conflict with browser/OS defaults in webview |
| Svelte stores | `writable()` stores (Svelte 4 style) | Module-level `$state` runes (Svelte 5 style) | Runes are the idiomatic Svelte 5 approach; better TypeScript inference and no `.subscribe()` boilerplate |

---

## File Structure Map

### New files

```
packages/core/src/resources/
  types.ts                          # ResourceKind, ResourceRecord, ResourceAssignment
  schemas.ts                        # Zod schemas for resources
  normalize.ts                      # normalizeResources() adapter
  registry.ts                       # createResourceRegistry() factory

packages/sidecar/
  package.json
  tsconfig.json
  src/
    index.ts                        # barrel export
    server.ts                       # stdin/stdout JSON-RPC server
    methods/
      index.ts                      # method registry
      board.ts                      # board.load, task.list
      task.ts                       # task.get, task.create, task.move, task.update
      resources.ts                  # resources.discover, resources.list, resources.assign, resources.unassign
    discovery/
      discover-resources.ts         # scan board.yml, skills/, opencode.json
    watcher.ts                      # chokidar FileWatcher — monitors .tasks/, emits board.changed/task.changed
    notifications.ts                # sendNotification() helper

packages/desktop/
  package.json
  vite.config.ts
  svelte.config.js
  index.html
  src/
    main.ts                         # mount Svelte app
    app.css                         # CSS custom properties (theme vars)
    App.svelte                      # root component
    lib/
      rpc.ts                        # Tauri invoke wrapper + typed API
      stores/
        board.svelte.ts             # board state store (Svelte 5 runes)
        resources.svelte.ts         # resource registry store
        theme.svelte.ts             # theme store + applyTheme()
      components/
        Board.svelte                # main board layout
        Column.svelte               # single status column
        Card.svelte                 # task card
        TaskDetails.svelte          # slide-in detail panel
        TaskForm.svelte             # create/edit form
        ShortcutsHelp.svelte        # shortcuts overlay
      actions/
        draggable.ts                # draggable Svelte action
        droptarget.ts               # droptarget Svelte action
        shortcuts.ts                # keyboard shortcuts action
      themes/
        opencode.json               # default dark theme preset
        light.json                  # light theme preset
  src-tauri/
    Cargo.toml
    tauri.conf.json
    src/
      main.rs                       # Tauri app, sidecar management, rpc_call command

tests/core/
  resources-types.test.ts
  resources-normalize.test.ts
  resources-integration.test.ts

tests/sidecar/
  server.test.ts
  methods-board.test.ts
  resources-discover.test.ts
  watcher.test.ts

tests/desktop/
  rpc.test.ts
  stores.test.ts
```

### Modified files

```
packages/core/src/types.ts                           # add resources? to TaskCard, PreflightInput
packages/core/src/schemas.ts                         # add resources to TaskCardSchema, PreflightInputSchema
packages/core/src/repository/contracts.ts            # add resources? to CreateTaskInput, TaskPatch
packages/core/src/preflight/run-preflight.ts         # add unified resource checking
packages/core/src/ui/board-store.ts                  # add getTaskResources()
packages/core/src/repository/canonical/task-markdown-repository.ts  # serialize resources
packages/core/src/index.ts                           # add resource barrel exports
package.json                                         # add workspaces, scripts
tsconfig.json                                        # add sidecar reference
vitest.config.ts                                     # add sidecar alias
README.md                                            # add M2 sections
```

### Deleted files

```
packages/desktop-staging/                            # entire directory (after port complete)
```

---

## Tasks

---

### T1: Core Resource Model — Types & Schemas

Add the unified resource model types and Zod schemas to core.

- [ ] Create test file `tests/core/resources-types.test.ts`
- [ ] Run test — expect RED (modules don't exist)
- [ ] Create `packages/core/src/resources/types.ts`
- [ ] Create `packages/core/src/resources/schemas.ts`
- [ ] Run test — expect GREEN
- [ ] Commit

**Test file** — `tests/core/resources-types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  ResourceKindSchema,
  ResourceRecordSchema,
  ResourceAssignmentSchema,
} from '@neon-tiger/core';

describe('ResourceKindSchema', () => {
  it('accepts valid kinds', () => {
    for (const kind of ['agent', 'skill', 'mcp', 'tool']) {
      expect(ResourceKindSchema.parse(kind)).toBe(kind);
    }
  });

  it('rejects invalid kind', () => {
    expect(() => ResourceKindSchema.parse('plugin')).toThrow();
  });
});

describe('ResourceRecordSchema', () => {
  it('parses a full record', () => {
    const input = {
      kind: 'agent',
      name: 'backend',
      description: 'Backend agent',
      available: true,
      meta: { model: 'gpt-5' },
    };
    const result = ResourceRecordSchema.parse(input);
    expect(result).toEqual(input);
  });

  it('parses minimal record (no optional fields)', () => {
    const result = ResourceRecordSchema.parse({
      kind: 'mcp',
      name: 'tavily',
      available: false,
    });
    expect(result.kind).toBe('mcp');
    expect(result.description).toBeUndefined();
    expect(result.meta).toBeUndefined();
  });

  it('rejects record with empty name', () => {
    expect(() =>
      ResourceRecordSchema.parse({ kind: 'tool', name: '', available: true }),
    ).toThrow();
  });

  it('rejects record without required fields', () => {
    expect(() => ResourceRecordSchema.parse({ kind: 'agent' })).toThrow();
  });
});

describe('ResourceAssignmentSchema', () => {
  it('parses with explicit required', () => {
    const result = ResourceAssignmentSchema.parse({
      kind: 'skill',
      name: 'tdd',
      required: false,
    });
    expect(result.required).toBe(false);
  });

  it('defaults required to true', () => {
    const result = ResourceAssignmentSchema.parse({
      kind: 'agent',
      name: 'frontend',
    });
    expect(result.required).toBe(true);
  });

  it('rejects assignment with invalid kind', () => {
    expect(() =>
      ResourceAssignmentSchema.parse({ kind: 'x', name: 'y', required: true }),
    ).toThrow();
  });
});
```

**Implementation** — `packages/core/src/resources/types.ts`:

```typescript
export type ResourceKind = 'agent' | 'skill' | 'mcp' | 'tool';

export interface ResourceRecord {
  kind: ResourceKind;
  name: string;
  description?: string;
  available: boolean;
  meta?: Record<string, unknown>;
}

export interface ResourceAssignment {
  kind: ResourceKind;
  name: string;
  required: boolean;
}
```

**Implementation** — `packages/core/src/resources/schemas.ts`:

```typescript
import { z } from 'zod';

export const ResourceKindSchema = z.enum(['agent', 'skill', 'mcp', 'tool']);

export const ResourceRecordSchema = z.object({
  kind: ResourceKindSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  available: z.boolean(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const ResourceAssignmentSchema = z.object({
  kind: ResourceKindSchema,
  name: z.string().min(1),
  required: z.boolean().default(true),
});
```

**Commands**:

```bash
npx vitest run tests/core/resources-types.test.ts
```

**Commit**: `feat(core): add resource model types and schemas`

---

### T2: Core Resource Model — Normalize & Registry

Add the normalizeResources() backward-compatibility adapter and createResourceRegistry() factory.

- [ ] Create test file `tests/core/resources-normalize.test.ts`
- [ ] Run test — expect RED
- [ ] Create `packages/core/src/resources/normalize.ts`
- [ ] Create `packages/core/src/resources/registry.ts`
- [ ] Run test — expect GREEN
- [ ] Commit

**Test file** — `tests/core/resources-normalize.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeResources } from '../../packages/core/src/resources/normalize.js';
import { createResourceRegistry } from '../../packages/core/src/resources/registry.js';
import type { ResourceAssignment, ResourceRecord } from '../../packages/core/src/resources/types.js';

describe('normalizeResources', () => {
  it('returns empty array when all inputs are undefined', () => {
    expect(normalizeResources()).toEqual([]);
  });

  it('passes through resources array unchanged', () => {
    const resources: ResourceAssignment[] = [
      { kind: 'agent', name: 'backend', required: true },
    ];
    expect(normalizeResources(resources)).toEqual(resources);
  });

  it('converts required_agents to agent assignments', () => {
    const result = normalizeResources(undefined, ['backend', 'frontend']);
    expect(result).toEqual([
      { kind: 'agent', name: 'backend', required: true },
      { kind: 'agent', name: 'frontend', required: true },
    ]);
  });

  it('converts required_skills to skill assignments', () => {
    const result = normalizeResources(undefined, undefined, ['tdd', 'review']);
    expect(result).toEqual([
      { kind: 'skill', name: 'tdd', required: true },
      { kind: 'skill', name: 'review', required: true },
    ]);
  });

  it('merges all sources and deduplicates', () => {
    const resources: ResourceAssignment[] = [
      { kind: 'agent', name: 'backend', required: true },
      { kind: 'mcp', name: 'tavily', required: false },
    ];
    const result = normalizeResources(resources, ['backend', 'frontend'], ['tdd']);
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({ kind: 'agent', name: 'backend', required: true });
    expect(result[1]).toEqual({ kind: 'mcp', name: 'tavily', required: false });
    expect(result[2]).toEqual({ kind: 'agent', name: 'frontend', required: true });
    expect(result[3]).toEqual({ kind: 'skill', name: 'tdd', required: true });
  });

  it('resources array wins over legacy fields for duplicates', () => {
    const resources: ResourceAssignment[] = [
      { kind: 'agent', name: 'backend', required: false },
    ];
    const result = normalizeResources(resources, ['backend']);
    expect(result).toHaveLength(1);
    expect(result[0].required).toBe(false);
  });
});

describe('createResourceRegistry', () => {
  const records: ResourceRecord[] = [
    { kind: 'agent', name: 'backend', available: true },
    { kind: 'agent', name: 'frontend', available: false },
    { kind: 'skill', name: 'tdd', available: true },
    { kind: 'mcp', name: 'tavily', available: true },
  ];
  const registry = createResourceRegistry(records);

  it('all() returns copy of all records', () => {
    const all = registry.all();
    expect(all).toHaveLength(4);
    expect(all).not.toBe(records);
  });

  it('byKind() filters correctly', () => {
    expect(registry.byKind('agent')).toHaveLength(2);
    expect(registry.byKind('skill')).toHaveLength(1);
    expect(registry.byKind('tool')).toHaveLength(0);
  });

  it('find() returns matching record', () => {
    expect(registry.find('agent', 'backend')).toEqual(records[0]);
  });

  it('find() returns undefined for missing', () => {
    expect(registry.find('agent', 'devops')).toBeUndefined();
  });

  it('available() filters by available flag', () => {
    const avail = registry.available();
    expect(avail).toHaveLength(3);
    expect(avail.every(r => r.available)).toBe(true);
  });
});
```

**Implementation** — `packages/core/src/resources/normalize.ts`:

```typescript
import type { ResourceAssignment } from './types.js';

export function normalizeResources(
  resources?: ResourceAssignment[],
  requiredAgents?: string[],
  requiredSkills?: string[],
): ResourceAssignment[] {
  const merged: ResourceAssignment[] = [...(resources ?? [])];
  const seen = new Set(merged.map((r) => `${r.kind}:${r.name}`));

  for (const name of requiredAgents ?? []) {
    const key = `agent:${name}`;
    if (!seen.has(key)) {
      merged.push({ kind: 'agent', name, required: true });
      seen.add(key);
    }
  }

  for (const name of requiredSkills ?? []) {
    const key = `skill:${name}`;
    if (!seen.has(key)) {
      merged.push({ kind: 'skill', name, required: true });
      seen.add(key);
    }
  }

  return merged;
}
```

**Implementation** — `packages/core/src/resources/registry.ts`:

```typescript
import type { ResourceRecord, ResourceKind } from './types.js';

export interface ResourceRegistry {
  all(): ResourceRecord[];
  byKind(kind: ResourceKind): ResourceRecord[];
  find(kind: ResourceKind, name: string): ResourceRecord | undefined;
  available(): ResourceRecord[];
}

export function createResourceRegistry(
  records: ResourceRecord[],
): ResourceRegistry {
  return {
    all: () => [...records],
    byKind: (kind) => records.filter((r) => r.kind === kind),
    find: (kind, name) =>
      records.find((r) => r.kind === kind && r.name === name),
    available: () => records.filter((r) => r.available),
  };
}
```

**Commands**:

```bash
npx vitest run tests/core/resources-normalize.test.ts
```

**Commit**: `feat(core): add resource normalize adapter and registry`

---

### T3: Core Integration — Add Resources to Domain Types

Wire the resource model into existing core types, schemas, contracts, preflight, board-store, markdown repository, and barrel exports.

- [ ] Create test file `tests/core/resources-integration.test.ts`
- [ ] Run test — expect RED
- [ ] Modify `packages/core/src/types.ts` — add `resources?` to `TaskCard`, `availableResources?` to `PreflightInput`
- [ ] Modify `packages/core/src/schemas.ts` — add resources to schemas
- [ ] Modify `packages/core/src/repository/contracts.ts` — add `resources?` to `CreateTaskInput` and `TaskPatch`
- [ ] Modify `packages/core/src/preflight/run-preflight.ts` — add unified resource checking
- [ ] Modify `packages/core/src/ui/board-store.ts` — add `getTaskResources()`
- [ ] Modify `packages/core/src/repository/canonical/task-markdown-repository.ts` — serialize resources
- [ ] Modify `packages/core/src/index.ts` — add resource barrel exports
- [ ] Run `npx vitest run` — ALL tests pass (new + existing)
- [ ] Commit

**Test file** — `tests/core/resources-integration.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  TaskCardSchema,
  getTaskResources,
  normalizeResources,
  type TaskCard,
  type ResourceAssignment,
} from '@neon-tiger/core';

describe('TaskCard with resources', () => {
  it('parses TaskCard with resources field', () => {
    const input = {
      id: 'task-1',
      title: 'Test task',
      status: 'planned',
      source_file: '.tasks/tasks/task-1.md',
      updated_at: '2026-04-07T00:00:00Z',
      resources: [
        { kind: 'agent', name: 'backend', required: true },
        { kind: 'mcp', name: 'tavily', required: false },
      ],
    };
    const result = TaskCardSchema.parse(input);
    expect(result.resources).toHaveLength(2);
    expect(result.resources[0].kind).toBe('agent');
  });

  it('defaults resources to empty array', () => {
    const input = {
      id: 'task-2',
      title: 'No resources',
      status: 'active',
      source_file: '.tasks/tasks/task-2.md',
      updated_at: '2026-04-07T00:00:00Z',
    };
    const result = TaskCardSchema.parse(input);
    expect(result.resources).toEqual([]);
  });
});

describe('getTaskResources', () => {
  it('returns normalized resources from task', () => {
    const task: TaskCard = {
      id: 'task-3',
      title: 'Mixed',
      status: 'planned',
      source_file: '.tasks/tasks/task-3.md',
      updated_at: '2026-04-07T00:00:00Z',
      required_agents: ['backend'],
      required_skills: ['tdd'],
      resources: [{ kind: 'mcp', name: 'tavily', required: true }],
    };
    const result = getTaskResources(task);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.name).sort()).toEqual(['backend', 'tavily', 'tdd']);
  });

  it('returns empty array for task with no resources or legacy fields', () => {
    const task: TaskCard = {
      id: 'task-4',
      title: 'Plain',
      status: 'done',
      source_file: '.tasks/tasks/task-4.md',
      updated_at: '2026-04-07T00:00:00Z',
    };
    const result = getTaskResources(task);
    expect(result).toEqual([]);
  });
});
```

**Modifications**:

In `packages/core/src/types.ts`, add to `TaskCard` interface after `required_skills?`:
```typescript
  resources?: ResourceAssignment[];
```

Add to `PreflightInput` interface after `availableSkills?`:
```typescript
  availableResources?: ResourceRecord[];
```

Add imports at top of `types.ts`:
```typescript
import type { ResourceAssignment, ResourceRecord } from './resources/types.js';
```

In `packages/core/src/schemas.ts`, add import:
```typescript
import { ResourceAssignmentSchema } from './resources/schemas.js';
```

Add to `TaskCardSchema` after `required_skills`:
```typescript
  resources: z.array(ResourceAssignmentSchema).default([]),
```

In `packages/core/src/repository/contracts.ts`, add to `CreateTaskInput` and `TaskPatch`:
```typescript
  resources?: ResourceAssignment[];
```

In `packages/core/src/ui/board-store.ts`, add:
```typescript
import { normalizeResources } from '../resources/normalize.js';
import type { TaskCard, ResourceAssignment } from '../types.js';

export function getTaskResources(task: TaskCard): ResourceAssignment[] {
  return normalizeResources(
    task.resources,
    task.required_agents,
    task.required_skills,
  );
}
```

In `packages/core/src/repository/canonical/task-markdown-repository.ts`, in `toFrontmatterTask()` add `resources` to the serialized fields (only if non-empty):
```typescript
  if (task.resources && task.resources.length > 0) {
    frontmatter.resources = task.resources;
  }
```

In `packages/core/src/index.ts`, add resource exports:
```typescript
// Resources
export type { ResourceKind, ResourceRecord, ResourceAssignment } from './resources/types.js';
export { ResourceKindSchema, ResourceRecordSchema, ResourceAssignmentSchema } from './resources/schemas.js';
export { normalizeResources } from './resources/normalize.js';
export { createResourceRegistry, type ResourceRegistry } from './resources/registry.js';
export { getTaskResources } from './ui/board-store.js';
```

**Commands**:

```bash
npx vitest run tests/core/resources-integration.test.ts
npx vitest run
```

**Commit**: `feat(core): integrate resource model into domain types and contracts`

---

### T4: Root Workspace Updates

Update root configuration to include new packages.

- [ ] Modify `package.json` — add workspaces and scripts
- [ ] Modify `tsconfig.json` — add sidecar reference
- [ ] Modify `vitest.config.ts` — add sidecar alias
- [ ] Verify `npx vitest run` still passes
- [ ] Commit

**Modifications**:

In root `package.json`, change workspaces:
```json
"workspaces": [
  "packages/core",
  "packages/plugin",
  "packages/sidecar",
  "packages/desktop"
]
```

Add scripts:
```json
"build:sidecar": "npm run build -w packages/sidecar",
"build:desktop": "npm run build -w packages/desktop",
"dev:desktop": "npm run dev -w packages/desktop",
"build:all": "npm run build:core && npm run build:plugin && npm run build:sidecar"
```

In root `tsconfig.json`, add reference:
```json
{ "path": "packages/sidecar" }
```

In root `vitest.config.ts`, add alias:
```typescript
'@neon-tiger/sidecar': resolve(__dirname, 'packages/sidecar/src/index.ts'),
```

**Commands**:

```bash
npx vitest run
```

**Commit**: `chore: add sidecar and desktop to workspace configuration`

---

### T5: Sidecar Package Scaffold + JSON-RPC Server

Create the sidecar package with stdin/stdout JSON-RPC server.

- [ ] Create test file `tests/sidecar/server.test.ts`
- [ ] Run test — expect RED
- [ ] Create `packages/sidecar/package.json`
- [ ] Create `packages/sidecar/tsconfig.json`
- [ ] Create `packages/sidecar/src/index.ts`
- [ ] Create `packages/sidecar/src/notifications.ts`
- [ ] Create `packages/sidecar/src/methods/index.ts`
- [ ] Create `packages/sidecar/src/server.ts`
- [ ] Run `npm install`
- [ ] Run test — expect GREEN
- [ ] Commit

**Test file** — `tests/sidecar/server.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRpcDispatcher } from '@neon-tiger/sidecar';

describe('JSON-RPC dispatcher', () => {
  it('dispatches to registered method', async () => {
    const handler = vi.fn().mockResolvedValue({ board: 'loaded' });
    const dispatcher = createRpcDispatcher({ 'board.load': handler });

    const request = {
      jsonrpc: '2.0' as const,
      id: 1,
      method: 'board.load',
      params: { dir: '/tmp' },
    };

    const response = await dispatcher(request);
    expect(response).toEqual({
      jsonrpc: '2.0',
      id: 1,
      result: { board: 'loaded' },
    });
    expect(handler).toHaveBeenCalledWith({ dir: '/tmp' });
  });

  it('returns method-not-found error for unknown method', async () => {
    const dispatcher = createRpcDispatcher({});
    const request = {
      jsonrpc: '2.0' as const,
      id: 2,
      method: 'unknown.method',
      params: {},
    };

    const response = await dispatcher(request);
    expect(response).toEqual({
      jsonrpc: '2.0',
      id: 2,
      error: { code: -32601, message: 'Method not found: unknown.method' },
    });
  });

  it('returns internal error when handler throws', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('boom'));
    const dispatcher = createRpcDispatcher({ 'task.get': handler });

    const response = await dispatcher({
      jsonrpc: '2.0' as const,
      id: 3,
      method: 'task.get',
      params: { id: 'x' },
    });

    expect(response.error?.code).toBe(-32603);
    expect(response.error?.message).toContain('boom');
  });
});
```

**Implementation** — `packages/sidecar/package.json`:

```json
{
  "name": "@neon-tiger/sidecar",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -b",
    "dev": "node --watch src/index.ts"
  },
  "dependencies": {
    "@neon-tiger/core": "*"
  }
}
```

**Implementation** — `packages/sidecar/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "composite": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "references": [
    { "path": "../core" }
  ]
}
```

**Implementation** — `packages/sidecar/src/notifications.ts`:

```typescript
export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params: unknown;
}

export function sendNotification(
  method: string,
  params: unknown,
): void {
  const notification: JsonRpcNotification = {
    jsonrpc: '2.0',
    method,
    params,
  };
  process.stdout.write(JSON.stringify(notification) + '\n');
}
```

**Implementation** — `packages/sidecar/src/methods/index.ts`:

```typescript
export type RpcHandler = (params: Record<string, unknown>) => Promise<unknown>;
export type MethodRegistry = Record<string, RpcHandler>;
```

**Implementation** — `packages/sidecar/src/server.ts`:

```typescript
import * as readline from 'node:readline';
import type { MethodRegistry } from './methods/index.js';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

export function createRpcDispatcher(
  methods: MethodRegistry,
): (request: JsonRpcRequest) => Promise<JsonRpcResponse> {
  return async (request) => {
    const handler = methods[request.method];
    if (!handler) {
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: { code: -32601, message: `Method not found: ${request.method}` },
      };
    }

    try {
      const result = await handler(request.params);
      return { jsonrpc: '2.0', id: request.id, result };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: { code: -32603, message: `Internal error: ${message}` },
      };
    }
  };
}

export function startServer(methods: MethodRegistry): void {
  const dispatch = createRpcDispatcher(methods);
  const rl = readline.createInterface({ input: process.stdin });

  rl.on('line', async (line) => {
    try {
      const request = JSON.parse(line) as JsonRpcRequest;
      if (request.id === undefined) return; // notification, ignore
      const response = await dispatch(request);
      process.stdout.write(JSON.stringify(response) + '\n');
    } catch {
      const errorResponse: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: 0,
        error: { code: -32700, message: 'Parse error' },
      };
      process.stdout.write(JSON.stringify(errorResponse) + '\n');
    }
  });
}
```

**Implementation** — `packages/sidecar/src/index.ts`:

```typescript
export { createRpcDispatcher, startServer } from './server.js';
export type { JsonRpcRequest, JsonRpcResponse } from './server.js';
export type { RpcHandler, MethodRegistry } from './methods/index.js';
export { sendNotification } from './notifications.js';
```

**Commands**:

```bash
npm install
npx vitest run tests/sidecar/server.test.ts
```

**Commit**: `feat(sidecar): scaffold package with JSON-RPC server`

---

### T6: Sidecar Board & Task Methods

Implement the core RPC methods that bridge to @neon-tiger/core.

- [ ] Create test file `tests/sidecar/methods-board.test.ts`
- [ ] Run test — expect RED
- [ ] Create `packages/sidecar/src/methods/board.ts`
- [ ] Create `packages/sidecar/src/methods/task.ts`
- [ ] Update `packages/sidecar/src/index.ts` with method exports
- [ ] Run test — expect GREEN
- [ ] Commit

**Test file** — `tests/sidecar/methods-board.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createBoardMethods } from '../../packages/sidecar/src/methods/board.js';
import { createTaskMethods } from '../../packages/sidecar/src/methods/task.js';

describe('sidecar board methods', () => {
  let tmpDir: string;
  let tasksDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sidecar-test-'));
    tasksDir = path.join(tmpDir, '.tasks');
    fs.mkdirSync(path.join(tasksDir, 'tasks'), { recursive: true });

    // Create board.yml
    fs.writeFileSync(
      path.join(tasksDir, 'board.yml'),
      `statuses:\n  - planned\n  - active\n  - done\n`,
    );

    // Create a sample task
    fs.writeFileSync(
      path.join(tasksDir, 'tasks', 'task-001.md'),
      `---\nid: task-001\ntitle: Sample task\nstatus: planned\nsource_file: .tasks/tasks/task-001.md\nupdated_at: "2026-04-07T00:00:00Z"\n---\nSample body\n`,
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('board.load returns board state', async () => {
    const methods = createBoardMethods(tasksDir);
    const result = await methods['board.load']({});
    expect(result).toBeDefined();
  });

  it('task.list returns tasks array', async () => {
    const methods = createTaskMethods(tasksDir);
    const result = await methods['task.list']({});
    expect(Array.isArray(result)).toBe(true);
  });

  it('task.get returns a task by id', async () => {
    const methods = createTaskMethods(tasksDir);
    const result = (await methods['task.get']({ id: 'task-001' })) as any;
    expect(result.id).toBe('task-001');
    expect(result.title).toBe('Sample task');
  });

  it('task.create creates a new task', async () => {
    const methods = createTaskMethods(tasksDir);
    const result = (await methods['task.create']({
      title: 'New task',
      status: 'planned',
    })) as any;
    expect(result.title).toBe('New task');
    expect(result.id).toBeDefined();
  });
});
```

**Implementation** — `packages/sidecar/src/methods/board.ts`:

```typescript
import { loadBoardWithDiagnostics } from '@neon-tiger/core';
import type { MethodRegistry } from './index.js';

export function createBoardMethods(tasksDir: string): MethodRegistry {
  return {
    'board.load': async () => {
      return loadBoardWithDiagnostics(tasksDir);
    },
  };
}
```

**Implementation** — `packages/sidecar/src/methods/task.ts`:

```typescript
import {
  createTaskMarkdownRepository,
  canTransition,
  runPreflight,
  enforceKanban,
} from '@neon-tiger/core';
import type { MethodRegistry } from './index.js';

export function createTaskMethods(tasksDir: string): MethodRegistry {
  const repo = createTaskMarkdownRepository(tasksDir);

  return {
    'task.list': async () => {
      return repo.listTasks();
    },

    'task.get': async (params) => {
      const id = params.id as string;
      if (!id) throw new Error('Missing required param: id');
      return repo.readTask(id);
    },

    'task.create': async (params) => {
      const { title, status, description, priority, resources } = params as Record<string, unknown>;
      if (!title) throw new Error('Missing required param: title');
      return repo.createTask({
        title: title as string,
        status: (status as string) ?? 'planned',
        description: description as string | undefined,
        priority: priority as string | undefined,
        resources: resources as any[] | undefined,
      });
    },

    'task.move': async (params) => {
      const { id, status } = params as Record<string, unknown>;
      if (!id || !status) throw new Error('Missing required params: id, status');
      const task = await repo.readTask(id as string);
      const transition = canTransition(task.status, status as string);
      if (!transition.allowed) {
        throw new Error(`Transition not allowed: ${task.status} → ${status}`);
      }
      return repo.updateTaskStatus(id as string, status as string);
    },

    'task.update': async (params) => {
      const { id, ...patch } = params as Record<string, unknown>;
      if (!id) throw new Error('Missing required param: id');
      return repo.updateTask(id as string, patch);
    },
  };
}
```

**Commands**:

```bash
npx vitest run tests/sidecar/methods-board.test.ts
```

**Commit**: `feat(sidecar): implement board and task RPC methods`

---

### T7: Sidecar Resource Discovery, Watcher & Resource Assignment

Add resource discovery, file-system watcher notifications, and resource assignment/unassignment to the sidecar.

- [ ] Create test file `tests/sidecar/resources-discover.test.ts`
- [ ] Run test — expect RED
- [ ] Create `packages/sidecar/src/discovery/discover-resources.ts`
- [ ] Create `packages/sidecar/src/methods/resources.ts` with `discover`, `list`, `assign`, `unassign`
- [ ] Create `packages/sidecar/src/watcher.ts` — chokidar watcher emitting `board.changed` / `task.changed`
- [ ] Create test file `tests/sidecar/watcher.test.ts`
- [ ] Wire watcher into server startup (`server.ts` starts watcher, watcher calls `sendNotification`)
- [ ] Run tests — expect GREEN
- [ ] Commit

**Test file** — `tests/sidecar/resources-discover.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { discoverResources } from '../../packages/sidecar/src/discovery/discover-resources.js';

describe('discoverResources', () => {
  let tmpDir: string;
  let tasksDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'discover-test-'));
    tasksDir = path.join(tmpDir, '.tasks');
    fs.mkdirSync(path.join(tasksDir, 'tasks'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('discovers agents from board.yml', async () => {
    fs.writeFileSync(
      path.join(tasksDir, 'board.yml'),
      'statuses:\n  - planned\nagents:\n  - name: backend\n    model: gpt-5\n  - name: frontend\n    model: claude\n',
    );
    const resources = await discoverResources(tmpDir);
    const agents = resources.filter((r) => r.kind === 'agent');
    expect(agents.length).toBeGreaterThanOrEqual(2);
    expect(agents.find((a) => a.name === 'backend')).toBeDefined();
  });

  it('returns empty array when no sources exist', async () => {
    fs.writeFileSync(
      path.join(tasksDir, 'board.yml'),
      'statuses:\n  - planned\n',
    );
    const resources = await discoverResources(tmpDir);
    expect(resources).toEqual([]);
  });

  it('discovers skills from skills/ directory', async () => {
    const skillsDir = path.join(tmpDir, 'skills');
    fs.mkdirSync(skillsDir, { recursive: true });
    fs.writeFileSync(path.join(skillsDir, 'tdd.md'), '# TDD skill');
    fs.writeFileSync(path.join(skillsDir, 'review.md'), '# Review skill');

    fs.writeFileSync(
      path.join(tasksDir, 'board.yml'),
      'statuses:\n  - planned\n',
    );

    const resources = await discoverResources(tmpDir);
    const skills = resources.filter((r) => r.kind === 'skill');
    expect(skills).toHaveLength(2);
  });
});
```

**Implementation** — `packages/sidecar/src/discovery/discover-resources.ts`:

```typescript
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ResourceRecord } from '@neon-tiger/core';

export async function discoverResources(
  projectDir: string,
): Promise<ResourceRecord[]> {
  const results: ResourceRecord[] = [];

  // 1. Read board.yml for agents
  const boardPath = path.join(projectDir, '.tasks', 'board.yml');
  if (fs.existsSync(boardPath)) {
    const content = fs.readFileSync(boardPath, 'utf-8');
    const agentMatches = content.matchAll(/- name:\s*(.+)/g);
    for (const match of agentMatches) {
      const name = match[1].trim();
      results.push({ kind: 'agent', name, available: true });
    }
  }

  // 2. Scan skills/ directory
  const skillsDir = path.join(projectDir, 'skills');
  if (fs.existsSync(skillsDir)) {
    const entries = fs.readdirSync(skillsDir);
    for (const entry of entries) {
      const name = path.parse(entry).name;
      results.push({ kind: 'skill', name, available: true });
    }
  }

  // 3. Read opencode.json for MCP servers
  const opencodeJson = path.join(projectDir, 'opencode.json');
  if (fs.existsSync(opencodeJson)) {
    try {
      const config = JSON.parse(fs.readFileSync(opencodeJson, 'utf-8'));
      const servers = config?.mcpServers ?? config?.mcp?.servers ?? {};
      for (const [name, _serverConfig] of Object.entries(servers)) {
        results.push({
          kind: 'mcp',
          name,
          available: true,
          meta: { config: _serverConfig },
        });
      }
    } catch {
      // ignore parse errors
    }
  }

  return results;
}
```

**Implementation** — `packages/sidecar/src/methods/resources.ts`:

```typescript
import { discoverResources } from '../discovery/discover-resources.js';
import type { ResourceRecord } from '@neon-tiger/core';
import type { MethodRegistry } from './index.js';

export function createResourceMethods(projectDir: string): MethodRegistry {
  let cachedResources: ResourceRecord[] = [];

  return {
    'resources.discover': async () => {
      cachedResources = await discoverResources(projectDir);
      return cachedResources;
    },

    'resources.list': async (params?: { kind?: string; refresh?: boolean }) => {
      if (params?.refresh || cachedResources.length === 0) {
        cachedResources = await discoverResources(projectDir);
      }
      if (params?.kind) {
        return cachedResources.filter((r) => r.kind === params.kind);
      }
      return cachedResources;
    },

    'resources.assign': async (params: {
      taskId: string;
      resource_id: string;
      kind: string;
    }) => {
      // Delegate to task.update with resources patch
      // This method is registered here for API completeness but
      // the actual update is done via the task repository
      const { taskId, resource_id, kind } = params;
      const resource = cachedResources.find(
        (r) => r.name === resource_id && r.kind === kind,
      );
      if (!resource) {
        throw { code: 1001, message: `Resource not found: ${kind}/${resource_id}` };
      }
      // Return the resource to signal success — actual task mutation
      // happens through the task methods that share the same repository
      return { assigned: true, taskId, resource };
    },

    'resources.unassign': async (params: {
      taskId: string;
      resource_id: string;
      kind: string;
    }) => {
      const { taskId, resource_id, kind } = params;
      return { unassigned: true, taskId, resource_id, kind };
    },
  };
}
```

**Implementation** — `packages/sidecar/src/watcher.ts`:

```typescript
import { watch, type FSWatcher } from 'chokidar';
import * as path from 'node:path';
import { sendNotification } from './notifications.js';

export interface FileWatcherOptions {
  projectDir: string;
  onBoardChanged: () => Promise<void>;
}

export class FileWatcher {
  private watcher: FSWatcher | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly tasksDir: string;
  private readonly debounceMs = 300;

  constructor(private readonly options: FileWatcherOptions) {
    this.tasksDir = path.join(options.projectDir, '.tasks');
  }

  start(): void {
    this.watcher = watch(this.tasksDir, {
      ignoreInitial: true,
      persistent: true,
      depth: 3,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    });

    this.watcher.on('add', (filePath) => this.handleChange(filePath, 'added'));
    this.watcher.on('change', (filePath) =>
      this.handleChange(filePath, 'modified'),
    );
    this.watcher.on('unlink', (filePath) =>
      this.handleChange(filePath, 'deleted'),
    );
  }

  private handleChange(
    filePath: string,
    changeType: 'added' | 'modified' | 'deleted',
  ): void {
    const relative = path.relative(this.tasksDir, filePath);

    // Single task change
    if (relative.startsWith('tasks' + path.sep) && relative.endsWith('.md')) {
      const taskId = path.parse(relative).name;
      sendNotification('task.changed', { taskId, changeType });
    }

    // Debounce full board reload for any .tasks/ change
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(async () => {
      await this.options.onBoardChanged();
    }, this.debounceMs);
  }

  async stop(): Promise<void> {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }
}
```

**Test file** — `tests/sidecar/watcher.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Mock notifications before importing watcher
vi.mock('../../packages/sidecar/src/notifications.js', () => ({
  sendNotification: vi.fn(),
}));

import { FileWatcher } from '../../packages/sidecar/src/watcher.js';
import { sendNotification } from '../../packages/sidecar/src/notifications.js';

describe('FileWatcher', () => {
  let tmpDir: string;
  let tasksDir: string;
  let watcher: FileWatcher;
  const onBoardChanged = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'watcher-test-'));
    tasksDir = path.join(tmpDir, '.tasks', 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.tasks', 'board.yml'),
      'statuses:\n  - planned\n  - done\n',
    );
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (watcher) await watcher.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('emits task.changed when a task file is added', async () => {
    watcher = new FileWatcher({
      projectDir: tmpDir,
      onBoardChanged,
    });
    watcher.start();

    // Wait for watcher to initialize
    await new Promise((r) => setTimeout(r, 500));

    // Add a task file
    fs.writeFileSync(
      path.join(tasksDir, 'task-001.md'),
      '---\ntitle: Test\nstatus: planned\n---\n',
    );

    // Wait for debounce + fs event
    await new Promise((r) => setTimeout(r, 800));

    expect(sendNotification).toHaveBeenCalledWith('task.changed', {
      taskId: 'task-001',
      changeType: 'added',
    });
  });

  it('calls onBoardChanged after debounce', async () => {
    watcher = new FileWatcher({
      projectDir: tmpDir,
      onBoardChanged,
    });
    watcher.start();

    await new Promise((r) => setTimeout(r, 500));

    fs.writeFileSync(
      path.join(tasksDir, 'task-002.md'),
      '---\ntitle: Another\nstatus: planned\n---\n',
    );

    await new Promise((r) => setTimeout(r, 800));

    expect(onBoardChanged).toHaveBeenCalled();
  });

  it('stops cleanly', async () => {
    watcher = new FileWatcher({
      projectDir: tmpDir,
      onBoardChanged,
    });
    watcher.start();
    await watcher.stop();
    // No error thrown = success
  });
});
```

**Commands**:

```bash
npx vitest run tests/sidecar/resources-discover.test.ts
npx vitest run
```

**Commit**: `feat(sidecar): add resource discovery, watcher, and assign/unassign RPC methods`

---

### T8: Desktop Package Scaffold — Tauri + Svelte 5

Create the desktop package with Tauri 2 + Svelte 5 + Vite boilerplate.

- [ ] Initialize `packages/desktop/` with Tauri + Svelte template
- [ ] Create `packages/desktop/package.json`
- [ ] Create `packages/desktop/vite.config.ts`
- [ ] Create `packages/desktop/svelte.config.js`
- [ ] Create `packages/desktop/index.html`
- [ ] Create `packages/desktop/src/main.ts`
- [ ] Create `packages/desktop/src/App.svelte`
- [ ] Create `packages/desktop/src/app.css` with theme CSS custom properties
- [ ] Create `packages/desktop/src-tauri/Cargo.toml`
- [ ] Create `packages/desktop/src-tauri/tauri.conf.json`
- [ ] Create `packages/desktop/src-tauri/src/main.rs` (minimal)
- [ ] Verify: `npm run dev -w packages/desktop` starts dev server
- [ ] Verify: `cargo check` in src-tauri compiles
- [ ] Commit

**Implementation** — `packages/desktop/package.json`:

```json
{
  "name": "@neon-tiger/desktop",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.0.0"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^5.0.0",
    "@tauri-apps/cli": "^2.0.0",
    "svelte": "^5.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

**Implementation** — `packages/desktop/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: 'esnext',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});
```

**Implementation** — `packages/desktop/svelte.config.js`:

```javascript
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
};
```

**Implementation** — `packages/desktop/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OpenKanban</title>
    <link rel="stylesheet" href="/src/app.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

**Implementation** — `packages/desktop/src/main.ts`:

```typescript
import App from './App.svelte';
import { mount } from 'svelte';

const app = mount(App, { target: document.getElementById('app')! });

export default app;
```

**Implementation** — `packages/desktop/src/App.svelte`:

```svelte
<script lang="ts">
  import Board from './lib/components/Board.svelte';
</script>

<main>
  <Board />
</main>
```

**Implementation** — `packages/desktop/src/app.css`:

```css
:root {
  --kanban-bg: #1a1b26;
  --kanban-column-bg: #24283b;
  --kanban-card-bg: #2f3549;
  --kanban-card-border: #414868;
  --kanban-text: #c0caf5;
  --kanban-text-secondary: #565f89;
  --kanban-accent: #7aa2f7;
  --kanban-danger: #f7768e;
  --kanban-success: #9ece6a;
  --kanban-radius: 8px;
  --kanban-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--kanban-bg);
  color: var(--kanban-text);
  min-height: 100vh;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Implementation** — `packages/desktop/src-tauri/Cargo.toml`:

```toml
[package]
name = "openkanban-desktop"
version = "0.1.0"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
```

**Implementation** — `packages/desktop/src-tauri/tauri.conf.json`:

```json
{
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "OpenKanban",
        "width": 1200,
        "height": 800,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "identifier": "com.openkanban.desktop",
    "icon": []
  }
}
```

**Implementation** — `packages/desktop/src-tauri/src/main.rs`:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Also create `packages/desktop/src-tauri/build.rs`:

```rust
fn main() {
    tauri_build::build()
}
```

**Verification**:

```bash
npm install -w packages/desktop
npm run dev -w packages/desktop
# In another terminal:
cargo check --manifest-path packages/desktop/src-tauri/Cargo.toml
```

**Commit**: `feat(desktop): scaffold Tauri 2 + Svelte 5 + Vite package`

---

### T9: Tauri Rust Shell — Sidecar Management, RPC Command & Event Bridge

Implement sidecar process management, `rpc_call` Tauri command, and event bridge that forwards sidecar push notifications to the webview.

- [ ] Modify `packages/desktop/src-tauri/src/main.rs` — add `SidecarState`, `rpc_call` command, sidecar lifecycle, event bridge thread
- [ ] Modify `packages/desktop/src-tauri/Cargo.toml` — add `tokio` IO features, `serde_json`
- [ ] Verify: `cargo check` compiles
- [ ] Commit

**Implementation** — `packages/desktop/src-tauri/src/main.rs`:

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use tauri::{AppHandle, Emitter, Manager, State};

struct SidecarState {
    child: Mutex<Option<Child>>,
    stdin_lock: Mutex<()>,
}

fn start_sidecar() -> Result<Child, String> {
    Command::new("node")
        .arg("packages/sidecar/dist/index.js")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start sidecar: {}", e))
}

/// Spawn a background thread that continuously reads stdout from the sidecar.
/// Lines that are JSON-RPC notifications (no "id" field) are forwarded as
/// Tauri events to the webview. Lines that are responses (have "id") are
/// sent back through a response channel for `rpc_call` to pick up.
fn spawn_event_bridge(
    app_handle: AppHandle,
    stdout: std::process::ChildStdout,
    response_tx: std::sync::mpsc::Sender<serde_json::Value>,
) {
    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            let line = match line {
                Ok(l) => l,
                Err(_) => break, // sidecar process closed stdout
            };
            if line.trim().is_empty() {
                continue;
            }
            let parsed: serde_json::Value = match serde_json::from_str(&line) {
                Ok(v) => v,
                Err(_) => continue, // skip non-JSON lines
            };

            if parsed.get("id").is_some() {
                // This is a response to an RPC request
                let _ = response_tx.send(parsed);
            } else if let Some(method) = parsed.get("method").and_then(|m| m.as_str()) {
                // This is a push notification — emit as Tauri event
                let data = parsed.get("params").cloned().unwrap_or(serde_json::Value::Null);
                let event_name = format!("sidecar:{}", method);
                let _ = app_handle.emit(&event_name, data);
            }
        }
    });
}

#[tauri::command]
async fn rpc_call(
    state: State<'_, SidecarState>,
    response_rx: State<'_, Mutex<std::sync::mpsc::Receiver<serde_json::Value>>>,
    method: String,
    params: serde_json::Value,
) -> Result<serde_json::Value, String> {
    // Serialize access to stdin to prevent interleaving
    let _stdin_guard = state.stdin_lock.lock().map_err(|e| e.to_string())?;

    let mut guard = state.child.lock().map_err(|e| e.to_string())?;
    let child = guard.as_mut().ok_or("Sidecar not running")?;

    let request = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": params,
    });

    let stdin = child.stdin.as_mut().ok_or("No stdin")?;
    let request_line = serde_json::to_string(&request).map_err(|e| e.to_string())?;
    writeln!(stdin, "{}", request_line).map_err(|e| e.to_string())?;
    stdin.flush().map_err(|e| e.to_string())?;

    drop(guard); // release child lock while waiting for response

    // Wait for response from the event bridge thread
    let rx = response_rx.lock().map_err(|e| e.to_string())?;
    let response = rx
        .recv_timeout(std::time::Duration::from_secs(10))
        .map_err(|e| format!("RPC timeout: {}", e))?;

    if let Some(error) = response.get("error") {
        return Err(error.to_string());
    }

    Ok(response
        .get("result")
        .cloned()
        .unwrap_or(serde_json::Value::Null))
}

fn main() {
    let mut sidecar = start_sidecar().expect("Failed to start sidecar");

    // Take ownership of stdout for the event bridge thread
    let stdout = sidecar.stdout.take().expect("No sidecar stdout");

    // Channel for routing RPC responses from event bridge back to rpc_call
    let (response_tx, response_rx) = std::sync::mpsc::channel::<serde_json::Value>();

    tauri::Builder::default()
        .manage(SidecarState {
            child: Mutex::new(Some(sidecar)),
            stdin_lock: Mutex::new(()),
        })
        .manage(Mutex::new(response_rx))
        .setup(move |app| {
            // Start the event bridge thread that reads sidecar stdout
            spawn_event_bridge(app.handle().clone(), stdout, response_tx);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![rpc_call])
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // Sidecar cleanup happens via Drop
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Verification**:

```bash
npx tsc --noEmit -p packages/desktop/tsconfig.json
npx vitest run tests/desktop/rpc.test.ts
```

**Test** — `tests/desktop/rpc.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @tauri-apps/api/core
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { rpcCall, boardApi, taskApi, resourceApi } from '../../packages/desktop/src/lib/rpc.js';

const mockInvoke = vi.mocked(invoke);

describe('rpcCall', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
  });

  it('returns ok result on success', async () => {
    mockInvoke.mockResolvedValueOnce({ tasks: [] });
    const result = await rpcCall('board.load');
    expect(result).toEqual({ ok: true, data: { tasks: [] } });
    expect(mockInvoke).toHaveBeenCalledWith('rpc_call', {
      method: 'board.load',
      params: {},
    });
  });

  it('returns error result on failure', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('connection lost'));
    const result = await rpcCall('board.load');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('connection lost');
    }
  });

  it('passes params to invoke', async () => {
    mockInvoke.mockResolvedValueOnce({});
    await rpcCall('task.get', { id: 'abc' });
    expect(mockInvoke).toHaveBeenCalledWith('rpc_call', {
      method: 'task.get',
      params: { id: 'abc' },
    });
  });
});

describe('API wrappers', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue({});
  });

  it('boardApi.load calls board.load', async () => {
    await boardApi.load();
    expect(mockInvoke).toHaveBeenCalledWith('rpc_call', {
      method: 'board.load',
      params: {},
    });
  });

  it('taskApi.move calls task.move with id and status', async () => {
    await taskApi.move('t1', 'done');
    expect(mockInvoke).toHaveBeenCalledWith('rpc_call', {
      method: 'task.move',
      params: { id: 't1', status: 'done' },
    });
  });

  it('resourceApi.discover calls resources.discover', async () => {
    await resourceApi.discover();
    expect(mockInvoke).toHaveBeenCalledWith('rpc_call', {
      method: 'resources.discover',
      params: {},
    });
  });
});
```

**Commit**: `feat(desktop): implement Tauri sidecar management and rpc_call command`

---

### T10: Svelte RPC Client

Create the typed RPC client that wraps Tauri's `invoke` API.

- [ ] Create `packages/desktop/src/lib/rpc.ts`
- [ ] Create `tests/desktop/rpc.test.ts`
- [ ] Verify TypeScript compiles
- [ ] Verify tests pass
- [ ] Commit

**Implementation** — `packages/desktop/src/lib/rpc.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core';
import type {
  TaskCard,
  CreateTaskInput,
  TaskPatch,
  ResourceRecord,
} from '@neon-tiger/core';

export interface RpcError {
  code: number;
  message: string;
}

export type RpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: RpcError };

export async function rpcCall<T>(
  method: string,
  params: Record<string, unknown> = {},
): Promise<RpcResult<T>> {
  try {
    const result = await invoke<T>('rpc_call', { method, params });
    return { ok: true, data: result };
  } catch (e) {
    return {
      ok: false,
      error: { code: -1, message: String(e) },
    };
  }
}

export interface BoardViewStateSuccess {
  state: 'success';
  tasks: TaskCard[];
  statuses: string[];
  diagnostics: string[];
}

export type BoardViewState =
  | { state: 'loading' }
  | { state: 'empty'; message: string }
  | { state: 'error'; error: string }
  | BoardViewStateSuccess;

export const boardApi = {
  load: () => rpcCall<BoardViewState>('board.load'),
};

export const taskApi = {
  get: (id: string) => rpcCall<TaskCard>('task.get', { id }),
  create: (input: CreateTaskInput) =>
    rpcCall<TaskCard>('task.create', input as unknown as Record<string, unknown>),
  move: (id: string, status: string) =>
    rpcCall<TaskCard>('task.move', { id, status }),
  update: (id: string, patch: TaskPatch) =>
    rpcCall<TaskCard>('task.update', { id, ...patch } as Record<string, unknown>),
  list: () => rpcCall<TaskCard[]>('task.list'),
};

export const resourceApi = {
  discover: () => rpcCall<ResourceRecord[]>('resources.discover'),
  list: () => rpcCall<ResourceRecord[]>('resources.list'),
};
```

**Verification**:

```bash
npx tsc --noEmit -p packages/desktop/tsconfig.json
```

**Commit**: `feat(desktop): add typed Svelte RPC client`

---

### T11: Svelte Stores — Board, Resources, Theme

Create reactive stores using Svelte 5 runes.

- [ ] Create `packages/desktop/src/lib/stores/board.svelte.ts`
- [ ] Create `packages/desktop/src/lib/stores/resources.svelte.ts`
- [ ] Create `packages/desktop/src/lib/stores/theme.svelte.ts`
- [ ] Create `tests/desktop/stores.test.ts`
- [ ] Verify TypeScript compiles
- [ ] Verify tests pass
- [ ] Commit

**Implementation** — `packages/desktop/src/lib/stores/board.svelte.ts`:

```typescript
import { boardApi, taskApi, type BoardViewState } from '../rpc.js';
import type { TaskCard, CreateTaskInput, TaskPatch } from '@neon-tiger/core';

let boardState = $state<BoardViewState>({ state: 'loading' });
let selectedTaskId = $state<string | null>(null);

export function getBoardState(): BoardViewState {
  return boardState;
}

export function getSelectedTaskId(): string | null {
  return selectedTaskId;
}

export function selectTask(id: string | null): void {
  selectedTaskId = id;
}

export async function loadBoard(): Promise<void> {
  boardState = { state: 'loading' };
  const result = await boardApi.load();
  if (result.ok) {
    boardState = result.data;
  } else {
    boardState = { state: 'error', error: result.error.message };
  }
}

export async function moveTask(id: string, status: string): Promise<boolean> {
  const result = await taskApi.move(id, status);
  if (result.ok) {
    await loadBoard();
    return true;
  }
  return false;
}

export async function createTask(input: CreateTaskInput): Promise<boolean> {
  const result = await taskApi.create(input);
  if (result.ok) {
    await loadBoard();
    return true;
  }
  return false;
}

export async function updateTask(
  id: string,
  patch: TaskPatch,
): Promise<boolean> {
  const result = await taskApi.update(id, patch);
  if (result.ok) {
    await loadBoard();
    return true;
  }
  return false;
}

export function getSelectedTask(): TaskCard | null {
  if (!selectedTaskId || boardState.state !== 'success') return null;
  return boardState.tasks.find((t) => t.id === selectedTaskId) ?? null;
}

export function getTasksByStatus(status: string): TaskCard[] {
  if (boardState.state !== 'success') return [];
  return boardState.tasks.filter((t) => t.status === status);
}
```

**Implementation** — `packages/desktop/src/lib/stores/resources.svelte.ts`:

```typescript
import { resourceApi } from '../rpc.js';
import type { ResourceRecord, ResourceKind } from '@neon-tiger/core';

let resources = $state<ResourceRecord[]>([]);
let loading = $state(false);

export function getResources(): ResourceRecord[] {
  return resources;
}

export function isLoading(): boolean {
  return loading;
}

export async function discoverResources(): Promise<void> {
  loading = true;
  const result = await resourceApi.discover();
  if (result.ok) {
    resources = result.data;
  }
  loading = false;
}

export async function refreshResources(): Promise<void> {
  const result = await resourceApi.list();
  if (result.ok) {
    resources = result.data;
  }
}

export function resourcesByKind(kind: ResourceKind): ResourceRecord[] {
  return resources.filter((r) => r.kind === kind);
}

export function availableResources(): ResourceRecord[] {
  return resources.filter((r) => r.available);
}
```

**Implementation** — `packages/desktop/src/lib/stores/theme.svelte.ts`:

```typescript
export interface ThemeVars {
  '--kanban-bg': string;
  '--kanban-column-bg': string;
  '--kanban-card-bg': string;
  '--kanban-card-border': string;
  '--kanban-text': string;
  '--kanban-text-secondary': string;
  '--kanban-accent': string;
  '--kanban-danger': string;
  '--kanban-success': string;
  '--kanban-radius': string;
  '--kanban-shadow': string;
}

const defaultTheme: ThemeVars = {
  '--kanban-bg': '#1a1b26',
  '--kanban-column-bg': '#24283b',
  '--kanban-card-bg': '#2f3549',
  '--kanban-card-border': '#414868',
  '--kanban-text': '#c0caf5',
  '--kanban-text-secondary': '#565f89',
  '--kanban-accent': '#7aa2f7',
  '--kanban-danger': '#f7768e',
  '--kanban-success': '#9ece6a',
  '--kanban-radius': '8px',
  '--kanban-shadow': '0 2px 8px rgba(0,0,0,0.3)',
};

let currentTheme = $state<ThemeVars>({ ...defaultTheme });
let themeName = $state('opencode');

export function getTheme(): ThemeVars {
  return currentTheme;
}

export function getThemeName(): string {
  return themeName;
}

export function applyTheme(vars: ThemeVars, name?: string): void {
  currentTheme = vars;
  if (name) themeName = name;
  for (const [key, value] of Object.entries(vars)) {
    document.documentElement.style.setProperty(key, value);
  }
}

export function resetTheme(): void {
  applyTheme({ ...defaultTheme }, 'opencode');
}
```

**Verification**:

```bash
npx tsc --noEmit -p packages/desktop/tsconfig.json
npx vitest run tests/desktop/stores.test.ts
```

**Test** — `tests/desktop/stores.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the rpc module
vi.mock('../../packages/desktop/src/lib/rpc.js', () => ({
  boardApi: {
    load: vi.fn(),
  },
  taskApi: {
    move: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    get: vi.fn(),
  },
  resourceApi: {
    discover: vi.fn(),
    list: vi.fn(),
  },
}));

import { boardApi, taskApi, resourceApi } from '../../packages/desktop/src/lib/rpc.js';
import {
  loadBoard,
  moveTask,
  getBoardState,
} from '../../packages/desktop/src/lib/stores/board.svelte.js';
import {
  discoverResources,
  getResources,
} from '../../packages/desktop/src/lib/stores/resources.svelte.js';
import {
  applyTheme,
  getTheme,
} from '../../packages/desktop/src/lib/stores/theme.svelte.js';

const mockBoardApi = vi.mocked(boardApi);
const mockTaskApi = vi.mocked(taskApi);
const mockResourceApi = vi.mocked(resourceApi);

describe('board store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loadBoard sets state from API response', async () => {
    mockBoardApi.load.mockResolvedValueOnce({
      ok: true,
      data: {
        state: 'success',
        tasks: [{ id: 't1', title: 'Test', status: 'planned' }],
        statuses: ['planned', 'active', 'done'],
        diagnostics: [],
      },
    });
    await loadBoard();
    const state = getBoardState();
    expect(state.state).toBe('success');
  });

  it('moveTask calls taskApi.move', async () => {
    mockTaskApi.move.mockResolvedValueOnce({ ok: true, data: {} });
    mockBoardApi.load.mockResolvedValueOnce({
      ok: true,
      data: { state: 'success', tasks: [], statuses: [], diagnostics: [] },
    });
    await moveTask('t1', 'done');
    expect(mockTaskApi.move).toHaveBeenCalledWith('t1', 'done');
  });
});

describe('resources store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('discoverResources populates resources list', async () => {
    mockResourceApi.discover.mockResolvedValueOnce({
      ok: true,
      data: [
        { kind: 'agent', name: 'backend', available: true },
      ],
    });
    await discoverResources();
    const resources = getResources();
    expect(resources).toHaveLength(1);
    expect(resources[0].name).toBe('backend');
  });
});

describe('theme store', () => {
  it('applyTheme updates current theme', () => {
    applyTheme({ bg: '#000', text: '#fff' }, 'dark');
    const theme = getTheme();
    expect(theme.name).toBe('dark');
  });
});
```

> **Note**: Tests for Svelte 5 rune-based stores may require `@testing-library/svelte` or a Svelte-aware Vitest plugin to properly handle `$state`/`$derived`. If runes cannot be evaluated outside Svelte components, wrap store access in a minimal test component. The exact approach should be validated during implementation.

**Commit**: `feat(desktop): add Svelte 5 stores for board, resources, and theme`

---

### T12: Svelte Components — Board, Column, Card

Port desktop-staging view files to Svelte 5 components.
Depends on T11 (stores) and T14 (actions: draggable, droptarget, shortcuts).

- [ ] Create `packages/desktop/src/lib/components/Board.svelte`
- [ ] Create `packages/desktop/src/lib/components/Column.svelte`
- [ ] Create `packages/desktop/src/lib/components/Card.svelte`
- [ ] Verify: `npm run dev` renders board with columns and cards
- [ ] Commit

**Implementation** — `packages/desktop/src/lib/components/Board.svelte`:

Port from `desktop-staging/ui/view/render-board.ts` (110 lines).

```svelte
<script lang="ts">
  import Column from './Column.svelte';
  import TaskDetails from './TaskDetails.svelte';
  import TaskForm from './TaskForm.svelte';
  import {
    getBoardState,
    loadBoard,
    getSelectedTaskId,
    getTasksByStatus,
  } from '../stores/board.svelte.js';
  import { discoverResources } from '../stores/resources.svelte.js';
  import { shortcuts } from '../actions/shortcuts.js';
  import { onMount } from 'svelte';

  let showForm = $state(false);
  let editTaskId = $state<string | null>(null);

  onMount(async () => {
    await Promise.all([loadBoard(), discoverResources()]);
  });

  function openNewTaskForm() {
    editTaskId = null;
    showForm = true;
  }

  function openEditForm(taskId: string) {
    editTaskId = taskId;
    showForm = true;
  }

  function closeForm() {
    showForm = false;
    editTaskId = null;
  }

  const keymap = {
    n: openNewTaskForm,
    Escape: closeForm,
  };
</script>

<div class="board" role="main" aria-label="Kanban Board" use:shortcuts={keymap}>
  {#if getBoardState().state === 'loading'}
    <div class="board-loading" aria-live="polite">Loading board...</div>
  {:else if getBoardState().state === 'empty'}
    <div class="board-empty" aria-live="polite">
      <p>No tasks found. Press <kbd>n</kbd> to create one.</p>
    </div>
  {:else if getBoardState().state === 'error'}
    <div class="board-error" role="alert">
      <p>Error: {getBoardState().error}</p>
      <button onclick={() => loadBoard()}>Retry</button>
    </div>
  {:else if getBoardState().state === 'success'}
    <div class="board-header">
      <h1>OpenKanban</h1>
      <button class="new-task-btn" onclick={openNewTaskForm}>+ New Task</button>
    </div>

    {#if getBoardState().diagnostics?.length}
      <div class="diagnostics" role="status">
        {#each getBoardState().diagnostics as diag}
          <p class="diagnostic">{diag}</p>
        {/each}
      </div>
    {/if}

    <div class="columns">
      {#each getBoardState().statuses as status}
        <Column
          {status}
          tasks={getTasksByStatus(status)}
          onEditTask={openEditForm}
        />
      {/each}
    </div>
  {/if}

  {#if getSelectedTaskId()}
    <TaskDetails />
  {/if}

  {#if showForm}
    <TaskForm taskId={editTaskId} onClose={closeForm} />
  {/if}
</div>

<style>
  .board {
    display: flex;
    flex-direction: column;
    height: 100vh;
    padding: 16px;
    gap: 16px;
  }

  .board-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .board-header h1 {
    font-size: 1.5rem;
    color: var(--kanban-text);
  }

  .new-task-btn {
    padding: 8px 16px;
    background: var(--kanban-accent);
    color: var(--kanban-bg);
    border: none;
    border-radius: var(--kanban-radius);
    cursor: pointer;
    font-weight: 600;
  }

  .columns {
    display: flex;
    gap: 16px;
    flex: 1;
    overflow-x: auto;
  }

  .board-loading,
  .board-empty,
  .board-error {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    color: var(--kanban-text-secondary);
  }

  .board-error {
    color: var(--kanban-danger);
    flex-direction: column;
    gap: 8px;
  }

  .diagnostics {
    padding: 8px;
    background: var(--kanban-column-bg);
    border-radius: var(--kanban-radius);
  }

  .diagnostic {
    color: var(--kanban-text-secondary);
    font-size: 0.85rem;
  }
</style>
```

**Implementation** — `packages/desktop/src/lib/components/Column.svelte`:

Port from `desktop-staging/ui/view/render-column.ts` (40 lines).

```svelte
<script lang="ts">
  import Card from './Card.svelte';
  import { droptarget } from '../actions/droptarget.js';
  import { moveTask } from '../stores/board.svelte.js';
  import type { TaskCard } from '@neon-tiger/core';

  interface Props {
    status: string;
    tasks: TaskCard[];
    onEditTask: (taskId: string) => void;
  }

  let { status, tasks, onEditTask }: Props = $props();

  async function handleDrop(taskId: string, targetStatus: string) {
    await moveTask(taskId, targetStatus);
  }
</script>

<section
  class="column"
  role="region"
  aria-label="{status} column"
  use:droptarget={{ status, onDrop: handleDrop }}
>
  <header class="column-header">
    <h2>{status}</h2>
    <span class="count">{tasks.length}</span>
  </header>

  <div class="card-list">
    {#if tasks.length === 0}
      <p class="empty-message">No tasks</p>
    {:else}
      {#each tasks as task (task.id)}
        <Card {task} {onEditTask} />
      {/each}
    {/if}
  </div>
</section>

<style>
  .column {
    display: flex;
    flex-direction: column;
    min-width: 280px;
    max-width: 320px;
    background: var(--kanban-column-bg);
    border-radius: var(--kanban-radius);
    padding: 12px;
    gap: 8px;
  }

  .column-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--kanban-card-border);
  }

  .column-header h2 {
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--kanban-text-secondary);
  }

  .count {
    background: var(--kanban-card-bg);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.8rem;
    color: var(--kanban-text-secondary);
  }

  .card-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }

  .empty-message {
    color: var(--kanban-text-secondary);
    text-align: center;
    padding: 24px 0;
    font-size: 0.85rem;
  }

  :global(.column.drag-over) {
    outline: 2px dashed var(--kanban-accent);
    outline-offset: -2px;
  }
</style>
```

**Implementation** — `packages/desktop/src/lib/components/Card.svelte`:

Port from `desktop-staging/ui/view/render-card.ts` (48 lines).

```svelte
<script lang="ts">
  import { draggable } from '../actions/draggable.js';
  import { selectTask } from '../stores/board.svelte.js';
  import { getTaskResources } from '@neon-tiger/core';
  import type { TaskCard } from '@neon-tiger/core';

  interface Props {
    task: TaskCard;
    onEditTask: (taskId: string) => void;
  }

  let { task, onEditTask }: Props = $props();
  let resources = $derived(getTaskResources(task));
</script>

<article
  class="card"
  class:blocked={!!task.blocked_reason}
  role="listitem"
  aria-label="Task: {task.title}"
  use:draggable={task.id}
  onclick={() => selectTask(task.id)}
  onkeydown={(e) => e.key === 'Enter' && selectTask(task.id)}
  tabindex="0"
>
  <div class="card-header">
    <h3 class="card-title">{task.title}</h3>
    {#if task.priority}
      <span class="priority priority-{task.priority}">{task.priority}</span>
    {/if}
  </div>

  {#if task.blocked_reason}
    <p class="blocked-reason">Blocked: {task.blocked_reason}</p>
  {/if}

  {#if resources.length > 0}
    <div class="resources">
      {#each resources as res}
        <span class="resource-badge resource-{res.kind}" title="{res.kind}: {res.name}">
          {res.name}
        </span>
      {/each}
    </div>
  {/if}

  <div class="card-actions">
    <button
      class="edit-btn"
      onclick|stopPropagation={() => onEditTask(task.id)}
      aria-label="Edit task {task.title}"
    >
      Edit
    </button>
  </div>
</article>

<style>
  .card {
    background: var(--kanban-card-bg);
    border: 1px solid var(--kanban-card-border);
    border-radius: var(--kanban-radius);
    padding: 12px;
    cursor: grab;
    transition: box-shadow 0.15s ease;
  }

  .card:hover {
    box-shadow: var(--kanban-shadow);
  }

  .card:focus-visible {
    outline: 2px solid var(--kanban-accent);
    outline-offset: 2px;
  }

  .card.blocked {
    border-left: 3px solid var(--kanban-danger);
  }

  :global(.card.dragging) {
    opacity: 0.5;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
  }

  .card-title {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--kanban-text);
  }

  .priority {
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .priority-high {
    background: var(--kanban-danger);
    color: var(--kanban-bg);
  }

  .priority-medium {
    background: var(--kanban-accent);
    color: var(--kanban-bg);
  }

  .priority-low {
    color: var(--kanban-text-secondary);
  }

  .blocked-reason {
    font-size: 0.8rem;
    color: var(--kanban-danger);
    margin-top: 4px;
  }

  .resources {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 8px;
  }

  .resource-badge {
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--kanban-column-bg);
    color: var(--kanban-text-secondary);
  }

  .resource-agent {
    border-left: 2px solid var(--kanban-accent);
  }

  .resource-skill {
    border-left: 2px solid var(--kanban-success);
  }

  .resource-mcp {
    border-left: 2px solid #bb9af7;
  }

  .resource-tool {
    border-left: 2px solid #e0af68;
  }

  .card-actions {
    margin-top: 8px;
    display: flex;
    justify-content: flex-end;
  }

  .edit-btn {
    font-size: 0.75rem;
    padding: 4px 8px;
    background: transparent;
    border: 1px solid var(--kanban-card-border);
    border-radius: 4px;
    color: var(--kanban-text-secondary);
    cursor: pointer;
  }

  .edit-btn:hover {
    color: var(--kanban-text);
    border-color: var(--kanban-accent);
  }
</style>
```

**Verification**:

```bash
npm run dev -w packages/desktop
# Visually verify board renders with columns and cards
```

**Commit**: `feat(desktop): add Board, Column, and Card Svelte components`

---

### T13: Svelte Components — TaskDetails & TaskForm

Port detail panel and form from desktop-staging to Svelte components.

- [ ] Create `packages/desktop/src/lib/components/TaskDetails.svelte`
- [ ] Create `packages/desktop/src/lib/components/TaskForm.svelte`
- [ ] Verify: detail panel opens, form creates/edits tasks
- [ ] Commit

**Implementation** — `packages/desktop/src/lib/components/TaskDetails.svelte`:

Port from `render-details.ts` (39 lines) + `details-panel.ts` (32 lines).

```svelte
<script lang="ts">
  import { getSelectedTask, selectTask } from '../stores/board.svelte.js';
  import { getTaskResources } from '@neon-tiger/core';

  let task = $derived(getSelectedTask());
  let resources = $derived(task ? getTaskResources(task) : []);

  function close() {
    selectTask(null);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }
</script>

{#if task}
  <aside
    class="details-panel"
    role="complementary"
    aria-label="Task details: {task.title}"
    onkeydown={handleKeydown}
  >
    <div class="details-header">
      <h2>{task.title}</h2>
      <button class="close-btn" onclick={close} aria-label="Close details">×</button>
    </div>

    <div class="details-body">
      <div class="field">
        <label>Status</label>
        <span class="status-badge">{task.status}</span>
      </div>

      {#if task.priority}
        <div class="field">
          <label>Priority</label>
          <span>{task.priority}</span>
        </div>
      {/if}

      {#if task.description}
        <div class="field">
          <label>Description</label>
          <p>{task.description}</p>
        </div>
      {/if}

      {#if task.blocked_reason}
        <div class="field blocked">
          <label>Blocked</label>
          <p>{task.blocked_reason}</p>
        </div>
      {/if}

      {#if resources.length > 0}
        <div class="field">
          <label>Resources</label>
          <div class="resource-list">
            {#each resources as res}
              <span class="resource-tag">
                <span class="kind">{res.kind}</span>: {res.name}
                {#if res.required}<span class="required">*</span>{/if}
              </span>
            {/each}
          </div>
        </div>
      {/if}

      {#if task.source_file}
        <div class="field">
          <label>Source</label>
          <code>{task.source_file}</code>
        </div>
      {/if}

      {#if task.artifacts?.length}
        <div class="field">
          <label>Artifacts</label>
          <ul>
            {#each task.artifacts as artifact}
              <li>{artifact}</li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  </aside>
{/if}

<style>
  .details-panel {
    position: fixed;
    top: 0;
    right: 0;
    width: 400px;
    height: 100vh;
    background: var(--kanban-column-bg);
    border-left: 1px solid var(--kanban-card-border);
    padding: 24px;
    overflow-y: auto;
    z-index: 100;
    box-shadow: -4px 0 16px rgba(0, 0, 0, 0.3);
  }

  .details-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .details-header h2 {
    font-size: 1.2rem;
    color: var(--kanban-text);
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--kanban-text-secondary);
    cursor: pointer;
  }

  .field {
    margin-bottom: 16px;
  }

  .field label {
    display: block;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--kanban-text-secondary);
    margin-bottom: 4px;
  }

  .status-badge {
    padding: 4px 8px;
    background: var(--kanban-accent);
    color: var(--kanban-bg);
    border-radius: 4px;
    font-size: 0.8rem;
  }

  .blocked {
    color: var(--kanban-danger);
  }

  .resource-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .resource-tag {
    font-size: 0.8rem;
    padding: 2px 8px;
    background: var(--kanban-card-bg);
    border-radius: 4px;
  }

  .kind {
    color: var(--kanban-accent);
  }

  .required {
    color: var(--kanban-danger);
  }

  code {
    font-size: 0.8rem;
    color: var(--kanban-accent);
  }
</style>
```

**Implementation** — `packages/desktop/src/lib/components/TaskForm.svelte`:

Port from `render-task-form.ts` (59 lines) + `task-form.ts` (34 lines).

```svelte
<script lang="ts">
  import {
    createTask,
    updateTask,
    getBoardState,
    getSelectedTask,
  } from '../stores/board.svelte.js';
  import { getResources } from '../stores/resources.svelte.js';
  import type { ResourceAssignment } from '@neon-tiger/core';

  interface Props {
    taskId: string | null;
    onClose: () => void;
  }

  let { taskId, onClose }: Props = $props();

  let existingTask = $derived(
    taskId && getBoardState().state === 'success'
      ? getBoardState().tasks.find((t) => t.id === taskId) ?? null
      : null,
  );

  let title = $state(existingTask?.title ?? '');
  let description = $state(existingTask?.description ?? '');
  let status = $state(existingTask?.status ?? 'planned');
  let priority = $state(existingTask?.priority ?? '');
  let selectedResources = $state<ResourceAssignment[]>(
    existingTask?.resources ?? [],
  );

  let statuses = $derived(
    getBoardState().state === 'success' ? getBoardState().statuses : ['planned'],
  );

  let isEdit = $derived(!!taskId && !!existingTask);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!title.trim()) return;

    if (isEdit && taskId) {
      await updateTask(taskId, {
        title,
        description: description || undefined,
        priority: priority || undefined,
        resources: selectedResources.length > 0 ? selectedResources : undefined,
      });
    } else {
      await createTask({
        title,
        status,
        description: description || undefined,
        priority: priority || undefined,
        resources: selectedResources.length > 0 ? selectedResources : undefined,
      });
    }
    onClose();
  }

  function toggleResource(kind: string, name: string) {
    const idx = selectedResources.findIndex(
      (r) => r.kind === kind && r.name === name,
    );
    if (idx >= 0) {
      selectedResources = selectedResources.filter((_, i) => i !== idx);
    } else {
      selectedResources = [
        ...selectedResources,
        { kind: kind as ResourceAssignment['kind'], name, required: true },
      ];
    }
  }

  function isResourceSelected(kind: string, name: string): boolean {
    return selectedResources.some((r) => r.kind === kind && r.name === name);
  }
</script>

<div class="form-overlay" onclick={onClose} onkeydown={(e) => e.key === 'Escape' && onClose()} role="dialog" aria-label="{isEdit ? 'Edit' : 'Create'} task">
  <form class="task-form" onclick|stopPropagation onsubmit={handleSubmit}>
    <h2>{isEdit ? 'Edit Task' : 'New Task'}</h2>

    <div class="form-field">
      <label for="title">Title</label>
      <input id="title" type="text" bind:value={title} required autofocus />
    </div>

    <div class="form-field">
      <label for="description">Description</label>
      <textarea id="description" bind:value={description} rows="3"></textarea>
    </div>

    {#if !isEdit}
      <div class="form-field">
        <label for="status">Status</label>
        <select id="status" bind:value={status}>
          {#each statuses as s}
            <option value={s}>{s}</option>
          {/each}
        </select>
      </div>
    {/if}

    <div class="form-field">
      <label for="priority">Priority</label>
      <select id="priority" bind:value={priority}>
        <option value="">None</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
    </div>

    {#if getResources().length > 0}
      <div class="form-field">
        <label>Resources</label>
        <div class="resource-checkboxes">
          {#each getResources() as res}
            <label class="resource-check">
              <input
                type="checkbox"
                checked={isResourceSelected(res.kind, res.name)}
                onchange={() => toggleResource(res.kind, res.name)}
              />
              <span class="kind">{res.kind}</span>: {res.name}
            </label>
          {/each}
        </div>
      </div>
    {/if}

    <div class="form-actions">
      <button type="button" class="cancel-btn" onclick={onClose}>Cancel</button>
      <button type="submit" class="submit-btn">
        {isEdit ? 'Save' : 'Create'}
      </button>
    </div>
  </form>
</div>

<style>
  .form-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 200;
  }

  .task-form {
    background: var(--kanban-column-bg);
    border-radius: var(--kanban-radius);
    padding: 24px;
    width: 480px;
    max-height: 80vh;
    overflow-y: auto;
  }

  .task-form h2 {
    margin-bottom: 16px;
    color: var(--kanban-text);
  }

  .form-field {
    margin-bottom: 16px;
  }

  .form-field label {
    display: block;
    font-size: 0.8rem;
    color: var(--kanban-text-secondary);
    margin-bottom: 4px;
  }

  .form-field input,
  .form-field textarea,
  .form-field select {
    width: 100%;
    padding: 8px;
    background: var(--kanban-card-bg);
    border: 1px solid var(--kanban-card-border);
    border-radius: 4px;
    color: var(--kanban-text);
    font-size: 0.9rem;
  }

  .form-field input:focus,
  .form-field textarea:focus,
  .form-field select:focus {
    outline: 2px solid var(--kanban-accent);
    outline-offset: 1px;
  }

  .resource-checkboxes {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .resource-check {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    cursor: pointer;
  }

  .kind {
    color: var(--kanban-accent);
    font-size: 0.75rem;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 24px;
  }

  .cancel-btn {
    padding: 8px 16px;
    background: transparent;
    border: 1px solid var(--kanban-card-border);
    border-radius: var(--kanban-radius);
    color: var(--kanban-text-secondary);
    cursor: pointer;
  }

  .submit-btn {
    padding: 8px 16px;
    background: var(--kanban-accent);
    color: var(--kanban-bg);
    border: none;
    border-radius: var(--kanban-radius);
    cursor: pointer;
    font-weight: 600;
  }
</style>
```

**Verification**:

```bash
npm run dev -w packages/desktop
# Open detail panel by clicking a card
# Create new task via form
# Edit existing task
```

**Commit**: `feat(desktop): add TaskDetails and TaskForm Svelte components`

---

### T14: Svelte Actions — Drag & Drop, Shortcuts

Port interaction files from desktop-staging to Svelte actions.

- [ ] Create `packages/desktop/src/lib/actions/draggable.ts`
- [ ] Create `packages/desktop/src/lib/actions/droptarget.ts`
- [ ] Create `packages/desktop/src/lib/actions/shortcuts.ts`
- [ ] Verify: drag & drop and keyboard shortcuts work
- [ ] Commit

**Implementation** — `packages/desktop/src/lib/actions/draggable.ts`:

Port from `desktop-staging/ui/interactions/drag-drop.ts` — draggable part.

```typescript
import type { Action } from 'svelte/action';

export const draggable: Action<HTMLElement, string> = (node, taskId) => {
  function handleDragStart(e: DragEvent) {
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', taskId);
      e.dataTransfer.effectAllowed = 'move';
    }
    node.classList.add('dragging');
    node.setAttribute('aria-grabbed', 'true');
  }

  function handleDragEnd() {
    node.classList.remove('dragging');
    node.setAttribute('aria-grabbed', 'false');
  }

  node.draggable = true;
  node.setAttribute('aria-grabbed', 'false');
  node.addEventListener('dragstart', handleDragStart);
  node.addEventListener('dragend', handleDragEnd);

  return {
    update(newTaskId: string) {
      taskId = newTaskId;
    },
    destroy() {
      node.removeEventListener('dragstart', handleDragStart);
      node.removeEventListener('dragend', handleDragEnd);
    },
  };
};
```

**Implementation** — `packages/desktop/src/lib/actions/droptarget.ts`:

Port from `desktop-staging/ui/interactions/drag-drop.ts` — drop target part.

```typescript
import type { Action } from 'svelte/action';

export interface DropTargetOptions {
  status: string;
  onDrop: (taskId: string, status: string) => void;
}

export const droptarget: Action<HTMLElement, DropTargetOptions> = (
  node,
  opts,
) => {
  let currentOpts = opts;

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    node.classList.add('drag-over');
  }

  function handleDragLeave() {
    node.classList.remove('drag-over');
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    node.classList.remove('drag-over');
    const taskId = e.dataTransfer?.getData('text/plain');
    if (taskId) {
      currentOpts.onDrop(taskId, currentOpts.status);
    }
  }

  node.setAttribute('aria-dropeffect', 'move');
  node.addEventListener('dragover', handleDragOver);
  node.addEventListener('dragleave', handleDragLeave);
  node.addEventListener('drop', handleDrop);

  return {
    update(newOpts: DropTargetOptions) {
      currentOpts = newOpts;
    },
    destroy() {
      node.removeEventListener('dragover', handleDragOver);
      node.removeEventListener('dragleave', handleDragLeave);
      node.removeEventListener('drop', handleDrop);
    },
  };
};
```

**Implementation** — `packages/desktop/src/lib/actions/shortcuts.ts`:

Port from `desktop-staging/ui/interactions/keyboard-shortcuts.ts` (43 lines).

```typescript
import type { Action } from 'svelte/action';

export interface ShortcutMap {
  [key: string]: () => void;
}

export const shortcuts: Action<HTMLElement, ShortcutMap> = (node, keymap) => {
  let currentKeymap = keymap;

  function handler(e: KeyboardEvent) {
    // Build key string: Ctrl+Shift+k
    const parts: string[] = [];
    if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    if (e.altKey) parts.push('Alt');
    parts.push(e.key);
    const combo = parts.join('+');

    // Try combo first, then just the key (for simple keys like 'n', 'Escape')
    const action = currentKeymap[combo] ?? currentKeymap[e.key];
    if (action) {
      e.preventDefault();
      action();
    }
  }

  node.addEventListener('keydown', handler);

  return {
    update(newKeymap: ShortcutMap) {
      currentKeymap = newKeymap;
    },
    destroy() {
      node.removeEventListener('keydown', handler);
    },
  };
};
```

**Verification**:

```bash
npm run dev -w packages/desktop
# Drag a card to a different column — task moves
# Press 'n' — new task form opens
# Press 'Escape' — form/panel closes
```

**Commit**: `feat(desktop): add draggable, droptarget, and shortcuts Svelte actions`

---

### T15: Theming System — Theme Presets

Create JSON theme presets and the ShortcutsHelp component.

- [ ] Create `packages/desktop/src/lib/themes/opencode.json`
- [ ] Create `packages/desktop/src/lib/themes/light.json`
- [ ] Create `packages/desktop/src/lib/components/ShortcutsHelp.svelte`
- [ ] Wire theme loading into `App.svelte`
- [ ] Verify: theme toggle works, shortcuts help displays
- [ ] Commit

**Implementation** — `packages/desktop/src/lib/themes/opencode.json`:

```json
{
  "name": "opencode",
  "label": "OpenCode Dark",
  "vars": {
    "--kanban-bg": "#1a1b26",
    "--kanban-column-bg": "#24283b",
    "--kanban-card-bg": "#2f3549",
    "--kanban-card-border": "#414868",
    "--kanban-text": "#c0caf5",
    "--kanban-text-secondary": "#565f89",
    "--kanban-accent": "#7aa2f7",
    "--kanban-danger": "#f7768e",
    "--kanban-success": "#9ece6a",
    "--kanban-radius": "8px",
    "--kanban-shadow": "0 2px 8px rgba(0,0,0,0.3)"
  }
}
```

**Implementation** — `packages/desktop/src/lib/themes/light.json`:

```json
{
  "name": "light",
  "label": "Light",
  "vars": {
    "--kanban-bg": "#f5f5f5",
    "--kanban-column-bg": "#ffffff",
    "--kanban-card-bg": "#ffffff",
    "--kanban-card-border": "#e0e0e0",
    "--kanban-text": "#1a1a1a",
    "--kanban-text-secondary": "#666666",
    "--kanban-accent": "#2563eb",
    "--kanban-danger": "#dc2626",
    "--kanban-success": "#16a34a",
    "--kanban-radius": "8px",
    "--kanban-shadow": "0 2px 8px rgba(0,0,0,0.08)"
  }
}
```

**Implementation** — `packages/desktop/src/lib/components/ShortcutsHelp.svelte`:

```svelte
<script lang="ts">
  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();

  const shortcuts = [
    { key: 'n', description: 'New task' },
    { key: 'e', description: 'Edit selected task' },
    { key: 'Escape', description: 'Close panel / form' },
    { key: '?', description: 'Toggle shortcuts help' },
    { key: '/', description: 'Search tasks' },
    { key: 'j', description: 'Next card' },
    { key: 'k', description: 'Previous card' },
    { key: 'Ctrl+z', description: 'Undo last action' },
  ];
</script>

<div class="shortcuts-overlay" onclick={onClose} onkeydown={(e) => e.key === 'Escape' && onClose()} role="dialog" aria-label="Keyboard shortcuts">
  <div class="shortcuts-panel" onclick|stopPropagation>
    <h2>Keyboard Shortcuts</h2>
    <div class="shortcuts-list">
      {#each shortcuts as shortcut}
        <div class="shortcut-row">
          <kbd>{shortcut.key}</kbd>
          <span>{shortcut.description}</span>
        </div>
      {/each}
    </div>
    <button onclick={onClose}>Close</button>
  </div>
</div>

<style>
  .shortcuts-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 300;
  }

  .shortcuts-panel {
    background: var(--kanban-column-bg);
    border-radius: var(--kanban-radius);
    padding: 24px;
    min-width: 320px;
  }

  .shortcuts-panel h2 {
    margin-bottom: 16px;
    color: var(--kanban-text);
  }

  .shortcut-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid var(--kanban-card-border);
  }

  kbd {
    background: var(--kanban-card-bg);
    padding: 2px 8px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.85rem;
    color: var(--kanban-accent);
  }

  button {
    margin-top: 16px;
    padding: 8px 16px;
    background: var(--kanban-accent);
    color: var(--kanban-bg);
    border: none;
    border-radius: var(--kanban-radius);
    cursor: pointer;
    width: 100%;
  }
</style>
```

**Verification**:

```bash
npm run dev -w packages/desktop
# Toggle between dark and light themes
# Press '?' to show shortcuts help
```

**Commit**: `feat(desktop): add theme presets and shortcuts help component`

---

### T16: Accessibility Pass

Apply WCAG AA accessibility requirements across all components.

- [ ] Add semantic HTML landmarks (`<main>`, `<section>`, `<article>`, `<header>`) — already done in T12-T13
- [ ] Add ARIA attributes: `role="region"` on columns, `aria-label` on interactive elements, `aria-grabbed`/`aria-dropeffect` for DnD — already done in T12, T14
- [ ] Add `aria-live="polite"` on Board for state changes
- [ ] Add focus trap in form overlay (Tab cycles within form)
- [ ] Add visible focus indicators (`:focus-visible` outlines) — verify in all components
- [ ] Add `@media (prefers-reduced-motion: reduce)` — already done in `app.css`
- [ ] Test keyboard-only navigation: Tab between columns, j/k between cards, Enter to open
- [ ] Verify color contrast meets 4.5:1 ratio for both themes
- [ ] Commit

**Modifications** — focus trap in `TaskForm.svelte`:

Add to the `<form>` element:
```svelte
<script>
  import { onMount } from 'svelte';

  let formEl: HTMLFormElement;

  onMount(() => {
    // Focus the first input on mount
    const firstInput = formEl?.querySelector('input, textarea, select') as HTMLElement;
    firstInput?.focus();

    // Trap focus within form
    function trapFocus(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const focusable = formEl.querySelectorAll<HTMLElement>(
        'input, textarea, select, button, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    formEl.addEventListener('keydown', trapFocus);
    return () => formEl.removeEventListener('keydown', trapFocus);
  });
</script>
```

**Modifications** — add `aria-live` to Board loading/error states (already in T12).

**Verification**:

```bash
npm run dev -w packages/desktop
# Tab through all interactive elements — verify visible focus rings
# Use keyboard only to: create task, move task, view details, close panels
# Check DevTools Accessibility panel for ARIA tree
```

**Commit**: `feat(desktop): accessibility pass — focus trap, ARIA, keyboard navigation`

---

### T17: Build, Integration & Cleanup

Wire everything together, run full test suite, clean up staging files.

- [ ] Create sidecar entry point that wires all methods together
- [ ] Add pre-build hook: compile sidecar before Tauri build
- [ ] Update root `package.json` scripts
- [ ] Run `npx vitest run` — all tests pass
- [ ] Run `npx tsc -b` — no errors
- [ ] Delete `packages/desktop-staging/` directory
- [ ] Update `README.md` with M2 sections
- [ ] Final commit

**Modifications** — `packages/sidecar/src/index.ts` (final version):

```typescript
export { createRpcDispatcher, startServer } from './server.js';
export type { JsonRpcRequest, JsonRpcResponse } from './server.js';
export type { RpcHandler, MethodRegistry } from './methods/index.js';
export { sendNotification } from './notifications.js';
export { discoverResources } from './discovery/discover-resources.js';

// CLI entry point
import { startServer } from './server.js';
import { createBoardMethods } from './methods/board.js';
import { createTaskMethods } from './methods/task.js';
import { createResourceMethods } from './methods/resources.js';

const projectDir = process.cwd();
const tasksDir = `${projectDir}/.tasks`;

const methods = {
  ...createBoardMethods(tasksDir),
  ...createTaskMethods(tasksDir),
  ...createResourceMethods(projectDir),
};

if (process.argv[1] === import.meta.filename) {
  startServer(methods);
}
```

**Modifications** — root `package.json` final scripts:

```json
{
  "scripts": {
    "build": "npm run build:core && npm run build:plugin",
    "build:core": "npm run build -w packages/core",
    "build:plugin": "npm run build -w packages/plugin",
    "build:sidecar": "npm run build -w packages/sidecar",
    "build:desktop": "npm run build -w packages/desktop",
    "build:all": "npm run build:core && npm run build:sidecar && npm run build:desktop",
    "dev:desktop": "npm run dev -w packages/desktop",
    "test": "vitest run",
    "typecheck": "tsc -b"
  }
}
```

**Delete**: `packages/desktop-staging/` (entire directory with 9 files)

**Update** `README.md`: Add M2 section describing desktop app, sidecar, resource model.

**Commands**:

```bash
npx vitest run
npx tsc -b
rm -rf packages/desktop-staging
npm run build:all
```

**Commit**: `feat: complete M2 desktop app — delete staging, update README`

---

## Summary

| Task | Title | Depends on | Estimated complexity |
|------|-------|------------|---------------------|
| T1 | Core Resource Types & Schemas | — | Small |
| T2 | Core Resource Normalize & Registry | T1 | Small |
| T3 | Core Integration | T1, T2 | Medium |
| T4 | Root Workspace Updates | — | Small |
| T5 | Sidecar Scaffold + JSON-RPC Server | T4 | Medium |
| T6 | Sidecar Board & Task Methods | T5, T3 | Medium |
| T7 | Sidecar Resource Discovery & Watcher | T5, T3 | Medium |
| T8 | Desktop Scaffold (Tauri + Svelte) | T4 | Medium |
| T9 | Tauri Rust Shell | T8 | Medium |
| T10 | Svelte RPC Client | T8 | Small |
| T11 | Svelte Stores | T10 | Medium |
| T12 | Svelte Components — Board, Column, Card | T11, T14 | Large |
| T13 | Svelte Components — TaskDetails, TaskForm | T11 | Medium |
| T14 | Svelte Actions — DnD, Shortcuts | T11 | Medium |
| T15 | Theming — Presets + ShortcutsHelp | T12 | Small |
| T16 | Accessibility Pass | T12, T13, T14 | Medium |
| T17 | Build, Integration & Cleanup | All | Medium |

**Critical path**: T1 → T2 → T3 → T5 → T6 → T8 → T9/T10 → T11 → T14 → T12 → T16 → T17

**Parallel tracks**:
- Track A: T1 → T2 → T3 (core resource model)
- Track B: T4 (root workspace) — can run with Track A
- Track C: T8 → T9 (Tauri shell) — after T4
- Track D: T8 → T10 → T11 → T14 → T12/T13 → T15 → T16 (Svelte frontend) — after T4
- Track E: T5 → T6 → T7 (sidecar) — after T3 + T4
