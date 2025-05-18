import WebSocket from 'ws';

interface ClientInfo { ip: string; port?: number }

export class Logger {
  private sockets: Map<WebSocket, ClientInfo> = new Map()

  private getClientInfo(ws: WebSocket): ClientInfo {
    return this.sockets.get(ws) ?? { ip: 'unknown' }
  }

  private getTimestamp() {
    const [date, time] = new Date().toISOString().split('T')
    return `${date} ${time.slice(0, 8)}`
  }

  logConnection(ws: WebSocket, ip: string, port?: number): void {
    this.sockets.set(ws, { ip, port })
    console.log(`[${this.getTimestamp()}] [${ip}:${port || '?'}] Client connected`);
  }

  logDisconnection(ws: WebSocket): void {
    const { ip, port } = this.getClientInfo(ws);
    console.log(`[${this.getTimestamp()}] [${ip}:${port || '?'}] Client disconnected`);
  }

  logCommand(ws: WebSocket, command: any): void {
    const { ip, port } = this.getClientInfo(ws);
    console.log(`[${this.getTimestamp()}] [${ip}:${port || '?'}] Received command:`, command);
  }

  logResponse(ws: WebSocket, response: any): void {
    const { ip, port } = this.getClientInfo(ws);
    console.log(`[${this.getTimestamp()}] [${ip}:${port || '?'}] Sent response:`, response);
  }

  logError(ws: WebSocket, error: Error): void {
    const { ip, port } = this.getClientInfo(ws);
    console.error(`[${this.getTimestamp()}] [${ip}:${port || '?'}] Error:`, error);
  }
}
