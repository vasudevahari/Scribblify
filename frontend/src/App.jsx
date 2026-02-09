import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001');

// ============================================
// LANDING COMPONENT
// ============================================

const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];

function Landing({ onCreateRoom, onPlay, onJoinPrivate }) {
  const [playerName, setPlayerName] = useState('');
  const [colorIndex, setColorIndex] = useState(0);
  const [theme, setTheme] = useState('general');

  const currentAvatar = {
    color: AVATAR_COLORS[colorIndex],
    letter: playerName.charAt(0).toUpperCase() || 'A'
  };

  const nextColor = () => setColorIndex((prev) => (prev + 1) % AVATAR_COLORS.length);
  const prevColor = () => setColorIndex((prev) => (prev - 1 + AVATAR_COLORS.length) % AVATAR_COLORS.length);

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      alert('Enter your name');
      return;
    }
    onCreateRoom(playerName, currentAvatar, theme);
  };

  const handlePlay = () => {
    if (!playerName.trim()) {
      alert('Enter your name');
      return;
    }
    onPlay(playerName, currentAvatar);
  };

  const handleJoinPrivate = () => {
    if (!playerName.trim()) {
      alert('Enter your name');
      return;
    }
    onJoinPrivate(playerName, currentAvatar);
  };

  return (
    <div className="game-screen">
      <div className="landing-container">
        
        <div className="game-logo">
          <h1 className="game-title">🎨 Doodle Dash</h1>
          <p className="game-subtitle">Draw • Guess • Win!</p>
        </div>

        <div className="game-card">
          
          <div className="form-section">
            <label className="form-label">Choose Theme</label>
            <select value={theme} onChange={(e) => setTheme(e.target.value)} className="game-select">
              <option value="general">🎯 General</option>
              <option value="animals">🦁 Animals</option>
              <option value="food">🍕 Food</option>
              <option value="objects">📱 Objects</option>
              <option value="nature">🌲 Nature</option>
            </select>
          </div>

          <div className="form-section">
            <label className="form-label">Your Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="game-input"
              maxLength={20}
            />
          </div>

          <div className="avatar-selector">
            <label className="form-label">Choose Avatar</label>
            <div className="avatar-picker">
              <button onClick={prevColor} className="avatar-arrow">←</button>
              
              <div className="avatar-circle" style={{ backgroundColor: currentAvatar.color }}>
                {currentAvatar.letter}
              </div>

              <button onClick={nextColor} className="avatar-arrow">→</button>
            </div>
          </div>

          <div className="button-group">
            <button onClick={handlePlay} className="btn-primary btn-large">
              ▶️ PLAY NOW
            </button>
            <button onClick={handleCreateRoom} className="btn-secondary">
              🏠 Create Room
            </button>
            <button onClick={handleJoinPrivate} className="btn-secondary">
              🔑 Join Private
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

// ============================================
// CREATE ROOM COMPONENT
// ============================================

function CreateRoom({ playerName, avatar, theme, socket }) {
  const [settings, setSettings] = useState({
    isPublic: true,
    maxPlayers: 4,
    rounds: 3,
    drawTime: 80
  });

  const handleCreate = () => {
    socket.emit('createRoom', { settings: { ...settings, theme }, playerName, avatar });
  };

  return (
    <div className="game-screen">
      <div className="landing-container">
        <div className="game-card">
          <h2 className="card-title">🏠 Create Room</h2>

          <div className="form-section">
            <label className="form-label">Room Type</label>
            <select 
              value={settings.isPublic} 
              onChange={(e) => setSettings({...settings, isPublic: e.target.value === 'true'})} 
              className="game-select"
            >
              <option value="true">🌍 Public</option>
              <option value="false">🔒 Private</option>
            </select>
          </div>

          <div className="form-section">
            <label className="form-label">Max Players</label>
            <select 
              value={settings.maxPlayers} 
              onChange={(e) => setSettings({...settings, maxPlayers: Number(e.target.value)})} 
              className="game-select"
            >
              {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} Players</option>)}
            </select>
          </div>

          <div className="form-section">
            <label className="form-label">Rounds</label>
            <select 
              value={settings.rounds} 
              onChange={(e) => setSettings({...settings, rounds: Number(e.target.value)})} 
              className="game-select"
            >
              {[3,5,7,9].map(n => <option key={n} value={n}>{n} Rounds</option>)}
            </select>
          </div>

          <div className="form-section">
            <label className="form-label">Draw Time</label>
            <select 
              value={settings.drawTime} 
              onChange={(e) => setSettings({...settings, drawTime: Number(e.target.value)})} 
              className="game-select"
            >
              {[60, 75, 80, 95, 120].map(n => <option key={n} value={n}>{n} seconds</option>)}
            </select>
          </div>

          <button onClick={handleCreate} className="btn-primary btn-large">
            ✨ Create Room
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// JOIN ROOM COMPONENT
// ============================================

function JoinRoom({ playerName, avatar, socket, isPublic }) {
  const [roomCode, setRoomCode] = useState('');

  const handleJoin = () => {
    if (isPublic) {
      socket.emit('joinRoom', { playerName, avatar, isPublic: true });
    } else {
      if (!roomCode.trim()) {
        alert('Enter room code');
        return;
      }
      socket.emit('joinRoom', { roomCode, playerName, avatar, isPublic: false });
    }
  };

  return (
    <div className="game-screen">
      <div className="landing-container">
        <div className="game-card">
          <h2 className="card-title">
            {isPublic ? '🌍 Join Public Game' : '🔑 Join Private Game'}
          </h2>
          
          {!isPublic && (
            <div className="form-section">
              <label className="form-label">Room Code</label>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="game-input"
                maxLength={6}
              />
            </div>
          )}
          
          <button onClick={handleJoin} className="btn-primary btn-large">
            🚀 Join Game
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CANVAS COMPONENT
// ============================================

function Canvas({ socket, roomCode, canDraw, currentTool }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState(null);
  const strokeHistory = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setContext(ctx);

    socket.on('draw', (data) => {
      drawLine(ctx, data.from, data.to, data.color, data.size);
    });

    socket.on('clearCanvas', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      strokeHistory.current = [];
    });

    socket.on('undoStroke', () => {
      redrawCanvas(ctx, strokeHistory.current.slice(0, -1));
      strokeHistory.current = strokeHistory.current.slice(0, -1);
    });

    return () => {
      socket.off('draw');
      socket.off('clearCanvas');
      socket.off('undoStroke');
    };
  }, [socket]);

  const drawLine = (ctx, from, to, color, size) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const redrawCanvas = (ctx, strokes) => {
    const canvas = canvasRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes.forEach(stroke => {
      drawLine(ctx, stroke.from, stroke.to, stroke.color, stroke.size);
    });
  };

  const startDrawing = (e) => {
    if (!canDraw) return;
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const pos = {
      x: (e.clientX || e.touches?.[0]?.clientX) - rect.left,
      y: (e.clientY || e.touches?.[0]?.clientY) - rect.top
    };
    context.beginPath();
    context.moveTo(pos.x, pos.y);
    context.lastX = pos.x;
    context.lastY = pos.y;
  };

  const draw = (e) => {
    if (!isDrawing || !canDraw) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const pos = {
      x: (e.clientX || e.touches?.[0]?.clientX) - rect.left,
      y: (e.clientY || e.touches?.[0]?.clientY) - rect.top
    };

    const from = { x: context.lastX || pos.x, y: context.lastY || pos.y };
    const strokeData = { from, to: pos, color: currentTool.color, size: currentTool.size };
    
    drawLine(context, from, pos, currentTool.color, currentTool.size);
    strokeHistory.current.push(strokeData);

    socket.emit('draw', { roomCode, data: strokeData });

    context.lastX = pos.x;
    context.lastY = pos.y;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (context) {
      context.lastX = null;
      context.lastY = null;
    }
  };

  return (
    <div className="canvas-container">
      <canvas
        ref={canvasRef}
        width={1000}
        height={500}
        className={`drawing-canvas ${!canDraw ? 'disabled' : ''}`}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      {!canDraw && <div className="canvas-overlay">👀 Watch and guess!</div>}
    </div>
  );
}

