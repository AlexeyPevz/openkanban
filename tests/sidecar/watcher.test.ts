import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { FileWatcher } from '@openkanban/sidecar';

describe('FileWatcher', () => {
  let tmpDir: string;
  let tasksDir: string;
  let watcher: FileWatcher | null = null;
  const onTaskChanged = vi.fn();
  const onBoardChanged = vi.fn();

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'watcher-'));
    tasksDir = path.join(tmpDir, '.tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    onTaskChanged.mockClear();
    onBoardChanged.mockClear();
  });

  afterEach(async () => {
    if (watcher) {
      await watcher.stop();
      watcher = null;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('calls onTaskChanged when a .md file is added', async () => {
    watcher = new FileWatcher({
      projectDir: tmpDir,
      onTaskChanged,
      onBoardChanged,
      debounceMs: 100,
    });
    watcher.start();

    // Wait for watcher to initialize
    await new Promise((r) => setTimeout(r, 500));

    // Add a task file
    fs.writeFileSync(
      path.join(tasksDir, 'task-001.md'),
      '---\ntitle: Test\nstatus: planned\n---\n',
    );

    // Wait for debounce + fs event
    await new Promise((r) => setTimeout(r, 800));

    expect(onTaskChanged).toHaveBeenCalledWith('task-001', 'added');
  });

  it('calls onBoardChanged after debounce', async () => {
    watcher = new FileWatcher({
      projectDir: tmpDir,
      onBoardChanged,
      debounceMs: 100,
    });
    watcher.start();

    await new Promise((r) => setTimeout(r, 500));

    fs.writeFileSync(
      path.join(tasksDir, 'task-002.md'),
      '---\ntitle: Another\nstatus: planned\n---\n',
    );

    await new Promise((r) => setTimeout(r, 800));

    expect(onBoardChanged).toHaveBeenCalled();
  });

  it('stops cleanly', async () => {
    watcher = new FileWatcher({
      projectDir: tmpDir,
      onBoardChanged,
    });
    watcher.start();
    await watcher.stop();
    watcher = null;
    // No error thrown = success
  });
});
