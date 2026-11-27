import {
  doc,
  getDoc,
  runTransaction,
  onSnapshot,
  collection,
  query,
  where,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { RoomDocument, RoomSettings, LobbyPlayer, GameMode } from '../types/game';
import { getConfigForPlayerCount } from '../types/rules';
import { generateRoomCode, getActiveTeamsForCount, getLobbyScaling } from '../utils/roomUtils';

export { generateRoomCode, getActiveTeamsForCount, getLobbyScaling };

export interface CreateLobbyParams {
  roomName: string;
  gameMode: GameMode;
  targetPlayerCount: number; // Regular players (excluding The Fugitive)
  isRealTime: boolean;
  dayDurationSeconds?: number;
  nightDurationSeconds?: number;
  allowHostOverrides?: boolean;
}

export interface PlayerIdentity {
  uid: string;
  username: string;
  avatarId: string;
  level: number;
}

/**
 * Creates a new private multiplayer chamber in Firestore
 */
export async function createLobby(
  creator: PlayerIdentity,
  params: CreateLobbyParams
): Promise<RoomDocument> {
  const scaling = getConfigForPlayerCount(params.targetPlayerCount) || {
    regularPlayers: params.targetPlayerCount,
    activeTeams: 4,
    playersPerTeam: 4,
    soloCount: 0,
    totalHouses: 80,
    housesDestroyedPerRound: 3,
  };

  const roomCode = generateRoomCode();
  const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const isHostMode = params.gameMode === 'human_host';

  const settings: RoomSettings = {
    gameMode: params.gameMode,
    targetPlayerCount: params.targetPlayerCount,
    isRealTime: params.isRealTime,
    dayDurationSeconds: params.dayDurationSeconds || (params.isRealTime ? 36000 : 600),
    nightDurationSeconds: params.nightDurationSeconds || (params.isRealTime ? 50400 : 300),
    activeTeams: getActiveTeamsForCount(scaling.activeTeams),
    soloRoleCount: scaling.soloCount,
    totalHouses: scaling.totalHouses,
    housesDestroyedPerRound: scaling.housesDestroyedPerRound,
    allowHostOverrides: params.allowHostOverrides ?? true,
  };

  const initialPlayer: LobbyPlayer = {
    uid: creator.uid,
    username: creator.username,
    avatarId: creator.avatarId,
    level: creator.level,
    isHost: isHostMode,
    status: isHostMode ? 'ready' : 'connected',
    joinedAt: now,
    lastSeenAt: now,
  };

  const roomDoc: RoomDocument = {
    id: roomId,
    roomCode,
    roomName: params.roomName.trim() || 'Secret Chamber',
    createdById: creator.uid,
    hostUid: isHostMode ? creator.uid : null,
    status: 'lobby',
    createdAt: now,
    updatedAt: now,
    settings,
    players: {
      [creator.uid]: initialPlayer,
    },
    playerCount: 1,
    minRequiredPlayers: 7, // 6 regular + 1 Fugitive minimum
  };

  // Write Room and RoomCode index atomically
  await runTransaction(db, async (transaction) => {
    const codeRef = doc(db, 'roomCodes', roomCode);
    const codeSnap = await transaction.get(codeRef);
    if (codeSnap.exists()) {
      throw new Error('Chamber seal collision. Please try establishing the chamber again.');
    }

    transaction.set(codeRef, {
      roomId,
      roomCode,
      createdAt: now,
    });

    const roomRef = doc(db, 'rooms', roomId);
    transaction.set(roomRef, roomDoc);
  });

  return roomDoc;
}

/**
 * Resolves a room code to a Room ID
 */
export async function findRoomByCode(roomCode: string): Promise<string | null> {
  const sanitized = roomCode.trim().toUpperCase();
  const codeRef = doc(db, 'roomCodes', sanitized);
  const snap = await getDoc(codeRef);
  if (!snap.exists()) {
    return null;
  }
  return snap.data().roomId as string;
}

/**
 * Joins an existing chamber
 */
export async function joinLobby(roomId: string, player: PlayerIdentity): Promise<RoomDocument> {
  const roomRef = doc(db, 'rooms', roomId);

  return await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(roomRef);
    if (!snap.exists()) {
      throw new Error('Chamber not found or has been disbanded.');
    }

    const room = snap.data() as RoomDocument;

    if (room.status !== 'lobby') {
      throw new Error('The hunt in this chamber has already commenced.');
    }

    // Maximum capacity check: target hunters + 1 fugitive
    const maxCapacity = room.settings.targetPlayerCount + 1;
    const existingPlayer = room.players[player.uid];

    // Count currently active players
    const activePlayers = Object.values(room.players).filter(
      (p) => p.status !== 'left'
    );

    if (!existingPlayer && activePlayers.length >= maxCapacity) {
      throw new Error(`This chamber is filled to capacity (${maxCapacity} hunters).`);
    }

    const now = Date.now();
    const updatedPlayers = { ...room.players };

    if (existingPlayer) {
      // Reconnecting
      updatedPlayers[player.uid] = {
        ...existingPlayer,
        username: player.username,
        avatarId: player.avatarId,
        level: player.level,
        status: existingPlayer.status === 'left' ? 'connected' : existingPlayer.status,
        lastSeenAt: now,
      };
    } else {
      // New join
      const isFirstAndHostMode = room.settings.gameMode === 'human_host' && !room.hostUid;
      updatedPlayers[player.uid] = {
        uid: player.uid,
        username: player.username,
        avatarId: player.avatarId,
        level: player.level,
        isHost: isFirstAndHostMode,
        status: 'connected',
        joinedAt: now,
        lastSeenAt: now,
      };

      if (isFirstAndHostMode) {
        room.hostUid = player.uid;
      }
    }

    const newActiveCount = Object.values(updatedPlayers).filter(
      (p) => p.status !== 'left'
    ).length;

    const updatedRoom: RoomDocument = {
      ...room,
      players: updatedPlayers,
      playerCount: newActiveCount,
      updatedAt: now,
    };

    transaction.set(roomRef, updatedRoom);
    return updatedRoom;
  });
}

