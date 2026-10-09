import React from 'react';
import { GameSettings, HunterType, Player, RoleType } from '../types/game';
import { GUEST_LIST_RULES, HUNTERS, OFFICIAL_COLORS } from '../data/gameData';
import { SeatingChart } from './SeatingChart';
import { Users, Shuffle, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface SetupTabProps {
  settings: GameSettings;
  setSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  onStartNight: () => void;
}

export const SetupTab: React.FC<SetupTabProps> = ({
  settings,
  setSettings,
  players,
  setPlayers,
  onStartNight,
}) => {
  const currentRule = GUEST_LIST_RULES[settings.playerCount] || GUEST_LIST_RULES[8];

  // Change player count
  const handlePlayerCountChange = (count: number) => {
    const newRule = GUEST_LIST_RULES[count];
    // Adjust selected hunters if needed
    let newHunters = [...settings.selectedHunters];
    if (newHunters.length > newRule.hunters) {
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
      setPlayers([...players, ...added]);
    } else if (players.length > count) {
      setPlayers(players.slice(0, count));
    }
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

  // Update a single player's details
  const updatePlayer = (index: number, updates: Partial<Player>) => {
    setPlayers(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
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
    settings.selectedHunters.forEach(hId => {
      rolesPool.push({ role: 'hunter', hunterType: hId });
    });
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

  const isRosterValid =
    currentDracula === currentRule.dracula &&
    currentBrides === currentRule.brides &&
    currentHunters === currentRule.hunters &&
    currentGuests === currentRule.guests &&
    settings.selectedHunters.length === currentRule.hunters;

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

      {/* 3. Seating Chart Visualization */}
      <SeatingChart players={players} interactive />

      {/* 4. Player Roster & Role Assignment */}
      <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm sm:text-base font-serif font-bold text-rose-100">
              Step 2: Assign Seats & Secret Roles
            </h2>
            <p className="text-[11px] text-zinc-400">
              Record player names, colors, and their dealt role.
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
                    onChange={e => updatePlayer(idx, { colorId: e.target.value })}
                    className="bg-zinc-900 border border-zinc-700/80 text-zinc-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-rose-500 font-medium"
                  >
                    {OFFICIAL_COLORS.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
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

        {/* Validation Error/Notice */}
        {!isRosterValid && (
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
