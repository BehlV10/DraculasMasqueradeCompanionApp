import React, { useState, useEffect } from 'react';
import { GamePhase, GameSettings, GameState, Player } from './types/game';
import { GUEST_LIST_RULES, OFFICIAL_COLORS } from './data/gameData';
import { Header } from './components/Header';
import { Navbar, ActiveTab } from './components/Navbar';
import { SetupTab } from './components/SetupTab';
import { NightTab } from './components/NightTab';
import { RoomsTab } from './components/RoomsTab';
import { HistoryTab } from './components/HistoryTab';
import { FinaleTab } from './components/FinaleTab';
import { ReferenceTab } from './components/ReferenceTab';
import { isSoundEnabled, toggleSound } from './utils/sound';

const STORAGE_KEY = 'dracula_masquerade_game_state_v1';

function createDefaultPlayers(count: number): Player[] {
  const rule = GUEST_LIST_RULES[count] || GUEST_LIST_RULES[8];
  const list: Player[] = [];

  // Default color sequence from official sheet
  const defaultColors = OFFICIAL_COLORS.slice(0, count);

  for (let i = 0; i < count; i++) {
    const color = defaultColors[i] || OFFICIAL_COLORS[i % OFFICIAL_COLORS.length];
    let role: Player['role'] = 'guest';
    let hunterType: Player['hunterType'] = undefined;

    if (i === 0) {
      role = 'dracula';
    } else if (i < 1 + rule.brides) {
      role = 'bride';
    } else if (i < 1 + rule.brides + rule.hunters) {
      role = 'hunter';
      const hTypes: Player['hunterType'][] = [
        'van_helsing',
        'jonathan_harker',
        'mina_harker',
        'quincey_morris',
        'dr_john_seward',
      ];
      hunterType = hTypes[i - (1 + rule.brides)];
    } else {
      role = 'guest';
    }

    list.push({
      id: `p_${i + 1}`,
      seat: i + 1,
      name: `Player ${i + 1}`,
      colorId: color.id,
      role,
      hunterType,
      heartsRemaining: 3,
    });
  }

  return list;
}

const defaultSettings: GameSettings = {
  playerCount: 8,
  selectedHunters: ['van_helsing', 'jonathan_harker'],
  explorationTimeMinutes: 20,
  finaleTimeMinutes: 6,
};

const defaultInitialState: GameState = {
  phase: 'setup',
  settings: defaultSettings,
  players: createDefaultPlayers(8),
  chosenBlessingId: null,
  excludedBlessingId: null,
  puppetPlayerId: null,
  corruptedPlayerId: null,
  restlessSpirits: [],
  shadowRoomNumber: null,
  sewardRoomNumber: null,
  echoingCurseActive: false,
  echoingCurseDraculaVotedFail: false,
  roomsHistory: [],
  huntingPartyPlayerIds: [],
  revealedRoles: {},
  shotPlayerId: null,
  draculaGuessedHunterIds: [],
  winner: null,
};

export function App() {
  const [gameState, setGameState] = useState<GameState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to restore saved game', e);
    }
    return defaultInitialState;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('setup');
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Sync state to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    } catch (e) {
      console.error('Failed to save game', e);
    }
  }, [gameState]);

  const handleToggleSound = () => {
    const newState = toggleSound();
    setSoundOn(newState);
  };

  const handleResetGame = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    const newCount = gameState.settings.playerCount || 8;
    const freshState: GameState = {
      ...defaultInitialState,
      settings: {
        ...defaultSettings,
        playerCount: newCount,
      },
      players: createDefaultPlayers(newCount),
    };
    setGameState(freshState);
    setActiveTab('setup');
    setShowResetConfirm(false);
  };

  // Phase transitions
  const handleStartNight = () => {
    setGameState(prev => ({ ...prev, phase: 'night' }));
    setActiveTab('night');
  };

  const handleFinishNight = () => {
    setGameState(prev => ({ ...prev, phase: 'exploration' }));
    setActiveTab('rooms');
  };

  const handleAdvanceToFinale = () => {
    setGameState(prev => ({ ...prev, phase: 'finale' }));
    setActiveTab('finale');
  };

  return (
    <div className="min-h-screen bg-[#0b0b12] text-zinc-100 flex flex-col font-sans selection:bg-rose-900 selection:text-white">
      {/* Top Header */}
      <Header
        phase={gameState.phase}
        soundEnabled={soundOn}
        onToggleSound={handleToggleSound}
        onResetGame={handleResetGame}
        onOpenRules={() => setActiveTab('reference')}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-3 py-3 sm:px-4 sm:py-4">
        {activeTab === 'setup' && (
          <SetupTab
            settings={gameState.settings}
            setSettings={val => {
              if (typeof val === 'function') {
                setGameState(prev => ({ ...prev, settings: val(prev.settings) }));
              } else {
                setGameState(prev => ({ ...prev, settings: val }));
              }
            }}
            players={gameState.players}
            setPlayers={val => {
              if (typeof val === 'function') {
                setGameState(prev => ({ ...prev, players: val(prev.players) }));
              } else {
                setGameState(prev => ({ ...prev, players: val }));
              }
            }}
            restlessSpirits={gameState.chosenBlessingId === 3 ? gameState.restlessSpirits : undefined}
            onStartNight={handleStartNight}
          />
        )}

        {activeTab === 'night' && (
          <NightTab
            gameState={gameState}
            setGameState={setGameState}
            onFinishNight={handleFinishNight}
          />
        )}

        {activeTab === 'rooms' && (
          <RoomsTab
            gameState={gameState}
            setGameState={setGameState}
            onAdvanceToFinale={handleAdvanceToFinale}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTab
            gameState={gameState}
            setGameState={setGameState}
          />
        )}

        {activeTab === 'finale' && (
          <FinaleTab
            gameState={gameState}
            setGameState={setGameState}
          />
        )}

        {activeTab === 'reference' && (
          <ReferenceTab />
        )}
      </main>

      {/* Bottom Mobile Tab Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        gamePhase={gameState.phase}
        roomCount={gameState.roomsHistory.length}
      />

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12131f] border border-rose-900/60 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-base font-serif font-bold text-rose-100">
              Start a New Game?
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              This will clear all current room history, votes, and assignments. Are you sure you want to reset the Storyteller Grimoire?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmReset}
                className="px-4 py-1.5 rounded-xl bg-red-700 hover:bg-red-600 text-white text-xs font-bold shadow-md shadow-red-950"
              >
                Reset & New Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
