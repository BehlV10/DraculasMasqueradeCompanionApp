import React, { useState, useRef } from 'react';
import { Player, RoleType, RestlessSpirit } from '../types/game';
import { getPlayerColor } from '../utils/gameLogic';
import { HUNTERS } from '../data/gameData';
import { Heart, LayoutGrid, CircleDot, ShieldAlert, Sparkles, Ghost, BookOpen, ArrowUpDown, RotateCcw, RotateCw } from 'lucide-react';

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
  onSwapPlayers?: (playerAId: string, playerBId: string) => void;
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
  onSwapPlayers,
}) => {
  const [viewMode, setViewMode] = useState<'circle' | 'list'>('circle');

  // Sorted players & total
  const sortedPlayers = [...players].sort((a, b) => a.seat - b.seat);
  const total = sortedPlayers.length;

  // Default gap is between the last player and player 1 (e.g. between seat N and seat 1)
  const defaultGap = total > 0 ? {
    gapIndex: total - 0.5,
    baseAngle: ((total - 0.5) / total) * 2 * Math.PI + Math.PI / 2,
  } : null;

  // Effective narrator angle (if initial Math.PI / 2 default, anchor to default gap between last seat & seat 1)
  const effectiveNarratorAngle = (narratorAngle === Math.PI / 2 && defaultGap)
    ? defaultGap.baseAngle
    : narratorAngle;

  // Table rotation offset to ensure the chosen gap is always rotated to 6 o'clock (Math.PI / 2)
  const rotationOffset = Math.PI / 2 - effectiveNarratorAngle;

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
    const baseAngle = (gapIndex / total) * 2 * Math.PI + Math.PI / 2;
    const displayAngle = baseAngle + rotationOffset;
    const radius = 38;
    const x = 50 + radius * Math.cos(displayAngle);
    const y = 50 + radius * Math.sin(displayAngle);
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
      baseAngle,
      displayAngle,
      angle: displayAngle, // For backward compatibility with existing code
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

  const findClosestGap = (cursorDisplayAngle: number) => {
    if (allGaps.length === 0) return null;
    let bestGap = allGaps[0];
    let minDiff = Infinity;
    for (const gap of allGaps) {
      let diff = Math.abs(cursorDisplayAngle - gap.displayAngle) % (2 * Math.PI);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      if (diff < minDiff) {
        minDiff = diff;
        bestGap = gap;
      }
    }
    return bestGap;
  };

  const findClosestGapByBaseAngle = (baseAngle: number) => {
    if (allGaps.length === 0) return null;
    let bestGap = allGaps[0];
    let minDiff = Infinity;
    for (const gap of allGaps) {
      let diff = Math.abs(baseAngle - gap.baseAngle) % (2 * Math.PI);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      if (diff < minDiff) {
        minDiff = diff;
        bestGap = gap;
      }
    }
    return bestGap;
  };

  const handleNudgeRotation = (direction: 'cw' | 'ccw') => {
    if (!onUpdateNarratorAngle || allGaps.length === 0) return;
    const currentGap = findClosestGapByBaseAngle(effectiveNarratorAngle);
    const currentIndex = currentGap
      ? allGaps.findIndex(g => g.seatA === currentGap.seatA && g.seatB === currentGap.seatB)
      : 0;
    const step = direction === 'cw' ? 1 : -1;
    const nextIndex = (currentIndex + step + allGaps.length) % allGaps.length;
    onUpdateNarratorAngle(allGaps[nextIndex].baseAngle);
  };

  const handleResetRotation = () => {
    if (!onUpdateNarratorAngle) return;
    if (defaultGap) {
      onUpdateNarratorAngle(defaultGap.baseAngle);
    } else {
      onUpdateNarratorAngle(Math.PI / 2);
    }
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

    const baseAngle = (gapIndex / totalPlayers) * 2 * Math.PI + Math.PI / 2;
    const displayAngle = baseAngle + rotationOffset;
    const radius = 38;

    const x = 50 + radius * Math.cos(displayAngle);
    const y = 50 + radius * Math.sin(displayAngle);

    return { x, y };
  };

  // Restless Spirit drag state
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
  const [hoverNarratorGap, setHoverNarratorGap] = useState<typeof allGaps[0] | null>(null);
  const narratorDragMoved = useRef<boolean>(false);
  const narratorPointerStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const pointerStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const circleContainerRef = useRef<HTMLDivElement>(null);

  const handleNarratorPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onUpdateNarratorAngle) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingNarrator(true);
    setDragNarratorAngle(Math.PI / 2);
    narratorDragMoved.current = false;
    narratorPointerStartPos.current = { x: e.clientX, y: e.clientY };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // fallback
    }
  };

  const handleNarratorPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingNarrator) return;
    e.preventDefault();
    const dist = Math.hypot(
      e.clientX - narratorPointerStartPos.current.x,
      e.clientY - narratorPointerStartPos.current.y
    );
    if (dist > 6) {
      narratorDragMoved.current = true;
    }
    const rect = circleContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const cursorDisplayAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    setDragNarratorAngle(cursorDisplayAngle);

    const closest = findClosestGap(cursorDisplayAngle);
    setHoverNarratorGap(closest);
  };

  const handleNarratorPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingNarrator) return;
    e.preventDefault();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // fallback
    }

    if (narratorDragMoved.current && hoverNarratorGap && onUpdateNarratorAngle) {
      onUpdateNarratorAngle(hoverNarratorGap.baseAngle);
    }

    setIsDraggingNarrator(false);
    setDragNarratorAngle(null);
    setHoverNarratorGap(null);
    narratorDragMoved.current = false;
  };

  // Seat swapping state (BOTC style)
  const [swapSourcePlayerId, setSwapSourcePlayerId] = useState<string | null>(null);
  const [draggingSeatPlayerId, setDraggingSeatPlayerId] = useState<string | null>(null);
  const [dragSeatCoords, setDragSeatCoords] = useState<{ x: number; y: number } | null>(null);
  const [hoverSeatPlayerId, setHoverSeatPlayerId] = useState<string | null>(null);

  const seatPointerStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const seatDragCandidateId = useRef<string | null>(null);

  const handleSeatPointerDown = (e: React.PointerEvent<HTMLDivElement>, pId: string) => {
    if (!onSwapPlayers) return;
    e.stopPropagation();
    seatPointerStartPos.current = { x: e.clientX, y: e.clientY };
    seatDragCandidateId.current = pId;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // fallback
    }
  };

  const handleSeatPointerMove = (e: React.PointerEvent<HTMLDivElement>, pId: string) => {
    if (!onSwapPlayers || seatDragCandidateId.current !== pId) return;
    const dist = Math.hypot(
      e.clientX - seatPointerStartPos.current.x,
      e.clientY - seatPointerStartPos.current.y
    );
    if (dist > 8) {
      if (draggingSeatPlayerId !== pId) {
        setDraggingSeatPlayerId(pId);
      }
      const rect = circleContainerRef.current?.getBoundingClientRect();
      if (rect) {
        const relX = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
        const relY = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));
        setDragSeatCoords({ x: relX, y: relY });

        // Find which other player seat the pointer is hovering over (including table rotationOffset)
        let closestPlayerId: string | null = null;
        let minDistance = Infinity;

        players.forEach((otherP, idx) => {
          if (otherP.id === pId) return;
          const baseAngle = (idx / players.length) * 2 * Math.PI + Math.PI / 2;
          const displayAngle = baseAngle + rotationOffset;
          const radius = 38;
          const targetX = 50 + radius * Math.cos(displayAngle);
          const targetY = 50 + radius * Math.sin(displayAngle);
          const d = Math.hypot(relX - targetX, relY - targetY);
          if (d < 16 && d < minDistance) {
            minDistance = d;
            closestPlayerId = otherP.id;
          }
        });

        setHoverSeatPlayerId(closestPlayerId);
      }
    }
  };

  const handleSeatPointerUp = (e: React.PointerEvent<HTMLDivElement>, pId: string) => {
    if (!onSwapPlayers || seatDragCandidateId.current !== pId) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // fallback
    }

    const dist = Math.hypot(
      e.clientX - seatPointerStartPos.current.x,
      e.clientY - seatPointerStartPos.current.y
    );

    if (dist > 8 && draggingSeatPlayerId === pId) {
      // Drag & drop finished
      if (hoverSeatPlayerId && hoverSeatPlayerId !== pId) {
        onSwapPlayers(pId, hoverSeatPlayerId);
        setSwapSourcePlayerId(null);
      }
    } else {
      // Clean tap / click
      if (swapSourcePlayerId === null) {
        setSwapSourcePlayerId(pId);
      } else if (swapSourcePlayerId === pId) {
        setSwapSourcePlayerId(null);
      } else {
        onSwapPlayers(swapSourcePlayerId, pId);
        setSwapSourcePlayerId(null);
      }
    }

    seatDragCandidateId.current = null;
    setDraggingSeatPlayerId(null);
    setDragSeatCoords(null);
    setHoverSeatPlayerId(null);
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
          onClick={() => {
            if (swapSourcePlayerId) setSwapSourcePlayerId(null);
          }}
          className="relative w-full max-w-[340px] xs:max-w-[380px] sm:max-w-[420px] aspect-square mx-auto my-2 select-none"
        >
          {/* Table Center Graphic */}
          <div className="absolute inset-[24%] rounded-full bg-gradient-to-br from-zinc-900 to-[#181928] border border-rose-950/60 shadow-inner flex flex-col items-center justify-center text-center p-2 z-0">
            <span className="text-xs font-serif font-bold text-rose-200/90 tracking-wider">
              MASQUERADE
            </span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Seating Table</span>
            <div className="flex items-center gap-2 mt-1 text-[9px] text-zinc-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-600 inline-block" /> Evil
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Good
              </span>
            </div>
            {restlessSpirits.length > 0 && (
              <div className="mt-0.5 px-1.5 py-0.5 rounded-md bg-purple-950/80 border border-purple-800 text-[8px] sm:text-[9px] text-purple-200 flex items-center gap-1 font-medium">
                <Ghost className="w-2.5 h-2.5 text-purple-400" />
                <span>{restlessSpirits.length} Spirits</span>
              </div>
            )}
            {onSwapPlayers && (
              <div className="flex items-center gap-1 mt-0.5 text-[8px] sm:text-[9px] text-amber-300/80 font-medium">
                <ArrowUpDown className="w-2.5 h-2.5" />
                <span>Tap/drag seats to swap</span>
              </div>
            )}
            {onUpdateNarratorAngle && (
              <div className="flex items-center gap-1.5 mt-1 z-10" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => handleNudgeRotation('ccw')}
                  title="Rotate Table Counter-Clockwise (POV)"
                  className="p-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 active:scale-95 text-zinc-400 hover:text-zinc-200 transition-all border border-zinc-700/60"
                >
                  <RotateCcw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleResetRotation}
                  title="Reset Host POV to default"
                  className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] bg-zinc-800/80 hover:bg-zinc-700 active:scale-95 text-zinc-400 hover:text-zinc-200 transition-all border border-zinc-700/60 font-mono font-medium"
                >
                  POV
                </button>
                <button
                  type="button"
                  onClick={() => handleNudgeRotation('cw')}
                  title="Rotate Table Clockwise (POV)"
                  className="p-1 rounded-full bg-zinc-800/80 hover:bg-zinc-700 active:scale-95 text-zinc-400 hover:text-zinc-200 transition-all border border-zinc-700/60"
                >
                  <RotateCw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>
              </div>
            )}
            <span className="text-[8px] sm:text-[9px] text-zinc-500 italic mt-0.5">Clockwise ➔</span>
          </div>

          {/* Narrator Dragging Hover Banner */}
          {isDraggingNarrator && hoverNarratorGap && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-35 px-3 py-1 rounded-full bg-zinc-900/95 border border-zinc-400 text-[10px] sm:text-xs text-zinc-100 font-bold shadow-[0_0_18px_rgba(255,255,255,0.4)] pointer-events-none whitespace-nowrap flex items-center gap-1.5 animate-pulse">
              <BookOpen className="w-3.5 h-3.5 text-zinc-300" />
              <span>Stand between {hoverNarratorGap.nameA} ↔ {hoverNarratorGap.nameB} (Drop to rotate table)</span>
            </div>
          )}

          {/* Narrator Drag Hover Gap Ring */}
          {isDraggingNarrator && hoverNarratorGap && (
            <div
              style={{
                left: `${hoverNarratorGap.x}%`,
                top: `${hoverNarratorGap.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute z-25 w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-dashed border-zinc-200 bg-zinc-700/50 shadow-[0_0_20px_rgba(255,255,255,0.7)] pointer-events-none animate-pulse flex items-center justify-center"
            >
              <BookOpen className="w-4 h-4 text-zinc-100" />
            </div>
          )}

          {/* Seat Dragging Hover Banner */}
          {draggingSeatPlayerId !== null && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-35 px-3 py-1 rounded-full bg-emerald-950/95 border border-emerald-400 text-[10px] sm:text-xs text-emerald-200 font-bold shadow-[0_0_18px_rgba(52,211,153,0.8)] pointer-events-none whitespace-nowrap animate-pulse flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-emerald-300" />
              <span>
                {hoverSeatPlayerId
                  ? `Drop to swap with ${players.find(p => p.id === hoverSeatPlayerId)?.name || 'Seat'}`
                  : 'Drag onto another seat to swap'}
              </span>
            </div>
          )}

          {/* Seat Tap-to-Swap Banner */}
          {swapSourcePlayerId !== null && draggingSeatPlayerId === null && (() => {
            const sourceP = players.find(p => p.id === swapSourcePlayerId);
            return (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-35 px-3 py-1 rounded-full bg-amber-950/95 border border-amber-400 text-[10px] sm:text-xs text-amber-200 font-bold shadow-[0_0_18px_rgba(251,191,36,0.8)] flex items-center gap-2 whitespace-nowrap">
                <ArrowUpDown className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
                <span>Tap a seat to swap with {sourceP?.name || `Seat ${sourceP?.seat}`}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSwapSourcePlayerId(null);
                  }}
                  className="ml-1 text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            );
          })()}

          {/* Drag Hover Snap Banner (Spirits) */}
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
                  transition: 'left 0.4s cubic-bezier(0.25, 1, 0.5, 1), top 0.4s cubic-bezier(0.25, 1, 0.5, 1), transform 0.15s ease',
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
            const baseAngle = (index / total) * 2 * Math.PI + Math.PI / 2; // start from bottom (6 o'clock)
            const displayAngle = baseAngle + rotationOffset;
            // Calculate coordinates (percentage radius around center: ~38%)
            const radius = 38;
            const x = 50 + radius * Math.cos(displayAngle);
            const y = 50 + radius * Math.sin(displayAngle);
            const pColor = getPlayerColor(p.colorId);
            const isSelected = selectedPlayerId === p.id;
            const isSwapSource = swapSourcePlayerId === p.id;
            const isDraggingThis = draggingSeatPlayerId === p.id;
            const isHoverTarget = hoverSeatPlayerId === p.id;
            const isSwapTarget = swapSourcePlayerId !== null && swapSourcePlayerId !== p.id;

            return (
              <div
                key={p.id}
                onPointerDown={(e) => handleSeatPointerDown(e, p.id)}
                onPointerMove={(e) => handleSeatPointerMove(e, p.id)}
                onPointerUp={(e) => handleSeatPointerUp(e, p.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!onSwapPlayers && onSelectPlayer) {
                    onSelectPlayer(p);
                  }
                }}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                  transition: isDraggingThis
                    ? 'none'
                    : 'left 0.4s cubic-bezier(0.25, 1, 0.5, 1), top 0.4s cubic-bezier(0.25, 1, 0.5, 1), transform 0.15s ease',
                }}
                className={`absolute z-10 flex flex-col items-center transition-all select-none ${
                  onSwapPlayers
                    ? 'touch-none cursor-grab active:cursor-grabbing'
                    : interactive
                    ? 'cursor-pointer hover:scale-110'
                    : ''
                } ${
                  isDraggingThis
                    ? 'opacity-30 scale-90 pointer-events-none'
                    : isHoverTarget
                    ? 'scale-125 z-30'
                    : isSwapSource
                    ? 'scale-120 z-30'
                    : isSwapTarget
                    ? 'hover:scale-120 cursor-pointer'
                    : isSelected
                    ? 'scale-115 ring-2 ring-rose-400 rounded-full'
                    : ''
                }`}
              >
                {/* Seat Avatar Bubble */}
                <div
                  style={{
                    backgroundColor: pColor.hex,
                    borderColor: pColor.borderHex || 'rgba(255,255,255,0.2)',
                  }}
                  className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 flex items-center justify-center shadow-md shadow-black/60 transition-all ${
                    isHoverTarget
                      ? 'ring-4 ring-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.9)]'
                      : isSwapSource
                      ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-zinc-950 shadow-[0_0_20px_rgba(251,191,36,0.9)] animate-pulse'
                      : isSwapTarget
                      ? 'hover:ring-2 hover:ring-amber-300'
                      : ''
                  }`}
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

          {/* Dragging Seat Floating Avatar Preview */}
          {draggingSeatPlayerId && dragSeatCoords && (() => {
            const draggedPlayer = players.find(p => p.id === draggingSeatPlayerId);
            if (!draggedPlayer) return null;
            const dColor = getPlayerColor(draggedPlayer.colorId);
            return (
              <div
                style={{
                  left: `${dragSeatCoords.x}%`,
                  top: `${dragSeatCoords.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute z-40 pointer-events-none flex flex-col items-center select-none"
              >
                <div
                  style={{
                    backgroundColor: dColor.hex,
                    borderColor: dColor.borderHex || 'rgba(255,255,255,0.4)',
                  }}
                  className="w-10 h-10 rounded-full border-2 flex items-center justify-center shadow-[0_0_25px_rgba(0,0,0,0.9)] ring-2 ring-white/60 animate-pulse"
                >
                  <div className="absolute -top-1.5 -right-1.5">
                    {getRoleBadge(draggedPlayer)}
                  </div>
                </div>
                <div className="mt-1 bg-black/90 px-2 py-0.5 rounded text-[10px] text-white font-bold border border-zinc-700 shadow-md whitespace-nowrap">
                  {draggedPlayer.name || `P${draggedPlayer.seat}`}
                </div>
              </div>
            );
          })()}

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
                  transition: isDragging ? 'none' : 'left 0.4s cubic-bezier(0.25, 1, 0.5, 1), top 0.4s cubic-bezier(0.25, 1, 0.5, 1), transform 0.15s ease',
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

          {/* Draggable Narrator Token (Anchored at 6 o'clock POV by default, draggable to rotate table) */}
          {(() => {
            const displayAngle = isDraggingNarrator && dragNarratorAngle !== null
              ? dragNarratorAngle
              : Math.PI / 2;
            const narratorRadius = 43;
            const nx = 50 + narratorRadius * Math.cos(displayAngle);
            const ny = 50 + narratorRadius * Math.sin(displayAngle);

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
                  transition: isDraggingNarrator
                    ? 'none'
                    : 'left 0.4s cubic-bezier(0.25, 1, 0.5, 1), top 0.4s cubic-bezier(0.25, 1, 0.5, 1), transform 0.15s ease',
                }}
                title={
                  onUpdateNarratorAngle
                    ? "Host POV (Narrator) - Drag to where you are standing in the room to rotate table"
                    : "Host POV (Narrator)"
                }
                className={`absolute z-25 flex flex-col items-center select-none touch-none ${
                  onUpdateNarratorAngle ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
                } ${
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
        <div className="space-y-2">
          {swapSourcePlayerId !== null && (() => {
            const sourceP = players.find(p => p.id === swapSourcePlayerId);
            return (
              <div className="p-2 rounded-xl bg-amber-950/90 border border-amber-400 text-xs text-amber-200 font-bold flex items-center justify-between shadow-md">
                <span className="flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
                  Tap another seat to swap with {sourceP?.name || `Seat ${sourceP?.seat}`}
                </span>
                <button
                  type="button"
                  onClick={() => setSwapSourcePlayerId(null)}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1">
            {players.map((p, pIdx) => {
              const pColor = getPlayerColor(p.colorId);
              const isSelected = selectedPlayerId === p.id;
              const isSwapSource = swapSourcePlayerId === p.id;
              const nextSeat = (p.seat % total) + 1;
              const spiritsBetween = restlessSpirits.filter(
                s => (s.betweenSeatA === p.seat && s.betweenSeatB === nextSeat) ||
                     (s.betweenSeatB === p.seat && s.betweenSeatA === nextSeat)
              );

              return (
                <React.Fragment key={p.id}>
                  <div
                    onClick={() => {
                      if (onSwapPlayers) {
                        if (swapSourcePlayerId === null) {
                          setSwapSourcePlayerId(p.id);
                        } else if (swapSourcePlayerId === p.id) {
                          setSwapSourcePlayerId(null);
                        } else {
                          onSwapPlayers(swapSourcePlayerId, p.id);
                          setSwapSourcePlayerId(null);
                        }
                      } else if (onSelectPlayer) {
                        onSelectPlayer(p);
                      }
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                      isSwapSource
                        ? 'bg-amber-950/50 border-amber-400 ring-2 ring-amber-400 shadow-md'
                        : isSelected
                        ? 'bg-rose-950/40 border-rose-600'
                        : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-800/50'
                    } ${interactive || onSwapPlayers ? 'cursor-pointer' : ''}`}
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
                      {onSwapPlayers && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (swapSourcePlayerId === p.id) {
                              setSwapSourcePlayerId(null);
                            } else if (swapSourcePlayerId === null) {
                              setSwapSourcePlayerId(p.id);
                            } else {
                              onSwapPlayers(swapSourcePlayerId, p.id);
                              setSwapSourcePlayerId(null);
                            }
                          }}
                          className={`p-1 rounded-lg border transition-colors ${
                            isSwapSource
                              ? 'bg-amber-500 text-black border-amber-300'
                              : 'bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:text-amber-300 hover:border-amber-500'
                          }`}
                          title="Swap seat with another player"
                        >
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                      )}
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
        </div>
      )}
    </div>
  );
};
