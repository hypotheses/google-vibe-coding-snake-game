export interface Point {
  x: number;
  y: number;
}

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type GameStatus = 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type Difficulty = 'chill' | 'normal' | 'overdrive' | 'custom';

export type FoodType = 'energy' | 'quantum' | 'pulse';

export interface FoodItem {
  x: number;
  y: number;
  type: FoodType;
  points: number;
  expiresAt?: number; // timestamp for temporary bonus food
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface ScorePopup {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  dy: number;
}

export interface HighScoreRecord {
  id: string;
  score: number;
  foodCount: number;
  snakeLength: number;
  difficulty: Difficulty;
  customSpeedMs?: number;
  date: string;
  trackPlayedTitle?: string;
}

export interface GameSettings {
  difficulty: Difficulty;
  customSpeedMs: number;
  soundEffects: boolean;
  autoPlayMusic?: boolean;
}
