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
  Home
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
}

const GRID_SIZE = 20;

export const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { label: string; speedMs: number; speedLabel: string; desc: string; keyHint: string }
> = {
  chill: {
    label: 'Chill',
    speedMs: 145,
    speedLabel: '145ms',
    desc: 'Relaxed tempo & easy cruising',
    keyHint: '1'
  },
  normal: {
    label: 'Normal',
    speedMs: 105,
    speedLabel: '105ms',
    desc: 'Classic balanced arcade velocity',
    keyHint: '2'
  },
  overdrive: {
    label: 'Overdrive',
    speedMs: 72,
    speedLabel: '72ms',
    desc: 'Hyper-speed neon rush',
    keyHint: '3'
  }
};

const SPEED_MAP: Record<Difficulty, number> = {
  chill: DIFFICULTY_CONFIG.chill.speedMs,
  normal: DIFFICULTY_CONFIG.normal.speedMs,
  overdrive: DIFFICULTY_CONFIG.overdrive.speedMs
};

export const SnakeGame: React.FC<SnakeGameProps> = ({
  currentTrack,
  isMusicPlaying,
  highScore,
  onHighScoreUpdate,
  difficulty,
  onDifficultyChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game state
  const [status, setStatus] = useState<GameStatus>('IDLE');
  const [score, setScore] = useState(0);
  const [foodCount, setFoodCount] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);

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

  // Spawn random food (Regular or Special Quantum Food)
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
    // Every ~4th food, 40% chance of high-value quantum pulse food
    const isQuantum = Math.random() < 0.28;

    const item: FoodItem = {
      x: spot.x,
      y: spot.y,
      type: isQuantum ? 'quantum' : 'energy',
      points: isQuantum ? 40 : 10,
      expiresAt: isQuantum ? Date.now() + 8000 : undefined,
      color: isQuantum ? '#f59e0b' : currentTrack.primaryColor
    };

    return item;
  }, [currentTrack.primaryColor]);

  // Particle emission helper
  const emitParticles = (x: number, y: number, color: string, count = 14) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cellSize = canvas.width / GRID_SIZE;
    const px = (x + 0.5) * cellSize;
    const py = (y + 0.5) * cellSize;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = 1.5 + Math.random() * 3.5;
      particlesRef.current.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color,
        alpha: 1,
        life: 0,
        maxLife: 20 + Math.floor(Math.random() * 15)
      });
    }
  };

  // Score popup helper
  const addScorePopup = (x: number, y: number, text: string, color: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cellSize = canvas.width / GRID_SIZE;
    popupsRef.current.push({
      id: Math.random().toString(),
      x: (x + 0.5) * cellSize,
      y: (y + 0.5) * cellSize,
      text,
      color,
      alpha: 1,
      dy: 0
    });
  };

  // Start / Restart game
  const startGame = useCallback(() => {
    audioEngine.playClickSound();
    // Auto-start music if not playing to give the combined game+music experience
    if (!audioEngine.getIsPlaying()) {
      audioEngine.startMusic();
    }

    const initialSnake: Point[] = [
      { x: 8, y: 10 },
      { x: 7, y: 10 },
      { x: 6, y: 10 }
    ];

    snakeRef.current = initialSnake;
    directionRef.current = 'RIGHT';
    nextDirectionRef.current = 'RIGHT';
    particlesRef.current = [];
    popupsRef.current = [];

    const initialFood = spawnFood(initialSnake);
    foodRef.current = initialFood;

    setScore(0);
    setFoodCount(0);
    setIsNewRecord(false);
    setStatus('PLAYING');
  }, [spawnFood]);

  // Pause / Resume
  const togglePause = useCallback(() => {
    audioEngine.playClickSound();
    setStatus((prev) => {
      if (prev === 'PLAYING') return 'PAUSED';
      if (prev === 'PAUSED') return 'PLAYING';
      return prev;
    });
  }, []);

  // Direction changer with 180-degree turn prevention
  const changeDirection = useCallback((newDir: Direction) => {
    const current = directionRef.current;
    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT'
    };

    if (opposites[newDir] !== current && opposites[newDir] !== nextDirectionRef.current) {
      nextDirectionRef.current = newDir;
      audioEngine.playTurnSound();
    }
  }, []);

  // Handle Game Over
  const handleGameOver = useCallback((finalScore: number, eaten: number, length: number) => {
    audioEngine.playGameOverSound();
    setStatus('GAME_OVER');

    const result = saveHighScore(finalScore, eaten, length, difficulty, currentTrack.title);
    if (result.isNewHighScore && finalScore > 0) {
      setIsNewRecord(true);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#a855f7', '#22c55e', '#f59e0b', '#ec4899']
      });
    }
    onHighScoreUpdate();
  }, [currentTrack.title, difficulty, onHighScoreUpdate]);

  // Main game tick (step calculation)
  const gameTick = useCallback(() => {
    if (status !== 'PLAYING') return;

    directionRef.current = nextDirectionRef.current;
    const currentHead = snakeRef.current[0];
    const dir = directionRef.current;

    const newHead: Point = {
      x: currentHead.x + (dir === 'RIGHT' ? 1 : dir === 'LEFT' ? -1 : 0),
      y: currentHead.y + (dir === 'DOWN' ? 1 : dir === 'UP' ? -1 : 0)
    };

    // 1. Check Wall Collision
    if (
      newHead.x < 0 ||
      newHead.x >= GRID_SIZE ||
      newHead.y < 0 ||
      newHead.y >= GRID_SIZE
    ) {
      emitParticles(currentHead.x, currentHead.y, '#ef4444', 24);
      handleGameOver(score, foodCount, snakeRef.current.length);
      return;
    }

    // 2. Check Self Collision
    const bodyHit = snakeRef.current.some(
      (segment, idx) => idx > 0 && segment.x === newHead.x && segment.y === newHead.y
    );
    if (bodyHit) {
      emitParticles(newHead.x, newHead.y, '#ef4444', 24);
      handleGameOver(score, foodCount, snakeRef.current.length);
      return;
    }

    const currentFood = foodRef.current;
    let didEat = false;

    // Check food expiry
    if (currentFood?.expiresAt && Date.now() > currentFood.expiresAt) {
      foodRef.current = spawnFood(snakeRef.current);
    }

    // 3. Check Food Collision
    if (currentFood && newHead.x === currentFood.x && newHead.y === currentFood.y) {
      didEat = true;
      const pointsWon = currentFood.points;
      const isBonus = currentFood.type === 'quantum';

      audioEngine.playEatSound(isBonus);
      emitParticles(newHead.x, newHead.y, currentFood.color, isBonus ? 24 : 14);
      addScorePopup(newHead.x, newHead.y, `+${pointsWon}`, currentFood.color);

      setScore((prev) => prev + pointsWon);
      setFoodCount((prev) => prev + 1);

      foodRef.current = spawnFood([newHead, ...snakeRef.current]);
    }

    // Move snake
    const newSnake = [newHead, ...snakeRef.current];
    if (!didEat) {
      newSnake.pop();
    }
    snakeRef.current = newSnake;
  }, [status, score, foodCount, spawnFood, handleGameOver]);

  // Set up the game interval timer
  useEffect(() => {
    if (status === 'PLAYING') {
      const interval = SPEED_MAP[difficulty];
      gameLoopTimerRef.current = window.setInterval(gameTick, interval);
    } else {
      if (gameLoopTimerRef.current !== null) {
        clearInterval(gameLoopTimerRef.current);
        gameLoopTimerRef.current = null;
      }
    }

    return () => {
      if (gameLoopTimerRef.current !== null) {
        clearInterval(gameLoopTimerRef.current);
      }
    };
  }, [status, difficulty, gameTick]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent page scrolling on game controls
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

      // Quick difficulty switching before starting or between games
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
        if (e.key === 'Escape' && status === 'GAME_OVER') {
          audioEngine.playClickSound();
          setStatus('IDLE');
          return;
        }
      }

      if (status !== 'PLAYING') return;

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
  }, [status, togglePause, startGame, changeDirection]);

  // Touch Swipe Handlers for canvas
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!touchStartPos.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;
    const minSwipe = 24;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > minSwipe) {
        changeDirection(dx > 0 ? 'RIGHT' : 'LEFT');
      }
    } else {
      if (Math.abs(dy) > minSwipe) {
        changeDirection(dy > 0 ? 'DOWN' : 'UP');
      }
    }
    touchStartPos.current = null;
  };

  // Canvas Drawing & Render Loop (60 FPS)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let beatPulse = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      const cellSize = width / GRID_SIZE;

      ctx.clearRect(0, 0, width, height);

      // 1. Dark Neon Grid Background
      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, width, height);

      // Cyber Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
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

      // Check audio beat intensity for subtle pulse
      const analyser = audioEngine.getAnalyser();
      if (isMusicPlaying && analyser) {
        const dataArray = new Uint8Array(8);
        analyser.getByteFrequencyData(dataArray);
        beatPulse = (dataArray[0] + dataArray[1]) / 512; // 0 to 1
      } else {
        beatPulse *= 0.9;
      }

      // 2. Render Food
      const food = foodRef.current;
      if (food) {
        const fx = food.x * cellSize + cellSize / 2;
        const fy = food.y * cellSize + cellSize / 2;
        const radius = (cellSize / 2) * (0.68 + Math.sin(Date.now() * 0.008) * 0.12);

        // Glow ring
        ctx.save();
        ctx.shadowColor = food.color;
        ctx.shadowBlur = 12 + beatPulse * 16;
        ctx.fillStyle = food.color;
        ctx.beginPath();
        ctx.arc(fx, fy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner highlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(fx - radius * 0.3, fy - radius * 0.3, radius * 0.35, 0, Math.PI * 2);
        ctx.fill();

        // Bonus Food Countdown Ring
        if (food.expiresAt) {
          const timeLeft = Math.max(0, food.expiresAt - Date.now());
          const ratio = timeLeft / 8000;
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(fx, fy, radius + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 3. Render Snake
      const snake = snakeRef.current;
      if (snake.length > 0) {
        // Draw body segments
        for (let i = snake.length - 1; i >= 0; i--) {
          const segment = snake[i];
          const segX = segment.x * cellSize + 1.5;
          const segY = segment.y * cellSize + 1.5;
          const segSize = cellSize - 3;
          const isHead = i === 0;

          ctx.save();
          if (isHead) {
            // Glowing Head
            ctx.shadowColor = currentTrack.primaryColor;
            ctx.shadowBlur = 14 + beatPulse * 14;
            ctx.fillStyle = '#ffffff';

            ctx.beginPath();
            ctx.roundRect(segX, segY, segSize, segSize, 6);
            ctx.fill();

            // Head eye indicators based on direction
            ctx.fillStyle = currentTrack.primaryColor;
            const eyeSize = 3;
            const dir = directionRef.current;

            let eye1X = segX + 4;
            let eye1Y = segY + 4;
            let eye2X = segX + segSize - 4 - eyeSize;
            let eye2Y = segY + 4;

            if (dir === 'RIGHT') {
              eye1X = segX + segSize - 5;
              eye1Y = segY + 4;
              eye2X = segX + segSize - 5;
              eye2Y = segY + segSize - 7;
            } else if (dir === 'LEFT') {
              eye1X = segX + 3;
              eye1Y = segY + 4;
              eye2X = segX + 3;
              eye2Y = segY + segSize - 7;
            } else if (dir === 'DOWN') {
              eye1X = segX + 4;
              eye1Y = segY + segSize - 5;
              eye2X = segX + segSize - 7;
              eye2Y = segY + segSize - 5;
            }

            ctx.fillRect(eye1X, eye1Y, eyeSize, eyeSize);
            ctx.fillRect(eye2X, eye2Y, eyeSize, eyeSize);
          } else {
            // Smooth gradient body segment
            const progress = i / snake.length;
            ctx.fillStyle = progress < 0.5 ? currentTrack.primaryColor : currentTrack.secondaryColor;
            ctx.globalAlpha = Math.max(0.45, 1 - progress * 0.55);
            ctx.beginPath();
            ctx.roundRect(segX, segY, segSize, segSize, 4);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      // 4. Update & Render Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1);
        }
      }

      // 5. Update & Render Score Popups
      for (let i = popupsRef.current.length - 1; i >= 0; i--) {
        const pop = popupsRef.current[i];
        pop.dy -= 0.8;
        pop.alpha -= 0.025;

        ctx.save();
        ctx.font = 'bold 15px "JetBrains Mono", monospace';
        ctx.fillStyle = pop.color;
        ctx.globalAlpha = Math.max(0, pop.alpha);
        ctx.shadowColor = pop.color;
        ctx.shadowBlur = 8;
        ctx.textAlign = 'center';
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
  }, [currentTrack, isMusicPlaying]);

  return (
    <div className="flex flex-col items-center w-full max-w-[480px] mx-auto select-none">
      {/* Top HUD: Score, High Score, Length */}
      <div className="w-full flex items-center justify-between px-3 py-2.5 mb-2.5 bg-[#0a0d16]/90 border border-slate-800 rounded-xl backdrop-blur-md">
        {/* Score & Multiplier */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
            <Flame className="w-4 h-4 fill-current animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Score</p>
            <p className="text-xl font-mono font-bold text-white tabular-nums tracking-tight">
              {score}
            </p>
          </div>
        </div>

        {/* Difficulty quick selector/indicator */}
        <button
          type="button"
          onClick={() => {
            if (status !== 'PLAYING') {
              const order: Difficulty[] = ['chill', 'normal', 'overdrive'];
              const nextIdx = (order.indexOf(difficulty) + 1) % order.length;
              audioEngine.playClickSound();
              onDifficultyChange(order[nextIdx]);
            }
          }}
          disabled={status === 'PLAYING'}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all flex items-center gap-1.5 ${
            status === 'PLAYING'
              ? 'bg-slate-900/60 border-slate-800 text-slate-400 cursor-default'
              : 'bg-slate-900/90 border-cyan-500/50 text-cyan-300 hover:bg-slate-800 hover:border-cyan-400 cursor-pointer shadow-sm shadow-cyan-500/10'
          }`}
          title={status === 'PLAYING' ? `Difficulty: ${difficulty}` : `Click to change difficulty before starting (${difficulty})`}
        >
          <Gauge className="w-3 h-3 text-cyan-400" />
          <span className="hidden sm:inline text-slate-500 text-[10px]">SPEED:</span>
          <span className="font-bold uppercase">{difficulty}</span>
        </button>

        {/* High Score */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-950/50 border border-amber-800/40 text-amber-400">
            <Trophy className="w-4 h-4" />
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Best</p>
            <p className="text-xl font-mono font-bold text-amber-300 tabular-nums tracking-tight">
              {Math.max(score, highScore)}
            </p>
          </div>
        </div>

        {/* Status & In-Game Pause Toggle */}
        <div className="flex items-center gap-1.5">
          {status === 'PLAYING' && (
            <button
              onClick={togglePause}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:bg-slate-700 transition-colors"
              title="Pause Game (Space)"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}
          {status === 'PAUSED' && (
            <button
              onClick={togglePause}
              className="p-2 rounded-lg bg-cyan-600 text-slate-950 hover:bg-cyan-500 font-bold transition-colors"
              title="Resume Game (Space)"
            >
              <Play className="w-4 h-4 fill-current" />
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Container with Neon Reactive Border */}
      <div 
        className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-300 shadow-2xl"
        style={{
          borderColor: isMusicPlaying ? currentTrack.primaryColor : '#1e293b',
          boxShadow: isMusicPlaying 
            ? `0 0 25px -4px ${currentTrack.glowShadow}` 
            : '0 10px 30px -10px rgba(0,0,0,0.8)'
        }}
      >
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="w-full h-full block cursor-pointer touch-none"
        />

        {/* Start Game Overlay */}
        {status === 'IDLE' && (
          <div className="absolute inset-0 bg-[#07090e]/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 text-xs font-mono mb-2">
              <Zap className="w-3.5 h-3.5" />
              <span>ARCADE ENGINE READY</span>
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-1">
              CYBER VIPER
            </h2>
            <p className="text-xs text-slate-400 max-w-xs mb-4">
              Navigate the neon matrix, collect energy orbs, and groove to synthesized AI beats.
            </p>

            {/* Difficulty Selector before starting */}
            <div className="w-full max-w-xs mb-5">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5 px-1">
                <span className="flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-cyan-400" />
                  <span>DIFFICULTY LEVEL</span>
                </span>
                <span className="text-cyan-400 font-bold uppercase">{difficulty}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                {(['chill', 'normal', 'overdrive'] as Difficulty[]).map((d) => {
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
                      className={`flex flex-col items-center py-2 px-1 rounded-lg transition-all ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25 scale-[1.02]'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="text-xs font-semibold">{cfg.label}</span>
                      <span className={`text-[10px] font-mono mt-0.5 ${isSelected ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                        {cfg.speedLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500 font-mono text-center mt-1.5">
                {DIFFICULTY_CONFIG[difficulty].desc} · Press [1-3]
              </p>
            </div>

            <button
              onClick={startGame}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:scale-95 transition-all shadow-lg shadow-cyan-500/30"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START GAME ({difficulty.toUpperCase()})</span>
            </button>
            <p className="text-[11px] font-mono text-slate-500 mt-3">
              Press Space or Enter to begin
            </p>
          </div>
        )}

        {/* Paused Overlay */}
        {status === 'PAUSED' && (
          <div className="absolute inset-0 bg-[#07090e]/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="p-3 rounded-full bg-slate-800 border border-slate-700 text-cyan-400 mb-3 animate-pulse">
              <Pause className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight mb-1">
              GAME PAUSED
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Take a breath while the synthesizer rolls.
            </p>
            <button
              onClick={togglePause}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-all shadow-md"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>RESUME GAME</span>
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {status === 'GAME_OVER' && (
          <div className="absolute inset-0 bg-[#07090e]/90 backdrop-blur-md flex flex-col items-center justify-center p-5 text-center animate-in fade-in duration-200">
            {isNewRecord ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 text-xs font-mono mb-1.5 animate-bounce">
                <Sparkles className="w-3.5 h-3.5" />
                <span>NEW HIGH SCORE!</span>
              </div>
            ) : (
              <div className="text-xs font-mono uppercase text-rose-400 tracking-wider mb-1">
                CRITICAL COLLISION
              </div>
            )}

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2.5">
              GAME OVER
            </h3>

            {/* Score summary panel */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-xs bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl mb-3 text-left">
              <div>
                <p className="text-[9px] uppercase font-mono text-slate-400">Score</p>
                <p className="text-xl font-bold text-cyan-400 font-mono tabular-nums">{score}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase font-mono text-slate-400">Food</p>
                <p className="text-xl font-bold text-slate-200 font-mono tabular-nums">{foodCount}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase font-mono text-slate-400">Length</p>
                <p className="text-xl font-bold text-slate-200 font-mono tabular-nums">{snakeRef.current.length}</p>
              </div>
            </div>

            {/* Interactive difficulty selector before starting next run */}
            <div className="w-full max-w-xs bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 mb-3.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1.5 px-0.5">
                <span className="flex items-center gap-1 text-slate-300 font-semibold">
                  <Gauge className="w-3 h-3 text-cyan-400" />
                  <span>DIFFICULTY FOR NEXT RUN:</span>
                </span>
                <span className="text-cyan-400 font-bold uppercase">{difficulty}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['chill', 'normal', 'overdrive'] as Difficulty[]).map((d) => {
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
                      className={`py-1.5 px-1 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25 scale-[1.02]'
                          : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <div>{cfg.label}</div>
                      <div className={`text-[9px] font-mono ${isSelected ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>
                        {cfg.speedLabel}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 w-full max-w-xs">
              <button
                type="button"
                onClick={() => {
                  audioEngine.playClickSound();
                  setStatus('IDLE');
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-medium text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                title="Return to Menu (Esc)"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Menu</span>
              </button>
              <button
                type="button"
                onClick={startGame}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:scale-95 transition-all shadow-lg shadow-cyan-500/30"
              >
                <RotateCcw className="w-4 h-4" />
                <span>PLAY AGAIN ({difficulty.toUpperCase()})</span>
              </button>
            </div>
            <p className="text-[10px] font-mono text-slate-500 mt-2">
              Press Enter to start · [1-3] to change difficulty
            </p>
          </div>
        )}
      </div>

      {/* Mobile Touch D-Pad */}
      <div className="mt-4 flex flex-col items-center gap-1.5 md:hidden">
        <button
          onClick={() => changeDirection('UP')}
          disabled={status !== 'PLAYING'}
          className="w-14 h-12 rounded-xl bg-slate-800/90 active:bg-cyan-500 active:text-slate-950 border border-slate-700 flex items-center justify-center text-slate-200 shadow-md transition-colors"
          aria-label="Up"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={() => changeDirection('LEFT')}
            disabled={status !== 'PLAYING'}
            className="w-14 h-12 rounded-xl bg-slate-800/90 active:bg-cyan-500 active:text-slate-950 border border-slate-700 flex items-center justify-center text-slate-200 shadow-md transition-colors"
            aria-label="Left"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => changeDirection('DOWN')}
            disabled={status !== 'PLAYING'}
            className="w-14 h-12 rounded-xl bg-slate-800/90 active:bg-cyan-500 active:text-slate-950 border border-slate-700 flex items-center justify-center text-slate-200 shadow-md transition-colors"
            aria-label="Down"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
          <button
            onClick={() => changeDirection('RIGHT')}
            disabled={status !== 'PLAYING'}
            className="w-14 h-12 rounded-xl bg-slate-800/90 active:bg-cyan-500 active:text-slate-950 border border-slate-700 flex items-center justify-center text-slate-200 shadow-md transition-colors"
            aria-label="Right"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Desktop Keyboard Hints */}
      <div className="hidden md:flex items-center gap-4 mt-3 text-xs text-slate-400 font-mono">
        <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">WASD</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Arrows</kbd> to Steer</span>
        <span>·</span>
        <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Space</kbd> Pause</span>
      </div>
    </div>
  );
};
