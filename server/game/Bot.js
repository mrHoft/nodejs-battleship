"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotManager = void 0;
const types_1 = require("../types");
const board_1 = require("../utils/board");
const missChance = {
    easy: 0.9,
    medium: 0.5,
    hard: 0.1
};
class BotManager {
    constructor() {
        this.difficulty = 'medium';
    }
    createRandomBoard() {
        const board = Array(10).fill(null).map(() => Array(10).fill(null));
        const ships = [];
        const shipTypes = [
            { type: 'huge', length: 4, count: 1 },
            { type: 'large', length: 3, count: 2 },
            { type: 'medium', length: 2, count: 3 },
            { type: 'small', length: 1, count: 4 }
        ];
        shipTypes.forEach(shipType => {
            for (let i = 0; i < shipType.count; i++) {
                let placed = false;
                let attempts = 0;
                const maxAttempts = 100;
                while (!placed && attempts < maxAttempts) {
                    attempts++;
                    const direction = Math.random() > 0.5;
                    const maxX = direction ? 10 : 10 - shipType.length;
                    const maxY = direction ? 10 - shipType.length : 10;
                    if (maxX <= 0 || maxY <= 0)
                        continue;
                    const x = Math.floor(Math.random() * maxX);
                    const y = Math.floor(Math.random() * maxY);
                    const newShip = {
                        position: { x, y },
                        direction,
                        length: shipType.length,
                        type: shipType.type
                    };
                    if (this.canPlaceShip(board, newShip)) {
                        this.placeShip(board, newShip);
                        ships.push(newShip);
                        placed = true;
                    }
                }
                if (!placed && attempts >= maxAttempts) {
                    throw new Error(`Failed to place ${shipType.type} ship after ${maxAttempts} attempts`);
                }
            }
        });
        (0, board_1.printShips)(ships);
        (0, board_1.printBoard)(board, true);
        return { board, ships };
    }
    canPlaceShip(board, ship) {
        for (let i = 0; i < ship.length; i++) {
            const x = ship.direction ? ship.position.x : ship.position.x + i;
            const y = ship.direction ? ship.position.y + i : ship.position.y;
            if (x >= 10 || y >= 10)
                return false;
            if (board[x][y] === 'ship')
                return false;
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    const adjX = x + dx;
                    const adjY = y + dy;
                    if (adjX >= 0 && adjX < 10 && adjY >= 0 && adjY < 10) {
                        if (board[adjX][adjY] === 'ship')
                            return false;
                    }
                }
            }
        }
        return true;
    }
    placeShip(board, ship) {
        for (let i = 0; i < ship.length; i++) {
            const x = ship.direction ? ship.position.x : ship.position.x + i;
            const y = ship.direction ? ship.position.y + i : ship.position.y;
            board[x][y] = 'ship';
        }
    }
    makeMove(game) {
        const chance = missChance[this.difficulty];
        const player = game.players.find(p => p.idPlayer !== types_1.BOT_PLAYER_ID);
        if (!player)
            return { x: 0, y: 0 };
        const availableCells = [];
        for (let x = 0; x < 10; x++) {
            for (let y = 0; y < 10; y++) {
                const cell = player.board[x][y];
                if (cell === 'ship' || (cell === null && Math.random() <= chance)) {
                    availableCells.push({ x, y });
                }
            }
        }
        if (availableCells.length === 0)
            return { x: 0, y: 0 };
        return availableCells[Math.floor(Math.random() * availableCells.length)];
    }
}
exports.BotManager = BotManager;
