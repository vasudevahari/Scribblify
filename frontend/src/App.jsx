import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [wordLength, setWordLength] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [messages, setMessages] = useState([]);
  const [guessInput, setGuessInput] = useState('');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  
  const socketRef = useRef();
  const canvasRef = useRef();
  const ctxRef = useRef();
  const drawingRef = useRef(false);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    
    socketRef.current.on('room-created', ({ code, players }) => {
      setRoomCode(code);
      setPlayers(players);
      setIsHost(true);
      setScreen('lobby');
    });

    socketRef.current.on('player-joined', setPlayers);
    socketRef.current.on('player-left', setPlayers);
    
    socketRef.current.on('game-started', () => setScreen('game'));
    
    socketRef.current.on('round-start', ({ drawer, wordLength, time }) => {
      setIsDrawing(socketRef.current.id === drawer);
      setWordLength(wordLength);
      setTimeLeft(time);
      setCurrentWord('');
      setMessages([]);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    socketRef.current.on('word', setCurrentWord);
    socketRef.current.on('time-update', setTimeLeft);
    
    socketRef.current.on('round-end', ({ word }) => {
      setCurrentWord(word);
      setIsDrawing(false);
    });

    socketRef.current.on('draw', (data) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(data.x0, data.y0);
      ctx.lineTo(data.x1, data.y1);
      ctx.stroke();
    });

    socketRef.current.on('clear-canvas', () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    socketRef.current.on('chat-message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    socketRef.current.on('correct-guess', ({ username, players }) => {
      setMessages(prev => [...prev, { username: 'System', message: `${username} guessed correctly!` }]);
      setPlayers(players);
    });

    socketRef.current.on('error', (msg) => alert(msg));

    return () => socketRef.current.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctxRef.current = canvas.getContext('2d');
  }, [screen]);

  const createRoom = () => {
    if (!username.trim()) return;
    socketRef.current.emit('create-room', username.trim());
  };

  const joinRoom = () => {
    if (!username.trim() || !roomCode.trim()) return;
    socketRef.current.emit('join-room', { code: roomCode.trim().toUpperCase(), username: username.trim() });
    setScreen('lobby');
  };

  const startGame = () => {
    socketRef.current.emit('start-game', roomCode);
  };

  const startDrawing = (e) => {
    if (!isDrawing) return;
    drawingRef.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
  };

  const draw = (e) => {
    if (!drawingRef.current || !isDrawing) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const x1 = (e.clientX || e.touches[0].clientX) - rect.left;
    const y1 = (e.clientY || e.touches[0].clientY) - rect.top;
    
    const x0 = ctxRef.current.lastX || x1;
    const y0 = ctxRef.current.lastY || y1;
    
    ctxRef.current.strokeStyle = color;
    ctxRef.current.lineWidth = brushSize;
    ctxRef.current.lineCap = 'round';
    ctxRef.current.lineTo(x1, y1);
    ctxRef.current.stroke();
    
    socketRef.current.emit('draw', { code: roomCode, data: { x0, y0, x1, y1, color, size: brushSize } });
    
    ctxRef.current.lastX = x1;
    ctxRef.current.lastY = y1;
  };

  const stopDrawing = () => {
    drawingRef.current = false;
    if (ctxRef.current) {
      ctxRef.current.lastX = null;
      ctxRef.current.lastY = null;
    }
  };

  const clearCanvas = () => {
    const ctx = ctxRef.current;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    socketRef.current.emit('clear-canvas', roomCode);
  };

  const sendGuess = (e) => {
    e.preventDefault();
    if (!guessInput.trim()) return;
    socketRef.current.emit('guess', { code: roomCode, message: guessInput.trim() });
    setGuessInput('');
  };

  if (screen === 'home') {
    return (
      <div className="container">
        <h1>Skribbl Clone</h1>
        <input 
          placeholder="Enter username" 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button onClick={createRoom}>Create Room</button>
        <input 
          placeholder="Room code" 
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
        />
        <button onClick={joinRoom}>Join Room</button>
      </div>
    );
  }

  if (screen === 'lobby') {
    return (
      <div className="container">
        <h1>Room: {roomCode}</h1>
        <h2>Players</h2>
        <ul>
          {players.map(p => <li key={p.id}>{p.username}</li>)}
        </ul>
        {isHost && <button onClick={startGame}>Start Game</button>}
      </div>
    );
  }

  return (
    <div className="game">
      <div className="header">
        <div>Time: {timeLeft}s</div>
        <div>
          {isDrawing ? `Draw: ${currentWord}` : `Guess: ${'_ '.repeat(wordLength)}`}
        </div>
      </div>
      
      <div className="main">
        <div className="sidebar">
          <h3>Players</h3>
          {players.map(p => (
            <div key={p.id}>{p.username}: {p.score}</div>
          ))}
        </div>

        <div className="canvas-area">
          {isDrawing && (
            <div className="tools">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
              <input 
                type="range" 
                min="1" 
                max="20" 
                value={brushSize} 
                onChange={(e) => setBrushSize(e.target.value)}
              />
              <button onClick={clearCanvas}>Clear</button>
            </div>
          )}
          <canvas 
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        <div className="chat">
          <div className="messages">
            {messages.map((m, i) => (
              <div key={i}><strong>{m.username}:</strong> {m.message}</div>
            ))}
          </div>
          {!isDrawing && (
            <form onSubmit={sendGuess}>
              <input 
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                placeholder="Type your guess..."
              />
              <button type="submit">Send</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}