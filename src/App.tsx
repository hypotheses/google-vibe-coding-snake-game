import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SnakeGame } from './components/SnakeGame';
import { MusicPlayer } from './components/MusicPlayer';
import { HighScoresModal } from './components/HighScoresModal';
import { audioEngine, TRACKS } from './services/audioEngine';
import { getHighScores, getSavedSettings, saveSettings } from './services/storage';
import { MusicTrack } from './types/music';
import { Difficulty } from './types/game';

export default function App() {
  const initialSettings = getSavedSettings();
  const [currentTrack, setCurrentTrack] = useState<MusicTrack>(TRACKS[0]);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>(initialSettings.difficulty);
  const [customSpeedMs, setCustomSpeedMs] = useState<number>(initialSettings.customSpeedMs);
  const [sfxEnabled, setSfxEnabled] = useState(initialSettings.soundEffects);

  // Highest score state
  const [highScore, setHighScore] = useState<number>(() => {
    const scores = getHighScores();
    return scores.length > 0 ? scores[0].score : 0;
  });

  // Keep track of audio engine state
  useEffect(() => {
    const unsubscribe = audioEngine.subscribe((state) => {
      setIsMusicPlaying(state.isPlaying);
      setCurrentTrack(TRACKS[state.trackIndex]);
    });
    audioEngine.setSfxEnabled(sfxEnabled);
    return () => unsubscribe();
  }, [sfxEnabled]);

  const refreshHighScores = () => {
    const scores = getHighScores();
    setHighScore(scores.length > 0 ? scores[0].score : 0);
  };

  const handleDifficultyChange = (d: Difficulty) => {
    setDifficulty(d);
    saveSettings({ difficulty: d, customSpeedMs, soundEffects: sfxEnabled });
  };

  const handleCustomSpeedChange = (speed: number) => {
    const clamped = Math.max(35, Math.min(260, speed));
    setCustomSpeedMs(clamped);
    saveSettings({ difficulty, customSpeedMs: clamped, soundEffects: sfxEnabled });
  };

  const handleToggleSfx = () => {
    audioEngine.playClickSound();
    const nextVal = !sfxEnabled;
    setSfxEnabled(nextVal);
    audioEngine.setSfxEnabled(nextVal);
    saveSettings({ difficulty, customSpeedMs, soundEffects: nextVal });
  };

  const handleToggleMusic = () => {
    audioEngine.playClickSound();
    audioEngine.togglePlay();
  };

  return (
    <div className="min-h-screen bg-[#030007] text-[#00f0ff] flex flex-col justify-between selection:bg-[#ff007f] selection:text-black relative">
      {/* Background Static Noise & CRT Grating Overlay */}
      <div className="fixed inset-0 static-noise opacity-40 pointer-events-none z-0" />

      {/* Top Header */}
      <Header
        highScore={highScore}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        sfxEnabled={sfxEnabled}
        onToggleSfx={handleToggleSfx}
        isMusicPlaying={isMusicPlaying}
        onToggleMusic={handleToggleMusic}
        trackTitle={currentTrack.title}
      />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-3 sm:px-4 py-3 sm:py-6 flex flex-col justify-center items-center gap-5">
        {/* Center Arcade Window - Snake Game */}
        <div className="w-full flex justify-center">
          <SnakeGame
            currentTrack={currentTrack}
            isMusicPlaying={isMusicPlaying}
            highScore={highScore}
            onHighScoreUpdate={refreshHighScores}
            difficulty={difficulty}
            onDifficultyChange={handleDifficultyChange}
            customSpeedMs={customSpeedMs}
            onCustomSpeedChange={handleCustomSpeedChange}
          />
        </div>

        {/* Integrated AI Music Player Dock */}
        <div className="w-full max-w-[480px]">
          <MusicPlayer
            currentTrack={currentTrack}
            isPlaying={isMusicPlaying}
            onTrackChange={(track) => setCurrentTrack(track)}
          />
        </div>
      </main>

      {/* Cryptic Machine-like Footer */}
      <footer className="relative z-10 w-full border-t-2 border-[#00f0ff] bg-[#030007] py-2 px-4 sm:px-8 text-xs font-terminal text-[#00f0ff] tracking-widest flex flex-col sm:flex-row items-center justify-between gap-1 shadow-[0_-2px_0_#ff007f]">
        <div className="flex items-center gap-2">
          <span className="text-[#ff007f] font-bold">NODE://0x7F</span>
          <span>::</span>
          <span>CORE_AUDIO_DSP [SYNTH_OK]</span>
          <span>::</span>
          <span className="text-white/80">GRID: 20x20_MATRIX</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <span>MEM: NON_VOLATILE</span>
          <span className="text-[#ff007f]">::</span>
          <span>VECTOR_STEER: WASD / ARROWS</span>
        </div>
      </footer>

      {/* High Scores Modal */}
      <HighScoresModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        onScoresReset={refreshHighScores}
      />
    </div>
  );
}
