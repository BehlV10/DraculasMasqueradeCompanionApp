import React from 'react';
import { GameSettings, HunterType, Player, RoleType, RestlessSpirit, DarkBlessingId } from '../types/game';
import { GUEST_LIST_RULES, HUNTERS, OFFICIAL_COLORS, BASE_COLORS, VARIANT_COLORS, DARK_BLESSINGS } from '../data/gameData';
import { getPlayerColor } from '../utils/gameLogic';
import { SeatingChart } from './SeatingChart';
import { Users, Shuffle, ArrowRight, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';

interface SetupTabProps {
  settings: GameSettings;
  setSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  restlessSpirits?: RestlessSpirit[];
  narratorAngle?: number;
  onUpdateNarratorAngle?: (angle: number) => void;
  onStartNight: () => void;
}

export const SetupTab: React.FC<SetupTabProps> = ({
  settings,
  setSettings,
  players,
  setPlayers,
  restlessSpirits,
  narratorAngle,
  onUpdateNarratorAngle,
  onStartNight,
}) => {
  const currentRule = GUEST_LIST_RULES[settings.playerCount] || GUEST_LIST_RULES[8];

  // Change player count
  const handlePlayerCountChange = (count: number) => {
    const newRule = GUEST_LIST_RULES[count] || GUEST_LIST_RULES[8];
    // Adjust selected hunters: strictly clamp to newRule.hunters
    let newHunters = [...settings.selectedHunters];
    if (newRule.hunters === 0) {
      newHunters = [];
    } else if (newHunters.length > newRule.hunters) {
      newHunters = newHunters.slice(0, newRule.hunters);
    } else if (newHunters.length < newRule.hunters) {
      const remaining = HUNTERS.map(h => h.id).filter(id => !newHunters.includes(id));
      newHunters = [...newHunters, ...remaining.slice(0, newRule.hunters - newHunters.length)];
    }

    setSettings(prev => ({
      ...prev,
      playerCount: count,
      selectedHunters: newHunters,
      explorationTimeMinutes: newRule.explorationTime,
      finaleTimeMinutes: newRule.finaleTime,
    }));

    // Adjust players array
    let adjusted: Player[] = [];
    if (players.length < count) {
      const added: Player[] = [];
      for (let i = players.length; i < count; i++) {
        const color = OFFICIAL_COLORS[i % OFFICIAL_COLORS.length];
        added.push({
          id: `player_${Date.now()}_${i}`,
          seat: i + 1,
          name: `Player ${i + 1}`,
          colorId: color.id,
          role: 'guest',
          heartsRemaining: 3,
        });
      }
      adjusted = [...players, ...added];
    } else {
      adjusted = players.slice(0, count);
    }

    // Sanitize existing player roles against newRule limits
    let hunterCount = 0;
    let brideCount = 0;
    let draculaCount = 0;

    adjusted = adjusted.map(p => {
      let role = p.role;
      let hunterType = p.hunterType;

      if (role === 'dracula') {
        if (draculaCount >= newRule.dracula) {
          role = 'guest';
        } else {
          draculaCount++;
        }
      } else if (role === 'bride') {
        if (brideCount >= newRule.brides) {
          role = 'guest';
        } else {
          brideCount++;
        }
      } else if (role === 'hunter') {
        if (newRule.hunters === 0 || hunterCount >= newRule.hunters) {
          role = 'guest';
          hunterType = undefined;
        } else {
          if (!hunterType || !newHunters.includes(hunterType)) {
            hunterType = newHunters[hunterCount];
          }
          hunterCount++;
        }
      }

      return {
        ...p,
        role,
        hunterType,
      };
    });

    setPlayers(adjusted);
  };

  // Toggle Hunter inclusion
  const toggleHunter = (hunterId: HunterType) => {
    const isSelected = settings.selectedHunters.includes(hunterId);
    let updated: HunterType[];
    if (isSelected) {
      updated = settings.selectedHunters.filter(id => id !== hunterId);
    } else {
      if (settings.selectedHunters.length >= currentRule.hunters) {
        // Swap out the first one
        updated = [...settings.selectedHunters.slice(1), hunterId];
      } else {
        updated = [...settings.selectedHunters, hunterId];
      }
    }
    setSettings(prev => ({ ...prev, selectedHunters: updated }));
  };

  const selectedBlessingIds = settings.selectedBlessingIds || [1, 2, 3, 4, 5];

  const handleSelectBlessingPreset = (preset: 'set1' | 'set2') => {
    const ids: DarkBlessingId[] = preset === 'set1' ? [1, 2, 3, 4, 5] : [6, 7, 8, 9, 10];
    setSettings(prev => ({ ...prev, selectedBlessingIds: ids }));
  };

  const toggleBlessing = (bId: DarkBlessingId) => {
    const isSelected = selectedBlessingIds.includes(bId);
    let updated: DarkBlessingId[];
    if (isSelected) {
      if (selectedBlessingIds.length <= 1) return; // Keep at least one
      updated = selectedBlessingIds.filter(id => id !== bId);
    } else {
      if (selectedBlessingIds.length >= 5) {
        // Swap out the first one to always maintain exactly 5
        updated = [...selectedBlessingIds.slice(1), bId];
      } else {
        updated = [...selectedBlessingIds, bId];
      }
    }
    setSettings(prev => ({ ...prev, selectedBlessingIds: updated }));
  };

  // Update a single player's details
  const updatePlayer = (index: number, updates: Partial<Player>) => {
    setPlayers(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  // Update a player's color with smart auto-swap if color is already in use by someone else
  const updatePlayerColor = (playerIndex: number, newColorId: string) => {
    const existingPlayerIndex = players.findIndex(
      (p, idx) => idx !== playerIndex && p.colorId === newColorId
    );
    if (existingPlayerIndex !== -1) {
      // Auto-swap colors with that player so colors stay 100% unique!
      setPlayers(prev => {
        const copy = [...prev];
        const oldColor = copy[playerIndex].colorId;
        copy[playerIndex] = { ...copy[playerIndex], colorId: newColorId };
        copy[existingPlayerIndex] = { ...copy[existingPlayerIndex], colorId: oldColor };
        return copy;
      });
    } else {
      updatePlayer(playerIndex, { colorId: newColorId });
    }
  };

  // Swap physical positions / profiles of two players on the circular table (BOTC style)
  const handleSwapPlayers = (playerAId: string, playerBId: string) => {
    if (playerAId === playerBId) return;
    setPlayers(prev => {
      const idxA = prev.findIndex(p => p.id === playerAId);
      const idxB = prev.findIndex(p => p.id === playerBId);
      if (idxA === -1 || idxB === -1) return prev;

      const copy = [...prev];
      const pA = copy[idxA];
      const pB = copy[idxB];

      copy[idxA] = {
        ...pB,
        seat: pA.seat,
      };
      copy[idxB] = {
        ...pA,
        seat: pB.seat,
      };
      return copy;
    });
  };

  // Auto-Deal / Randomize Roles to seats
  const autoDealRoles = () => {
    const rolesPool: { role: RoleType; hunterType?: HunterType }[] = [];
    rolesPool.push({ role: 'dracula' });
    for (let i = 0; i < currentRule.brides; i++) {
      rolesPool.push({ role: 'bride' });
    }
    if (currentRule.hunters > 0) {
      settings.selectedHunters.slice(0, currentRule.hunters).forEach(hId => {
        rolesPool.push({ role: 'hunter', hunterType: hId });
      });
    }
    for (let i = 0; i < currentRule.guests; i++) {
      rolesPool.push({ role: 'guest' });
    }

    // Shuffle roles
    const shuffled = [...rolesPool].sort(() => Math.random() - 0.5);

    setPlayers(prev =>
      prev.map((p, idx) => ({
        ...p,
        role: shuffled[idx]?.role || 'guest',
        hunterType: shuffled[idx]?.hunterType,
        heartsRemaining: 3,
        isCorrupted: false,
        isPuppet: false,
      }))
    );
  };

  // Role count validation
  const currentDracula = players.filter(p => p.role === 'dracula').length;
  const currentBrides = players.filter(p => p.role === 'bride').length;
  const currentHunters = players.filter(p => p.role === 'hunter').length;
  const currentGuests = players.filter(p => p.role === 'guest').length;

  const isRoleCountValid =
    currentDracula === currentRule.dracula &&
    currentBrides === currentRule.brides &&
    currentHunters === currentRule.hunters &&
    currentGuests === currentRule.guests &&
    settings.selectedHunters.length === currentRule.hunters;

  // Color uniqueness validation
  const colorCounts: Record<string, number> = {};
  players.forEach(p => {
    colorCounts[p.colorId] = (colorCounts[p.colorId] || 0) + 1;
  });
  const duplicateColorIds = Object.keys(colorCounts).filter(id => colorCounts[id] > 1);
  const hasDuplicateColors = duplicateColorIds.length > 0;

  const isRosterValid = isRoleCountValid && !hasDuplicateColors;

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Player Count & Guest List Rule */}
      <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm sm:text-base font-serif font-bold text-rose-100">
              Step 1: Party Count & Roles
            </h2>
          </div>
          <span className="text-xs font-mono font-bold bg-rose-950 text-rose-300 px-2.5 py-1 rounded-full border border-rose-800">
            {settings.playerCount} Players
          </span>
        </div>

        {/* Player Count Chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Array.from({ length: 11 }, (_, i) => i + 5).map(count => (
            <button
              key={count}
              onClick={() => handlePlayerCountChange(count)}
              className={`flex-1 min-w-[34px] py-1.5 rounded-xl text-xs font-bold transition-all ${
                settings.playerCount === count
                  ? 'bg-gradient-to-br from-rose-700 to-red-600 text-white shadow-md shadow-rose-950'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {count}
            </button>
          ))}
        </div>

        {/* Guest List Distribution Banner */}
        <div className="bg-zinc-950/70 rounded-xl p-2.5 border border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="p-1.5 rounded-lg bg-red-950/30 border border-red-900/40">
            <span className="block text-[10px] text-zinc-400 uppercase">Dracula</span>
            <span className="font-bold text-red-400 text-sm">
              {currentDracula} / {currentRule.dracula}
            </span>
          </div>
          <div className="p-1.5 rounded-lg bg-red-950/30 border border-red-900/40">
            <span className="block text-[10px] text-zinc-400 uppercase">Brides</span>
            <span className="font-bold text-red-400 text-sm">
              {currentBrides} / {currentRule.brides}
            </span>
          </div>
          <div className="p-1.5 rounded-lg bg-blue-950/30 border border-blue-900/40">
            <span className="block text-[10px] text-zinc-400 uppercase">Hunters</span>
            <span className="font-bold text-blue-400 text-sm">
              {currentHunters} / {currentRule.hunters}
            </span>
          </div>
          <div className="p-1.5 rounded-lg bg-blue-950/30 border border-blue-900/40">
            <span className="block text-[10px] text-zinc-400 uppercase">Guests</span>
            <span className="font-bold text-blue-400 text-sm">
              {currentGuests} / {currentRule.guests}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Choose Hunters */}
      {currentRule.hunters > 0 && (
        <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-300">
              Select {currentRule.hunters} Hunters in Play
            </h3>
            <span className="text-[11px] font-mono text-blue-400">
              {settings.selectedHunters.length} of {currentRule.hunters} selected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {HUNTERS.map(hunter => {
              const isSelected = settings.selectedHunters.includes(hunter.id);
              return (
                <div
                  key={hunter.id}
                  onClick={() => toggleHunter(hunter.id)}
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-950/50 border-blue-600 text-blue-100 shadow-sm'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-blue-900 border border-blue-700 text-blue-200 text-xs font-mono font-bold flex items-center justify-center">
                        {hunter.number}
                      </span>
                      <span className="text-xs font-bold text-zinc-100">
                        {hunter.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">
                      [{hunter.initials}]
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                    {hunter.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2b. Choose Dark Blessings Pool (5 of 10) */}
      <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div>
            <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Dark Blessings Pool ({selectedBlessingIds.length} of 5 Active)
            </h3>
            <p className="text-[11px] text-zinc-400">
              Dracula secretly chooses 1 from this 5-card pool during the Night phase (holding up 1–5 fingers).
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleSelectBlessingPreset('set1')}
              className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all ${
                selectedBlessingIds.length === 5 && [1, 2, 3, 4, 5].every(id => selectedBlessingIds.includes(id as any))
                  ? 'bg-purple-950 text-purple-200 border-purple-500 shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border-zinc-800'
              }`}
            >
              Set 1 (Base 1–5)
            </button>
            <button
              type="button"
              onClick={() => handleSelectBlessingPreset('set2')}
              className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all ${
                selectedBlessingIds.length === 5 && [6, 7, 8, 9, 10].every(id => selectedBlessingIds.includes(id as any))
                  ? 'bg-purple-950 text-purple-200 border-purple-500 shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border-zinc-800'
              }`}
            >
              Set 2 (Advanced 6–10)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          {DARK_BLESSINGS.map(b => {
            const isSelected = selectedBlessingIds.includes(b.id);
            const slotIndex = isSelected ? selectedBlessingIds.indexOf(b.id) + 1 : null;
            return (
              <div
                key={b.id}
                onClick={() => toggleBlessing(b.id)}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-purple-950/60 border-purple-500 text-purple-100 shadow-sm'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full text-xs font-mono font-bold flex items-center justify-center ${
                      isSelected
                        ? 'bg-purple-800 border border-purple-500 text-white'
                        : 'bg-zinc-800 border border-zinc-700 text-zinc-400'
                    }`}>
                      {isSelected ? `#${slotIndex}` : b.id}
                    </span>
                    <span className="text-xs font-bold text-zinc-100">
                      {b.name}
                    </span>
                  </div>
                  <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                    b.set === 1
                      ? 'bg-rose-950/60 text-rose-300 border-rose-900/80'
                      : 'bg-indigo-950/60 text-indigo-300 border-indigo-900/80'
                  }`}>
                    Set {b.set}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                  {b.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Seating Chart Visualization */}
      <SeatingChart
        players={players}
        restlessSpirits={restlessSpirits}
        interactive
        narratorAngle={narratorAngle}
        onUpdateNarratorAngle={onUpdateNarratorAngle}
        onSwapPlayers={handleSwapPlayers}
      />

      {/* 4. Player Roster & Role Assignment */}
      <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm sm:text-base font-serif font-bold text-rose-100">
              Step 2: Assign Seats & Secret Roles
            </h2>
            <p className="text-[11px] text-zinc-400">
              Record player names, colors, and their dealt role. Tap or drag seats on the circular table to swap seating positions.
            </p>
          </div>

          <button
            onClick={autoDealRoles}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-700 text-purple-200 text-xs font-semibold shadow-sm transition-transform active:scale-95"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Auto-Deal / Randomize</span>
          </button>
        </div>

        {/* Players List Table */}
        <div className="space-y-2">
          {players.map((p, idx) => {
            return (
              <div
                key={p.id}
                className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                {/* Seat & Name */}
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-200 font-mono font-bold text-xs flex items-center justify-center border border-zinc-700">
                    {p.seat}
                  </span>

                  {/* Name Input */}
                  <input
                    type="text"
                    value={p.name}
                    onChange={e => updatePlayer(idx, { name: e.target.value })}
                    placeholder={`Player ${p.seat}`}
                    className="bg-zinc-900 border border-zinc-700/80 text-zinc-200 text-xs font-medium rounded-lg px-2.5 py-1.5 w-28 sm:w-36 focus:outline-none focus:border-rose-500"
                  />

                  {/* Color Select */}
                  <select
                    value={p.colorId}
                    onChange={e => updatePlayerColor(idx, e.target.value)}
                    className={`bg-zinc-900 border text-xs rounded-lg px-2 py-1.5 focus:outline-none font-medium transition-colors ${
                      duplicateColorIds.includes(p.colorId)
                        ? 'border-amber-500 bg-amber-950/40 text-amber-200 ring-1 ring-amber-500'
                        : 'border-zinc-700/80 text-zinc-200 focus:border-rose-500'
                    }`}
                  >
                    <optgroup label="Standard Colors">
                      {BASE_COLORS.map(c => {
                        const otherP = players.find((o, oIdx) => oIdx !== idx && o.colorId === c.id);
                        return (
                          <option key={c.id} value={c.id}>
                            {c.name}{otherP ? ` • Swaps with ${otherP.name || `P${otherP.seat}`}` : ''}
                          </option>
                        );
                      })}
                    </optgroup>
                    <optgroup label="Dark / Light Shades">
                      {VARIANT_COLORS.map(c => {
                        const otherP = players.find((o, oIdx) => oIdx !== idx && o.colorId === c.id);
                        return (
                          <option key={c.id} value={c.id}>
                            {c.name}{otherP ? ` • Swaps with ${otherP.name || `P${otherP.seat}`}` : ''}
                          </option>
                        );
                      })}
                    </optgroup>
                  </select>
                </div>

                {/* Role Assignment */}
                <div className="flex items-center gap-1.5">
                  <select
                    value={p.role === 'hunter' ? `hunter:${p.hunterType}` : p.role}
                    onChange={e => {
                      const val = e.target.value;
                      if (val.startsWith('hunter:')) {
                        const hType = val.split(':')[1] as HunterType;
                        updatePlayer(idx, { role: 'hunter', hunterType: hType });
                      } else {
                        updatePlayer(idx, { role: val as RoleType, hunterType: undefined });
                      }
                    }}
                    className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border focus:outline-none ${
                      p.role === 'dracula'
                        ? 'bg-red-950 text-red-200 border-red-700'
                        : p.role === 'bride'
                        ? 'bg-rose-950 text-rose-200 border-rose-800'
                        : p.role === 'hunter'
                        ? 'bg-blue-950 text-blue-200 border-blue-700'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-700'
                    }`}
                  >
                    <option value="guest">Guest (Good)</option>
                    <option value="dracula">Dracula (Evil)</option>
                    <option value="bride">Bride of Dracula (Evil)</option>
                    {settings.selectedHunters.map(hId => {
                      const hunter = HUNTERS.find(h => h.id === hId);
                      return (
                        <option key={hId} value={`hunter:${hId}`}>
                          Hunter: {hunter?.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        {/* Validation Errors/Notices */}
        {hasDuplicateColors && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-950/50 border border-amber-700/80 flex items-center gap-2 text-xs text-amber-200 shadow-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
            <span>
              Duplicate colors detected:{' '}
              <strong className="text-amber-100 font-semibold">
                {duplicateColorIds.map(id => getPlayerColor(id).name).join(', ')}
              </strong>
              . Each player must have a unique color clip before starting.
            </span>
          </div>
        )}

        {!isRoleCountValid && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-center gap-2 text-xs text-amber-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
            <span>
              Roster must match Guest List table: Exactly {currentRule.dracula} Dracula, {currentRule.brides} Bride(s), {currentRule.hunters} Hunter(s), and {currentRule.guests} Guest(s).
            </span>
          </div>
        )}

        {/* Lock & Start Button */}
        <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onStartNight}
            disabled={!isRosterValid}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
              isRosterValid
                ? 'bg-gradient-to-r from-red-700 to-rose-600 hover:from-red-600 hover:to-rose-500 text-white shadow-rose-950/60 active:scale-95'
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Confirm Roster & Begin Night Phase</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
