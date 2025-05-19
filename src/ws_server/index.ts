import { BattleshipServer } from "./server";

const server = new BattleshipServer();

process.on('SIGINT', () => {
  server.close();
  process.exit();
});
