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

/**
 * Calculates adjacent groups of Good players in circular seating.
 */
export function getGoodGroups(players: Player[]): number[] {
  const n = players.length;
  if (n === 0) return [0, 0];

  const isGood = players.map(p => getPlayerRegisteredTeam(p) === 'good');
  if (isGood.every(g => g)) return [n, 0]; // all good
  if (isGood.every(g => !g)) return [0, 0]; // no good

  // Find an Evil player as starting break point to avoid wrap-around split
  let firstEvilIdx = isGood.findIndex(g => !g);
  if (firstEvilIdx === -1) firstEvilIdx = 0;

  const groups: number[] = [];
  let currentGroup = 0;

  for (let i = 0; i < n; i++) {
    const idx = (firstEvilIdx + 1 + i) % n;
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
 * Counts pairs of adjacent Evil players around the circle.
 */
export function countEvilPairs(players: Player[]): number {
  const n = players.length;
  if (n < 2) return 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    const nextIdx = (i + 1) % n;
    const p1Evil = getPlayerRegisteredTeam(players[i]) === 'evil';
    const p2Evil = getPlayerRegisteredTeam(players[nextIdx]) === 'evil';
    if (p1Evil && p2Evil) {
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
      const seat = leaderSeat;
      const leftSeat = (seat - 1 + n) % n;
      const rightSeat = (seat + 1) % n;
      const nextToEvil =
        getPlayerRegisteredTeam(players[leftSeat]) === 'evil' ||
        getPlayerRegisteredTeam(players[rightSeat]) === 'evil';
      return {
        trueAnswer: nextToEvil ? 'Yes' : 'No',
        recommendedLie: nextToEvil ? 'No' : 'Yes',
        lieReasoning: nextToEvil
          ? 'Calms suspicions on their evil neighbors.'
          : 'Creates false paranoia against their good neighbors.',
      };
    }

    case 'solo_next_to_good': {
      const seat = leaderSeat;
      const leftSeat = (seat - 1 + n) % n;
      const rightSeat = (seat + 1) % n;
      const nextToGood =
        getPlayerRegisteredTeam(players[leftSeat]) === 'good' ||
        getPlayerRegisteredTeam(players[rightSeat]) === 'good';
      return {
        trueAnswer: nextToGood ? 'Yes' : 'No',
        recommendedLie: nextToGood ? 'No' : 'Yes',
        lieReasoning: 'Misleads neighbor team deduction.',
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
      const pairs = countEvilPairs(players);
      const trueAns = pairs >= 6 ? '6+' : String(pairs);
      const lie = pairs === 0 ? '1' : String(Math.max(0, pairs - 1));
      return {
        trueAnswer: trueAns,
        recommendedLie: lie,
        lieReasoning: `True is ${trueAns}. Giving ${lie} shifts how many evil players seem grouped.`,
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
      const s1 = p1.seat - 1;
      const s2 = p2.seat - 1;
      const cwDist = getClockwiseDistance(s1, s2, n);
      let foundEvil = false;
      for (let step = 1; step < cwDist; step++) {
        const checkSeat = (s1 + step) % n;
        if (getPlayerRegisteredTeam(players[checkSeat]) === 'evil') {
          foundEvil = true;
          break;
        }
      }
      return {
        trueAnswer: foundEvil ? 'Yes' : 'No',
        recommendedLie: foundEvil ? 'No' : 'Yes',
        lieReasoning: foundEvil ? 'Hides Evil in the gap.' : 'Frames good players between them.',
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
      const groups = getGoodGroups(players);
      const largest = groups[0] || 0;
      const trueAns = largest >= 9 ? '9+' : String(largest);
      const lie = String(Math.max(1, largest - 1));
      return {
        trueAnswer: trueAns,
        recommendedLie: lie,
        lieReasoning: `True largest good group is ${largest}. Lie suggests Evil players are more split up.`,
      };
    }

    case 'multi3_second_largest_good': {
      const groups = getGoodGroups(players);
      const second = groups[1] || 0;
      const trueAns = second >= 8 ? '8+' : String(second);
      const lie = second === 0 ? '1' : String(Math.max(0, second - 1));
      return {
        trueAnswer: trueAns,
        recommendedLie: lie,
        lieReasoning: `True 2nd largest group is ${second}.`,
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

    default:
      return {
        trueAnswer: 'Check rule criteria',
        recommendedLie: 'Give opposite or believable lie helpful to Evil',
        lieReasoning: 'Keep plausible; frame Good or exonerate Evil.',
      };
  }
}
