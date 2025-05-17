// src/game/Game.ts
import type { Game, Ship, AttackStatus } from '../types';
import { BOT_PLAYER_ID } from '../types';
import { BotManager } from './Bot';
import { PlayerManager } from './Player';
import { WinnersDB } from '../db/winners';

export class GameManager {
  private games: Game[] = [];
  private botManager = new BotManager()

  constructor(
    private playerManager: PlayerManager,
    private winnersDB: WinnersDB
  ) { }

  createGame(playerIds: (number | string)[]): Game {
    const game: Game = {
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

  addShips(gameId: number | string, playerId: number | string, ships: Ship[]): boolean {
    const game = this.getGame(gameId);
    if (!game) return false;

    const player = game.players.find(p => p.idPlayer === playerId);
    if (!player) return false;

    if (!this.validateShips(/* ships */)) {
      return false;
    }

    player.ships = ships;
    this.placeShipsOnBoard(player.board, ships);

    if (game.players.every(p => p.ships.length > 0)) {
      game.started = true;
    }

    return true;
  }

  processAttack(gameId: number | string, attackerId: number | string, x: number, y: number) {
    const game = this.getGame(gameId);
    if (!game || !game.started || game.currentPlayerIndex !== attackerId) {
      return null;
    }

    const defender = game.players.find(p => p.idPlayer !== attackerId);
    if (!defender) return null;

    // Check if coordinate was already attacked
    if (defender.board[x][y] === 'hit' || defender.board[x][y] === 'miss') {
      return null;
    }

    let result: { status: AttackStatus; gameOver?: boolean; winnerId?: number | string };

    if (defender.board[x][y] === 'ship') {
      // Hit a ship
      defender.board[x][y] = 'hit';
      defender.hitsReceived++;

      const ship = this.findShipAt(defender.ships, x, y);
      if (!ship) return null;

      // Check if ship is completely sunk
      const isSunk = this.isShipSunk(defender.board, ship);

      if (isSunk) {
        // Mark surrounding cells as miss (battleship rules)
        this.markAroundShip(defender.board, ship);

        // Check if all ships are sunk (game over)
        const allSunk = defender.ships.every(s => this.isShipSunk(defender.board, s));

        if (allSunk) {
          result = {
            status: 'killed',
            gameOver: true,
            winnerId: attackerId
          };

          // Update winner stats
          const winner = this.playerManager.getPlayer(attackerId);
          if (winner) {
            this.winnersDB.addWinner(winner);
          }
        } else {
          result = { status: 'killed' };
        }
      } else {
        result = { status: 'shot' };
      }
    } else {
      // Miss
      defender.board[x][y] = 'miss';
      result = { status: 'miss' };
      // Switch turns
      game.currentPlayerIndex = defender.idPlayer;
    }

    return result;
  }

  handlePlayerDisconnect(playerId: number | string): {
    disconnectedGameIds: (number | string)[];
    awardedWins: { winnerId: number | string; gameId: number | string }[]
  } {
    const result = {
      disconnectedGameIds: [] as (number | string)[],
      awardedWins: [] as { winnerId: number | string; gameId: number | string }[]
    };

    const gamesWithPlayer = this.games.filter(game =>
      game.players.some(p => p.idPlayer === playerId)
    );

    gamesWithPlayer.forEach(game => {
      if (game.started) {
        const otherPlayer = game.players.find(p => p.idPlayer !== playerId);

        if (otherPlayer) {
          result.awardedWins.push({
            winnerId: otherPlayer.idPlayer,
            gameId: game.idGame
          });

          // Update winner stats
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

  getGame(gameId: number | string): Game | undefined {
    return this.games.find(game => game.idGame === gameId);
  }

  getPlayerShips(gameId: number | string, playerId: number | string): Ship[] | undefined {
    const game = this.getGame(gameId);
    if (!game) return undefined;

    const player = game.players.find(p => p.idPlayer === playerId);
    return player?.ships;
  }

  removeGame(gameId: number | string): void {
    this.games = this.games.filter(game => game.idGame !== gameId);
  }

  isGameInProgress(gameId: number | string): boolean {
    const game = this.getGame(gameId);
    return !!game && game.started;
  }

  areBothPlayersReady(gameId: number | string): boolean {
    const game = this.getGame(gameId);
    if (!game) return false;

    return game.players.every(player => player.ships.length > 0);
  }

  generateRandomAttack(gameId: number | string): { x: number; y: number } | null {
    const game = this.getGame(gameId);
    if (!game) return null;

    const currentPlayerId = game.currentPlayerIndex;
    const defender = game.players.find(p => p.idPlayer !== currentPlayerId);
    if (!defender) return null;

    const availableCells: { x: number; y: number }[] = [];
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        if (defender.board[x][y] === null) {
          availableCells.push({ x, y });
        }
      }
    }

    if (availableCells.length === 0) return null;

    return availableCells[Math.floor(Math.random() * availableCells.length)];
  }

  private createEmptyBoard(): (null | 'ship' | 'hit' | 'miss')[][] {
    return Array(10).fill(null).map(() => Array(10).fill(null));
  }

  createSinglePlayerGame(humanPlayerId: number | string): Game {
    const { ships: playerShips } = this.botManager.createRandomBoard()
    const game: Game = {
      idGame: this.generateGameId(),
      players: [
        {
          idPlayer: humanPlayerId,
          ships: playerShips,
          board: this.createEmptyBoard(),
          hitsReceived: 0
        },
        {
          idPlayer: BOT_PLAYER_ID,
          ...this.botManager.createRandomBoard(),
          hitsReceived: 0
        }
      ],
      currentPlayerIndex: humanPlayerId,
      started: true,
      isBotGame: true
    };

    this.games.push(game);
    return game;
  }

  processBotMove(gameId: number | string): { x: number; y: number, status: AttackStatus } | null {
    const game = this.getGame(gameId);
    if (!game?.isBotGame || game.currentPlayerIndex !== BOT_PLAYER_ID) {
      return null;
    }

    const move = this.botManager.makeMove(game);
    const result = this.processAttack(gameId, BOT_PLAYER_ID, move.x, move.y);

    if (!result) return null;

    return {
      x: move.x,
      y: move.y,
      status: result.status
    };
  }

  isAllShipsSunk(gameId: number | string, playerId: number | string): boolean {
    const game = this.getGame(gameId);
    if (!game) return false;

    const player = game.players.find(p => p.idPlayer === playerId);
    if (!player) return false;

    return player.ships.every(ship =>
      this.isShipSunk(player.board, ship)
    );
  }

  private validateShips(/* ships: Ship[] */): boolean {
    // TODO: Implement ship validation rules (count, sizes, positions, etc.)
    return true;
  }

  private placeShipsOnBoard(
    board: (null | 'ship' | 'hit' | 'miss')[][],
    ships: Ship[]
  ): void {
    ships.forEach(ship => {
      for (let i = 0; i < ship.length; i++) {
        const x = ship.direction ? ship.position.x + i : ship.position.x;
        const y = ship.direction ? ship.position.y : ship.position.y + i;
        if (x < 10 && y < 10) {
          board[x][y] = 'ship';
        }
      }
    });
  }

  private findShipAt(ships: Ship[], x: number, y: number): Ship | undefined {
    return ships.find(ship => {
      if (ship.direction) {
        // Horizontal ship
        return (
          ship.position.y === y &&
          x >= ship.position.x &&
          x < ship.position.x + ship.length
        );
      } else {
        // Vertical ship
        return (
          ship.position.x === x &&
          y >= ship.position.y &&
          y < ship.position.y + ship.length
        );
      }
    });
  }

  private isShipSunk(
    board: (null | 'ship' | 'hit' | 'miss')[][],
    ship: Ship
  ): boolean {
    for (let i = 0; i < ship.length; i++) {
      const x = ship.direction ? ship.position.x + i : ship.position.x;
      const y = ship.direction ? ship.position.y : ship.position.y + i;
      if (board[x][y] !== 'hit') {
        return false;
      }
    }
    return true;
  }

  private markAroundShip(
    board: (null | 'ship' | 'hit' | 'miss')[][],
    ship: Ship
  ): void {
    for (let i = -1; i <= ship.length; i++) {
      for (let j = -1; j <= 1; j++) {
        const x = ship.direction ? ship.position.x + i : ship.position.x + j;
        const y = ship.direction ? ship.position.y + j : ship.position.y + i;

        if (x >= 0 && x < 10 && y >= 0 && y < 10 && board[x][y] === null) {
          board[x][y] = 'miss';
        }
      }
    }
  }

  private generateGameId(): number {
    return Date.now();
  }
}