/**
 * Toggles a player's readiness status
 */
export async function togglePlayerReadiness(
  roomId: string,
  uid: string,
  isReady: boolean
): Promise<void> {
  const roomRef = doc(db, 'rooms', roomId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(roomRef);
    if (!snap.exists()) return;

    const room = snap.data() as RoomDocument;
    const player = room.players[uid];
    if (!player) return;

    const newStatus = isReady ? 'ready' : 'not_ready';
    transaction.update(roomRef, {
      [`players.${uid}.status`]: newStatus,
      [`players.${uid}.lastSeenAt`]: Date.now(),
      updatedAt: Date.now(),
    });
  });
}

/**
 * Leaves a chamber with automatic host transfer fallback
 */
export async function leaveLobby(roomId: string, uid: string): Promise<void> {
  const roomRef = doc(db, 'rooms', roomId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(roomRef);
    if (!snap.exists()) return;

    const room = snap.data() as RoomDocument;
    const player = room.players[uid];
    if (!player) return;

    const updatedPlayers = { ...room.players };
    updatedPlayers[uid] = {
      ...player,
      status: 'left',
      lastSeenAt: Date.now(),
    };

    // Calculate remaining active players
    const remainingActive = Object.values(updatedPlayers).filter(
      (p) => p.status !== 'left' && p.uid !== uid
    );

    let newHostUid = room.hostUid;

    // If leaving player was the host, reassign host to oldest remaining player
    if (room.settings.gameMode === 'human_host' && room.hostUid === uid) {
      if (remainingActive.length > 0) {
        // Sort by joinedAt
        remainingActive.sort((a, b) => a.joinedAt - b.joinedAt);
        newHostUid = remainingActive[0].uid;
        updatedPlayers[newHostUid].isHost = true;
      } else {
        newHostUid = null;
      }
    }

    const newActiveCount = remainingActive.length;

    const updates: Partial<RoomDocument> = {
      players: updatedPlayers,
      playerCount: newActiveCount,
      hostUid: newHostUid,
      updatedAt: Date.now(),
    };

    if (newActiveCount === 0) {
      updates.status = 'ended';
    }

    transaction.update(roomRef, updates);
  });
}

