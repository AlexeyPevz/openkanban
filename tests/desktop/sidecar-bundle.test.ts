import { describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

interface ProbeResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

function runBundledSidecarBoardLoad(): Promise<ProbeResult> {
  return new Promise((resolvePromise, reject) => {
    const bundlePath = resolve(process.cwd(), 'packages/sidecar/dist/sidecar-bundle.cjs');
    const child = spawn('node', [bundlePath], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (result: ProbeResult) => {
      if (settled) return;
      settled = true;
      resolvePromise(result);
    };

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
      if (stdout.includes('\n')) {
        child.kill();
      }
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      finish({ code, signal, stdout, stderr });
    });

    child.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'board.load',
      params: {},
    }) + '\n');

    setTimeout(() => {
      child.stdin.end();
    }, 50);

    setTimeout(() => {
      if (!settled) {
        child.kill();
        finish({ code: null, signal: null, stdout, stderr: `${stderr}\nTIMEOUT` });
      }
    }, 12000);
  });
}

describe('release sidecar bundle', () => {
  it('responds to board.load over JSON-RPC', { timeout: 15000 }, async () => {
    const result = await runBundledSidecarBoardLoad();

    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('"jsonrpc":"2.0"');
    expect(result.stdout).toContain('"id":1');
    expect(result.stdout).toContain('"state":"success"');
  });
});
