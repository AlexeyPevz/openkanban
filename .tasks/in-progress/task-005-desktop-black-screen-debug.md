# Task 005 — Отладка черного экрана desktop UI

## Цель
Найти и подтвердить root cause черного экрана в `openkanban-desktop.exe` после уже примененного фикса `base: './'`.

## Входные файлы
- `AGENTS.md`
- `.tasks/in-progress/task-003-kanban-mvp-execution.md`
- `packages/desktop/src/main.ts`
- `packages/desktop/src/App.svelte`
- `packages/desktop/src/lib/components/Board.svelte`
- `packages/desktop/src-tauri/src/main.rs`
- `packages/desktop/src-tauri/tauri.conf.json`

## Контекст
- Пользователь подтвердил: после rebuild и reinstall desktop binary экран всё ещё черный.
- Предыдущая гипотеза про Vite absolute asset paths уже закрыта фиксом `base: './'`, но симптом остался.
- Нельзя делать новые фиксы без доказанного root cause.

## Гипотезы для проверки
- Svelte app не монтируется из-за runtime exception в WebView.
- Tauri frontend грузится, но падает на раннем импорте/инициализации.
- RPC/sidecar bridge ломает initial render.
- CSS/theme создаёт визуально черный экран при живом DOM.

## Критерии готовности
- Есть воспроизводимый сценарий.
- Есть минимальные доказательства места поломки: mount, import, rpc, sidecar или styles.
- Зафиксирован root cause или узкий следующий диагностический шаг.

## Верификация
- Получены логи/симптомы, позволяющие локализовать поломку.
- Если будет внесён фикс, после него повторно пройти relevant tests и ручную проверку запуска.

## Статус
- Создан task для bounded debug session.

## Диагностические результаты
- Подтверждено: `packages/desktop/dist/index.html` корректно использует относительные asset paths `./assets/...` и содержит `<div id="app"></div>`. Гипотеза про сломанный `base` больше не основная.
- Подтверждено: CSS-тема не объясняет symptom сама по себе — в `index-BhNCmuV9.css` текст и фон различаются, значит чистый black-on-black маловероятен как root cause.
- Подтверждено: browser bundle `packages/desktop/dist/assets/index-BnxV6Hfb.js` содержит ранние импорты Node built-ins: `import "node:fs/promises"; import "node:path"; import ... from "os"; import ... from "fs";`.
- Локализовано происхождение утечки: desktop UI импортирует `@openkanban/core` из компонентов `Card.svelte` и `TaskDetails.svelte` для `getTaskResources`, а barrel `packages/core/src/index.ts` реэкспортирует Node-only repository/watch/write modules и `ui/board-store.ts`, который сам импортирует canonical repository classes.
- Следствие: WebView получает Node-only imports в самом entry bundle до первого render/mount. Это согласуется с symptom "черный экран" как раннее падение фронтенда до отображения UI.

## Root cause summary
- Root cause: desktop frontend импортирует общий barrel `@openkanban/core`, который не browser-safe и тянет Node-only модули (`node:fs/promises`, `node:path`, `node:crypto`, repository/watch/write code) в WebView bundle.
- `rollupOptions.external` не устраняет проблему для рантайма браузера: imports остаются в output bundle, и WebView не может их исполнить.

## Узкий следующий шаг
- Новый отдельный task: отделить browser-safe exports от Node-only exports в `@openkanban/core` или заменить desktop-импорты на локальный/browser-safe модуль для `getTaskResources` и связанных типов, затем rebuild и повторная проверка desktop запуска.
