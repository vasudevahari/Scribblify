import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001');

// ============ LANDING COMPONENT ============
function Landing({ onCreateRoom, onPlay, onJoinPrivate }) {
  const [playerName, setPlayerName] = useState('');

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      alert('Enter your name');
      return;
    }
    onCreateRoom(playerName);
  };

  const handlePlay = () => {
    if (!playerName.trim()) {
      alert('Enter your name');
      return;
    }
    onPlay(playerName);
  };

  const handleJoinPrivate = () => {
    if (!playerName.trim()) {
      alert('Enter your name');
      return;
    }
    onJoinPrivate(playerName);
  };

  return (
    <div className="landing">
      <h1>Doodle Dash</h1>
      <input
        type="text"
        placeholder="Enter your name"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        maxLength={20}
      />
      <div className="landing-buttons">
        <button onClick={handleCreateRoom}>Create Room</button>
        <button onClick={handlePlay}>Play Public</button>
        <button onClick={handleJoinPrivate}>Join Private</button>
      </div>
    </div>
  );
}

// ============ CREATE ROOM COMPONENT ============
function CreateRoom({ playerName, socket }) {
  const [settings, setSettings] = useState({
    isPublic: true,
    maxPlayers: 4,
    rounds: 3,
    wordsCount: 1,
    difficulty: 'easy',
    drawTime: 80
  });

  const handleCreate = () => {
    socket.emit('createRoom', { settings, playerName });
  };

  return (
    <div className="create-room">
      <h2>Create Room</h2>
      
      <label>
        Room Type:
        <select value={settings.isPublic} onChange={(e) => setSettings({...settings, isPublic: e.target.value === 'true'})}>
          <option value="true">Public</option>
          <option value="false">Private</option>
        </select>
      </label>

      <label>
        Max Players:
        <select value={settings.maxPlayers} onChange={(e) => setSettings({...settings, maxPlayers: Number(e.target.value)})}>
          {[2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>

      <label>
        Rounds:
        <select value={settings.rounds} onChange={(e) => setSettings({...settings, rounds: Number(e.target.value)})}>
          {[3,5,7,9].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>

      <label>
        Words Count:
        <select value={settings.wordsCount} onChange={(e) => setSettings({...settings, wordsCount: Number(e.target.value)})}>
          <option value={1}>1</option>
          <option value={2}>2</option>
        </select>
      </label>

      <label>
        Difficulty:
        <select value={settings.difficulty} onChange={(e) => setSettings({...settings, difficulty: e.target.value})}>
          <option value="easy">Easy</option>
          <option value="mid">Mid</option>
          <option value="hard">Hard</option>
          <option value="nightmare">Nightmare</option>
        </select>
      </label>

      <label>
        Draw Time (seconds):
        <select value={settings.drawTime} onChange={(e) => setSettings({...settings, drawTime: Number(e.target.value)})}>
          {[60, 75, 80, 95, 120].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>

      <button onClick={handleCreate}>Create</button>
    </div>
  );
}

// ============ JOIN ROOM COMPONENT ============
function JoinRoom({ playerName, socket, isPublic }) {
  const [roomCode, setRoomCode] = useState('');

  const handleJoin = () => {
    if (isPublic) {
      socket.emit('joinRoom', { playerName, isPublic: true });
    } else {
      if (!roomCode.trim()) {
        alert('Enter room code');
        return;
      }
      socket.emit('joinRoom', { roomCode, playerName, isPublic: false });
    }
  };

  return (
    <div className="join-room">
      <h2>{isPublic ? 'Join Public Game' : 'Join Private Game'}</h2>
      {!isPublic && (
        <input
          type="text"
          placeholder="Enter 6-digit room code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          maxLength={6}
        />
      )}
      <button onClick={handleJoin}>Join</button>
    </div>
  );
}

// ============ CANVAS COMPONENT ============
function Canvas({ socket, roomCode, canDraw, currentTool }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState(null);

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
    });

    return () => {
      socket.off('draw');
      socket.off('clearCanvas');
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
    drawLine(context, from, pos, currentTool.color, currentTool.size);
    
    socket.emit('draw', {
      roomCode,
      data: { from, to: pos, color: currentTool.color, size: currentTool.size }
    });
    
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
    <canvas
      ref={canvasRef}
      width={1200}
      height={600}
      className="drawing-canvas"
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
      style={{ cursor: canDraw ? 'crosshair' : 'not-allowed' }}
    />
  );
}

// ============ TOOLS COMPONENT ============
function Tools({ socket, roomCode, canDraw, currentTool, setCurrentTool }) {
  const colors = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
  const sizes = [
    { name: 'Pencil', size: 2 },
    { name: 'Pen', size: 4 },
    { name: 'Brush', size: 8 },
    { name: 'Paint', size: 16 },
    { name: 'Fill', size: 32 }
  ];

  const handleClear = () => {
    if (!canDraw) return;
    socket.emit('clearCanvas', { roomCode });
    const canvas = document.querySelector('.drawing-canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleReaction = (reaction) => {
    socket.emit('reaction', { roomCode, reaction });
  };

  return (
    <div className="tools-bar">
      <div className="colors-section">
        {colors.map(color => (
          <div
            key={color}
            className={`color-square ${currentTool.color === color ? 'active' : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => setCurrentTool({...currentTool, color})}
          />
        ))}
      </div>
      <div className="sizes-section">
        {sizes.map(tool => (
          <button 
            key={tool.name} 
            disabled={!canDraw}
            className={`size-btn ${currentTool.size === tool.size ? 'active' : ''}`}
            onClick={() => setCurrentTool({...currentTool, size: tool.size})}
          >
            {tool.name}
          </button>
        ))}
      </div>
      <button className="action-btn" onClick={handleClear} disabled={!canDraw}>Clear</button>
      <button className="reaction-btn" onClick={() => handleReaction('like')}>👍</button>
      <button className="reaction-btn" onClick={() => handleReaction('dislike')}>👎</button>
    </div>
  );
}

// ============ PLAYER LIST COMPONENT ============
function PlayerList({ players, currentDrawer, myId }) {
  return (
    <div className="player-list-panel">
      <h3>Players</h3>
      <div className="players-scroll">
        {players.map((player, index) => (
          <div 
            key={player.id} 
            className={`player-card ${currentDrawer?.id === player.id ? 'current-turn' : ''} ${player.id === myId ? 'my-player' : ''}`}
          >
            <div className="player-rank">#{player.rank}</div>
            <div className="player-avatar">{player.name.charAt(0).toUpperCase()}</div>
            <div className="player-info">
              <div className="player-name">{player.name}</div>
              <div className="player-score">{player.score} pts</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ CHAT COMPONENT ============
function Chat({ socket, roomCode, isDrawer, hasGuessed }) {
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
    if (!input.trim()) return;
    socket.emit('guess', { roomCode, guess: input });
    setInput('');
  };

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={msg.isSystem ? 'system-msg' : 'user-msg'}>
            {!msg.isSystem && <strong>{msg.player}: </strong>}
            <span>{msg.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-box">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your guess..."
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}

// ============ ROUND END COMPONENT ============
function RoundEnd({ data }) {
  return (
    <div className="round-end-overlay">
      <div className="round-end-box">
        <h3>Round Complete!</h3>
        <div className="guess-order">
          {data.guessOrder.map((guess, i) => (
            <div key={i} className="guess-rank">
              {i + 1}. {guess.name} <span className="points">+{data.scores[guess.playerId]} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ GAME ROOM COMPONENT ============
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
  const [currentTool, setCurrentTool] = useState({ color: '#000000', size: 4 });
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

  const shareLinks = {
    whatsapp: `https://wa.me/?text=Join my Doodle Dash game! Room: ${room.code}`,
    instagram: `instagram://sharesheet?text=Join my Doodle Dash game! Room: ${room.code}`,
    telegram: `https://t.me/share/url?url=${window.location.href}&text=Join my Doodle Dash game! Room: ${room.code}`
  };

  if (showGameEnd) {
    return (
      <div className="game-end">
        <h2>Game Over!</h2>
        <div className="final-scores">
          {finalScores.map((player) => (
            <div key={player.id} className="final-rank">
              <span>#{player.rank} {player.name}</span>
              <span>{player.score} pts</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (showWordSelection) {
    return (
      <div className="word-selection">
        <h3>Choose a word:</h3>
        <div className="word-choices">
          {wordChoices.map(word => (
            <button key={word} onClick={() => handleWordSelect(word)}>
              {word}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!gameState.started) {
    return (
      <div className="lobby">
        <h2>Room: {room.code}</h2>
        <div className="room-settings">
          <p>Type: {room.isPublic ? 'Public' : 'Private'}</p>
          <p>Players: {updatedRoom.players.length}/{room.maxPlayers}</p>
          <p>Rounds: {room.rounds}</p>
          <p>Difficulty: {room.difficulty}</p>
          <p>Draw Time: {room.drawTime}s</p>
        </div>
        <div className="share-links">
          <h4>Invite Friends:</h4>
          <a href={shareLinks.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a href={shareLinks.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
          <a href={shareLinks.telegram} target="_blank" rel="noopener noreferrer">Telegram</a>
        </div>
        <PlayerList players={updatedRoom.players} myId={socket.id} />
        {room.host === socket.id && updatedRoom.players.length >= 2 && (
          <button onClick={handleStartGame} className="start-game-btn">Start Game</button>
        )}
      </div>
    );
  }

  return (
    <div className="game-container">
      {/* TOP 40% */}
      <div className="top-section">
        {/* Top bar 10% */}
        <div className="top-bar">
          <div className="left-info">
            Round {gameState.currentRound}/{gameState.totalRounds} • {gameState.drawer?.name || 'Waiting...'}
          </div>
          <div className="word-display">
            <span className="guess-label">GUESS THIS</span>
            <div className="word-letters">{gameState.hiddenWord}</div>
          </div>
          <div className="right-info">
            <div className="timer">{gameState.timeLeft}s</div>
            <div className="settings-icon">⚙️</div>
          </div>
        </div>

        {/* Canvas 20% */}
        <div className="canvas-section">
          <Canvas 
            socket={socket} 
            roomCode={room.code} 
            canDraw={gameState.isDrawing}
            currentTool={currentTool}
          />
        </div>

        {/* Tools 10% */}
        <Tools 
          socket={socket} 
          roomCode={room.code} 
          canDraw={gameState.isDrawing}
          currentTool={currentTool}
          setCurrentTool={setCurrentTool}
        />
      </div>

      {/* BOTTOM 60% */}
      <div className="bottom-section">
        <PlayerList players={updatedRoom.players} currentDrawer={gameState.drawer} myId={socket.id} />
        <Chat 
          socket={socket} 
          roomCode={room.code} 
          isDrawer={gameState.isDrawing}
          hasGuessed={gameState.hasGuessed}
        />
      </div>

      {/* FOOTER 10% */}
      <div className="footer">DEVELOPED BY HARI VURY</div>

      {showRoundEnd && <RoundEnd data={roundEndData} />}
    </div>
  );
}

// ============ MAIN APP COMPONENT ============
export default function App() {
  const [view, setView] = useState('landing');
  const [playerName, setPlayerName] = useState('');
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

  const handleCreateRoom = (name) => {
    setPlayerName(name);
    setView('create');
  };

  const handlePlay = (name) => {
    setPlayerName(name);
    setView('join-public');
  };

  const handleJoinPrivate = (name) => {
    setPlayerName(name);
    setView('join-private');
  };

  return (
    <div className="app">
      {view === 'landing' && (
        <Landing onCreateRoom={handleCreateRoom} onPlay={handlePlay} onJoinPrivate={handleJoinPrivate} />
      )}
      {view === 'create' && (
        <CreateRoom playerName={playerName} socket={socket} />
      )}
      {view === 'join-public' && (
        <JoinRoom playerName={playerName} socket={socket} isPublic={true} />
      )}
      {view === 'join-private' && (
        <JoinRoom playerName={playerName} socket={socket} isPublic={false} />
      )}
      {view === 'game' && room && (
        <GameRoom room={room} socket={socket} playerName={playerName} />
      )}
    </div>
  );
}