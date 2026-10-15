import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, Bell, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { playBell, playTick } from '../utils/sound';

interface TimerWidgetProps {
  label: string;
  defaultMinutes: number;
  secondsRemaining?: number;
  isRunning?: boolean;
  onStart?: () => void;
  onPause?: () => void;
  onReset?: (mins?: number) => void;
  onAddMinutes?: (mins: number) => void;
  onTimeExpire?: () => void;
}

export const TimerWidget: React.FC<TimerWidgetProps> = ({
  label,
  defaultMinutes,
  secondsRemaining: controlledSeconds,
  isRunning: controlledIsRunning,
  onStart,
  onPause,
  onReset,
  onAddMinutes,
  onTimeExpire,
}) => {
  const isControlled = controlledSeconds !== undefined;
  const [localSecondsRemaining, setLocalSecondsRemaining] = useState(defaultMinutes * 60);
  const [localIsRunning, setLocalIsRunning] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const secondsRemaining = isControlled ? controlledSeconds! : localSecondsRemaining;
  const isRunning = isControlled ? !!controlledIsRunning : localIsRunning;
  const prevSecondsRef = useRef(secondsRemaining);

  // Sync if defaultMinutes changes in uncontrolled mode
  useEffect(() => {
    if (!isControlled) {
      setLocalSecondsRemaining(defaultMinutes * 60);
      setLocalIsRunning(false);
    }
  }, [defaultMinutes, isControlled]);

  useEffect(() => {
    if (isControlled) return;
    let interval: number | undefined;
    if (isRunning) {
      interval = window.setInterval(() => {
        setLocalSecondsRemaining(prev => {
          if (prev <= 1) {
            playBell();
            if (onTimeExpire) onTimeExpire();
            return 0;
          }
          if (prev <= 11 && prev > 1) {
            playTick();
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, onTimeExpire, isControlled]);

  useEffect(() => {
    if (secondsRemaining === 0 && isRunning && !isControlled) {
      setLocalIsRunning(false);
    }
    prevSecondsRef.current = secondsRemaining;
  }, [secondsRemaining, isRunning, isControlled]);

  const handleTogglePlay = () => {
    if (isRunning) {
      if (onPause) onPause();
      else setLocalIsRunning(false);
    } else {
      if (onStart) onStart();
      else setLocalIsRunning(true);
    }
  };

  const handleAddMinutes = (mins: number) => {
    if (onAddMinutes) {
      onAddMinutes(mins);
    } else {
      setLocalSecondsRemaining(prev => Math.max(0, prev + mins * 60));
    }
  };

  const handleReset = (mins: number = defaultMinutes) => {
    if (onReset) {
      onReset(mins);
    } else {
      setLocalIsRunning(false);
      setLocalSecondsRemaining(mins * 60);
    }
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isLowTime = secondsRemaining > 0 && secondsRemaining <= 120; // 2 mins or less
  const isExpired = secondsRemaining === 0;

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 ${
        isExpired
          ? 'bg-rose-950/80 border-rose-600 shadow-lg shadow-rose-950/50'
          : isLowTime
          ? 'bg-amber-950/60 border-amber-600 shadow-md shadow-amber-950/40 animate-pulse'
          : 'bg-[#12131f]/90 border-rose-950/50'
      }`}
    >
      {/* Compact Main Bar */}
      <div className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-rose-400">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              {label}
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`font-mono text-xl sm:text-2xl font-black tracking-tight ${
                  isExpired
                    ? 'text-rose-400 animate-pulse'
                    : isLowTime
                    ? 'text-amber-400'
                    : 'text-zinc-100'
                }`}
              >
                {formattedTime}
              </span>
              {isExpired && (
                <span className="text-xs font-bold text-rose-400 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-700 animate-bounce">
                  TIME UP!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={handleTogglePlay}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm transition-transform active:scale-95 shadow-md ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-amber-950'
                : 'bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 text-white shadow-rose-950/50'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{secondsRemaining === 0 ? 'Restart' : 'Start'}</span>
              </>
            )}
          </button>

          {/* Quick +1 Min Button */}
          <button
            onClick={() => handleAddMinutes(1)}
            title="Quietly add 1 minute (Storyteller secret grace)"
            className="flex items-center gap-0.5 px-2 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-300 text-xs font-semibold"
          >
            <Plus className="w-3 h-3 text-rose-400" />
            <span>1m</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Controls for Storyteller */}
      {isExpanded && (
        <div className="border-t border-zinc-800/60 px-3 py-2.5 sm:px-4 bg-zinc-950/40 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-[11px] text-zinc-400">
            <Bell className="w-3.5 h-3.5 text-zinc-500" />
            <span>Renfield clock tools:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => handleAddMinutes(2)}
              className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium"
            >
              +2 min
            </button>
            <button
              onClick={() => handleAddMinutes(5)}
              className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium"
            >
              +5 min
            </button>
            <button
              onClick={() => handleReset(20)}
              className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium"
            >
              Set 20m
            </button>
            <button
              onClick={() => handleReset(25)}
              className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium"
            >
              Set 25m
            </button>
            <button
              onClick={() => handleReset(defaultMinutes)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
