import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  Flame, 
  RotateCcw, 
  Pause, 
  Play, 
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Zap,
  Gauge,
  Home,
  Terminal,
  AlertTriangle
} from 'lucide-react';
import { 
  Point, 
  Direction, 
  GameStatus, 
  Difficulty, 
  FoodItem, 
  Particle, 
  ScorePopup 
} from '../types/game';
import { MusicTrack } from '../types/music';
import { audioEngine } from '../services/audioEngine';
import { saveHighScore } from '../services/storage';

interface SnakeGameProps {
  currentTrack: MusicTrack;
  isMusicPlaying: boolean;
  highScore: number;
  onHighScoreUpdate: () => void;
  difficulty: Difficulty;
  onDifficultyChange: (d: Difficulty) => void;
  customSpeedMs: number;
  onCustomSpeedChange: (speed: number) => void;
}

const GRID_SIZE = 20;

export const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { label: string; speedMs: number; speedLabel: string; desc: string; keyHint: string }
> = {
  chill: {
    label: 'CHILL',
    speedMs: 145,
    speedLabel: '145MS',
    desc: 'LOW CLOCK RATE // RELAXED',
    keyHint: '1'
  },
  normal: {
    label: 'NORMAL',
    speedMs: 105,
    speedLabel: '105MS',
    desc: 'STANDARD OPERATIONAL CLOCK',
    keyHint: '2'
  },
  overdrive: {
    label: 'WARP',
    speedMs: 72,
    speedLabel: '72MS',
    desc: 'OVERCLOCKED NEURAL BUFFER',
    keyHint: '3'
  },
  custom: {
    label: 'CUSTOM',
    speedMs: 90,
    speedLabel: 'VAR',
    desc: 'MANUAL VELOCITY OVERRIDE',
    keyHint: '4'
  }
};

const getTickInterval = (diff: Difficulty, customMs: number): number => {
  if (diff === 'chill') return 145;
  if (diff === 'normal') return 105;
  if (diff === 'overdrive') return 72;
  return Math.max(35, Math.min(260, customMs));
};

