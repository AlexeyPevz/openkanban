// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { draggable } from '../../packages/desktop/src/lib/actions/draggable.js';
import { droptarget, type DropTargetOptions } from '../../packages/desktop/src/lib/actions/droptarget.js';
import { shortcuts, type ShortcutMap } from '../../packages/desktop/src/lib/actions/shortcuts.js';

/**
 * Helper: create a DragEvent with a mock dataTransfer.
 * happy-dom may not support DataTransfer fully, so we create a
 * plain event and attach a mock dataTransfer via defineProperty.
 */
function createDragEvent(
  type: string,
  data?: Record<string, string>,
): DragEvent {
  const stored: Record<string, string> = { ...data };
  const event = new Event(type, {
    bubbles: true,
    cancelable: true,
  }) as DragEvent;

  const mockDataTransfer = {
    data: stored,
    effectAllowed: 'uninitialized' as string,
    dropEffect: 'none' as string,
    setData(format: string, value: string) {
      stored[format] = value;
    },
    getData(format: string) {
      return stored[format] ?? '';
    },
  };

  Object.defineProperty(event, 'dataTransfer', {
    value: mockDataTransfer,
    writable: false,
  });

  return event;
}

// ──────────────────────────────────────────────
// draggable
// ──────────────────────────────────────────────
describe('draggable', () => {
  let node: HTMLDivElement;

  beforeEach(() => {
    node = document.createElement('div');
    document.body.appendChild(node);
  });

  it('sets draggable attribute on node', () => {
    draggable(node, 'task-1');
    expect(node.draggable).toBe(true);
  });

  it('sets aria-grabbed to false initially', () => {
    draggable(node, 'task-1');
    expect(node.getAttribute('aria-grabbed')).toBe('false');
  });

  it('on dragstart: adds dragging class, sets aria-grabbed to true, sets dataTransfer data', () => {
    draggable(node, 'task-1');
    const event = createDragEvent('dragstart');
    node.dispatchEvent(event);

    expect(node.classList.contains('dragging')).toBe(true);
    expect(node.getAttribute('aria-grabbed')).toBe('true');
    expect((event.dataTransfer as any).data['text/plain']).toBe('task-1');
    expect(event.dataTransfer!.effectAllowed).toBe('move');
  });

  it('on dragend: removes dragging class, sets aria-grabbed to false', () => {
    draggable(node, 'task-1');

    // First trigger dragstart to add the class
    node.dispatchEvent(createDragEvent('dragstart'));
    expect(node.classList.contains('dragging')).toBe(true);

    // Now trigger dragend
    node.dispatchEvent(createDragEvent('dragend'));
    expect(node.classList.contains('dragging')).toBe(false);
    expect(node.getAttribute('aria-grabbed')).toBe('false');
  });

  it('update() changes the task ID used in dragstart', () => {
    const result = draggable(node, 'task-1');
    result!.update!('task-99');

    const event = createDragEvent('dragstart');
    node.dispatchEvent(event);
    expect((event.dataTransfer as any).data['text/plain']).toBe('task-99');
  });

  it('destroy() removes event listeners', () => {
    const result = draggable(node, 'task-1');
    result!.destroy!();

    // After destroy, dragstart should no longer add class
    node.dispatchEvent(createDragEvent('dragstart'));
    expect(node.classList.contains('dragging')).toBe(false);
  });
});

