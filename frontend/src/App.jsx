import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001');

// ============================================
// UI COMPONENTS
// ============================================

function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-xl shadow-sm ${className}`}>{children}</div>;
}

function Button({ children, onClick, variant = 'default', className = '', disabled = false }) {
  const baseStyles = 'px-6 py-2 rounded-xl font-medium transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    default: 'bg-blue-500 text-white hover:bg-blue-600',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100'
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

function Input({ placeholder, value, onChange, onKeyDown, disabled = false, className = '' }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      disabled={disabled}
      className={`w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
    />
  );
}

function Select({ value, onChange, options, className = '' }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

// ============================================
// LANDING COMPONENT (ENHANCED)
// ============================================

const AVATAR_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

function Landing({ onCreateRoom, onPlay, onJoinPrivate }) {
  const [playerName, setPlayerName] = useState('');
  const [colorIndex, setColorIndex] = useState(0);
  const [theme, setTheme] = useState('general');
  const [language, setLanguage] = useState('en');

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col gap-6">
        
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900">Doodle Dash</h1>
        </div>

        <div className="flex gap-4">
          <Select
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'general', label: 'General' },
              { value: 'animals', label: 'Animals' },
              { value: 'food', label: 'Food' },
              { value: 'objects', label: 'Objects' },
              { value: 'nature', label: 'Nature' }
            ]}
          />
          <Select
            value={language}
            onChange={setLanguage}
            options={[
              { value: 'en', label: 'English' },
              { value: 'es', label: 'Español' }
            ]}
          />
        </div>

        <Input placeholder="Enter your name" value={playerName} onChange={setPlayerName} />

        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <Button variant="ghost" onClick={prevColor} className="text-2xl">←</Button>
            
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-sm"
              style={{ backgroundColor: currentAvatar.color }}
            >
              {currentAvatar.letter}
            </div>

            <Button variant="ghost" onClick={nextColor} className="text-2xl">→</Button>
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <Button onClick={handleCreateRoom} className="h-14">Create Room</Button>
          <Button onClick={handlePlay}>Play Public</Button>
          <Button variant="secondary" onClick={handleJoinPrivate}>Join Private</Button>
        </div>

      </div>
    </div>
  );
}

// ============ CREATE ROOM COMPONENT ============
function CreateRoom({ playerName, avatar, theme, socket }) {
  const [settings, setSettings] = useState({
    isPublic: true,
    maxPlayers: 4,
    rounds: 3,
    wordsCount: 1,
    difficulty: 'easy',
    drawTime: 80
  });

  const handleCreate = () => {
    socket.emit('createRoom', { settings: { ...settings, theme }, playerName, avatar });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-2xl font-bold mb-6">Create Room</h2>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Room Type</span>
            <Select value={settings.isPublic} onChange={(val) => setSettings({...settings, isPublic: val === 'true'})} options={[
              { value: 'true', label: 'Public' },
              { value: 'false', label: 'Private' }
            ]} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Max Players</span>
            <Select value={settings.maxPlayers} onChange={(val) => setSettings({...settings, maxPlayers: Number(val)})} options={
              [2,3,4,5,6,7,8].map(n => ({ value: n, label: n.toString() }))
            } />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Rounds</span>
            <Select value={settings.rounds} onChange={(val) => setSettings({...settings, rounds: Number(val)})} options={
              [3,5,7,9].map(n => ({ value: n, label: n.toString() }))
            } />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Draw Time (seconds)</span>
            <Select value={settings.drawTime} onChange={(val) => setSettings({...settings, drawTime: Number(val)})} options={
              [60, 75, 80, 95, 120].map(n => ({ value: n, label: `${n}s` }))
            } />
          </label>

          <Button onClick={handleCreate} className="w-full h-12">Create</Button>
        </div>
      </Card>
    </div>
  );
}

// ============ JOIN ROOM COMPONENT ============
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-2xl font-bold mb-6">{isPublic ? 'Join Public Game' : 'Join Private Game'}</h2>
        {!isPublic && (
          <Input
            placeholder="Enter 6-digit room code"
            value={roomCode}
            onChange={setRoomCode}
            className="mb-4"
          />
        )}
        <Button onClick={handleJoin} className="w-full h-12">Join</Button>
      </Card>
    </div>
  );
}

// ============================================
// CANVAS COMPONENT (ENHANCED WITH UNDO)
// ============================================

