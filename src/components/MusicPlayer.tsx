import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square,
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Disc, 
  ListMusic, 
  Radio
} from 'lucide-react';
import { audioEngine, TRACKS } from '../services/audioEngine';
import { MusicTrack } from '../types/music';
import { AudioVisualizer } from './AudioVisualizer';

interface MusicPlayerProps {
  currentTrack: MusicTrack;
  isPlaying: boolean;
  onTrackChange: (track: MusicTrack) => void;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  currentTrack,
  isPlaying,
  onTrackChange
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(currentTrack.duration);
  const [volume, setVolume] = useState(audioEngine.getVolume());
  const [isMuted, setIsMuted] = useState(audioEngine.getIsMuted());
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);

  useEffect(() => {
    // Subscribe to audio engine state updates
    const unsubscribe = audioEngine.subscribe((state) => {
      if (!isSeeking) {
        setCurrentTime(state.currentTime);
      }
      setDuration(state.duration);
      if (TRACKS[state.trackIndex].id !== currentTrack.id) {
        onTrackChange(TRACKS[state.trackIndex]);
      }
    });

    // High frequency timer for smooth scrub bar progress
    const timer = setInterval(() => {
      if (isPlaying && !isSeeking) {
        setCurrentTime(audioEngine.getCurrentTime());
      }
    }, 250);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [isPlaying, isSeeking, currentTrack.id, onTrackChange]);

  const handlePlayPause = () => {
    audioEngine.playClickSound();
    audioEngine.togglePlay();
  };

  const handleStop = () => {
    audioEngine.playClickSound();
    audioEngine.stopMusic();
    setCurrentTime(0);
  };

  const handleNext = () => {
    audioEngine.playClickSound();
    audioEngine.nextTrack();
    onTrackChange(audioEngine.getCurrentTrack());
  };

  const handlePrev = () => {
    audioEngine.playClickSound();
    audioEngine.prevTrack();
    onTrackChange(audioEngine.getCurrentTrack());
  };

  const handleTrackSelect = (track: MusicTrack, index: number) => {
    audioEngine.playClickSound();
    audioEngine.selectTrack(index);
    onTrackChange(track);
    setShowPlaylist(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
  };

  const handleSeekCommit = () => {
    setIsSeeking(false);
    audioEngine.seek(currentTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    audioEngine.setVolume(val);
    if (val > 0 && isMuted) {
      setIsMuted(false);
      audioEngine.setMuted(false);
    }
  };

  const toggleMute = () => {
    audioEngine.playClickSound();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioEngine.setMuted(nextMuted);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative w-full bg-[#06000e] border-2 border-[#00f0ff] p-3 sm:p-4 shadow-[4px_4px_0_#ff007f] transition-all overflow-hidden">
      {/* Glitch Scanline Beam */}
      <div className="scanline-beam opacity-30" />

      {/* Top Section: Subsystem telemetry & Channel list */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b-2 border-[#ff007f]/50">
        <div className="flex items-center gap-3 min-w-0">
          {/* Animated Vinyl / Oscillating Bit Core */}
          <div 
            className="relative w-11 h-11 bg-[#030007] flex items-center justify-center shrink-0 border-2 border-[#00f0ff] shadow-[2px_2px_0_#ff007f] overflow-hidden"
          >
            <Disc 
              className={`w-6 h-6 transition-transform ${isPlaying ? 'animate-spin text-[#ff007f]' : 'text-[#00f0ff]'}`}
              style={{ animationDuration: '3s' }}
            />
            {isPlaying && (
              <span className="absolute inset-0 bg-[#00f0ff]/10 animate-ping pointer-events-none" />
            )}
          </div>

          {/* Track Titles & Cryptic Machine Metadata */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-pixel px-1.5 py-0.5 bg-[#ff007f] text-black font-bold">
                STREAM_DSP
              </span>
              <span className="text-xs font-terminal text-[#00f0ff] tracking-widest">
                CLK: {currentTrack.bpm}BPM :: KEY: {currentTrack.key}
              </span>
            </div>
            <h3 className="text-xs sm:text-sm font-pixel text-white truncate mt-1 glitch-text-sm">
              {currentTrack.title.toUpperCase()}
            </h3>
            <p className="text-xs font-terminal text-[#ff007f] truncate tracking-wider">
              CORE: {currentTrack.artist.toUpperCase()} // <span className="text-[#00f0ff]">{currentTrack.genre.toUpperCase()}</span>
            </p>
          </div>
        </div>

        {/* Visualizer & Playlist Drawer Button */}
        <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-3">
          <div className="w-32 sm:w-44 border-2 border-[#00f0ff] bg-black p-0.5 shadow-[2px_2px_0_#ff007f]">
            <AudioVisualizer currentTrack={currentTrack} isPlaying={isPlaying} height={32} />
          </div>

          <button
            onClick={() => {
              audioEngine.playClickSound();
              setShowPlaylist(!showPlaylist);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] font-pixel border-2 transition-all whitespace-nowrap cursor-pointer ${
              showPlaylist 
                ? 'bg-[#ff007f] text-black border-[#00f0ff] shadow-[2px_2px_0_#00f0ff]' 
                : 'bg-[#04000a] text-[#00f0ff] border-[#00f0ff] shadow-[2px_2px_0_#ff007f] hover:bg-[#00f0ff] hover:text-black'
            }`}
            title="Switch Audio Channel"
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>3_STREAMS</span>
          </button>
        </div>
      </div>

      {/* Playlist Drawer (Collapsible) */}
      {showPlaylist && (
        <div className="mt-3 p-2 bg-[#030007] border-2 border-[#ff007f] shadow-[3px_3px_0_#00f0ff] space-y-1 transition-all">
          <div className="flex items-center justify-between px-2 py-1 text-[9px] font-pixel text-[#ff007f]">
            <span>SYNTH_CORE // DEMO_STREAMS</span>
            <Radio className="w-3 h-3 text-[#00f0ff] animate-pulse" />
          </div>
          {TRACKS.map((track, idx) => {
            const isSelected = track.id === currentTrack.id;
            return (
              <button
                key={track.id}
                onClick={() => handleTrackSelect(track, idx)}
                className={`w-full flex items-center justify-between p-2 text-left transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-[#00f0ff] text-black font-bold border-l-4 border-[#ff007f]' 
                    : 'bg-[#080014] text-[#00f0ff] hover:bg-[#ff007f]/20 border border-[#00f0ff]/30'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 bg-[#ff007f]" />
                  <div className="truncate">
                    <p className="text-[10px] font-pixel truncate">{track.title.toUpperCase()}</p>
                    <p className={`text-xs font-terminal truncate tracking-wider ${isSelected ? 'text-black font-bold' : 'text-[#ff007f]'}`}>
                      {track.genre.toUpperCase()} // {track.bpm} BPM
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <span className="text-xs font-terminal font-bold tracking-widest">
                    {formatTime(track.duration)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Scrub Bar / Timeline */}
      <div className="mt-3 space-y-1">
        <div className="relative flex items-center">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.5"
            value={currentTime}
            onMouseDown={() => setIsSeeking(true)}
            onTouchStart={() => setIsSeeking(true)}
            onChange={handleSeek}
            onMouseUp={handleSeekCommit}
            onTouchEnd={handleSeekCommit}
            className="w-full h-2 bg-[#030007] border border-[#00f0ff] appearance-none cursor-pointer accent-[#ff007f]"
            style={{
              background: `linear-gradient(to right, #00f0ff ${progressPercent}%, #030007 ${progressPercent}%)`
            }}
          />
        </div>
        <div className="flex items-center justify-between text-xs font-terminal text-[#00f0ff] tracking-widest px-0.5">
          <span>HEAD: {formatTime(currentTime)}</span>
          <span className="text-[#ff007f] font-pixel text-[8px]">{currentTrack.aiModel.toUpperCase()}</span>
          <span>LEN: {formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Controls Row: Prev, Play/Pause, Stop, Next, Volume */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t-2 border-[#ff007f]/40">
        {/* Left: Quick status badge */}
        <div className="hidden sm:flex items-center gap-2">
          {isPlaying ? (
            <span className="inline-flex items-center gap-1.5 text-[8px] font-pixel bg-[#ff007f] text-black px-2 py-1 border border-[#00f0ff] shadow-[2px_2px_0_#00f0ff]">
              <span className="w-1.5 h-1.5 bg-black animate-ping" />
              STREAMING
            </span>
          ) : currentTime > 0 ? (
            <span className="inline-flex items-center gap-1 text-[8px] font-pixel bg-[#00f0ff] text-black px-2 py-1 border border-[#ff007f] shadow-[2px_2px_0_#ff007f]">
              PAUSED
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[8px] font-pixel bg-[#030007] text-[#00f0ff] px-2 py-1 border border-[#00f0ff]/50">
              STANDBY
            </span>
          )}
        </div>

        {/* Center: Playback Transport Buttons */}
        <div className="flex items-center gap-2 mx-auto sm:mx-0">
          <button
            onClick={handlePrev}
            className="p-2 bg-[#030007] text-[#00f0ff] border-2 border-[#00f0ff] shadow-[2px_2px_0_#ff007f] hover:bg-[#00f0ff] hover:text-black transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
            title="Previous Stream"
            aria-label="Previous Track"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={handlePlayPause}
            className={`p-2.5 border-2 text-black transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5 font-pixel ${
              isPlaying 
                ? 'bg-[#ff007f] border-[#00f0ff] shadow-[3px_3px_0_#00f0ff]' 
                : 'bg-[#00f0ff] border-[#ff007f] shadow-[3px_3px_0_#ff007f]'
            }`}
            title={isPlaying ? 'Halt Output' : 'Stream DSP Audio'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={handleStop}
            className="p-2 bg-[#030007] text-[#ff007f] border-2 border-[#ff007f] shadow-[2px_2px_0_#00f0ff] hover:bg-[#ff007f] hover:text-black transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
            title="Halt & Rewind"
            aria-label="Stop Music"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={handleNext}
            className="p-2 bg-[#030007] text-[#00f0ff] border-2 border-[#00f0ff] shadow-[2px_2px_0_#ff007f] hover:bg-[#00f0ff] hover:text-black transition-all cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
            title="Next Stream"
            aria-label="Next Track"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Volume Potentiometer */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleMute}
            className="p-1.5 text-[#00f0ff] hover:text-[#ff007f] transition-colors cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-[#ff007f]" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#00f0ff]" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 sm:w-20 h-1.5 bg-[#030007] border border-[#ff007f] appearance-none cursor-pointer accent-[#00f0ff]"
            title={`Gain: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
          />
        </div>
      </div>
    </div>
  );
};
