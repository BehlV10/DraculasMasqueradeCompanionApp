import { GameState, Player, RoleType, RoomLogEntry } from '../types/game';
import { OFFICIAL_COLORS } from '../data/gameData';

export function isEvilRole(role: RoleType): boolean {
  return role === 'dracula' || role === 'bride';
}

export function isGoodRole(role: RoleType): boolean {
  return role === 'guest' || role === 'hunter';
}

export function getPlayerRealTeam(player: Player): 'good' | 'evil' {
  return isEvilRole(player.role) ? 'evil' : 'good';
}

/**
 * Returns player's team for room question purposes, taking into account Blood Corruption.
 * Note: Blood Corruption makes a Good player register as Evil.
 */
export function getPlayerRegisteredTeam(player: Player): 'good' | 'evil' {
  if (player.isCorrupted) return 'evil';
  return getPlayerRealTeam(player);
}

export function getPlayerColor(colorId: string) {
  return OFFICIAL_COLORS.find(c => c.id === colorId) || OFFICIAL_COLORS[0];
}

// Seat utilities (0-indexed seats)
export function getClockwiseDistance(seatA: number, seatB: number, totalPlayers: number): number {
  return (seatB - seatA + totalPlayers) % totalPlayers;
}

export function getCounterClockwiseDistance(seatA: number, seatB: number, totalPlayers: number): number {
  return (seatA - seatB + totalPlayers) % totalPlayers;
}

export function getShortestDistance(seatA: number, seatB: number, totalPlayers: number): number {
  const cw = getClockwiseDistance(seatA, seatB, totalPlayers);
  const ccw = getCounterClockwiseDistance(seatA, seatB, totalPlayers);
  return Math.min(cw, ccw);
}

export interface SeatedEntity {
  type: 'player' | 'spirit';
  seatNumber?: number;
  playerId?: string;
  isDracula?: boolean;
  alignment: 'good' | 'evil';
  player?: Player;
}

/**
 * Builds the circular table of entities (players + any Restless Spirits placed between them).
 */
export function getSeatedEntities(gameStateOrPlayers: GameState | Player[]): SeatedEntity[] {
  const isGameState = !Array.isArray(gameStateOrPlayers);
  const rawPlayers = isGameState ? gameStateOrPlayers.players : gameStateOrPlayers;
  const players = [...rawPlayers].sort((a, b) => a.seat - b.seat);
  const n = players.length;
  const entities: SeatedEntity[] = [];

  const restlessSpirits = isGameState ? gameStateOrPlayers.restlessSpirits : [];
  const blessingInPlay = isGameState ? gameStateOrPlayers.chosenBlessingId === 3 : false;

  for (let i = 0; i < n; i++) {
    const p = players[i];
    entities.push({
      type: 'player',
      seatNumber: p.seat,
      playerId: p.id,
      isDracula: p.role === 'dracula',
      alignment: getPlayerRegisteredTeam(p),
      player: p,
    });

    // If Restless Spirits (Dark Blessing #3) is active, insert any spirit placed after this seat
    if (blessingInPlay && restlessSpirits && restlessSpirits.length > 0) {
      const nextSeat = (p.seat % n) + 1;
      const spiritsBetween = restlessSpirits.filter(
        s => (s.betweenSeatA === p.seat && s.betweenSeatB === nextSeat) ||
             (s.betweenSeatB === p.seat && s.betweenSeatA === nextSeat)
      );
      spiritsBetween.forEach(spirit => {
        entities.push({
          type: 'spirit',
          alignment: spirit.alignment,
        });
      });
    }
  }

  return entities;
}

/**
 * Calculates adjacent groups of Good entities in circular seating (taking Restless Spirits into account).
 */
export function getGoodGroups(gameStateOrPlayers: GameState | Player[]): number[] {
  const entities = getSeatedEntities(gameStateOrPlayers);
  const m = entities.length;
  if (m === 0) return [0, 0];

  const isGood = entities.map(e => e.alignment === 'good');
  if (isGood.every(g => g)) return [m, 0];
  if (isGood.every(g => !g)) return [0, 0];

  let firstEvilIdx = isGood.findIndex(g => !g);
  if (firstEvilIdx === -1) firstEvilIdx = 0;

  const groups: number[] = [];
  let currentGroup = 0;

  for (let i = 0; i < m; i++) {
    const idx = (firstEvilIdx + 1 + i) % m;
    if (isGood[idx]) {
      currentGroup++;
    } else {
      if (currentGroup > 0) {
        groups.push(currentGroup);
        currentGroup = 0;
      }
    }
  }
  if (currentGroup > 0) {
    groups.push(currentGroup);
  }

  groups.sort((a, b) => b - a);
  return groups;
}

/**
 * Counts pairs of adjacent Evil entities around the circle (taking Restless Spirits into account).
 */
export function countEvilPairs(gameStateOrPlayers: GameState | Player[]): number {
  const entities = getSeatedEntities(gameStateOrPlayers);
  const m = entities.length;
  if (m < 2) return 0;
  let count = 0;
  for (let i = 0; i < m; i++) {
    const nextIdx = (i + 1) % m;
    if (entities[i].alignment === 'evil' && entities[nextIdx].alignment === 'evil') {
      count++;
    }
  }
  return count;
}