function Canvas({ socket, roomCode, canDraw, currentTool, canvasData, onUndo }) {
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
    <Card className="p-4">
      <div className="relative bg-white rounded-xl overflow-hidden shadow-sm">
        <canvas
          ref={canvasRef}
          width={800}
          height={450}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`w-full h-auto ${!canDraw ? 'cursor-not-allowed opacity-50' : 'cursor-crosshair'}`}
        />
        {!canDraw && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 text-white text-xl font-bold">
            Watch and guess!
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================
// TOOLS COMPONENT (ENHANCED WITH BRUSH SIZES)
// ============================================

const COLORS = ['#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

function Tools({ socket, roomCode, canDraw, currentTool, setCurrentTool, onUndo }) {
  const handleClear = () => {
    if (!canDraw) return;
    socket.emit('clearCanvas', { roomCode });
  };

  const handleUndo = () => {
    if (!canDraw) return;
    socket.emit('undo', { roomCode });
    onUndo();
  };

  return (
    <Card className="p-4">
      {/* Color Palette */}
      {canDraw && (
        <div className="flex gap-2 mb-4 justify-center">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setCurrentTool({...currentTool, color: c})}
              className={`w-10 h-10 rounded-lg border-2 hover:scale-105 transition-transform ${
                currentTool.color === c ? 'border-gray-900 ring-2 ring-blue-500' : 'border-gray-300'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}

      {/* Brush Sizes & Actions */}
      {canDraw && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            <Button
              variant={currentTool.size === 2 ? 'default' : 'secondary'}
              onClick={() => setCurrentTool({...currentTool, size: 2})}
              className="w-12 h-12"
            >
              S
            </Button>
            <Button
              variant={currentTool.size === 5 ? 'default' : 'secondary'}
              onClick={() => setCurrentTool({...currentTool, size: 5})}
              className="w-12 h-12"
            >
              M
            </Button>
            <Button
              variant={currentTool.size === 10 ? 'default' : 'secondary'}
              onClick={() => setCurrentTool({...currentTool, size: 10})}
              className="w-12 h-12"
            >
              L
            </Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleUndo} variant="secondary">↶ Undo</Button>
            <Button onClick={handleClear} variant="secondary">Clear</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ============ PLAYER LIST COMPONENT (ENHANCED) ============
function PlayerList({ players, currentDrawer, myId }) {
  return (
    <div className="lg:w-1/4">
      <Card className="p-4 h-full">
        <h3 className="font-bold text-gray-900 mb-4">Players</h3>
        <div className="overflow-y-auto h-[400px] lg:h-full">
          <div className="space-y-2">
            {players.map((player) => (
              <Card 
                key={player.id}
                className={`p-4 ${player.id === myId ? 'ring-2 ring-blue-500' : ''} ${player.id === currentDrawer?.id ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: player.avatar?.color || '#3b82f6' }}
                  >
                    {player.avatar?.letter || player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{player.name}</span>
                      {player.id === myId && <span className="text-xs text-blue-600">(You)</span>}
                    </div>
                    <div className="text-xs text-gray-600">{player.score || 0} pts</div>
                  </div>
                  {player.rank <= 3 && (
                    <div className="text-lg">
                      {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : '🥉'}
                    </div>
                  )}
                </div>
                {player.id === currentDrawer?.id && (
                  <div className="mt-2 text-xs text-blue-600 animate-bounce">Drawing now...</div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============ CHAT COMPONENT (ENHANCED) ============
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
    if (!input.trim() || isDrawer) return;
    socket.emit('guess', { roomCode, guess: input });
    setInput('');
  };

  return (
    <div className="lg:w-1/5">
      <Card className="p-4 h-[500px] lg:h-full flex flex-col">
        <h3 className="font-bold text-gray-900 mb-4">Chat</h3>
        <div className="flex-1 overflow-y-auto mb-4">
          <div className="space-y-2">
            {messages.map((msg, i) => (
              <div key={i} className={`text-sm ${msg.isSystem ? 'text-green-600 font-medium' : 'text-gray-900'}`}>
                {!msg.isSystem && <span className="font-bold">{msg.player}: </span>}
                <span>{msg.message}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Input
            placeholder={isDrawer ? "You're drawing!" : "Type your guess..."}
            value={input}
            onChange={setInput}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isDrawer}
          />
          <Button onClick={handleSend} disabled={isDrawer}>Send</Button>
        </div>
      </Card>
    </div>
  );
}

// ============ ROUND END COMPONENT ============
function RoundEnd({ data }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="p-8 max-w-md">
        <h3 className="text-2xl font-bold mb-4">Round Complete! 🎉</h3>
        <div className="space-y-2">
          {data.guessOrder.map((guess, i) => (
            <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span>{i + 1}. {guess.name}</span>
              <span className="font-bold text-blue-600">+{data.scores[guess.playerId]} pts</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============ GAME ROOM COMPONENT (ENHANCED) ============
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
  const [canvasData, setCanvasData] = useState([]);

  useEffect(() => {
    socket.on('gameStarted', ({ room }) => {
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
    alert('Room code copied!');
  };

  if (showGameEnd) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full">
          <h2 className="text-3xl font-bold mb-6 text-center">Game Over! 🎮</h2>
          <div className="space-y-3">
            {finalScores.map((player) => (
              <div key={player.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : `#${player.rank}`}
                  </span>
                  <span className="font-medium">{player.name}</span>
                </div>
                <span className="font-bold text-lg">{player.score} pts</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (showWordSelection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full">
          <h3 className="text-2xl font-bold mb-6 text-center">Choose a word:</h3>
          <div className="flex flex-col gap-3">
            {wordChoices.map(word => (
              <Button key={word} onClick={() => handleWordSelect(word)} className="h-14 text-lg">
                {word}
              </Button>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (!gameState.started) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-2xl w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Room: {room.code}</h2>
            <Button variant="ghost" onClick={handleCopyRoomLink}>Copy Code</Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-xl">
              <span className="text-sm text-gray-600">Type</span>
              <p className="font-medium">{room.isPublic ? 'Public' : 'Private'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <span className="text-sm text-gray-600">Players</span>
              <p className="font-medium">{updatedRoom.players.length}/{room.maxPlayers}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <span className="text-sm text-gray-600">Rounds</span>
              <p className="font-medium">{room.rounds}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <span className="text-sm text-gray-600">Draw Time</span>
              <p className="font-medium">{room.drawTime}s</p>
            </div>
          </div>

          <div className="space-y-2 mb-6">
            {updatedRoom.players.map((player) => (
              <div key={player.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: player.avatar?.color || '#3b82f6' }}
                >
                  {player.avatar?.letter || player.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium">{player.name}</span>
                {player.id === socket.id && <span className="text-xs text-blue-600">(You)</span>}
              </div>
            ))}
          </div>

          {room.host === socket.id && updatedRoom.players.length >= 2 && (
            <Button onClick={handleStartGame} className="w-full h-14">Start Game</Button>
          )}
          {room.host !== socket.id && (
            <div className="text-center text-gray-600">Waiting for host to start...</div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Round {gameState.currentRound}/{gameState.totalRounds}</span>
          <span className="text-sm font-medium text-gray-900">Room: {room.code}</span>
          <Button variant="ghost" onClick={handleCopyRoomLink} className="text-xs">Copy Code</Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">{gameState.hiddenWord}</div>
          <div className={`text-lg font-bold ${gameState.timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-gray-900'}`}>
            {gameState.timeLeft}s
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4">
        
        <PlayerList players={updatedRoom.players} currentDrawer={gameState.drawer} myId={socket.id} />

        <div className="lg:flex-1 flex flex-col gap-4">
          <Canvas
            socket={socket}
            roomCode={room.code}
            canDraw={gameState.isDrawing}
            currentTool={currentTool}
            canvasData={canvasData}
            onUndo={() => setCanvasData(prev => prev.slice(0, -1))}
          />
          
          <Tools
            socket={socket}
            roomCode={room.code}
            canDraw={gameState.isDrawing}
            currentTool={currentTool}
            setCurrentTool={setCurrentTool}
            onUndo={() => setCanvasData(prev => prev.slice(0, -1))}
          />
        </div>

        <Chat
          socket={socket}
          roomCode={room.code}
          isDrawer={gameState.isDrawing}
          hasGuessed={gameState.hasGuessed}
        />

      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white text-center py-3 text-sm">DEVELOPED BY HARI VURY</div>

      {showRoundEnd && <RoundEnd data={roundEndData} />}
    </div>
  );
}

// ============ MAIN APP COMPONENT ============
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