import WebSocket from 'ws';

export class Logger {
  static getClientInfo(ws: WebSocket): { ip: string; port?: number } {
    return {
      ip: (ws as any).clientIp || 'unknown',
      port: (ws as any).clientPort
    };
  }

  static logConnection(ws: WebSocket, ip: string, port?: number): void {
    console.log(`[${new Date().toISOString()}] [${ip}:${port || '?'}] Client connected`);
  }

  static logDisconnection(ws: WebSocket): void {
    const { ip, port } = this.getClientInfo(ws);
    console.log(`[${new Date().toISOString()}] [${ip}:${port || '?'}] Client disconnected`);
  }

  static logCommand(ws: WebSocket, command: any): void {
    const { ip, port } = this.getClientInfo(ws);
    console.log(`[${new Date().toISOString()}] [${ip}:${port || '?'}] Received command:`, command);
  }

  static logResponse(ws: WebSocket, response: any): void {
    const { ip, port } = this.getClientInfo(ws);
    console.log(`[${new Date().toISOString()}] [${ip}:${port || '?'}] Sent response:`, response);
  }

  static logError(ws: WebSocket, error: Error): void {
    const { ip, port } = this.getClientInfo(ws);
    console.error(`[${new Date().toISOString()}] [${ip}:${port || '?'}] Error:`, error);
  }
}
