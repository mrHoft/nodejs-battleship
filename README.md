# RSSchool NodeJS websocket Battleship game.
- Static http server for frontend client.
- Static WebSocket server.

## Installation
1. Clone/download repo
2. `npm install`

## Commands

Command | Description
--- | ---
`npm run start` | App served @ `http://localhost:8181` without nodemon
`npm run dev` | Start WebSocket server @ `http://localhost:3000` with nodemon
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
│   └── Ship.ts          # Ship-related logic
├── db/
│   ├── players.ts       # Player database
│   └── winners.ts       # Winners database
└── utils/
    └── logger.ts        # Logging utility
```
