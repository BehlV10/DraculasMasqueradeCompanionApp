import React, { useState, useMemo } from 'react';
import { GameState, Player, RoomHeartCount, RoomLogEntry, RoomCardDefinition, RoomCardCategory } from '../types/game';
import { ROOM_CARDS, ROOM_CATEGORIES } from '../data/gameData';
import { computeRoomAnswer, getPlayerColor, isEvilRole } from '../utils/gameLogic';
import { playFailSound, playPassSound } from '../utils/sound';
import { TimerWidget } from './TimerWidget';
import { SeatingChart } from './SeatingChart';
import {
  Compass,
  Check,
  X,
  Heart,
  Search,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Layers,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  CheckCircle2,
  Ghost,
  CircleDot,
  Sparkles,
  Tag,
} from 'lucide-react';

interface RoomsTabProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  onAdvanceToFinale: () => void;
}

export const RoomsTab: React.FC<RoomsTabProps> = ({
  gameState,
  setGameState,
  onAdvanceToFinale,
}) => {
  const { players, roomsHistory, settings } = gameState;
  const currentRoomNumber = roomsHistory.length + 1;

  // Active room runner form state
  const [hearts, setHearts] = useState<RoomHeartCount>(2);
  const [leaderId, setLeaderId] = useState<string>(players[0]?.id || '');
  const [participantIds, setParticipantIds] = useState<string[]>(
    players.slice(0, 2).map(p => p.id)
  );
  const [votes, setVotes] = useState<Record<string, 'pass' | 'fail'>>({});
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('multi2_evil_pairs');
  const [customQuestionText] = useState<string>('');
  const [targetPlayerAId, setTargetPlayerAId] = useState<string>('');
  const [targetPlayerBId, setTargetPlayerBId] = useState<string>('');
  const [numericParam, setNumericParam] = useState<number>(1);
  const [answerGiven, setAnswerGiven] = useState<string>('');
  
  // Table view toggle state
  const [showSeatingTable, setShowSeatingTable] = useState<boolean>(false);

  // Card Picker Sheet & Category Route State
  const [isCardPickerOpen, setIsCardPickerOpen] = useState<boolean>(false);
  const [questionSearch, setQuestionSearch] = useState<string>('');
  const [cardHeartFilter, setCardHeartFilter] = useState<'all' | 1 | 2 | 3>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | RoomCardCategory>('all');
  const [modalCategoryFilter, setModalCategoryFilter] = useState<'all' | RoomCardCategory>('all');

  // Cards available for current room hearts
  const cardsForCurrentHearts = useMemo(() => {
    return ROOM_CARDS.filter(c => c.hearts === hearts);
  }, [hearts]);

  // Categories available for current room hearts
  const availableCategoriesForHearts = useMemo(() => {
    return ROOM_CATEGORIES.filter(cat =>
      cardsForCurrentHearts.some(c => c.category === cat.id)
    );
  }, [cardsForCurrentHearts]);

  // Questions available given selected hearts & selected category
  const availableQuestionsForCategory = useMemo(() => {
    if (selectedCategory === 'all') return cardsForCurrentHearts;
    const filtered = cardsForCurrentHearts.filter(c => c.category === selectedCategory);
    return filtered.length > 0 ? filtered : cardsForCurrentHearts;
  }, [cardsForCurrentHearts, selectedCategory]);

  const handleSelectCategory = (catId: 'all' | RoomCardCategory) => {
    setSelectedCategory(catId);
    if (catId !== 'all') {
      const match = cardsForCurrentHearts.find(c => c.category === catId);
      if (match && (!selectedQuestionId || ROOM_CARDS.find(c => c.id === selectedQuestionId)?.category !== catId)) {
        setSelectedQuestionId(match.id);
      }
    }
  };

  // Open modal pre-synced to current room hearts and category
  const handleOpenPickerModal = () => {
    setCardHeartFilter(hearts);
    setModalCategoryFilter(selectedCategory);
    setIsCardPickerOpen(true);
  };

  // When hearts count changes, ensure participantIds count matches
  const handleHeartsChange = (newHearts: RoomHeartCount) => {
    setHearts(newHearts);
    const newParticipants: string[] = [leaderId];
    for (const p of players) {
      if (newParticipants.length >= newHearts) break;
      if (!newParticipants.includes(p.id)) {
        newParticipants.push(p.id);
      }
    }
    setParticipantIds(newParticipants);

    // If currently selected category has no cards for new heart tier, reset to 'all'
    const newHeartsCards = ROOM_CARDS.filter(c => c.hearts === newHearts);
    let nextCategory = selectedCategory;
    if (selectedCategory !== 'all' && !newHeartsCards.some(c => c.category === selectedCategory)) {
      nextCategory = 'all';
      setSelectedCategory('all');
    }

    // Ensure selected question matches new hearts
    const currentQ = ROOM_CARDS.find(c => c.id === selectedQuestionId);
    if (!currentQ || currentQ.hearts !== newHearts) {
      const validFirst = nextCategory !== 'all'
        ? newHeartsCards.find(c => c.category === nextCategory) || newHeartsCards[0]
        : newHeartsCards[0];
      if (validFirst) setSelectedQuestionId(validFirst.id);
    }
  };

  // When a question is selected from the picker
  const handleSelectQuestion = (card: RoomCardDefinition) => {
    setSelectedQuestionId(card.id);
    if (card.hearts !== hearts) {
      handleHeartsChange(card.hearts);
    }
    setSelectedCategory(card.category);
    setIsCardPickerOpen(false);
  };

  // Cycle to previous / next card in the active category pool
  const handleCycleCard = (direction: 'prev' | 'next') => {
    const pool = availableQuestionsForCategory;
    const currentIndex = pool.findIndex(c => c.id === selectedQuestionId);
    if (currentIndex === -1) {
      if (pool.length > 0) setSelectedQuestionId(pool[0].id);
      return;
    }
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= pool.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = pool.length - 1;
    setSelectedQuestionId(pool[nextIndex].id);
  };

  const handleLeaderChange = (newLeaderId: string) => {
    setLeaderId(newLeaderId);
    if (!participantIds.includes(newLeaderId)) {
      setParticipantIds([newLeaderId, ...participantIds.slice(1, hearts)]);
    } else {
      const others = participantIds.filter(id => id !== newLeaderId);
      setParticipantIds([newLeaderId, ...others.slice(0, hearts - 1)]);
    }
  };

  const toggleParticipant = (pId: string) => {
    if (pId === leaderId) return; // Leader cannot be removed
    if (participantIds.includes(pId)) {
      if (participantIds.length > 1) {
        setParticipantIds(participantIds.filter(id => id !== pId));
      }
    } else {
      if (participantIds.length < hearts) {
        setParticipantIds([...participantIds, pId]);
      } else {
        setParticipantIds([...participantIds.slice(0, hearts - 1), pId]);
      }
    }
  };

  const handleToggleVote = (pId: string) => {
    const player = players.find(p => p.id === pId);
    if (player?.role === 'dracula' && gameState.chosenBlessingId === 2) {
      alert("Under Puppet Strings (Dark Blessing #2), Dracula may only cast Pass votes!");
      return;
    }

    setVotes(prev => {
      const current = prev[pId] || 'pass';
      return {
        ...prev,
        [pId]: current === 'pass' ? 'fail' : 'pass',
      };
    });
  };

  // Calculate actual outcome with dark blessings & powers
  const rawVotes: Record<string, 'pass' | 'fail'> = {};
  const processedVotes: Record<string, 'pass' | 'fail'> = {};

  participantIds.forEach(pId => {
    const raw = votes[pId] || 'pass';
    rawVotes[pId] = raw;

    const player = players.find(p => p.id === pId);
    if (player?.isPuppet) {
      processedVotes[pId] = 'fail';
    } else if (player?.role === 'dracula' && raw === 'fail' && gameState.chosenBlessingId === 4) {
      processedVotes[pId] = 'pass';
    } else {
      processedVotes[pId] = raw;
    }
  });

  const isShadowForcedFail = gameState.shadowRoomNumber === currentRoomNumber;
  const isSewardForcedPass = gameState.sewardRoomNumber === currentRoomNumber;
  const isEchoingCurseFail = gameState.echoingCurseActive;

  let finalOutcome: 'pass' | 'fail' = 'pass';
  if (isSewardForcedPass) {
    finalOutcome = 'pass';
  } else if (isShadowForcedFail || isEchoingCurseFail) {
    finalOutcome = 'fail';
  } else {
    const anyFailed = Object.values(processedVotes).some(v => v === 'fail');
    finalOutcome = anyFailed ? 'fail' : 'pass';
  }

  const selectedQuestion = ROOM_CARDS.find(q => q.id === selectedQuestionId) || ROOM_CARDS[0];
  const leaderPlayer = players.find(p => p.id === leaderId) || players[0];
  const participantPlayers = participantIds.map(id => players.find(p => p.id === id)!).filter(Boolean);
  const targetPlayerA = players.find(p => p.id === targetPlayerAId);
  const targetPlayerB = players.find(p => p.id === targetPlayerBId);
  const draculaPlayer = players.find(p => p.role === 'dracula');

  const answerAnalysis = selectedQuestionId
    ? computeRoomAnswer(
        selectedQuestionId,
        gameState,
        leaderPlayer,
        participantPlayers,
        targetPlayerA,
        targetPlayerB,
        numericParam
      )
    : null;

  const activeCategoryConfig = ROOM_CATEGORIES.find(c => c.id === selectedQuestion.category);

  // Cards matching the current heart filter in modal (to calculate dynamic category counts)
  const cardsMatchingHeartFilter = useMemo(() => {
    if (cardHeartFilter === 'all') return ROOM_CARDS;
    return ROOM_CARDS.filter(c => c.hearts === cardHeartFilter);
  }, [cardHeartFilter]);

  // Real-time keyword, heart & category search logic for modal
  const filteredCards = useMemo(() => {
    return ROOM_CARDS.filter(card => {
      // Heart count filter
      if (cardHeartFilter !== 'all' && card.hearts !== cardHeartFilter) {
        return false;
      }
      // Category filter in modal
      if (modalCategoryFilter !== 'all' && card.category !== modalCategoryFilter) {
        return false;
      }
      // Keyword search
      if (questionSearch.trim()) {
        const query = questionSearch.toLowerCase().trim();
        const matchesQuestion = card.question.toLowerCase().includes(query);
        const matchesCategory = card.category.toLowerCase().includes(query);
        const matchesOptions = card.options?.some(opt => opt.toLowerCase().includes(query));
        return matchesQuestion || matchesCategory || matchesOptions;
      }
      return true;
    });
  }, [cardHeartFilter, modalCategoryFilter, questionSearch]);

  // Grouped cards for the modal when browsing all categories without a search query
  const modalCategoryGroups = useMemo(() => {
    return ROOM_CATEGORIES.map(cat => ({
      cat,
      cards: filteredCards.filter(c => c.category === cat.id),
    })).filter(g => g.cards.length > 0);
  }, [filteredCards]);

  const soloCount = ROOM_CARDS.filter(q => q.hearts === 1).length;
  const twoHeartsCount = ROOM_CARDS.filter(q => q.hearts === 2).length;
  const threeHeartsCount = ROOM_CARDS.filter(q => q.hearts === 3).length;

  const handleConfirmRoom = () => {
    if (finalOutcome === 'pass') {
      playPassSound();
    } else {
      playFailSound();
    }

    const dracula = players.find(p => p.role === 'dracula');
    const draculaFailedHere = dracula && rawVotes[dracula.id] === 'fail' && gameState.chosenBlessingId === 4;

    const logEntry: RoomLogEntry = {
      id: `room_${Date.now()}`,
      roomNumber: currentRoomNumber,
      hearts,
      leaderPlayerId: leaderId,
      participantPlayerIds: participantIds,
      votes: processedVotes,
      rawVotes,
      outcome: finalOutcome,
      questionId: selectedQuestionId,
      questionText: selectedQuestion?.question || customQuestionText || 'Custom Room Question',
      calculatedTrueAnswer: answerAnalysis?.trueAnswer,
      suggestedLie: answerAnalysis?.recommendedLie,
      answerGiven: answerGiven || (finalOutcome === 'pass' ? answerAnalysis?.trueAnswer || 'Pass' : answerAnalysis?.recommendedLie || 'Fail'),
      timestamp: Date.now(),
      echoingCurseTriggered: isEchoingCurseFail,
      gatheringShadowsTriggered: isShadowForcedFail,
      sewardPassedTriggered: isSewardForcedPass,
    };

    setGameState(prev => ({
      ...prev,
      roomsHistory: [...prev.roomsHistory, logEntry],
      echoingCurseActive: draculaFailedHere ? true : false,
      players: prev.players.map(p => {
        if (participantIds.includes(p.id)) {
          return {
            ...p,
            heartsRemaining: Math.max(0, p.heartsRemaining - 1),
          };
        }
        return p;
      }),
    }));

    setVotes({});
    setAnswerGiven('');
  };

  const renderCardItem = (card: RoomCardDefinition) => {
    const isCurrent = selectedQuestionId === card.id;
    const catConfig = ROOM_CATEGORIES.find(c => c.id === card.category);

    return (
      <div
        key={card.id}
        onClick={() => handleSelectQuestion(card)}
        className={`p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.99] ${
          isCurrent
            ? 'bg-rose-950/80 border-rose-500 shadow-md ring-1 ring-rose-500/40'
            : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/60'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: card.hearts }).map((_, i) => (
                <Heart key={i} className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              ))}
            </div>
            <span className="text-[11px] font-mono font-bold text-zinc-300">
              {card.hearts === 1 ? 'Solo (1♥)' : `${card.hearts} Players (${card.hearts}♥)`}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {catConfig ? (
              <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${catConfig.badgeClass}`}>
                <span>{catConfig.emoji}</span>
                <span>{catConfig.shortName}</span>
              </span>
            ) : (
              <span className="text-[10px] font-mono uppercase bg-zinc-950 text-zinc-400 px-2 py-0.5 rounded border border-zinc-800">
                {card.category}
              </span>
            )}
            {isCurrent && (
              <CheckCircle2 className="w-4 h-4 text-rose-400" />
            )}
          </div>
        </div>

        <p className="text-xs sm:text-sm font-semibold text-zinc-100 leading-snug">
          {card.question}
        </p>

        {card.options && (
          <div className="flex flex-wrap gap-1 mt-2 text-[10px] text-zinc-400">
            <span className="text-zinc-500">Possible:</span>
            {card.options.slice(0, 5).map((opt, i) => (
              <span key={i} className="bg-black/60 px-1.5 py-0.2 rounded border border-zinc-800 text-zinc-300">
                {opt}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Exploration Timer */}
      <TimerWidget
        label="Castle Exploration Timer"
        defaultMinutes={settings.explorationTimeMinutes}
        onTimeExpire={() => {}}
      />

      {/* Main Room Runner Card */}
      <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 p-3 sm:p-4">
        {/* Header with Room # and Heart Switcher */}
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-rose-400" />
            <h2 className="text-sm sm:text-base font-serif font-bold text-rose-100">
              Run Room #{currentRoomNumber}
            </h2>
          </div>

          {/* Quick Hearts Toggle (1, 2, or 3 Hearts) */}
          <div className="flex items-center gap-1 bg-zinc-900/90 rounded-xl p-1 border border-zinc-800">
            {([1, 2, 3] as RoomHeartCount[]).map(h => (
              <button
                key={h}
                onClick={() => handleHeartsChange(h)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  hearts === h
                    ? 'bg-rose-950 text-rose-200 border border-rose-700 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Heart className={`w-3 h-3 ${hearts === h ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{h === 1 ? 'Solo' : `${h}P`}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Seating Table & Spirits Access Banner */}
        <div className="bg-zinc-900/60 rounded-xl p-2.5 border border-zinc-800/80 mb-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CircleDot className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-semibold text-zinc-200">
                Seating Order & Spirits Table
              </span>
              {gameState.chosenBlessingId === 3 && (
                <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-mono font-bold flex items-center gap-1">
                  <Ghost className="w-3 h-3 text-purple-400" />
                  Spirits Active
                </span>
              )}
            </div>

            <button
              onClick={() => setShowSeatingTable(prev => !prev)}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors flex items-center gap-1"
            >
              {showSeatingTable ? 'Hide Table' : 'Show Table'}
            </button>
          </div>

          {showSeatingTable && (
            <div className="pt-2 border-t border-zinc-800">
              <SeatingChart
                players={players}
                restlessSpirits={gameState.chosenBlessingId === 3 ? gameState.restlessSpirits : undefined}
              />
            </div>
          )}
        </div>

        {/* Special Room Overrides (Blessing #5 Gathering Shadows & Hunter Dr. Seward) */}
        {(gameState.chosenBlessingId === 5 || gameState.settings.selectedHunters.includes('dr_john_seward')) && (
          <div className="bg-[#121320] rounded-xl p-3 border border-purple-900/50 mb-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-serif font-bold text-purple-200">
                Special Room Overrides (Dark Blessing & Hunter Powers)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {/* Gathering Shadows */}
              {gameState.chosenBlessingId === 5 && (
                <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-900/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-300 flex items-center gap-1">
                      <span>🌑 Gathering Shadows (Dracula):</span>
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {gameState.shadowRoomNumber ? `Auto-Fails Room #${gameState.shadowRoomNumber}` : 'Not designated'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-400">Target Room:</label>
                    <select
                      value={gameState.shadowRoomNumber || ''}
                      onChange={e => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        setGameState(prev => ({ ...prev, shadowRoomNumber: val }));
                      }}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 flex-1 font-mono focus:border-red-500"
                    >
                      <option value="">None (Decide later)</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => (
                        <option key={r} value={r}>
                          Room #{r} (Will Auto-Fail)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Dr. John Seward */}
              {gameState.settings.selectedHunters.includes('dr_john_seward') && (
                <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-900/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-300 flex items-center gap-1">
                      <span>💉 Dr. Seward's Tonic (Hunter):</span>
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {gameState.sewardRoomNumber ? `Auto-Passes Room #${gameState.sewardRoomNumber}` : 'Not designated'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-400">Target Room:</label>
                    <select
                      value={gameState.sewardRoomNumber || ''}
                      onChange={e => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        setGameState(prev => ({ ...prev, sewardRoomNumber: val }));
                      }}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-200 flex-1 font-mono focus:border-blue-500"
                    >
                      <option value="">None (Decide later)</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => (
                        <option key={r} value={r}>
                          Room #{r} (Will Auto-Pass)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 1. ELEGANT CARD DISPLAY CONTAINER */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-rose-400" />
              Active Room Question Card
            </span>

            {/* Change Card Button */}
            <button
              onClick={handleOpenPickerModal}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-bold transition-all shadow-sm"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Full Library</span>
            </button>
          </div>

          {/* Quick Topic / Category Filter Chips for current Heart tier */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 mb-2 scrollbar-none">
            <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono shrink-0 flex items-center gap-1 mr-0.5">
              <Tag className="w-3 h-3 text-rose-400" />
              Topic:
            </span>
            <button
              onClick={() => handleSelectCategory('all')}
              className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-zinc-200 text-black shadow-sm'
                  : 'bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              All ({cardsForCurrentHearts.length})
            </button>
            {availableCategoriesForHearts.map(cat => {
              const count = cardsForCurrentHearts.filter(c => c.category === cat.id).length;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    isSelected
                      ? cat.activeChipClass
                      : 'bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.shortName}</span>
                  <span className="text-[10px] opacity-75 font-mono">({count})</span>
                </button>
              );
            })}
          </div>

          {/* The Physical Card Replica */}
          <div className="rounded-2xl bg-gradient-to-br from-[#161726] to-[#0f101b] border-2 border-rose-900/70 p-3.5 sm:p-4 shadow-lg shadow-black/40 relative overflow-hidden">
            {/* Card Top: Hearts & Category Badge */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-800/80 px-2 py-0.5 rounded-full">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: selectedQuestion.hearts }).map((_, i) => (
                    <Heart key={i} className="w-3 h-3 fill-rose-500 text-rose-500" />
                  ))}
                </div>
                <span className="text-[11px] font-mono font-bold text-rose-200 ml-1">
                  {selectedQuestion.hearts === 1 ? 'Solo Room' : `${selectedQuestion.hearts}-Player Room`}
                </span>
              </div>

              {activeCategoryConfig ? (
                <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${activeCategoryConfig.badgeClass}`}>
                  <span>{activeCategoryConfig.emoji}</span>
                  <span>{activeCategoryConfig.name}</span>
                </span>
              ) : (
                <span className="text-[10px] font-mono uppercase font-bold text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded-full border border-zinc-800">
                  {selectedQuestion.category}
                </span>
              )}
            </div>

            {/* Question Text */}
            <p className="font-serif text-sm sm:text-base font-bold text-rose-50 leading-snug my-2">
              "{selectedQuestion.question}"
            </p>

            {/* Direct Question Dropdown for selected Category */}
            <div className="mt-2 pt-2 border-t border-zinc-800/60">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase font-bold text-zinc-400 shrink-0">
                  Select Question:
                </span>
                <select
                  value={selectedQuestionId}
                  onChange={e => setSelectedQuestionId(e.target.value)}
                  className="flex-1 min-w-0 bg-zinc-900/90 border border-zinc-700/80 hover:border-rose-600/70 rounded-lg px-2 py-1 text-xs text-zinc-100 font-medium truncate focus:outline-none focus:border-rose-500 transition-colors"
                >
                  {availableQuestionsForCategory.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.question}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Cycle Controls: Previous / Next Card */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 mt-2">
              <button
                onClick={() => handleCycleCard('prev')}
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-rose-300 font-medium py-0.5 px-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev card</span>
              </button>

              <button
                onClick={handleOpenPickerModal}
                className="text-xs text-rose-400 font-semibold hover:underline"
              >
                Browse all {ROOM_CARDS.length} cards ➔
              </button>

              <button
                onClick={() => handleCycleCard('next')}
                className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-rose-300 font-medium py-0.5 px-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
              >
                <span>Next card</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Inline Parameters for the Card (if needed) */}
          {selectedQuestion.question.includes('[Player') && (
            <div className="flex flex-wrap gap-2 mt-2.5 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
              <div className="flex-1 min-w-[130px]">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Target Player A:
                </label>
                <select
                  value={targetPlayerAId}
                  onChange={e => setTargetPlayerAId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-lg p-2 focus:outline-none"
                >
                  <option value="">-- Choose Target --</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({getPlayerColor(p.colorId).name})
                    </option>
                  ))}
                </select>
              </div>

              {selectedQuestion.question.includes('[Player B]') && (
                <div className="flex-1 min-w-[130px]">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Target Player B:
                  </label>
                  <select
                    value={targetPlayerBId}
                    onChange={e => setTargetPlayerBId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-lg p-2 focus:outline-none"
                  >
                    <option value="">-- Choose Target --</option>
                    {players.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({getPlayerColor(p.colorId).name})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {(selectedQuestion.question.includes('[1st') || selectedQuestion.question.includes('___ seats') || selectedQuestion.question.includes('[X] or [Y]')) && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                Parameter (Blessing / Seat Distance):
              </label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    onClick={() => setNumericParam(num)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      numericParam === num
                        ? 'bg-rose-950 text-rose-200 border-rose-600 shadow-sm'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    #{num}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. Room Leader & Participants Selection */}
        <div className="space-y-2 mb-4">
          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
            Room Leader (★) & Participants ({participantIds.length}/{hearts})
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {players.map(p => {
              const pColor = getPlayerColor(p.colorId);
              const isLeader = leaderId === p.id;
              const isParticipant = participantIds.includes(p.id);

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    if (isLeader) return;
                    toggleParticipant(p.id);
                  }}
                  className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    isLeader
                      ? 'bg-amber-950/50 border-amber-500 text-amber-200'
                      : isParticipant
                      ? 'bg-rose-950/40 border-rose-600 text-rose-200'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      style={{ backgroundColor: pColor.hex, color: pColor.textColor }}
                      className="w-5 h-5 rounded-md font-mono text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                    >
                      {p.seat}
                    </span>
                    <span className="text-xs font-semibold truncate">
                      {p.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleLeaderChange(p.id);
                      }}
                      title="Set as Room Leader"
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        isLeader
                          ? 'bg-amber-600 text-black font-bold'
                          : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      ★
                    </button>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {p.heartsRemaining}♥
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Storyteller Secret Voting Protocol */}
        <div className="bg-zinc-950/80 rounded-xl p-3 border border-rose-950/50 my-3 text-center space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-rose-400 font-bold block mb-1">
            Storyteller Secret Voting Protocol:
          </span>
          <p className="text-xs text-zinc-200 font-medium">
            "Face me, with your backs to the other players."
          </p>
          <p className="text-xs text-zinc-300 font-medium">
            "Close your eyes and place a hand on your chest."
          </p>
          <p className="text-xs text-rose-300 font-bold">
            "Thumbs up to Pass. Claw to Fail."
          </p>
        </div>

        {/* 4. Record Secret Votes */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Secret Votes (Tap to Toggle)
            </span>
            <span className="text-[11px] text-zinc-500">
              Good must Pass; Evil may Fail
            </span>
          </div>

          <div className="space-y-1.5">
            {participantPlayers.map(p => {
              const vote = votes[p.id] || 'pass';
              const pColor = getPlayerColor(p.colorId);
              const isEvil = isEvilRole(p.role);

              return (
                <div
                  key={p.id}
                  className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span
                      style={{ backgroundColor: pColor.hex, color: pColor.textColor }}
                      className="w-5 h-5 rounded-md font-mono text-xs font-bold flex items-center justify-center"
                    >
                      {p.seat}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-zinc-200">
                        {p.name} {p.id === leaderId ? '(Leader ★)' : ''}
                      </span>
                      {isEvil && (
                        <span className="ml-1.5 text-[9px] bg-red-950 text-red-300 px-1 py-0.2 rounded border border-red-800">
                          Evil
                        </span>
                      )}
                      {p.isCorrupted && (
                        <span className="ml-1 text-[9px] bg-red-950 text-red-300 px-1 py-0.2 rounded border border-red-800 animate-pulse">
                          🩸 Corrupted (Registers Evil)
                        </span>
                      )}
                      {p.isPuppet && (
                        <span className="ml-1 text-[9px] bg-purple-950 text-purple-300 px-1 py-0.2 rounded border border-purple-800">
                          🎭 Puppet Strings (Secretly Fails)
                        </span>
                      )}
                      {p.role === 'dracula' && gameState.chosenBlessingId === 2 && (
                        <span className="ml-1 text-[9px] bg-blue-950 text-blue-300 px-1 py-0.2 rounded border border-blue-800">
                          Must Pass (Puppet Strings)
                        </span>
                      )}
                      {p.role === 'dracula' && gameState.chosenBlessingId === 4 && vote === 'fail' && (
                        <span className="ml-1 text-[9px] bg-amber-950 text-amber-300 px-1 py-0.2 rounded border border-amber-800 animate-pulse">
                          ⚡ Echoing Curse (Treated as Pass)
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleVote(p.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                      vote === 'pass'
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700'
                        : 'bg-rose-950/90 text-rose-200 border border-rose-600'
                    }`}
                  >
                    {vote === 'pass' ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Pass (Thumbs Up)</span>
                      </>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5" />
                        <span>Fail (Claw)</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Outcome Banner */}
          <div
            className={`p-3 rounded-xl border flex items-center justify-between ${
              finalOutcome === 'pass'
                ? 'bg-emerald-950/40 border-emerald-600 text-emerald-200'
                : 'bg-rose-950/40 border-rose-600 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {finalOutcome === 'pass' ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              )}
              <div>
                <span className="text-xs font-mono font-bold block uppercase tracking-wider">
                  Calculated Outcome:
                </span>
                <span className="text-sm font-bold">
                  {finalOutcome === 'pass' ? 'ROOM PASSED (Give True Answer)' : 'ROOM FAILED (Give False Answer)'}
                </span>
                {isSewardForcedPass && (
                  <span className="text-[11px] text-emerald-300 block font-medium mt-0.5">
                    💉 Dr. Seward's Tonic Triggered: Room #{currentRoomNumber} automatically Passes regardless of votes!
                  </span>
                )}
                {isShadowForcedFail && (
                  <span className="text-[11px] text-rose-300 block font-medium mt-0.5">
                    🌑 Gathering Shadows Triggered: Room #{currentRoomNumber} automatically Fails by Dracula's decree!
                  </span>
                )}
                {isEchoingCurseFail && (
                  <span className="text-[11px] text-rose-300 block font-medium mt-0.5">
                    ⚡ Echoing Curse Triggered: Room #{currentRoomNumber} automatically Fails because Dracula voted Fail in Room #{currentRoomNumber - 1}!
                  </span>
                )}
                {draculaPlayer && rawVotes[draculaPlayer.id] === 'fail' && gameState.chosenBlessingId === 4 && (
                  <span className="text-[11px] text-amber-300 block font-medium mt-0.5 animate-pulse">
                    ⚡ Echoing Curse Activated: Dracula voted Fail! Room #{currentRoomNumber + 1} will automatically Fail!
                  </span>
                )}
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${
                finalOutcome === 'pass'
                  ? 'bg-emerald-900 border-emerald-500 text-emerald-100'
                  : 'bg-rose-900 border-rose-500 text-rose-100'
              }`}
            >
              {finalOutcome.toUpperCase()}
            </span>
          </div>
        </div>

        {/* 5. STORYTELLER ASSISTANT: True Answer & Recommended Lie */}
        {answerAnalysis && (
          <div className="bg-zinc-950/90 rounded-xl p-3 border border-rose-900/60 space-y-2 mb-4">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-serif font-bold text-zinc-200">
                Storyteller Assistant (Renfield's Oracle)
              </span>
            </div>

            {gameState.chosenBlessingId === 3 && (
              <div className="p-2 rounded-lg bg-purple-950/40 border border-purple-800/60 flex items-center gap-2 text-[11px] text-purple-200">
                <Ghost className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 animate-pulse" />
                <div>
                  <span className="font-bold">Blessing #3 Spirits Factored In: </span>
                  {gameState.restlessSpirits && gameState.restlessSpirits.length > 0 ? (
                    <span>
                      {gameState.restlessSpirits.map((s, idx) => (
                        <span key={idx} className="mr-2">
                          #{idx + 1}: {s.alignment === 'evil' ? '🔴 Evil' : '🔵 Good'} (Seats {s.betweenSeatA}&{s.betweenSeatB})
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span>2 Spirits placed between seats</span>
                  )}
                </div>
              </div>
            )}

            <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/50 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                  True Answer:
                </span>
                <span className="font-bold text-emerald-200 text-sm">
                  {answerAnalysis.trueAnswer}
                </span>
              </div>
              <button
                onClick={() => setAnswerGiven(answerAnalysis.trueAnswer)}
                className="px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-sm"
              >
                Use True Answer
              </button>
            </div>

            {finalOutcome === 'fail' && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-rose-400 block">
                    Recommended Plausible Lie:
                  </span>
                  <button
                    onClick={() => setAnswerGiven(answerAnalysis.recommendedLie)}
                    className="px-2.5 py-1 rounded-lg bg-rose-800 hover:bg-rose-700 text-white text-[11px] font-bold shadow-sm"
                  >
                    Use Lie
                  </button>
                </div>
                <span className="font-bold text-rose-200 text-sm block">
                  {answerAnalysis.recommendedLie}
                </span>
                {answerAnalysis.lieReasoning && (
                  <p className="text-[11px] text-zinc-400 italic">
                    Why: {answerAnalysis.lieReasoning}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 6. Answer Given Input */}
        <div className="space-y-1 mb-4">
          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
            Answer Given to Explorers (Recorded in Chronicle)
          </label>
          <input
            type="text"
            value={answerGiven}
            onChange={e => setAnswerGiven(e.target.value)}
            placeholder="e.g. Yes, No, 2, or shorthand answer..."
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-xl p-2.5 focus:outline-none focus:border-rose-500 font-medium"
          />
        </div>

        {/* 7. Confirm & Log Room Button */}
        <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={onAdvanceToFinale}
            className="text-xs text-zinc-400 hover:text-rose-300 font-medium transition-colors"
          >
            Skip to Finale ➔
          </button>

          <button
            onClick={handleConfirmRoom}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-rose-600 hover:from-red-600 hover:to-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-950/50 active:scale-95 transition-all"
          >
            <span>Confirm & Log Room #{currentRoomNumber}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MODAL / BOTTOM SHEET: CARD PICKER (NATIVE MOBILE FEEL) */}
      {isCardPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#111220] border-t sm:border border-rose-900/60 rounded-t-3xl sm:rounded-2xl max-w-xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Sheet Handle for mobile */}
            <div className="sm:hidden w-12 h-1 bg-zinc-700 rounded-full mx-auto mt-2.5 mb-1" />

            {/* Header */}
            <div className="px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-serif font-bold text-rose-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-rose-400" />
                  Select Room Question Card
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Tap any card to load it. Room size adjusts automatically.
                </p>
              </div>
              <button
                onClick={() => setIsCardPickerOpen(false)}
                className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sticky Search & Filter Header */}
            <div className="p-3 bg-zinc-950/80 border-b border-zinc-800/80 space-y-2">
              {/* Real-time Search Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search questions (e.g., 'Dracula', 'Fail', 'Bride')..."
                  value={questionSearch}
                  onChange={e => setQuestionSearch(e.target.value)}
                  autoFocus
                  className="w-full bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs rounded-xl pl-8 pr-8 py-2 focus:outline-none focus:border-rose-500 placeholder:text-zinc-500"
                />
                <Search className="w-4 h-4 text-zinc-500 absolute left-2.5 top-2.5 pointer-events-none" />
                {questionSearch && (
                  <button
                    onClick={() => setQuestionSearch('')}
                    className="absolute right-2.5 top-2 text-zinc-400 hover:text-white p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Heart Filter Chips */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setCardHeartFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    cardHeartFilter === 'all'
                      ? 'bg-zinc-200 text-black shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  All ({ROOM_CARDS.length})
                </button>
                <button
                  onClick={() => setCardHeartFilter(1)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    cardHeartFilter === 1
                      ? 'bg-rose-800 text-white shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  <span>Solo 1♥</span>
                  <span className="text-[10px] opacity-75 font-mono">({soloCount})</span>
                </button>
                <button
                  onClick={() => setCardHeartFilter(2)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    cardHeartFilter === 2
                      ? 'bg-rose-800 text-white shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  <span>2 Players 2♥</span>
                  <span className="text-[10px] opacity-75 font-mono">({twoHeartsCount})</span>
                </button>
                <button
                  onClick={() => setCardHeartFilter(3)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    cardHeartFilter === 3
                      ? 'bg-rose-800 text-white shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  <span>3 Players 3♥</span>
                  <span className="text-[10px] opacity-75 font-mono">({threeHeartsCount})</span>
                </button>
              </div>

              {/* Category / Topic Filter Chips in Modal */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[10px] uppercase font-bold text-zinc-500 font-mono shrink-0 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-rose-400" />
                  Topic:
                </span>
                <button
                  onClick={() => setModalCategoryFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    modalCategoryFilter === 'all'
                      ? 'bg-zinc-200 text-black shadow-sm'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  All Topics ({cardsMatchingHeartFilter.length})
                </button>
                {ROOM_CATEGORIES.map(cat => {
                  const count = cardsMatchingHeartFilter.filter(c => c.category === cat.id).length;
                  if (count === 0 && cardHeartFilter !== 'all') return null;
                  const isSelected = modalCategoryFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setModalCategoryFilter(cat.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                        isSelected
                          ? cat.activeChipClass
                          : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                      }`}
                    >
                      <span>{cat.emoji}</span>
                      <span>{cat.shortName}</span>
                      <span className="text-[10px] opacity-75 font-mono">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Search result count */}
              <div className="flex items-center justify-between text-[10px] text-zinc-400 px-0.5">
                <span>Showing {filteredCards.length} cards</span>
                {questionSearch && (
                  <span className="text-rose-400">Filtered by "{questionSearch}"</span>
                )}
              </div>
            </div>

            {/* Scrollable Card List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {filteredCards.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  No cards matched your filter. Try another search keyword or topic!
                </div>
              ) : modalCategoryFilter === 'all' && !questionSearch.trim() ? (
                /* Grouped by Category when browsing All Topics */
                modalCategoryGroups.map(group => (
                  <div key={group.cat.id} className="space-y-1.5 pt-2 first:pt-0">
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl border bg-zinc-900/90 border-zinc-800 sticky top-0 z-10 backdrop-blur-md">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{group.cat.emoji}</span>
                        <span className="text-xs font-bold text-zinc-200">{group.cat.name}</span>
                        <span className="text-[10px] font-mono text-zinc-400">({group.cards.length} cards)</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
                        {group.cat.description}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {group.cards.map(card => renderCardItem(card))}
                    </div>
                  </div>
                ))
              ) : (
                /* Flat filtered list when specific Category or Search is active */
                filteredCards.map(card => renderCardItem(card))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
