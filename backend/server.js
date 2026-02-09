const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// ============================================
// WORD LISTS
// ============================================

const wordLists = {
  general: [
    'apple', 'banana', 'cat', 'dog', 'elephant', 'flower', 'guitar', 'house',
    'island', 'jacket', 'kite', 'lion', 'mountain', 'notebook', 'ocean', 'pizza',
    'queen', 'robot', 'sunset', 'train', 'umbrella', 'violin', 'waterfall', 'zebra',
    'airplane', 'bicycle', 'camera', 'diamond', 'eagle', 'forest', 'garden', 'helicopter'
  ],
  animals: [
    'elephant', 'giraffe', 'penguin', 'dolphin', 'butterfly', 'kangaroo', 'crocodile',
    'peacock', 'octopus', 'panda', 'koala', 'flamingo', 'leopard', 'whale', 'tiger'
  ],
  food: [
    'pizza', 'burger', 'sushi', 'pasta', 'taco', 'donut', 'cupcake', 'sandwich',
    'pancake', 'waffle', 'cookie', 'ice cream', 'salad', 'soup', 'steak'
  ],
  objects: [
    'lamp', 'chair', 'table', 'bottle', 'phone', 'computer', 'clock', 'mirror',
    'scissors', 'pencil', 'umbrella', 'backpack', 'helmet', 'guitar', 'piano'
  ],
  nature: [
    'mountain', 'river', 'ocean', 'forest', 'desert', 'volcano', 'waterfall',
    'rainbow', 'sunrise', 'sunset', 'cloud', 'lightning', 'snow', 'beach', 'island'
  ]
};

