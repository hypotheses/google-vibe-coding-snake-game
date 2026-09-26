import React, { useState } from 'react';
import { Trophy, X, Trash2, Calendar, Award } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-md bg-[#0a0d16] border border-slate-800 rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                High Scores
              </h3>
              <p className="text-xs text-slate-400">
                Tracked locally in your browser storage
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              audioEngine.playClickSound();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scores List */}
        <div className="mt-4 max-h-72 overflow-y-auto space-y-2 pr-1">
          {scores.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No scores recorded yet. Play a game to set the bar!
            </div>
          ) : (
            scores.map((item, idx) => {
              const isTop = idx === 0;
              const medalColor = 
                idx === 0 ? 'text-amber-400 bg-amber-950/60 border-amber-800/40' :
                idx === 1 ? 'text-slate-300 bg-slate-800/60 border-slate-700/40' :
                idx === 2 ? 'text-amber-600 bg-amber-950/40 border-amber-900/40' :
                'text-slate-500 bg-slate-900 border-slate-800';

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isTop 
                      ? 'bg-amber-950/20 border-amber-500/30' 
                      : 'bg-slate-900/50 border-slate-800/80 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-xs font-bold border ${medalColor}`}>
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-mono text-white tabular-nums">
                          {item.score} pts
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {item.difficulty}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Length: {item.snakeLength} · Food: {item.foodCount}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{item.date}</span>
                    </div>
                    {item.trackPlayedTitle && (
                      <p className="text-[10px] text-slate-400 truncate max-w-[100px]">
                        {item.trackPlayedTitle}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
          {confirmClear ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-400">Confirm reset?</span>
              <button
                onClick={handleClear}
                className="px-2.5 py-1 text-xs bg-rose-600 text-white rounded hover:bg-rose-500 transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="px-2.5 py-1 text-xs bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              disabled={scores.length === 0}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-400 disabled:opacity-40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Records</span>
            </button>
          )}

          <button
            onClick={() => {
              audioEngine.playClickSound();
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
