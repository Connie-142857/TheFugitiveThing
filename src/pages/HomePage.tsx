import React from 'react';
import { ParchmentPanel } from '../components/ui/ParchmentPanel';
import { Button } from '../components/ui/Button';
import { OrnamentalFlourish, ManuscriptDivider } from '../components/ui/Divider';
import { TEAMS } from '../types/rules';
import { PageId } from '../components/layout/Navbar';
import { useSettings } from '../context/SettingsContext';
import { Compass, BookOpen, KeyRound, Shield, Eye, Flame, Users, Skull, Clock } from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: PageId) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { t, openTutorial, playSound, preferences } = useSettings();

  return (
    <div className="space-y-6">
      {/* First-Time Onboarding Callout */}
      {!preferences.hasCompletedTutorial && (
        <ParchmentPanel variant="sheet" className="border-manuscript-burgundy/60 bg-parchment-100 flex flex-col sm:flex-row items-center justify-between gap-3 py-3">
          <div className="text-xs font-body text-ink text-center sm:text-left">
            <strong className="font-serif text-manuscript-burgundy">New to the Realm?</strong>{' '}
            Complete the 11-chapter interactive Initiate&apos;s Guide to master factions, day/night cycles, crimes, and Spawnpoints.
          </div>
          <Button
            variant="wax"
            size="sm"
            icon={<BookOpen className="w-4 h-4" />}
            onClick={() => {
              playSound('click');
              openTutorial();
            }}
          >
            {t.home.startTutorial}
          </Button>
        </ParchmentPanel>
      )}

      {/* Grand Declaration Banner */}
      <ParchmentPanel variant="framed" className="text-center py-8">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="inline-block px-3 py-1 bg-manuscript-burgundy/10 text-manuscript-burgundy border border-manuscript-burgundy/30 text-xs font-serif font-bold uppercase tracking-widest rounded">
            {t.home.proclamation}
          </div>

          <h2 className="text-3xl sm:text-4xl font-serif font-black text-ink uppercase tracking-wider">
            {t.home.title}
          </h2>

          <p className="text-base sm:text-lg font-body text-ink-light italic leading-relaxed max-w-2xl mx-auto">
            &ldquo;{t.home.subtitle}&rdquo;
          </p>

          <OrnamentalFlourish />

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="wax"
              size="lg"
              icon={<KeyRound className="w-5 h-5" />}
              onClick={() => onNavigate('play')}
            >
              {t.home.enterChamber}
            </Button>
            <Button
              variant="parchment"
              size="lg"
              icon={<BookOpen className="w-5 h-5" />}
              onClick={() => {
                playSound('click');
                openTutorial();
              }}
            >
              {t.home.startTutorial}
            </Button>
          </div>
        </div>
      </ParchmentPanel>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ParchmentPanel
          variant="bound"
          className="cursor-pointer hover:border-manuscript-burgundy transition-all"
        >
          <div className="flex items-center gap-2 text-manuscript-burgundy font-serif font-bold text-base mb-1">
            <Compass className="w-5 h-5" />
            Join a Chamber
          </div>
          <p className="text-xs font-body text-ink-light leading-relaxed mb-3">
            Enter a match with friends using a unique seal code. Experience authoritative day/night cycles and secret roles.
          </p>
          <Button variant="ink" size="sm" onClick={() => onNavigate('play')}>
            Find Chamber
          </Button>
        </ParchmentPanel>

        <ParchmentPanel
          variant="bound"
          className="cursor-pointer hover:border-manuscript-forest transition-all"
        >
          <div className="flex items-center gap-2 text-manuscript-forest font-serif font-bold text-base mb-1">
            <Shield className="w-5 h-5" />
            Personal Dossier
          </div>
          <p className="text-xs font-body text-ink-light leading-relaxed mb-3">
            Inspect your investigator record, track battle honors across each faction, and view your equipped antique wares.
          </p>
          <Button variant="parchment" size="sm" onClick={() => onNavigate('profile')}>
            Inspect Record
          </Button>
        </ParchmentPanel>

        <ParchmentPanel
          variant="bound"
          className="cursor-pointer hover:border-manuscript-gold transition-all"
        >
          <div className="flex items-center gap-2 text-manuscript-gold font-serif font-bold text-base mb-1">
            <Clock className="w-5 h-5" />
            Daily Fealty Ledger
          </div>
          <p className="text-xs font-body text-ink-light leading-relaxed mb-3">
            Report daily to claim your honorarium of silver and gold coins. Maintain consecutive streaks for sacred relics.
          </p>
          <Button variant="gold" size="sm" onClick={() => onNavigate('rewards')}>
            Open Ledger
          </Button>
        </ParchmentPanel>
      </div>

      <ManuscriptDivider label="The Factions of the Realm" />

      {/* Factions Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            team: TEAMS.investigators,
            icon: <Eye className="w-5 h-5 text-emerald-800" />,
            border: 'border-emerald-800/40',
            bg: 'bg-emerald-950/5',
          },
          {
            team: TEAMS.annihilators,
            icon: <Flame className="w-5 h-5 text-red-800" />,
            border: 'border-red-800/40',
            bg: 'bg-red-950/5',
          },
          {
            team: TEAMS.communists,
            icon: <Users className="w-5 h-5 text-amber-900" />,
            border: 'border-amber-900/40',
            bg: 'bg-amber-950/5',
          },
          {
            team: TEAMS.soldiers,
            icon: <Shield className="w-5 h-5 text-stone-800" />,
            border: 'border-stone-800/40',
            bg: 'bg-stone-900/5',
          },
        ].map(({ team, icon, border, bg }) => (
          <div key={team.id} className={`border ${border} ${bg} p-4 rounded shadow-sm space-y-2`}>
            <div className="flex items-center gap-2">
              {icon}
              <h4 className="font-serif font-bold text-base text-ink">{team.name}</h4>
            </div>
            <p className="text-xs font-body text-ink-light leading-normal line-clamp-3">
              {team.description}
            </p>
            <div className="pt-1 text-[11px] font-serif text-manuscript-burgundy font-semibold">
              Passive: {team.passiveName}
            </div>
          </div>
        ))}
      </div>

      {/* Quarry Spotlight */}
      <ParchmentPanel variant="scroll" className="text-center">
        <div className="flex items-center justify-center gap-2 text-manuscript-burgundy mb-1">
          <Skull className="w-5 h-5" />
          <h4 className="font-serif font-black text-lg uppercase tracking-wider text-ink">
            Beware The Fugitive
          </h4>
        </div>
        <p className="text-xs font-body text-ink-light max-w-xl mx-auto leading-relaxed">
          The Fugitive does not fight alone—their wits and the new <strong>Spawnpoint System</strong> allow them
          to cheat death. Upon taking a fatal strike, The Fugitive teleports to a designated safehouse, releasing
          an 11-house clue into the night: 1 actual haven, and 10 deceiving decoys.
        </p>
      </ParchmentPanel>
    </div>
  );
};
