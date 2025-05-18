# RSSchool NodeJS websocket Battleship game.
- Static http server for frontend client.
- Static WebSocket server.

## Installation
1. Clone/download repo
2. `npm install`

## Commands

Command | Description
--- | ---
`npm run start` | Start WebSocket and HTTP pre-builded servers
`npm run build` | Build WebSocket server
`npm run dev` | Start WebSocket server at `http://localhost:3000` with nodemon
`npm run lint` | Type check

## Project Structure
```markdown
src/
├── server.ts            # Main server file
├── types.ts             # Type definitions
├── game/
│   ├── Game.ts          # Game logic
│   ├── Room.ts          # Room management
│   ├── Player.ts        # Player management
│   └── Bot.ts           # Bot-related logic
├── db/
│   ├── players.ts       # Player database
│   └── winners.ts       # Winners database
└── utils/
│   ├── board.ts         # Game board visualization tools
│   ├── validation.ts    # Request validation
    └── logger.ts        # Logging utility
```
