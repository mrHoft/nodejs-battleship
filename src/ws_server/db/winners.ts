import { Player } from '../types';

export class WinnersDB {
  private winners: Player[] = [];

  getWinners(): Player[] {
    return [...this.winners];
  }

  addWinner(player: Player): void {
    const existingWinner = this.winners.find(w => w.index === player.index);
    if (existingWinner) {
      existingWinner.wins++;
    } else {
      this.winners.push({ ...player });
    }
  }
}
