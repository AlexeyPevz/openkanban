# Desktop A11y Open Details Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore keyboard-accessible task-details opening in desktop UI without reintroducing nested interactive semantics on task cards.

**Architecture:** Keep the card container mouse-clickable for convenience, but move keyboard access for opening details onto a dedicated explicit control inside the card actions area. Preserve the existing `Edit` action, avoid making the whole card pseudo-interactive again, and add only the minimum test coverage needed for the new action path.

**Tech Stack:** Svelte 5, TypeScript, Vitest, existing desktop board/task-detail stores.

---

## File Map

### Existing files to modify

- `packages/desktop/src/lib/components/Card.svelte` — add explicit keyboard-accessible `Open details` control while keeping mouse click behavior on the card container.
- `tests/desktop/stores.test.ts` — extend with the smallest meaningful regression coverage if existing tests can validate the new detail-open path or event semantics.

### Files to leave untouched except verification noise

- `packages/desktop/src/lib/components/TaskDetails.svelte`
- `packages/desktop/src/lib/components/Column.svelte`
- `packages/desktop/src/lib/components/TaskForm.svelte`
- `packages/desktop/src/lib/components/ShortcutsHelp.svelte`
- `README.md`
- `docs/kanban-plugin/README.md`
- `docs/kanban-plugin/USAGE.md`
- `docs/kanban-plugin/opencode-capability-matrix.md`
- `packages/core/tsconfig.tsbuildinfo` (do not include in meaningful commit scope)

---

## Task 1: Add explicit open-details control

**Files:**
- Modify: `packages/desktop/src/lib/components/Card.svelte`
- Optional test touch: `tests/desktop/stores.test.ts`

- [ ] **Step 1: Reproduce current merge-blocker evidence**

Run:

```bash
npm test
```

Expected: tests pass, but current review finding still stands — card details opening is mouse-only because the card container is static and the only keyboard-focusable control inside the card is `Edit`.

- [ ] **Step 2: Add the minimal explicit control**

Update `Card.svelte` so the actions area contains a second real button, e.g. `Open details`, that calls `selectTask(task.id)` directly. Keep `Edit` as a separate button with `stopPropagation()`. Keep the outer card mouse-clickable, but do not restore `role="button"`, `tabindex`, or keyboard handlers on the whole container.

- [ ] **Step 3: Add or adjust the smallest useful regression check**

If existing test patterns allow it cheaply, add one regression test proving there is an explicit action path for selecting/opening details that does not rely on card-container keyboard semantics. If no low-cost component test exists in the current suite, skip new test creation and rely on fresh full-suite verification plus reviewer confirmation.

- [ ] **Step 4: Run verification**

Run:

```bash
npm test
npm run build
```

Expected: both commands pass, and the diff still excludes any intentional changes to `packages/core/tsconfig.tsbuildinfo`.

- [ ] **Step 5: Request final review gate**

Re-run reviewer check on the full uncommitted diff to confirm that:
- nested interactive semantics are still resolved;
- keyboard path exists through the explicit `Open details` button;
- no new merge-blocking issues were introduced.