// ============================================
// TOOLS COMPONENT
// ============================================

const COLORS = ['#000000', '#FFFFFF', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#F7DC6F', '#BB8FCE'];

function Tools({ socket, roomCode, canDraw, currentTool, setCurrentTool }) {
  const handleClear = () => {
    if (!canDraw) return;
    socket.emit('clearCanvas', { roomCode });
  };

  const handleUndo = () => {
    if (!canDraw) return;
    socket.emit('undo', { roomCode });
  };

  return (
    <div className="tools-panel">
      
      {canDraw && (
        <div className="color-palette">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setCurrentTool({...currentTool, color: c})}
              className={`color-btn ${currentTool.color === c ? 'active' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}

      {canDraw && (
        <div className="tool-actions">
          <div className="brush-sizes">
            <button
              className={`brush-btn ${currentTool.size === 2 ? 'active' : ''}`}
              onClick={() => setCurrentTool({...currentTool, size: 2})}
            >
              S
            </button>
            <button
              className={`brush-btn ${currentTool.size === 5 ? 'active' : ''}`}
              onClick={() => setCurrentTool({...currentTool, size: 5})}
            >
              M
            </button>
            <button
              className={`brush-btn ${currentTool.size === 10 ? 'active' : ''}`}
              onClick={() => setCurrentTool({...currentTool, size: 10})}
            >
              L
            </button>
          </div>
          <button onClick={handleUndo} className="tool-btn">↶ Undo</button>
          <button onClick={handleClear} className="tool-btn">🗑️ Clear</button>
        </div>
      )}
    </div>
  );
}

// ============================================
// PLAYER LIST COMPONENT
// ============================================

function PlayerList({ players, currentDrawer, myId }) {
  return (
    <div className="player-panel">
      <h3 className="panel-title">👥 Players</h3>
      <div className="players-list">
        {players.map((player) => (
          <div 
            key={player.id}
            className={`player-item ${player.id === myId ? 'my-player' : ''} ${player.id === currentDrawer?.id ? 'drawing' : ''}`}
          >
            <div className="player-avatar" style={{ backgroundColor: player.avatar?.color || '#3b82f6' }}>
              {player.avatar?.letter || player.name.charAt(0).toUpperCase()}
            </div>
            <div className="player-details">
              <div className="player-name">
                {player.name}
                {player.id === myId && <span className="you-badge">YOU</span>}
              </div>
              <div className="player-score">⭐ {player.score || 0} pts</div>
            </div>
            {player.rank <= 3 && (
              <div className="rank-badge">
                {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : '🥉'}
              </div>
            )}
            {player.id === currentDrawer?.id && (
              <div className="drawing-indicator">✏️</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// CHAT COMPONENT
// ============================================

function Chat({ socket, roomCode, isDrawer }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.on('chatMessage', ({ player, message, isSystem }) => {
      setMessages(prev => [...prev, { player, message, isSystem }]);
    });

    return () => socket.off('chatMessage');
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isDrawer) return;
    socket.emit('guess', { roomCode, guess: input });
    setInput('');
  };

  return (
    <div className="chat-panel">
      <h3 className="panel-title">💬 Chat</h3>
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.isSystem ? 'system' : 'user'}`}>
            {!msg.isSystem && <span className="msg-author">{msg.player}:</span>}
            <span className="msg-text">{msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="chat-input-container">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isDrawer ? "You're drawing!" : "Type your guess..."}
          className="chat-input"
          disabled={isDrawer}
        />
        <button onClick={handleSend} disabled={isDrawer} className="send-btn">
          ➤
        </button>
      </div>
    </div>
  );
}

// ============================================
// ROUND END COMPONENT
// ============================================

function RoundEnd({ data }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card celebration">
        <h3 className="modal-title">🎉 Round Complete!</h3>
        <div className="results-list">
          {data.guessOrder.map((guess, i) => (
            <div key={i} className="result-item">
              <span className="result-rank">#{i + 1}</span>
              <span className="result-name">{guess.name}</span>
              <span className="result-points">+{data.scores[guess.playerId]} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// GAME ROOM COMPONENT
// ============================================

function GameRoom({ room, socket, playerName }) {
  const [gameState, setGameState] = useState({
    started: false,
    drawer: null,
    hiddenWord: '',
    timeLeft: 0,
    currentRound: 0,
    totalRounds: room.rounds,
    isDrawing: false,
    hasGuessed: false
  });
  const [showWordSelection, setShowWordSelection] = useState(false);
  const [wordChoices, setWordChoices] = useState([]);
  const [showRoundEnd, setShowRoundEnd] = useState(false);
  const [roundEndData, setRoundEndData] = useState(null);
  const [showGameEnd, setShowGameEnd] = useState(false);
  const [finalScores, setFinalScores] = useState([]);
  const [currentTool, setCurrentTool] = useState({ color: '#000000', size: 5 });
  const [updatedRoom, setUpdatedRoom] = useState(room);

  useEffect(() => {
    socket.on('gameStarted', ({ room }) => {
      setGameState(prev => ({ ...prev, started: true }));
      setUpdatedRoom(room);
    });

    socket.on('selectWord', ({ words }) => {
      setWordChoices(words);
      setShowWordSelection(true);
    });

    socket.on('roundStarted', ({ drawer, hiddenWord, drawTime, currentRound, totalRounds }) => {
      setShowWordSelection(false);
      setGameState({
        started: true,
        drawer,
        hiddenWord,
        timeLeft: drawTime,
        currentRound,
        totalRounds,
        isDrawing: drawer.id === socket.id,
        hasGuessed: false
      });
      startTimer(drawTime);
    });

    socket.on('correctGuess', () => {
      setGameState(prev => ({ ...prev, hasGuessed: true }));
    });

    socket.on('turnEnded', ({ scores, guessOrder, players }) => {
      setRoundEndData({ scores, guessOrder, players });
      setShowRoundEnd(true);
      setUpdatedRoom(prev => ({ ...prev, players }));
      setTimeout(() => setShowRoundEnd(false), 3000);
    });

    socket.on('gameEnded', ({ finalScores }) => {
      setFinalScores(finalScores);
      setShowGameEnd(true);
    });

    socket.on('autoEndTurn', ({ roomCode }) => {
      socket.emit('endTurn', { roomCode });
    });

    socket.on('playerJoined', ({ room }) => {
      setUpdatedRoom(room);
    });

    socket.on('playerLeft', ({ room }) => {
      setUpdatedRoom(room);
    });

    return () => {
      socket.off('gameStarted');
      socket.off('selectWord');
      socket.off('roundStarted');
      socket.off('correctGuess');
      socket.off('turnEnded');
      socket.off('gameEnded');
      socket.off('autoEndTurn');
      socket.off('playerJoined');
      socket.off('playerLeft');
    };
  }, [socket]);

  const startTimer = (duration) => {
    let time = duration;
    const interval = setInterval(() => {
      time--;
      setGameState(prev => ({ ...prev, timeLeft: time }));
      if (time <= 0) {
        clearInterval(interval);
        socket.emit('endTurn', { roomCode: room.code });
      }
    }, 1000);
  };

  const handleWordSelect = (word) => {
    socket.emit('wordSelected', { roomCode: room.code, word });
  };

  const handleStartGame = () => {
    socket.emit('startGame', { roomCode: room.code });
  };

  const handleCopyRoomLink = () => {
    navigator.clipboard.writeText(room.code);
    alert('Room code copied! 📋');
  };

  if (showGameEnd) {
    return (
      <div className="game-screen">
        <div className="landing-container">
          <div className="game-card celebration">
            <h2 className="card-title">🏆 Game Over!</h2>
            <div className="final-scores">
              {finalScores.map((player) => (
                <div key={player.id} className="final-rank-item">
                  <span className="final-rank">
                    {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : `#${player.rank}`}
                  </span>
                  <span className="final-name">{player.name}</span>
                  <span className="final-score">{player.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showWordSelection) {
    return (
      <div className="game-screen">
        <div className="landing-container">
          <div className="game-card">
            <h3 className="card-title">🎯 Choose a word:</h3>
            <div className="word-choices">
              {wordChoices.map(word => (
                <button key={word} onClick={() => handleWordSelect(word)} className="word-btn">
                  {word}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState.started) {
    return (
      <div className="game-screen">
        <div className="lobby-container">
          <div className="game-card">
            <div className="room-header">
              <h2 className="card-title">🏠 Room: {room.code}</h2>
              <button onClick={handleCopyRoomLink} className="copy-btn">📋 Copy</button>
            </div>
            
            <div className="room-info">
              <div className="info-badge">
                <span className="info-label">Type</span>
                <span className="info-value">{room.isPublic ? '🌍 Public' : '🔒 Private'}</span>
              </div>
              <div className="info-badge">
                <span className="info-label">Players</span>
                <span className="info-value">{updatedRoom.players.length}/{room.maxPlayers}</span>
              </div>
              <div className="info-badge">
                <span className="info-label">Rounds</span>
                <span className="info-value">{room.rounds}</span>
              </div>
              <div className="info-badge">
                <span className="info-label">Time</span>
                <span className="info-value">{room.drawTime}s</span>
              </div>
            </div>

            <div className="lobby-players">
              {updatedRoom.players.map((player) => (
                <div key={player.id} className="lobby-player">
                  <div className="player-avatar" style={{ backgroundColor: player.avatar?.color || '#3b82f6' }}>
                    {player.avatar?.letter || player.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="lobby-player-name">
                    {player.name}
                    {player.id === socket.id && <span className="you-badge">YOU</span>}
                  </span>
                </div>
              ))}
            </div>

            {room.host === socket.id && updatedRoom.players.length >= 2 && (
              <button onClick={handleStartGame} className="btn-primary btn-large">
                🚀 Start Game
              </button>
            )}
            {room.host !== socket.id && (
              <div className="waiting-text">⏳ Waiting for host to start...</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-room">
      
      {/* Top Bar */}
      <div className="game-header">
        <div className="header-left">
          <span className="round-info">Round {gameState.currentRound}/{gameState.totalRounds}</span>
          <span className="room-code">Room: {room.code}</span>
        </div>

        <div className="header-center">
          <div className="word-hint">{gameState.hiddenWord}</div>
        </div>

        <div className="header-right">
          <div className={`timer ${gameState.timeLeft < 10 ? 'danger' : ''}`}>
            ⏱️ {gameState.timeLeft}s
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="game-layout">
        
        <PlayerList players={updatedRoom.players} currentDrawer={gameState.drawer} myId={socket.id} />

        <div className="game-center">
          <Canvas
            socket={socket}
            roomCode={room.code}
            canDraw={gameState.isDrawing}
            currentTool={currentTool}
          />
          
          <Tools
            socket={socket}
            roomCode={room.code}
            canDraw={gameState.isDrawing}
            currentTool={currentTool}
            setCurrentTool={setCurrentTool}
          />
        </div>

        <Chat
          socket={socket}
          roomCode={room.code}
          isDrawer={gameState.isDrawing}
        />

      </div>

      {/* Footer */}
      <div className="game-footer">
        <span>💻 DEVELOPED BY HARI VURY</span>
      </div>

      {showRoundEnd && <RoundEnd data={roundEndData} />}
    </div>
  );
}

// ============================================
// MAIN APP COMPONENT
// ============================================

export default function App() {
  const [view, setView] = useState('landing');
  const [playerName, setPlayerName] = useState('');
  const [playerAvatar, setPlayerAvatar] = useState(null);
  const [theme, setTheme] = useState('general');
  const [room, setRoom] = useState(null);

  useEffect(() => {
    socket.on('roomCreated', ({ roomCode, room }) => {
      setRoom(room);
      setView('game');
    });

    socket.on('roomJoined', ({ room }) => {
      setRoom(room);
      setView('game');
    });

    socket.on('roomClosed', () => {
      alert('Room closed by host');
      setView('landing');
      setRoom(null);
    });

    socket.on('error', ({ message }) => {
      alert(message);
    });

    return () => {
      socket.off('roomCreated');
      socket.off('roomJoined');
      socket.off('roomClosed');
      socket.off('error');
    };
  }, []);

  const handleCreateRoom = (name, avatar, theme) => {
    setPlayerName(name);
    setPlayerAvatar(avatar);
    setTheme(theme);
    setView('create');
  };

  const handlePlay = (name, avatar) => {
    setPlayerName(name);
    setPlayerAvatar(avatar);
    setView('join-public');
  };

  const handleJoinPrivate = (name, avatar) => {
    setPlayerName(name);
    setPlayerAvatar(avatar);
    setView('join-private');
  };

  return (
    <div className="app">
      {view === 'landing' && (
        <Landing onCreateRoom={handleCreateRoom} onPlay={handlePlay} onJoinPrivate={handleJoinPrivate} />
      )}
      {view === 'create' && (
        <CreateRoom playerName={playerName} avatar={playerAvatar} theme={theme} socket={socket} />
      )}
      {view === 'join-public' && (
        <JoinRoom playerName={playerName} avatar={playerAvatar} socket={socket} isPublic={true} />
      )}
      {view === 'join-private' && (
        <JoinRoom playerName={playerName} avatar={playerAvatar} socket={socket} isPublic={false} />
      )}
      {view === 'game' && room && (
        <GameRoom room={room} socket={socket} playerName={playerName} />
      )}
    </div>
  );
}