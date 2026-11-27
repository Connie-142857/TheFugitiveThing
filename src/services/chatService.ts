// Firestore Chat Messaging Service for The Fugitive
// Authoritatively dispatches, sanitizes, and streams real-time channel messages.

import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config.ts';
import type {
  ChatMessage,
  ChatPlayerContext,
  RoomChatConfig,
  ChatChannelType,
} from '../types/chat.ts';
import {
  canPlayerSendInChannel,
  canPlayerReadChannel,
  sanitizeAndValidateMessage,
} from './chatSecurityEngine.ts';

// In-memory rate limiting map: uid -> lastSentTimestamp
const userLastSentMap = new Map<string, number>();

/**
 * Subscribes to real-time chamber messages in `rooms/{roomId}/messages`
 */
export function subscribeToChamberMessages(
  roomId: string,
  player: ChatPlayerContext,
  config: RoomChatConfig,
  onMessages: (messages: ChatMessage[]) => void,
  onError?: (err: Error) => void
): () => void {
  const messagesRef = collection(db, 'rooms', roomId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(150));

  return onSnapshot(
    q,
    (snapshot) => {
      const allMessages: ChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        const msg = { id: docSnap.id, ...docSnap.data() } as ChatMessage;

        // Authoritatively filter read permissions for the observing player
        const readPerm = canPlayerReadChannel(player, msg.channelType, msg.channelId, config);
        if (readPerm.canRead) {
          allMessages.push(msg);
        }
      });
      onMessages(allMessages);
    },
    (err) => {
      console.warn('Chamber chat subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Dispatches a chat message with validation, rate-limiting, and permission checks
 */
export async function sendChatMessage(
  roomId: string,
  caller: ChatPlayerContext,
  channelType: ChatChannelType,
  channelId: string,
  rawText: string,
  config: RoomChatConfig
): Promise<ChatMessage> {
  const now = Date.now();
  const lastSent = userLastSentMap.get(caller.uid);

  // 1. Text Sanitization & Spam Throttle
  const sanitization = sanitizeAndValidateMessage(rawText, caller.uid, caller.uid, lastSent, now);
  if (!sanitization.valid) {
    throw new Error(sanitization.error || 'Invalid message payload.');
  }

  // 2. Channel Send Permissions Check
  const sendPerm = canPlayerSendInChannel(caller, channelType, channelId, config);
  if (!sendPerm.canSend) {
    throw new Error(sendPerm.reason || 'You are not permitted to speak in this channel.');
  }

  // 3. Assemble ChatMessage Document (avoiding any undefined fields for Firestore)
  const messageData: Record<string, any> = {
    roomId,
    channelType,
    channelId,
    senderUid: caller.uid,
    senderUsername: caller.username,
    message: sanitization.sanitizedText!,
    timestamp: now,
    isDead: !caller.isAlive,
    isGhost: !!caller.isGhost,
    isZombie: !!caller.isZombie,
  };

  if (caller.team) {
    messageData.senderTeam = caller.team;
  }
  if (caller.isHost) {
    messageData.senderRoleDisplay = 'Host Arbiter';
  }

  const messagesRef = collection(db, 'rooms', roomId, 'messages');
  const docRef = await addDoc(messagesRef, messageData);

  // Update rate limiter timestamp
  userLastSentMap.set(caller.uid, now);

  return {
    id: docRef.id,
    ...messageData,
  } as ChatMessage;
}

/**
 * Submits an automated game announcement into the chamber chat
 */
export async function sendSystemChatAnnouncement(
  roomId: string,
  channelType: ChatChannelType,
  channelId: string,
  announcementText: string
): Promise<void> {
  const messageData: Omit<ChatMessage, 'id'> = {
    roomId,
    channelType,
    channelId,
    senderUid: 'system_tribunal',
    senderUsername: 'High Ledger Tribunal',
    message: announcementText,
    timestamp: Date.now(),
    isSystem: true,
  };

  const messagesRef = collection(db, 'rooms', roomId, 'messages');
  await addDoc(messagesRef, messageData);
}
