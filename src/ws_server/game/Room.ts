import { Room, Player } from '../types';
import WebSocket from 'ws';

export class RoomManager {
  private rooms: Room[] = [];
  private playerRoomMap: Map<WebSocket, string | number> = new Map();

  createRoom(player: Player, ws: WebSocket): Room {
    const room: Room = {
      roomId: this.generateRoomId(),
      roomUsers: [{
        name: player.name,
        index: player.index,
      }],
    };

    this.rooms.push(room);
    this.playerRoomMap.set(ws, room.roomId);
    return room;
  }

  addUserToRoom(roomId: string | number, player: Player, ws: WebSocket): Room | undefined {
    const room = this.rooms.find(r => r.roomId === roomId);
    if (room && room.roomUsers.length === 1) {
      room.roomUsers.push({
        name: player.name,
        index: player.index,
      });
      this.playerRoomMap.set(ws, room.roomId);
      return room;
    }
    return undefined;
  }

  removeRoom(roomId: string | number): void {
    this.rooms = this.rooms.filter(room => room.roomId !== roomId);
  }

  getAvailableRooms(): Room[] {
    return this.rooms.filter(room => room.roomUsers.length === 1);
  }

  private generateRoomId(): number {
    return Math.floor(Math.random() * 1000000);
  }

  getRoom(roomId: string | number): Room | undefined {
    return this.rooms.find(room => room.roomId === roomId);
  }

  getPlayerRoomId(ws: WebSocket): string | number | undefined {
    return this.playerRoomMap.get(ws);
  }

  removePlayerFromRoom(roomId: string | number, playerId: string | number): void {
    const room = this.getRoom(roomId);
    if (room) {
      room.roomUsers = room.roomUsers.filter(user => user.index !== playerId);
      if (room.roomUsers.length === 0) {
        this.removeRoom(roomId);
      }
    }
  }

  handlePlayerDisconnect(playerId: number | string): void {
    this.rooms = this.rooms.map(room => {
      room.roomUsers = room.roomUsers.filter(user => user.index !== playerId);
      return room;
    }).filter(room => room.roomUsers.length > 0);
  }
}
