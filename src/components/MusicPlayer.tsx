import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Disc, 
  Music, 
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
    if (!isPlaying) {
      audioEngine.startMusic();
    }
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
    <div className="relative w-full bg-[#0a0d16]/95 border border-slate-800/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md transition-all">
      {/* Top Section: Now Playing Info & Playlist Toggle */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Animated Vinyl / Artwork */}
          <div 
            className="relative w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-slate-700/60 overflow-hidden"
            style={{ 
              background: `radial-gradient(circle at center, ${currentTrack.primaryColor}22 0%, #0d121f 100%)`,
              boxShadow: isPlaying ? `0 0 16px -2px ${currentTrack.primaryColor}55` : 'none'
            }}
          >
            <Disc 
              className={`w-6 h-6 transition-transform ${isPlaying ? 'animate-spin' : ''}`}
              style={{ 
                color: currentTrack.primaryColor,
                animationDuration: '4s'
              }}
            />
            {isPlaying && (
              <span 
                className="absolute inset-0 rounded-xl pointer-events-none animate-pulse opacity-40 border"
                style={{ borderColor: currentTrack.primaryColor }}
              />
            )}
          </div>

          {/* Track Titles & Metadata */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider font-mono px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700/50">
                AI DEMO
              </span>
              <span className="text-xs font-mono text-slate-400">
                {currentTrack.bpm} BPM · {currentTrack.key}
              </span>
            </div>
            <h3 className="text-base font-semibold text-slate-100 truncate mt-0.5 tracking-tight">
              {currentTrack.title}
            </h3>
            <p className="text-xs text-slate-400 truncate">
              {currentTrack.artist} · <span className="text-slate-500">{currentTrack.genre}</span>
            </p>
          </div>
        </div>

        {/* Visualizer & Playlist Drawer Button */}
        <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-3">
          <div className="w-36 md:w-48 hidden sm:block">
            <AudioVisualizer currentTrack={currentTrack} isPlaying={isPlaying} height={36} />
          </div>

          <button
            onClick={() => {
              audioEngine.playClickSound();
              setShowPlaylist(!showPlaylist);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
              showPlaylist 
                ? 'bg-slate-800 text-cyan-400 border-cyan-500/40' 
                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
            }`}
            title="Toggle AI Playlist"
          >
            <ListMusic className="w-4 h-4" />
            <span>3 AI Tracks</span>
          </button>
        </div>
      </div>

      {/* Playlist Drawer (Collapsible) */}
      {showPlaylist && (
        <div className="mt-3 p-2 bg-[#06080e] rounded-xl border border-slate-800/90 space-y-1.5 transition-all">
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            <span>Synthesized Demo Tracks (Zero Lag / Pure Web Audio)</span>
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
          </div>
          {TRACKS.map((track, idx) => {
            const isSelected = track.id === currentTrack.id;
            return (
              <button
                key={track.id}
                onClick={() => handleTrackSelect(track, idx)}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all ${
                  isSelected 
                    ? 'bg-slate-800/90 border border-slate-700 text-white' 
                    : 'hover:bg-slate-900/60 text-slate-300 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: track.primaryColor }}
                  />
                  <div className="truncate">
                    <p className="text-xs font-medium truncate">{track.title}</p>
                    <p className="text-[11px] text-slate-400 truncate">{track.genre} · {track.bpm} BPM</p>
                  </div>
                </div>
                <div className="text-right shrink-0 pl-2">
                  <span className="text-[11px] font-mono text-slate-400">
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
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
            style={{
              background: `linear-gradient(to right, ${currentTrack.primaryColor} ${progressPercent}%, #1e293b ${progressPercent}%)`
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span className="text-slate-500">{currentTrack.aiModel}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Controls Row: Prev, Play/Pause, Next, Volume */}
      <div className="flex items-center justify-between mt-3 pt-2">
        {/* Left: Quick genre tag */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
          <Music className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-mono text-[11px]">{currentTrack.scale}</span>
        </div>

        {/* Center: Playback Transport Buttons */}
        <div className="flex items-center gap-3 mx-auto sm:mx-0">
          <button
            onClick={handlePrev}
            className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/70 transition-colors"
            title="Previous Track"
            aria-label="Previous Track"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={handlePlayPause}
            className="relative p-3.5 rounded-full text-slate-950 font-bold transition-transform active:scale-95 shadow-lg"
            style={{
              backgroundColor: currentTrack.primaryColor,
              boxShadow: isPlaying ? `0 0 20px -2px ${currentTrack.primaryColor}` : '0 0 10px -2px rgba(0,0,0,0.5)'
            }}
            title={isPlaying ? 'Pause Music' : 'Play AI Synthesizer Music'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={handleNext}
            className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800/70 transition-colors"
            title="Next Track"
            aria-label="Next Track"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Right: Volume & Mute */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800/60 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 sm:w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
            title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            aria-label="Volume slider"
          />
        </div>
      </div>
    </div>
  );
};
