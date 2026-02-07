const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Join by link endpoint
app.get('/join/:roomCode', (req, res) => {
  const frontendUrl =
    process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${frontendUrl}?room=${req.params.roomCode}`);
});

const server = http.createServer(app);

// 🔥 SOCKET.IO INITIALIZATION (MERGED)
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

// ============ WORD BANKS ============
const WORD_BANKS = {
  easy: [
    'cat','dog','house','tree','car','sun','moon','star','fish','bird',
    'apple','banana','pizza','burger','book','phone','hat','shoe',
    'ball','cake','door','window','chair','table','cup','spoon'
  ],
  mid: [
    'guitar','piano','mountain','ocean','river','flower','butterfly',
    'rocket','airplane','bicycle','camera','clock','umbrella','rainbow',
    'snowman','coffee','elephant','giraffe','penguin','castle','crown',
    'island','bridge','compass','telescope','laptop','keyboard'
  ],
  hard: [
    'volcano','lighthouse','anchor','dragon','unicorn','pyramid',
    'sphinx','astronaut','telescope','microscope','stethoscope',
    'saxophone','violin','harmonica','accordion','parachute',
    'submarine','helicopter','skyscraper','chandelier','hieroglyphics'
  ],
  nightmare: [
    'photosynthesis','metamorphosis','democracy','capitalism','philosophy',
    'archaeology','anthropology','paleontology','constellation',
    'architecture','silhouette','equilibrium','momentum','gravity',
    'electricity','magnetism','transparency','reflection','propaganda'
  ],
};

// ============ GAME STATE ============
const rooms = new Map();

// ============ CONSTANTS ============
const DEFAULT_ROUND_TIME = 80;
const WORD_REVEAL_TIME = 3;
const MAX_PLAYERS = 8;

// ============ ROOM / PLAYER ============
function createRoom(code, settings, hostId) {
  return {
    code,
    hostId,
    isPublic: settings?.isPublic || false,
    maxPlayers: settings?.maxPlayers || MAX_PLAYERS,
    rounds: settings?.rounds || 3,
    wordsCount: settings?.wordsCount || 1,
    difficulty: settings?.difficulty || 'easy',
    drawTime: settings?.drawTime || DEFAULT_ROUND_TIME,
    players: new Map(),
    currentRound: 0,
    currentTurnIndex: 0,
    currentDrawer: null,
    currentWord: null,
    wordChoices: [],
    timer: null,
    timerSeconds: 0,
    roundActive: false,
    gameStarted: false,
    drawingData: [],
    guessedPlayers: new Set(),
    guessTimestamps: [],
    roundScores: new Map()
  };
}

function createPlayer(id, name, isHost = false) {
  return {
    id,
    name,
    score: 0,
    isDrawing: false,
    isHost,
    rank: 0
  };
}

// ============ HELPERS ============
function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getRandomWords(difficulty, count) {
  const bank = WORD_BANKS[difficulty] || WORD_BANKS.easy;
  const shuffled = [...bank].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count === 1 ? 1 : count === 2 ? 2 : 3);
}

function getMaskedWord(word) {
  if (!word) return '';
  return word.split('').map(c => (c === ' ' ? ' ' : '_')).join(' ');
}

function getGameState(room) {
  return {
    players: Array.from(room.players.values())
      .sort((a, b) => b.score - a.score),
    currentRound: room.currentRound,
    maxRounds: room.rounds,
    currentDrawer: room.currentDrawer,
    roundActive: room.roundActive,
    timerSeconds: room.timerSeconds
  };
}

// ============ SOCKET.IO ============
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // CREATE ROOM
  socket.on('create-room', ({ playerName, settings }) => {
    const code = generateRoomCode();
    const room = createRoom(code, settings, socket.id);
    const player = createPlayer(socket.id, playerName, true);

    room.players.set(socket.id, player);
    rooms.set(code, room);
    socket.join(code);

    socket.emit('roomCreated', {
      roomCode: code,
      room: {
        ...room,
        players: Array.from(room.players.values())
      }
    });
  });

  // JOIN ROOM
  socket.on('join-room', ({ code, playerName }) => {
    const room = rooms.get(code);
    if (!room) return socket.emit('error', 'Room not found');
    if (room.players.size >= room.maxPlayers)
      return socket.emit('error', 'Room is full');

    const player = createPlayer(socket.id, playerName);
    room.players.set(socket.id, player);
    socket.join(code);

    socket.emit('roomJoined', {
      room: {
        ...room,
        players: Array.from(room.players.values())
      }
    });

    io.to(code).emit('game-state', getGameState(room));
  });

  // DISCONNECT
  socket.on('disconnect', () => {
    for (const [code, room] of rooms.entries()) {
      if (room.players.has(socket.id)) {
        room.players.delete(socket.id);
        if (room.players.size === 0) {
          rooms.delete(code);
        } else {
          io.to(code).emit('game-state', getGameState(room));
        }
        break;
      }
    }
  });
});

// ============ START SERVER ============
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});