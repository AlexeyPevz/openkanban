export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params: unknown;
}

export function sendNotification(
  method: string,
  params: unknown,
): void {
  const notification: JsonRpcNotification = {
    jsonrpc: '2.0',
    method,
    params,
  };
  process.stdout.write(JSON.stringify(notification) + '\n');
}
