import React, { useState, useEffect } from 'react';
import { ParchmentPanel } from '../ui/ParchmentPanel';
import { RoomDocument, SecretRoleBriefingData, GameEvent } from '../../types/game';
import { filterEventsForPlayer } from '../../services/gameEventManager';
import {
  Scroll,
  Eye,
  Skull,
  MapPin,
  FileText,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface KnownIntelligenceDossierProps {
  room: RoomDocument;
  userUid: string;
  secretBriefing: SecretRoleBriefingData | null;
  isHost: boolean;
}

export const KnownIntelligenceDossier: React.FC<KnownIntelligenceDossierProps> = ({
  room,
  userUid,
  secretBriefing,
  isHost,
}) => {
  const [filterCategory, setFilterCategory] = useState<'all' | 'classified' | 'demolitions' | 'casualties'>('all');
  const [personalNotes, setPersonalNotes] = useState<Record<string, string>>({});

  // Local storage key for confidential match dossier notes
  const notesStorageKey = `fugitive_notes_${room.id}_${userUid}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(notesStorageKey);
      if (saved) {
        setPersonalNotes(JSON.parse(saved));
      }
    } catch {
      // Ignore storage errors
    }
  }, [notesStorageKey]);

  const handleUpdateNote = (targetUid: string, text: string) => {
    const updated = { ...personalNotes, [targetUid]: text };
    setPersonalNotes(updated);
    try {
      localStorage.setItem(notesStorageKey, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  // Authoritatively filter visible chronicle events
  const rawEvents = (room as any).events || [];
  const visibleEvents: GameEvent[] = filterEventsForPlayer(
    rawEvents,
    userUid,
    secretBriefing?.team,
    isHost
  );

  // Group events
  const classifiedIntelEvents = visibleEvents.filter(
    (e) => !e.isPublic || e.category === 'intel' || (e.visibleToPlayerUid && e.visibleToPlayerUid === userUid)
  );
  const casualtyEvents = visibleEvents.filter((e) => e.type === 'player_killed' || e.category === 'combat');
  const demolitionEvents = visibleEvents.filter((e) => e.category === 'demolition');

  // Filtered view
  const displayEvents = visibleEvents.filter((e) => {
    if (filterCategory === 'classified') return classifiedIntelEvents.includes(e);
    if (filterCategory === 'casualties') return casualtyEvents.includes(e);
    if (filterCategory === 'demolitions') return demolitionEvents.includes(e);
    return true;
  });

  // Summarize destroyed dwellings
  const destroyedHouses = Object.values(room.houses || {}).filter((h) => h.isDestroyed);

  const roomPlayers = room.players || {};

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <ParchmentPanel variant="framed">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-serif uppercase tracking-widest text-manuscript-burgundy font-bold">
                Imperial Archives
              </span>
              <span className="text-[10px] font-mono text-ink-light">
                Chamber {room.roomCode}
              </span>
            </div>
            <h2 className="text-2xl font-serif font-black text-ink flex items-center gap-2">
              <Scroll className="w-6 h-6 text-manuscript-burgundy" />
              <span>Known Intelligence & Tactical Dossier</span>
            </h2>
            <p className="text-xs font-body text-ink-light">
              Compendium of verified inquiries, interrogations, sightings, and public proclamations inscribed during the hunt.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-parchment-200 border border-parchment-400 px-3 py-1.5 rounded">
            <Sparkles className="w-4 h-4 text-manuscript-gold" />
            <span className="text-xs font-serif font-bold text-ink">
              {visibleEvents.length} Recorded Decrees
            </span>
          </div>
        </div>
      </ParchmentPanel>

      {/* Secret Intel Special Callout (if player holds classified knowledge) */}
      {secretBriefing?.specialKnowledge && (
        <ParchmentPanel variant="bound" className="border-2 border-amber-900/60 bg-amber-50/50 space-y-2">
          <div className="flex items-center gap-2 text-manuscript-burgundy font-serif font-bold text-sm border-b border-parchment-400 pb-1.5">
            <Eye className="w-4 h-4" />
            <span>Classified Operative Dossier</span>
          </div>
          <p className="text-xs font-body text-ink leading-relaxed">
            {secretBriefing.specialKnowledge.notes}
          </p>
          {secretBriefing.specialKnowledge.initialHouseNumber && (
            <div className="inline-block bg-parchment-200 border border-amber-800/40 px-2.5 py-1 rounded text-xs font-mono font-bold text-amber-950">
              Assigned Hideout Location: Dwelling #{secretBriefing.specialKnowledge.initialHouseNumber}
            </div>
          )}
        </ParchmentPanel>
      )}

      {/* 2-Column Grid: Left is Chronicle Events, Right is Suspects & Intel Scratchpad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Filterable Chronicle Log */}
        <div className="lg:col-span-2 space-y-4">
          <ParchmentPanel variant="sheet" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-parchment-400 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-manuscript-burgundy" />
                <h3 className="font-serif font-bold text-base text-ink">
                  High Chronicle Log
                </h3>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-parchment-200 p-1 rounded border border-parchment-300 text-xs font-serif">
                <button
                  onClick={() => setFilterCategory('all')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    filterCategory === 'all'
                      ? 'bg-parchment-100 text-manuscript-burgundy font-bold shadow-xs'
                      : 'text-ink-light hover:text-ink'
                  }`}
                >
                  All ({visibleEvents.length})
                </button>
                <button
                  onClick={() => setFilterCategory('classified')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    filterCategory === 'classified'
                      ? 'bg-parchment-100 text-manuscript-burgundy font-bold shadow-xs'
                      : 'text-ink-light hover:text-ink'
                  }`}
                >
                  Classified ({classifiedIntelEvents.length})
                </button>
                <button
                  onClick={() => setFilterCategory('casualties')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    filterCategory === 'casualties'
                      ? 'bg-parchment-100 text-manuscript-burgundy font-bold shadow-xs'
                      : 'text-ink-light hover:text-ink'
                  }`}
                >
                  Casualties ({casualtyEvents.length})
                </button>
                <button
                  onClick={() => setFilterCategory('demolitions')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    filterCategory === 'demolitions'
                      ? 'bg-parchment-100 text-manuscript-burgundy font-bold shadow-xs'
                      : 'text-ink-light hover:text-ink'
                  }`}
                >
                  Demolitions ({destroyedHouses.length})
                </button>
              </div>
            </div>

            {/* Events List */}
            {displayEvents.length === 0 ? (
              <div className="p-8 text-center text-xs font-body text-ink-light italic">
                No recorded decrees match this filter. As the match progresses through twilight, events inscribe here.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {[...displayEvents].reverse().map((evt) => {
                  const isClassified = !evt.isPublic || evt.visibleToPlayerUid === userUid;
                  const isKill = evt.type === 'player_killed';
                  const isDemolition = evt.category === 'demolition';

                  let icon = <Clock className="w-3.5 h-3.5" />;

                  if (isKill) {
                    icon = <Skull className="w-3.5 h-3.5 text-red-800" />;
                  } else if (isClassified) {
                    icon = <Search className="w-3.5 h-3.5 text-purple-900" />;
                  } else if (isDemolition) {
                    icon = <MapPin className="w-3.5 h-3.5 text-amber-900" />;
                  }

                  return (
                    <div
                      key={evt.id}
                      className={`p-3 rounded border text-xs font-body transition-all ${
                        isClassified
                          ? 'bg-purple-50/70 border-purple-800/40 ring-1 ring-purple-800/20'
                          : isKill
                          ? 'bg-red-50/70 border-red-900/40'
                          : 'bg-parchment-100 border-parchment-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 font-serif font-bold text-ink">
                          {icon}
                          <span>{evt.title}</span>
                          {isClassified && (
                            <span className="text-[9px] uppercase px-1 rounded bg-purple-900 text-parchment-100 font-bold">
                              Classified Intel
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-ink-light shrink-0">
                          R{evt.round} • {evt.phase.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-ink leading-relaxed">{evt.message}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </ParchmentPanel>

          {/* Demolished Dwellings Summary Table */}
          <ParchmentPanel variant="bound" className="space-y-3">
            <div className="flex items-center justify-between border-b border-parchment-400 pb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-manuscript-forest" />
                <h4 className="font-serif font-bold text-sm text-ink">
                  Village Ruins Register ({destroyedHouses.length} Demolished)
                </h4>
              </div>
              <span className="text-[11px] font-body text-ink-light">
                {room.totalHouses || 35} Total Dwellings in Realm
              </span>
            </div>

            {destroyedHouses.length === 0 ? (
              <p className="text-xs font-body text-ink-light italic text-center py-2">
                All dwellings remain intact. Demolitions resolve nightly under the shroud of darkness.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {destroyedHouses.map((h) => (
                  <div
                    key={h.number}
                    className="px-2.5 py-1 rounded bg-red-950/15 border border-red-900/40 text-red-950 font-mono text-xs flex items-center gap-1.5"
                  >
                    <span className="font-bold line-through">#{h.number}</span>
                    <span className="text-[9px] uppercase font-serif text-red-800">
                      R{h.destroyedAtRound || 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ParchmentPanel>
        </div>

        {/* Right Column (1 col): Suspects & Confidential Note Quill */}
        <div className="space-y-4">
          <ParchmentPanel variant="bound" className="space-y-3">
            <div className="border-b border-parchment-400 pb-2">
              <h3 className="font-serif font-bold text-base text-ink flex items-center gap-2">
                <Search className="w-5 h-5 text-manuscript-burgundy" />
                <span>Suspects & Inquisitor Quill</span>
              </h3>
              <p className="text-[11px] font-body text-ink-light">
                Private deduction notes. Only you can view your quill scratchings.
              </p>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {Object.values(roomPlayers).map((player) => {
                const isDead =
                  (player as any).isAlive === false ||
                  (player as any).status === 'dead' ||
                  room.matchPlayers?.[player.uid]?.isAlive === false;
                const isSelf = player.uid === userUid;
                const note = personalNotes[player.uid] || '';

                return (
                  <div
                    key={player.uid}
                    className={`p-3 rounded border text-xs space-y-2 transition-colors ${
                      isDead
                        ? 'bg-red-950/10 border-red-900/30'
                        : isSelf
                        ? 'bg-amber-50/70 border-manuscript-gold'
                        : 'bg-parchment-100 border-parchment-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        {isDead ? (
                          <Skull className="w-3.5 h-3.5 text-red-800 shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                        )}
                        <span className={`font-serif font-bold truncate ${isDead ? 'line-through text-ink-light' : 'text-ink'}`}>
                          {player.username}
                        </span>
                        {isSelf && (
                          <span className="text-[9px] font-serif uppercase px-1 rounded bg-manuscript-charcoal text-parchment-100">
                            You
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[9px] font-serif uppercase font-bold px-1.5 py-0.2 rounded border ${
                          isDead
                            ? 'bg-red-950/20 text-red-900 border-red-800/40'
                            : 'bg-emerald-950/20 text-emerald-900 border-emerald-800/30'
                        }`}
                      >
                        {isDead ? 'Slain' : 'Living'}
                      </span>
                    </div>

                    {/* Private Note Quill Input */}
                    <div>
                      <input
                        type="text"
                        placeholder="Inscribe suspicions..."
                        value={note}
                        onChange={(e) => handleUpdateNote(player.uid, e.target.value)}
                        className="w-full bg-parchment-50 border border-parchment-300 rounded px-2 py-1 text-xs font-serif text-ink focus:outline-none focus:border-manuscript-burgundy placeholder:text-ink-light/50"
                        maxLength={80}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </ParchmentPanel>
        </div>
      </div>
    </div>
  );
};
