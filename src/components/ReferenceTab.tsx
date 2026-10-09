import React, { useState } from 'react';
import { DARK_BLESSINGS, GUEST_LIST_RULES, HUNTERS, ROOM_CARDS, ROOM_CATEGORIES } from '../data/gameData';
import { BookOpen, Sparkles, Shield, Clock, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export const ReferenceTab: React.FC = () => {
  const [openSection, setOpenSection] = useState<string>('lies');

  const toggle = (section: string) => {
    setOpenSection(openSection === section ? '' : section);
  };

  return (
    <div className="space-y-3 pb-24">
      {/* Title */}
      <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-rose-400" />
          <h2 className="text-sm sm:text-base font-serif font-bold text-rose-100">
            Renfield's Grimoire & Rulebook
          </h2>
        </div>
        <p className="text-xs text-zinc-400">
          Essential guidelines, lie crafting rules, and reference charts for the Storyteller.
        </p>
      </div>

      {/* 1. How to Answer Failed Rooms */}
      <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 overflow-hidden">
        <button
          onClick={() => toggle('lies')}
          className="w-full p-3 sm:p-4 flex items-center justify-between text-left hover:bg-zinc-900/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-rose-400" />
            <span className="text-xs sm:text-sm font-bold text-rose-200">
              How to Answer Failed Room Questions (Plausible Lies)
            </span>
          </div>
          {openSection === 'lies' ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </button>

        {openSection === 'lies' && (
          <div className="p-3 sm:p-4 pt-0 border-t border-zinc-800/80 space-y-2.5 text-xs text-zinc-300">
            <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
              <strong className="text-rose-300 block mb-1">Binary Questions (Yes/No):</strong>
              <p className="text-zinc-400">If there are only 2 possible answers, simply give the false one.</p>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1.5">
              <strong className="text-rose-300 block">Multiple Possible Answers:</strong>
              <p className="text-zinc-400">
                Give a lie that is both <strong className="text-zinc-200">plausible</strong> and <strong className="text-zinc-200">helpful to Evil</strong>.
              </p>
              <div className="space-y-1 text-zinc-400 pl-2 border-l border-rose-900">
                <p>
                  • <strong className="text-zinc-200">Keep it plausible:</strong> Never give an answer that is obviously impossible. Consider what the players receiving the answer know for certain. Don't give someone information they can immediately disprove!
                </p>
                <p>
                  • <strong className="text-zinc-200">Help Evil:</strong> When you have several plausible lies, choose the one that frames Good players or exonerates Evil players. Evil players take a risk when failing a room—reward that risk with the most useful lie you can!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Official Guest List Table */}
      <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 overflow-hidden">
        <button
          onClick={() => toggle('guestlist')}
          className="w-full p-3 sm:p-4 flex items-center justify-between text-left hover:bg-zinc-900/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-xs sm:text-sm font-bold text-blue-200">
              Official Guest List & Role Distribution Table
            </span>
          </div>
          {openSection === 'guestlist' ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </button>

        {openSection === 'guestlist' && (
          <div className="p-3 sm:p-4 pt-0 border-t border-zinc-800/80 overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300 border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] uppercase text-zinc-500 font-mono">
                  <th className="py-2 px-1">Players</th>
                  <th className="py-2 px-1 text-red-400">Dracula</th>
                  <th className="py-2 px-1 text-red-400">Brides</th>
                  <th className="py-2 px-1 text-blue-400">Hunters</th>
                  <th className="py-2 px-1 text-blue-400">Guests</th>
                  <th className="py-2 px-1 text-amber-400">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 font-mono text-[11px]">
                {Object.values(GUEST_LIST_RULES).map(r => (
                  <tr key={r.players} className="hover:bg-zinc-900/40">
                    <td className="py-1.5 px-1 font-bold text-zinc-200">{r.players}</td>
                    <td className="py-1.5 px-1 text-red-300">{r.dracula}</td>
                    <td className="py-1.5 px-1 text-red-300">{r.brides}</td>
                    <td className="py-1.5 px-1 text-blue-300">{r.hunters}</td>
                    <td className="py-1.5 px-1 text-blue-300">{r.guests}</td>
                    <td className="py-1.5 px-1 text-zinc-400">{r.explorationTime}m / {r.finaleTime}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. The 5 Dark Blessings */}
      <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 overflow-hidden">
        <button
          onClick={() => toggle('blessings')}
          className="w-full p-3 sm:p-4 flex items-center justify-between text-left hover:bg-zinc-900/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-xs sm:text-sm font-bold text-purple-200">
              The 5 Dark Blessings
            </span>
          </div>
          {openSection === 'blessings' ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </button>

        {openSection === 'blessings' && (
          <div className="p-3 sm:p-4 pt-0 border-t border-zinc-800/80 space-y-2 text-xs">
            {DARK_BLESSINGS.map(b => (
              <div key={b.id} className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-full bg-purple-900 text-purple-200 font-mono font-bold text-[10px] flex items-center justify-center">
                    {b.id}
                  </span>
                  <span className="font-bold text-purple-200 text-xs">{b.name}</span>
                </div>
                <p className="text-zinc-400 leading-snug">{b.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. The 5 Hunters */}
      <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 overflow-hidden">
        <button
          onClick={() => toggle('hunters')}
          className="w-full p-3 sm:p-4 flex items-center justify-between text-left hover:bg-zinc-900/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-xs sm:text-sm font-bold text-blue-200">
              The 5 Hunters
            </span>
          </div>
          {openSection === 'hunters' ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </button>

        {openSection === 'hunters' && (
          <div className="p-3 sm:p-4 pt-0 border-t border-zinc-800/80 space-y-2 text-xs">
            {HUNTERS.map(h => (
              <div key={h.id} className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-blue-900 text-blue-200 font-mono font-bold text-[10px] flex items-center justify-center">
                      {h.number}
                    </span>
                    <span className="font-bold text-blue-200 text-xs">{h.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">[{h.initials}]</span>
                </div>
                <p className="text-zinc-400 leading-snug">{h.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Complete Room Cards Library */}
      <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 overflow-hidden">
        <button
          onClick={() => toggle('roomdeck')}
          className="w-full p-3 sm:p-4 flex items-center justify-between text-left hover:bg-zinc-900/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-rose-400" />
            <span className="text-xs sm:text-sm font-bold text-rose-200">
              Complete Room Card Library ({ROOM_CARDS.length} Cards)
            </span>
          </div>
          {openSection === 'roomdeck' ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </button>

        {openSection === 'roomdeck' && (
          <div className="p-3 sm:p-4 pt-0 border-t border-zinc-800/80 space-y-3 text-xs">
            {/* Solo Rooms */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-rose-400 uppercase font-mono block">
                ❤️ Solo Rooms (1 Heart — {ROOM_CARDS.filter(c => c.hearts === 1).length} Cards)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {ROOM_CARDS.filter(c => c.hearts === 1).map(c => {
                  const cat = ROOM_CATEGORIES.find(k => k.id === c.category);
                  return (
                    <div key={c.id} className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded border inline-flex items-center gap-1 mb-1 ${cat?.badgeClass || 'text-zinc-500'}`}>
                        {cat?.emoji} {cat?.shortName || c.category}
                      </span>
                      <p className="text-zinc-200 font-medium">{c.question}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2-Player Rooms */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-800/60">
              <span className="text-xs font-bold text-rose-400 uppercase font-mono block">
                ❤️❤️ 2-Player Rooms (2 Hearts — {ROOM_CARDS.filter(c => c.hearts === 2).length} Cards)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {ROOM_CARDS.filter(c => c.hearts === 2).map(c => {
                  const cat = ROOM_CATEGORIES.find(k => k.id === c.category);
                  return (
                    <div key={c.id} className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded border inline-flex items-center gap-1 mb-1 ${cat?.badgeClass || 'text-zinc-500'}`}>
                        {cat?.emoji} {cat?.shortName || c.category}
                      </span>
                      <p className="text-zinc-200 font-medium">{c.question}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3-Player Rooms */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-800/60">
              <span className="text-xs font-bold text-rose-400 uppercase font-mono block">
                ❤️❤️❤️ 3-Player Rooms (3 Hearts — {ROOM_CARDS.filter(c => c.hearts === 3).length} Cards)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {ROOM_CARDS.filter(c => c.hearts === 3).map(c => {
                  const cat = ROOM_CATEGORIES.find(k => k.id === c.category);
                  return (
                    <div key={c.id} className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                      <span className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded border inline-flex items-center gap-1 mb-1 ${cat?.badgeClass || 'text-zinc-500'}`}>
                        {cat?.emoji} {cat?.shortName || c.category}
                      </span>
                      <p className="text-zinc-200 font-medium">{c.question}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. Keeper of the Clock */}
      <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 p-3 sm:p-4 text-xs text-zinc-400 space-y-1.5">
        <div className="flex items-center gap-2 text-zinc-200 font-bold">
          <Clock className="w-4 h-4 text-rose-400" />
          <span>Renfield: Keeper of the Clock</span>
        </div>
        <p>
          "You are the keeper of the clock. The listed game time is just a guideline. If the group needs a few extra minutes to reach a satisfying finale, quietly add them. Players don't need to know—the goal is to maintain the pressure of the clock."
        </p>
      </div>
    </div>
  );
};
