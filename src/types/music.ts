export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  genre: string;
  aiModel: string;
  bpm: number;
  duration: number; // in seconds
  primaryColor: string; // e.g., '#06b6d4'
  secondaryColor: string; // e.g., '#8b5cf6'
  glowShadow: string;
  description: string;
  scale: string;
  key: string;
}

export interface PlaybackState {
  currentTrackId: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLooping: boolean;
  beatIntensity: number; // dynamically computed from audio analyzer (0 to 1) for visualizer
}
