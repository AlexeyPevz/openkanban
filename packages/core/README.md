# @openkanban/core

Shared domain logic for openkanban kanban system.

## Contents

- **Types & Schemas** — `TaskCard`, `Board`, `TaskStatus`, Zod validation schemas
- **Status Transitions** — `canTransition()`, allowed state machine rules
- **Preflight Checks** — `runPreflight()` validates agent/skill requirements before moves
- **Task Events** — `createTaskEvent()` for audit logging
- **Repository Contracts** — `BoardRepository`, `TaskRepository` interfaces
- **Canonical Repository** — YAML board + Markdown task file readers/writers
- **Fallback Repositories** — `kanban.json`, `tasks.yml`, markdown glob fallbacks
- **Discovery** — `listSourceCandidates()`, `selectPrimarySource()`, source override
- **Watch** — `BoardWatcher` for file-system change detection
- **Bridge** — `RuntimePublisher`, `publishTaskEvent()` for cross-component communication

## Usage

```typescript
import {
  canTransition,
  runPreflight,
  BoardYamlRepository,
  TaskMarkdownRepository,
} from "@openkanban/core"
```
