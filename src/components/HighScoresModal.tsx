import React, { useState } from 'react';
import { Trophy, X, Trash2, Calendar, Terminal } from 'lucide-react';
import { getHighScores, clearHighScores } from '../services/storage';
import { audioEngine } from '../services/audioEngine';

interface HighScoresModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScoresReset: () => void;
}

export const HighScoresModal: React.FC<HighScoresModalProps> = ({
  isOpen,
  onClose,
  onScoresReset
}) => {
  const [scores, setScores] = useState(getHighScores());
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isOpen) return null;

  const handleClear = () => {
    audioEngine.playClickSound();
    clearHighScores();
    setScores([]);
    setConfirmClear(false);
    onScoresReset();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-[2px] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-[#06000e] border-2 border-[#00f0ff] p-5 shadow-[6px_6px_0_#ff007f] text-[#00f0ff]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#ff007f]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#ff007f] text-black">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-pixel text-[#00f0ff] glitch-text tracking-wider">
                MEM_ARCHIVE // LEADERBOARD
              </h3>
              <p className="text-xs font-terminal text-slate-300 tracking-widest">
                NON-VOLATILE STORAGE REGISTERS
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              audioEngine.playClickSound();
              onClose();
            }}
            className="p-1 text-[#ff007f] hover:bg-[#ff007f] hover:text-black border border-[#ff007f] transition-all font-pixel text-xs cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scores List */}
        <div className="mt-4 max-h-72 overflow-y-auto space-y-2 pr-1">
          {scores.length === 0 ? (
            <div className="py-8 text-center text-xs font-terminal text-slate-400 tracking-widest border border-dashed border-[#00f0ff]/30 p-4">
              [ ZERO_REGISTERS_FOUND ]
              <p className="mt-1 text-[#ff007f]">INITIATE SECTOR PROCESS TO LOG DATA PACKETS.</p>
            </div>
          ) : (
            scores.map((item, idx) => {
              const isTop = idx === 0;
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-2.5 border transition-all ${
                    isTop 
                      ? 'bg-[#090017] border-[#00f0ff] shadow-[2px_2px_0_#ff007f]' 
                      : 'bg-[#04000a] border-[#00f0ff]/40 hover:border-[#ff007f]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-6 h-6 flex items-center justify-center font-pixel text-[10px] border ${
                      idx === 0 ? 'bg-[#ff007f] text-black border-[#00f0ff]' :
                      idx === 1 ? 'bg-[#00f0ff] text-black border-[#ff007f]' :
                      'bg-[#06000e] text-[#00f0ff] border-[#00f0ff]/60'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-pixel text-white tabular-nums">
                          {item.score} PTS
                        </span>
                        <span className="text-[8px] font-pixel px-1 py-0.5 bg-[#080014] text-[#ff007f] border border-[#ff007f]">
                          {item.difficulty === 'custom' && item.customSpeedMs ? `${item.customSpeedMs}MS` : item.difficulty.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs font-terminal text-[#00f0ff]/80 mt-0.5 tracking-wider">
                        CELLS: {item.snakeLength} // PACKETS: {item.foodCount}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-xs font-terminal text-slate-400">
                      <Calendar className="w-3 h-3 text-[#ff007f]" />
                      <span>{item.date}</span>
                    </div>
                    {item.trackPlayedTitle && (
                      <p className="text-[9px] font-pixel text-[#ff007f] truncate max-w-[120px] mt-0.5">
                        {item.trackPlayedTitle.toUpperCase()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Controls: Reset & Status */}
        <div className="flex items-center justify-between pt-3 mt-4 border-t-2 border-[#ff007f]/50">
          <div className="text-xs font-terminal text-slate-400 tracking-widest flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span>ENTRIES: {scores.length} / 10 MAX</span>
          </div>

          {scores.length > 0 && (
            <div>
              {confirmClear ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClear}
                    className="px-2 py-1 bg-[#ff007f] text-black font-pixel text-[9px] border border-[#00f0ff] hover:bg-white transition-all cursor-pointer"
                  >
                    [ CONFIRM_PURGE ]
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="px-2 py-1 bg-[#04000a] text-[#00f0ff] font-pixel text-[9px] border border-[#00f0ff] transition-all cursor-pointer"
                  >
                    CANCEL
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="flex items-center gap-1 px-2 py-1 text-[9px] font-pixel text-[#ff007f] hover:bg-[#ff007f] hover:text-black border border-[#ff007f] transition-all cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>PURGE_REGISTERS</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
