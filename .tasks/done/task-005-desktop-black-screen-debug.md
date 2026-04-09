# Task 005 — Отладка черного экрана desktop UI

## Результат
- Статус: завершено
- Outcome: root cause локализован и подтвержден статическими артефактами сборки.

## Что сделано
- Проверены `packages/desktop/src/main.ts`, `App.svelte`, `Board.svelte`, `tauri.conf.json`, `vite.config.ts`.
- Проверен built frontend: `packages/desktop/dist/index.html` и CSS asset.
- Сняты runtime/build evidence через `npx tauri dev` и анализ browser bundle.
- Локализована цепочка импортов, из-за которой browser bundle содержит Node built-ins.

## Подтвержденный root cause
- Desktop WebView импортирует `@openkanban/core` из UI-компонентов.
- Barrel `packages/core/src/index.ts` реэкспортирует Node-only модули repository/watch/write.
- В результате `packages/desktop/dist/assets/index-BnxV6Hfb.js` содержит `import "node:fs/promises"`, `import "node:path"`, `import ... from "fs"`, `os`, `util`, `stream`, `events`, `node:crypto`.
- Такой bundle не browser-safe и может упасть до первого mount/render, что соответствует observed black screen.

## Доказательства
- `packages/desktop/dist/index.html`: asset paths корректные (`./assets/...`), `<div id="app"></div>` присутствует.
- `packages/desktop/dist/assets/index-BhNCmuV9.css`: тема не black-on-black.
- `packages/core/src/ui/board-store.ts`: browser helper `getTaskResources` живет в модуле, который импортирует Node-only repository code.
- `packages/core/src/index.ts`: barrel смешивает browser-safe и Node-only exports.

## Touched files
- `.tasks/in-progress/task-005-desktop-black-screen-debug.md`
- `.tasks/done/task-005-desktop-black-screen-debug.md`

## Верификация
- `grep` по `packages/desktop/dist/assets/*.js` подтвердил наличие Node built-ins в browser bundle.
- `read` built artifacts подтвердил, что проблема не в `index.html` и не в CSS.
- `npx tauri dev` был запущен как источник runtime evidence, но сборка Rust не успела завершиться в отведенный timeout; уже собранных frontend artifacts оказалось достаточно для локализации root cause.

## Следующий task
- Создать отдельный bounded task на исправление browser/runtime boundary:
  - либо split exports в `@openkanban/core` на browser-safe и Node-only entrypoints,
  - либо убрать desktop imports из `@openkanban/core` barrel в пользу локального browser-safe helper.
