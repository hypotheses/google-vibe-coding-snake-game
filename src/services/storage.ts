import { HighScoreRecord, Difficulty } from '../types/game';

const HIGH_SCORES_KEY = 'cyber_viper_high_scores_v1';
const SETTINGS_KEY = 'cyber_viper_settings_v1';

const DEFAULT_SCORES: HighScoreRecord[] = [
  {
    id: 'seed-1',
    score: 380,
    foodCount: 32,
    snakeLength: 35,
    difficulty: 'overdrive',
    date: '2026-09-24',
    trackPlayedTitle: 'Cyberpulse Drift'
  },
  {
    id: 'seed-2',
    score: 240,
    foodCount: 22,
    snakeLength: 25,
    difficulty: 'normal',
    date: '2026-09-25',
    trackPlayedTitle: 'Neural Viper Grid'
  },
  {
    id: 'seed-3',
    score: 150,
    foodCount: 15,
    snakeLength: 18,
    difficulty: 'chill',
    date: '2026-09-25',
    trackPlayedTitle: 'Starlight Matrix'
  }
];

export function getHighScores(): HighScoreRecord[] {
  try {
    const raw = localStorage.getItem(HIGH_SCORES_KEY);
    if (!raw) {
      localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(DEFAULT_SCORES));
      return DEFAULT_SCORES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => b.score - a.score);
    }
    return DEFAULT_SCORES;
  } catch {
    return DEFAULT_SCORES;
  }
}

export function saveHighScore(
  score: number,
  foodCount: number,
  snakeLength: number,
  difficulty: Difficulty,
  trackPlayedTitle?: string
): { isNewHighScore: boolean; rank: number } {
  try {
    const scores = getHighScores();
    const highestBefore = scores.length > 0 ? scores[0].score : 0;
    const isNewHighScore = score > highestBefore;

    const newRecord: HighScoreRecord = {
      id: 'score_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      score,
      foodCount,
      snakeLength,
      difficulty,
      date: new Date().toISOString().split('T')[0],
      trackPlayedTitle
    };

    scores.push(newRecord);
    scores.sort((a, b) => b.score - a.score);
    const trimmed = scores.slice(0, 10);
    localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(trimmed));

    const rank = trimmed.findIndex((s) => s.id === newRecord.id) + 1;
    return { isNewHighScore, rank: rank > 0 ? rank : trimmed.length + 1 };
  } catch {
    return { isNewHighScore: false, rank: 99 };
  }
}

export function clearHighScores(): void {
  try {
    localStorage.removeItem(HIGH_SCORES_KEY);
  } catch {
    // ignore
  }
}

export function getSavedSettings(): { difficulty: Difficulty; soundEffects: boolean } {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return { difficulty: 'normal', soundEffects: true };
}

export function saveSettings(settings: { difficulty: Difficulty; soundEffects: boolean }): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}
