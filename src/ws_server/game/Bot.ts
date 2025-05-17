import type { Ship, Game } from '../types';
import { BOT_PLAYER_ID } from '../types';
import { printBoard, printShips } from '../utils/board';

export class BotManager {
  // private difficulty: 'easy' | 'medium' | 'hard' = 'medium';

  createRandomBoard(): { board: (null | 'ship')[][]; ships: Ship[] } {
    const board: (null | 'ship')[][] = Array(10).fill(null).map(() => Array(10).fill(null));
    const ships: Ship[] = [];
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
        const maxAttempts = 100; // Prevent infinite loops

        while (!placed && attempts < maxAttempts) {
          attempts++;
          const direction = Math.random() > 0.5; // true = horizontal, false = vertical
          const maxX = direction ? 10 - shipType.length : 10;
          const maxY = direction ? 10 : 10 - shipType.length;

          if (maxX <= 0 || maxY <= 0) continue;

          const x = Math.floor(Math.random() * maxX);
          const y = Math.floor(Math.random() * maxY);

          const newShip: Ship = {
            position: { x, y },
            direction,
            length: shipType.length,
            type: shipType.type as any
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

    // printBoard(board)
    printShips(ships)
    return { board, ships };
  }

  private canPlaceShip(board: (null | 'ship')[][], ship: Ship): boolean {
    // Check all cells the ship would occupy
    for (let i = 0; i < ship.length; i++) {
      const x = ship.direction ? ship.position.x + i : ship.position.x;
      const y = ship.direction ? ship.position.y : ship.position.y + i;

      // Check if out of bounds
      if (x >= 10 || y >= 10) return false;

      // Check if cell is already occupied
      if (board[x][y] === 'ship') return false;

      // Check adjacent cells (no touching ships)
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const adjX = x + dx;
          const adjY = y + dy;
          if (adjX >= 0 && adjX < 10 && adjY >= 0 && adjY < 10) {
            if (board[adjX][adjY] === 'ship') return false;
          }
        }
      }
    }
    return true;
  }

  private placeShip(board: (null | 'ship')[][], ship: Ship): void {
    for (let i = 0; i < ship.length; i++) {
      const x = ship.direction ? ship.position.x + i : ship.position.x;
      const y = ship.direction ? ship.position.y : ship.position.y + i;
      board[x][y] = 'ship';
    }
  }

  makeMove(game: Game): { x: number; y: number } {
    // Basic AI - can be enhanced based on difficulty
    const player = game.players.find(p => p.idPlayer !== BOT_PLAYER_ID);
    if (!player) return { x: 0, y: 0 };

    // Simple random move for now
    const availableCells: { x: number; y: number }[] = [];
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        if (player.board[x][y] === null) {
          availableCells.push({ x, y });
        }
      }
    }

    if (availableCells.length === 0) return { x: 0, y: 0 };
    return availableCells[Math.floor(Math.random() * availableCells.length)];
  }
}
