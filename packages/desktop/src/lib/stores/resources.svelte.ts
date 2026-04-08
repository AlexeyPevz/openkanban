import { resourceApi } from '../rpc.js';
import type { ResourceRecord, ResourceKind } from '@neon-tiger/core';

let resources = $state<ResourceRecord[]>([]);
let loading = $state(false);

export function getResources(): ResourceRecord[] {
  return resources;
}

export function isLoading(): boolean {
  return loading;
}

export async function discoverResources(): Promise<void> {
  loading = true;
  const result = await resourceApi.discover();
  if (result.ok) {
    resources = result.data;
  }
  loading = false;
}

export async function refreshResources(): Promise<void> {
  const result = await resourceApi.list();
  if (result.ok) {
    resources = result.data;
  }
}

export function resourcesByKind(kind: ResourceKind): ResourceRecord[] {
  return resources.filter((r) => r.kind === kind);
}

export function availableResources(): ResourceRecord[] {
  return resources.filter((r) => r.available);
}