/**
 * Finds Dracula player
 */
export function getDracula(players: Player[]): Player | undefined {
  return players.find(p => p.role === 'dracula');
}

/**
 * Compute true answer and recommended lie for room questions.
 */
export interface RoomAnswerResult {
  trueAnswer: string;
  recommendedLie: string;
  lieReasoning: string;
}

export function computeRoomAnswer(
  questionId: string,
  gameState: GameState,
  leader: Player,
  participants: Player[],
  targetPlayerA?: Player,
  targetPlayerB?: Player,
  numericParam?: number
): RoomAnswerResult {
  const { players, roomsHistory, chosenBlessingId, selectedHunters } = {
    players: gameState.players,
    roomsHistory: gameState.roomsHistory,
    chosenBlessingId: gameState.chosenBlessingId,
    selectedHunters: gameState.settings.selectedHunters,
  };

  const dracula = getDracula(players);
  const n = players.length;
  const leaderSeat = leader.seat - 1;

  switch (questionId) {
    // --- 1 Heart (Solo) ---
    case 'solo_is_dracula': {
      const target = targetPlayerA || leader;
      const isDrac = target.role === 'dracula';
      return {
        trueAnswer: isDrac ? 'Yes' : 'No',
        recommendedLie: isDrac ? 'No (Protects Dracula!)' : 'Yes (Frames this Good/Bride player as Dracula!)',
        lieReasoning: isDrac
          ? 'Telling No hides Dracula from the hunters.'
          : 'Telling Yes frames a player and wastes the Hunting Party shot.',
      };
    }

    case 'solo_is_bride': {
      const target = targetPlayerA || leader;
      const isBride = target.role === 'bride';
      return {
        trueAnswer: isBride ? 'Yes' : 'No',
        recommendedLie: isBride ? 'No' : 'Yes',
        lieReasoning: isBride
          ? 'Protects the Bride from Quincey Morris and suspicion.'
          : 'Frames a Good player as a Bride.',
      };
    }

    case 'solo_is_good': {
      const target = targetPlayerA || leader;
      const isGood = getPlayerRegisteredTeam(target) === 'good';
      return {
        trueAnswer: isGood ? 'Yes' : 'No',
        recommendedLie: isGood ? 'No' : 'Yes',
        lieReasoning: isGood
          ? 'Frames a Good player as Evil.'
          : 'Exonerates an Evil player as Good.',
      };
    }

    case 'solo_is_evil': {
      const target = targetPlayerA || leader;
      const isEvil = getPlayerRegisteredTeam(target) === 'evil';
      return {
        trueAnswer: isEvil ? 'Yes' : 'No',
        recommendedLie: isEvil ? 'No' : 'Yes',
        lieReasoning: isEvil ? 'Clears an Evil player.' : 'Frames a Good player.',
      };
    }

    case 'solo_different_teams': {
      const pA = targetPlayerA || leader;
      const pB = targetPlayerB || (players.find(p => p.id !== pA.id) || leader);
      const diff = getPlayerRegisteredTeam(pA) !== getPlayerRegisteredTeam(pB);
      return {
        trueAnswer: diff ? 'Yes' : 'No',
        recommendedLie: diff ? 'No' : 'Yes',
        lieReasoning: diff
          ? 'Makes them look like they are allies on the same team.'
          : 'Creates suspicion between two allies.',
      };
    }

    case 'solo_both_evil': {
      const pA = targetPlayerA || leader;
      const pB = targetPlayerB || leader;
      const bothEvil = getPlayerRegisteredTeam(pA) === 'evil' && getPlayerRegisteredTeam(pB) === 'evil';
      return {
        trueAnswer: bothEvil ? 'Yes' : 'No',
        recommendedLie: bothEvil ? 'No' : 'Yes',
        lieReasoning: bothEvil ? 'Protects both Evil players.' : 'Frames both as Evil conspirators.',
      };
    }

    case 'solo_both_good': {
      const pA = targetPlayerA || leader;
      const pB = targetPlayerB || leader;
      const bothGood = getPlayerRegisteredTeam(pA) === 'good' && getPlayerRegisteredTeam(pB) === 'good';
      return {
        trueAnswer: bothGood ? 'Yes' : 'No',
        recommendedLie: bothGood ? 'No' : 'Yes',
        lieReasoning: bothGood ? 'Casts doubt on Good players.' : 'Helps Evil blend in with a Good player.',
      };
    }

    case 'solo_prior_room_fail': {
      const lastRoom = roomsHistory[roomsHistory.length - 1];
      const failed = lastRoom ? lastRoom.outcome === 'fail' : false;
      return {
        trueAnswer: failed ? 'Yes' : 'No',
        recommendedLie: failed ? 'No' : 'Yes',
        lieReasoning: failed
          ? 'Hides the fact that the prior room was sabotaged.'
          : 'Falsely claims the prior room failed to make players doubt prior clues.',
      };
    }

    case 'solo_two_rooms_fail': {
      const r1 = roomsHistory[roomsHistory.length - 1];
      const r2 = roomsHistory[roomsHistory.length - 2];
      const bothFail = Boolean(r1 && r2 && r1.outcome === 'fail' && r2.outcome === 'fail');
      return {
        trueAnswer: bothFail ? 'Yes' : 'No',
        recommendedLie: bothFail ? 'No' : 'Yes',
        lieReasoning: bothFail ? 'Hides serial sabotage.' : 'Discredits past 2 room findings.',
      };
    }

    case 'solo_two_rooms_pass': {
      const r1 = roomsHistory[roomsHistory.length - 1];
      const r2 = roomsHistory[roomsHistory.length - 2];
      const bothPass = Boolean(r1 && r2 && r1.outcome === 'pass' && r2.outcome === 'pass');
      return {
        trueAnswer: bothPass ? 'Yes' : 'No',
        recommendedLie: bothPass ? 'No' : 'Yes',
        lieReasoning: bothPass ? 'Spreads paranoia about recent clues.' : 'Validates compromised clues.',
      };
    }

    case 'solo_two_rooms_diff': {
      const r1 = roomsHistory[roomsHistory.length - 1];
      const r2 = roomsHistory[roomsHistory.length - 2];
      const diff = Boolean(r1 && r2 && r1.outcome !== r2.outcome);
      return {
        trueAnswer: diff ? 'Yes' : 'No',
        recommendedLie: diff ? 'No' : 'Yes',
        lieReasoning: 'Inverts history knowledge to mislead deductions.',
      };
    }

    case 'solo_player_failed_prior': {
      const target = targetPlayerA || leader;
      const lastRoom = roomsHistory[roomsHistory.length - 1];
      const didFail = Boolean(lastRoom && lastRoom.votes[target.id] === 'fail');
      return {
        trueAnswer: didFail ? 'Yes' : 'No',
        recommendedLie: didFail ? 'No' : 'Yes',
        lieReasoning: didFail ? 'Protects the saboteur.' : 'Frames an innocent player for failing.',
      };
    }

    case 'solo_evil_in_room_before': {
      const lastRoom = roomsHistory[roomsHistory.length - 1];
      const hasEvil = lastRoom
        ? lastRoom.participantPlayerIds.some(id => {
            const p = players.find(x => x.id === id);
            return p && getPlayerRegisteredTeam(p) === 'evil';
          })
        : false;
      return {
        trueAnswer: hasEvil ? 'Yes' : 'No',
        recommendedLie: hasEvil ? 'No' : 'Yes',
        lieReasoning: hasEvil ? 'Hides Evil involvement.' : 'Points false fingers at Good players.',
      };
    }

    case 'solo_blessing_in_play': {
      const bNum = numericParam || 1;
      const inPlay = chosenBlessingId === bNum;
      return {
        trueAnswer: inPlay ? 'Yes' : 'No',
        recommendedLie: inPlay ? 'No' : 'Yes',
        lieReasoning: inPlay ? 'Conceals Dracula’s Dark Blessing.' : 'Bluffs an unused blessing.',
      };
    }

    case 'solo_is_hunter': {
      const target = targetPlayerA || leader;
      const isHunter = target.role === 'hunter';
      // If Evil player used room, rule note: Evil players using this room always learn "No"
      const isEvilExplorer = participants.some(p => isEvilRole(p.role));
      const trueAns = isEvilExplorer ? 'No' : isHunter ? 'Yes' : 'No';
      return {
        trueAnswer: trueAns,
        recommendedLie: isHunter ? 'No' : 'Yes',
        lieReasoning: isHunter ? 'Hides hunter identity.' : 'Bait Dracula into shooting a non-hunter.',
      };
    }

    case 'solo_next_to_evil': {
      const entities = getSeatedEntities(gameState);
      const m = entities.length;
      const leaderIdx = entities.findIndex(e => e.type === 'player' && e.player?.id === leader.id);
      let nextToEvil = false;
      if (leaderIdx !== -1) {
        const left = entities[(leaderIdx - 1 + m) % m];
        const right = entities[(leaderIdx + 1) % m];
        nextToEvil = left.alignment === 'evil' || right.alignment === 'evil';
      }
      return {
        trueAnswer: nextToEvil ? 'Yes' : 'No',
        recommendedLie: nextToEvil ? 'No' : 'Yes',
        lieReasoning: nextToEvil
          ? 'Calms suspicions on their evil neighbor/spirit.'
          : 'Creates false paranoia against their good neighbors.',
      };
    }

    case 'solo_next_to_good': {
      const entities = getSeatedEntities(gameState);
      const m = entities.length;
      const leaderIdx = entities.findIndex(e => e.type === 'player' && e.player?.id === leader.id);
      let nextToGood = false;
      if (leaderIdx !== -1) {
        const left = entities[(leaderIdx - 1 + m) % m];
        const right = entities[(leaderIdx + 1) % m];
        nextToGood = left.alignment === 'good' || right.alignment === 'good';
      }
      return {
        trueAnswer: nextToGood ? 'Yes' : 'No',
        recommendedLie: nextToGood ? 'No' : 'Yes',
        lieReasoning: 'Misleads neighbor team deduction.',
      };
    }

    case 'solo_evil_in_room_after': {
      return {
        trueAnswer: 'No',
        recommendedLie: 'Yes',
        lieReasoning: 'Subsequent room has not occurred yet.',
      };
    }

    case 'solo_room_after_fail': {
      return {
        trueAnswer: 'No',
        recommendedLie: 'Yes',
        lieReasoning: 'Subsequent room has not occurred yet.',
      };
    }

    case 'solo_hunter_in_play': {
      const hNum = numericParam || 1;
      const hunterMap = ['van_helsing', 'jonathan_harker', 'mina_harker', 'quincey_morris', 'dr_john_seward'] as const;
      const targetHunter = hunterMap[hNum - 1];
      const inPlay = selectedHunters.includes(targetHunter);
      return {
        trueAnswer: inPlay ? 'Yes' : 'No',
        recommendedLie: inPlay ? 'No' : 'Yes',
        lieReasoning: inPlay ? 'Hides hunter roster.' : 'Misleads on hunter roles.',
      };
    }

    // --- 2 Hearts ---
    case 'multi2_evil_pairs': {
      const pairs = countEvilPairs(gameState);
      const trueAns = pairs >= 6 ? '6+' : String(pairs);
      const lie = pairs === 0 ? '1' : String(Math.max(0, pairs - 1));
      return {
        trueAnswer: trueAns,
        recommendedLie: lie,
        lieReasoning: chosenBlessingId === 3
          ? `True is ${trueAns} (Blessing #3 Restless Spirits factored into evil pairs). Giving ${lie} misleads hunters.`
          : `True is ${trueAns}. Giving ${lie} shifts how many evil players seem grouped.`,
      };
    }

    case 'multi2_distance_closest_evil': {
      if (!dracula) return { trueAnswer: '1', recommendedLie: '2', lieReasoning: '' };
      const dracSeat = dracula.seat - 1;
      let minDistance = 999;
      players.forEach((p, idx) => {
        if (p.id !== dracula.id && getPlayerRegisteredTeam(p) === 'evil') {
          const dist = getShortestDistance(dracSeat, idx, n);
          if (dist < minDistance) minDistance = dist;
        }
      });
      const trueAns = minDistance >= 9 ? '9+' : String(minDistance);
      const lie = minDistance === 1 ? '2' : '1';
      return {
        trueAnswer: trueAns,
        recommendedLie: lie,
        lieReasoning: `True distance is ${trueAns}. Lie ${lie} throws off table geometry.`,
      };
    }

    case 'multi2_evil_between_cw': {
      const p1 = participants[0] || leader;
      const p2 = participants[1] || p1;
      const entities = getSeatedEntities(gameState);
      const m = entities.length;
      const idx1 = entities.findIndex(e => e.type === 'player' && e.player?.id === p1.id);
      const idx2 = entities.findIndex(e => e.type === 'player' && e.player?.id === p2.id);
      let foundEvil = false;
      if (idx1 !== -1 && idx2 !== -1) {
        let curr = (idx1 + 1) % m;
        while (curr !== idx2) {
          if (entities[curr].alignment === 'evil') {
            foundEvil = true;
            break;
          }
          curr = (curr + 1) % m;
        }
      }
      return {
        trueAnswer: foundEvil ? 'Yes' : 'No',
        recommendedLie: foundEvil ? 'No' : 'Yes',
        lieReasoning: foundEvil
          ? 'Hides Evil in the gap (players or evil spirits).'
          : 'Frames good players between them.',
      };
    }

    case 'multi2_evil_between_ccw': {
      const p1 = participants[0] || leader;
      const p2 = participants[1] || p1;
      const entities = getSeatedEntities(gameState);
      const m = entities.length;
      const idx1 = entities.findIndex(e => e.type === 'player' && e.player?.id === p1.id);
      const idx2 = entities.findIndex(e => e.type === 'player' && e.player?.id === p2.id);
      let foundEvil = false;
      if (idx1 !== -1 && idx2 !== -1) {
        let curr = (idx1 - 1 + m) % m;
        while (curr !== idx2) {
          if (entities[curr].alignment === 'evil') {
            foundEvil = true;
            break;
          }
          curr = (curr - 1 + m) % m;
        }
      }
      return {
        trueAnswer: foundEvil ? 'Yes' : 'No',
        recommendedLie: foundEvil ? 'No' : 'Yes',
        lieReasoning: foundEvil
          ? 'Hides Evil in the gap (players or evil spirits).'
          : 'Frames good players between them.',
      };
    }

    case 'multi2_first_evil_cw': {
      if (!dracula) return { trueAnswer: '1', recommendedLie: '2', lieReasoning: '' };
      const dracSeat = dracula.seat - 1;
      let firstDist = 1;
      for (let step = 1; step < n; step++) {
        const checkSeat = (dracSeat + step) % n;
        if (getPlayerRegisteredTeam(players[checkSeat]) === 'evil') {
          firstDist = step;
          break;
        }
      }
      const trueAns = firstDist >= 9 ? '9+' : String(firstDist);
      const lie = firstDist === 1 ? '2' : '1';
      return {
        trueAnswer: trueAns,
        recommendedLie: lie,
        lieReasoning: `True is ${trueAns}. Shift by 1 to misdirect clockwise search for Brides.`,
      };
    }

    case 'multi2_prior_room_failed': {
      const anyFailed = roomsHistory.some(r => r.outcome === 'fail');
      return {
        trueAnswer: anyFailed ? 'Yes' : 'No',
        recommendedLie: anyFailed ? 'No' : 'Yes',
        lieReasoning: anyFailed ? 'Lulls group into trusting clues.' : 'Creates blanket distrust.',
      };
    }

    case 'multi2_evil_closer_cw_ccw': {
      const mySeat = leaderSeat;
      let closestCW = 999;
      let closestCCW = 999;
      players.forEach((p, idx) => {
        if (idx !== mySeat && getPlayerRegisteredTeam(p) === 'evil') {
          const cw = getClockwiseDistance(mySeat, idx, n);
          const ccw = getCounterClockwiseDistance(mySeat, idx, n);
          if (cw < closestCW) closestCW = cw;
          if (ccw < closestCCW) closestCCW = ccw;
        }
      });
      const trueAns = closestCW <= closestCCW ? 'Clockwise' : 'Counter Clockwise';
      const lie = trueAns === 'Clockwise' ? 'Counter Clockwise' : 'Clockwise';
      return {
        trueAnswer: trueAns,
        recommendedLie: lie,
        lieReasoning: `Points investigation in opposite direction!`,
      };
    }

    case 'multi2_dracula_evil_neighbors': {
      if (!dracula) return { trueAnswer: '0', recommendedLie: '1', lieReasoning: '' };
      const dracSeat = dracula.seat - 1;
      const left = (dracSeat - 1 + n) % n;
      const right = (dracSeat + 1) % n;
      let count = 0;
      if (getPlayerRegisteredTeam(players[left]) === 'evil') count++;
      if (getPlayerRegisteredTeam(players[right]) === 'evil') count++;
      const trueAns = String(count);
      const lie = count === 0 ? '1' : '0';
      return {
        trueAnswer: trueAns,
        recommendedLie: lie,
        lieReasoning: `True count is ${trueAns}. Lie helps disguise Dracula’s surroundings.`,
      };
    }

    case 'multi2_sitting_next_to_dracula': {
      if (!dracula) return { trueAnswer: 'No', recommendedLie: 'Yes', lieReasoning: '' };
      const dracSeat = dracula.seat - 1;
      const nextTo = participants.some(p => {
        const s = p.seat - 1;
        return getShortestDistance(s, dracSeat, n) === 1;
      });
      return {
        trueAnswer: nextTo ? 'Yes' : 'No',
        recommendedLie: nextTo ? 'No' : 'Yes',
        lieReasoning: nextTo ? 'Distances participants from Dracula.' : 'Frames an innocent as next to Dracula.',
      };
    }

    case 'multi2_first_evil_ccw': {
      if (!dracula) return { trueAnswer: '1', recommendedLie: '2', lieReasoning: '' };
      const dracSeat = dracula.seat - 1;
      let firstDist = 1;
      for (let step = 1; step < n; step++) {
        const checkSeat = (dracSeat - step + n) % n;
        if (getPlayerRegisteredTeam(players[checkSeat]) === 'evil') {
          firstDist = step;
          break;
        }
      }
      const trueAns = firstDist >= 9 ? '9+' : String(firstDist);
      const lie = firstDist === 1 ? '2' : '1';
      return {
        trueAnswer: trueAns,
        recommendedLie: lie,
        lieReasoning: `True is ${trueAns}. Shifting distorts counter-clockwise deduction.`,
      };
    }

    case 'multi2_my_evil_neighbors': {
      const left = (leaderSeat - 1 + n) % n;
      const right = (leaderSeat + 1) % n;
      let count = 0;
      if (getPlayerRegisteredTeam(players[left]) === 'evil') count++;
      if (getPlayerRegisteredTeam(players[right]) === 'evil') count++;
      const trueAns = String(count);
      const lie = count === 0 ? '1' : '0';
      return {
        trueAnswer: trueAns,
        recommendedLie: lie,
        lieReasoning: `Leader has ${count} evil neighbor(s). Lie shifts scrutiny.`,
      };
    }

    case 'multi2_two_left_evil': {
      const l1 = (leaderSeat - 1 + n) % n;
      const l2 = (leaderSeat - 2 + n) % n;
      let count = 0;
      if (getPlayerRegisteredTeam(players[l1]) === 'evil') count++;
      if (getPlayerRegisteredTeam(players[l2]) === 'evil') count++;
      const trueAns = String(count);
      const lie = count === 0 ? '1' : '0';
      return {
        trueAnswer: trueAns,
        recommendedLie: lie,
        lieReasoning: `True is ${trueAns}. Frame or clear the two players on the left.`,
      };
    }

    case 'multi2_two_right_evil': {
      const r1 = (leaderSeat + 1) % n;
      const r2 = (leaderSeat + 2) % n;
      let count = 0;
      if (getPlayerRegisteredTeam(players[r1]) === 'evil') count++;
      if (getPlayerRegisteredTeam(players[r2]) === 'evil') count++;
      const trueAns = String(count);
      const lie = count === 0 ? '1' : '0';
      return {
        trueAnswer: trueAns,
        recommendedLie: lie,
        lieReasoning: `True is ${trueAns}. Frame or clear the two players on the right.`,
      };
    }

    case 'multi2_distance_farthest_evil': {
      if (!dracula) return { trueAnswer: '2', recommendedLie: '3', lieReasoning: '' };
      const dracSeat = dracula.seat - 1;
      let maxDist = 0;
      players.forEach((p, idx) => {
        if (p.id !== dracula.id && getPlayerRegisteredTeam(p) === 'evil') {
          const dist = getShortestDistance(dracSeat, idx, n);
          if (dist > maxDist) maxDist = dist;
        }
      });
      const trueAns = maxDist >= 9 ? '9+' : String(maxDist);
      const lie = String(Math.max(1, maxDist - 1));
      return {
        trueAnswer: trueAns,
        recommendedLie: lie,
        lieReasoning: `True max distance is ${trueAns}.`,
      };
    }

    case 'multi2_dracula_hearts_used': {
      if (!dracula) return { trueAnswer: '0', recommendedLie: '1', lieReasoning: '' };
      const used = 3 - dracula.heartsRemaining;
      const trueAns = String(used);
      const lie = used === 0 ? '1' : '0';
      return {
        trueAnswer: trueAns,
        recommendedLie: lie,
        lieReasoning: `Dracula used ${used} heart(s). Lie obscures Dracula activity.`,
      };
    }

    // --- 3 Hearts ---
    case 'multi3_largest_good_group': {
      const groups = getGoodGroups(gameState);
      const largest = groups[0] || 0;
      const trueAns = largest >= 9 ? '9+' : String(largest);
      const lie = String(Math.max(1, largest - 1));
      return {
        trueAnswer: trueAns,
        recommendedLie: lie,
        lieReasoning: chosenBlessingId === 3
          ? `True largest good group is ${largest} (Blessing #3 Restless Spirits factored into good groups).`
          : `True largest good group is ${largest}. Lie suggests Evil players are more split up.`,
      };
    }

    case 'multi3_second_largest_good': {
      const groups = getGoodGroups(gameState);
      const second = groups[1] || 0;
      const trueAns = second >= 8 ? '8+' : String(second);
      const lie = second === 0 ? '1' : String(Math.max(0, second - 1));
      return {
        trueAnswer: trueAns,
        recommendedLie: lie,
        lieReasoning: chosenBlessingId === 3
          ? `True 2nd largest group is ${second} (Blessing #3 Restless Spirits factored in).`
          : `True 2nd largest group is ${second}.`,
      };
    }

    case 'multi3_dracula_closer_cw_ccw': {
      if (!dracula) return { trueAnswer: 'Clockwise', recommendedLie: 'Counter Clockwise', lieReasoning: '' };
      const dracSeat = dracula.seat - 1;
      const cw = getClockwiseDistance(leaderSeat, dracSeat, n);
      const ccw = getCounterClockwiseDistance(leaderSeat, dracSeat, n);
      const trueAns = cw <= ccw ? 'Clockwise' : 'Counter Clockwise';
      const lie = trueAns === 'Clockwise' ? 'Counter Clockwise' : 'Clockwise';
      return {
        trueAnswer: trueAns,
        recommendedLie: lie,
        lieReasoning: 'Send hunters in the exact wrong direction around the circle!',
      };
    }

    case 'multi3_who_failed_last':
    case 'multi3_prior_room_fail_who': {
      const lastRoom = roomsHistory[roomsHistory.length - 1];
      if (!lastRoom || lastRoom.outcome === 'pass') {
        return {
          trueAnswer: 'No One',
          recommendedLie: 'Name a Good player',
          lieReasoning: 'Falsely accuse a trusted Good player of failing!',
        };
      }
      const failerId = Object.entries(lastRoom.votes).find(([, v]) => v === 'fail')?.[0];
      const failer = failerId ? players.find(p => p.id === failerId) : null;
      const trueAns = failer ? `${failer.name} (${getPlayerColor(failer.colorId).name})` : 'Unknown';
      return {
        trueAnswer: trueAns,
        recommendedLie: 'No One (or name an innocent Good player)',
        lieReasoning: 'Shield the actual saboteur from being singled out.',
      };
    }

    case 'multi3_how_far_back_failed': {
      let stepsBack = 0;
      let found = false;
      for (let i = roomsHistory.length - 1; i >= 0; i--) {
        stepsBack++;
        if (roomsHistory[i].outcome === 'fail') {
          found = true;
          break;
        }
      }
      const trueAns = !found ? 'None' : stepsBack >= 9 ? '9+' : String(stepsBack);
      const lie = !found ? '1' : 'None';
      return {
        trueAnswer: trueAns,
        recommendedLie: lie,
        lieReasoning: `True is ${trueAns}. Conceals how recently rooms were disrupted.`,
      };
    }

    case 'multi3_total_rooms_failed': {
      const failedCount = roomsHistory.filter(r => r.outcome === 'fail').length;
      const trueAns = failedCount >= 8 ? '8+' : String(failedCount);
      const lie = failedCount === 0 ? '1' : String(Math.max(0, failedCount - 1));
      return {
        trueAnswer: trueAns,
        recommendedLie: lie,
        lieReasoning: `Total failed rooms: ${failedCount}. Minimize or exaggerate fail count.`,
      };
    }

    case 'multi3_evil_leaders_count': {
      const evilLeaders = new Set<string>();
      roomsHistory.forEach(r => {
        const lead = players.find(p => p.id === r.leaderPlayerId);
        if (lead && getPlayerRegisteredTeam(lead) === 'evil') {
          evilLeaders.add(lead.id);
        }
      });
      const count = evilLeaders.size;
      const trueAns = String(count);
      const lie = count === 0 ? '1' : String(Math.max(0, count - 1));
      return {
        trueAnswer: trueAns,
        recommendedLie: lie,
        lieReasoning: `True count of evil leaders is ${count}. Lie hides or frames evil leadership.`,
      };
    }

    case 'multi3_evil_hearts_count': {
      const evilExplorers = new Set<string>();
      roomsHistory.forEach(r => {
        r.participantPlayerIds.forEach(id => {
          const p = players.find(x => x.id === id);
          if (p && getPlayerRegisteredTeam(p) === 'evil') {
            evilExplorers.add(p.id);
          }
        });
      });
      const count = evilExplorers.size;
      const trueAns = String(count);
      const lie = count === 0 ? '1' : String(Math.max(0, count - 1));
      return {
        trueAnswer: trueAns,
        recommendedLie: lie,
        lieReasoning: `True count of evil players who played hearts: ${count}.`,
      };
    }

    case 'multi3_rooms_only_good': {
      let goodRooms = 0;
      roomsHistory.forEach(r => {
        const allGood = r.participantPlayerIds.every(id => {
          const p = players.find(x => x.id === id);
          return p && getPlayerRegisteredTeam(p) === 'good';
        });
        if (allGood) goodRooms++;
      });
      const trueAns = goodRooms >= 8 ? '8+' : String(goodRooms);
      const lie = goodRooms === 0 ? '1' : String(Math.max(0, goodRooms - 1));
      return {
        trueAnswer: trueAns,
        recommendedLie: lie,
        lieReasoning: `True rooms with only Good players: ${goodRooms}.`,
      };
    }

    case 'multi3_am_i_next_to_dracula': {
      if (!dracula) return { trueAnswer: 'No', recommendedLie: 'Yes', lieReasoning: '' };
      const dracSeat = dracula.seat - 1;
      const dist = getShortestDistance(leaderSeat, dracSeat, n);
      const nextTo = dist === 1;
      return {
        trueAnswer: nextTo ? 'Yes' : 'No',
        recommendedLie: nextTo ? 'No' : 'Yes',
        lieReasoning: nextTo ? 'Relieves suspicion from leader/neighbors.' : 'Falsely flags Dracula adjacent.',
      };
    }

    case 'multi3_dracula_within_x': {
      if (!dracula) return { trueAnswer: 'No', recommendedLie: 'Yes', lieReasoning: '' };
      const dracSeat = dracula.seat - 1;
      const dist = getShortestDistance(leaderSeat, dracSeat, n);
      const limit = numericParam !== undefined ? numericParam : 1;
      const within = dist <= limit;
      return {
        trueAnswer: within ? 'Yes' : 'No',
        recommendedLie: within ? 'No' : 'Yes',
        lieReasoning: `Dracula is ${dist} seats away. Distance checked: ${limit}.`,
      };
    }

    case 'multi3_is_leader_good_special': {
      const isLeaderGood = getPlayerRegisteredTeam(leader) === 'good';
      return {
        trueAnswer: isLeaderGood ? 'They are good' : 'No Answer',
        recommendedLie: isLeaderGood ? 'No Answer' : 'They are good',
        lieReasoning: isLeaderGood
          ? 'Giving "No Answer" falsely casts the good leader as evil or sabotaged!'
          : 'Giving "They are good" falsely exonerates an evil leader!',
      };
    }

    case 'multi3_are_these_all_good': {
      const targets = [targetPlayerA, targetPlayerB].filter(Boolean) as Player[];
      const checkList = targets.length > 0 ? targets : participants;
      const allGood = checkList.every(p => getPlayerRegisteredTeam(p) === 'good');
      return {
        trueAnswer: allGood ? 'Yes' : 'No',
        recommendedLie: allGood ? 'No' : 'Yes',
        lieReasoning: allGood ? 'Cast doubt on the investigated players.' : 'Shield evil players in the group.',
      };
    }

    case 'multi3_are_these_all_evil': {
      const targets = [targetPlayerA, targetPlayerB].filter(Boolean) as Player[];
      const checkList = targets.length > 0 ? targets : participants;
      const allEvil = checkList.every(p => getPlayerRegisteredTeam(p) === 'evil');
      return {
        trueAnswer: allEvil ? 'Yes' : 'No',
        recommendedLie: allEvil ? 'No' : 'Yes',
        lieReasoning: allEvil ? 'Protect evil players.' : 'Falsely frame innocent players.',
      };
    }

    case 'multi2_blessing_affected_gameplay': {
      let affected = false;
      let reason = 'No dark blessing has altered game state yet.';
      if (chosenBlessingId === 3) {
        affected = true;
        reason = 'Restless Spirits has altered table geometry since the night phase.';
      } else if (chosenBlessingId === 1 && roomsHistory.length > 0) {
        affected = true;
        reason = 'Blood Corruption has influenced room question results.';
      } else if (chosenBlessingId === 2 && roomsHistory.some(r => r.participantPlayerIds.includes(gameState.puppetPlayerId || ''))) {
        affected = true;
        reason = 'Puppet Strings victim has participated in a room.';
      } else if (chosenBlessingId === 4 && (gameState.echoingCurseActive || roomsHistory.some(r => r.echoingCurseTriggered))) {
        affected = true;
        reason = 'Echoing Curse has been triggered.';
      } else if (chosenBlessingId === 5 && roomsHistory.some(r => r.gatheringShadowsTriggered)) {
        affected = true;
        reason = 'Gathering Shadows caused a room to fail.';
      }
      return {
        trueAnswer: affected ? 'Yes' : 'No',
        recommendedLie: affected ? 'No' : 'Yes',
        lieReasoning: reason,
      };
    }

    case 'multi2_blessing_x_or_y': {
      const inPlay = chosenBlessingId === numericParam;
      return {
        trueAnswer: inPlay ? 'Yes' : 'No',
        recommendedLie: inPlay ? 'No' : 'Yes',
        lieReasoning: inPlay
          ? `Dark Blessing #${numericParam} is in play.`
          : `Dark Blessing #${numericParam} is NOT in play.`,
      };
    }

    case 'multi2_dracula_room_before': {
      const lastRoom = roomsHistory[roomsHistory.length - 1];
      const dracInLast = Boolean(lastRoom && dracula && lastRoom.participantPlayerIds.includes(dracula.id));
      return {
        trueAnswer: dracInLast ? 'Yes' : 'No',
        recommendedLie: dracInLast ? 'No' : 'Yes',
        lieReasoning: dracInLast
          ? 'Protects Dracula from tracking across rooms.'
          : 'Falsely frames a participant in the last room as Dracula.',
      };
    }

    case 'multi2_dracula_room_after': {
      return {
        trueAnswer: 'No',
        recommendedLie: 'Yes',
        lieReasoning: 'Subsequent room has not been chosen yet.',
      };
    }

    case 'multi2_room_neighbors_evil': {
      const entities = getSeatedEntities(gameState);
      const m = entities.length;
      const leaderIdx = entities.findIndex(e => e.type === 'player' && e.player?.id === leader.id);
      let count = 0;
      if (leaderIdx !== -1) {
        if (entities[(leaderIdx - 1 + m) % m].alignment === 'evil') count++;
        if (entities[(leaderIdx + 1) % m].alignment === 'evil') count++;
      }
      const trueAns = String(count);
      const lie = count === 0 ? '1' : '0';
      return {
        trueAnswer: trueAns,
        recommendedLie: lie,
        lieReasoning: `Leader has ${count} evil neighbor(s)/spirit(s). Lie shifts scrutiny.`,
      };
    }

    case 'multi2_prior_room_multi_evil': {
      const hadMultiEvil = roomsHistory.some(r => {
        const evils = r.participantPlayerIds.filter(id => {
          const p = players.find(pl => pl.id === id);
          return p && getPlayerRegisteredTeam(p) === 'evil';
        });
        return evils.length > 1;
      });
      return {
        trueAnswer: hadMultiEvil ? 'Yes' : 'No',
        recommendedLie: hadMultiEvil ? 'No' : 'Yes',
        lieReasoning: hadMultiEvil
          ? 'Hides evil coordination in earlier rooms.'
          : 'Creates suspicion that evil players banded together.',
      };
    }

    case 'multi2_dracula_leader_prior': {
      const wasLeader = Boolean(dracula && roomsHistory.some(r => r.leaderPlayerId === dracula.id));
      return {
        trueAnswer: wasLeader ? 'Yes' : 'No',
        recommendedLie: wasLeader ? 'No' : 'Yes',
        lieReasoning: wasLeader
          ? 'Conceals Dracula’s leadership history.'
          : 'Falsely flags an earlier leader as Dracula.',
      };
    }

    case 'multi2_dracula_played_heart': {
      const heartCountToCheck = numericParam || 2;
      const played = Boolean(dracula && roomsHistory.some(r => r.hearts === heartCountToCheck && r.participantPlayerIds.includes(dracula.id)));
      return {
        trueAnswer: played ? 'Yes' : 'No',
        recommendedLie: played ? 'No' : 'Yes',
        lieReasoning: played
          ? `Protects Dracula from heart room deduction.`
          : `Frames other players in ${heartCountToCheck}-heart rooms.`,
      };
    }

    case 'multi3_yes_no_freeform': {
      return {
        trueAnswer: 'Evaluate condition',
        recommendedLie: 'Give believable opposite',
        lieReasoning: 'Renfield gives plausible lie beneficial to Evil.',
      };
    }

    case 'multi3_room_after_fail_who': {
      const lastRoom = roomsHistory[roomsHistory.length - 1];
      if (!lastRoom || lastRoom.outcome !== 'fail') {
        return {
          trueAnswer: 'No',
          recommendedLie: 'Yes (Name a good player)',
          lieReasoning: 'Frames an innocent explorer.',
        };
      }
      const failers = Object.entries(lastRoom.votes)
        .filter(([, v]) => v === 'fail')
        .map(([id]) => players.find(p => p.id === id)?.name || id);
      const trueAns = `Yes (${failers.join(', ') || 'Unknown'})`;
      return {
        trueAnswer: trueAns,
        recommendedLie: 'No',
        lieReasoning: 'Lulls hunters into believing the prior room passed.',
      };
    }

    default:
      return {
        trueAnswer: 'Check rule criteria',
        recommendedLie: 'Give opposite or believable lie helpful to Evil',
        lieReasoning: 'Keep plausible; frame Good or exonerate Evil.',
      };
  }
}
