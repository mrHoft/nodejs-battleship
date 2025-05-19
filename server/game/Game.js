"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameManager = void 0;
const types_1 = require("../types");
const Bot_1 = require("./Bot");
const board_1 = require("../utils/board");
class GameManager {
    constructor(playerManager, winnersDB) {
        this.playerManager = playerManager;
        this.winnersDB = winnersDB;
        this.games = [];
        this.botManager = new Bot_1.BotManager();
    }
    createGame(playerIds) {
        const game = {
            idGame: this.generateGameId(),
            players: [
                {
                    idPlayer: playerIds[0],
                    ships: [],
                    board: this.createEmptyBoard(),
                    hitsReceived: 0
                },
                {
                    idPlayer: playerIds[1],
                    ships: [],
                    board: this.createEmptyBoard(),
                    hitsReceived: 0
                }
            ],
            currentPlayerIndex: playerIds[0],
            started: false
        };
        this.games.push(game);
        return game;
    }
    addShips(gameId, playerId, ships) {
        const game = this.getGame(gameId);
        if (!game)
            return false;
        const player = game.players.find(p => p.idPlayer === playerId);
        if (!player)
            return false;
        if (!this.validateShips()) {
            return false;
        }
        player.ships = ships;
        player.board = this.placeShipsOnBoard(ships);
        (0, board_1.printShips)(player.ships);
        (0, board_1.printBoard)(player.board, true);
        if (game.players.every(p => p.ships.length > 0)) {
            game.started = true;
        }
        return true;
    }
    processAttack(gameId, attackerId, x, y) {
        const game = this.getGame(gameId);
        if (!game || !game.started || game.currentPlayerIndex !== attackerId) {
            return null;
        }
        const defender = game.players.find(p => p.idPlayer !== attackerId);
        if (!defender) {
            console.log('Wrong attacker id:', attackerId);
            return null;
        }
        if (defender.board[x][y] === 'hit' || defender.board[x][y] === 'miss') {
            console.log(`Coordinate ${x}-${y} was already attacked`);
            (0, board_1.printBoard)(defender.board);
            return null;
        }
        let result;
        if (defender.board[x][y] === 'ship') {
            const ship = this.findShipAt(defender.ships, x, y);
            if (!ship) {
                console.log(`No ship on coordinate ${x}-${y}`);
                (0, board_1.printBoard)(defender.board, true);
                return null;
            }
            defender.board[x][y] = 'hit';
            defender.hitsReceived++;
            const isSunk = this.isShipSunk(defender.board, ship);
            if (isSunk) {
                this.markAroundShip(defender.board, ship);
                const allSunk = defender.ships.every(s => this.isShipSunk(defender.board, s));
                if (allSunk) {
                    result = {
                        status: 'killed',
                        gameOver: true,
                        winnerId: attackerId
                    };
                    const winner = this.playerManager.getPlayer(attackerId);
                    if (winner) {
                        this.winnersDB.addWinner(winner);
                    }
                }
                else {
                    result = { status: 'killed' };
                }
            }
            else {
                result = { status: 'shot' };
            }
        }
        else {
            defender.board[x][y] = 'miss';
            result = { status: 'miss' };
            game.currentPlayerIndex = defender.idPlayer;
        }
        return result;
    }
    handlePlayerDisconnect(playerId) {
        const result = {
            disconnectedGameIds: [],
            awardedWins: []
        };
        const gamesWithPlayer = this.games.filter(game => game.players.some(p => p.idPlayer === playerId));
        gamesWithPlayer.forEach(game => {
            if (game.started) {
                const otherPlayer = game.players.find(p => p.idPlayer !== playerId);
                if (otherPlayer) {
                    result.awardedWins.push({
                        winnerId: otherPlayer.idPlayer,
                        gameId: game.idGame
                    });
                    const winner = this.playerManager.getPlayer(otherPlayer.idPlayer);
                    if (winner) {
                        this.winnersDB.addWinner(winner);
                    }
                }
            }
            this.removeGame(game.idGame);
            result.disconnectedGameIds.push(game.idGame);
        });
        return result;
    }
    getGame(gameId) {
        return this.games.find(game => game.idGame === gameId);
    }
    getPlayerShips(gameId, playerId) {
        const game = this.getGame(gameId);
        if (!game)
            return undefined;
        const player = game.players.find(p => p.idPlayer === playerId);
        return player === null || player === void 0 ? void 0 : player.ships;
    }
    removeGame(gameId) {
        this.games = this.games.filter(game => game.idGame !== gameId);
    }
    isGameInProgress(gameId) {
        const game = this.getGame(gameId);
        return !!game && game.started;
    }
    areBothPlayersReady(gameId) {
        const game = this.getGame(gameId);
        if (!game)
            return false;
        return game.players.every((player, i) => {
            console.log(`Player ${i} ships:`, player.ships.length);
            return player.ships.length > 0;
        });
    }
    generateRandomAttack(gameId) {
        const game = this.getGame(gameId);
        if (!game)
            return null;
        const currentPlayerId = game.currentPlayerIndex;
        const defender = game.players.find(p => p.idPlayer !== currentPlayerId);
        if (!defender)
            return null;
        const availableCells = [];
        for (let x = 0; x < 10; x++) {
            for (let y = 0; y < 10; y++) {
                const cell = defender.board[x][y];
                if (cell === null || cell === 'ship') {
                    availableCells.push({ x, y });
                }
            }
        }
        if (availableCells.length === 0)
            return null;
        return availableCells[Math.floor(Math.random() * availableCells.length)];
    }
    createEmptyBoard() {
        return Array(10).fill(null).map(() => Array(10).fill(null));
    }
    createSinglePlayerGame(humanPlayerId) {
        const game = {
            idGame: this.generateGameId(),
            players: [
                {
                    idPlayer: humanPlayerId,
                    ships: [],
                    board: this.createEmptyBoard(),
                    hitsReceived: 0
                },
                Object.assign(Object.assign({ idPlayer: types_1.BOT_PLAYER_ID }, this.botManager.createRandomBoard()), { hitsReceived: 0 })
            ],
            currentPlayerIndex: humanPlayerId,
            started: false,
            isBotGame: true
        };
        this.games.push(game);
        return game;
    }
    processBotMove(gameId) {
        const game = this.getGame(gameId);
        if (!(game === null || game === void 0 ? void 0 : game.isBotGame) || game.currentPlayerIndex !== types_1.BOT_PLAYER_ID) {
            return null;
        }
        const move = this.botManager.makeMove(game);
        const result = this.processAttack(gameId, types_1.BOT_PLAYER_ID, move.x, move.y);
        if (!result)
            return null;
        return {
            x: move.x,
            y: move.y,
            status: result.status
        };
    }
    isAllShipsSunk(gameId, playerId) {
        const game = this.getGame(gameId);
        if (!game)
            return false;
        const player = game.players.find(p => p.idPlayer === playerId);
        if (!player)
            return false;
        return player.ships.every(ship => this.isShipSunk(player.board, ship));
    }
    validateShips() {
        return true;
    }
    placeShipsOnBoard(ships) {
        const board = this.createEmptyBoard();
        ships.forEach(ship => {
            for (let i = 0; i < ship.length; i++) {
                const x = ship.direction ? ship.position.x : ship.position.x + i;
                const y = ship.direction ? ship.position.y + i : ship.position.y;
                if (x < 10 && y < 10) {
                    board[x][y] = 'ship';
                }
            }
        });
        return board;
    }
    findShipAt(ships, x, y) {
        return ships.find(ship => {
            if (ship.direction) {
                return (ship.position.x === x &&
                    y >= ship.position.y &&
                    y < ship.position.y + ship.length);
            }
            else {
                return (ship.position.y === y &&
                    x >= ship.position.x &&
                    x < ship.position.x + ship.length);
            }
        });
    }
    isShipSunk(board, ship) {
        for (let i = 0; i < ship.length; i++) {
            const x = ship.direction ? ship.position.x : ship.position.x + i;
            const y = ship.direction ? ship.position.y + i : ship.position.y;
            if (board[x][y] !== 'hit') {
                return false;
            }
        }
        return true;
    }
    markAroundShip(board, ship) {
        for (let i = -1; i <= ship.length; i++) {
            for (let j = -1; j <= 1; j++) {
                const x = ship.direction ? ship.position.x + j : ship.position.x + i;
                const y = ship.direction ? ship.position.y + i : ship.position.y + j;
                if (x >= 0 && x < 10 && y >= 0 && y < 10 && board[x][y] === null) {
                    board[x][y] = 'miss';
                }
            }
        }
    }
    generateGameId() {
        return Date.now();
    }
}
exports.GameManager = GameManager;
