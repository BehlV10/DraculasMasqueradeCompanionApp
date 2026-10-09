import React, { useState, useEffect } from 'react';
import { GameState, Player } from '../types/game';
import { GUEST_LIST_RULES } from '../data/gameData';
import { getPlayerColor, isEvilRole } from '../utils/gameLogic';
import { playBell, playTick, playVictorySound } from '../utils/sound';
import { TimerWidget } from './TimerWidget';
import confetti from 'canvas-confetti';
import {
  Crosshair,
  Users,
  Timer,
  AlertOctagon,
  Trophy,
  Skull,
  Shield,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';

interface FinaleTabProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

export const FinaleTab: React.FC<FinaleTabProps> = ({ gameState, setGameState }) => {
  const { players, huntingPartyPlayerIds, shotPlayerId, winner, winReason, settings } = gameState;
  const currentRule = GUEST_LIST_RULES[settings.playerCount] || GUEST_LIST_RULES[8];
  const evilCount = currentRule.dracula + currentRule.brides;
  const targetHuntingPartySize = evilCount + 1;
  const votesNeeded = Math.ceil(players.length / 2);

  // Active nomination state
  const [nominatedPlayerId, setNominatedPlayerId] = useState<string>('');
  const [nominationSeconds, setNominationSeconds] = useState<number>(10);
  const [isNominationCounting, setIsNominationCounting] = useState<boolean>(false);
  const [yesVoteCount, setYesVoteCount] = useState<number>(0);

  // Dracula's Last Chance state
  const isFivePlayerGame = settings.playerCount === 5;
  const requiredHunterGuesses = settings.playerCount <= 8 ? 2 : 3;
  const [guessedHunters, setGuessedHunters] = useState<string[]>(gameState.draculaGuessedHunterIds || []);
  const [draculaTimerActive, setDraculaTimerActive] = useState<boolean>(false);
  const [draculaSecondsRemaining, setDraculaSecondsRemaining] = useState<number>(180); // 3 minutes

  // 10-second nomination countdown
  useEffect(() => {
    let interval: number | undefined;
    if (isNominationCounting) {
      interval = window.setInterval(() => {
        setNominationSeconds(prev => {
          if (prev <= 1) {
            playBell();
            setIsNominationCounting(false);
            return 0;
          }
          playTick();
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isNominationCounting]);

  // Dracula 3-minute timer
  useEffect(() => {
    let interval: number | undefined;
    if (draculaTimerActive) {
      interval = window.setInterval(() => {
        setDraculaSecondsRemaining(prev => {
          if (prev <= 1) {
            playBell();
            setDraculaTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [draculaTimerActive]);

  const startNominationCountdown = (pId: string) => {
    setNominatedPlayerId(pId);
    setNominationSeconds(10);
    setYesVoteCount(0);
    setIsNominationCounting(true);
  };

  // Resolve Nomination
  const handleResolveNomination = (passed: boolean) => {
    setIsNominationCounting(false);
    if (!nominatedPlayerId) return;

    const nominee = players.find(p => p.id === nominatedPlayerId);
    if (!nominee) return;

    if (!passed) {
      // Vote failed to reach half
      setNominatedPlayerId('');
      return;
    }

    // Nominee joins hunting party
    const isEvil = isEvilRole(nominee.role);
    const newHuntingParty = [...huntingPartyPlayerIds, nominee.id];

    if (isEvil) {
      // EVIL WINS IMMEDIATELY!
      playVictorySound(false);
      setGameState(prev => ({
        ...prev,
        huntingPartyPlayerIds: newHuntingParty,
        winner: 'evil',
        winReason: `Evil player ${nominee.name} (${getPlayerColor(nominee.colorId).name}) was admitted into the Hunting Party! Evil wins immediately!`,
        phase: 'game_over',
      }));
      return;
    }

    // Good nominee admitted
    setGameState(prev => ({
      ...prev,
      huntingPartyPlayerIds: newHuntingParty,
    }));
    setNominatedPlayerId('');
  };

  // Shoot Dracula
  const handleShootPlayer = (targetId: string) => {
    const target = players.find(p => p.id === targetId);
    if (!target) return;

    const isDracula = target.role === 'dracula';

    if (!isDracula) {
      // Evil wins!
      playVictorySound(false);
      setGameState(prev => ({
        ...prev,
        shotPlayerId: targetId,
        winner: 'evil',
        winReason: `The Hunting Party shot ${target.name} (${getPlayerColor(target.colorId).name}), who is NOT Dracula! Evil wins!`,
        phase: 'game_over',
      }));
    } else {
      // Dracula shot!
      if (isFivePlayerGame) {
        // 5-player game skips step 3: Good wins immediately!
        playVictorySound(true);
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
        setGameState(prev => ({
          ...prev,
          shotPlayerId: targetId,
          winner: 'good',
          winReason: `Dracula (${target.name}) was successfully shot! In a 5-player game, Good wins immediately!`,
          phase: 'game_over',
        }));
      } else {
        // Proceed to Dracula's Last Chance
        setGameState(prev => ({
          ...prev,
          shotPlayerId: targetId,
        }));
        setDraculaTimerActive(true);
      }
    }
  };

  // Dracula guesses Hunter
  const handleDraculaGuessHunter = (guessedPlayerId: string) => {
    if (guessedHunters.includes(guessedPlayerId)) return;
    const newGuesses = [...guessedHunters, guessedPlayerId];
    setGuessedHunters(newGuesses);

    const target = players.find(p => p.id === guessedPlayerId);
    const isHunter = target?.role === 'hunter';

    // Count how many correct hunters guessed
    const correctHunterGuesses = newGuesses.filter(id => {
      const p = players.find(x => x.id === id);
      return p?.role === 'hunter';
    }).length;

    if (correctHunterGuesses >= requiredHunterGuesses) {
      // Dracula successfully identified the required hunters: Evil wins!
      playVictorySound(false);
      setGameState(prev => ({
        ...prev,
        draculaGuessedHunterIds: newGuesses,
        winner: 'evil',
        winReason: `Dracula successfully identified ${requiredHunterGuesses} Hunters (${correctHunterGuesses}/${requiredHunterGuesses})! Evil steals the victory!`,
        phase: 'game_over',
      }));
    } else {
      // Check if impossible for Dracula to reach required (remaining unguessed hunters < remaining needed)
      const allHunters = players.filter(p => p.role === 'hunter');
      const missedCount = newGuesses.length - correctHunterGuesses;
      const totalWrongAllowed = players.length - allHunters.length; // Dracula can guess as long as hunters exist

      // Did Dracula exhaust guesses or fail?
      // Notice rule: "After being shot, Dracula gets one final chance to steal the victory by choosing who they think is a Hunter one at a time. If Dracula finds the required number of Hunters, Evil wins. Otherwise, Good wins."
      // Once Dracula has guessed as many candidates as required or chooses, if they cannot reach it:
      setGameState(prev => ({
        ...prev,
        draculaGuessedHunterIds: newGuesses,
      }));
    }
  };

  const handleGoodWinsFinale = () => {
    playVictorySound(true);
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    setGameState(prev => ({
      ...prev,
      winner: 'good',
      winReason: `Dracula failed to find the required ${requiredHunterGuesses} Hunters! The masquerade is broken and Good prevails!`,
      phase: 'game_over',
    }));
  };

  // Remaining eligible nominees for Hunting Party
  const eligibleNominees = players.filter(p => !huntingPartyPlayerIds.includes(p.id));
  const isHuntingPartyFull = huntingPartyPlayerIds.length >= targetHuntingPartySize;
  const lastHunterMemberId = huntingPartyPlayerIds[huntingPartyPlayerIds.length - 1];
  const lastHunterMember = players.find(p => p.id === lastHunterMemberId);

  return (
    <div className="space-y-4 pb-24">
      {/* Finale Timer */}
      <TimerWidget
        label="Finale Timer (6-8 Minutes)"
        defaultMinutes={settings.finaleTimeMinutes}
        onTimeExpire={() => {}}
      />

      {/* GAME OVER BANNER */}
      {winner && (
        <div
          className={`rounded-2xl border p-5 text-center shadow-xl ${
            winner === 'good'
              ? 'bg-emerald-950/80 border-emerald-500 shadow-emerald-950/50'
              : 'bg-rose-950/90 border-rose-600 shadow-rose-950/60'
          }`}
        >
          <div className="flex justify-center mb-2">
            {winner === 'good' ? (
              <Trophy className="w-12 h-12 text-emerald-400 animate-bounce" />
            ) : (
              <Skull className="w-12 h-12 text-rose-400 animate-pulse" />
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-black tracking-wider uppercase mb-1">
            {winner === 'good' ? 'Good Victory!' : 'Evil Victory!'}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-200 max-w-md mx-auto leading-relaxed">
            {winReason}
          </p>
        </div>
      )}

      {/* STEP 1: FORM HUNTING PARTY */}
      <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm sm:text-base font-serif font-bold text-amber-100">
              Step 1: Form Hunting Party
            </h2>
          </div>
          <span className="text-xs font-mono font-bold bg-amber-950 text-amber-300 px-2.5 py-1 rounded-full border border-amber-800">
            {huntingPartyPlayerIds.length} / {targetHuntingPartySize} Members
          </span>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Nominate players one at a time. A nominee needs votes from at least half the players ({votesNeeded}+ hands). If an Evil player is admitted, <strong className="text-red-400">Evil wins immediately!</strong>
        </p>

        {/* Current Hunting Party Roster */}
        <div className="bg-zinc-950/80 rounded-xl p-3 border border-zinc-800 space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
            Admitted Hunting Party Members:
          </span>
          {huntingPartyPlayerIds.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">No members yet. Nominate a player below.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {huntingPartyPlayerIds.map((pId, idx) => {
                const p = players.find(x => x.id === pId);
                if (!p) return null;
                const pColor = getPlayerColor(p.colorId);
                const isLast = idx === huntingPartyPlayerIds.length - 1;

                return (
                  <div
                    key={pId}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold ${
                      isLast && isHuntingPartyFull
                        ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-200'
                    }`}
                  >
                    <span
                      style={{ backgroundColor: pColor.hex, color: pColor.textColor }}
                      className="w-4 h-4 rounded font-mono text-[9px] flex items-center justify-center"
                    >
                      {p.seat}
                    </span>
                    <span>{p.name}</span>
                    {isLast && isHuntingPartyFull && (
                      <span className="text-[10px] text-amber-400 font-mono">(Crossbow Bearer)</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Nomination & 10s Countdown Voting Machine */}
        {!isHuntingPartyFull && !winner && (
          <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl p-3 space-y-2.5">
            <span className="text-xs font-bold text-amber-200 block">
              Conduct a Nomination:
            </span>

            {/* Choose Nominee */}
            <div className="flex flex-wrap gap-1.5">
              {eligibleNominees.map(p => {
                const pColor = getPlayerColor(p.colorId);
                const isNominated = nominatedPlayerId === p.id;

                return (
                  <button
                    key={p.id}
                    onClick={() => startNominationCountdown(p.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      isNominated
                        ? 'bg-amber-500 text-amber-950 border-amber-300 shadow-md shadow-amber-950'
                        : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-amber-700'
                    }`}
                  >
                    <span
                      style={{ backgroundColor: pColor.hex, color: pColor.textColor }}
                      className="w-4 h-4 rounded font-mono text-[9px] flex items-center justify-center"
                    >
                      {p.seat}
                    </span>
                    <span>{p.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Countdown Box */}
            {nominatedPlayerId && (
              <div className="bg-zinc-950 rounded-xl p-3 border border-amber-800 text-center space-y-2">
                <span className="text-[11px] text-zinc-400 block">
                  Voting on nominee:{' '}
                  <strong className="text-amber-200">
                    {players.find(p => p.id === nominatedPlayerId)?.name}
                  </strong>{' '}
                  (Needs {votesNeeded}+ votes)
                </span>

                <div className="flex items-center justify-center gap-3">
                  <div className="font-mono text-3xl font-black text-amber-400">
                    {nominationSeconds}s
                  </div>
                  <button
                    onClick={() => setIsNominationCounting(!isNominationCounting)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  >
                    {isNominationCounting ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    onClick={() => {
                      setNominationSeconds(10);
                      setIsNominationCounting(true);
                    }}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-2 border-t border-zinc-800 flex items-center justify-center gap-3">
                  <button
                    onClick={() => handleResolveNomination(false)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-bold"
                  >
                    <XCircle className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Rejected (&lt; {votesNeeded} votes)</span>
                  </button>

                  <button
                    onClick={() => handleResolveNomination(true)}
                    className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-700 to-green-600 hover:from-emerald-600 hover:to-green-500 text-white text-xs font-bold shadow-md shadow-emerald-950"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approved (≥ {votesNeeded} votes)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* STEP 2: SHOOT DRACULA */}
      {isHuntingPartyFull && !winner && (
        <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-rose-400" />
            <h2 className="text-sm sm:text-base font-serif font-bold text-rose-100">
              Step 2: Shoot Dracula
            </h2>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">
            The last player to join the party ({lastHunterMember?.name}) holds the Crossbow and chooses one suspect to shoot! Renfield asks: <em className="text-rose-300 font-semibold">"Is that your final answer?"</em>
          </p>

          {!shotPlayerId ? (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-zinc-400 block uppercase">
                Select Shot Target:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {players.map(p => {
                  const pColor = getPlayerColor(p.colorId);
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleShootPlayer(p.id)}
                      className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-red-600 flex items-center gap-2 text-xs font-bold text-zinc-200 transition-all text-left"
                    >
                      <span
                        style={{ backgroundColor: pColor.hex, color: pColor.textColor }}
                        className="w-5 h-5 rounded font-mono text-[10px] flex items-center justify-center flex-shrink-0"
                      >
                        {p.seat}
                      </span>
                      <span className="truncate">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-700 text-xs text-emerald-200 flex items-center justify-between">
              <div>
                <span className="block font-bold text-emerald-300">
                  Target Shot: {players.find(p => p.id === shotPlayerId)?.name}
                </span>
                <span>Dracula was shot! Proceeding to Dracula's Last Chance.</span>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
          )}
        </div>
      )}

      {/* STEP 3: DRACULA'S LAST CHANCE */}
      {shotPlayerId && !isFivePlayerGame && !winner && (
        <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-purple-400" />
              <h2 className="text-sm sm:text-base font-serif font-bold text-purple-100">
                Step 3: Dracula's Last Chance
              </h2>
            </div>
            <span className="text-xs font-mono font-bold bg-purple-950 text-purple-300 px-2.5 py-1 rounded-full border border-purple-800">
              Needs {requiredHunterGuesses} Hunters
            </span>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">
            Give Dracula 3 minutes with his Brides to deliberate. Dracula then points to suspects one at a time. If Dracula finds {requiredHunterGuesses} Hunters, <strong className="text-rose-400">Evil steals the win!</strong>
          </p>

          {/* 3-Minute Timer Bar */}
          <div className="bg-zinc-950 rounded-xl p-2.5 border border-purple-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-mono font-black text-purple-200 text-sm">
                {Math.floor(draculaSecondsRemaining / 60)}:
                {String(draculaSecondsRemaining % 60).padStart(2, '0')}
              </span>
            </div>
            <button
              onClick={() => setDraculaTimerActive(!draculaTimerActive)}
              className="px-2.5 py-1 rounded-lg bg-purple-900 hover:bg-purple-800 text-purple-100 text-xs font-bold"
            >
              {draculaTimerActive ? 'Pause Deliberation' : 'Start 3m Timer'}
            </button>
          </div>

          {/* Dracula Guessing Buttons */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-zinc-400 block uppercase">
              Suspects Dracula Points To:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {players
                .filter(p => p.role !== 'dracula')
                .map(p => {
                  const pColor = getPlayerColor(p.colorId);
                  const isGuessed = guessedHunters.includes(p.id);
                  const isHunter = p.role === 'hunter';

                  return (
                    <button
                      key={p.id}
                      disabled={isGuessed}
                      onClick={() => handleDraculaGuessHunter(p.id)}
                      className={`p-2 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
                        isGuessed
                          ? isHunter
                            ? 'bg-red-950/80 border-red-600 text-red-200'
                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-500'
                          : 'bg-zinc-900 border-zinc-800 hover:border-purple-600 text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          style={{ backgroundColor: pColor.hex, color: pColor.textColor }}
                          className="w-4 h-4 rounded font-mono text-[9px] flex items-center justify-center flex-shrink-0"
                        >
                          {p.seat}
                        </span>
                        <span className="truncate">{p.name}</span>
                      </div>
                      {isGuessed && (
                        <span className="text-[10px] font-mono">
                          {isHunter ? 'HUNTER!' : 'Not Hunter'}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Good Wins Button */}
          <div className="pt-2 border-t border-zinc-800 flex justify-end">
            <button
              onClick={handleGoodWinsFinale}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-700 to-green-600 hover:from-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-950"
            >
              <Trophy className="w-4 h-4" />
              <span>Dracula Failed to Find Hunters ➔ Good Wins!</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
