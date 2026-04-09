# Task 006 — Browser-safe boundary для desktop bundle

## Статус
- BLOCKED

## Что нужно было сделать
- Убрать Node-only импорты из browser bundle desktop-приложения, чтобы устранить root cause черного экрана.

## Подтвержденный root cause
- `packages/desktop/src/lib/components/{Card.svelte,TaskDetails.svelte}` импортируют `@openkanban/core`.
- Barrel `packages/core/src/index.ts` смешивает browser-safe exports и Node-only repository/watch/write exports.
- В результате `packages/desktop/dist/assets/index-BnxV6Hfb.js` содержит `import "node:fs/promises"`, `import "node:path"`, а также импорты `fs`, `os`, `util`, `stream`, `events`, `node:crypto`.
- Это browser-unsafe для WebView и соответствует раннему падению фронтенда до render/mount.

## Что пробовали
1. **Attempt 1 — backend subagent**
   - Scope: минимальный safe fix с TDD/verification.
   - Result: пустой handoff без `status`.
   - Outcome: по контракту failed.

2. **Attempt 2 — backend subagent (суженный scope)**
   - Scope: только минимальный fix-path — убрать runtime imports `@openkanban/core` из desktop browser path.
   - Result: пустой handoff без `status`.
   - Outcome: по контракту failed.

3. **Attempt 3 — frontend subagent (альтернативная роль)**
   - Scope: browser/runtime boundary fix для Svelte/WebView.
   - Result: пустой handoff без `status`.
   - Outcome: по контракту failed.

## Что удалось установить до блокировки
- `packages/desktop/dist/index.html` корректный: относительные asset paths и `<div id="app"></div>` на месте.
- CSS-тема сама по себе не объясняет symptom.
- Root cause локализован достаточно узко для bounded fix.

## Почему задача заблокирована
- По оркестраторскому протоколу достигнут MAX retry (3 попытки).
- Подагенты не возвращают валидный structured handoff, поэтому невозможно безопасно продолжать эту ветку без нового способа исполнения.

## Что нужно для разблокировки
- Либо исправить/обойти проблему subagent execution/handoff и повторить Task 006,
- либо открыть новую task/session с иным исполнителем/режимом выполнения, способным реально внести кодовые изменения и вернуть проверяемый результат.

## Минимальный следующий fix-path после разблокировки
- Вынести browser-safe helper для `getTaskResources` и перевести `Card.svelte`/`TaskDetails.svelte` на него,
- затем rebuild desktop,
- затем `grep` по `packages/desktop/dist/assets/*.js` на отсутствие `node:fs/promises`/`node:path` и связанных Node imports,
- затем runtime smoke desktop запуска.
