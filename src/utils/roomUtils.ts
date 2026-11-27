// Room & Chamber Pure Utilities
import type { TeamId } from '../types/rules.ts';
import { getConfigForPlayerCount } from '../types/rules.ts';

/**
 * Generates an uppercase 6-character room seal code (e.g. FUG-K89)
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomPart = '';
  for (let i = 0; i < 3; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const digits = Math.floor(100 + Math.random() * 900);
  return `FUG-${randomPart}${digits}`;
}

/**
 * Derives initial active factions based on activeTeams count
 */
export function getActiveTeamsForCount(count: number): TeamId[] {
  const allTeams: TeamId[] = ['investigators', 'annihilators', 'communists', 'soldiers'];
  return allTeams.slice(0, Math.min(count, 4));
}

/**
 * Calculates scaling parameters for a target hunter count
 */
export function getLobbyScaling(targetCount: number) {
  return getConfigForPlayerCount(targetCount) || {
    regularPlayers: targetCount,
    activeTeams: 4,
    playersPerTeam: 4,
    soloCount: 0,
    totalHouses: 80,
    housesDestroyedPerRound: 3,
  };
}
