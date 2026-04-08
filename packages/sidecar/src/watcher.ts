import * as path from 'node:path';
import { watch } from 'chokidar';
import type { FSWatcher } from 'chokidar';

export interface FileWatcherOptions {
  projectDir: string;
  onTaskChanged?: (taskId: string, changeType: 'added' | 'changed' | 'removed') => void;
  onBoardChanged?: () => void;
  debounceMs?: number;
}

export class FileWatcher {
  private watcher: FSWatcher | null = null;
  private readonly projectDir: string;
  private readonly onTaskChanged?: FileWatcherOptions['onTaskChanged'];
  private readonly onBoardChanged?: FileWatcherOptions['onBoardChanged'];
  private readonly debounceMs: number;
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(options: FileWatcherOptions) {
    this.projectDir = options.projectDir;
    this.onTaskChanged = options.onTaskChanged;
    this.onBoardChanged = options.onBoardChanged;
    this.debounceMs = options.debounceMs ?? 300;
  }

  start(): void {
    const tasksDir = path.join(this.projectDir, '.tasks');

    this.watcher = watch(tasksDir, {
      ignoreInitial: true,
      persistent: true,
      depth: 2,
    });

    this.watcher.on('add', (filePath) => this.handleChange(filePath, 'added'));
    this.watcher.on('change', (filePath) => this.handleChange(filePath, 'changed'));
    this.watcher.on('unlink', (filePath) => this.handleChange(filePath, 'removed'));
  }

  private handleChange(filePath: string, changeType: 'added' | 'changed' | 'removed'): void {
    const relative = path.relative(path.join(this.projectDir, '.tasks'), filePath);

    // Debounce per file
    const existing = this.debounceTimers.get(filePath);
    if (existing) clearTimeout(existing);

    this.debounceTimers.set(
      filePath,
      setTimeout(() => {
        this.debounceTimers.delete(filePath);

        const basename = path.basename(filePath);

        // Task file: *.md in any subdirectory
        if (basename.endsWith('.md')) {
          const taskId = basename.replace(/\.md$/, '');
          this.onTaskChanged?.(taskId, changeType);
        }

        // Board changed for any file in .tasks/
        this.onBoardChanged?.();
      }, this.debounceMs),
    );
  }

  async stop(): Promise<void> {
    // Clear all pending debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }
}
