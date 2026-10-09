import React, { useState } from 'react';
import { GameState, RoomLogEntry } from '../types/game';
import { getPlayerColor } from '../utils/gameLogic';
import { ScrollText, Trash2, Heart, Check, X, Search, ShieldCheck, AlertTriangle } from 'lucide-react';

interface HistoryTabProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ gameState, setGameState }) => {
  const { roomsHistory, players } = gameState;
  const [filter, setFilter] = useState<'all' | 'pass' | 'fail'>('all');
  const [search, setSearch] = useState('');

  // Delete last room and restore hearts
  const handleDeleteLastRoom = () => {
    if (roomsHistory.length === 0) return;
    const lastRoom = roomsHistory[roomsHistory.length - 1];

    if (!window.confirm(`Undo Room #${lastRoom.roomNumber}? This will refund 1 heart token to all participants.`)) {
      return;
    }

    setGameState(prev => ({
      ...prev,
      roomsHistory: prev.roomsHistory.slice(0, -1),
      players: prev.players.map(p => {
        if (lastRoom.participantPlayerIds.includes(p.id)) {
          return {
            ...p,
            heartsRemaining: Math.min(3, p.heartsRemaining + 1),
          };
        }
        return p;
      }),
    }));
  };

  const filtered = roomsHistory.filter(room => {
    if (filter !== 'all' && room.outcome !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const questionMatch = room.questionText.toLowerCase().includes(q);
      const answerMatch = room.answerGiven.toLowerCase().includes(q);
      const participantMatch = room.participantPlayerIds.some(pId => {
        const p = players.find(x => x.id === pId);
        return p?.name.toLowerCase().includes(q);
      });
      return questionMatch || answerMatch || participantMatch;
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-24">
      {/* Header & Controls */}
      <div className="bg-[#10111d] rounded-2xl border border-rose-950/40 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-rose-400" />
            <h2 className="text-sm sm:text-base font-serif font-bold text-rose-100">
              Castle Exploration Chronicle ({roomsHistory.length} Rooms)
            </h2>
          </div>

          {roomsHistory.length > 0 && (
            <button
              onClick={handleDeleteLastRoom}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/80 border border-zinc-800 hover:border-red-800 text-zinc-400 hover:text-red-300 text-xs font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Undo Last Room</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-zinc-900 rounded-xl p-1 border border-zinc-800">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-rose-950 text-rose-200 border border-rose-800'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              All ({roomsHistory.length})
            </button>
            <button
              onClick={() => setFilter('pass')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'pass'
                  ? 'bg-emerald-950 text-emerald-200 border border-emerald-800'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Passed ({roomsHistory.filter(r => r.outcome === 'pass').length})
            </button>
            <button
              onClick={() => setFilter('fail')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'fail'
                  ? 'bg-rose-950 text-rose-200 border border-rose-800'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Failed ({roomsHistory.filter(r => r.outcome === 'fail').length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search rooms..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-48 bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-xl pl-7 pr-2.5 py-1.5 focus:outline-none focus:border-rose-500"
            />
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2 top-2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Rooms Log Cards */}
      {filtered.length === 0 ? (
        <div className="bg-[#10111d] rounded-2xl border border-zinc-900 p-8 text-center text-zinc-500 text-xs">
          No rooms recorded yet. Explore rooms in the "Rooms" tab!
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered
            .slice()
            .reverse()
            .map(room => {
              const leader = players.find(p => p.id === room.leaderPlayerId);
              const leaderColor = leader ? getPlayerColor(leader.colorId) : null;

              return (
                <div
                  key={room.id}
                  className={`bg-[#10111d] rounded-2xl border p-3 sm:p-4 space-y-2.5 transition-all ${
                    room.outcome === 'pass'
                      ? 'border-emerald-950/70 hover:border-emerald-800'
                      : 'border-rose-950/70 hover:border-rose-800'
                  }`}
                >
                  {/* Top Bar: Room #, Hearts, Outcome Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-zinc-200">
                        Room #{room.roomNumber}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: room.hearts }).map((_, i) => (
                          <Heart
                            key={i}
                            className="w-3 h-3 fill-rose-500 text-rose-500"
                          />
                        ))}
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider border flex items-center gap-1 ${
                        room.outcome === 'pass'
                          ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                          : 'bg-rose-950 border-rose-700 text-rose-300'
                      }`}
                    >
                      {room.outcome === 'pass' ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>PASS</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>FAIL</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Leader & Participants with Secret Votes */}
                  <div className="bg-zinc-950/70 rounded-xl p-2.5 border border-zinc-800/80 space-y-1.5">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">
                      Explorers & Secret Votes:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {room.participantPlayerIds.map(pId => {
                        const p = players.find(x => x.id === pId);
                        if (!p) return null;
                        const pColor = getPlayerColor(p.colorId);
                        const isLeader = pId === room.leaderPlayerId;
                        const vote = room.votes[pId] || 'pass';

                        return (
                          <div
                            key={pId}
                            className="flex items-center gap-1.5 bg-zinc-900/90 px-2 py-1 rounded-lg border border-zinc-800 text-xs"
                          >
                            <span
                              style={{ backgroundColor: pColor.hex, color: pColor.textColor }}
                              className="w-4 h-4 rounded font-mono text-[9px] font-bold flex items-center justify-center"
                            >
                              {p.seat}
                            </span>
                            <span className="font-semibold text-zinc-200">
                              {p.name} {isLeader ? '★' : ''}
                            </span>
                            <span
                              className={`px-1 py-0.2 rounded text-[10px] font-mono font-bold flex items-center gap-0.5 ${
                                vote === 'pass'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : 'bg-rose-950 text-rose-400 border border-rose-800'
                              }`}
                            >
                              {vote === 'pass' ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
                              {vote.toUpperCase()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Question & Answer */}
                  <div className="space-y-1 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                        Question Asked:
                      </span>
                      <p className="text-zinc-200 font-medium">
                        {room.questionText}
                      </p>
                    </div>

                    <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-rose-400 block">
                          Answer Given by Renfield:
                        </span>
                        <span className="font-serif font-bold text-zinc-100 text-sm">
                          {room.answerGiven}
                        </span>
                      </div>
                      {room.calculatedTrueAnswer && (
                        <div className="text-right">
                          <span className="text-[9px] uppercase text-zinc-500 block">
                            True Reality:
                          </span>
                          <span className="text-xs text-zinc-400 font-mono">
                            {room.calculatedTrueAnswer}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
