"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerManager = void 0;
class PlayerManager {
    constructor() {
        this.players = new Map();
        this.sockets = new Map();
        this.nameToId = new Map();
    }
    registerPlayer(ws, name, password) {
        const existingPlayerId = this.nameToId.get(name);
        if (existingPlayerId) {
            throw new Error('Player already exists');
        }
        const player = {
            name,
            password,
            index: Date.now(),
            wins: 0,
        };
        this.players.set(player.index, player);
        this.sockets.set(player.index, ws);
        this.nameToId.set(name, player.index);
        return player;
    }
    loginPlayer(ws, name, password) {
        const playerId = this.nameToId.get(name);
        if (!playerId)
            return undefined;
        const player = this.players.get(playerId);
        if (!player || player.password !== password)
            return undefined;
        this.sockets.set(playerId, ws);
        return player;
    }
    getPlayer(playerId) {
        return this.players.get(playerId);
    }
    getPlayerIdBySocket(ws) {
        for (const [id, socket] of this.sockets.entries()) {
            if (socket === ws)
                return id;
        }
        return undefined;
    }
    getSocket(playerId) {
        return this.sockets.get(playerId);
    }
    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (player) {
            this.nameToId.delete(player.name);
        }
        this.players.delete(playerId);
        this.sockets.delete(playerId);
    }
    updateSocket(playerId, newSocket) {
        this.sockets.set(playerId, newSocket);
    }
}
exports.PlayerManager = PlayerManager;
