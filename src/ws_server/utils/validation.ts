import type { Command, CommandData, RegData, AddUserToRoomData, AddShipsData, AttackData, RandomAttackData } from '../types';

export class CommandValidator {
  static validate<T extends CommandData>(command: Command<T>): boolean {
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
        return true
      default:
        return false;
    }
  }

  private static validateRegCommand(data: any): data is RegData {
    return (
      typeof data?.name === 'string' &&
      typeof data?.password === 'string' &&
      data.name.length > 0 &&
      data.password.length > 0
    );
  }

  private static validateCreateRoomCommand(data: any): data is "" {
    return data === "" || (typeof data === 'object' && Object.keys(data).length === 0);
  }

  private static validateAddUserToRoomCommand(data: any): data is AddUserToRoomData {
    return data && (typeof data.indexRoom === 'number' || typeof data.indexRoom === 'string');
  }

  private static validateAddShipsCommand(data: any): data is AddShipsData {
    if (!data || !data.gameId || !data.indexPlayer || !data.ships || !Array.isArray(data.ships)) {
      return false;
    }

    return data.ships.every((ship: any) => {
      return (
        ship &&
        ship.position &&
        typeof ship.position.x === 'number' &&
        typeof ship.position.y === 'number' &&
        typeof ship.direction === 'boolean' &&
        typeof ship.length === 'number' &&
        ['small', 'medium', 'large', 'huge'].includes(ship.type)
      );
    });
  }

  private static validateAttackCommand(data: any): data is AttackData {
    return (
      data &&
      data.gameId &&
      (typeof data.indexPlayer === 'number' || typeof data.indexPlayer === 'string') &&
      typeof data.x === 'number' &&
      typeof data.y === 'number' &&
      data.x >= 0 && data.x < 10 &&
      data.y >= 0 && data.y < 10
    );
  }

  private static validateRandomAttackCommand(data: any): data is RandomAttackData {
    return (
      data &&
      data.gameId &&
      (typeof data.indexPlayer === 'number' || typeof data.indexPlayer === 'string')
    );
  }
}
