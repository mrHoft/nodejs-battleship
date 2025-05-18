"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    constructor() {
        this.sockets = new Map();
    }
    getClientInfo(ws) {
        var _a;
        return (_a = this.sockets.get(ws)) !== null && _a !== void 0 ? _a : { ip: 'unknown' };
    }
    getTimestamp() {
        const [date, time] = new Date().toISOString().split('T');
        return `${date} ${time.slice(0, 8)}`;
    }
    logConnection(ws, ip, port) {
        this.sockets.set(ws, { ip, port });
        console.log(`[${this.getTimestamp()}] [${ip}:${port || '?'}] Client connected`);
    }
    logDisconnection(ws) {
        const { ip, port } = this.getClientInfo(ws);
        console.log(`[${this.getTimestamp()}] [${ip}:${port || '?'}] Client disconnected`);
    }
    logCommand(ws, command) {
        const { ip, port } = this.getClientInfo(ws);
        console.log(`[${this.getTimestamp()}] [${ip}:${port || '?'}] Received command:`, command);
    }
    logResponse(ws, response) {
        const { ip, port } = this.getClientInfo(ws);
        console.log(`[${this.getTimestamp()}] [${ip}:${port || '?'}] Sent response:`, response);
    }
    logError(ws, error) {
        const { ip, port } = this.getClientInfo(ws);
        console.error(`[${this.getTimestamp()}] [${ip}:${port || '?'}] Error:`, error);
    }
}
exports.Logger = Logger;
