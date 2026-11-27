import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { RoomDocument, RoomSettings, LobbyPlayer } from '../types/game';
import {
  createLobby,
  findRoomByCode,
  joinLobby,
  leaveLobby,
  togglePlayerReadiness,
  updateLobbySettings,
  subscribeToLobby,
  CreateLobbyParams,
} from '../services/lobbyService';
import { startMatchInFirestore } from '../services/matchInitService';

interface RoomContextValue {
  currentRoom: RoomDocument | null;
  inLobby: boolean;
  isHost: boolean;
  currentPlayer: LobbyPlayer | null;
  loading: boolean;
  createChamber: (params: CreateLobbyParams) => Promise<RoomDocument>;
  joinChamberByCode: (code: string) => Promise<void>;
  joinChamberById: (roomId: string) => Promise<void>;
  leaveChamber: () => Promise<void>;
  toggleReady: () => Promise<void>;
  updateSettings: (newSettings: Partial<RoomSettings>) => Promise<void>;
  startMatch: () => Promise<void>;
}

const RoomContext = createContext<RoomContextValue | undefined>(undefined);

export const RoomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, openAuthModal } = useAuth();
  const { showToast } = useToast();

  const [currentRoom, setCurrentRoom] = useState<RoomDocument | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Clean up listener on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  const attachRoomListener = useCallback((roomId: string) => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    unsubscribeRef.current = subscribeToLobby(
      roomId,
      (updatedRoom) => {
        if (!updatedRoom || updatedRoom.status === 'ended') {
          setCurrentRoom(null);
          showToast('The chamber has been dissolved.', 'info', 'Chamber Closed');
          if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
          }
        } else {
          setCurrentRoom(updatedRoom);
        }
      },
      (err) => {
        console.error('Room listener error:', err);
        showToast('Lost connection to chamber updates.', 'warning', 'Connection Disturbed');
      }
    );
  }, [showToast]);

  const createChamber = async (params: CreateLobbyParams): Promise<RoomDocument> => {
    if (!user || !profile) {
      openAuthModal('login');
      throw new Error('You must inscribe your name in the Citadel Registry before creating a chamber.');
    }

    setLoading(true);
    try {
      const room = await createLobby(
        {
          uid: user.uid,
          username: profile.username,
          avatarId: profile.avatarId,
          level: profile.level,
        },
        params
      );

      setCurrentRoom(room);
      attachRoomListener(room.id);
      showToast(`Chamber "${room.roomName}" established with Seal ${room.roomCode}.`, 'success', 'Chamber Sealed');
      return room;
    } finally {
      setLoading(false);
    }
  };

  const joinChamberByCode = async (code: string) => {
    if (!user || !profile) {
      openAuthModal('login');
      throw new Error('You must inscribe your name in the Citadel Registry before entering a chamber.');
    }

    setLoading(true);
    try {
      const roomId = await findRoomByCode(code);
      if (!roomId) {
        throw new Error(`No secret chamber found bearing the seal "${code.toUpperCase()}".`);
      }

      await joinChamberById(roomId);
    } finally {
      setLoading(false);
    }
  };

  const joinChamberById = async (roomId: string) => {
    if (!user || !profile) {
      openAuthModal('login');
      throw new Error('You must inscribe your name in the Citadel Registry before entering a chamber.');
    }

    setLoading(true);
    try {
      const room = await joinLobby(roomId, {
        uid: user.uid,
        username: profile.username,
        avatarId: profile.avatarId,
        level: profile.level,
      });

      setCurrentRoom(room);
      attachRoomListener(room.id);
      showToast(`Entered ${room.roomName}.`, 'success', 'Threshold Crossed');
    } finally {
      setLoading(false);
    }
  };

  const leaveChamber = async () => {
    if (!currentRoom || !user) return;

    const roomId = currentRoom.id;
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setCurrentRoom(null);

    try {
      await leaveLobby(roomId, user.uid);
      showToast('You have departed from the chamber.', 'info', 'Departed');
    } catch (e) {
      console.warn('Error recording chamber departure:', e);
    }
  };

  const toggleReady = async () => {
    if (!currentRoom || !user) return;
    const player = currentRoom.players[user.uid];
    if (!player) return;

    const willBeReady = player.status !== 'ready';
    try {
      await togglePlayerReadiness(currentRoom.id, user.uid, willBeReady);
    } catch (e) {
      console.error('Failed to update readiness:', e);
      showToast('Could not register readiness decree.', 'danger', 'Decree Failed');
    }
  };

  const updateSettings = async (newSettings: Partial<RoomSettings>) => {
    if (!currentRoom || !user) return;
    try {
      await updateLobbySettings(currentRoom.id, user.uid, newSettings);
      showToast('Chamber decrees updated.', 'success', 'Decree Recorded');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not alter settings.';
      showToast(msg, 'danger', 'Decree Rejected');
    }
  };

  const startMatch = async () => {
    if (!currentRoom || !user) return;
    setLoading(true);
    try {
      await startMatchInFirestore(currentRoom.id, user.uid);
      showToast('The hunt has commenced! Secret roles inscribed.', 'success', 'Hunt Begun');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not commence match.';
      showToast(msg, 'danger', 'Decree Failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const inLobby = !!currentRoom;
  const isHost = !!(
    currentRoom &&
    user &&
    (currentRoom.hostUid === user.uid || (currentRoom.settings.gameMode === 'automated' && currentRoom.createdById === user.uid))
  );
  const currentPlayer = currentRoom && user ? currentRoom.players[user.uid] || null : null;

  return (
    <RoomContext.Provider
      value={{
        currentRoom,
        inLobby,
        isHost,
        currentPlayer,
        loading,
        createChamber,
        joinChamberByCode,
        joinChamberById,
        leaveChamber,
        toggleReady,
        updateSettings,
        startMatch,
      }}
    >
      {children}
    </RoomContext.Provider>
  );
};

export const useRoom = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
};
