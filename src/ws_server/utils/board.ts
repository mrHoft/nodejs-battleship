import type { Ship } from "ws_server/types";

export function printShips(ships: Ship[]): void {
  const visualBoard: string[][] = Array(10).fill(null).map(() => Array(10).fill('·'));

  const shipSymbols: Record<string, string> = {
    small: 'S',
    medium: 'M',
    large: 'L',
    huge: 'H'
  };

  ships.forEach(ship => {
    for (let i = 0; i < ship.length; i++) {
      const x = ship.direction ? ship.position.x + i : ship.position.x;
      const y = ship.direction ? ship.position.y : ship.position.y + i;
      if (x >= 0 && x < 10 && y >= 0 && y < 10) {
        visualBoard[x][y] = shipSymbols[ship.type] || '?';
      }
    }
  });

  console.log('  0 1 2 3 4 5 6 7 8 9');
  for (let y = 0; y < 10; y++) {
    let rowStr = `${y} `;
    for (let x = 0; x < 10; x++) {
      rowStr += visualBoard[x][y] + ' ';
    }
    console.log(rowStr);
  }
}

export function printBoard(board: (null | 'ship' | 'hit' | 'miss')[][], showShips = false): void {
  console.log('  0 1 2 3 4 5 6 7 8 9');
  for (let y = 0; y < 10; y++) {
    let row = `${y} `;
    for (let x = 0; x < 10; x++) {
      if (board[x][y] === 'hit') {
        row += 'X ';
      } else if (board[x][y] === 'miss') {
        row += 'O ';
      } else if (board[x][y] === 'ship' && showShips) {
        row += '■ ';
      } else {
        row += '· ';
      }
    }
    console.log(row);
  }
}
