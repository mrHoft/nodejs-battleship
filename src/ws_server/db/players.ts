import { Player } from '../types';

export class PlayerDB {
  private players: Player[] = [];

  findPlayer(name: string): Player | undefined {
    return this.players.find(p => p.name === name);
  }

  createPlayer(name: string, password: string): Player {
    const player: Player = {
      name,
      password,
      index: this.generateId(),
      wins: 0,
    };
    this.players.push(player);
    return player;
  }

  updatePlayerWins(playerId: number | string): void {
    const player = this.players.find(p => p.index === playerId);
    if (player) {
      player.wins++;
    }
  }

  private generateId(): number {
    return Date.now();
  }
}