function getRandomWords(count, theme = 'general') {
  const list = wordLists[theme] || wordLists.general;
  const shuffled = [...list].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// ============================================
// GAME MANAGER
// ============================================

class GameManager {
  constructor() {
    this.rooms = new Map();
    this.playerRooms = new Map();
  }

  createRoom(playerId, playerName, avatar = { color: '#3b82f6', letter: 'A' }) {
    const roomId = this.generateRoomId();
    const room = {
      id: roomId,
      host: playerId,
      players: new Map([[playerId, {
        id: playerId,
        name: playerName,
        avatar,
        score: 0,
        hasGuessed: false,
        rank: 1
      }]]),
      currentRound: 0,
      maxRounds: 3,
      currentWord: null,
      currentDrawer: null,
      roundStartTime: null,
      roundDuration: 80000,
      gameState: 'waiting',
      wordTheme: 'general',
      hintsRevealed: []
    };

    this.rooms.set(roomId, room);
    this.playerRooms.set(playerId, roomId);

    return {
      roomId,
      players: Array.from(room.players.values())
    };
  }

  joinRoom(roomId, playerId, playerName, avatar = { color: '#3b82f6', letter: 'A' }) {
    const room = this.rooms.get(roomId);
    
    if (!room) {
      return { error: 'Room not found' };
    }

    if (room.players.size >= 8) {
      return { error: 'Room is full' };
    }

    room.players.set(playerId, {
      id: playerId,
      name: playerName,
      avatar,
      score: 0,
      hasGuessed: false,
      rank: room.players.size + 1
    });

    this.playerRooms.set(playerId, roomId);

    return {
      roomId,
      players: Array.from(room.players.values())
    };
  }

  startGame(roomId) {
    const room = this.rooms.get(roomId);
    if (!room || room.gameState === 'playing') return null;

    room.gameState = 'playing';
    room.currentRound = 1;
    
    this.startNewRound(room);

    return {
      currentRound: room.currentRound,
      maxRounds: room.maxRounds,
      currentDrawer: room.currentDrawer,
      wordLength: room.currentWord.length,
      roundDuration: room.roundDuration,
      players: Array.from(room.players.values())
    };
  }

  startNewRound(room) {
    const playerIds = Array.from(room.players.keys());
    const drawerIndex = (room.currentRound - 1) % playerIds.length;
    room.currentDrawer = playerIds[drawerIndex];
    room.currentWord = getRandomWords(1, room.wordTheme)[0];
    room.roundStartTime = Date.now();
    room.hintsRevealed = [];

    room.players.forEach(player => {
      player.hasGuessed = false;
    });

    setTimeout(() => this.revealHint(room, 0), 30000);
    setTimeout(() => this.revealHint(room, 1), 60000);
  }

  revealHint(room, hintIndex) {
    if (room.gameState !== 'playing' || !room.currentWord) return;

    const word = room.currentWord;
    const positions = [];
    
    for (let i = 0; i < word.length; i++) {
      if (!room.hintsRevealed.includes(i)) {
        positions.push(i);
      }
    }

    if (positions.length > 0) {
      const randomPos = positions[Math.floor(Math.random() * positions.length)];
      room.hintsRevealed.push(randomPos);
    }
  }

  getWordHint(room) {
    if (!room.currentWord) return '';
    
    return room.currentWord.split('').map((char, i) => 
      room.hintsRevealed.includes(i) ? char : '_'
    ).join(' ');
  }

  checkGuess(roomId, playerId, guess) {
    const room = this.rooms.get(roomId);
    const player = room?.players.get(playerId);

    if (!room || !player || player.hasGuessed || playerId === room.currentDrawer) {
      return { correct: false, playerName: player?.name || 'Unknown' };
    }

    const isCorrect = guess.toLowerCase() === room.currentWord.toLowerCase();

    if (isCorrect) {
      player.hasGuessed = true;
      const timeBonus = Math.max(0, Math.floor((room.roundDuration - (Date.now() - room.roundStartTime)) / 1000));
      const points = 100 + timeBonus;
      player.score += points;

      this.updateRanks(room);

      return {
        correct: true,
        playerName: player.name,
        points,
        players: Array.from(room.players.values())
      };
    }

    return { correct: false, playerName: player.name };
  }

  updateRanks(room) {
    const sorted = Array.from(room.players.values()).sort((a, b) => b.score - a.score);
    sorted.forEach((player, index) => {
      room.players.get(player.id).rank = index + 1;
    });
  }

  removePlayer(roomId, playerId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.players.delete(playerId);
    this.playerRooms.delete(playerId);

    if (room.players.size === 0) {
      this.rooms.delete(roomId);
      return null;
    }

    if (room.host === playerId) {
      room.host = Array.from(room.players.keys())[0];
    }

    return Array.from(room.players.values());
  }

  findPlayerRoom(playerId) {
    return this.playerRooms.get(playerId);
  }

  generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}

// ============================================
// SOCKET.IO SERVER
// ============================================

const gameManager = new GameManager();
const rateLimits = new Map();

function rateLimit(socket, event, maxPerMinute = 60) {
  const key = `${socket.id}-${event}`;
  const now = Date.now();
  
  if (!rateLimits.has(key)) {
    rateLimits.set(key, []);
  }
  
  const timestamps = rateLimits.get(key).filter(t => now - t < 60000);
  
  if (timestamps.length >= maxPerMinute) {
    return false;
  }
  
  timestamps.push(now);
  rateLimits.set(key, timestamps);
  return true;
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createRoom', ({ playerName, avatar }) => {
    const { roomId, players } = gameManager.createRoom(socket.id, playerName, avatar);
    socket.join(roomId);
    socket.emit('roomCreated', { roomId, players });
  });

  socket.on('joinRoom', ({ roomId, playerName, avatar }) => {
    const result = gameManager.joinRoom(roomId, socket.id, playerName, avatar);
    if (result.error) {
      socket.emit('error', result.error);
    } else {
      socket.join(roomId);
      io.to(roomId).emit('playerJoined', result);
    }
  });

  socket.on('startGame', ({ roomId }) => {
    const game = gameManager.startGame(roomId);
    if (game) {
      io.to(roomId).emit('gameStarted', game);
    }
  });

  socket.on('draw', ({ roomId, data }) => {
    if (!rateLimit(socket, 'draw', 120)) return;
    
    if (JSON.stringify(data).length > 10000) return;
    
    socket.to(roomId).emit('drawing', { data, playerId: socket.id });
  });

  socket.on('undo', ({ roomId }) => {
    socket.to(roomId).emit('undoStroke', { playerId: socket.id });
  });

  socket.on('guess', ({ roomId, message }) => {
    if (!rateLimit(socket, 'guess', 30)) return;
    
    const sanitized = message.replace(/[<>]/g, '').trim().substring(0, 100);
    
    const result = gameManager.checkGuess(roomId, socket.id, sanitized);
    
    if (result.correct) {
      io.to(roomId).emit('correctGuess', {
        playerId: socket.id,
        playerName: result.playerName,
        points: result.points,
        players: result.players
      });
    }
    
    io.to(roomId).emit('newMessage', {
      playerId: socket.id,
      playerName: result.playerName,
      message: result.correct ? '*** guessed the word! ***' : sanitized,
      isSystem: result.correct
    });
  });

  socket.on('kickPlayer', ({ roomId, playerId }) => {
    const room = gameManager.rooms.get(roomId);
    if (!room || room.host !== socket.id) return;
    
    const targetSocket = io.sockets.sockets.get(playerId);
    if (targetSocket) {
      targetSocket.leave(roomId);
      targetSocket.emit('kicked');
      gameManager.removePlayer(roomId, playerId);
      io.to(roomId).emit('playerLeft', { playerId, players: room.players });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const roomId = gameManager.findPlayerRoom(socket.id);
    if (roomId) {
      const players = gameManager.removePlayer(roomId, socket.id);
      if (players) {
        io.to(roomId).emit('playerLeft', { playerId: socket.id, players });
      }
    }
    rateLimits.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
