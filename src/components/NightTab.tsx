import React, { useState, useEffect } from 'react';
import { DarkBlessingId, GameState, HunterType, RestlessSpirit } from '../types/game';
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
  const {
    players,
    chosenBlessingId,
    excludedBlessingId,
    corruptedPlayerId,
    puppetPlayerId,
    restlessSpirits,
    twistedPlayerId,
    wingedHunterId,
    effigyPlayerId,
    darkVeilDraculaPlayerId,
    darkVeilBridePlayerIds,
    soulSwapGoodPlayerId,
    soulSwapBridePlayerId,
  } = gameState;

  // Active pool of 5 Dark Blessings (Set 1, Set 2, or customized)
  const activeBlessingIds = gameState.settings.selectedBlessingIds && gameState.settings.selectedBlessingIds.length === 5
    ? gameState.settings.selectedBlessingIds
    : ([1, 2, 3, 4, 5] as DarkBlessingId[]);

  const activeBlessings = activeBlessingIds
    .map(id => DARK_BLESSINGS.find(b => b.id === id)!)
    .filter(Boolean);

  const dracula = players.find(p => p.role === 'dracula');
  const brides = players.filter(p => p.role === 'bride');
  const huntersInPlay = players.filter(p => p.role === 'hunter');
  const goodPlayers = players.filter(p => p.role === 'guest' || p.role === 'hunter');
  const guests = players.filter(p => p.role === 'guest');
  const [selectedSpiritIdx, setSelectedSpiritIdx] = useState<number>(0);

  // Sorted players by seat
  const sortedPlayers = [...players].sort((a, b) => a.seat - b.seat);

  // Compute all adjacent seat pairs around the circle with player names, colors, and seat numbers
  const adjacentPairs = sortedPlayers.map((p, idx) => {
    const nextP = sortedPlayers[(idx + 1) % sortedPlayers.length];
    const pColor = getPlayerColor(p.colorId);
    const nextPColor = getPlayerColor(nextP.colorId);
    const pName = p.name || `Player ${p.seat}`;
    const nextPName = nextP.name || `Player ${nextP.seat}`;
    return {
      seatA: p.seat,
      seatB: nextP.seat,
      playerA: p,
      playerB: nextP,
      colorA: pColor,
      colorB: nextPColor,
      label: `Between ${pName} (${pColor.name}) & ${nextPName} (${nextPColor.name}) [Seats ${p.seat} & ${nextP.seat}]`,
      shortLabel: `${pName} (${pColor.name}) ↔ ${nextPName} (${nextPColor.name})`,
    };
  });

  // Automatically separate spirits if existing state has 2 spirits in the exact same gap
  useEffect(() => {
    if (chosenBlessingId === 3 && restlessSpirits && restlessSpirits.length >= 2) {
      const s0 = restlessSpirits[0];
      const s1 = restlessSpirits[1];
      const same =
        (s0.betweenSeatA === s1.betweenSeatA && s0.betweenSeatB === s1.betweenSeatB) ||
        (s0.betweenSeatA === s1.betweenSeatB && s0.betweenSeatB === s1.betweenSeatA);
      if (same && sortedPlayers.length > 1) {
        const pairs = sortedPlayers.map((p, idx) => ({
          seatA: p.seat,
          seatB: sortedPlayers[(idx + 1) % sortedPlayers.length].seat,
        }));
        const available = pairs.find(
          p =>
            !(
              (p.seatA === s0.betweenSeatA && p.seatB === s0.betweenSeatB) ||
              (p.seatA === s0.betweenSeatB && p.seatB === s0.betweenSeatA)
            )
        );
        if (available) {
          handleUpdateSpirit(1, {
            betweenSeatA: available.seatA,
            betweenSeatB: available.seatB,
          });
        }
      }
    }
  }, [chosenBlessingId, restlessSpirits, players]);

  // Handle Dark Blessing in play selection
  const handleSelectBlessing = (bId: DarkBlessingId) => {
    setGameState(prev => {
      let nextSpirits = prev.restlessSpirits || [];
      if (bId === 3) {
        const sorted = [...prev.players].sort((a, b) => a.seat - b.seat);
        const pairs = sorted.map((p, idx) => ({
          seatA: p.seat,
          seatB: sorted[(idx + 1) % sorted.length].seat,
        }));
        if (nextSpirits.length < 2) {
          const pair1 = pairs[0] || { seatA: 1, seatB: 2 };
          const pair2 = pairs[2] || pairs[1] || { seatA: 2, seatB: 3 };
          nextSpirits = [
            { betweenSeatA: pair1.seatA, betweenSeatB: pair1.seatB, alignment: 'evil' },
            { betweenSeatA: pair2.seatA, betweenSeatB: pair2.seatB, alignment: 'good' },
          ];
        } else {
          // Verify that spirits are in distinct gaps
          const s0 = nextSpirits[0];
          const s1 = nextSpirits[1];
          const same =
            (s0.betweenSeatA === s1.betweenSeatA && s0.betweenSeatB === s1.betweenSeatB) ||
            (s0.betweenSeatA === s1.betweenSeatB && s0.betweenSeatB === s1.betweenSeatA);
          if (same && pairs.length > 1) {
            const openPair = pairs.find(
              p =>
                !(
                  (p.seatA === s0.betweenSeatA && p.seatB === s0.betweenSeatB) ||
                  (p.seatA === s0.betweenSeatB && p.seatB === s0.betweenSeatA)
                )
            ) || pairs[1];
            nextSpirits = [
              s0,
              { ...s1, betweenSeatA: openPair.seatA, betweenSeatB: openPair.seatB },
            ];
          }
        }
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
        twistedPlayerId: bId === 6 ? prev.twistedPlayerId : null,
        wingedHunterId: bId === 7 ? prev.wingedHunterId : null,
        effigyPlayerId: bId === 8 ? prev.effigyPlayerId : null,
        darkVeilDraculaPlayerId: bId === 9 ? prev.darkVeilDraculaPlayerId : null,
        darkVeilBridePlayerIds: bId === 9 ? (prev.darkVeilBridePlayerIds || []) : [],
        soulSwapGoodPlayerId: bId === 10 ? prev.soulSwapGoodPlayerId : null,
        soulSwapBridePlayerId: bId === 10 ? prev.soulSwapBridePlayerId : null,
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

  // Update a specific restless spirit (ensures max 1 spirit per gap)
  const handleUpdateSpirit = (index: number, updates: Partial<RestlessSpirit>) => {
    setGameState(prev => {
      const spirits = [...(prev.restlessSpirits || [])];
      while (spirits.length <= index) {
        spirits.push({ betweenSeatA: 1, betweenSeatB: 2, alignment: 'evil' });
      }
      spirits[index] = { ...spirits[index], ...updates };

      // Ensure no 2 spirits are placed in the exact same gap
      const otherIndex = index === 0 ? 1 : 0;
      if (spirits[otherIndex]) {
        const cur = spirits[index];
        const oth = spirits[otherIndex];
        const same =
          (cur.betweenSeatA === oth.betweenSeatA && cur.betweenSeatB === oth.betweenSeatB) ||
          (cur.betweenSeatA === oth.betweenSeatB && cur.betweenSeatB === oth.betweenSeatA);

        if (same) {
          const sorted = [...prev.players].sort((a, b) => a.seat - b.seat);
          const pairs = sorted.map((p, idx) => ({
            seatA: p.seat,
            seatB: sorted[(idx + 1) % sorted.length].seat,
          }));
          const available = pairs.find(
            p =>
              !(
                (p.seatA === cur.betweenSeatA && p.seatB === cur.betweenSeatB) ||
                (p.seatA === cur.betweenSeatB && p.seatB === cur.betweenSeatA)
              )
          );
          if (available) {
            spirits[otherIndex] = {
              ...spirits[otherIndex],
              betweenSeatA: available.seatA,
              betweenSeatB: available.seatB,
            };
          }
        }
      }

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

  // Set Twisted Whispers target (Blessing 6)
  const handleSetTwistedPlayer = (playerId: string) => {
    setGameState(prev => ({
      ...prev,
      twistedPlayerId: playerId,
    }));
  };

  // Set Winged Spies target hunter (Blessing 7)
  const handleSetWingedHunter = (hunterId: string) => {
    setGameState(prev => ({
      ...prev,
      wingedHunterId: hunterId,
    }));
  };

  // Set Blood Effigy target (Blessing 8)
  const handleSetEffigyPlayer = (playerId: string) => {
    setGameState(prev => ({
      ...prev,
      effigyPlayerId: playerId,
    }));
  };

  // Set Dark Veil Fake Dracula (Blessing 9)
  const handleSetDarkVeilDracula = (playerId: string) => {
    setGameState(prev => ({
      ...prev,
      darkVeilDraculaPlayerId: playerId,
    }));
  };

  // Toggle Dark Veil Fake Bride (Blessing 9)
  const handleToggleDarkVeilBride = (playerId: string) => {
    setGameState(prev => {
      const current = prev.darkVeilBridePlayerIds || [];
      const updated = current.includes(playerId)
        ? current.filter(id => id !== playerId)
        : [...current, playerId];
      return {
        ...prev,
        darkVeilBridePlayerIds: updated,
      };
    });
  };

  // Set Soul Swap Good Player (Blessing 10)
  const handleSetSoulSwapGood = (playerId: string) => {
    setGameState(prev => ({
      ...prev,
      soulSwapGoodPlayerId: playerId,
    }));
  };

  // Set Soul Swap Bride (Blessing 10)
  const handleSetSoulSwapBride = (playerId: string) => {
    setGameState(prev => ({
      ...prev,
      soulSwapBridePlayerId: playerId,
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
          {activeBlessings.map((b, idx) => {
            const isSelected = chosenBlessingId === b.id;
            const fingerCount = idx + 1;
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
                      {fingerCount}
                    </span>
                    <span className={`text-xs font-bold ${isSelected ? 'text-purple-100' : 'text-zinc-200'}`}>
                      {b.name} <span className="text-[10px] text-purple-400 font-mono">(Slot #{fingerCount} • ID #{b.id})</span>
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
                const otherIdx = sIdx === 0 ? 1 : 0;
                const spirit = (restlessSpirits && restlessSpirits[sIdx]) || {
                  betweenSeatA: sIdx === 0 ? 1 : 2,
                  betweenSeatB: sIdx === 0 ? 2 : (sortedPlayers.length > 2 ? 3 : 1),
                  alignment: sIdx === 0 ? 'evil' : 'good',
                };
                const otherSpirit = restlessSpirits && restlessSpirits[otherIdx];

                const pA = sortedPlayers.find(p => p.seat === spirit.betweenSeatA);
                const pB = sortedPlayers.find(p => p.seat === spirit.betweenSeatB);
                const colA = pA ? getPlayerColor(pA.colorId) : undefined;
                const colB = pB ? getPlayerColor(pB.colorId) : undefined;

                return (
                  <div
                    key={sIdx}
                    onClick={() => setSelectedSpiritIdx(sIdx)}
                    className={`p-3 rounded-xl border space-y-2.5 transition-all cursor-pointer ${
                      selectedSpiritIdx === sIdx
                        ? 'ring-2 ring-purple-400 border-purple-500 shadow-lg shadow-purple-950/60'
                        : 'hover:border-zinc-700'
                    } ${
                      spirit.alignment === 'evil'
                        ? 'bg-red-950/30 border-red-900/70 shadow-sm'
                        : 'bg-blue-950/30 border-blue-900/70 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                        <Ghost className={`w-3.5 h-3.5 ${spirit.alignment === 'evil' ? 'text-red-400' : 'text-blue-400'}`} />
                        Restless Spirit #{sIdx + 1}
                        {selectedSpiritIdx === sIdx && (
                          <span className="text-[9px] font-mono font-bold text-purple-300 bg-purple-900/80 px-1.5 py-0.5 rounded border border-purple-600 animate-pulse">
                            Active
                          </span>
                        )}
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
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] uppercase font-bold text-zinc-400">
                          Placed Between Players:
                        </label>
                        <span className="text-[9px] text-zinc-500 font-medium">
                          (Only 1 spirit per gap)
                        </span>
                      </div>
                      <select
                        value={`${spirit.betweenSeatA}_${spirit.betweenSeatB}`}
                        onChange={e => {
                          const [a, b] = e.target.value.split('_').map(Number);
                          handleUpdateSpirit(sIdx, { betweenSeatA: a, betweenSeatB: b });
                        }}
                        className="w-full bg-zinc-900/90 border border-zinc-700 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none focus:border-purple-500 font-medium"
                      >
                        {adjacentPairs.map(pair => {
                          const isOccupiedByOther = Boolean(
                            otherSpirit &&
                            (
                              (pair.seatA === otherSpirit.betweenSeatA && pair.seatB === otherSpirit.betweenSeatB) ||
                              (pair.seatA === otherSpirit.betweenSeatB && pair.seatB === otherSpirit.betweenSeatA)
                            )
                          );
                          return (
                            <option
                              key={`${pair.seatA}_${pair.seatB}`}
                              value={`${pair.seatA}_${pair.seatB}`}
                              disabled={isOccupiedByOther}
                              className={isOccupiedByOther ? 'text-zinc-600 bg-zinc-950 italic' : ''}
                            >
                              {pair.label} {isOccupiedByOther ? `(Occupied by Spirit #${otherIdx + 1})` : ''}
                            </option>
                          );
                        })}
                      </select>

                      {/* Player Preview Badge with Colors */}
                      {pA && pB && colA && colB && (
                        <div className="flex items-center justify-between mt-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-[11px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0 border border-white/20"
                              style={{ backgroundColor: colA.hex }}
                            />
                            <span className="font-semibold text-zinc-200 truncate">{pA.name}</span>
                            <span className="text-[10px] text-zinc-400 flex-shrink-0">({colA.name})</span>
                          </div>
                          <span className="text-zinc-500 mx-2 flex-shrink-0 font-bold">↔</span>
                          <div className="flex items-center gap-1.5 min-w-0 justify-end">
                            <span className="font-semibold text-zinc-200 truncate">{pB.name}</span>
                            <span className="text-[10px] text-zinc-400 flex-shrink-0">({colB.name})</span>
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0 border border-white/20"
                              style={{ backgroundColor: colB.hex }}
                            />
                          </div>
                        </div>
                      )}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                <span className="text-[11px] font-semibold text-purple-300 flex items-center gap-1.5">
                  <Ghost className="w-3.5 h-3.5 text-purple-400" />
                  Interactive Seating Table (Drag & Drop or Tap to Place):
                </span>
                <span className="text-[10px] text-zinc-400">
                  ✨ Drag spirits to any gap or tap empty slots
                </span>
              </div>
              <SeatingChart
                players={players}
                restlessSpirits={restlessSpirits}
                onUpdateSpirit={handleUpdateSpirit}
                activeSpiritIndex={selectedSpiritIdx}
                onSelectSpiritIndex={setSelectedSpiritIdx}
                narratorAngle={gameState.narratorAngle}
                onUpdateNarratorAngle={angle => setGameState(prev => ({ ...prev, narratorAngle: angle }))}
              />
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

        {/* Blessing 6: Twisted Whispers Setup */}
        {chosenBlessingId === 6 && (
          <div className="mt-3 p-3 rounded-xl bg-purple-950/30 border border-purple-800 space-y-2">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Twisted Whispers Setup: Select player whose solo rooms are inverted
            </span>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Dracula points to 1 player. In their 1-person Room, a Pass gives false information and a Fail gives true information!
            </p>
            <div className="flex flex-wrap gap-1.5">
              {players.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSetTwistedPlayer(p.id)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                    twistedPlayerId === p.id
                      ? 'bg-purple-700 text-white border-purple-500 shadow-sm'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                  }`}
                >
                  {p.name} ({getPlayerColor(p.colorId).name})
                </button>
              ))}
            </div>
            {twistedPlayerId && (
              <div className="p-2 rounded-lg bg-purple-950/50 border border-purple-700 text-xs text-purple-200">
                🌀 {players.find(p => p.id === twistedPlayerId)?.name} is designated! In their 1-person rooms, Pass will give a lie and Fail will give truth.
              </div>
            )}
          </div>
        )}

        {/* Blessing 7: Winged Spies Setup */}
        {chosenBlessingId === 7 && (
          <div className="mt-3 p-3 rounded-xl bg-purple-950/30 border border-purple-800 space-y-2.5">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Winged Spies Setup: Dracula learns all Hunters & chooses 1 to deceive
            </span>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Show Dracula who the Hunters are. Dracula secretly points to 1 Hunter to receive false information during their wake-up step!
            </p>
            {/* Show all hunters to Dracula */}
            <div className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                Hunters in play (Show to Dracula):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {huntersInPlay.length > 0 ? (
                  huntersInPlay.map(h => {
                    const hInfo = HUNTERS.find(item => item.id === h.hunterType);
                    const col = getPlayerColor(h.colorId);
                    return (
                      <span key={h.id} className="px-2 py-1 rounded bg-blue-950/80 border border-blue-800 text-blue-200 font-medium">
                        {h.name} ({col.name}, Seat {h.seat}) — {hInfo?.name}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-zinc-500 italic">No Hunters in play (5-player game)</span>
                )}
              </div>
            </div>

            {huntersInPlay.length > 0 && (
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                  Choose Hunter to receive false information:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {huntersInPlay.map(h => (
                    <button
                      key={h.id}
                      onClick={() => handleSetWingedHunter(h.id)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                        wingedHunterId === h.id
                          ? 'bg-rose-700 text-white border-rose-500 shadow-sm'
                          : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                      }`}
                    >
                      {h.name} ({getPlayerColor(h.colorId).name})
                    </button>
                  ))}
                </div>
              </div>
            )}
            {wingedHunterId && (
              <div className="p-2 rounded-lg bg-rose-950/50 border border-rose-700 text-xs text-rose-200">
                🦅 {players.find(p => p.id === wingedHunterId)?.name} will receive FALSE information in Step 4!
              </div>
            )}
            {gameState.settings.playerCount === 5 && (
              <p className="text-[11px] text-amber-300 italic">
                ⭐ At 5 players: Winged Spies allows Evil to win through Dracula's Last Chance during the Finale!
              </p>
            )}
          </div>
        )}

        {/* Blessing 8: Blood Effigy Setup */}
        {chosenBlessingId === 8 && (
          <div className="mt-3 p-3 rounded-xl bg-purple-950/30 border border-purple-800 space-y-2">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Blood Effigy Setup: Select Good player to register as Dracula
            </span>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Dracula chooses a Good player. In room questions, they register as Good and as Dracula! Real Dracula registers as Evil and as a Bride. To win, Hunters must shoot this Effigy player instead of Dracula!
            </p>
            <div className="flex flex-wrap gap-1.5">
              {goodPlayers.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSetEffigyPlayer(p.id)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                    effigyPlayerId === p.id
                      ? 'bg-rose-700 text-white border-rose-500 shadow-sm'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                  }`}
                >
                  {p.name} ({getPlayerColor(p.colorId).name})
                </button>
              ))}
            </div>
            {effigyPlayerId && (
              <div className="p-2 rounded-lg bg-rose-950/50 border border-rose-700 text-xs text-rose-200">
                🩸 {players.find(p => p.id === effigyPlayerId)?.name} is the Blood Effigy! In room questions they register as Dracula, and real Dracula registers as a Bride. Good must shoot this player to win!
              </div>
            )}
          </div>
        )}

        {/* Blessing 9: Dark Veil Setup */}
        {chosenBlessingId === 9 && (
          <div className="mt-3 p-3 rounded-xl bg-purple-950/30 border border-purple-800 space-y-2.5">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Dark Veil Setup: Dracula disguised as Renfield!
            </span>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Dracula chooses Good players equal to the number of Evil players ({brides.length + 1}). One registers as Dracula; the other(s) register as Brides. All actual Evil players register as Good. Dracula is disguised as Renfield — Good must shoot Renfield to win!
            </p>

            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                Select Good player who registers as Dracula:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {goodPlayers.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSetDarkVeilDracula(p.id)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                      darkVeilDraculaPlayerId === p.id
                        ? 'bg-red-700 text-white border-red-500 shadow-sm'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                    }`}
                  >
                    {p.name} ({getPlayerColor(p.colorId).name})
                  </button>
                ))}
              </div>
            </div>

            {brides.length > 0 && (
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                  Select Good player(s) who register as Brides (Select {brides.length}):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {goodPlayers.filter(p => p.id !== darkVeilDraculaPlayerId).map(p => {
                    const isBride = darkVeilBridePlayerIds?.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => handleToggleDarkVeilBride(p.id)}
                        className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                          isBride
                            ? 'bg-rose-700 text-white border-rose-500 shadow-sm'
                            : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                        }`}
                      >
                        {p.name} ({getPlayerColor(p.colorId).name})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="p-2 rounded-lg bg-red-950/40 border border-red-800 text-xs text-red-200">
              🌑 Real Dracula and Brides will register as Good! The fake Dracula and Brides will register as Evil. Renfield (you, the narrator) is the real Dracula — Good must declare to shoot Renfield in the Finale to win!
            </div>
          </div>
        )}

        {/* Blessing 10: Soul Swap Setup */}
        {chosenBlessingId === 10 && (
          <div className="mt-3 p-3 rounded-xl bg-purple-950/30 border border-purple-800 space-y-2.5">
            <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Soul Swap Setup: Swap 1 Good player and 1 Bride
            </span>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Dracula chooses 1 Good player and 1 Bride. For Room questions, when one is selected, the other is selected instead, and their seating positions are swapped!
            </p>

            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                Select Good Player:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {goodPlayers.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSetSoulSwapGood(p.id)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                      soulSwapGoodPlayerId === p.id
                        ? 'bg-blue-700 text-white border-blue-500 shadow-sm'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                    }`}
                  >
                    {p.name} ({getPlayerColor(p.colorId).name})
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                Select Bride:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {brides.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSetSoulSwapBride(p.id)}
                    className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                      soulSwapBridePlayerId === p.id
                        ? 'bg-rose-700 text-white border-rose-500 shadow-sm'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                    }`}
                  >
                    {p.name} ({getPlayerColor(p.colorId).name})
                  </button>
                ))}
              </div>
            </div>

            {soulSwapGoodPlayerId && soulSwapBridePlayerId && (
              <div className="p-2 rounded-lg bg-purple-950/50 border border-purple-700 text-xs text-purple-200">
                🔄 {players.find(p => p.id === soulSwapGoodPlayerId)?.name} and {players.find(p => p.id === soulSwapBridePlayerId)?.name} have had their souls swapped! In room questions and seating checks, they swap roles and positions.
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
          {activeBlessings.map((b, idx) => {
            const isExcluded = excludedBlessingId === b.id;
            const isChosen = chosenBlessingId === b.id;
            const fingerCount = idx + 1;
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
                <span className="block text-xs font-mono font-bold">Slot #{fingerCount}</span>
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

                  {hunter.id === wingedHunterId && (
                    <div className="bg-rose-950/70 border border-rose-600 rounded-lg p-2 text-xs text-rose-200 space-y-0.5">
                      <span className="font-bold flex items-center gap-1 text-rose-300 text-[11px] uppercase tracking-wider">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        Winged Spies Active! Give False Information:
                      </span>
                      <p className="text-[11px] text-zinc-200 leading-snug">
                        Dracula targeted this Hunter. Give them convincing FALSE information instead of the truth below!
                      </p>
                    </div>
                  )}

                  <div className="bg-zinc-950/80 rounded-lg p-2 border border-blue-950 text-xs">
                    <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider block mb-0.5">
                      {hunter.id === wingedHunterId ? 'True Info (Lie Instead!):' : 'Secret Info to Give:'}
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
