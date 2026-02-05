const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

const rooms = new Map();

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getNextDrawer(room) {
  const players = Array.from(room.players.values());
  const currentIndex = players.findIndex(p => p.id === room.currentDrawer);
  return players[(currentIndex + 1) % players.length].id;
}

function startRound(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || room.players.size < 2) return;
  
  room.currentWord = ['cat', 'house', 'tree', 'car', 'phone', 'book'][Math.floor(Math.random() * 6)];
  room.currentDrawer = getNextDrawer(room);
  room.roundTime = 60;
  room.guessed = new Set();
  
  io.to(roomCode).emit('round-start', {
    drawer: room.currentDrawer,
    wordLength: room.currentWord.length,
    time: room.roundTime
  });
  
  io.to(room.currentDrawer).emit('word', room.currentWord);
  
  if (room.timer) clearInterval(room.timer);
  room.timer = setInterval(() => {
    room.roundTime--;
    io.to(roomCode).emit('time-update', room.roundTime);
    
    if (room.roundTime <= 0 || room.guessed.size === room.players.size - 1) {
      clearInterval(room.timer);
      io.to(roomCode).emit('round-end', { word: room.currentWord });
      setTimeout(() => startRound(roomCode), 3000);
    }
  }, 1000);
}

io.on('connection', (socket) => {
  socket.on('create-room', (username) => {
    const code = generateCode();
    rooms.set(code, {
      code,
      players: new Map([[socket.id, { id: socket.id, username, score: 0 }]]),
      host: socket.id,
      started: false,
      currentDrawer: socket.id,
      currentWord: '',
      guessed: new Set(),
      roundTime: 0
    });
    socket.join(code);
    socket.emit('room-created', { code, players: Array.from(rooms.get(code).players.values()) });
  });

  socket.on('join-room', ({ code, username }) => {
    const room = rooms.get(code);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }
    if (room.started) {
      socket.emit('error', 'Game already started');
      return;
    }
    
    room.players.set(socket.id, { id: socket.id, username, score: 0 });
    socket.join(code);
    io.to(code).emit('player-joined', Array.from(room.players.values()));
  });

  socket.on('start-game', (code) => {
    const room = rooms.get(code);
    if (!room || room.host !== socket.id) return;
    
    room.started = true;
    io.to(code).emit('game-started');
    startRound(code);
  });

  socket.on('draw', ({ code, data }) => {
    socket.to(code).emit('draw', data);
  });

  socket.on('clear-canvas', (code) => {
    io.to(code).emit('clear-canvas');
  });

  socket.on('guess', ({ code, message }) => {
    const room = rooms.get(code);
    if (!room) return;
    
    const player = room.players.get(socket.id);
    if (socket.id === room.currentDrawer || room.guessed.has(socket.id)) return;
    
    io.to(code).emit('chat-message', { username: player.username, message });
    
    if (message.toLowerCase() === room.currentWord.toLowerCase()) {
      const points = Math.max(100, room.roundTime * 10);
      player.score += points;
      room.guessed.add(socket.id);
      
      io.to(code).emit('correct-guess', { 
        username: player.username, 
        players: Array.from(room.players.values())
      });
    }
  });

  socket.on('disconnect', () => {
    rooms.forEach((room, code) => {
      if (room.players.has(socket.id)) {
        room.players.delete(socket.id);
        
        if (room.players.size === 0) {
          if (room.timer) clearInterval(room.timer);
          rooms.delete(code);
        } else {
          if (room.host === socket.id) {
            room.host = Array.from(room.players.keys())[0];
          }
          io.to(code).emit('player-left', Array.from(room.players.values()));
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Server on ${PORT}`));