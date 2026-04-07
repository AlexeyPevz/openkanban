import type { ResourceRecord, ResourceKind } from './types.js';

export interface ResourceRegistry {
  all(): ResourceRecord[];
  byKind(kind: ResourceKind): ResourceRecord[];
  find(kind: ResourceKind, name: string): ResourceRecord | undefined;
  available(): ResourceRecord[];
}

export function createResourceRegistry(
  records: ResourceRecord[],
): ResourceRegistry {
  return {
    all: () => [...records],
    byKind: (kind) => records.filter((r) => r.kind === kind),
    find: (kind, name) =>
      records.find((r) => r.kind === kind && r.name === name),
    available: () => records.filter((r) => r.available),
  };
}
