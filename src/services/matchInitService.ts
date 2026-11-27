import {
  doc,
  getDoc,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config.ts';
import type { RoomDocument, SecretRoleBriefingData } from '../types/game.ts';
import {
  assignRolesAndFactions,
  validateMatchConfiguration,
} from './roleDistributionEngine.ts';
import type { PlayerCandidate } from './roleDistributionEngine.ts';

/**
 * Lightweight reversible obfuscation so authoritative role resolution
 * can verify roles without exposing plaintext roleId on matchPlayers.
 */
export function encodeAuthoritativeRole(roomId: string, uid: string, roleId: string): string {
  const key = `${roomId}:${uid}`;
  let out = '';
  for (let i = 0; i < roleId.length; i++) {
    out += String.fromCharCode(roleId.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(out);
}

export function decodeAuthoritativeRole(roomId: string, uid: string, encoded: string): string | undefined {
  try {
    const raw = atob(encoded);
    const key = `${roomId}:${uid}`;
    let out = '';
    for (let i = 0; i < raw.length; i++) {
      out += String.fromCharCode(raw.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return out;
  } catch {
    return undefined;
  }
}

/**
 * Initiates the match authoritatively:
 * 1. Validates player count & team composition against the rulebook.
 * 2. Runs authoritative random role distribution.
 * 3. Writes private secret role documents into `rooms/{roomId}/secretRoles/{uid}` (strictly protected).
 * 4. Updates public match state in `rooms/{roomId}` with status: 'in_progress'.
 */
export async function startMatchInFirestore(
  roomId: string,
  callerUid: string,
  preferredFugitiveUid?: string
): Promise<void> {
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    throw new Error('Chamber not found.');
  }

  const room = roomSnap.data() as RoomDocument;

  if (room.status !== 'lobby') {
    throw new Error('Match is already in progress or has concluded.');
  }

  // Permission check: in Human Host Mode, only host can commence
  if (room.settings.gameMode === 'human_host' && room.hostUid !== callerUid) {
    throw new Error('Only the designated Host Moderator may commence the hunt.');
  }

  // Collect active, connected players
  const activePlayers = Object.values(room.players).filter((p) => p.status !== 'left');
  const candidates: PlayerCandidate[] = activePlayers.map((p) => ({
    uid: p.uid,
    username: p.username,
    avatarId: p.avatarId,
  }));

  // Validate configuration against rulebook
  const validation = validateMatchConfiguration(candidates.length, room.settings);
  if (!validation.valid) {
    throw new Error(validation.errors[0] || 'Chamber conditions are not valid to start.');
  }

  // Assign roles authoritatively
  const result = assignRolesAndFactions(candidates, room.settings, preferredFugitiveUid);

  const now = Date.now();
  const dayDurationMs = (room.settings.dayDurationSeconds || 600) * 1000;

  // Use Firestore Batch to commit secret briefings and public state atomically
  const batch = writeBatch(db);

  // 1. Write private secret role briefings & build authoritative role map
  const authoritativeRoles: Record<string, string> = {};
  for (const [uid, briefing] of Object.entries(result.secretBriefings)) {
    const secretRef = doc(db, 'rooms', roomId, 'secretRoles', uid);
    batch.set(secretRef, briefing);
    authoritativeRoles[uid] = encodeAuthoritativeRole(roomId, uid, briefing.roleId);
  }

  // 2. Update public match state
  batch.update(roomRef, {
    status: 'in_progress',
    round: 1,
    phase: 'day',
    phaseEndsAt: now + dayDurationMs,
    totalHouses: result.totalHouses,
    housesDestroyedPerRound: result.housesDestroyedPerRound,
    fugitivePlayerUid: result.fugitiveUid,
    fugitiveCurrentHouse: result.fugitiveInitialHouse,
    fugitiveSpawnpointHouse: null,
    spawnpointCooldownRounds: 0,
    spawnpointHistory: [],
    houses: result.initialHouses,
    matchPlayers: result.publicRoster,
    authoritativeRoles,
    updatedAt: now,
  });

  await batch.commit();
}

/**
 * Subscribes to the authenticated player's secret role briefing
 */
export function subscribeToPlayerSecretBriefing(
  roomId: string,
  playerUid: string,
  onUpdate: (briefing: SecretRoleBriefingData | null) => void,
  onError?: (err: Error) => void
): () => void {
  const secretRef = doc(db, 'rooms', roomId, 'secretRoles', playerUid);
  return onSnapshot(
    secretRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as SecretRoleBriefingData);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.warn('Secret role briefing subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetches the secret briefing for a player once
 */
export async function fetchPlayerSecretBriefing(
  roomId: string,
  playerUid: string
): Promise<SecretRoleBriefingData | null> {
  try {
    const secretRef = doc(db, 'rooms', roomId, 'secretRoles', playerUid);
    const snap = await getDoc(secretRef);
    if (!snap.exists()) return null;
    return snap.data() as SecretRoleBriefingData;
  } catch (err) {
    console.error('Error fetching secret briefing:', err);
    return null;
  }
}
