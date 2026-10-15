import React from 'react';
import { Volume2, VolumeX, RotateCcw, Skull, Moon, Compass, Crosshair, HelpCircle, Clock } from 'lucide-react';
import { GamePhase } from '../types/game';

interface HeaderProps {
  phase: GamePhase;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onResetGame: () => void;
  onOpenRules: () => void;
  timerSecondsRemaining?: number;
  isTimerRunning?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  phase,
  soundEnabled,
  onToggleSound,
  onResetGame,
  onOpenRules,
  timerSecondsRemaining,
  isTimerRunning,
}) => {
  const getPhaseBadge = () => {
    switch (phase) {
      case 'setup':
        return { label: 'Setup & Roster', icon: Skull, color: 'bg-zinc-800 text-zinc-300 border-zinc-700' };
      case 'night':
        return { label: 'Night Phase', icon: Moon, color: 'bg-indigo-950 text-indigo-300 border-indigo-700' };
      case 'exploration':
        return { label: 'Castle Exploration', icon: Compass, color: 'bg-rose-950 text-rose-300 border-rose-800' };
      case 'finale':
        return { label: 'The Finale', icon: Crosshair, color: 'bg-amber-950 text-amber-300 border-amber-700' };
      case 'game_over':
        return { label: 'Game Over', icon: Skull, color: 'bg-purple-950 text-purple-300 border-purple-700' };
    }
  };

  const badge = getPhaseBadge();
  const Icon = badge.icon;

  const timerMins = timerSecondsRemaining !== undefined ? Math.floor(timerSecondsRemaining / 60) : 0;
  const timerSecs = timerSecondsRemaining !== undefined ? timerSecondsRemaining % 60 : 0;

  return (
    <header className="sticky top-0 z-30 bg-[#0e0f18]/95 backdrop-blur-md border-b border-rose-950/40 px-3 py-2.5 sm:px-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-900 to-rose-950 border border-red-700/60 flex items-center justify-center shadow-md shadow-red-950/50">
            <span className="text-red-300 font-serif font-black text-lg">D</span>
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-serif font-bold text-rose-100 tracking-wide leading-tight flex items-center gap-1.5">
              Dracula's Masquerade
            </h1>
            <p className="text-[10px] sm:text-xs text-rose-400/80 font-mono">
              Storyteller Companion
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Header Live Timer Pill */}
          {timerSecondsRemaining !== undefined && (
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono font-bold border transition-all ${
                timerSecondsRemaining === 0
                  ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                  : isTimerRunning
                  ? 'bg-amber-950/80 text-amber-300 border-amber-600 shadow-sm shadow-amber-900/50'
                  : 'bg-zinc-900 text-zinc-300 border-zinc-700'
              }`}
            >
              <Clock className="w-3 h-3 text-rose-400" />
              <span>
                {String(timerMins).padStart(2, '0')}:{String(timerSecs).padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Phase Pill */}
          <div className={`hidden xs:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
            <Icon className="w-3.5 h-3.5" />
            <span>{badge.label}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            aria-label="Toggle sound"
            className="p-1.5 sm:p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
          </button>

          {/* Quick Rules */}
          <button
            onClick={onOpenRules}
            aria-label="Rules and Guide"
            className="p-1.5 sm:p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </button>

          {/* New Game / Reset */}
          <button
            onClick={onResetGame}
            aria-label="New Game"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-red-950/70 border border-red-800/60 text-red-300 hover:bg-red-900/80 hover:text-red-100 text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Game</span>
          </button>
        </div>
      </div>
    </header>
  );
};
