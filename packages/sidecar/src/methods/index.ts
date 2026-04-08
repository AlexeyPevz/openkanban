export type RpcHandler = (params: Record<string, unknown>) => Promise<unknown>;
export type MethodRegistry = Record<string, RpcHandler>;