// ──────────────────────────────────────────────
// droptarget
// ──────────────────────────────────────────────
describe('droptarget', () => {
  let node: HTMLDivElement;

  beforeEach(() => {
    node = document.createElement('div');
    document.body.appendChild(node);
  });

  it('sets aria-dropeffect to move', () => {
    const opts: DropTargetOptions = { status: 'done', onDrop: vi.fn() };
    droptarget(node, opts);
    expect(node.getAttribute('aria-dropeffect')).toBe('move');
  });

  it('on dragover: prevents default and adds drag-over class', () => {
    const opts: DropTargetOptions = { status: 'done', onDrop: vi.fn() };
    droptarget(node, opts);

    const event = createDragEvent('dragover');
    const preventSpy = vi.spyOn(event, 'preventDefault');
    node.dispatchEvent(event);

    expect(preventSpy).toHaveBeenCalled();
    expect(node.classList.contains('drag-over')).toBe(true);
  });

  it('on dragleave: removes drag-over class', () => {
    const opts: DropTargetOptions = { status: 'done', onDrop: vi.fn() };
    droptarget(node, opts);

    // First add the class via dragover
    node.dispatchEvent(createDragEvent('dragover'));
    expect(node.classList.contains('drag-over')).toBe(true);

    // Then dragleave removes it
    node.dispatchEvent(createDragEvent('dragleave'));
    expect(node.classList.contains('drag-over')).toBe(false);
  });

  it('on drop: prevents default, removes drag-over class, calls onDrop', () => {
    const onDrop = vi.fn();
    const opts: DropTargetOptions = { status: 'active', onDrop };
    droptarget(node, opts);

    // Add drag-over class first
    node.dispatchEvent(createDragEvent('dragover'));
    expect(node.classList.contains('drag-over')).toBe(true);

    // Drop with taskId data
    const dropEvent = createDragEvent('drop', { 'text/plain': 'task-42' });
    const preventSpy = vi.spyOn(dropEvent, 'preventDefault');
    node.dispatchEvent(dropEvent);

    expect(preventSpy).toHaveBeenCalled();
    expect(node.classList.contains('drag-over')).toBe(false);
    expect(onDrop).toHaveBeenCalledWith('task-42', 'active');
  });

  it('update() changes opts so new onDrop is called', () => {
    const onDrop1 = vi.fn();
    const onDrop2 = vi.fn();
    const result = droptarget(node, { status: 'planned', onDrop: onDrop1 });

    result!.update!({ status: 'done', onDrop: onDrop2 });

    const dropEvent = createDragEvent('drop', { 'text/plain': 'task-7' });
    node.dispatchEvent(dropEvent);

    expect(onDrop1).not.toHaveBeenCalled();
    expect(onDrop2).toHaveBeenCalledWith('task-7', 'done');
  });
});

// ──────────────────────────────────────────────
// shortcuts
// ──────────────────────────────────────────────
describe('shortcuts', () => {
  let node: HTMLDivElement;

  beforeEach(() => {
    node = document.createElement('div');
    document.body.appendChild(node);
  });

  it('calls action for simple key match', () => {
    const handler = vi.fn();
    shortcuts(node, { n: handler });

    node.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls action for Escape key', () => {
    const handler = vi.fn();
    shortcuts(node, { Escape: handler });

    node.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls action for combo Ctrl+s', () => {
    const handler = vi.fn();
    shortcuts(node, { 'Ctrl+s': handler });

    node.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
      }),
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls preventDefault on matched key', () => {
    const handler = vi.fn();
    shortcuts(node, { n: handler });

    const event = new KeyboardEvent('keydown', {
      key: 'n',
      bubbles: true,
      cancelable: true,
    });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    node.dispatchEvent(event);

    expect(preventSpy).toHaveBeenCalled();
  });

  it('does nothing for unmatched keys', () => {
    const handler = vi.fn();
    shortcuts(node, { n: handler });

    const event = new KeyboardEvent('keydown', {
      key: 'x',
      bubbles: true,
      cancelable: true,
    });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    node.dispatchEvent(event);

    expect(handler).not.toHaveBeenCalled();
    expect(preventSpy).not.toHaveBeenCalled();
  });

  it('update() changes keymap', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const result = shortcuts(node, { n: handler1 });

    result!.update!({ m: handler2 });

    // Old key no longer works
    node.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true }));
    expect(handler1).not.toHaveBeenCalled();

    // New key works
    node.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true }));
    expect(handler2).toHaveBeenCalledTimes(1);
  });
});
