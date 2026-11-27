import React from 'react';
import { TEAMS, TeamId } from '../../types/rules';
import { Skull, Flame, ShieldAlert, Sparkles } from 'lucide-react';

interface TeamBadgeProps {
  team: TeamId;
  size?: 'sm' | 'md';
}

export const TeamBadge: React.FC<TeamBadgeProps> = ({ team, size = 'md' }) => {
  const info = TEAMS[team];

  const colorStyles: Record<TeamId, string> = {
    investigators: 'bg-emerald-950/20 text-emerald-950 border-emerald-800/40',
    annihilators: 'bg-red-950/20 text-red-950 border-red-800/40',
    communists: 'bg-amber-950/20 text-amber-950 border-amber-800/40',
    soldiers: 'bg-stone-900/20 text-stone-900 border-stone-800/40',
    solo: 'bg-purple-950/20 text-purple-950 border-purple-800/40',
    fugitive: 'bg-amber-800/20 text-amber-900 border-amber-700/50',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-serif font-bold uppercase rounded border tracking-wider ${
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
      } ${colorStyles[team] || 'bg-parchment-200 text-ink border-parchment-400'}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {info ? info.name : team}
    </span>
  );
};

interface StatusBadgeProps {
  status: 'alive' | 'dead' | 'zombie' | 'ghost' | 'poisoned' | 'burning' | 'immortal';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const configs = {
    alive: { label: 'Living', bg: 'bg-emerald-900/15 text-emerald-900 border-emerald-700/30' },
    dead: { label: 'Deceased', bg: 'bg-stone-800/20 text-stone-800 border-stone-700/40' },
    zombie: { label: 'Zombie', bg: 'bg-lime-950/20 text-lime-950 border-lime-800/40' },
    ghost: { label: 'Ghost', bg: 'bg-cyan-950/20 text-cyan-950 border-cyan-800/40' },
    poisoned: { label: 'Poisoned', bg: 'bg-purple-900/20 text-purple-900 border-purple-700/40' },
    burning: { label: 'In Flames', bg: 'bg-red-900/20 text-red-900 border-red-700/40' },
    immortal: { label: 'Invulnerable', bg: 'bg-amber-800/20 text-amber-900 border-amber-600/50' },
  };

  const current = configs[status] || configs.alive;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-serif uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${current.bg}`}
    >
      {status === 'dead' && <Skull className="w-3 h-3" />}
      {status === 'burning' && <Flame className="w-3 h-3" />}
      {status === 'immortal' && <Sparkles className="w-3 h-3" />}
      {current.label}
    </span>
  );
};

interface CrimeCounterProps {
  crimes: number;
}

export const CrimeCounter: React.FC<CrimeCounterProps> = ({ crimes }) => {
  if (crimes === 0) {
    return (
      <span className="text-[10px] font-serif text-ink-light px-2 py-0.5 rounded bg-parchment-200 border border-parchment-300">
        Clean Record
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border font-serif text-xs font-bold ${
        crimes >= 2
          ? 'bg-red-900 text-white border-red-950 shadow-sm animate-pulse'
          : 'bg-red-950/20 text-red-900 border-red-700/40'
      }`}
      title={crimes >= 2 ? 'Lethal penalty threshold reached!' : 'Has 1 Crime strike'}
    >
      <ShieldAlert className="w-3.5 h-3.5" />
      <span>{crimes} {crimes === 1 ? 'Crime' : 'Crimes'}</span>
    </div>
  );
};
