import React from 'react';
import { Users, Moon, Compass, ScrollText, Crosshair, BookOpen } from 'lucide-react';
import { GamePhase } from '../types/game';

export type ActiveTab = 'setup' | 'night' | 'rooms' | 'history' | 'finale' | 'reference';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  gamePhase: GamePhase;
  roomCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  gamePhase,
  roomCount,
}) => {
  const tabs = [
    {
      id: 'setup' as ActiveTab,
      label: 'Setup',
      icon: Users,
      badge: null,
      highlight: gamePhase === 'setup',
    },
    {
      id: 'night' as ActiveTab,
      label: 'Night',
      icon: Moon,
      badge: null,
      highlight: gamePhase === 'night',
    },
    {
      id: 'rooms' as ActiveTab,
      label: 'Rooms',
      icon: Compass,
      badge: null,
      highlight: gamePhase === 'exploration',
    },
    {
      id: 'history' as ActiveTab,
      label: 'Log',
      icon: ScrollText,
      badge: roomCount > 0 ? roomCount : null,
      highlight: false,
    },
    {
      id: 'finale' as ActiveTab,
      label: 'Finale',
      icon: Crosshair,
      badge: null,
      highlight: gamePhase === 'finale',
    },
    {
      id: 'reference' as ActiveTab,
      label: 'Rules',
      icon: BookOpen,
      badge: null,
      highlight: false,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c0d14]/95 backdrop-blur-lg border-t border-rose-950/40 pb-safe">
      <div className="max-w-2xl mx-auto flex items-center justify-around px-1 py-1 sm:py-1.5">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 flex-1 max-w-[72px] ${
                isActive
                  ? 'text-rose-300 font-semibold scale-105'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {/* Highlight dot if currently in this game phase */}
              {tab.highlight && !isActive && (
                <span className="absolute top-1 right-3 w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
              )}
              {tab.highlight && !isActive && (
                <span className="absolute top-1 right-3 w-1.5 h-1.5 bg-rose-500 rounded-full" />
              )}

              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'stroke-[2.5] text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]' : ''
                  }`}
                />
                {tab.badge !== null && (
                  <span className="absolute -top-1.5 -right-2.5 bg-rose-800 text-rose-100 text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center border border-rose-600">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'text-rose-300 font-bold' : ''}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-1 w-6 h-0.5 bg-rose-500 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
