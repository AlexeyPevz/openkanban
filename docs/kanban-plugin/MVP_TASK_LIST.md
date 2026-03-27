# MVP Task List — milestone → slice → task

## Milestone 1 — Core file-first foundation

### Slice 1.1 — Project scaffold and domain contracts

- Task 1.1.1 — выбрать runtime/build/test scaffold и зафиксировать package structure
- Task 1.1.2 — описать canonical board/task schemas
- Task 1.1.2a — описать required/optional fields и defaulting rules
- Task 1.1.3 — реализовать status transition rules
- Task 1.1.4 — реализовать preflight engine
- Task 1.1.5 — описать и зафиксировать kanban execution contract

### Slice 1.2 — Discovery and repository adapters

- Task 1.2.1 — реализовать source discovery priority
- Task 1.2.1a — реализовать tie-break и degraded mode rules
- Task 1.2.2 — реализовать canonical `.tasks/board.yml` adapter
- Task 1.2.3 — реализовать `.tasks/tasks/*.md` adapter
- Task 1.2.4 — реализовать fallback adapters для legacy formats
- Task 1.2.5 — реализовать create/edit flows поверх canonical task storage

### Slice 1.3 — Watcher and orchestration bridge

- Task 1.3.1 — реализовать file watcher refresh loop
- Task 1.3.2 — реализовать event publication contract
- Task 1.3.2a — обеспечить idempotency и correlation ids
- Task 1.3.3 — реализовать safe write + reconcile flow
- Task 1.3.4 — реализовать agent registry sync policy

## Milestone 2 — OpenCode host integration

### Slice 2.1 — Host capability validation

- Task 2.1.1 — проверить реальные OpenCode plugin surfaces для panel/overlay mounting
- Task 2.1.2 — проверить command registration surface
- Task 2.1.3 — проверить hotkeys integration surface
- Task 2.1.4 — проверить theme/font lookup surface
- Task 2.1.5 — проверить runtime event publishing surface
- Task 2.1.6 — собрать capability matrix и выбрать supported host surface
- Task 2.1.7 — зафиксировать fallback strategy при ограниченном host surface

### Slice 2.2 — Commands, hotkeys, runtime bridge

- Task 2.2.1 — зарегистрировать open/close board command
- Task 2.2.2 — добавить hotkeys navigation contract
- Task 2.2.3 — подключить theme/font/runtime context
- Task 2.2.4 — подключить kanban contract enforcement для orchestrator/single-agent mode

## Milestone 3 — Board UI

### Slice 3.1 — Board shell

- Task 3.1.1 — реализовать loading/empty/error/success states
- Task 3.1.2 — реализовать column layout
- Task 3.1.3 — реализовать task card component

### Slice 3.2 — Task interactions

- Task 3.2.1 — drag-and-drop status changes
- Task 3.2.2 — keyboard navigation and quick actions
- Task 3.2.3 — details/tooltip panel with blockers and agents
- Task 3.2.4 — create task flow
- Task 3.2.5 — edit task flow

## Milestone 4 — End-to-end workflow hardening

### Slice 4.1 — Orchestration lifecycle

- Task 4.1.1 — `planned -> active` with preflight and event publish
- Task 4.1.2 — `active -> review` and `blocked -> active` recovery flow
- Task 4.1.3 — error recovery and stale/conflict handling

### Slice 4.2 — Verification and release readiness

- Task 4.2.1 — integration tests and smoke checks
- Task 4.2.2 — docs refresh and usage examples
- Task 4.2.3 — release packaging for OpenCode MVP
