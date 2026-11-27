import React, { useState } from 'react';
import { SecretRoleBriefingData } from '../../types/game';
import { TEAMS } from '../../types/rules';
import { ParchmentPanel } from '../ui/ParchmentPanel';
import { Button } from '../ui/Button';
import { TeamBadge } from '../ui/Badges';
import {
  Shield,
  Eye,
  EyeOff,
  Flame,
  Users,
  Crosshair,
  Skull,
  Scroll,
  KeyRound,
  AlertTriangle,
  Award,
} from 'lucide-react';

interface SecretRoleBriefingProps {
  briefing: SecretRoleBriefingData;
}

export const SecretRoleBriefing: React.FC<SecretRoleBriefingProps> = ({ briefing }) => {
  const [isRevealed, setIsRevealed] = useState(false);

  const coverTeamInfo = TEAMS[briefing.publicCoverTeam];

  const getTeamIcon = (teamId: string) => {
    switch (teamId) {
      case 'investigators':
        return <Eye className="w-5 h-5 text-emerald-800" />;
      case 'annihilators':
        return <Flame className="w-5 h-5 text-red-800" />;
      case 'communists':
        return <Users className="w-5 h-5 text-amber-900" />;
      case 'soldiers':
        return <Shield className="w-5 h-5 text-stone-800" />;
      case 'solo':
        return <Crosshair className="w-5 h-5 text-purple-900" />;
      case 'fugitive':
        return <Skull className="w-5 h-5 text-amber-700" />;
      default:
        return <Scroll className="w-5 h-5 text-ink" />;
    }
  };

  if (!isRevealed) {
    return (
      <ParchmentPanel variant="scroll" className="text-center py-8 space-y-4">
        <div className="w-16 h-16 rounded-full bg-manuscript-wax text-parchment-100 flex items-center justify-center mx-auto shadow-wax-seal border-2 border-red-950">
          <KeyRound className="w-8 h-8" />
        </div>

        <div>
          <span className="text-xs font-serif uppercase tracking-widest text-manuscript-burgundy font-bold">
            Confidential Decree • Sealed By The Tribunal
          </span>
          <h3 className="text-xl sm:text-2xl font-serif font-black text-ink mt-1">
            Secret Role Assignment
          </h3>
          <p className="text-xs font-body text-ink-light max-w-md mx-auto mt-1">
            Your identity, faction fealty, and nocturnal powers are strictly confidential.
            Ensure no nearby eyes are watching before unsealing.
          </p>
        </div>

        <div className="pt-2">
          <Button
            variant="wax"
            size="lg"
            icon={<Eye className="w-5 h-5" />}
            onClick={() => setIsRevealed(true)}
          >
            Break Seal & Inspect Role
          </Button>
        </div>
      </ParchmentPanel>
    );
  }

  return (
    <ParchmentPanel variant="bound" className="space-y-5 relative">
      {/* Top Header & Conceal Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-parchment-400 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-serif uppercase tracking-widest text-manuscript-burgundy font-bold">
              Your Secret Identity
            </span>
            {briefing.category === 'essential' && (
              <span className="text-[9px] bg-amber-900/15 text-amber-900 border border-amber-800/40 px-1.5 py-0.2 rounded uppercase font-serif font-bold">
                Essential Faction Leader
              </span>
            )}
            {briefing.category === 'solo' && (
              <span className="text-[9px] bg-purple-950/20 text-purple-950 border border-purple-800/40 px-1.5 py-0.2 rounded uppercase font-serif font-bold">
                Covert Infiltrator
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-ink mt-0.5 flex items-center gap-2">
            {getTeamIcon(briefing.team)}
            {briefing.roleName}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="parchment"
            size="sm"
            icon={<EyeOff className="w-4 h-4" />}
            onClick={() => setIsRevealed(false)}
            title="Conceal decree from peering eyes"
          >
            Conceal Decree
          </Button>
        </div>
      </div>

      {/* Faction Alignment & Public Facade (for Solos) */}
      <div className="bg-parchment-100 p-4 rounded border border-parchment-300 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-serif font-bold text-ink">True Fealty:</span>
            <TeamBadge team={briefing.team} />
          </div>

          {briefing.team === 'solo' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-serif font-bold text-ink">Public Cover:</span>
              <TeamBadge team={briefing.publicCoverTeam} />
            </div>
          )}
        </div>

        {briefing.team === 'solo' && (
          <div className="p-2.5 bg-purple-950/10 rounded border border-purple-800/30 text-xs font-body text-purple-950 space-y-0.5">
            <strong>Infiltration Cover:</strong> The realm and your teammates believe you are an honorable member of the <strong>{coverTeamInfo?.name}</strong>. You possess access to their chat and operations, but your sacred triumph is solely your own!
          </div>
        )}

        {/* Faction Doctrine Passive */}
        <div className="pt-1 text-xs font-body text-ink-light">
          <span className="font-serif font-bold text-ink">Faction Passive ({briefing.teamPassive.name}): </span>
          {briefing.teamPassive.description}
        </div>
      </div>

      {/* Role Duties Description */}
      <div className="space-y-1">
        <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-manuscript-burgundy">
          Role Doctrine
        </h4>
        <p className="text-sm font-body text-ink leading-relaxed">
          {briefing.roleDescription}
        </p>
      </div>

      {/* Sanctioned Role Abilities */}
      {briefing.abilities.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-serif font-bold uppercase tracking-wider text-manuscript-forest flex items-center gap-1.5">
            <Award className="w-4 h-4" />
            Sanctioned Role Abilities
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {briefing.abilities.map((ability) => (
              <div
                key={ability.id}
                className="bg-parchment-100 p-3 rounded border border-parchment-400 space-y-1 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-sm text-ink">{ability.name}</span>
                  <span className="text-[10px] font-serif uppercase px-1.5 py-0.5 rounded bg-parchment-200 border border-parchment-300 font-semibold text-manuscript-burgundy">
                    {ability.timing}
                    {ability.maxUses ? ` (${ability.maxUses}x)` : ''}
                  </span>
                </div>
                <p className="text-xs font-body text-ink-light leading-relaxed">
                  {ability.description}
                </p>
                {ability.causesCrime && (
                  <div className="text-[10px] font-serif text-red-900 font-bold flex items-center gap-1 pt-1">
                    <AlertTriangle className="w-3 h-3 text-red-700" />
                    Warning: Utilizing this action incurs a Crime!
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Special Knowledge Dossier */}
      {briefing.specialKnowledge && (
        <div className="bg-amber-100/70 p-4 rounded border-2 border-manuscript-gold text-xs font-body space-y-1.5 shadow-xs">
          <div className="font-serif font-bold text-sm text-ink flex items-center gap-1.5 text-manuscript-burgundy">
            <KeyRound className="w-4 h-4" />
            Special Intelligence Dossier
          </div>
          <p className="text-ink leading-relaxed">{briefing.specialKnowledge.notes}</p>
          {briefing.specialKnowledge.initialHouseNumber && (
            <div className="font-serif font-bold text-amber-950 pt-1">
              Current Hideout Location: House #{briefing.specialKnowledge.initialHouseNumber}
            </div>
          )}
        </div>
      )}

      {/* Sacred Win Condition */}
      <div className="bg-parchment-200 p-3.5 rounded border border-parchment-400 text-xs font-body space-y-1">
        <span className="font-serif font-bold text-xs uppercase tracking-wider text-manuscript-burgundy block">
          Sacred Triumph Mandate (Win Condition)
        </span>
        <p className="text-ink font-serif italic text-sm">{briefing.winCondition}</p>
      </div>
    </ParchmentPanel>
  );
};
