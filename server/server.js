"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BattleshipServer = void 0;
const ws_1 = __importStar(require("ws"));
const types_1 = require("./types");
const players_1 = require("./db/players");
const winners_1 = require("./db/winners");
const Room_1 = require("./game/Room");
const Game_1 = require("./game/Game");
const logger_1 = require("./utils/logger");
const validation_1 = require("./utils/validation");
const Player_1 = require("./game/Player");
const PORT = process.env.PORT || 3000;
class BattleshipServer {
    constructor() {
        this.wss = new ws_1.WebSocketServer({ port: Number(PORT) });
        this.playerDB = new players_1.PlayerDB();
        this.winnersDB = new winners_1.WinnersDB();
        this.roomManager = new Room_1.RoomManager();
        this.playerManager = new Player_1.PlayerManager();
        this.gameManager = new Game_1.GameManager(this.playerManager, this.winnersDB);
        this.logger = new logger_1.Logger();
        console.log(`WebSocket server started on ws://localhost:${PORT}`);
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.wss.on('connection', (ws, req) => {
            const ip = req.socket.remoteAddress || 'unknown';
            const port = req.socket.remotePort;
            this.logger.logConnection(ws, ip, port);
            ws.on('message', (message) => {
                try {
                    const command = JSON.parse(message.toString());
                    if (command.data && typeof command.data === 'string') {
                        command.data = JSON.parse(command.data);
                    }
                    this.handleCommand(ws, command);
                }
                catch (error) {
                    this.logger.logError(ws, error);
                    this.sendError(ws, 'Invalid message format');
                }
            });
            ws.on('close', () => {
                this.logger.logDisconnection(ws);
                this.handleDisconnect(ws);
            });
        });
    }
    handleCommand(ws, command) {
        this.logger.logCommand(ws, command);
        try {
            if (!validation_1.CommandValidator.validate(command)) {
                throw new Error('Invalid command format');
            }
            switch (command.type) {
                case 'reg': {
                    this.handleRegistration(ws, command.data);
                    break;
                }
                case 'create_room':
                    this.handleCreateRoom(ws);
                    break;
                case 'add_user_to_room': {
                    const { indexRoom } = command.data;
                    this.handleAddUserToRoom(ws, indexRoom);
                    break;
                }
                case 'add_ships':
                    this.handleAddShips(ws, command.data);
                    break;
                case 'attack':
                    this.handleAttack(ws, command.data);
                    break;
                case 'randomAttack':
                    this.handleRandomAttack(ws, command.data);
                    break;
                case 'single_play':
                    this.handleSinglePlay(ws);
                    break;
                default:
                    console.log('Unknown command type:', command.type);
            }
        }
        catch (error) {
            console.error('Command handling error:', error instanceof Error ? error.message : 'Unexpected');
            this.sendError(ws, 'Invalid command');
        }
    }
    handleRegistration(ws, data) {
        try {
            let player;
            const existingPlayer = this.playerManager.loginPlayer(ws, data.name, data.password);
            if (existingPlayer) {
                player = existingPlayer;
            }
            else {
                player = this.playerManager.registerPlayer(ws, data.name, data.password);
            }
            const response = {
                type: 'reg',
                data: {
                    name: player.name,
                    index: player.index,
                    error: false,
                    errorText: '',
                },
                id: 0,
            };
            this.sendResponse(ws, response);
            this.broadcastRoomsUpdate();
            this.broadcastWinnersUpdate();
        }
        catch (error) {
            const response = {
                type: 'reg',
                data: {
                    name: data.name,
                    index: 0,
                    error: true,
                    errorText: error instanceof Error ? error.message : String(error),
                },
                id: 0,
            };
            this.sendResponse(ws, response);
        }
    }
    handleCreateRoom(ws) {
        const playerId = this.playerManager.getPlayerIdBySocket(ws);
        if (!playerId) {
            this.sendError(ws, 'Not authenticated');
            return;
        }
        const player = this.playerManager.getPlayer(playerId);
        if (!player) {
            this.sendError(ws, 'Player not found');
            return;
        }
        this.roomManager.createRoom(player, ws);
        this.broadcastRoomsUpdate();
    }
    handleAddUserToRoom(ws, roomId) {
        const playerId = this.playerManager.getPlayerIdBySocket(ws);
        if (!playerId) {
            this.sendError(ws, 'Not authenticated');
            return;
        }
        const player = this.playerManager.getPlayer(playerId);
        if (!player) {
            this.sendError(ws, 'Player not found');
            return;
        }
        const room = this.roomManager.addUserToRoom(roomId, player, ws);
        if (!room) {
            this.sendError(ws, 'Failed to join room');
            return;
        }
        if (room.roomUsers.some(player => player.index === playerId)) {
            this.sendError(ws, 'Already in room');
            return;
        }
        if (room.roomUsers.length === 2) {
            const playerIds = room.roomUsers.map(player => player.index);
            const game = this.gameManager.createGame(playerIds);
            room.roomUsers.forEach(player => {
                const playerWs = this.playerManager.getSocket(player.index);
                if (playerWs) {
                    this.sendResponse(playerWs, {
                        type: 'create_game',
                        data: {
                            idGame: game.idGame,
                            idPlayer: player.index,
                        },
                        id: 0,
                    });
                }
            });
        }
        this.broadcastRoomsUpdate();
    }
    handleAddShips(ws, data) {
        const playerId = this.playerManager.getPlayerIdBySocket(ws);
        if (!playerId || playerId !== data.indexPlayer) {
            this.sendError(ws, 'Unauthorized');
            return;
        }
        const game = this.gameManager.getGame(data.gameId);
        if (!game) {
            this.sendError(ws, 'Game not found');
            return;
        }
        this.gameManager.addShips(data.gameId, playerId, data.ships);
        if (this.gameManager.areBothPlayersReady(data.gameId)) {
            game.players.forEach(player => {
                const playerWs = this.playerManager.getSocket(player.idPlayer);
                if (playerWs) {
                    const playerShips = this.gameManager.getPlayerShips(data.gameId, player.idPlayer);
                    this.sendResponse(playerWs, {
                        type: 'start_game',
                        data: {
                            ships: playerShips,
                            currentPlayerIndex: game.currentPlayerIndex,
                        },
                        id: 0,
                    });
                }
            });
        }
    }
    handleAttack(ws, data) {
        const playerId = this.playerManager.getPlayerIdBySocket(ws);
        if (!playerId || playerId !== data.indexPlayer) {
            this.sendError(ws, 'Unauthorized');
            return;
        }
        const result = this.gameManager.processAttack(data.gameId, playerId, data.x, data.y);
        if (!result) {
            this.sendError(ws, 'Invalid attack');
            return;
        }
        const game = this.gameManager.getGame(data.gameId);
        if (game) {
            game.players.forEach(player => {
                const playerWs = this.playerManager.getSocket(player.idPlayer);
                if (playerWs) {
                    this.sendResponse(playerWs, {
                        type: 'attack',
                        data: {
                            position: { x: data.x, y: data.y },
                            currentPlayer: playerId,
                            status: result.status,
                        },
                        id: 0,
                    });
                    if (result.gameOver) {
                        this.handleGameOver(data.gameId, result.winnerId);
                    }
                    else if (result.status === 'miss') {
                        this.sendResponse(playerWs, {
                            type: 'turn',
                            data: {
                                currentPlayer: game.currentPlayerIndex,
                            },
                            id: 0,
                        });
                    }
                }
            });
            if (game.isBotGame && game.currentPlayerIndex === types_1.BOT_PLAYER_ID) {
                this.handleBot(ws, data);
            }
        }
    }
    handleBot(ws, data) {
        setTimeout(() => {
            const botMove = this.gameManager.processBotMove(data.gameId);
            if (botMove) {
                const updatedGame = this.gameManager.getGame(data.gameId);
                if (!updatedGame)
                    return;
                this.sendResponse(ws, {
                    type: 'attack',
                    data: {
                        position: { x: botMove.x, y: botMove.y },
                        currentPlayer: types_1.BOT_PLAYER_ID,
                        status: botMove.status
                    },
                    id: 0
                });
                if (botMove.status === 'miss') {
                    this.sendResponse(ws, {
                        type: 'turn',
                        data: {
                            currentPlayer: updatedGame.currentPlayerIndex
                        },
                        id: 0
                    });
                }
                else {
                    this.handleBot(ws, data);
                }
                if (botMove.status === 'killed') {
                    const humanPlayer = updatedGame.players.find(p => p.idPlayer !== types_1.BOT_PLAYER_ID);
                    if (humanPlayer && this.gameManager.isAllShipsSunk(updatedGame.idGame, humanPlayer.idPlayer)) {
                        this.sendResponse(ws, {
                            type: 'finish',
                            data: {
                                winPlayer: types_1.BOT_PLAYER_ID,
                                reason: 'all_ships_sunk'
                            },
                            id: 0
                        });
                    }
                }
            }
        }, 500);
    }
    handleRandomAttack(ws, data) {
        const playerId = this.playerManager.getPlayerIdBySocket(ws);
        if (!playerId || playerId !== data.indexPlayer) {
            this.sendError(ws, 'Unauthorized');
            return;
        }
        const randomCoords = this.gameManager.generateRandomAttack(data.gameId);
        if (!randomCoords) {
            this.sendError(ws, 'No valid attack coordinates available');
            return;
        }
        this.handleAttack(ws, {
            gameId: data.gameId,
            x: randomCoords.x,
            y: randomCoords.y,
            indexPlayer: data.indexPlayer
        });
    }
    handleSinglePlay(ws) {
        const playerId = this.playerManager.getPlayerIdBySocket(ws);
        if (!playerId) {
            this.sendError(ws, 'Not authenticated');
            return;
        }
        const game = this.gameManager.createSinglePlayerGame(playerId);
        this.sendResponse(ws, {
            type: 'create_game',
            data: {
                idGame: game.idGame,
                idPlayer: playerId
            },
            id: 0
        });
    }
    handleGameOver(gameId, winnerId) {
        const game = this.gameManager.getGame(gameId);
        if (!game)
            return;
        this.playerDB.updatePlayerWins(winnerId);
        const winner = this.playerManager.getPlayer(winnerId);
        if (winner)
            this.winnersDB.addWinner(winner);
        game.players.forEach(player => {
            const playerWs = this.playerManager.getSocket(player.idPlayer);
            if (playerWs) {
                this.sendResponse(playerWs, {
                    type: 'finish',
                    data: {
                        winPlayer: winnerId,
                    },
                    id: 0,
                });
            }
        });
        this.broadcastWinnersUpdate();
        this.gameManager.removeGame(gameId);
    }
    getRoomsInfo() {
        const rooms = this.roomManager.getAvailableRooms();
        return rooms.map(room => ({
            roomId: room.roomId,
            roomUsers: room.roomUsers.map(user => {
                const player = this.playerManager.getPlayer(user.index);
                return {
                    name: (player === null || player === void 0 ? void 0 : player.name) || 'Unknown',
                    index: user.index,
                };
            }),
        }));
    }
    broadcastRoomsUpdate() {
        this.broadcastToAll({
            type: 'update_room',
            data: this.getRoomsInfo(),
            id: 0,
        });
    }
    broadcastWinnersUpdate() {
        const winners = this.winnersDB.getWinners().map(winner => ({
            name: winner.name,
            wins: winner.wins,
        }));
        this.broadcastToAll({
            type: 'update_winners',
            data: winners,
            id: 0,
        });
    }
    broadcastToAll(command) {
        this.wss.clients.forEach(client => {
            if (client.readyState === ws_1.default.OPEN) {
                client.send(JSON.stringify(Object.assign(Object.assign({}, command), { data: JSON.stringify(command.data) })));
            }
        });
    }
    sendResponse(ws, response) {
        if (ws.readyState === ws_1.default.OPEN) {
            const resp = JSON.stringify(Object.assign(Object.assign({}, response), { data: JSON.stringify(response.data) }));
            ws.send(resp);
            this.logger.logResponse(ws, response);
        }
    }
    sendError(ws, errorText) {
        const response = {
            type: 'error',
            data: {
                error: true,
                errorText,
            },
            id: 0,
        };
        this.sendResponse(ws, response);
    }
    handleDisconnect(ws) {
        const playerId = this.playerManager.getPlayerIdBySocket(ws);
        if (!playerId)
            return;
        console.log(`Player ${playerId} disconnected`);
        this.roomManager.handlePlayerDisconnect(playerId);
        this.broadcastRoomsUpdate();
        const disconnectResult = this.gameManager.handlePlayerDisconnect(playerId);
        disconnectResult.awardedWins.forEach(({ winnerId }) => {
            const winnerWs = this.playerManager.getSocket(winnerId);
            if (winnerWs) {
                this.sendResponse(winnerWs, {
                    type: 'finish',
                    data: {
                        winPlayer: winnerId,
                        reason: 'opponent_disconnected'
                    },
                    id: 0
                });
            }
        });
        if (disconnectResult.awardedWins.length > 0) {
            this.broadcastWinnersUpdate();
        }
        this.playerManager.updateSocket(playerId, null);
    }
    close() {
        this.wss.close();
    }
}
exports.BattleshipServer = BattleshipServer;
