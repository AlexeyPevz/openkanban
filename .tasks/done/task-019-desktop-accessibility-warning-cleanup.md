# Task 019 — Desktop accessibility warning cleanup

## Цель

Убрать или существенно сократить Svelte accessibility warnings в desktop UI перед merge/release и не оставить явный quality debt в ключевых пользовательских компонентах.

## Что сделано

- В `packages/desktop/src/lib/components/TaskDetails.svelte` исправлен regression: `<svelte:window>` вынесен на top-level компонента, чтобы не ломать Svelte compile path.
- В `TaskDetails.svelte` сохранены подготовленные a11y-правки: убрана конфликтная pseudo-semantics, field labels переведены в нейтральные `div.field-label`, сохранён безопасный Escape-close path.
- В `packages/desktop/src/lib/components/Card.svelte` устранён nested-interactive конфликт: карточка больше не объявляется pseudo-button на уровне контейнера.
- Для keyboard-access path добавлен явный control `Open details` как отдельная реальная кнопка рядом с `Edit`, без возврата `role="button"`/`tabindex`/`onkeydown` на весь контейнер карточки.
- Подтверждено независимым review, что после правки:
  - nested interactive semantics устранены;
  - keyboard path для открытия details восстановлен;
  - новых merge-blocking a11y/correctness issues не обнаружено.

## Touched files

- `packages/desktop/src/lib/components/Card.svelte`
- `packages/desktop/src/lib/components/Column.svelte`
- `packages/desktop/src/lib/components/TaskDetails.svelte`
- `packages/desktop/src/lib/components/TaskForm.svelte`
- `packages/desktop/src/lib/components/ShortcutsHelp.svelte`
- `docs/superpowers/plans/2026-04-15-desktop-a11y-open-details-control.md`

## Верификация

- `npm test` → PASS (`39 passed`, `3 skipped`; `237 passed`, `10 skipped`)
- `npm run build` → PASS
- Независимый reviewer gate → PASS, merge blockers не найдены

## Риски / заметки

- `packages/core/tsconfig.tsbuildinfo` является build-noise и не должен входить в commit scope.
- План `docs/superpowers/plans/2026-04-15-desktop-a11y-open-details-control.md` создан как file-first артефакт для последнего polish-task; можно включать в commit вместе с остальным diff.

## Next step

- Исключить build-noise (`packages/core/tsconfig.tsbuildinfo`) из commit scope.
- Считать ветку `fix/task-008-desktop-sidecar-resource-root` merge-ready.
- При необходимости оформить финальный commit и переходить к PR merge flow.
