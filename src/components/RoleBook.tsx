import React, { useState } from 'react';
import { TEAMS, ROLES, PLAYER_COUNT_TABLE, TeamId } from '../types/rules';
import { Shield, Eye, Flame, Users, Crosshair, Skull, BookOpen, AlertTriangle } from 'lucide-react';

export const RoleBook: React.FC = () => {
  const [selectedTeam, setSelectedTeam] = useState<TeamId>('investigators');
  const [selectedPlayerCount, setSelectedPlayerCount] = useState<number>(16);

  const teamList: { id: TeamId; name: string; icon: React.ReactNode; color: string }[] = [
    { id: 'investigators', name: 'Investigators', icon: <Eye className="w-4 h-4" />, color: 'text-manuscript-forest' },
    { id: 'annihilators', name: 'Annihilators', icon: <Flame className="w-4 h-4" />, color: 'text-manuscript-burgundy' },
    { id: 'communists', name: 'Communists', icon: <Users className="w-4 h-4" />, color: 'text-red-700' },
    { id: 'soldiers', name: 'Soldiers', icon: <Shield className="w-4 h-4" />, color: 'text-amber-800' },
    { id: 'solo', name: 'Solo Roles', icon: <Crosshair className="w-4 h-4" />, color: 'text-stone-700' },
    { id: 'fugitive', name: 'The Fugitive', icon: <Skull className="w-4 h-4" />, color: 'text-amber-600' }
  ];

  const currentTeamInfo = TEAMS[selectedTeam];
  const rolesInTeam = Object.values(ROLES).filter(r => r.team === selectedTeam);
  const currentConfig = PLAYER_COUNT_TABLE.find(c => c.regularPlayers === selectedPlayerCount);

  return (
    <div className="space-y-6">
      {/* Chapter Title */}
      <div className="text-center border-b border-parchment-400 pb-3">
        <h2 className="text-2xl font-serif text-ink tracking-wide flex items-center justify-center gap-2">
          <BookOpen className="w-6 h-6 text-manuscript-burgundy" />
          The Compendium of Factions & Secret Roles
        </h2>
        <p className="text-sm font-body italic text-ink-light">
          "Let all who enter this chronicle examine their duties, their sacred passives, and the price of betrayal."
        </p>
      </div>

      {/* Team Tabs / Book Ribbons */}
      <div className="flex flex-wrap gap-2 justify-center border-b border-parchment-400 pb-2">
        {teamList.map(t => (
          <button
            key={t.id}
            onClick={() => setSelectedTeam(t.id)}
            className={`px-4 py-2 font-serif text-sm rounded-t border-t border-l border-r transition-all flex items-center gap-2 ${
              selectedTeam === t.id
                ? 'bg-parchment-100 border-parchment-500 text-ink shadow-sm -mb-[9px] font-bold z-10'
                : 'bg-parchment-300/60 border-parchment-400 text-ink-light hover:bg-parchment-200'
            }`}
          >
            <span className={t.color}>{t.icon}</span>
            {t.name}
          </button>
        ))}
      </div>

      {/* Team Doctrine / Passive Header */}
      <div className="manuscript-border p-5 bg-parchment-100 rounded">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <span className="text-xs uppercase tracking-widest text-manuscript-burgundy font-serif font-bold">
              Faction Doctrine
            </span>
            <h3 className="text-xl font-serif text-ink font-bold">{currentTeamInfo.name}</h3>
            <p className="text-sm text-ink-light mt-1 font-body leading-relaxed max-w-2xl">
              {currentTeamInfo.description}
            </p>
          </div>
          <div className="bg-parchment-200 border border-parchment-400 p-3 rounded max-w-sm">
            <div className="text-xs font-serif font-bold text-manuscript-gold uppercase tracking-wider">
              Team Passive: {currentTeamInfo.passiveName}
            </div>
            <p className="text-xs text-ink mt-1 font-body italic leading-normal">
              {currentTeamInfo.passiveDescription}
            </p>
          </div>
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rolesInTeam.map(role => (
          <div
            key={role.id}
            className="border border-parchment-400 bg-parchment-50 p-4 rounded shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-serif font-bold text-lg text-ink flex items-center gap-2">
                  {role.name}
                  {role.category === 'essential' && (
                    <span className="text-[10px] bg-amber-900/10 text-amber-900 border border-amber-900/30 px-1.5 py-0.5 rounded uppercase font-sans font-bold">
                      Essential
                    </span>
                  )}
                  {role.category === 'solo' && (
                    <span className="text-[10px] bg-purple-900/10 text-purple-900 border border-purple-900/30 px-1.5 py-0.5 rounded uppercase font-sans font-bold">
                      Infiltrator
                    </span>
                  )}
                </h4>
              </div>
              <span className="text-xs font-serif text-manuscript-burgundy font-semibold">
                {role.category.toUpperCase()}
              </span>
            </div>

            <p className="text-sm text-ink-light font-body leading-relaxed mb-3">
              {role.description}
            </p>

            {role.abilities.length > 0 && (
              <div className="border-t border-parchment-300 pt-2 space-y-1.5">
                <span className="text-[11px] font-serif font-bold tracking-wider text-manuscript-forest uppercase block">
                  Sanctioned Abilities:
                </span>
                {role.abilities.map(ab => (
                  <div key={ab.id} className="text-xs bg-parchment-200/70 p-2 rounded border border-parchment-300">
                    <div className="flex justify-between font-serif font-semibold text-ink">
                      <span>{ab.name}</span>
                      <span className="text-[10px] text-manuscript-burgundy uppercase px-1 rounded bg-parchment-100">
                        {ab.timing}
                        {ab.maxUses ? ` (${ab.maxUses}x)` : ''}
                      </span>
                    </div>
                    <div className="text-ink-light font-body mt-0.5">
                      {ab.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Player Count & House Scaling Table */}
      <div className="manuscript-border p-5 bg-parchment-100 rounded mt-8">
        <div className="border-b border-parchment-400 pb-2 mb-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-serif font-bold text-lg text-ink">
              Tactical Scaling: Player Count & House Grid
            </h3>
            <p className="text-xs text-ink-light font-body">
              Configure expected hunters (excluding The Fugitive) to view squad ratios, hidden solo infiltrators, and map dimensions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-serif font-bold text-ink">Inspect Player Count:</label>
            <select
              value={selectedPlayerCount}
              onChange={e => setSelectedPlayerCount(Number(e.target.value))}
              className="bg-parchment-50 border border-parchment-500 text-ink text-sm rounded px-2 py-1 font-serif"
            >
              {PLAYER_COUNT_TABLE.map(c => (
                <option key={c.regularPlayers} value={c.regularPlayers}>
                  {c.regularPlayers} Players (+ 1 Fugitive = {c.regularPlayers + 1} Total)
                </option>
              ))}
            </select>
          </div>
        </div>

        {currentConfig && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
            <div className="bg-parchment-200 p-2.5 rounded border border-parchment-300">
              <span className="text-[11px] font-serif text-ink-light block">Active Teams</span>
              <span className="text-xl font-serif font-bold text-manuscript-forest">{currentConfig.activeTeams}</span>
            </div>
            <div className="bg-parchment-200 p-2.5 rounded border border-parchment-300">
              <span className="text-[11px] font-serif text-ink-light block">Members / Team</span>
              <span className="text-xl font-serif font-bold text-manuscript-burgundy">{currentConfig.playersPerTeam}</span>
            </div>
            <div className="bg-parchment-200 p-2.5 rounded border border-parchment-300">
              <span className="text-[11px] font-serif text-ink-light block">Solo Infiltrators</span>
              <span className="text-xl font-serif font-bold text-purple-900">{currentConfig.soloCount}</span>
            </div>
            <div className="bg-parchment-200 p-2.5 rounded border border-parchment-300">
              <span className="text-[11px] font-serif text-ink-light block">Total Houses</span>
              <span className="text-xl font-serif font-bold text-amber-900">{currentConfig.totalHouses}</span>
            </div>
            <div className="bg-parchment-200 p-2.5 rounded border border-parchment-300 col-span-2 md:col-span-1">
              <span className="text-[11px] font-serif text-ink-light block">Demolished / Round</span>
              <span className="text-xl font-serif font-bold text-red-900">{currentConfig.housesDestroyedPerRound}</span>
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-parchment-200/80 rounded border border-parchment-300 text-xs text-ink flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-manuscript-burgundy flex-shrink-0 mt-0.5" />
          <span>
            <strong>Authoritative Rule Enforcement:</strong> In Automated Mode, all role selections, team compositions, and house counts adhere strictly to these ratios. In Human Host Mode, moderators may override numbers or manually alter settings.
          </span>
        </div>
      </div>
    </div>
  );
};
