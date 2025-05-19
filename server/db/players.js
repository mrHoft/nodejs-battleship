"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerDB = void 0;
class PlayerDB {
    constructor() {
        this.players = [];
    }
    findPlayer(name) {
        return this.players.find(p => p.name === name);
    }
    createPlayer(name, password) {
        const player = {
            name,
            password,
            index: this.generateId(),
            wins: 0,
        };
        this.players.push(player);
        return player;
    }
    updatePlayerWins(playerId) {
        const player = this.players.find(p => p.index === playerId);
        if (player) {
            player.wins++;
        }
    }
    generateId() {
        return Date.now();
    }
}
exports.PlayerDB = PlayerDB;
