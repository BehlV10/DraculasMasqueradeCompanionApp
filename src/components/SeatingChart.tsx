import React, { useState } from 'react';
import { Player, RoleType } from '../types/game';
import { getPlayerColor } from '../utils/gameLogic';
import { HUNTERS } from '../data/gameData';
import { Heart, LayoutGrid, CircleDot, ShieldAlert, Sparkles } from 'lucide-react';

interface SeatingChartProps {
  players: Player[];
  onSelectPlayer?: (player: Player) => void;
  selectedPlayerId?: string | null;
  interactive?: boolean;
}

export const SeatingChart: React.FC<SeatingChartProps> = ({
  players,
  onSelectPlayer,
  selectedPlayerId,
  interactive = false,
}) => {
  const [viewMode, setViewMode] = useState<'circle' | 'list'>('circle');

  const getRoleBadge = (player: Player) => {
    switch (player.role) {
      case 'dracula':
        return (
          <span className="w-5 h-5 rounded-full bg-red-600 text-white font-serif font-black text-xs flex items-center justify-center border border-red-400 shadow-sm shadow-red-500/50">
            D
          </span>
        );
      case 'bride':
        return (
          <span
            title="Bride of Dracula"
            className="w-4 h-4 rounded-full bg-red-600 border border-red-300 shadow-sm shadow-red-500/50 inline-block"
          />
        );
      case 'hunter': {
        const hInfo = HUNTERS.find(h => h.id === player.hunterType);
        const initials = hInfo ? hInfo.initials : 'H';
        return (
          <span
            title={hInfo?.name || 'Hunter'}
            className="px-1 py-0.2 rounded bg-blue-700 text-blue-100 font-mono font-bold text-[10px] border border-blue-400"
          >
            {initials}
          </span>
        );
      }
      case 'guest':
        return (
          <span
            title="Guest"
            className="w-3.5 h-3.5 rounded-full bg-blue-500 border border-blue-300 shadow-sm inline-block"
          />
        );
    }
  };

  const getRoleLabel = (role: RoleType, hunterType?: string) => {
    if (role === 'dracula') return 'Dracula';
    if (role === 'bride') return 'Bride';
    if (role === 'guest') return 'Guest';
    if (role === 'hunter') {
      const h = HUNTERS.find(item => item.id === hunterType);
      return h ? h.name : 'Hunter';
    }
    return role;
  };

  const total = players.length;

  return (
    <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 p-3 sm:p-4">
      {/* View Mode Toggle Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <CircleDot className="w-4 h-4 text-rose-400" />
          <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Seating Order ({total} Guests)
          </h3>
        </div>

        <div className="flex items-center gap-1 bg-zinc-900/90 rounded-xl p-0.5 border border-zinc-800">
          <button
            onClick={() => setViewMode('circle')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'circle'
                ? 'bg-rose-950 text-rose-200 border border-rose-800 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>Circle</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-rose-950 text-rose-200 border border-rose-800 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>List</span>
          </button>
        </div>
      </div>

      {/* Circle View */}
      {viewMode === 'circle' && (
        <div className="relative w-full max-w-[340px] xs:max-w-[380px] sm:max-w-[420px] aspect-square mx-auto my-2">
          {/* Table Center Graphic */}
          <div className="absolute inset-[24%] rounded-full bg-gradient-to-br from-zinc-900 to-[#181928] border border-rose-950/60 shadow-inner flex flex-col items-center justify-center text-center p-2 z-0">
            <span className="text-xs font-serif font-bold text-rose-200/90 tracking-wider">
              MASQUERADE
            </span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Seating Table</span>
            <div className="flex items-center gap-2 mt-1.5 text-[9px] text-zinc-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-600 inline-block" /> Evil
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Good
              </span>
            </div>
            <span className="text-[9px] text-zinc-500 italic mt-1">Clockwise ➔</span>
          </div>

          {/* Player Seats positioned in circle */}
          {players.map((p, index) => {
            const angle = (index / total) * 2 * Math.PI - Math.PI / 2; // start from top
            // Calculate coordinates (percentage radius around center: ~38%)
            const radius = 39;
            const x = 50 + radius * Math.cos(angle);
            const y = 50 + radius * Math.sin(angle);
            const pColor = getPlayerColor(p.colorId);
            const isSelected = selectedPlayerId === p.id;

            return (
              <div
                key={p.id}
                onClick={() => onSelectPlayer && onSelectPlayer(p)}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute z-10 flex flex-col items-center transition-all ${
                  interactive ? 'cursor-pointer hover:scale-110' : ''
                } ${isSelected ? 'scale-115 ring-2 ring-rose-400 rounded-full' : ''}`}
              >
                {/* Seat Avatar Bubble */}
                <div
                  style={{
                    backgroundColor: pColor.hex,
                    borderColor: pColor.borderHex || 'rgba(255,255,255,0.2)',
                  }}
                  className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 flex items-center justify-center shadow-md shadow-black/60 transition-transform"
                >
                  {/* Seat Number */}
                  <span
                    style={{ color: pColor.textColor }}
                    className="font-bold text-xs font-mono drop-shadow-sm"
                  >
                    {p.seat}
                  </span>

                  {/* Role Mini Badge */}
                  <div className="absolute -top-1.5 -right-1.5">
                    {getRoleBadge(p)}
                  </div>

                  {/* Corrupted Marker */}
                  {p.isCorrupted && (
                    <div
                      title="Blood Corrupted (Registers as Evil)"
                      className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-red-600 rounded-full border border-white flex items-center justify-center animate-pulse"
                    >
                      <ShieldAlert className="w-2 h-2 text-white" />
                    </div>
                  )}

                  {/* Puppet Marker */}
                  {p.isPuppet && (
                    <div
                      title="Puppet Strings (Votes Fail)"
                      className="absolute -bottom-1 -left-1 w-3.5 h-3.5 bg-purple-600 rounded-full border border-white flex items-center justify-center"
                    >
                      <Sparkles className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>

                {/* Name & Color Pill */}
                <div className="mt-0.5 bg-black/85 backdrop-blur-sm px-1.5 py-0.2 rounded text-center border border-zinc-800 pointer-events-none max-w-[65px] truncate">
                  <p className="text-[10px] text-zinc-200 font-medium leading-none truncate">
                    {p.name || `P${p.seat}`}
                  </p>
                  <p className="text-[8px] text-zinc-400 font-mono leading-tight">
                    {pColor.name}
                  </p>
                </div>

                {/* Hearts remaining dots */}
                <div className="flex gap-0.5 mt-0.5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Heart
                      key={i}
                      className={`w-2 h-2 ${
                        i < p.heartsRemaining
                          ? 'fill-rose-500 text-rose-500'
                          : 'fill-zinc-800 text-zinc-700'
                      }`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1">
          {players.map(p => {
            const pColor = getPlayerColor(p.colorId);
            const isSelected = selectedPlayerId === p.id;

            return (
              <div
                key={p.id}
                onClick={() => onSelectPlayer && onSelectPlayer(p)}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-rose-950/40 border-rose-600'
                    : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-800/50'
                } ${interactive ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-center gap-2.5">
                  {/* Seat badge with player color */}
                  <div
                    style={{
                      backgroundColor: pColor.hex,
                      borderColor: pColor.borderHex || 'rgba(255,255,255,0.2)',
                    }}
                    className="w-7 h-7 rounded-lg border flex items-center justify-center font-mono font-bold text-xs shadow-sm"
                  >
                    <span style={{ color: pColor.textColor }}>{p.seat}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-zinc-100">
                        {p.name || `Player ${p.seat}`}
                      </span>
                      <span className="text-[10px] text-zinc-400">({pColor.name})</span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-zinc-300 font-medium">
                        {getRoleLabel(p.role, p.hunterType)}
                      </span>
                      {p.isCorrupted && (
                        <span className="text-[9px] bg-red-950 text-red-300 px-1 rounded border border-red-800">
                          Corrupted
                        </span>
                      )}
                      {p.isPuppet && (
                        <span className="text-[9px] bg-purple-950 text-purple-300 px-1 rounded border border-purple-800">
                          Puppet
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Heart
                        key={i}
                        className={`w-3 h-3 ${
                          i < p.heartsRemaining
                            ? 'fill-rose-500 text-rose-500'
                            : 'fill-zinc-800 text-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                  <div>{getRoleBadge(p)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
