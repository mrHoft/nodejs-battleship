export interface Player {
  name: string;
  password: string;
  index: number | string;
  wins: number;
}

export const BOT_PLAYER_ID = "BOT";

export interface Ship {
  position: {
    x: number;
    y: number;
  };
  direction: boolean;
  length: number;
  type: "small" | "medium" | "large" | "huge";
}

export interface Room {
  roomId: number | string;
  roomUsers: {
    name: string;
    index: number | string;
  }[];
}

export interface Game {
  idGame: number | string;
  started: boolean;
  players: {
    idPlayer: number | string;
    ships: Ship[];
    board: (null | "ship" | "hit" | "miss")[][];
    hitsReceived: number;
  }[];
  currentPlayerIndex: number | string;
  isBotGame?: boolean
}

export type ShipType = "small" | "medium" | "large" | "huge";
export type AttackStatus = "miss" | "killed" | "shot";

export interface RegData {
  name: string;
  password: string;
}

export interface RegResponseData {
  name: string;
  index: number | string;
  error: boolean;
  errorText: string;
}

export interface PlayerInfo {
  name: string;
  index: number | string;
}

export interface RoomUser {
  name: string;
  index: number | string;
}

export interface RoomInfo {
  roomId: number | string;
  roomUsers: RoomUser[];
}

export interface AddUserToRoomData {
  indexRoom: number | string;
}

export interface CreateGameData {
  idGame: number | string;
  idPlayer: number | string;
}

export interface ShipPosition {
  x: number;
  y: number;
}

export interface ShipData {
  position: ShipPosition;
  direction: boolean;
  length: number;
  type: ShipType;
}

export interface AddShipsData {
  gameId: number | string;
  ships: ShipData[];
  indexPlayer: number | string;
}

export interface StartGameData {
  ships: ShipData[];
  currentPlayerIndex: number | string;
}

export interface AttackData {
  gameId: number | string;
  x: number;
  y: number;
  indexPlayer: number | string;
}

export interface AttackResultData {
  position: ShipPosition;
  currentPlayer: number | string;
  status: AttackStatus;
}

export interface RandomAttackData {
  gameId: number | string;
  indexPlayer: number | string;
}

export interface TurnData {
  currentPlayer: number | string;
}

export interface FinishData {
  winPlayer: number | string;
}

export interface WinnerInfo {
  name: string;
  wins: number;
}

export interface PlayerDisconnectedData {
  disconnectedPlayerId: number | string;
}

export interface FinishData {
  winPlayer: number | string;
  reason?: 'all_ships_sunk' | 'opponent_disconnected' | 'timeout';
}

export type CommandData =
  | { type: "reg"; data: RegData }
  | { type: "reg"; data: RegResponseData }
  | { type: "update_winners"; data: WinnerInfo[] }
  | { type: "create_room"; data: "" }
  | { type: "add_user_to_room"; data: AddUserToRoomData }
  | { type: "update_room"; data: RoomInfo[] }
  | { type: "create_game"; data: CreateGameData }
  | { type: "add_ships"; data: AddShipsData }
  | { type: "start_game"; data: StartGameData }
  | { type: "attack"; data: AttackData }
  | { type: "attack"; data: AttackResultData }
  | { type: "randomAttack"; data: RandomAttackData }
  | { type: "turn"; data: TurnData }
  | { type: "finish"; data: FinishData }
  | { type: "player_disconnected"; data: PlayerDisconnectedData }
  | { type: "single_play"; data: "" }
  | { type: 'error'; data: { error: true; errorText: string } };

export interface Command<T extends CommandData = CommandData> {
  type: T["type"];
  data: T["data"];
  id: 0;
}

export interface RegCommand extends Command<{ type: "reg"; data: RegData }> { }
export interface RegResponseCommand extends Command<{ type: "reg"; data: RegResponseData }> { }
export interface UpdateWinnersCommand extends Command<{ type: "update_winners"; data: WinnerInfo[] }> { }
export interface CreateRoomCommand extends Command<{ type: "create_room"; data: "" }> { }
export interface AddUserToRoomCommand extends Command<{ type: "add_user_to_room"; data: AddUserToRoomData }> { }
export interface UpdateRoomCommand extends Command<{ type: "update_room"; data: RoomInfo[] }> { }
export interface CreateGameCommand extends Command<{ type: "create_game"; data: CreateGameData }> { }
export interface AddShipsCommand extends Command<{ type: "add_ships"; data: AddShipsData }> { }
export interface StartGameCommand extends Command<{ type: "start_game"; data: StartGameData }> { }
export interface AttackCommand extends Command<{ type: "attack"; data: AttackData }> { }
export interface AttackResultCommand extends Command<{ type: "attack"; data: AttackResultData }> { }
export interface RandomAttackCommand extends Command<{ type: "randomAttack"; data: RandomAttackData }> { }
export interface TurnCommand extends Command<{ type: "turn"; data: TurnData }> { }
export interface FinishCommand extends Command<{ type: "finish"; data: FinishData }> { }
export interface PlayerDisconnectedCommand extends Command<{ type: "player_disconnected"; data: PlayerDisconnectedData }> { }
