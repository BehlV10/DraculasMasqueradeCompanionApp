import React from 'react';
import { DarkBlessingId, GameState, HunterType, Player, RestlessSpirit } from '../types/game';
import { DARK_BLESSINGS, HUNTERS } from '../data/gameData';
import { getPlayerColor } from '../utils/gameLogic';
import { Moon, Eye, EyeOff, Sparkles, AlertTriangle, ArrowRight, CheckCircle2, Ghost } from 'lucide-react';
import { SeatingChart } from './SeatingChart';

interface NightTabProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  onFinishNight: () => void;
}

export const NightTab: React.FC<NightTabProps> = ({
  gameState,
  setGameState,
  onFinishNight,
}) => {
  const { players, chosenBlessingId, excludedBlessingId, corruptedPlayerId, puppetPlayerId, restlessSpirits } = gameState;
  const dracula = players.find(p => p.role === 'dracula');
  const brides = players.filter(p => p.role === 'bride');
  const huntersInPlay = players.filter(p => p.role === 'hunter');
  const goodPlayers = players.filter(p => p.role === 'guest' || p.role === 'hunter');
  const guests = players.filter(p => p.role === 'guest');

  // Compute all adjacent seat pairs around the circle
  const adjacentPairs = players.map((p, idx) => {
    const nextP = players[(idx + 1) % players.length];
    return {
      seatA: p.seat,
      seatB: nextP.seat,
      label: `Between Seat ${p.seat} (${p.name}) & Seat ${nextP.seat} (${nextP.name})`,
    };
  });

  // Handle Dark Blessing in play selection
  const handleSelectBlessing = (bId: DarkBlessingId) => {
    setGameState(prev => {
      let nextSpirits = prev.restlessSpirits || [];
      if (bId === 3 && nextSpirits.length < 2) {
        const n = prev.players.length || 8;
        nextSpirits = [
          { betweenSeatA: 1, betweenSeatB: 2, alignment: 'evil' },
          { betweenSeatA: Math.min(3, n), betweenSeatB: Math.min(4, n) > Math.min(3, n) ? Math.min(4, n) : 1, alignment: 'good' },
        ];
      }

      // Clean up previous blessing artifacts when switching blessings
      const cleanedPlayers = prev.players.map(p => ({
        ...p,
        isCorrupted: bId === 1 ? p.isCorrupted : false,
        isPuppet: bId === 2 ? p.isPuppet : false,
      }));

      return {
        ...prev,
        chosenBlessingId: bId,
        // If excluded matches chosen, reset excluded
        excludedBlessingId: prev.excludedBlessingId === bId ? null : prev.excludedBlessingId,
        corruptedPlayerId: bId === 1 ? prev.corruptedPlayerId : null,
        puppetPlayerId: bId === 2 ? prev.puppetPlayerId : null,
        shadowRoomNumber: bId === 5 ? prev.shadowRoomNumber : null,
        players: cleanedPlayers,
        restlessSpirits: bId === 3 ? nextSpirits : prev.restlessSpirits,
      };
    });
  };

  // Handle Gathering Shadows auto-fail room designation
  const handleSetShadowRoom = (roomNum: number | null) => {
    setGameState(prev => ({
      ...prev,
      shadowRoomNumber: roomNum,
    }));
  };

  // Update a specific restless spirit
  const handleUpdateSpirit = (index: number, updates: Partial<RestlessSpirit>) => {
    setGameState(prev => {
      const spirits = [...(prev.restlessSpirits || [])];
      while (spirits.length <= index) {
        spirits.push({ betweenSeatA: 1, betweenSeatB: 2, alignment: 'evil' });
      }
      spirits[index] = { ...spirits[index], ...updates };
      return {
        ...prev,
        restlessSpirits: spirits,
      };
    });
  };

  // Handle Excluded Blessing selection
  const handleSelectExcluded = (bId: DarkBlessingId) => {
    setGameState(prev => ({
      ...prev,
      excludedBlessingId: bId,
    }));
  };

  // Corrupt a Good player (Blood Corruption)
  const handleSetCorruptedPlayer = (playerId: string) => {
    setGameState(prev => ({
      ...prev,
      corruptedPlayerId: playerId,
      players: prev.players.map(p => ({
        ...p,
        isCorrupted: p.id === playerId,
      })),
    }));
  };

  // Set Puppet Strings victim
  const handleSetPuppetPlayer = (playerId: string) => {
    setGameState(prev => ({
      ...prev,
      puppetPlayerId: playerId,
      players: prev.players.map(p => ({
        ...p,
        isPuppet: p.id === playerId,
      })),
    }));
  };

  // Helper for Hunter secret information
  const getHunterSecretInfo = (hunterType?: HunterType) => {
    switch (hunterType) {
      case 'van_helsing': {
        const blessing = DARK_BLESSINGS.find(b => b.id === chosenBlessingId);
        return blessing
          ? `Dracula chose #${blessing.id}: ${blessing.name} (${blessing.description})`
          : 'Wait for Dracula to choose a Dark Blessing first!';
      }
      case 'jonathan_harker': {
        // Find candidates: other hunters or Dracula
        const candidates = players.filter(p => p.role === 'dracula' || (p.role === 'hunter' && p.hunterType !== 'jonathan_harker'));
        if (candidates.length === 0) return 'Dracula';
        const candidate = candidates[0];
        const cColor = getPlayerColor(candidate.colorId);
        return `Show Jonathan Harker: ${candidate.name} (${cColor.name}, Seat ${candidate.seat}). Say: "This player is either Dracula or a Hunter."`;
      }
      case 'mina_harker': {
        const target = guests[0];
        if (!target) return 'No guest available.';
        const tColor = getPlayerColor(target.colorId);
        return `Show Mina Harker: ${target.name} (${tColor.name}, Seat ${target.seat}). Say: "This player is a Guest."`;
      }
      case 'quincey_morris': {
        const target = brides[0];
        if (!target) return 'No bride available.';
        const tColor = getPlayerColor(target.colorId);
        return `Show Quincey Morris: ${target.name} (${tColor.name}, Seat ${target.seat}). Say: "This player is a Bride."`;
      }
      case 'dr_john_seward': {
        return 'Whisper to Dr. Seward: "You may choose a room number at any time during the game. That room will Pass regardless of votes."';
      }
      default:
        return 'No secret information.';
    }
  };

  const isNightReady = Boolean(chosenBlessingId && excludedBlessingId);

  return (
    <div className="space-y-4 pb-24">
      {/* Script Header */}
      <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2">
          <Moon className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm sm:text-base font-serif font-bold text-rose-100">
            Renfield's Night Phase Script
          </h2>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Follow the nocturnal sequence in order. All players close their eyes while you awaken and manage the secret roles.
        </p>

        {/* Night Signals reminder */}
        <div className="mt-2.5 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800 text-[11px] text-zinc-300 space-y-1">
          <span className="font-semibold text-rose-300 block uppercase text-[10px] tracking-wider">
            Night Signals:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-zinc-400">
            <div>• <strong className="text-zinc-200">Tap player:</strong> Open your eyes</div>
            <div>• <strong className="text-zinc-200">Cover eyes:</strong> Close your eyes</div>
            <div>• <strong className="text-zinc-200">1-5 fingers:</strong> Dracula blessing</div>
          </div>
        </div>
      </div>

      {/* Step 1: Wake Evil Team */}
      <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-4 h-4 text-red-400" />
          <h3 className="text-xs sm:text-sm font-serif font-bold text-red-200">
            Step 1: Wake Evil Team & Identify Dracula
          </h3>
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed mb-3">
          Have all players close their eyes. Tap the Evil team to wake them. Point out Dracula to the Brides.
        </p>

        {/* Evil Roster Card */}
        <div className="bg-red-950/20 rounded-xl p-2.5 border border-red-900/40 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Dracula:</span>
            {dracula ? (
              <span className="font-bold text-red-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
                {dracula.name} ({getPlayerColor(dracula.colorId).name}, Seat {dracula.seat})
              </span>
            ) : (
              <span className="text-zinc-500">Unassigned</span>
            )}
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400 font-medium">Brides:</span>
            <div className="flex flex-wrap gap-1 text-right">
              {brides.map(b => (
                <span key={b.id} className="text-rose-300 font-medium bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-900 text-[11px]">
                  {b.name} ({getPlayerColor(b.colorId).name})
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Dark Blessing In Play */}
      <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h3 className="text-xs sm:text-sm font-serif font-bold text-purple-200">
            Step 2: Dracula Chooses Dark Blessing In Play
          </h3>
        </div>
        <p className="text-xs text-zinc-300 mb-3">
          Dracula secretly holds up 1–5 fingers to choose which Dark Blessing is in play:
        </p>

        <div className="grid grid-cols-1 gap-2">
          {DARK_BLESSINGS.map(b => {
            const isSelected = chosenBlessingId === b.id;
            return (
              <div
                key={b.id}
                onClick={() => handleSelectBlessing(b.id)}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-purple-950/70 border-purple-500 shadow-md shadow-purple-950/50'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-900 border border-purple-700 text-purple-200 text-xs font-mono font-bold flex items-center justify-center">
                      {b.id}
                    </span>
                    <span className={`text-xs font-bold ${isSelected ? 'text-purple-100' : 'text-zinc-200'}`}>
                      {b.name}
                    </span>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-snug">{b.description}</p>
              </div>
            );
          })}
        </div>

        {/* Resolve Active Blessing Setup */}
        {chosenBlessingId === 1 && (
          <div className="mt-3 p-3 rounded-xl bg-red-950/30 border border-red-800 space-y-2">
            <span className="text-xs font-bold text-red-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Blood Corruption Setup: Select Good player to corrupt
            </span>
            <p className="text-[11px] text-zinc-400">
              Dracula chooses a Good player. This player will register as Evil for all room questions!
            </p>
            <div className="flex flex-wrap gap-1.5">
              {goodPlayers.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSetCorruptedPlayer(p.id)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                    corruptedPlayerId === p.id
                      ? 'bg-red-700 text-white border-red-500 shadow-sm'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                  }`}
                >
                  {p.name} ({getPlayerColor(p.colorId).name})
                </button>
              ))}
            </div>
          </div>
        )}

        {chosenBlessingId === 2 && (
          <div className="mt-3 p-3 rounded-xl bg-purple-950/30 border border-purple-800 space-y-2">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Puppet Strings Setup: Select Good player puppet
            </span>
            <p className="text-[11px] text-zinc-400">
              All their votes are secretly changed to Fail. Dracula may only cast Pass votes.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {goodPlayers.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSetPuppetPlayer(p.id)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                    puppetPlayerId === p.id
                      ? 'bg-purple-700 text-white border-purple-500 shadow-sm'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                  }`}
                >
                  {p.name} ({getPlayerColor(p.colorId).name})
                </button>
              ))}
            </div>
          </div>
        )}

        {chosenBlessingId === 3 && (
          <div className="mt-3 p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/80 space-y-4">
            <div className="flex items-center gap-2">
              <Ghost className="w-4 h-4 text-purple-400" />
              <div>
                <h4 className="text-xs font-serif font-bold text-purple-200">
                  Dark Blessing #3: Restless Spirits Setup
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Dracula secretly points to 2 locations between players, showing thumbs up (Good / blue dot) or thumbs down (Evil / red dot) for each.
                </p>
              </div>
            </div>

            {/* Spirit 1 & Spirit 2 Placement Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[0, 1].map(sIdx => {
                const spirit = (restlessSpirits && restlessSpirits[sIdx]) || {
                  betweenSeatA: sIdx === 0 ? 1 : 2,
                  betweenSeatB: sIdx === 0 ? 2 : 3,
                  alignment: sIdx === 0 ? 'evil' : 'good',
                };

                return (
                  <div
                    key={sIdx}
                    className={`p-3 rounded-xl border space-y-2.5 transition-all ${
                      spirit.alignment === 'evil'
                        ? 'bg-red-950/30 border-red-900/70 shadow-sm'
                        : 'bg-blue-950/30 border-blue-900/70 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                        <Ghost className={`w-3.5 h-3.5 ${spirit.alignment === 'evil' ? 'text-red-400' : 'text-blue-400'}`} />
                        Restless Spirit #{sIdx + 1}
                      </span>
                      <span className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                        spirit.alignment === 'evil'
                          ? 'bg-red-900/60 border-red-700 text-red-200'
                          : 'bg-blue-900/60 border-blue-700 text-blue-200'
                      }`}>
                        {spirit.alignment === 'evil' ? '🔴 Evil Dot' : '🔵 Good Dot'}
                      </span>
                    </div>

                    {/* Adjacent Pair Dropdown */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                        Placed Between Players:
                      </label>
                      <select
                        value={`${spirit.betweenSeatA}_${spirit.betweenSeatB}`}
                        onChange={e => {
                          const [a, b] = e.target.value.split('_').map(Number);
                          handleUpdateSpirit(sIdx, { betweenSeatA: a, betweenSeatB: b });
                        }}
                        className="w-full bg-zinc-900/90 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none focus:border-purple-500 font-medium"
                      >
                        {adjacentPairs.map(pair => (
                          <option key={`${pair.seatA}_${pair.seatB}`} value={`${pair.seatA}_${pair.seatB}`}>
                            {pair.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Alignment Toggle Buttons */}
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                        Registers As (Dracula's Signal):
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateSpirit(sIdx, { alignment: 'evil' })}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                            spirit.alignment === 'evil'
                              ? 'bg-red-900 text-white border-red-500 shadow-sm'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                          }`}
                        >
                          <span>🔴 Evil</span>
                          <span className="text-[10px] text-zinc-300 font-normal">(Down)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateSpirit(sIdx, { alignment: 'good' })}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                            spirit.alignment === 'good'
                              ? 'bg-blue-900 text-white border-blue-500 shadow-sm'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                          }`}
                        >
                          <span>🔵 Good</span>
                          <span className="text-[10px] text-zinc-300 font-normal">(Up)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Table Preview */}
            <div className="pt-2 border-t border-purple-900/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-purple-300">
                  Live Seating Table (Spirits Placed):
                </span>
                <span className="text-[10px] text-zinc-400">
                  Glowing orbs appear between seats
                </span>
              </div>
              <SeatingChart players={players} restlessSpirits={restlessSpirits} />
            </div>
          </div>
        )}

        {chosenBlessingId === 4 && (
          <div className="mt-3 p-3 rounded-xl bg-purple-950/30 border border-purple-800 space-y-2">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Dark Blessing #4: Echoing Curse (Passive Power)
            </span>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              No night setup required. Whenever Dracula votes Fail during exploration, the app will automatically treat his vote as a Pass in his current room, and force the subsequent room to automatically Fail!
            </p>
          </div>
        )}

        {chosenBlessingId === 5 && (
          <div className="mt-3 p-3.5 rounded-xl bg-purple-950/30 border border-purple-800 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <div>
                <h4 className="text-xs font-serif font-bold text-purple-200">
                  Dark Blessing #5: Gathering Shadows Setup
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Dracula may designate one room number that will automatically Fail regardless of votes cast.
                </p>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1.5">
                Designated Auto-Fail Room:
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetShadowRoom(null)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    gameState.shadowRoomNumber === null
                      ? 'bg-purple-900 text-white border-purple-500 shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  Decide Later During Game
                </button>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(roomNum => (
                  <button
                    key={roomNum}
                    type="button"
                    onClick={() => handleSetShadowRoom(roomNum)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      gameState.shadowRoomNumber === roomNum
                        ? 'bg-red-900 text-white border-red-500 shadow-sm'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    Room #{roomNum}
                  </button>
                ))}
              </div>
            </div>

            {gameState.shadowRoomNumber !== null && (
              <div className="p-2 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-200">
                🌑 Room #{gameState.shadowRoomNumber} is designated! When players reach Room #{gameState.shadowRoomNumber}, the app will automatically calculate the outcome as Fail.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 3: Dark Blessing NOT in Play */}
      <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2">
          <EyeOff className="w-4 h-4 text-zinc-400" />
          <h3 className="text-xs sm:text-sm font-serif font-bold text-zinc-200">
            Step 3: Blessing NOT In Play (To Be Announced Aloud)
          </h3>
        </div>
        <p className="text-xs text-zinc-300 mb-3">
          Dracula holds up 1–5 fingers again to indicate one Dark Blessing that is <strong className="text-rose-300">NOT in play</strong>. You will announce this to everyone when they open their eyes!
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {DARK_BLESSINGS.map(b => {
            const isExcluded = excludedBlessingId === b.id;
            const isChosen = chosenBlessingId === b.id;
            return (
              <button
                key={b.id}
                disabled={isChosen}
                onClick={() => handleSelectExcluded(b.id)}
                className={`p-2 rounded-xl border text-center transition-all ${
                  isChosen
                    ? 'opacity-30 bg-zinc-900 border-zinc-800 cursor-not-allowed'
                    : isExcluded
                    ? 'bg-amber-950/70 border-amber-500 text-amber-200 font-bold'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <span className="block text-xs font-mono font-bold">#{b.id}</span>
                <span className="text-[11px] block truncate">{b.name}</span>
              </button>
            );
          })}
        </div>

        <p className="text-[11px] text-zinc-500 italic mt-2.5">
          Signal the Evil team to close their eyes.
        </p>
      </div>

      {/* Step 4: Wake Each Hunter Individually */}
      {huntersInPlay.length > 0 && (
        <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-serif font-bold text-blue-200">
              Step 4: Wake Each Hunter Individually
            </h3>
            <span className="text-[11px] font-mono text-blue-400">
              {huntersInPlay.length} Hunters
            </span>
          </div>
          <p className="text-xs text-zinc-300 mb-3">
            Tap each Hunter individually in order. Secretly give them the information listed below, then signal them to close their eyes:
          </p>

          <div className="space-y-2.5">
            {huntersInPlay.map(hunter => {
              const hInfo = HUNTERS.find(h => h.id === hunter.hunterType);
              const pColor = getPlayerColor(hunter.colorId);

              return (
                <div
                  key={hunter.id}
                  className="bg-blue-950/30 border border-blue-900/60 rounded-xl p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-blue-800 border border-blue-600 text-blue-100 text-xs font-mono font-bold flex items-center justify-center">
                        {hInfo?.number || 'H'}
                      </span>
                      <span className="text-xs font-bold text-blue-100">
                        {hunter.name} ({pColor.name}, Seat {hunter.seat})
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-blue-300">
                      {hInfo?.name}
                    </span>
                  </div>

                  <div className="bg-zinc-950/80 rounded-lg p-2 border border-blue-950 text-xs">
                    <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider block mb-0.5">
                      Secret Info to Give:
                    </span>
                    <p className="text-zinc-200 font-medium">
                      {getHunterSecretInfo(hunter.hunterType)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 5: Everyone Wakes Up & Public Announcement */}
      <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 p-3 sm:p-4">
        <h3 className="text-xs sm:text-sm font-serif font-bold text-emerald-200 mb-1.5">
          Step 5: Morning Announcement & Deal Room Cards
        </h3>
        <p className="text-xs text-zinc-300 leading-relaxed mb-3">
          Have everyone open their eyes. Announce aloud to the party:
        </p>

        {excludedBlessingId ? (
          <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-600 text-center">
            <span className="text-[10px] uppercase tracking-widest text-amber-400 font-mono font-bold block mb-1">
              Public Renfield Announcement
            </span>
            <p className="text-sm font-serif font-bold text-amber-100">
              "The Dark Blessing that is NOT in play is: {DARK_BLESSINGS.find(b => b.id === excludedBlessingId)?.name}!"
            </p>
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-center text-xs text-zinc-500">
            Select the excluded blessing in Step 3 above to see your announcement.
          </div>
        )}

        <div className="mt-3 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 space-y-1">
          <p>• Deal <strong className="text-zinc-200">2 Multiplayer Room cards</strong> to each player.</p>
          <p>• Deal <strong className="text-zinc-200">1 Solo Room card</strong> to each player.</p>
        </div>

        {/* Start Castle Exploration Button */}
        <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onFinishNight}
            disabled={!isNightReady}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg ${
              isNightReady
                ? 'bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 text-white shadow-rose-950/60 active:scale-95'
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60'
            }`}
          >
            <span>Begin Castle Exploration</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
