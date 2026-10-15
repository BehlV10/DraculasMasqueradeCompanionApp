import React, { useState, useRef, useEffect } from 'react';
import { Player, RoleType, RestlessSpirit } from '../types/game';
import { getPlayerColor } from '../utils/gameLogic';
import { HUNTERS } from '../data/gameData';
import { Heart, LayoutGrid, CircleDot, ShieldAlert, Sparkles, Ghost, BookOpen } from 'lucide-react';

interface SeatingChartProps {
  players: Player[];
  restlessSpirits?: RestlessSpirit[];
  onSelectPlayer?: (player: Player) => void;
  selectedPlayerId?: string | null;
  interactive?: boolean;
  onUpdateSpirit?: (index: number, updates: Partial<RestlessSpirit>) => void;
  activeSpiritIndex?: number | null;
  onSelectSpiritIndex?: (index: number) => void;
  narratorAngle?: number;
  onUpdateNarratorAngle?: (angle: number) => void;
}

export const SeatingChart: React.FC<SeatingChartProps> = ({
  players,
  restlessSpirits = [],
  onSelectPlayer,
  selectedPlayerId,
  interactive = false,
  onUpdateSpirit,
  activeSpiritIndex,
  onSelectSpiritIndex,
  narratorAngle = Math.PI / 2,
  onUpdateNarratorAngle,
}) => {
  const [viewMode, setViewMode] = useState<'circle' | 'list'>('circle');
  const [draggingSpiritIdx, setDraggingSpiritIdx] = useState<number | null>(null);
  const [dragCoords, setDragCoords] = useState<{ x: number; y: number } | null>(null);
  const [hoverGap, setHoverGap] = useState<{
    seatA: number;
    seatB: number;
    nameA: string;
    nameB: string;
    angle: number;
    x: number;
    y: number;
  } | null>(null);

  // Narrator drag state
  const [isDraggingNarrator, setIsDraggingNarrator] = useState<boolean>(false);
  const [dragNarratorAngle, setDragNarratorAngle] = useState<number | null>(null);

  const localNarratorAngle = isDraggingNarrator && dragNarratorAngle !== null ? dragNarratorAngle : narratorAngle;

  const pointerStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const circleContainerRef = useRef<HTMLDivElement>(null);

  const handleNarratorPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingNarrator(true);
    setDragNarratorAngle(narratorAngle);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // fallback
    }
  };

  const handleNarratorPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingNarrator) return;
    e.preventDefault();
    const rect = circleContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    setDragNarratorAngle(angle);
  };

  const handleNarratorPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingNarrator) return;
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // fallback
    }
    const finalAngle = dragNarratorAngle !== null ? dragNarratorAngle : narratorAngle;
    setIsDraggingNarrator(false);
    setDragNarratorAngle(null);
    if (onUpdateNarratorAngle) {
      onUpdateNarratorAngle(finalAngle);
    }
  };

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

    const angle = (gapIndex / totalPlayers) * 2 * Math.PI + Math.PI / 2;
    const radius = 38;

    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);

    return { x, y };
  };

  const sortedPlayers = [...players].sort((a, b) => a.seat - b.seat);
  const total = sortedPlayers.length;

  // Precalculate all gaps between adjacent players around the table
  const allGaps = sortedPlayers.map((p, idx) => {
    const nextP = sortedPlayers[(idx + 1) % total];
    const minSeat = Math.min(p.seat, nextP.seat);
    const maxSeat = Math.max(p.seat, nextP.seat);
    let gapIndex: number;
    if (minSeat === 1 && maxSeat === total) {
      gapIndex = total - 0.5;
    } else {
      gapIndex = (minSeat - 1) + (maxSeat - minSeat) / 2;
    }
    const angle = (gapIndex / total) * 2 * Math.PI + Math.PI / 2;
    const radius = 38;
    const x = 50 + radius * Math.cos(angle);
    const y = 50 + radius * Math.sin(angle);
    const colA = getPlayerColor(p.colorId);
    const colB = getPlayerColor(nextP.colorId);

    return {
      seatA: p.seat,
      seatB: nextP.seat,
      nameA: p.name || `Player ${p.seat}`,
      nameB: nextP.name || `Player ${nextP.seat}`,
      colorA: colA,
      colorB: colB,
      gapIndex,
      angle,
      x,
      y,
    };
  });

  const isSameGap = (spirit: RestlessSpirit, gap: { seatA: number; seatB: number }) => {
    return (
      (spirit.betweenSeatA === gap.seatA && spirit.betweenSeatB === gap.seatB) ||
      (spirit.betweenSeatA === gap.seatB && spirit.betweenSeatB === gap.seatA)
    );
  };

  const findClosestGap = (cursorAngle: number) => {
    if (allGaps.length === 0) return null;
    let bestGap = allGaps[0];
    let minDiff = Infinity;
    for (const gap of allGaps) {
      let diff = Math.abs(cursorAngle - gap.angle) % (2 * Math.PI);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      if (diff < minDiff) {
        minDiff = diff;
        bestGap = gap;
      }
    }
    return bestGap;
  };

  const handleSpiritPointerDown = (e: React.PointerEvent<HTMLDivElement>, sIdx: number) => {
    if (!onUpdateSpirit) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // fallback
    }

    pointerStartPos.current = { x: e.clientX, y: e.clientY };
    setDraggingSpiritIdx(sIdx);
    onSelectSpiritIndex?.(sIdx);

    const rect = circleContainerRef.current?.getBoundingClientRect();
    if (rect) {
      const relX = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
      const relY = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));
      setDragCoords({ x: relX, y: relY });

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const cursorAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const closest = findClosestGap(cursorAngle);
      setHoverGap(closest);
    }
  };

  const handleSpiritPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingSpiritIdx === null) return;
    e.preventDefault();
    const rect = circleContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const relX = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    const relY = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));
    setDragCoords({ x: relX, y: relY });

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const cursorAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    const closest = findClosestGap(cursorAngle);
    setHoverGap(closest);
  };

  const handleSpiritPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingSpiritIdx === null) return;
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // fallback
    }

    const dist = Math.hypot(
      e.clientX - pointerStartPos.current.x,
      e.clientY - pointerStartPos.current.y
    );

    // If moved more than 6px, treat as drag & drop
    if (dist >= 6 && hoverGap && onUpdateSpirit) {
      const otherIdx = draggingSpiritIdx === 0 ? 1 : 0;
      const otherSpirit = restlessSpirits[otherIdx];
      const isOtherOnThisGap = otherSpirit && (
        (otherSpirit.betweenSeatA === hoverGap.seatA && otherSpirit.betweenSeatB === hoverGap.seatB) ||
        (otherSpirit.betweenSeatA === hoverGap.seatB && otherSpirit.betweenSeatB === hoverGap.seatA)
      );

      if (isOtherOnThisGap) {
        // Swap with other spirit
        const curSpirit = restlessSpirits[draggingSpiritIdx];
        if (curSpirit) {
          onUpdateSpirit(otherIdx, {
            betweenSeatA: curSpirit.betweenSeatA,
            betweenSeatB: curSpirit.betweenSeatB,
          });
        }
      }

      onUpdateSpirit(draggingSpiritIdx, {
        betweenSeatA: hoverGap.seatA,
        betweenSeatB: hoverGap.seatB,
      });
    }

    setDraggingSpiritIdx(null);
    setDragCoords(null);
    setHoverGap(null);
  };

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
        <div
          ref={circleContainerRef}
          className="relative w-full max-w-[340px] xs:max-w-[380px] sm:max-w-[420px] aspect-square mx-auto my-2 select-none"
        >
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

          {/* Drag Hover Snap Banner */}
          {draggingSpiritIdx !== null && hoverGap && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-35 px-2.5 py-1 rounded-full bg-purple-950/95 border border-purple-400 text-[10px] text-purple-200 font-bold shadow-[0_0_15px_rgba(168,85,247,0.8)] pointer-events-none whitespace-nowrap animate-pulse flex items-center gap-1.5">
              <Ghost className="w-3 h-3 text-purple-300" />
              <span>Snap: {hoverGap.nameA} ↔ {hoverGap.nameB}</span>
            </div>
          )}

          {/* Interactive Empty Gap Drop / Tap Slots (when onUpdateSpirit is provided) */}
          {onUpdateSpirit && allGaps.map(gap => {
            const isOccupiedBySpirit0 = restlessSpirits[0] && isSameGap(restlessSpirits[0], gap);
            const isOccupiedBySpirit1 = restlessSpirits[1] && isSameGap(restlessSpirits[1], gap);
            if (isOccupiedBySpirit0 || isOccupiedBySpirit1) return null;

            const isHovered = draggingSpiritIdx !== null && hoverGap && hoverGap.seatA === gap.seatA && hoverGap.seatB === gap.seatB;
            const targetSpiritIdx = activeSpiritIndex ?? (draggingSpiritIdx ?? 0);

            return (
              <div
                key={`empty_gap_${gap.seatA}_${gap.seatB}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateSpirit(targetSpiritIdx, {
                    betweenSeatA: gap.seatA,
                    betweenSeatB: gap.seatB,
                  });
                }}
                style={{
                  left: `${gap.x}%`,
                  top: `${gap.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                title={`Tap to place Spirit #${targetSpiritIdx + 1} between ${gap.nameA} & ${gap.nameB}`}
                className={`absolute z-15 flex items-center justify-center cursor-pointer transition-all ${
                  isHovered
                    ? 'w-8 h-8 rounded-full border-2 border-purple-400 bg-purple-900/80 shadow-[0_0_16px_rgba(168,85,247,0.9)] scale-125'
                    : 'w-6 h-6 rounded-full border border-dashed border-purple-500/40 hover:border-purple-300 hover:bg-purple-950/70 hover:scale-120'
                }`}
              >
                <Ghost className={`w-3 h-3 ${isHovered ? 'text-purple-200 animate-pulse' : 'text-purple-400/40'}`} />
              </div>
            );
          })}

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
            const isDragging = draggingSpiritIdx === sIdx;
            const isEvil = spirit.alignment === 'evil';
            const matchingGap = allGaps.find(g => isSameGap(spirit, g));
            const staticX = matchingGap ? matchingGap.x : getSpiritCoordinates(spirit, total).x;
            const staticY = matchingGap ? matchingGap.y : getSpiritCoordinates(spirit, total).y;
            const posX = isDragging && dragCoords ? dragCoords.x : staticX;
            const posY = isDragging && dragCoords ? dragCoords.y : staticY;

            const pA = players.find(p => p.seat === spirit.betweenSeatA);
            const pB = players.find(p => p.seat === spirit.betweenSeatB);
            const colA = pA ? getPlayerColor(pA.colorId) : undefined;
            const colB = pB ? getPlayerColor(pB.colorId) : undefined;
            const labelA = pA ? `${pA.name} (${colA?.name})` : `Seat ${spirit.betweenSeatA}`;
            const labelB = pB ? `${pB.name} (${colB?.name})` : `Seat ${spirit.betweenSeatB}`;
            const isSelected = activeSpiritIndex === sIdx;

            return (
              <div
                key={`spirit_${sIdx}`}
                onPointerDown={(e) => handleSpiritPointerDown(e, sIdx)}
                onPointerMove={handleSpiritPointerMove}
                onPointerUp={handleSpiritPointerUp}
                onPointerCancel={handleSpiritPointerUp}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSpiritIndex?.(sIdx);
                }}
                style={{
                  left: `${posX}%`,
                  top: `${posY}%`,
                  transform: 'translate(-50%, -50%)',
                  transition: isDragging ? 'none' : 'left 0.25s ease-out, top 0.25s ease-out, transform 0.15s ease',
                }}
                title={
                  onUpdateSpirit
                    ? `Spirit #${sIdx + 1} (${isEvil ? 'Evil' : 'Good'} Dot) - Drag to move or tap to select`
                    : `Restless Spirit #${sIdx + 1}: ${isEvil ? 'Evil' : 'Good'} Dot between ${labelA} & ${labelB}`
                }
                className={`absolute ${isDragging ? 'z-40' : 'z-20'} flex flex-col items-center select-none touch-none ${
                  onUpdateSpirit ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-auto'
                } ${isSelected && !isDragging ? 'scale-110' : ''}`}
              >
                <div
                  className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center shadow-lg transition-transform ${
                    isDragging
                      ? 'scale-130 shadow-[0_0_22px_rgba(168,85,247,0.95)] ring-2 ring-purple-300'
                      : isSelected
                      ? 'ring-2 ring-purple-400 ring-offset-1 ring-offset-black'
                      : 'hover:scale-115'
                  } ${
                    isEvil
                      ? 'bg-gradient-to-br from-red-950 via-zinc-950 to-red-900 border-red-500 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.7)]'
                      : 'bg-gradient-to-br from-blue-950 via-zinc-950 to-indigo-900 border-blue-400 text-blue-200 shadow-[0_0_12px_rgba(59,130,246,0.7)]'
                  }`}
                >
                  <Ghost className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isEvil ? 'text-red-400' : 'text-blue-300'} ${isDragging ? 'animate-bounce' : 'animate-pulse'}`} />
                  
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

          {/* Draggable Narrator Token */}
          {(() => {
            const angle = localNarratorAngle;
            const narratorRadius = 42;
            const nx = 50 + narratorRadius * Math.cos(angle);
            const ny = 50 + narratorRadius * Math.sin(angle);

            return (
              <div
                onPointerDown={handleNarratorPointerDown}
                onPointerMove={handleNarratorPointerMove}
                onPointerUp={handleNarratorPointerUp}
                onPointerCancel={handleNarratorPointerUp}
                style={{
                  left: `${nx}%`,
                  top: `${ny}%`,
                  transform: 'translate(-50%, -50%)',
                  transition: isDraggingNarrator ? 'none' : 'transform 0.15s ease',
                }}
                title="Narrator (Host) - Drag around the table to indicate where you are seated"
                className={`absolute z-25 flex flex-col items-center select-none touch-none cursor-grab active:cursor-grabbing ${
                  isDraggingNarrator ? 'z-50 scale-125' : 'hover:scale-115'
                }`}
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center shadow-lg transition-transform ${
                    isDraggingNarrator
                      ? 'bg-zinc-600 border-zinc-200 text-white shadow-[0_0_16px_rgba(255,255,255,0.6)] ring-2 ring-zinc-300'
                      : 'bg-zinc-700 hover:bg-zinc-600 border-zinc-400 text-zinc-100 shadow-black/80'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-zinc-200" />
                </div>
                <div className="mt-0.5 bg-black/90 backdrop-blur-sm px-1.5 py-0.2 rounded text-center border border-zinc-700 pointer-events-none">
                  <p className="text-[8px] sm:text-[9px] text-zinc-300 font-bold uppercase tracking-wider leading-none">
                    Narrator
                  </p>
                </div>
              </div>
            );
          })()}
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

                {spiritsBetween.map((spirit, sIdx) => {
                  const sPlayerA = players.find(x => x.seat === spirit.betweenSeatA);
                  const sPlayerB = players.find(x => x.seat === spirit.betweenSeatB);
                  const sColA = sPlayerA ? getPlayerColor(sPlayerA.colorId) : undefined;
                  const sColB = sPlayerB ? getPlayerColor(sPlayerB.colorId) : undefined;
                  const sNameA = sPlayerA ? `${sPlayerA.name} (${sColA?.name})` : `Seat ${spirit.betweenSeatA}`;
                  const sNameB = sPlayerB ? `${sPlayerB.name} (${sColB?.name})` : `Seat ${spirit.betweenSeatB}`;

                  return (
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
                            Positioned between {sNameA} and {sNameB} [Seats {spirit.betweenSeatA} & {spirit.betweenSeatB}]
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
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
