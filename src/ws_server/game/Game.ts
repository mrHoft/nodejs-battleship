import type { Game, Ship, AttackStatus, TBoard } from '../types';
import { BOT_PLAYER_ID } from '../types';
import { BotManager } from './Bot';
import { PlayerManager } from './Player';
import { WinnersDB } from '../db/winners';
import { printBoard, printShips } from '../utils/board';

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
    player.board = this.placeShipsOnBoard(ships);
    printShips(player.ships)
    printBoard(player.board, true)

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
    if (!defender) {
      console.log('Wrong attacker id:', attackerId)
      return null;
    }

    if (defender.board[x][y] === 'hit' || defender.board[x][y] === 'miss') {
      console.log(`Coordinate ${x}-${y} was already attacked`)
      printBoard(defender.board)
      return null;
    }

    let result: { status: AttackStatus; gameOver?: boolean; winnerId?: number | string };

    if (defender.board[x][y] === 'ship') {
      const ship = this.findShipAt(defender.ships, x, y);
      if (!ship) {
        console.log(`No ship on coordinate ${x}-${y}`)
        printBoard(defender.board, true)
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
        } else {
          result = { status: 'killed' };
        }
      } else {
        result = { status: 'shot' };
      }
    } else {
      defender.board[x][y] = 'miss';
      result = { status: 'miss' };
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

    return game.players.every((player, i) => {
      console.log(`Player ${i} ships:`, player.ships.length)
      return player.ships.length > 0
    });
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
        const cell = defender.board[x][y]
        if (cell === null || cell === 'ship') {
          availableCells.push({ x, y });
        }
      }
    }

    if (availableCells.length === 0) return null;

    return availableCells[Math.floor(Math.random() * availableCells.length)];
  }

  private createEmptyBoard(): TBoard {
    return Array(10).fill(null).map(() => Array(10).fill(null));
  }

  createSinglePlayerGame(humanPlayerId: number | string): Game {
    const game: Game = {
      idGame: this.generateGameId(),
      players: [
        {
          idPlayer: humanPlayerId,
          ships: [],
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
      started: false,
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

  private placeShipsOnBoard(ships: Ship[]) {
    const board = this.createEmptyBoard()
    ships.forEach(ship => {
      for (let i = 0; i < ship.length; i++) {
        const x = ship.direction ? ship.position.x : ship.position.x + i;
        const y = ship.direction ? ship.position.y + i : ship.position.y;
        if (x < 10 && y < 10) {
          board[x][y] = 'ship';
        }
      }
    });

    return board
  }

  private findShipAt(ships: Ship[], x: number, y: number): Ship | undefined {
    return ships.find(ship => {
      if (ship.direction) {
        return (
          ship.position.x === x &&
          y >= ship.position.y &&
          y < ship.position.y + ship.length
        );
      } else {
        return (
          ship.position.y === y &&
          x >= ship.position.x &&
          x < ship.position.x + ship.length
        );
      }
    });
  }

  private isShipSunk(board: TBoard, ship: Ship): boolean {
    for (let i = 0; i < ship.length; i++) {
      const x = ship.direction ? ship.position.x : ship.position.x + i;
      const y = ship.direction ? ship.position.y + i : ship.position.y;
      if (board[x][y] !== 'hit') {
        return false;
      }
    }
    return true;
  }

  private markAroundShip(board: TBoard, ship: Ship): void {
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

  private generateGameId(): number {
    return Date.now();
  }
}
