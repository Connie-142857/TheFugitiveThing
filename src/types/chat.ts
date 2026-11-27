// Chat System Type Definitions for The Fugitive
// Covers multi-channel messaging, permissions, roles, and security contexts.

import type { TeamId } from './rules.ts';
import type { MatchPhase } from './game.ts';

export type ChatChannelType =
  | 'global'
  | 'team'
  | 'dead'
  | 'host'
  | 'role'
  | 'whisper';

export interface ChatMessage {
  id: string;
  roomId: string;
  channelType: ChatChannelType;
  channelId: string; // e.g. 'global', 'team_investigators', 'dead', 'host', 'role_lovers', 'whisper_uidA_uidB'
  senderUid: string;
  senderUsername: string;
  senderTeam?: TeamId;
  senderAvatar?: string;
  senderRoleDisplay?: string;
  recipientUid?: string; // Set for 'whisper' private dispatches
  message: string;
  timestamp: number;
  isSystem?: boolean;
  isDead?: boolean;
  isGhost?: boolean;
  isZombie?: boolean;
}

export interface ChatPlayerContext {
  uid: string;
  username: string;
  isAlive: boolean;
  isGhost: boolean;
  isZombie: boolean;
  team?: TeamId;
  roleId?: string;
  isHost: boolean;
  kickedFromTeams?: TeamId[]; // Spy can be evicted by teams as per rulebook
  soulboundUid?: string;      // Lover soulmate
}

export interface RoomChatConfig {
  roomId: string;
  allowPrivateMessages: boolean;
  hasHumanHost: boolean;
  currentPhase: 'day' | 'night';
  status: MatchPhase;
  activeTeams: TeamId[];
}

export interface ChannelDescriptor {
  id: string;
  type: ChatChannelType;
  title: string;
  sublabel: string;
  iconName: string;
  teamId?: TeamId;
  recipientUid?: string;
  isRestricted: boolean;
}
