import React from 'react';
import { Trophy, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';

interface HeaderProps {
  highScore: number;
  onOpenLeaderboard: () => void;
  sfxEnabled: boolean;
  onToggleSfx: () => void;
  isMusicPlaying: boolean;
  trackTitle: string;
}

export const Header: React.FC<HeaderProps> = ({
  highScore,
  onOpenLeaderboard,
  sfxEnabled,
  onToggleSfx,
  isMusicPlaying,
  trackTitle
}) => {
  return (
    <header className="w-full flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800/80 bg-[#07090e]/90 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2">
        <a 
          href="/" 
          className="text-lg sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-2 font-display"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse" />
          <span>CYBER VIPER</span>
        </a>
      </div>

      {/* Zone 2: Clean status typography */}
      <div className="hidden md:flex items-center gap-4 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${isMusicPlaying ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
          <span>{isMusicPlaying ? `Playing: ${trackTitle}` : 'Synth Engine Standby'}</span>
        </div>
        <span>·</span>
        <span>20×20 Neon Grid</span>
        <span>·</span>
        <span>Web Audio Synthesis</span>
      </div>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* SFX Toggle */}
        <button
          onClick={onToggleSfx}
          className={`p-2 rounded-lg border text-xs font-mono transition-colors ${
            sfxEnabled 
              ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white' 
              : 'bg-slate-950 border-slate-800 text-slate-400'
          }`}
          title={sfxEnabled ? 'Game SFX Enabled' : 'Game SFX Muted'}
          aria-label="Toggle SFX"
        >
          {sfxEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
        </button>

        {/* High Score / Leaderboard Trigger */}
        <button
          onClick={() => {
            audioEngine.playClickSound();
            onOpenLeaderboard();
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-950/40 border border-amber-500/40 text-amber-300 hover:bg-amber-900/40 transition-colors whitespace-nowrap"
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>High Score: <strong className="font-mono text-white tabular-nums">{highScore}</strong></span>
        </button>
      </div>
    </header>
  );
};
