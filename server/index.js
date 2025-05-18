"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const server = new server_1.BattleshipServer();
process.on('SIGINT', () => {
    server.close();
    process.exit();
});
