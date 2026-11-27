import React, { useEffect, useState } from 'react';
import { ParchmentPanel } from '../components/ui/ParchmentPanel';
import { ManuscriptDivider } from '../components/ui/Divider';
import { useAuth } from '../context/AuthContext';
import { fetchPlayerMatchHistory } from '../services/progressionService';
import { MatchHistoryRecord } from '../types/player';
import { ROLES } from '../types/rules';
import { BarChart3, Trophy, Skull, Flame, Shield, Crosshair, Clock, Scroll } from 'lucide-react';

function formatDuration(ms: number): string {
  const totalSec = Math.floor((ms || 0) / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}m ${secs}s`;
}

export const StatisticsPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [matchHistory, setMatchHistory] = useState<MatchHistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!user) {
      setMatchHistory([]);
      return;
    }
    setLoadingHistory(true);
    fetchPlayerMatchHistory(user.uid, 30)
      .then(setMatchHistory)
      .catch(() => setMatchHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [user?.uid, profile?.stats?.totalMatches]);

  const stats = profile?.stats;
  const totalMatches = stats?.totalMatches || 0;
  const wins = stats?.wins || 0;
  const losses = stats?.losses || 0;
  const winRate = stats?.winRate || 0;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center border-b border-parchment-400 pb-3">
        <h2 className="text-2xl font-serif text-ink tracking-wide flex items-center justify-center gap-2">
          <BarChart3 className="w-6 h-6 text-manuscript-burgundy" />
          The Chronicle of Records & Match History
        </h2>
        <p className="text-xs font-body italic text-ink-light">
          "Every duel inscribed, every dwelling leveled, and every sacrifice weighed upon the scales of justice."
        </p>
      </div>

      {/* High-Level Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Matches', value: String(totalMatches), icon: <Trophy className="w-5 h-5 text-manuscript-gold" /> },
          { label: 'Victories', value: String(wins), icon: <Trophy className="w-5 h-5 text-manuscript-forest" /> },
          { label: 'Defeats', value: String(losses), icon: <Skull className="w-5 h-5 text-manuscript-burgundy" /> },
          { label: 'Win Rate', value: `${winRate}%`, icon: <Crosshair className="w-5 h-5 text-amber-800" /> },
        ].map((stat, i) => (
          <ParchmentPanel key={i} variant="sheet" className="text-center p-4">
            <div className="flex justify-center mb-1">{stat.icon}</div>
            <span className="text-xs font-serif text-ink-light uppercase tracking-wider block">
              {stat.label}
            </span>
            <span className="text-2xl font-serif font-black text-ink mt-0.5 block">{stat.value}</span>
          </ParchmentPanel>
        ))}
      </div>

      <ManuscriptDivider label="Faction Specific Victories" />

      {/* Factions Victory Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { faction: 'Investigators', wins: stats?.teamWins?.investigators || 0, color: 'border-emerald-800/40 text-emerald-900' },
          { faction: 'Annihilators', wins: stats?.teamWins?.annihilators || 0, color: 'border-red-800/40 text-red-900' },
          { faction: 'Communists', wins: stats?.teamWins?.communists || 0, color: 'border-amber-900/40 text-amber-900' },
          { faction: 'Soldiers', wins: stats?.teamWins?.soldiers || 0, color: 'border-stone-800/40 text-stone-900' },
          { faction: 'Solo Infiltrators', wins: stats?.soloWins || stats?.teamWins?.solo || 0, color: 'border-purple-800/40 text-purple-900' },
          { faction: 'The Fugitive', wins: stats?.fugitiveWins || 0, color: 'border-amber-700/50 text-amber-950 font-bold' },
        ].map((f, i) => {
          const rate = totalMatches > 0 ? `${Math.round((f.wins / totalMatches) * 100)}%` : '0%';
          return (
            <div key={i} className={`p-4 rounded border bg-parchment-100 ${f.color} shadow-xs`}>
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-serif font-bold text-sm">{f.faction}</h4>
                <span className="text-xs font-mono">{rate}</span>
              </div>
              <div className="text-xs font-serif text-ink-light">Victories: {f.wins}</div>
            </div>
          );
        })}
      </div>

      <ManuscriptDivider label="Tactical Feats & Field Records" />

      {/* Special Game Actions Counters */}
      <ParchmentPanel variant="bound" className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-parchment-200 rounded border border-parchment-300">
            <span className="text-xs font-serif text-ink-light block">Kills & Eliminations</span>
            <span className="text-xl font-serif font-bold text-red-900 mt-1 flex items-center justify-center gap-1">
              <Skull className="w-4 h-4" /> {stats?.kills || 0}
            </span>
          </div>

          <div className="p-3 bg-parchment-200 rounded border border-parchment-300">
            <span className="text-xs font-serif text-ink-light block">Abilities Enacted</span>
            <span className="text-xl font-serif font-bold text-ink mt-1 flex items-center justify-center gap-1">
              <Crosshair className="w-4 h-4" /> {stats?.successfulAbilities || 0}
            </span>
          </div>

          <div className="p-3 bg-parchment-200 rounded border border-parchment-300">
            <span className="text-xs font-serif text-ink-light block">Survival Rate</span>
            <span className="text-xl font-serif font-bold text-emerald-900 mt-1 flex items-center justify-center gap-1">
              <Shield className="w-4 h-4" /> {stats?.survivalRate || 0}%
            </span>
          </div>

          <div className="p-3 bg-parchment-200 rounded border border-parchment-300">
            <span className="text-xs font-serif text-ink-light block">Houses Demolished</span>
            <span className="text-xl font-serif font-bold text-amber-900 mt-1 flex items-center justify-center gap-1">
              <Flame className="w-4 h-4" /> {stats?.housesDemolished || 0}
            </span>
          </div>
        </div>
      </ParchmentPanel>

      <ManuscriptDivider label="Match History Ledger" />

      {/* Full Match History */}
      <ParchmentPanel variant="sheet" className="space-y-4">
        <div className="flex items-center justify-between border-b border-parchment-400 pb-2">
          <h3 className="font-serif font-bold text-lg text-ink flex items-center gap-2">
            <Scroll className="w-5 h-5 text-manuscript-burgundy" />
            Completed Chronicles ({matchHistory.length})
          </h3>
          <span className="text-[11px] font-serif text-ink-light">
            Total Playtime: {formatDuration(stats?.totalPlaytimeMs || 0)}
          </span>
        </div>

        {!user ? (
          <p className="text-xs font-body italic text-ink-light text-center py-6">
            Sign in to view your personal Match History ledger.
          </p>
        ) : loadingHistory ? (
          <p className="text-xs font-body italic text-ink-light text-center py-6">
            Unrolling match archives...
          </p>
        ) : matchHistory.length === 0 ? (
          <p className="text-xs font-body italic text-ink-light text-center py-6">
            No completed matches recorded yet. Finish a match in the Secret Chamber to inscribe its chronicle here.
          </p>
        ) : (
          <div className="space-y-3">
            {matchHistory.map((m) => (
              <div
                key={m.matchId}
                className="p-3.5 rounded bg-parchment-100 border border-parchment-300 space-y-1.5 text-xs font-serif"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        m.result === 'victory'
                          ? 'bg-emerald-900/15 text-emerald-950 border border-emerald-800/30'
                          : 'bg-red-900/15 text-red-950 border border-red-800/30'
                      }`}
                    >
                      {m.result}
                    </span>
                    <span className="font-bold text-sm text-ink">{m.roomName}</span>
                    <span className="font-mono text-[10px] text-ink-light">#{m.matchId}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-ink-light font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatDuration(m.durationMs)}
                    </span>
                    <span>•</span>
                    <span>{new Date(m.date).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink">
                  <div>
                    <span>
                      Team: <strong className="capitalize">{m.playerTeam}</strong>
                    </span>
                    <span className="mx-2">•</span>
                    <span>
                      Role: <strong>{ROLES[m.playerRole]?.name || m.playerRole}</strong>
                    </span>
                    <span className="mx-2">•</span>
                    <span>{m.survived ? 'Survived' : 'Fallen'}</span>
                    <span className="mx-2">•</span>
                    <span>Kills: {m.kills}</span>
                    <span className="mx-2">•</span>
                    <span>Abilities: {m.abilitiesUsed}</span>
                  </div>

                  <span className="font-mono font-bold text-amber-900 bg-amber-500/10 border border-amber-700/30 px-2 py-0.5 rounded">
                    +{m.xpEarned} XP
                  </span>
                </div>

                <p className="text-[11px] font-body italic text-ink-light">
                  Victory Condition: {m.victoryCondition}
                </p>
              </div>
            ))}
          </div>
        )}
      </ParchmentPanel>
    </div>
  );
};
