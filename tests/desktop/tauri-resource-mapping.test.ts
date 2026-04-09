import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('tauri sidecar resource mapping', () => {
  it('maps the bundled sidecar to sidecar-bundle.cjs at the resource root', () => {
    const configPath = resolve(process.cwd(), 'packages/desktop/src-tauri/tauri.conf.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8')) as {
      bundle?: { resources?: unknown };
    };

    expect(config.bundle?.resources).toEqual({
      '../../../packages/sidecar/dist/sidecar-bundle.cjs': 'sidecar-bundle.cjs',
    });
  });
});
