"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WinnersDB = void 0;
class WinnersDB {
    constructor() {
        this.winners = [];
    }
    getWinners() {
        return [...this.winners];
    }
    addWinner(player) {
        const existingWinner = this.winners.find(w => w.index === player.index);
        if (existingWinner) {
            existingWinner.wins++;
        }
        else {
            this.winners.push(Object.assign({}, player));
        }
    }
}
exports.WinnersDB = WinnersDB;