export const SnakeGame: React.FC<SnakeGameProps> = ({
  currentTrack,
  isMusicPlaying,
  highScore,
  onHighScoreUpdate,
  difficulty,
  onDifficultyChange,
  customSpeedMs,
  onCustomSpeedChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game state
  const [status, setStatus] = useState<GameStatus>('IDLE');
  const [score, setScore] = useState(0);
  const [foodCount, setFoodCount] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [glitchFlash, setGlitchFlash] = useState(false);

  // References for the loop to avoid closure staleness
  const snakeRef = useRef<Point[]>([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ]);
  const directionRef = useRef<Direction>('RIGHT');
  const nextDirectionRef = useRef<Direction>('RIGHT');
  const foodRef = useRef<FoodItem | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const popupsRef = useRef<ScorePopup[]>([]);
  const gameLoopTimerRef = useRef<number | null>(null);
  const renderLoopRef = useRef<number | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  // Trigger brief screen glitch effect
  const triggerGlitch = useCallback(() => {
    setGlitchFlash(true);
    setTimeout(() => setGlitchFlash(false), 120);
  }, []);

  // Spawn random food (Regular Data Packet or Quantum Corrupted Packet)
  const spawnFood = useCallback((currentSnake: Point[]) => {
    const occupied = new Set(currentSnake.map((p) => `${p.x},${p.y}`));
    const available: Point[] = [];

    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        if (!occupied.has(`${x},${y}`)) {
          available.push({ x, y });
        }
      }
    }

    if (available.length === 0) return null;

    const spot = available[Math.floor(Math.random() * available.length)];
    // ~28% chance of high-value corrupted packet
    const isQuantum = Math.random() < 0.28;

    const item: FoodItem = {
      x: spot.x,
      y: spot.y,
      type: isQuantum ? 'quantum' : 'energy',
      points: isQuantum ? 40 : 10,
      expiresAt: isQuantum ? Date.now() + 8000 : undefined,
      color: isQuantum ? '#ff007f' : '#00f0ff'
    };

    return item;
  }, []);

  // Particle emission helper with harsh cyan/magenta glitch debris
  const emitParticles = (x: number, y: number, color: string, count = 16) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cellSize = canvas.width / GRID_SIZE;
    const px = (x + 0.5) * cellSize;
    const py = (y + 0.5) * cellSize;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = 2 + Math.random() * 4;
      const isAlt = i % 2 === 0;
      particlesRef.current.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color: isAlt ? '#00f0ff' : '#ff007f',
        alpha: 1,
        life: 0,
        maxLife: 18 + Math.floor(Math.random() * 12)
      });
    }
  };

  // Score popup helper in raw pixel monospace style
  const addScorePopup = (x: number, y: number, text: string, color: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cellSize = canvas.width / GRID_SIZE;
    popupsRef.current.push({
      id: Math.random().toString(),
      x: (x + 0.5) * cellSize,
      y: (y + 0.5) * cellSize,
      dy: 0,
      text,
      color,
      alpha: 1
    });
  };

  // End Game (Collision detected)
  const gameOver = useCallback(() => {
    if (gameLoopTimerRef.current !== null) {
      window.clearInterval(gameLoopTimerRef.current);
      gameLoopTimerRef.current = null;
    }

    setStatus('GAME_OVER');
    triggerGlitch();
    audioEngine.playGameOverSound();

    const currentScore = score;
    const isNew = currentScore > highScore && currentScore > 0;
    setIsNewRecord(isNew);

    if (isNew) {
      confetti({
        particleCount: 50,
        spread: 60,
        colors: ['#00f0ff', '#ff007f', '#ffffff']
      });
    }

    // Save score in local storage
    if (currentScore > 0) {
      saveHighScore(
        currentScore,
        foodCount,
        snakeRef.current.length,
        difficulty,
        currentTrack.title,
        difficulty === 'custom' ? customSpeedMs : undefined
      );
      onHighScoreUpdate();
    }
  }, [
    score, 
    highScore, 
    foodCount, 
    difficulty, 
    customSpeedMs, 
    currentTrack.title, 
    onHighScoreUpdate, 
    triggerGlitch
  ]);

  // Main game physics tick
  const gameTick = useCallback(() => {
    directionRef.current = nextDirectionRef.current;
    const dir = directionRef.current;
    const head = { ...snakeRef.current[0] };

    switch (dir) {
      case 'UP':
        head.y -= 1;
        break;
      case 'DOWN':
        head.y += 1;
        break;
      case 'LEFT':
        head.x -= 1;
        break;
      case 'RIGHT':
        head.x += 1;
        break;
    }

    // Wall collision check
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      gameOver();
      return;
    }

    // Self collision check
    for (let i = 0; i < snakeRef.current.length; i++) {
      const seg = snakeRef.current[i];
      if (head.x === seg.x && head.y === seg.y) {
        gameOver();
        return;
      }
    }

    // Move snake
    const newSnake = [head, ...snakeRef.current];
    const food = foodRef.current;

    // Check if food was eaten
    if (food && head.x === food.x && head.y === food.y) {
      const isQuantum = food.type === 'quantum';
      const pts = food.points;

      audioEngine.playEatSound(isQuantum);
      triggerGlitch();
      emitParticles(head.x, head.y, isQuantum ? '#ff007f' : '#00f0ff', isQuantum ? 22 : 14);
      addScorePopup(head.x, head.y, `+${pts}`, isQuantum ? '#ff007f' : '#00f0ff');

      setScore((prev) => prev + pts);
      setFoodCount((prev) => prev + 1);

      foodRef.current = spawnFood(newSnake);
    } else {
      // Normal movement: pop tail
      newSnake.pop();
    }

    // Expire quantum food if time elapsed
    if (foodRef.current && foodRef.current.expiresAt && Date.now() > foodRef.current.expiresAt) {
      foodRef.current = spawnFood(newSnake);
    }

    snakeRef.current = newSnake;
  }, [gameOver, spawnFood, triggerGlitch]);

  // Start / restart game
  const startGame = useCallback(() => {
    audioEngine.playClickSound();
    triggerGlitch();

    // Reset snake
    const startSnake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    snakeRef.current = startSnake;
    directionRef.current = 'RIGHT';
    nextDirectionRef.current = 'RIGHT';
    particlesRef.current = [];
    popupsRef.current = [];

    setScore(0);
    setFoodCount(0);
    setIsNewRecord(false);
    setStatus('PLAYING');

    foodRef.current = spawnFood(startSnake);

    if (gameLoopTimerRef.current !== null) {
      window.clearInterval(gameLoopTimerRef.current);
    }

    const interval = getTickInterval(difficulty, customSpeedMs);
    gameLoopTimerRef.current = window.setInterval(gameTick, interval);
  }, [difficulty, customSpeedMs, gameTick, spawnFood, triggerGlitch]);

  // Pause / Resume toggle
  const togglePause = useCallback(() => {
    audioEngine.playClickSound();
    if (status === 'PLAYING') {
      setStatus('PAUSED');
      if (gameLoopTimerRef.current !== null) {
        window.clearInterval(gameLoopTimerRef.current);
        gameLoopTimerRef.current = null;
      }
    } else if (status === 'PAUSED') {
      setStatus('PLAYING');
      const interval = getTickInterval(difficulty, customSpeedMs);
      gameLoopTimerRef.current = window.setInterval(gameTick, interval);
    }
  }, [status, difficulty, customSpeedMs, gameTick]);

  // Direction Change Handler with anti-reversal lock
  const changeDirection = useCallback(
    (newDir: Direction) => {
      if (status !== 'PLAYING') return;

      const current = directionRef.current;
      if (
        (newDir === 'UP' && current === 'DOWN') ||
        (newDir === 'DOWN' && current === 'UP') ||
        (newDir === 'LEFT' && current === 'RIGHT') ||
        (newDir === 'RIGHT' && current === 'LEFT')
      ) {
        return;
      }

      nextDirectionRef.current = newDir;
    },
    [status]
  );

  // Keyboard navigation & hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling on arrows/space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === ' ' || e.code === 'Space') {
        if (status === 'PLAYING' || status === 'PAUSED') {
          togglePause();
        } else if (status === 'IDLE' || status === 'GAME_OVER') {
          startGame();
        }
        return;
      }

      if (e.key === 'Enter') {
        if (status === 'IDLE' || status === 'GAME_OVER') {
          startGame();
        }
        return;
      }

      if (e.key === 'Escape') {
        if (status === 'GAME_OVER' || status === 'PAUSED') {
          setStatus('IDLE');
        }
        return;
      }

      // Hotkeys for difficulty when NOT playing
      if (status === 'IDLE' || status === 'GAME_OVER') {
        if (e.key === '1') {
          audioEngine.playClickSound();
          onDifficultyChange('chill');
          return;
        }
        if (e.key === '2') {
          audioEngine.playClickSound();
          onDifficultyChange('normal');
          return;
        }
        if (e.key === '3') {
          audioEngine.playClickSound();
          onDifficultyChange('overdrive');
          return;
        }
        if (e.key === '4') {
          audioEngine.playClickSound();
          onDifficultyChange('custom');
          return;
        }
        if (e.key === '-' || e.key === '_') {
          audioEngine.playClickSound();
          onCustomSpeedChange(Math.min(240, customSpeedMs + 5));
          return;
        }
        if (e.key === '=' || e.key === '+') {
          audioEngine.playClickSound();
          onCustomSpeedChange(Math.max(40, customSpeedMs - 5));
          return;
        }
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          changeDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          changeDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          changeDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          changeDirection('RIGHT');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    status, 
    changeDirection, 
    startGame, 
    togglePause, 
    onDifficultyChange, 
    onCustomSpeedChange, 
    customSpeedMs
  ]);

  // Touch Swipe Handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) > 20) {
      if (absX > absY) {
        changeDirection(dx > 0 ? 'RIGHT' : 'LEFT');
      } else {
        changeDirection(dy > 0 ? 'DOWN' : 'UP');
      }
    }
    touchStartPos.current = null;
  };

  // Re-sync game loop timer if difficulty / speed changes during active run
  useEffect(() => {
    if (status === 'PLAYING') {
      if (gameLoopTimerRef.current !== null) {
        window.clearInterval(gameLoopTimerRef.current);
      }
      const interval = getTickInterval(difficulty, customSpeedMs);
      gameLoopTimerRef.current = window.setInterval(gameTick, interval);
    }
  }, [difficulty, customSpeedMs, status, gameTick]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (gameLoopTimerRef.current !== null) {
        window.clearInterval(gameLoopTimerRef.current);
      }
      if (renderLoopRef.current !== null) {
        cancelAnimationFrame(renderLoopRef.current);
      }
    };
  }, []);

  // GLITCH ART CANVAS RENDER LOOP
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cellSize = width / GRID_SIZE;

      // 1. Deep Void Matrix Background with Cyan Grid Lines
      ctx.fillStyle = '#030007';
      ctx.fillRect(0, 0, width, height);

      // Subtle cyan grid lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID_SIZE; i++) {
        const pos = i * cellSize;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(width, pos);
        ctx.stroke();
      }

      // Random glitch scan-line artifact across canvas
      if (Math.random() < 0.1) {
        const gy = Math.random() * height;
        ctx.fillStyle = 'rgba(255, 0, 127, 0.15)';
        ctx.fillRect(0, gy, width, 2 + Math.random() * 4);
      }

      // 2. Render Food Item with Glitch Chromatic Aberration
      const food = foodRef.current;
      if (food) {
        const fx = food.x * cellSize;
        const fy = food.y * cellSize;
        const now = Date.now();
        const isQuantum = food.type === 'quantum';

        ctx.save();
        if (isQuantum) {
          // Corrupted Quantum Packet: Rapid alternating Cyan/Magenta flicker
          const pulse = (Math.sin(now * 0.015) + 1) / 2;
          const glitchX = (Math.random() - 0.5) * 2;
          const glitchY = (Math.random() - 0.5) * 2;

          // Magenta shadow box
          ctx.fillStyle = '#ff007f';
          ctx.fillRect(fx + 2 + glitchX, fy + 2 + glitchY, cellSize - 4, cellSize - 4);

          // Cyan core box
          ctx.fillStyle = '#00f0ff';
          ctx.fillRect(fx + 4, fy + 4, cellSize - 8, cellSize - 8);

          // White center pixel
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(fx + cellSize / 2 - 2, fy + cellSize / 2 - 2, 4, 4);

          // Glitch aura ring
          ctx.strokeStyle = pulse > 0.5 ? '#ff007f' : '#00f0ff';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(fx + 1, fy + 1, cellSize - 2, cellSize - 2);
        } else {
          // Standard Data Packet: Sharp Cyan crystal with Magenta edge
          ctx.fillStyle = '#ff007f';
          ctx.fillRect(fx + 3, fy + 3, cellSize - 6, cellSize - 6);

          ctx.fillStyle = '#00f0ff';
          ctx.fillRect(fx + 2, fy + 2, cellSize - 6, cellSize - 6);

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(fx + 5, fy + 5, 3, 3);
        }
        ctx.restore();
      }

      // 3. Render Snake with Raw Pixel Brutalism & Optic Sensors
      const snake = snakeRef.current;
      for (let i = snake.length - 1; i >= 0; i--) {
        const seg = snake[i];
        const sx = seg.x * cellSize;
        const sy = seg.y * cellSize;
        const isHead = i === 0;

        ctx.save();

        if (isHead) {
          // Snake Head: Chromatic RGB split glitch block
          ctx.fillStyle = '#ff007f';
          ctx.fillRect(sx + 2, sy + 2, cellSize - 2, cellSize - 2);

          ctx.fillStyle = '#00f0ff';
          ctx.fillRect(sx + 1, sy + 1, cellSize - 2, cellSize - 2);

          // Hard black inner face
          ctx.fillStyle = '#05000a';
          ctx.fillRect(sx + 3, sy + 3, cellSize - 6, cellSize - 6);

          // Optic eye sensors based on direction
          const dir = directionRef.current;
          let eye1 = { x: sx + 4, y: sy + 4 };
          let eye2 = { x: sx + cellSize - 7, y: sy + 4 };

          if (dir === 'DOWN') {
            eye1 = { x: sx + 4, y: sy + cellSize - 7 };
            eye2 = { x: sx + cellSize - 7, y: sy + cellSize - 7 };
          } else if (dir === 'LEFT') {
            eye1 = { x: sx + 4, y: sy + 4 };
            eye2 = { x: sx + 4, y: sy + cellSize - 7 };
          } else if (dir === 'RIGHT') {
            eye1 = { x: sx + cellSize - 7, y: sy + 4 };
            eye2 = { x: sx + cellSize - 7, y: sy + cellSize - 7 };
          }

          ctx.fillStyle = '#ff007f';
          ctx.fillRect(eye1.x, eye1.y, 3, 3);
          ctx.fillRect(eye2.x, eye2.y, 3, 3);
        } else {
          // Body Segments: Raw pixel blocks with alternating cyan / magenta accents
          const isAlt = i % 2 === 0;
          ctx.fillStyle = isAlt ? '#00f0ff' : '#00b4d8';
          ctx.fillRect(sx + 1.5, sy + 1.5, cellSize - 3, cellSize - 3);

          // Core circuitry dot
          ctx.fillStyle = isAlt ? '#ff007f' : '#05000a';
          ctx.fillRect(sx + cellSize / 2 - 1.5, sy + cellSize / 2 - 1.5, 3, 3);
        }

        ctx.restore();
      }

      // 4. Update & Render Glitch Debris Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.restore();

        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1);
        }
      }

      // 5. Update & Render Score Popups in Pixel Monospace
      for (let i = popupsRef.current.length - 1; i >= 0; i--) {
        const pop = popupsRef.current[i];
        pop.dy -= 0.9;
        pop.alpha -= 0.03;

        ctx.save();
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.fillStyle = pop.color;
        ctx.globalAlpha = Math.max(0, pop.alpha);
        ctx.textAlign = 'center';
        // Chromatic split on popup
        ctx.fillText(pop.text, pop.x + 1, pop.y + pop.dy + 1);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(pop.text, pop.x, pop.y + pop.dy);
        ctx.restore();

        if (pop.alpha <= 0) {
          popupsRef.current.splice(i, 1);
        }
      }

      renderLoopRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (renderLoopRef.current !== null) {
        cancelAnimationFrame(renderLoopRef.current);
      }
    };
  }, [currentTrack]);

  return (
    <div className="flex flex-col items-center w-full max-w-[480px] mx-auto select-none">
      {/* Top HUD: Score, High Score, Velocity */}
      <div className="w-full flex items-center justify-between px-3 py-2 mb-3 bg-[#06000e] border-2 border-[#00f0ff] shadow-[3px_3px_0_#ff007f]">
        {/* Score Telemetry */}
        <div className="flex items-center gap-2">
          <div className="p-1 bg-[#ff007f] text-black">
            <Flame className="w-3.5 h-3.5 fill-current animate-pulse" />
          </div>
          <div>
            <p className="text-[9px] uppercase font-pixel tracking-wider text-[#00f0ff]">SCORE</p>
            <p className="text-base sm:text-lg font-pixel text-white tabular-nums">
              {score.toString().padStart(4, '0')}
            </p>
          </div>
        </div>

        {/* Velocity / Difficulty Quick Toggle */}
        <button
          type="button"
          onClick={() => {
            if (status !== 'PLAYING') {
              const order: Difficulty[] = ['chill', 'normal', 'overdrive', 'custom'];
              const nextIdx = (order.indexOf(difficulty) + 1) % order.length;
              audioEngine.playClickSound();
              onDifficultyChange(order[nextIdx]);
            }
          }}
          disabled={status === 'PLAYING'}
          className={`px-2 py-1 text-[9px] font-pixel border-2 transition-all flex items-center gap-1.5 ${
            status === 'PLAYING'
              ? 'bg-[#0a0014] border-[#00f0ff]/40 text-[#00f0ff]/60 cursor-default'
              : 'bg-[#0a0014] border-[#ff007f] text-[#ff007f] hover:bg-[#ff007f] hover:text-black cursor-pointer shadow-[2px_2px_0_#00f0ff]'
          }`}
          title={status === 'PLAYING' ? `Clock Rate: ${difficulty === 'custom' ? `${customSpeedMs}MS` : difficulty}` : `Cycle Clock Rate (${difficulty === 'custom' ? `${customSpeedMs}MS` : difficulty})`}
        >
          <Gauge className="w-3 h-3 text-[#00f0ff]" />
          <span>{difficulty === 'custom' ? `${customSpeedMs}MS` : difficulty.toUpperCase()}</span>
        </button>

        {/* Best Record */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-[9px] uppercase font-pixel tracking-wider text-[#ff007f]">PEAK</p>
            <p className="text-base sm:text-lg font-pixel text-[#00f0ff] tabular-nums">
              {Math.max(score, highScore).toString().padStart(4, '0')}
            </p>
          </div>
          <div className="p-1 bg-[#00f0ff] text-black">
            <Trophy className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* In-Game Pause Toggle */}
        <div className="flex items-center ml-1">
          {status === 'PLAYING' && (
            <button
              onClick={togglePause}
              className="p-1.5 bg-[#05000a] text-[#ff007f] hover:bg-[#ff007f] hover:text-black border-2 border-[#ff007f] shadow-[2px_2px_0_#00f0ff] transition-all cursor-pointer"
              title="Halt Thread (Space)"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          )}
          {status === 'PAUSED' && (
            <button
              onClick={togglePause}
              className="p-1.5 bg-[#00f0ff] text-black border-2 border-[#ff007f] shadow-[2px_2px_0_#ff007f] transition-all cursor-pointer font-bold"
              title="Resume Thread (Space)"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Container with Screen Tear Glitch Effect */}
      <div 
        className={`relative w-full aspect-square border-2 border-[#00f0ff] shadow-[5px_5px_0_#ff007f] bg-[#030007] overflow-hidden ${
          glitchFlash ? 'animate-screen-tear' : ''
        }`}
      >
        {/* CRT Scanline Beam & Noise */}
        <div className="scanline-beam opacity-40" />
        <div className="absolute inset-0 crt-overlay pointer-events-none z-10 opacity-70" />

        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="w-full h-full block cursor-crosshair touch-none"
        />

        {/* Start Game Overlay: Cryptic Machine Terminal */}
        {status === 'IDLE' && (
          <div className="absolute inset-0 z-20 bg-[#04000acc] backdrop-blur-[2px] flex flex-col items-center justify-center p-4 sm:p-6 text-center">
            {/* System Protocol Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#090017] border border-[#ff007f] text-[#ff007f] text-[9px] font-pixel mb-2">
              <Terminal className="w-3 h-3 text-[#00f0ff]" />
              <span>PROTOCOL://0xVIPER.INIT</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-pixel text-[#00f0ff] glitch-text mb-2 tracking-wider">
              SECTOR://VIPER
            </h2>

            <p className="text-xs font-terminal text-slate-300 max-w-xs mb-3 tracking-widest leading-relaxed">
              ASSIMILATE DATA PACKETS. MAINTAIN OPERATIONAL INTEGRITY. SYNTHESIZED DSP AUDIO ACTIVE.
            </p>

            {/* Velocity / Difficulty Selector */}
            <div className="w-full max-w-xs mb-3">
              <div className="flex items-center justify-between text-[9px] font-pixel text-[#00f0ff] mb-1.5 px-0.5">
                <span className="flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-[#ff007f]" />
                  <span>CLOCK_RATE:</span>
                </span>
                <span className="text-[#ff007f] font-bold">
                  {difficulty === 'custom' ? `${customSpeedMs}MS` : difficulty.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1 p-1 bg-[#090017] border border-[#00f0ff]">
                {(['chill', 'normal', 'overdrive', 'custom'] as Difficulty[]).map((d) => {
                  const cfg = DIFFICULTY_CONFIG[d];
                  const isSelected = difficulty === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        audioEngine.playClickSound();
                        onDifficultyChange(d);
                      }}
                      className={`flex flex-col items-center py-1.5 px-0.5 border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#00f0ff] text-black border-[#ff007f] font-bold shadow-[2px_2px_0_#ff007f]'
                          : 'bg-[#04000a] text-[#00f0ff] border-[#00f0ff]/30 hover:border-[#ff007f]'
                      }`}
                    >
                      <span className="text-[9px] font-pixel">{cfg.label}</span>
                      <span className={`text-[8px] font-terminal mt-0.5 ${isSelected ? 'text-black font-bold' : 'text-[#ff007f]'}`}>
                        {d === 'custom' ? `${customSpeedMs}MS` : cfg.speedLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Speed Slider with Monospace Telemetry */}
              {difficulty === 'custom' && (
                <div className="w-full bg-[#080014] border border-[#ff007f] p-2 mt-2 text-left space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-terminal text-[#00f0ff]">
                    <span>TICK_RATE: <strong className="text-[#ff007f] font-pixel text-[10px]">{customSpeedMs}MS</strong></span>
                    <span className="text-white/70">{(1000 / customSpeedMs).toFixed(1)} OPS/SEC</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        audioEngine.playClickSound();
                        onCustomSpeedChange(Math.min(240, customSpeedMs + 5));
                      }}
                      className="w-6 h-6 bg-[#04000a] hover:bg-[#ff007f] hover:text-black text-[#00f0ff] border border-[#00f0ff] font-pixel text-xs flex items-center justify-center cursor-pointer"
                      title="Decelerate (+5ms)"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min="40"
                      max="240"
                      step="5"
                      value={customSpeedMs}
                      onChange={(e) => onCustomSpeedChange(parseInt(e.target.value, 10))}
                      className="flex-1 h-2 bg-[#04000a] border border-[#00f0ff] appearance-none cursor-pointer accent-[#ff007f]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        audioEngine.playClickSound();
                        onCustomSpeedChange(Math.max(40, customSpeedMs - 5));
                      }}
                      className="w-6 h-6 bg-[#04000a] hover:bg-[#ff007f] hover:text-black text-[#00f0ff] border border-[#00f0ff] font-pixel text-xs flex items-center justify-center cursor-pointer"
                      title="Accelerate (-5ms)"
                    >
                      +
                    </button>
                  </div>

                  {/* Preset Rates */}
                  <div className="grid grid-cols-4 gap-1 pt-0.5">
                    {[
                      { label: 'EXTR', ms: 50 },
                      { label: 'TURB', ms: 75 },
                      { label: 'NORM', ms: 105 },
                      { label: 'CALM', ms: 150 }
                    ].map((p) => (
                      <button
                        key={p.ms}
                        type="button"
                        onClick={() => {
                          audioEngine.playClickSound();
                          onCustomSpeedChange(p.ms);
                        }}
                        className={`py-0.5 text-[8px] font-pixel border cursor-pointer ${
                          customSpeedMs === p.ms
                            ? 'bg-[#ff007f] text-black border-[#00f0ff] font-bold'
                            : 'bg-[#04000a] text-[#00f0ff]/80 border-[#00f0ff]/40 hover:border-[#ff007f]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Execute Vector Start Button */}
            <button
              onClick={startGame}
              className="glitch-btn px-6 py-2.5 text-xs text-black flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>[ EXECUTE_VECTOR ]</span>
            </button>

            <p className="text-xs font-terminal text-[#00f0ff]/80 mt-2.5 tracking-widest">
              INPUT: [SPACE] OR [ENTER] TO INITIALIZE
            </p>
          </div>
        )}

        {/* Paused Overlay */}
        {status === 'PAUSED' && (
          <div className="absolute inset-0 z-20 bg-[#04000acc] backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
            <div className="p-3 bg-[#080014] border-2 border-[#ff007f] text-[#00f0ff] shadow-[3px_3px_0_#00f0ff] mb-3 animate-pulse">
              <Pause className="w-6 h-6 text-[#ff007f]" />
            </div>

            <h3 className="text-lg sm:text-xl font-pixel text-[#00f0ff] glitch-text mb-2">
              PROCESS_HALT
            </h3>

            <p className="text-xs font-terminal text-slate-300 max-w-xs mb-4 tracking-widest">
              EXECUTION THREAD FROZEN. BUFFER RETAINED. AUDIO DSP CONTINUES STREAMING.
            </p>

            <button
              onClick={togglePause}
              className="glitch-btn px-5 py-2 text-xs text-black flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>[ RESUME_THREAD ]</span>
            </button>
          </div>
        )}

        {/* Game Over Overlay: Fatal Exception Terminal */}
        {status === 'GAME_OVER' && (
          <div className="absolute inset-0 z-20 bg-[#04000aee] backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center animate-screen-tear">
            {isNewRecord ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#ff007f] text-black text-[9px] font-pixel mb-1.5 shadow-[2px_2px_0_#00f0ff]">
                <Sparkles className="w-3 h-3 text-black" />
                <span>MEM_RECORD_BROKEN</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1 text-[9px] font-pixel text-[#ff007f] mb-1">
                <AlertTriangle className="w-3 h-3 text-[#ff007f]" />
                <span>FATAL_EXCEPTION://0xDEAD</span>
              </div>
            )}

            <h3 className="text-lg sm:text-xl font-pixel text-white glitch-text-magenta mb-2">
              COLLISION DETECTED
            </h3>

            {/* Diagnostic Core Memory Dump */}
            <div className="grid grid-cols-3 gap-1.5 w-full max-w-xs bg-[#080014] border-2 border-[#00f0ff] p-2 mb-2 text-left shadow-[2px_2px_0_#ff007f]">
              <div>
                <p className="text-[8px] font-pixel text-[#00f0ff]">SCORE</p>
                <p className="text-sm sm:text-base font-pixel text-white">{score}</p>
              </div>
              <div>
                <p className="text-[8px] font-pixel text-[#ff007f]">PACKETS</p>
                <p className="text-sm sm:text-base font-pixel text-white">{foodCount}</p>
              </div>
              <div>
                <p className="text-[8px] font-pixel text-[#00f0ff]">CELLS</p>
                <p className="text-sm sm:text-base font-pixel text-white">{snakeRef.current.length}</p>
              </div>
            </div>

            {/* Velocity Adjustment for Next Run */}
            <div className="w-full max-w-xs bg-[#080014] border border-[#ff007f] p-1.5 mb-2.5">
              <div className="flex items-center justify-between text-[8px] font-pixel text-[#00f0ff] mb-1">
                <span>NEXT_CLOCK:</span>
                <span className="text-[#ff007f] font-bold">
                  {difficulty === 'custom' ? `${customSpeedMs}MS` : difficulty.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {(['chill', 'normal', 'overdrive', 'custom'] as Difficulty[]).map((d) => {
                  const cfg = DIFFICULTY_CONFIG[d];
                  const isSelected = difficulty === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        audioEngine.playClickSound();
                        onDifficultyChange(d);
                      }}
                      className={`py-1 text-[8px] font-pixel border cursor-pointer ${
                        isSelected
                          ? 'bg-[#00f0ff] text-black border-[#ff007f] font-bold'
                          : 'bg-[#04000a] text-[#00f0ff]/70 border-[#00f0ff]/30'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-full max-w-xs">
              <button
                type="button"
                onClick={() => {
                  audioEngine.playClickSound();
                  setStatus('IDLE');
                }}
                className="glitch-btn-outline px-3 py-2 text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                title="Return to Terminal (Esc)"
              >
                <Home className="w-3 h-3" />
                <span>MENU</span>
              </button>

              <button
                type="button"
                onClick={startGame}
                className="flex-1 glitch-btn-magenta py-2 text-[10px] text-black flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>[ REBOOT_PROCESS ]</span>
              </button>
            </div>

            <p className="text-[10px] font-terminal text-[#00f0ff]/70 mt-1.5 tracking-widest">
              [ENTER] REBOOT :: [1-4] RATE :: [ESC] MENU
            </p>
          </div>
        )}
      </div>

      {/* Mobile Touch D-Pad in Brutalist Glitch Style */}
      <div className="mt-4 flex flex-col items-center gap-1.5 md:hidden">
        <button
          onClick={() => changeDirection('UP')}
          disabled={status !== 'PLAYING'}
          className="w-14 h-12 bg-[#06000e] active:bg-[#00f0ff] active:text-black border-2 border-[#00f0ff] text-[#00f0ff] shadow-[2px_2px_0_#ff007f] flex items-center justify-center font-pixel cursor-pointer"
          aria-label="Up Direction"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={() => changeDirection('LEFT')}
            disabled={status !== 'PLAYING'}
            className="w-14 h-12 bg-[#06000e] active:bg-[#00f0ff] active:text-black border-2 border-[#00f0ff] text-[#00f0ff] shadow-[2px_2px_0_#ff007f] flex items-center justify-center font-pixel cursor-pointer"
            aria-label="Left Direction"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => changeDirection('DOWN')}
            disabled={status !== 'PLAYING'}
            className="w-14 h-12 bg-[#06000e] active:bg-[#00f0ff] active:text-black border-2 border-[#00f0ff] text-[#00f0ff] shadow-[2px_2px_0_#ff007f] flex items-center justify-center font-pixel cursor-pointer"
            aria-label="Down Direction"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
          <button
            onClick={() => changeDirection('RIGHT')}
            disabled={status !== 'PLAYING'}
            className="w-14 h-12 bg-[#06000e] active:bg-[#00f0ff] active:text-black border-2 border-[#00f0ff] text-[#00f0ff] shadow-[2px_2px_0_#ff007f] flex items-center justify-center font-pixel cursor-pointer"
            aria-label="Right Direction"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Desktop Keyboard Hints in Cryptic Monospace */}
      <div className="hidden md:flex items-center gap-3 mt-3 text-xs font-terminal text-[#00f0ff]/80 tracking-widest">
        <span><kbd className="px-1 py-0.5 bg-[#080014] border border-[#ff007f] text-white">WASD</kbd> / <kbd className="px-1 py-0.5 bg-[#080014] border border-[#ff007f] text-white">ARROWS</kbd> VECTOR</span>
        <span className="text-[#ff007f]">::</span>
        <span><kbd className="px-1 py-0.5 bg-[#080014] border border-[#00f0ff] text-white">SPACE</kbd> HALT</span>
        <span className="text-[#ff007f]">::</span>
        <span><kbd className="px-1 py-0.5 bg-[#080014] border border-[#00f0ff] text-white">1-4</kbd> CLOCK</span>
      </div>
    </div>
  );
};
