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
    saveSettings({ difficulty: d, soundEffects: sfxEnabled });
  };

  const handleToggleSfx = () => {
    audioEngine.playClickSound();
    const nextVal = !sfxEnabled;
    setSfxEnabled(nextVal);
    audioEngine.setSfxEnabled(nextVal);
    saveSettings({ difficulty, soundEffects: nextVal });
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-black">
      {/* Top Bar Contract Compliant Header */}
      <Header
        highScore={highScore}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        sfxEnabled={sfxEnabled}
        onToggleSfx={handleToggleSfx}
        isMusicPlaying={isMusicPlaying}
        trackTitle={currentTrack.title}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-4 md:py-6 flex flex-col justify-center items-center gap-6">
        {/* Center Arcade Window - Snake Game */}
        <div className="w-full flex justify-center">
          <SnakeGame
            currentTrack={currentTrack}
            isMusicPlaying={isMusicPlaying}
            highScore={highScore}
            onHighScoreUpdate={refreshHighScores}
            difficulty={difficulty}
            onDifficultyChange={handleDifficultyChange}
          />
        </div>

        {/* Integrated AI Music Player Dock */}
        <div className="w-full max-w-xl">
          <MusicPlayer
            currentTrack={currentTrack}
            isPlaying={isMusicPlaying}
            onTrackChange={(track) => setCurrentTrack(track)}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-[#05070a] py-3 px-6 text-center text-xs text-slate-400 font-mono flex flex-col sm:flex-row items-center justify-between gap-2 max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <span>Cyber Viper Arcade</span>
          <span>·</span>
          <span>AI Audio Synthesizer</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>Arrows / WASD to move</span>
          <span>·</span>
          <span>Local storage scores</span>
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
