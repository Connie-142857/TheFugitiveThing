// Authoritative Chat Permission, Security & Anti-Spam Engine for The Fugitive
// Validates channel access, living/dead boundaries, ghost/zombie restrictions, and team permissions.

import type {
  ChatPlayerContext,
  RoomChatConfig,
  ChatChannelType,
} from '../types/chat.ts';
import type { TeamId } from '../types/rules.ts';

export interface ChannelAccessResult {
  canRead: boolean;
  canSend: boolean;
  reason?: string;
}

export interface SanitizedMessageResult {
  valid: boolean;
  sanitizedText?: string;
  error?: string;
}

/**
 * Derives normalized channel ID for a team
 */
export function getTeamChannelId(teamId: TeamId): string {
  return `team_${teamId}`;
}

/**
 * Derives deterministic pairwise channel ID for private whispers
 */
export function getWhisperChannelId(uidA: string, uidB: string): string {
  const sorted = [uidA, uidB].sort();
  return `whisper_${sorted[0]}_${sorted[1]}`;
}

/**
 * Authoritatively validates whether a player can READ from a channel
 */
export function canPlayerReadChannel(
  player: ChatPlayerContext,
  channelType: ChatChannelType,
  channelId: string,
  config: RoomChatConfig
): ChannelAccessResult {
  // Host Moderator has oversight across all channels
  if (player.isHost) {
    if (channelType === 'host' && !config.hasHumanHost) {
      return { canRead: false, canSend: false, reason: 'Human Host mode is not active for this chamber.' };
    }
    return { canRead: true, canSend: true };
  }

  switch (channelType) {
    case 'global': {
      // All players (living, dead, ghosts, zombies) can read the town bulletin
      return { canRead: true, canSend: player.isAlive && !player.isZombie };
    }

    case 'team': {
      // Must identify target team
      const targetTeam = channelId.replace('team_', '') as TeamId;

      // Rulebook exception: Prisoner is NOT added to Communist chat at start
      if (player.roleId === 'prisoner' && targetTeam === 'communists') {
        return { canRead: false, canSend: false, reason: 'The Prisoner is locked in solitary and excluded from Communist council.' };
      }

      // Rulebook exception: Spy is in all team channels unless kicked
      if (player.roleId === 'spy') {
        const isKicked = player.kickedFromTeams && player.kickedFromTeams.includes(targetTeam);
        if (isKicked) {
          return { canRead: false, canSend: false, reason: 'You were discovered and banished from this faction council.' };
        }
        return { canRead: true, canSend: player.isAlive };
      }

      // Standard Team Member
      if (player.team === targetTeam) {
        return { canRead: true, canSend: player.isAlive || player.isGhost };
      }

      return { canRead: false, canSend: false, reason: 'You do not hold fealty to this faction.' };
    }

    case 'dead': {
      // Dead players and Ghosts can read Dead Chat. Living players CANNOT read Dead Chat.
      if (!player.isAlive || player.isGhost) {
        return { canRead: true, canSend: true };
      }
      return { canRead: false, canSend: false, reason: 'The living cannot peer into the Sepulchre of the Dead.' };
    }

    case 'host': {
      if (!config.hasHumanHost) {
        return { canRead: false, canSend: false, reason: 'Host Tribunal is only available when a Human Host moderates.' };
      }
      return { canRead: true, canSend: true };
    }

    case 'role': {
      // Lovers private council
      if (channelId === 'role_lovers') {
        const isLover = player.roleId === 'lover' || !!player.soulboundUid;
        if (isLover) {
          return { canRead: true, canSend: player.isAlive };
        }
      }
      return { canRead: false, canSend: false, reason: 'Restricted role council.' };
    }

    case 'whisper': {
      if (!config.allowPrivateMessages) {
        return { canRead: false, canSend: false, reason: 'Private missives are forbidden by chamber decrees.' };
      }
      // Channel format: whisper_uid1_uid2
      // Safe check ensuring player.uid is one of the two designated endpoints
      const isParty =
        channelId.startsWith(`whisper_${player.uid}_`) ||
        channelId.endsWith(`_${player.uid}`);

      if (isParty) {
        return { canRead: true, canSend: player.isAlive };
      }
      return { canRead: false, canSend: false, reason: 'You are not a party to this private correspondence.' };
    }

    default:
      return { canRead: false, canSend: false, reason: 'Unknown channel type.' };
  }
}

/**
 * Authoritatively validates whether a player can SEND a message in a channel
 */
export function canPlayerSendInChannel(
  player: ChatPlayerContext,
  channelType: ChatChannelType,
  channelId: string,
  config: RoomChatConfig
): ChannelAccessResult {
  const readPerm = canPlayerReadChannel(player, channelType, channelId, config);
  if (!readPerm.canRead) return readPerm;

  // Host can always send
  if (player.isHost) {
    return { canRead: true, canSend: true };
  }

  // Dead Player Restrictions
  if (!player.isAlive) {
    if (channelType === 'dead') {
      return { canRead: true, canSend: true };
    }
    // Communist ghosts can speak in their team council as per rulebook
    if (player.isGhost && channelType === 'team' && player.team === 'communists') {
      return { canRead: true, canSend: true };
    }
    return {
      canRead: readPerm.canRead,
      canSend: false,
      reason: 'The dead cannot send missives into the world of the living.',
    };
  }

  // Zombies cannot speak / act
  if (player.isZombie) {
    return {
      canRead: readPerm.canRead,
      canSend: false,
      reason: 'Zombies are mute undead and cannot dispatch messages.',
    };
  }

  // Global Chat: Day vs Night restrictions
  if (channelType === 'global' && config.status !== 'lobby') {
    if (config.currentPhase === 'night') {
      return {
        canRead: true,
        canSend: false,
        reason: 'Curfew decree: Global forum is silenced during the Night phase.',
      };
    }
  }

  // Team Chat: Check Prisoner & Spy kick
  if (channelType === 'team') {
    const targetTeam = channelId.replace('team_', '') as TeamId;
    if (player.roleId === 'prisoner' && targetTeam === 'communists') {
      return { canRead: false, canSend: false, reason: 'Prisoner is excluded from team chat.' };
    }
    if (player.roleId === 'spy' && player.kickedFromTeams?.includes(targetTeam)) {
      return { canRead: false, canSend: false, reason: 'Exiled from this team chat.' };
    }
  }

  return { canRead: true, canSend: true };
}

/**
 * Message text sanitization and anti-spam verification
 */
export function sanitizeAndValidateMessage(
  rawText: string,
  callerUid: string,
  claimedSenderUid: string,
  lastSentTimestamp?: number,
  now: number = Date.now()
): SanitizedMessageResult {
  // 1. Anti-Impersonation Check
  if (callerUid !== claimedSenderUid) {
    return { valid: false, error: 'Sender identity spoofing rejected.' };
  }

  // 2. Non-empty check
  if (!rawText || typeof rawText !== 'string') {
    return { valid: false, error: 'Missive text cannot be empty.' };
  }

  const trimmed = rawText.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Missive cannot consist solely of whitespace.' };
  }

  // 3. Length restrictions
  if (trimmed.length > 500) {
    return { valid: false, error: 'Missive exceeds maximum imperial length of 500 characters.' };
  }

  // 4. Rate-Limiting / Spam Protection (minimum 250ms cooldown)
  if (lastSentTimestamp && now - lastSentTimestamp < 250) {
    return { valid: false, error: 'Spam throttle: dispatching too swiftly. Please pause.' };
  }

  // 5. Basic HTML Stripping
  const sanitized = trimmed
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return {
    valid: true,
    sanitizedText: sanitized,
  };
}
