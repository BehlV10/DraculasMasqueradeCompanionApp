import React, { useState } from 'react';
import { Player, RoleType, RestlessSpirit } from '../types/game';
import { getPlayerColor } from '../utils/gameLogic';
import { HUNTERS } from '../data/gameData';
import { Heart, LayoutGrid, CircleDot, ShieldAlert, Sparkles, Ghost } from 'lucide-react';

interface SeatingChartProps {
  players: Player[];
  restlessSpirits?: RestlessSpirit[];
  onSelectPlayer?: (player: Player) => void;
  selectedPlayerId?: string | null;
  interactive?: boolean;
}

export const SeatingChart: React.FC<SeatingChartProps> = ({
  players,
  restlessSpirits = [],
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

  const getSpiritCoordinates = (
    spirit: RestlessSpirit,
    spiritIndex: number,
    allSpirits: RestlessSpirit[],
    totalPlayers: number
  ) => {
    const { betweenSeatA, betweenSeatB } = spirit;
    const minSeat = Math.min(betweenSeatA, betweenSeatB);
    const maxSeat = Math.max(betweenSeatA, betweenSeatB);

    let gapIndex: number;
    if (minSeat === 1 && maxSeat === totalPlayers) {
      gapIndex = totalPlayers - 0.5;
    } else {
      gapIndex = (minSeat - 1) + (maxSeat - minSeat) / 2;
    }

    let angle = (gapIndex / totalPlayers) * 2 * Math.PI + Math.PI / 2;

    const spiritsInSameGap = allSpirits.filter(s => {
      const sMin = Math.min(s.betweenSeatA, s.betweenSeatB);
      const sMax = Math.max(s.betweenSeatA, s.betweenSeatB);
      return sMin === minSeat && sMax === maxSeat;
    });

    let radius = 38;
    if (spiritsInSameGap.length > 1) {
      const idxInGap = spiritsInSameGap.indexOf(spirit);
      radius = idxInGap === 0 ? 32 : 44;
      angle += (idxInGap === 0 ? -0.06 : 0.06);
    }

    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);

    return { x, y };
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
            {restlessSpirits.length > 0 && (
              <div className="mt-1 px-1.5 py-0.5 rounded-md bg-purple-950/80 border border-purple-800 text-[8px] sm:text-[9px] text-purple-200 flex items-center gap-1 font-medium">
                <Ghost className="w-2.5 h-2.5 text-purple-400" />
                <span>{restlessSpirits.length} Spirits</span>
              </div>
            )}
            <span className="text-[9px] text-zinc-500 italic mt-0.5">Clockwise ➔</span>
          </div>

          {/* Player Seats positioned in circle (Seat 1 at bottom, progressing clockwise) */}
          {players.map((p, index) => {
            const angle = (index / total) * 2 * Math.PI + Math.PI / 2; // start from bottom (6 o'clock)
            // Calculate coordinates (percentage radius around center: ~38%)
            const radius = 38;
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

          {/* Restless Spirits placed between seats on circular table */}
          {restlessSpirits.map((spirit, sIdx) => {
            const { x, y } = getSpiritCoordinates(spirit, sIdx, restlessSpirits, total);
            const isEvil = spirit.alignment === 'evil';

            return (
              <div
                key={`spirit_${sIdx}_${spirit.betweenSeatA}_${spirit.betweenSeatB}`}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                title={`Restless Spirit #${sIdx + 1}: ${isEvil ? 'Evil' : 'Good'} (Between Seat ${spirit.betweenSeatA} & ${spirit.betweenSeatB})`}
                className="absolute z-20 flex flex-col items-center pointer-events-auto select-none"
              >
                <div
                  className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center shadow-lg transition-transform hover:scale-125 cursor-help ${
                    isEvil
                      ? 'bg-gradient-to-br from-red-950 via-zinc-950 to-red-900 border-red-500 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                      : 'bg-gradient-to-br from-blue-950 via-zinc-950 to-indigo-900 border-blue-400 text-blue-200 shadow-[0_0_12px_rgba(59,130,246,0.7)]'
                  }`}
                >
                  <Ghost className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isEvil ? 'text-red-400' : 'text-blue-300'} animate-pulse`} />
                  
                  {/* Mini Dot Indicator */}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-black ${
                      isEvil ? 'bg-red-500' : 'bg-blue-400'
                    }`}
                  />
                </div>

                <div
                  className={`mt-0.5 px-1 py-0.2 rounded text-[7px] sm:text-[8px] font-bold font-mono tracking-tighter uppercase whitespace-nowrap border shadow-sm backdrop-blur-sm ${
                    isEvil
                      ? 'bg-black/90 text-red-300 border-red-900/80'
                      : 'bg-black/90 text-blue-300 border-blue-900/80'
                  }`}
                >
                  {isEvil ? '🔴 Evil' : '🔵 Good'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1">
          {players.map((p, pIdx) => {
            const pColor = getPlayerColor(p.colorId);
            const isSelected = selectedPlayerId === p.id;
            const nextSeat = (p.seat % total) + 1;
            const spiritsBetween = restlessSpirits.filter(
              s => (s.betweenSeatA === p.seat && s.betweenSeatB === nextSeat) ||
                   (s.betweenSeatB === p.seat && s.betweenSeatA === nextSeat)
            );

            return (
              <React.Fragment key={p.id}>
                <div
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

                {spiritsBetween.map((spirit, sIdx) => (
                  <div
                    key={`spirit_inline_${pIdx}_${sIdx}`}
                    className={`sm:col-span-2 p-2 rounded-xl border flex items-center justify-between text-xs my-0.5 ${
                      spirit.alignment === 'evil'
                        ? 'bg-gradient-to-r from-red-950/40 via-zinc-950 to-red-950/20 border-red-800/60 text-red-200'
                        : 'bg-gradient-to-r from-blue-950/40 via-zinc-950 to-blue-950/20 border-blue-800/60 text-blue-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Ghost className={`w-4 h-4 ${spirit.alignment === 'evil' ? 'text-red-400' : 'text-blue-400'} animate-pulse`} />
                      <div>
                        <span className="font-bold text-xs">
                          Restless Spirit ({spirit.alignment === 'evil' ? '🔴 Evil Dot' : '🔵 Good Dot'})
                        </span>
                        <span className="text-[10px] text-zinc-400 block">
                          Positioned between Seat {spirit.betweenSeatA} and Seat {spirit.betweenSeatB}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                      spirit.alignment === 'evil'
                        ? 'bg-red-950 border-red-700 text-red-300'
                        : 'bg-blue-950 border-blue-700 text-blue-300'
                    }`}>
                      {spirit.alignment}
                    </span>
                  </div>
                ))}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
