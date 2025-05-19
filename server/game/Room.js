"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = void 0;
class RoomManager {
    constructor() {
        this.rooms = [];
        this.playerRoomMap = new Map();
    }
    createRoom(player, ws) {
        const room = {
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
    addUserToRoom(roomId, player, ws) {
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
    removeRoom(roomId) {
        this.rooms = this.rooms.filter(room => room.roomId !== roomId);
    }
    getAvailableRooms() {
        return this.rooms.filter(room => room.roomUsers.length === 1);
    }
    generateRoomId() {
        return Math.floor(Math.random() * 1000000);
    }
    getRoom(roomId) {
        return this.rooms.find(room => room.roomId === roomId);
    }
    getPlayerRoomId(ws) {
        return this.playerRoomMap.get(ws);
    }
    removePlayerFromRoom(roomId, playerId) {
        const room = this.getRoom(roomId);
        if (room) {
            room.roomUsers = room.roomUsers.filter(user => user.index !== playerId);
            if (room.roomUsers.length === 0) {
                this.removeRoom(roomId);
            }
        }
    }
    handlePlayerDisconnect(playerId) {
        this.rooms = this.rooms.map(room => {
            room.roomUsers = room.roomUsers.filter(user => user.index !== playerId);
            return room;
        }).filter(room => room.roomUsers.length > 0);
    }
}
exports.RoomManager = RoomManager;
