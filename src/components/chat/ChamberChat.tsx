import React, { useState, useEffect, useRef, useMemo } from 'react';
import type {
  ChatMessage,
  ChatPlayerContext,
  RoomChatConfig,
  ChatChannelType,
  ChannelDescriptor,
} from '../../types/chat.ts';
import {
  subscribeToChamberMessages,
  sendChatMessage,
} from '../../services/chatService.ts';
import {
  canPlayerSendInChannel,
  getTeamChannelId,
  getWhisperChannelId,
} from '../../services/chatSecurityEngine.ts';
import { ParchmentPanel } from '../ui/ParchmentPanel.tsx';
import { Button } from '../ui/Button.tsx';
import {
  MessageSquare,
  Shield,
  Skull,
  Send,
  Lock,
  Crown,
  Eye,
  Radio,
  Heart,
} from 'lucide-react';

interface ChamberChatProps {
  roomId: string;
  player: ChatPlayerContext;
  config: RoomChatConfig;
  allRoomPlayers?: { uid: string; username: string }[];
  className?: string;
}

export const ChamberChat: React.FC<ChamberChatProps> = ({
  roomId,
  player,
  config,
  allRoomPlayers = [],
  className = '',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeChannelType, setActiveChannelType] = useState<ChatChannelType>('global');
  const [selectedTeamChannelId, setSelectedTeamChannelId] = useState<string>('');
  const [selectedWhisperUid, setSelectedWhisperUid] = useState<string>('');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const activeChannelIdRef = useRef<string>('global');

  // Available Channel Descriptors
  const channels = useMemo<ChannelDescriptor[]>(() => {
    const list: ChannelDescriptor[] = [
      {
        id: 'global',
        type: 'global',
        title: 'Town Forum',
        sublabel: 'Public Assembly',
        iconName: 'Globe',
        isRestricted: false,
      },
    ];

    // Team Channels: Spy & Host see all active teams (unless Spy was kicked); regular faction members see their own (except Prisoner)
    if (player.roleId === 'spy' || player.isHost) {
      for (const teamId of config.activeTeams) {
        if (player.roleId === 'spy' && player.kickedFromTeams?.includes(teamId)) continue;
        list.push({
          id: getTeamChannelId(teamId),
          type: 'team',
          title: `${teamId.charAt(0).toUpperCase() + teamId.slice(1)} Council`,
          sublabel: player.roleId === 'spy' ? 'Infiltrated' : 'Oversight',
          iconName: 'Shield',
          teamId,
          isRestricted: false,
        });
      }
    } else if (
      player.team &&
      player.team !== 'solo' &&
      player.team !== 'fugitive' &&
      !(player.roleId === 'prisoner' && player.team === 'communists')
    ) {
      list.push({
        id: getTeamChannelId(player.team),
        type: 'team',
        title: 'Faction Council',
        sublabel: `${player.team.toUpperCase()} Orders`,
        iconName: 'Shield',
        teamId: player.team,
        isRestricted: false,
      });
    }

    // Lovers Secret Channel
    if (player.roleId === 'lover' || !!player.soulboundUid || player.isHost) {
      list.push({
        id: 'role_lovers',
        type: 'role',
        title: 'Lovers Sanctuary',
        sublabel: 'Soulbound',
        iconName: 'Heart',
        isRestricted: true,
      });
    }

    // Dead Chat (if dead, ghost, or host)
    if (!player.isAlive || player.isGhost || player.isHost) {
      list.push({
        id: 'dead',
        type: 'dead',
        title: 'The Sepulchre',
        sublabel: 'Dead Souls',
        iconName: 'Skull',
        isRestricted: false,
      });
    }

    // Host Tribunal (if human host mode)
    if (config.hasHumanHost) {
      list.push({
        id: 'host',
        type: 'host',
        title: 'Host Tribunal',
        sublabel: 'Moderator Council',
        iconName: 'Crown',
        isRestricted: false,
      });
    }

    // Private Missives (if enabled)
    if (config.allowPrivateMessages) {
      list.push({
        id: 'whisper',
        type: 'whisper',
        title: 'Secret Missives',
        sublabel: 'Direct Whispers',
        iconName: 'Radio',
        isRestricted: false,
      });
    }

    return list;
  }, [player, config]);

  // Compute Active Channel ID
  const activeChannelId = useMemo(() => {
    if (activeChannelType === 'team') {
      if (selectedTeamChannelId) return selectedTeamChannelId;
      if (player.team && player.team !== 'solo' && player.team !== 'fugitive') {
        return getTeamChannelId(player.team);
      }
      if (config.activeTeams.length > 0) {
        return getTeamChannelId(config.activeTeams[0]);
      }
    }
    if (activeChannelType === 'role') {
      return 'role_lovers';
    }
    if (activeChannelType === 'whisper' && selectedWhisperUid) {
      return getWhisperChannelId(player.uid, selectedWhisperUid);
    }
    return activeChannelType;
  }, [activeChannelType, selectedTeamChannelId, player.team, player.uid, selectedWhisperUid, config.activeTeams]);

  activeChannelIdRef.current = activeChannelId;

  // Check current send permissions
  const sendPerm = useMemo(() => {
    return canPlayerSendInChannel(player, activeChannelType, activeChannelId, config);
  }, [player, activeChannelType, activeChannelId, config]);

  // Subscribe to room messages
  useEffect(() => {
    const unsubscribe = subscribeToChamberMessages(
      roomId,
      player,
      config,
      (newMsgs) => {
        setMessages(newMsgs);

        const newlyArrived = newMsgs.filter((m) => !seenMessageIdsRef.current.has(m.id));
        if (newlyArrived.length > 0) {
          newlyArrived.forEach((m) => seenMessageIdsRef.current.add(m.id));
          setUnreadCounts((prev) => {
            const updated = { ...prev };
            newlyArrived.forEach((msg) => {
              if (msg.channelId !== activeChannelIdRef.current && msg.senderUid !== player.uid) {
                updated[msg.channelId] = (updated[msg.channelId] || 0) + 1;
              }
            });
            return updated;
          });
        }
      },
      (err) => console.error('Chat subscription error:', err)
    );

    return () => unsubscribe();
  }, [
    roomId,
    player.uid,
    player.isAlive,
    player.isGhost,
    player.isZombie,
    player.team,
    player.roleId,
    player.isHost,
    player.soulboundUid,
    config.currentPhase,
    config.status,
    config.hasHumanHost,
    config.allowPrivateMessages,
  ]);

  // Auto-scroll to bottom on message received
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannelId]);

  // Clear unread on channel switch
  const handleSelectChannel = (channel: ChannelDescriptor) => {
    setActiveChannelType(channel.type);
    if (channel.type === 'team') {
      setSelectedTeamChannelId(channel.id);
    }
    setSendError(null);
    setUnreadCounts((prev) => ({
      ...prev,
      [channel.id]: 0,
    }));
  };

  // Submit message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending || !sendPerm.canSend) return;

    setIsSending(true);
    setSendError(null);

    try {
      await sendChatMessage(
        roomId,
        player,
        activeChannelType,
        activeChannelId,
        inputText,
        config
      );
      setInputText('');
    } catch (err: any) {
      setSendError(err.message || 'Dispatch failed.');
    } finally {
      setIsSending(false);
    }
  };

  // Filter messages for active channel
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      if (activeChannelType === 'whisper') {
        if (!selectedWhisperUid) return false;
        return msg.channelId === activeChannelId;
      }
      return msg.channelId === activeChannelId;
    });
  }, [messages, activeChannelId, activeChannelType, selectedWhisperUid]);

  return (
    <ParchmentPanel variant="bound" className={`flex flex-col h-[520px] max-h-[75vh] ${className} p-0 overflow-hidden`}>
      {/* Top Channel Navigation Bar */}
      <div className="bg-parchment-200 border-b border-parchment-400 p-2 flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
        {channels.map((chan) => {
          const isActive =
            activeChannelType === chan.type &&
            (chan.type !== 'team' || activeChannelId === chan.id);
          const unread = unreadCounts[chan.id] || 0;

          return (
            <button
              key={chan.id}
              onClick={() => handleSelectChannel(chan)}
              className={`relative px-3 py-1.5 rounded text-xs font-serif font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                isActive
                  ? 'bg-parchment-50 text-manuscript-burgundy shadow-inner border border-parchment-400'
                  : 'text-ink-light hover:bg-parchment-300 hover:text-ink'
              }`}
            >
              {chan.type === 'global' && <MessageSquare className="w-3.5 h-3.5" />}
              {chan.type === 'team' && <Shield className="w-3.5 h-3.5 text-emerald-800" />}
              {chan.type === 'role' && <Heart className="w-3.5 h-3.5 text-rose-800" />}
              {chan.type === 'dead' && <Skull className="w-3.5 h-3.5 text-red-950" />}
              {chan.type === 'host' && <Crown className="w-3.5 h-3.5 text-amber-800" />}
              {chan.type === 'whisper' && <Radio className="w-3.5 h-3.5 text-purple-900" />}

              <span>{chan.title}</span>

              {unread > 0 && !isActive && (
                <span className="w-4 h-4 rounded-full bg-manuscript-burgundy text-parchment-100 text-[9px] font-mono flex items-center justify-center font-bold">
                  {unread}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Whisper Recipient Selector (when in Whisper mode) */}
      {activeChannelType === 'whisper' && (
        <div className="bg-parchment-100 p-2 border-b border-parchment-300 flex items-center gap-2 text-xs font-serif">
          <Eye className="w-4 h-4 text-ink-light" />
          <span className="text-ink font-bold">Confidant:</span>
          <select
            value={selectedWhisperUid}
            onChange={(e) => setSelectedWhisperUid(e.target.value)}
            className="bg-parchment-50 border border-parchment-400 rounded px-2 py-1 text-xs font-serif text-ink flex-1"
          >
            <option value="">Select Citizen for Secret Missive...</option>
            {allRoomPlayers
              .filter((p) => p.uid !== player.uid)
              .map((p) => (
                <option key={p.uid} value={p.uid}>
                  {p.username}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Message Stream */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-parchment-50/60 font-body text-xs">
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-ink-light space-y-1">
            <MessageSquare className="w-8 h-8 opacity-25" />
            <p className="font-serif italic text-xs">
              The scroll is blank in this chamber. Break the silence with your quill.
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isSelf = msg.senderUid === player.uid;
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            if (msg.isSystem) {
              return (
                <div key={msg.id} className="p-2.5 my-1.5 rounded bg-parchment-200 border border-parchment-400 text-center font-serif text-[11px] text-manuscript-burgundy space-y-0.5">
                  <div className="flex items-center justify-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                    <Crown className="w-3 h-3" />
                    <span>High Ledger Decree</span>
                  </div>
                  <p className="text-ink">{msg.message}</p>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} space-y-0.5`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-ink-light px-1">
                  <span className="font-serif font-bold text-ink">
                    {msg.senderUsername}
                    {isSelf && ' (You)'}
                  </span>
                  {msg.senderRoleDisplay && (
                    <span className="px-1 py-0.2 rounded bg-amber-900/15 text-amber-900 text-[8px] font-serif font-bold">
                      {msg.senderRoleDisplay}
                    </span>
                  )}
                  {msg.isGhost && (
                    <span className="px-1 py-0.2 rounded bg-indigo-950/20 text-indigo-900 text-[8px] font-serif font-bold">
                      Ghost
                    </span>
                  )}
                  {msg.isDead && !msg.isGhost && (
                    <span className="px-1 py-0.2 rounded bg-red-950/20 text-red-900 text-[8px] font-serif font-bold">
                      Dead
                    </span>
                  )}
                  <span className="font-mono text-[9px] opacity-75">{timeStr}</span>
                </div>

                <div
                  className={`p-2.5 rounded-lg max-w-[85%] text-xs shadow-xs break-words ${
                    isSelf
                      ? 'bg-parchment-200 border border-parchment-400 text-ink rounded-tr-none'
                      : 'bg-parchment-100 border border-parchment-300 text-ink rounded-tl-none'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Dispatch Input Bar */}
      <div className="p-2.5 bg-parchment-200 border-t border-parchment-400 space-y-1">
        {sendError && (
          <div className="text-[10px] text-red-900 bg-red-950/15 border border-red-900/30 px-2 py-0.5 rounded font-serif">
            {sendError}
          </div>
        )}

        {!sendPerm.canSend ? (
          <div className="flex items-center justify-center gap-2 p-2 rounded bg-parchment-300/60 border border-parchment-400 text-ink-light text-xs font-serif italic text-center">
            <Lock className="w-3.5 h-3.5 text-manuscript-burgundy" />
            <span>{sendPerm.reason || 'Channel is restricted.'}</span>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={
                  activeChannelType === 'whisper' && !selectedWhisperUid
                    ? 'Select a confidant above to whisper...'
                    : `Inscribe dispatch to ${activeChannelType}...`
                }
                value={inputText}
                maxLength={500}
                disabled={activeChannelType === 'whisper' && !selectedWhisperUid}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full bg-parchment-50 border border-parchment-400 rounded-lg px-3 py-2 text-xs font-serif text-ink placeholder:italic placeholder:text-ink-light/60 focus:outline-hidden focus:border-manuscript-burgundy transition-colors shadow-inner"
              />
              <span className="absolute right-2.5 bottom-1 text-[9px] font-mono text-ink-light opacity-60">
                {inputText.length}/500
              </span>
            </div>

            <Button
              type="submit"
              variant="wax"
              size="sm"
              disabled={
                !inputText.trim() ||
                isSending ||
                (activeChannelType === 'whisper' && !selectedWhisperUid)
              }
              icon={<Send className="w-3.5 h-3.5" />}
              className="px-3"
            >
              Dispatch
            </Button>
          </form>
        )}
      </div>
    </ParchmentPanel>
  );
};
