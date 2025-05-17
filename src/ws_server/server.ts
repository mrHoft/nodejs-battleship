import WebSocket, { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import type { Command, CommandData, RegData, AddUserToRoomData, RegResponseCommand, AttackResultCommand, TurnCommand, AddShipsData, RandomAttackData, CreateGameCommand, StartGameCommand, AttackData, RoomInfo } from './types';
import { BOT_PLAYER_ID } from './types';
import { PlayerDB } from './db/players';
import { WinnersDB } from './db/winners';
import { RoomManager } from './game/Room';
import { GameManager } from './game/Game';
import { Logger } from './utils/logger';
import { CommandValidator } from './utils/validation';
import type { Player } from './types';
import { PlayerManager } from './game/Player';

const PORT = process.env.PORT || 3000;

export class BattleshipServer {
  private wss: WebSocketServer;
  private playerDB: PlayerDB;
  private winnersDB: WinnersDB;
  private roomManager: RoomManager;
  private gameManager: GameManager;
  private playerManager: PlayerManager;

  constructor() {
    this.wss = new WebSocketServer({ port: Number(PORT) });
    this.playerDB = new PlayerDB();
    this.winnersDB = new WinnersDB();
    this.roomManager = new RoomManager();
    this.playerManager = new PlayerManager()
    this.gameManager = new GameManager(this.playerManager, this.winnersDB);

    console.log(`WebSocket server started on ws://localhost:${PORT}`);
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const ip = req.socket.remoteAddress || 'unknown';
      const port = req.socket.remotePort;

      Logger.logConnection(ws, ip, port);

      ws.on('message', (message) => {
        console.log(message.toString())
        try {
          const command: Command = JSON.parse(message.toString());
          if (command.data && typeof command.data === 'string') {
            command.data = JSON.parse(command.data)
          }
          this.handleCommand(ws, command);
        } catch (error) {
          Logger.logError(ws, error as Error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        Logger.logDisconnection(ws);
        this.handleDisconnect(ws);
      });
    });
  }

  private handleCommand(ws: WebSocket, command: Command) {
    Logger.logCommand(ws, command);

    try {
      if (!CommandValidator.validate(command)) {
        throw new Error('Invalid command format');
      }

      switch (command.type) {
        case 'reg': {
          this.handleRegistration(ws, command.data as RegData);
          break;
        }
        case 'create_room':
          this.handleCreateRoom(ws);
          break;
        case 'add_user_to_room': {
          const { indexRoom } = command.data as AddUserToRoomData
          this.handleAddUserToRoom(ws, indexRoom);
          break;
        }
        case 'add_ships':
          this.handleAddShips(ws, command.data as AddShipsData);
          break;
        case 'attack':
          this.handleAttack(ws, command.data as AttackData);
          break;
        case 'randomAttack':
          this.handleRandomAttack(ws, command.data as RandomAttackData);
          break;
        case 'single_play':
          this.handleSinglePlay(ws);
          break;
        default:
          console.log('Unknown command type:', command.type);
      }
    } catch (error) {
      console.error('Command handling error:', error instanceof Error ? error.message : 'Unexpected');
      this.sendError(ws, 'Invalid command');
    }
  }

  private handleRegistration(ws: WebSocket, data: RegData) {
    try {
      let player: Player;

      const existingPlayer = this.playerManager.loginPlayer(ws, data.name, data.password);

      if (existingPlayer) {
        player = existingPlayer;
      } else {
        player = this.playerManager.registerPlayer(ws, data.name, data.password);
      }

      const response: RegResponseCommand = {
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
    } catch (error) {
      const response: RegResponseCommand = {
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

  private handleCreateRoom(ws: WebSocket) {
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

  private handleAddUserToRoom(ws: WebSocket, roomId: number | string) {
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

    if (room.roomUsers.length === 2) {
      const playerIds = room.roomUsers.map(player => player.index)
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
          } as CreateGameCommand);
        }
      });
    }

    this.broadcastRoomsUpdate();
  }

  private handleAddShips(ws: WebSocket, data: AddShipsData) {
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
          } as StartGameCommand);
        }
      });
    }
  }

  private handleAttack(ws: WebSocket, data: AttackData) {
    const playerId = this.playerManager.getPlayerIdBySocket(ws);
    if (!playerId || playerId !== data.indexPlayer) {
      this.sendError(ws, 'Unauthorized');
      return;
    }

    const result = this.gameManager.processAttack(
      data.gameId,
      playerId,
      data.x,
      data.y
    );

    if (!result) {
      this.sendError(ws, 'Invalid attack');
      return;
    }

    // Notify both players
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
          } as AttackResultCommand);

          if (result.gameOver) {
            this.handleGameOver(data.gameId, result.winnerId!);
          } else if (result.status === 'miss') {
            // Send turn update
            this.sendResponse(playerWs, {
              type: 'turn',
              data: {
                currentPlayer: game.currentPlayerIndex,
              },
              id: 0,
            } as TurnCommand);
          }
        }
      });
      if (game.isBotGame && game.currentPlayerIndex === BOT_PLAYER_ID) {
        setTimeout(() => {
          const botMove = this.gameManager.processBotMove(data.gameId);
          if (botMove) {
            const updatedGame = this.gameManager.getGame(data.gameId);
            if (!updatedGame) return;

            // Send bot attack result to human player
            this.sendResponse(ws, {
              type: 'attack',
              data: {
                position: { x: botMove.x, y: botMove.y },
                currentPlayer: BOT_PLAYER_ID,
                status: botMove.status
              },
              id: 0
            });

            // Send turn update
            this.sendResponse(ws, {
              type: 'turn',
              data: {
                currentPlayer: updatedGame.currentPlayerIndex
              },
              id: 0
            });

            // Check if game over
            if (botMove.status === 'killed') {
              const humanPlayer = updatedGame.players.find(p => p.idPlayer !== BOT_PLAYER_ID);
              if (humanPlayer && this.gameManager.isAllShipsSunk(updatedGame.idGame, humanPlayer.idPlayer)) {
                this.sendResponse(ws, {
                  type: 'finish',
                  data: {
                    winPlayer: BOT_PLAYER_ID,
                    reason: 'all_ships_sunk'
                  },
                  id: 0
                });
              }
            }
          }
        }, 1000);
      }
    }
  }

  private handleRandomAttack(ws: WebSocket, data: RandomAttackData) {
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

    // Process the random attack
    this.handleAttack(ws, {
      gameId: data.gameId,
      x: randomCoords.x,
      y: randomCoords.y,
      indexPlayer: data.indexPlayer
    });
  }

  private handleSinglePlay(ws: WebSocket) {
    const playerId = this.playerManager.getPlayerIdBySocket(ws);
    if (!playerId) {
      this.sendError(ws, 'Not authenticated');
      return;
    }

    // Create single player game
    const game = this.gameManager.createSinglePlayerGame(playerId);

    // Send game created response
    this.sendResponse(ws, {
      type: 'create_game',
      data: {
        idGame: game.idGame,
        idPlayer: playerId
      },
      id: 0
    });

    // Automatically start game since bot is ready
    const humanPlayer = game.players.find(p => p.idPlayer === playerId);
    if (humanPlayer) {
      this.sendResponse(ws, {
        type: 'start_game',
        data: {
          ships: humanPlayer.ships, // Will be empty until player adds ships
          currentPlayerIndex: playerId
        },
        id: 0
      });
    }
  }

  private handleGameOver(gameId: string | number, winnerId: string | number) {
    const game = this.gameManager.getGame(gameId);
    if (!game) return;

    this.playerDB.updatePlayerWins(winnerId);
    const winner = this.playerManager.getPlayer(winnerId)
    if (winner) this.winnersDB.addWinner(winner);

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

  private broadcastRoomsUpdate() {
    const rooms = this.roomManager.getAvailableRooms();
    const roomResponses: RoomInfo[] = rooms.map(room => ({
      roomId: room.roomId,
      roomUsers: room.roomUsers.map(user => {
        const player = this.playerManager.getPlayer(user.index);
        return {
          name: player?.name || 'Unknown',
          index: user.index,
        };
      }),
    }));

    this.broadcastToAll({
      type: 'update_room',
      data: roomResponses,
      id: 0,
    });
  }

  private broadcastWinnersUpdate() {
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

  private broadcastToAll(command: Command) {
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ ...command, data: JSON.stringify(command.data) }));
      }
    });
  }

  private sendResponse<T extends CommandData>(ws: WebSocket, response: Command<T>) {
    if (ws.readyState === WebSocket.OPEN) {
      const resp = JSON.stringify({ ...response, data: JSON.stringify(response.data) })
      ws.send(resp);
      Logger.logResponse(ws, response);
    }
  }

  private sendError(ws: WebSocket, errorText: string) {
    const response: Command<{ type: 'error'; data: { error: true; errorText: string } }> = {
      type: 'error',
      data: {
        error: true,
        errorText,
      },
      id: 0,
    };
    this.sendResponse(ws, response);
  }

  private handleDisconnect(ws: WebSocket) {
    const playerId = this.playerManager.getPlayerIdBySocket(ws);
    if (!playerId) return;

    console.log(`Player ${playerId} disconnected`);

    // 1. Handle room cleanup first
    this.roomManager.handlePlayerDisconnect(playerId);
    this.broadcastRoomsUpdate();

    // 2. Handle game disconnection
    const disconnectResult = this.gameManager.handlePlayerDisconnect(playerId);

    // 3. Notify winners
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

    // 4. Update winners list for all clients
    if (disconnectResult.awardedWins.length > 0) {
      this.broadcastWinnersUpdate();
    }

    // 5. Clean up player socket reference
    this.playerManager.updateSocket(playerId, null as any);
  }

  public close() {
    this.wss.close();
  }
}
