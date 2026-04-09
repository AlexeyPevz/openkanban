# Task 008 — Исправление release path для desktop sidecar

## Result
- **status**: success
- **summary**: Подтверждён root cause падения release desktop runtime: Tauri складывал `sidecar-bundle.cjs` по encoded `_up_/...` пути, а Rust runtime искал файл в корне resources. `tauri.conf.json` переведён на map-format для `bundle.resources`, поэтому packaged app теперь получает `sidecar-bundle.cjs` по ожидаемому пути. Дополнительно в `main.rs` добавлено логирование `stderr` sidecar для дальнейшей диагностики.
- **files_changed**:
  - `packages/desktop/src-tauri/tauri.conf.json` (MODIFIED — fixed `bundle.resources` mapping)
  - `packages/desktop/src-tauri/src/main.rs` (MODIFIED — sidecar stderr logger)
  - `tests/desktop/tauri-resource-mapping.test.ts` (NEW — regression test for resource mapping)
- **tests**: `npm test -- tests/desktop/tauri-resource-mapping.test.ts tests/desktop/sidecar-bundle.test.ts` passed; `cargo test` passed; `npm run tauri build` passed.
- **blockers**: нет
- **next_steps**: commit and push fix; при желании отдельно разобрать существующие Svelte a11y warnings.

## Верификация
- ✅ Regression test подтверждает, что `bundle.resources` мапит `../../../packages/sidecar/dist/sidecar-bundle.cjs` в `sidecar-bundle.cjs`
- ✅ `cargo build --release` создаёт `target/release/sidecar-bundle.cjs`
- ✅ `npm run tauri build` успешно собирает packaged exe и installers
- ✅ Финальный запуск `target/release/openkanban-desktop.exe` показывает окно `OpenKanban` без старого `os error 232`
- ✅ После корректной packaged-сборки не воспроизводится и `ERR_CONNECTION_REFUSED` на `localhost`
