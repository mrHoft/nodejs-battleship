import type { Player } from '../types';
import WebSocket from 'ws';

export class PlayerManager {
  private players: Map<number | string, Player> = new Map();
  private sockets: Map<number | string, WebSocket> = new Map();
  private nameToId: Map<string, number | string> = new Map();

  registerPlayer(ws: WebSocket, name: string, password: string): Player {
    const existingPlayerId = this.nameToId.get(name);
    if (existingPlayerId) {
      throw new Error('Player already exists');
    }

    const player: Player = {
      name,
      password,
      index: Date.now(),
      wins: 0,
    };

    this.players.set(player.index, player);
    this.sockets.set(player.index, ws);
    this.nameToId.set(name, player.index);
    return player;
  }

  loginPlayer(ws: WebSocket, name: string, password: string): Player | undefined {
    const playerId = this.nameToId.get(name);
    if (!playerId) return undefined;

    const player = this.players.get(playerId);
    if (!player || player.password !== password) return undefined;

    this.sockets.set(playerId, ws);
    return player;
  }

  getPlayer(playerId: number | string): Player | undefined {
    return this.players.get(playerId);
  }

  getPlayerIdBySocket(ws: WebSocket): number | string | undefined {
    for (const [id, socket] of this.sockets.entries()) {
      if (socket === ws) return id;
    }
    return undefined;
  }

  getSocket(playerId: number | string): WebSocket | undefined {
    return this.sockets.get(playerId);
  }

  removePlayer(playerId: number | string): void {
    const player = this.players.get(playerId);
    if (player) {
      this.nameToId.delete(player.name);
    }
    this.players.delete(playerId);
    this.sockets.delete(playerId);
  }

  updateSocket(playerId: number | string, newSocket: WebSocket): void {
    this.sockets.set(playerId, newSocket);
  }
}
