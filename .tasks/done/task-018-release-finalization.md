# Task 018 — Release packaging and docs finalization

## Цель

Довести release-facing documentation до состояния, в котором README и kanban-plugin docs честно отражают текущее состояние desktop/plugin/sidecar workflow и не создают doc drift перед merge.

## Что сделано

- Обновлён корневой `README.md` под актуальное состояние проекта.
- Обновлены release/user-facing docs:
  - `docs/kanban-plugin/README.md`
  - `docs/kanban-plugin/USAGE.md`
  - `docs/kanban-plugin/opencode-capability-matrix.md`
- Diff оставлен в merge-ready scope ветки вместе с финальным desktop accessibility polish.

## Touched files

- `README.md`
- `docs/kanban-plugin/README.md`
- `docs/kanban-plugin/USAGE.md`
- `docs/kanban-plugin/opencode-capability-matrix.md`

## Верификация

- `npm test` → PASS (`39 passed`, `3 skipped`; `237 passed`, `10 skipped`)
- `npm run build` → PASS
- Финальный reviewer gate по общему diff не нашёл merge-blocking doc/code drift issues

## Риски / заметки

- Task закрыт на уровне текущего незакоммиченного diff ветки `fix/task-008-desktop-sidecar-resource-root`.
- `packages/core/tsconfig.tsbuildinfo` остаётся build-noise и должен быть исключён из commit scope.

## Next step

- Коммитить doc diff вместе с финальным Task 019 polish changes, исключив build-noise.
- После commit ветка выглядит готовой к PR merge flow.
