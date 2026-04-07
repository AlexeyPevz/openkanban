import { createResourceRegistry } from '@neon-tiger/core';
import type { ResourceRecord, ResourceKind } from '@neon-tiger/core';
import { discoverResources } from '../discovery/discover-resources.js';
import type { MethodRegistry } from './index.js';

export function createResourceMethods(projectDir: string): MethodRegistry {
  let records: ResourceRecord[] = [];

  return {
    'resources.discover': async () => {
      const discovered = discoverResources(projectDir);
      records = discovered;
      return discovered;
    },

    'resources.list': async (params) => {
      const { kind } = params as { kind?: ResourceKind };
      const registry = createResourceRegistry(records);
      if (kind) {
        return registry.byKind(kind);
      }
      return registry.all();
    },

    'resources.assign': async (params) => {
      const { kind, name } = params as { kind: ResourceKind; name: string };
      const existing = records.find((r) => r.kind === kind && r.name === name);
      if (existing) {
        existing.available = true;
      } else {
        records.push({ kind, name, available: true });
      }
      return { ok: true, kind, name };
    },

    'resources.unassign': async (params) => {
      const { kind, name } = params as { kind: ResourceKind; name: string };
      const existing = records.find((r) => r.kind === kind && r.name === name);
      if (existing) {
        existing.available = false;
      }
      return { ok: true, kind, name };
    },
  };
}
