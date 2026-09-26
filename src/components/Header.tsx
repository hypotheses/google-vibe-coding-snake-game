import React from 'react';
import { Trophy, Volume2, VolumeX, Radio, Terminal, Cpu } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';

interface HeaderProps {
  highScore: number;
  onOpenLeaderboard: () => void;
  sfxEnabled: boolean;
  onToggleSfx: () => void;
  isMusicPlaying: boolean;
  onToggleMusic: () => void;
  trackTitle: string;
}

export const Header: React.FC<HeaderProps> = ({
  highScore,
  onOpenLeaderboard,
  sfxEnabled,
  onToggleSfx,
  isMusicPlaying,
  onToggleMusic,
  trackTitle
}) => {
  return (
    <header className="w-full flex items-center justify-between px-3 sm:px-6 py-2.5 bg-[#030007] border-b-2 border-[#00f0ff] shadow-[0_4px_0_#ff007f] sticky top-0 z-40 relative">
      {/* Subtle Scanline Bar */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-[#ff007f] opacity-80" />

      {/* Zone 1: Pixelated Glitch Wordmark with Screen Tear / Glitch Hover */}
      <div className="flex items-center gap-2">
        <a 
          href="/" 
          className="text-xs sm:text-sm font-pixel tracking-wider text-[#00f0ff] glitch-text flex items-center gap-2.5 hover:glitch-hover"
        >
          <span className="w-3 h-3 bg-[#ff007f] border border-[#00f0ff] shadow-[0_0_8px_#ff007f] animate-ping" />
          <span className="font-bold">SECTOR://0xVIPER</span>
        </a>
      </div>

      {/* Zone 2: Cryptic Machine Telemetry */}
      <div className="hidden lg:flex items-center gap-3 text-xs font-terminal text-[#00f0ff] tracking-widest uppercase">
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#080014] border border-[#ff007f]">
          <Terminal className="w-3 h-3 text-[#ff007f]" />
          <span>FREQ: {isMusicPlaying ? trackTitle.toUpperCase() : 'CORE_HALT // IDLE'}</span>
        </div>
        <span className="text-[#ff007f] font-bold">::</span>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#080014] border border-[#00f0ff]">
          <Cpu className="w-3 h-3 text-[#00f0ff]" />
          <span>MATRIX: 20x20_HEX</span>
        </div>
        <span className="text-[#ff007f] font-bold">::</span>
        <span className="text-white/80">OP_STATE: RUNTIME</span>
      </div>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Audio DSP Subsystem Toggle */}
        <button
          onClick={onToggleMusic}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-pixel border-2 transition-all cursor-pointer ${
            isMusicPlaying 
              ? 'bg-[#ff007f] text-black border-[#00f0ff] shadow-[2px_2px_0_#00f0ff]' 
              : 'bg-[#05000a] text-[#00f0ff] border-[#00f0ff] shadow-[2px_2px_0_#ff007f] hover:bg-[#00f0ff] hover:text-black'
          }`}
          title={isMusicPlaying ? 'ABORT DSP AUDIO STREAM' : 'INITIALIZE DSP AUDIO STREAM'}
        >
          <Radio className={`w-3 h-3 ${isMusicPlaying ? 'animate-pulse' : ''}`} />
          <span className="hidden sm:inline">{isMusicPlaying ? 'DSP:ACTIVE' : 'DSP:HALT'}</span>
        </button>

        {/* SFX Bit Toggle */}
        <button
          onClick={onToggleSfx}
          className={`p-1.5 text-xs font-pixel border-2 transition-all cursor-pointer ${
            sfxEnabled 
              ? 'bg-[#00f0ff] text-black border-[#ff007f] shadow-[2px_2px_0_#ff007f]' 
              : 'bg-[#05000a] text-[#ff007f] border-[#ff007f] shadow-[2px_2px_0_#00f0ff]'
          }`}
          title={sfxEnabled ? 'SFX Audio Bus Armed' : 'SFX Audio Bus Muted'}
          aria-label="Toggle SFX Bus"
        >
          {sfxEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        {/* Sector Database / Leaderboard Trigger */}
        <button
          onClick={() => {
            audioEngine.playClickSound();
            onOpenLeaderboard();
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-pixel bg-[#05000a] border-2 border-[#00f0ff] text-[#00f0ff] shadow-[2px_2px_0_#ff007f] hover:bg-[#ff007f] hover:text-black hover:border-[#00f0ff] transition-all cursor-pointer whitespace-nowrap"
        >
          <Trophy className="w-3 h-3 text-[#ff007f]" />
          <span>MEM_PEAK: <span className="font-bold text-white">{highScore}</span></span>
        </button>
      </div>
    </header>
  );
};
