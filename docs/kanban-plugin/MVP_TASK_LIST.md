# MVP Task List — companion app replan (milestone → slice → task)

## Milestone 1 — Functional contract recovery

### Slice 1.1 — Task payload alignment

- Task 1.1.1 — зафиксировать desktop UI ↔ sidecar task payload contract
- Task 1.1.2 — расширить `task.create` schema до реально используемых полей
- Task 1.1.3 — расширить `task.update` schema до реально используемых полей
- Task 1.1.4 — убедиться, что canonical repository сохраняет эти поля в source-of-truth
- Task 1.1.5 — добавить regression tests на create/edit roundtrip

### Slice 1.2 — Resource persistence

- Task 1.2.1 — зафиксировать MVP contract для resource assignment (persisted, file-first)
- Task 1.2.2 — реализовать sidecar persisted `resources.assign`
- Task 1.2.3 — реализовать sidecar persisted `resources.unassign`
- Task 1.2.4 — подключить desktop UI к persisted assignment flow
- Task 1.2.5 — добавить tests на file persistence resource changes

### Slice 1.3 — Resource model completion

- Task 1.3.1 — добавить `tool` discovery
- Task 1.3.2 — сверить required/assigned resource representation в UI
- Task 1.3.3 — решить, что входит в MVP: form-first only или form-first + drag/drop resource UX

## Milestone 2 — Live sync completion

### Slice 2.1 — Notification chain

- Task 2.1.1 — задокументировать sidecar → Rust bridge → frontend event contract
- Task 2.1.2 — подписать desktop frontend на `board.changed`
- Task 2.1.3 — подписать desktop frontend на `task.changed`
- Task 2.1.4 — реализовать safe board refresh without UX glitches
- Task 2.1.5 — проверить end-to-end watcher → UI refresh

## Milestone 3 — OpenCode companion integration

### Slice 3.1 — Launch and current project binding

- Task 3.1.1 — зафиксировать launch contract plugin → companion app
- Task 3.1.2 — сделать active OpenCode project default context
- Task 3.1.3 — убрать ambiguity между `--directory` и `process.cwd()`
- Task 3.1.4 — проверить plugin-opened board на правильном project root

### Slice 3.2 — Project catalog and switching

- Task 3.2.1 — определить источник списка известных OpenCode проектов
- Task 3.2.2 — реализовать project picker в companion app
- Task 3.2.3 — реализовать controlled rebind to selected project
- Task 3.2.4 — обеспечить full-edit mode после ручного переключения
- Task 3.2.5 — проверить write flows на неактивном в OpenCode проекте

### Slice 3.3 — OpenCode command/hotkey/auto-launch hardening

- Task 3.3.1 — зафиксировать подтверждённый command surface
- Task 3.3.2 — уточнить capability-dependent hotkey strategy
- Task 3.3.3 — определить и реализовать optional auto-launch contract

## Milestone 4 — Host-native UX context

### Slice 4.1 — Theme and font binding

- Task 4.1.1 — подтвердить доступный host theme/font context
- Task 4.1.2 — передать runtime context из plugin/host adapter в companion app
- Task 4.1.3 — применить host-derived theme tokens в desktop UI
- Task 4.1.4 — применить host-derived font settings
- Task 4.1.5 — оставить fallback preset только как degraded path

## Milestone 5 — Operational workflow hardening

### Slice 5.1 — Preflight / orchestration completeness

- Task 5.1.1 — проверить `planned -> active` end-to-end against updated contract
- Task 5.1.2 — убедиться, что blocker explanation пишется и читается consistently
- Task 5.1.3 — проверить orchestration/file-first path при недоступности runtime bridge

### Slice 5.2 — Source transparency and degraded UX

- Task 5.2.1 — показать выбранный primary source в UI
- Task 5.2.2 — показать degraded mode and diagnostics honestly
- Task 5.2.3 — подготовить manual source override design for post-MVP or near-MVP

## Milestone 6 — Polish after functionality

### Slice 6.1 — Accessibility and keyboard refinement

- Task 6.1.1 — вернуться к desktop a11y cleanup только после M1–M5
- Task 6.1.2 — расширить keyboard-driven task workflow

### Slice 6.2 — Docs and release readiness

- Task 6.2.1 — обновить docs под реальный functional state
- Task 6.2.2 — добавить smoke/integration checks
- Task 6.2.3 — подготовить release packaging for plugin + companion app
