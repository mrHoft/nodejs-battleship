"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandValidator = void 0;
class CommandValidator {
    static validate(command) {
        switch (command.type) {
            case 'reg':
                return this.validateRegCommand(command.data);
            case 'create_room':
                return this.validateCreateRoomCommand(command.data);
            case 'add_user_to_room':
                return this.validateAddUserToRoomCommand(command.data);
            case 'add_ships':
                return this.validateAddShipsCommand(command.data);
            case 'attack':
                return this.validateAttackCommand(command.data);
            case 'randomAttack':
                return this.validateRandomAttackCommand(command.data);
            case 'single_play':
                return true;
            default:
                return false;
        }
    }
    static validateRegCommand(data) {
        return (typeof (data === null || data === void 0 ? void 0 : data.name) === 'string' &&
            typeof (data === null || data === void 0 ? void 0 : data.password) === 'string' &&
            data.name.length > 0 &&
            data.password.length > 0);
    }
    static validateCreateRoomCommand(data) {
        return data === "" || (typeof data === 'object' && Object.keys(data).length === 0);
    }
    static validateAddUserToRoomCommand(data) {
        return data && (typeof data.indexRoom === 'number' || typeof data.indexRoom === 'string');
    }
    static validateAddShipsCommand(data) {
        if (!data || !data.gameId || !data.indexPlayer || !data.ships || !Array.isArray(data.ships)) {
            return false;
        }
        return data.ships.every((ship) => {
            return (ship &&
                ship.position &&
                typeof ship.position.x === 'number' &&
                typeof ship.position.y === 'number' &&
                typeof ship.direction === 'boolean' &&
                typeof ship.length === 'number' &&
                ['small', 'medium', 'large', 'huge'].includes(ship.type));
        });
    }
    static validateAttackCommand(data) {
        return (data &&
            data.gameId &&
            (typeof data.indexPlayer === 'number' || typeof data.indexPlayer === 'string') &&
            typeof data.x === 'number' &&
            typeof data.y === 'number' &&
            data.x >= 0 && data.x < 10 &&
            data.y >= 0 && data.y < 10);
    }
    static validateRandomAttackCommand(data) {
        return (data &&
            data.gameId &&
            (typeof data.indexPlayer === 'number' || typeof data.indexPlayer === 'string'));
    }
}
exports.CommandValidator = CommandValidator;