/**
 * Updates room settings with authoritative permission enforcement
 */
export async function updateLobbySettings(
  roomId: string,
  callerUid: string,
  newSettings: Partial<RoomSettings>
): Promise<void> {
  const roomRef = doc(db, 'rooms', roomId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(roomRef);
    if (!snap.exists()) {
      throw new Error('Chamber not found.');
    }

    const room = snap.data() as RoomDocument;

    // Permission check: if Human Host Mode, only hostUid can alter settings
    if (room.settings.gameMode === 'human_host' && room.hostUid !== callerUid) {
      throw new Error('Only the designated Host Moderator may alter chamber decree settings.');
    }

    // Merge settings
    const merged: RoomSettings = {
      ...room.settings,
      ...newSettings,
    };

    // If target player count changed, re-scale teams and houses
    if (newSettings.targetPlayerCount && newSettings.targetPlayerCount !== room.settings.targetPlayerCount) {
      const scaling = getConfigForPlayerCount(newSettings.targetPlayerCount);
      if (scaling) {
        merged.activeTeams = getActiveTeamsForCount(scaling.activeTeams);
        merged.soloRoleCount = scaling.soloCount;
        merged.totalHouses = scaling.totalHouses;
        merged.housesDestroyedPerRound = scaling.housesDestroyedPerRound;
      }
    }

    transaction.update(roomRef, {
      settings: merged,
      updatedAt: Date.now(),
    });
  });
}

/**
 * Fills a chamber with test comrades to allow instant solo testing
 */
export async function summonTestComrades(roomId: string, count: number = 6): Promise<void> {
  const roomRef = doc(db, 'rooms', roomId);
  const MOCK_NAMES = [
    'Brother_Cadfael',
    'Lady_Eleanor',
    'Friar_Tuck',
    'Sergeant_Bronn',
    'Dame_Isolde',
    'Sir_Galahad',
    'Sister_Beatrice',
    'Bailiff_Rowan',
  ];

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(roomRef);
    if (!snap.exists()) throw new Error('Chamber not found.');
    const room = snap.data() as RoomDocument;
    const now = Date.now();
    const updatedPlayers = { ...room.players };

    for (let i = 0; i < count; i++) {
      const mockUid = `test_hunter_${Date.now()}_${i + 1}`;
      const name = MOCK_NAMES[i % MOCK_NAMES.length] || `Hunter_${i + 1}`;
      updatedPlayers[mockUid] = {
        uid: mockUid,
        username: name,
        avatarId: `avatar_${(i % 5) + 1}`,
        level: 10 + i * 2,
        isHost: false,
        status: 'ready',
        joinedAt: now,
        lastSeenAt: now,
      };
    }

    const activeCount = Object.values(updatedPlayers).filter((p) => p.status !== 'left').length;
    transaction.update(roomRef, {
      players: updatedPlayers,
      playerCount: activeCount,
      updatedAt: now,
    });
  });
}

/**
 * Real-time subscription to a Room document in Firestore
 */
export function subscribeToLobby(
  roomId: string,
  onUpdate: (room: RoomDocument | null) => void,
  onError?: (err: Error) => void
): () => void {
  const roomRef = doc(db, 'rooms', roomId);
  return onSnapshot(
    roomRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as RoomDocument);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.warn('Lobby subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetches recent open chambers
 */
export async function listOpenLobbies(): Promise<RoomDocument[]> {
  try {
    const roomsCol = collection(db, 'rooms');
    const q = query(roomsCol, where('status', '==', 'lobby'), limit(10));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as RoomDocument);
  } catch (err) {
    console.warn('Error querying open chambers:', err);
    return [];
  }
}
