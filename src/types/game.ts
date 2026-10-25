export type PlayerColor = {
  id: string;
  name: string;
  hex: string;
  borderHex?: string;
  textColor: string;
};

export type RoleType = 'dracula' | 'bride' | 'hunter' | 'guest';

export type HunterType = 
  | 'van_helsing' 
  | 'mina_harker' 
  | 'dr_john_seward' 
  | 'jonathan_harker' 
  | 'arthur_holmwood' 
  | 'quincey_morris';

export type DarkBlessingId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface DarkBlessing {
  id: DarkBlessingId;
  set: 1 | 2;
  name: string;
  description: string;
  shortEffect: string;
}

export interface HunterInfo {
  id: HunterType;
  number: number;
  name: string;
  initials: string;
  description: string;
  nightInstruction: string;
}

export interface Player {
  id: string;
  seat: number; // 1 to N
  name: string;
  colorId: string;
  role: RoleType;
  hunterType?: HunterType;
  heartsRemaining: number; // starts at 3
  isCorrupted?: boolean; // Blood corruption
  isPuppet?: boolean; // Puppet strings
}

export type RoomHeartCount = 1 | 2 | 3;

export type RoomCardCategory = 'identity' | 'adjacency' | 'history' | 'blessing' | 'counts';

export interface RoomCardDefinition {
  id: string;
  hearts: RoomHeartCount;
  question: string;
  category: RoomCardCategory;
  notes?: string;
  options?: string[]; // predefined answers if any
}

export interface RoomLogEntry {
  id: string;
  roomNumber: number;
  hearts: RoomHeartCount;
  leaderPlayerId: string;
  participantPlayerIds: string[];
  votes: Record<string, 'pass' | 'fail'>; // playerId -> pass/fail
  rawVotes: Record<string, 'pass' | 'fail'>; // before blessing modifications
  outcome: 'pass' | 'fail';
  questionId?: string;
  questionText: string;
  calculatedTrueAnswer?: string;
  suggestedLie?: string;
  answerGiven: string;
  timestamp: number;
  echoingCurseTriggered?: boolean;
  gatheringShadowsTriggered?: boolean;
  sewardPassedTriggered?: boolean;
  morrisPassedTriggered?: boolean;
}

export interface RestlessSpirit {
  betweenSeatA: number; // Seat index A
  betweenSeatB: number; // Seat index B
  alignment: 'good' | 'evil';
}

export interface GameSettings {
  playerCount: number;
  selectedHunters: HunterType[];
  selectedBlessingIds: DarkBlessingId[]; // 5 chosen out of 10
  explorationTimeMinutes: number;
  finaleTimeMinutes: number;
}

export type GamePhase = 'setup' | 'night' | 'exploration' | 'finale' | 'game_over';

export interface GameState {
  phase: GamePhase;
  settings: GameSettings;
  players: Player[];
  chosenBlessingId: DarkBlessingId | null;
  excludedBlessingId: DarkBlessingId | null;
  puppetPlayerId: string | null;
  corruptedPlayerId: string | null;
  restlessSpirits: RestlessSpirit[];
  shadowRoomNumber: number | null;
  sewardRoomNumber: number | null;
  morrisRoomNumber?: number | null;
  echoingCurseActive: boolean; // next room fails if true
  echoingCurseDraculaVotedFail: boolean;
  // Set 2 Blessings State
  twistedPlayerId?: string | null; // Blessing 6: Twisted Whispers
  wingedHunterId?: string | null; // Blessing 7: Winged Spies
  effigyPlayerId?: string | null; // Blessing 8: Blood Effigy
  darkVeilDraculaPlayerId?: string | null; // Blessing 9: Dark Veil fake Dracula
  darkVeilBridePlayerIds?: string[]; // Blessing 9: Dark Veil fake Brides
  soulSwapGoodPlayerId?: string | null; // Blessing 10: Soul Swap Good player
  soulSwapBridePlayerId?: string | null; // Blessing 10: Soul Swap Bride player
  roomsHistory: RoomLogEntry[];
  huntingPartyPlayerIds: string[];
  revealedRoles: Record<string, 'good' | 'evil'>;
  shotPlayerId: string | null;
  draculaGuessedHunterIds: string[];
  winner: 'good' | 'evil' | null;
  winReason?: string;
  narratorAngle?: number; // radians around table, default Math.PI / 2 (6 o'clock)
}
