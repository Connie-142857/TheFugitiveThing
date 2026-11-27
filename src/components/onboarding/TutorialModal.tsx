import React, { useState, useEffect } from 'react';
import { ManuscriptModal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useSettings } from '../../context/SettingsContext';
import {
  Compass,
  Users,
  Shield,
  Sun,
  Zap,
  Scale,
  Home,
  Skull,
  MapPin,
  Trophy,
  MessageSquare,
  CheckCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface TutorialChapter {
  id: string;
  title: string;
  badge: string;
  icon: React.ReactNode;
  summary: string;
  bullets: string[];
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

const TUTORIAL_CHAPTERS: TutorialChapter[] = [
  {
    id: 'objective',
    title: '1. The Game Objective',
    badge: 'Core Goal',
    icon: <Compass className="w-5 h-5 text-manuscript-burgundy" />,
    summary:
      'The Fugitive is a strategic social-deduction hunt set in a medieval village of 35 dwellings. Players are secretly divided into rival factions hunting one elusive quarry: The Fugitive.',
    bullets: [
      'Hunters must deduce who belongs to which faction, eliminate rival threats, and locate The Fugitive.',
      'The Fugitive must hide among the houses, outlast pursuers, and survive until the end.',
      'No secret match roles or hidden alignments are ever revealed in this guide.',
    ],
  },
  {
    id: 'teams',
    title: '2. The Factions (Teams)',
    badge: 'Allegiances',
    icon: <Users className="w-5 h-5 text-emerald-800" />,
    summary:
      'Every hunter belongs to one of four main factions—or operates as a Solo Infiltrator or The Fugitive.',
    bullets: [
      'Investigators: Gather intelligence, intercept rival whispers, interrogate suspects, and strike with precision.',
      'Annihilators: Wield explosives, arson, and heavy demolition to level houses and overwhelm The Fugitive.',
      'Communists: Coordinate through collective protection, engineering contraptions, and Fallen Ghost voices.',
      'Soldiers: Battle-hardened combatants with a 50% passive chance to survive a lethal blow.',
      'Solo Infiltrators: Play by unique personal victory rules (Cursed, Lucky, Parasite, Squire, Spy).',
    ],
  },
  {
    id: 'roles',
    title: '3. Secret Roles',
    badge: '38 Roles',
    icon: <Shield className="w-5 h-5 text-amber-800" />,
    summary:
      'Each player receives a private Role Briefing at the start of the match. Your role grants active abilities, passive traits, and strategic responsibilities.',
    bullets: [
      'Your role is strictly private and stored securely—never trust unverified claims in chat.',
      'Some roles specialize in defense (Peasant, Firefighter), others in intel (Detective, Verifier, Gossip), and others in lethal force (Sniper, Assassin, Arsonist).',
      'Solo roles such as Spy can infiltrate faction councils unless discovered and banished.',
    ],
  },
  {
    id: 'day_night',
    title: '4. Day & Night Cycles',
    badge: 'Phases',
    icon: <Sun className="w-5 h-5 text-amber-600" />,
    summary:
      'Matches alternate between Day and Night phases, either in Accelerated Cycles or Real-Time (08:00–18:00 Day, 18:00–08:00 Night).',
    bullets: [
      'Day Phase: Open Town Forum discussion, interrogations, inspections, and Fugitive daily decrees.',
      'Night Phase: Town Forum enters Curfew (silenced). Factions scheme in private councils and queue nocturnal abilities.',
      'At the end of each Night, queued actions resolve simultaneously in priority stages and condemned houses are demolished.',
    ],
  },
  {
    id: 'actions',
    title: '5. Actions & Priority',
    badge: '1 Per Round',
    icon: <Zap className="w-5 h-5 text-manuscript-burgundy" />,
    summary:
      'You may enact at most one ability per round. Once declared, your action UI locks for that round.',
    bullets: [
      'Instant Actions (e.g., Detective interrogation, tactical inquiries) deliver immediate results.',
      'Nocturnal Actions queue for twilight and resolve in strict order: Interrupts (Arrest) → Protections → Lethal Strikes → Status Effects → Intel.',
      'Because protections resolve before lethal strikes, a well-timed shield can save a target from a Sniper shot.',
    ],
    quiz: {
      question: 'Practice Check: If a Peasant shields an ally and a Sniper shoots them on the same night, what happens?',
      options: [
        'The Sniper shoots first and the ally dies.',
        'Protections resolve before lethal strikes, so the ally survives.',
        'Both the Peasant and the Sniper are eliminated.',
      ],
      correctIndex: 1,
      explanation: 'Stage 1 (Protections & Wards) always resolves before Stage 2 (Lethal Attacks).',
    },
  },
  {
    id: 'crimes',
    title: '6. Crimes & Penalties',
    badge: 'Law of the Realm',
    icon: <Scale className="w-5 h-5 text-red-900" />,
    summary:
      'Breaking municipal decrees—such as lying during a Detective interrogation or being arrested by Police—inflicts a Crime.',
    bullets: [
      '1st Crime: Recorded secretly on your ledger as a warning.',
      '2nd Crime: Immediate execution by the Tribunal!',
      'Idle Decay: If you carry a Crime and perform no active ability for a round (and have no passive abilities), your Crime clears. Prisoners are immune to Crime execution.',
    ],
    quiz: {
      question: 'Practice Check: What happens when a player (other than the Prisoner) accumulates their 2nd Crime?',
      options: [
        'Nothing until the end of the match.',
        'They are muted for 1 day.',
        'They suffer immediate execution.',
      ],
      correctIndex: 2,
      explanation: 'Two Crimes trigger immediate execution—unless you are the Prisoner, who is immune.',
    },
  },
  {
    id: 'houses',
    title: '7. Houses & Demolition',
    badge: '35 Dwellings',
    icon: <Home className="w-5 h-5 text-stone-800" />,
    summary:
      'The village consists of numbered dwellings (default 35). Hunters target houses to flush out or eliminate The Fugitive.',
    bullets: [
      'Every night, a configured number of unoccupied houses are condemned and demolished.',
      'Demolition and Annihilator abilities can never destroy The Fugitive’s active shelter or Spawnpoint by random decree.',
      'Destroyed dwellings cannot be entered or used for new Spawnpoints.',
    ],
  },
  {
    id: 'fugitive',
    title: '8. The Fugitive',
    badge: 'The Quarry',
    icon: <Skull className="w-5 h-5 text-manuscript-burgundy" />,
    summary:
      'The Fugitive hides inside a secret dwelling and cannot be targeted directly by most player-targeting abilities.',
    bullets: [
      'The Fugitive may enact 1 daily decree: relocate to a safe house, establish a Spawnpoint, investigate a pursuer, or strike a hunter.',
      'Most hunter abilities must target The Fugitive through their dwelling number rather than their player name.',
    ],
  },
  {
    id: 'spawnpoints',
    title: '9. Spawnpoints & 11-Clue',
    badge: 'Evasion',
    icon: <MapPin className="w-5 h-5 text-amber-700" />,
    summary:
      'The Fugitive can prepare a secret Spawnpoint dwelling as an emergency escape anchor.',
    bullets: [
      'If The Fugitive suffers a lethal hit while a Spawnpoint is active, they cheat death and teleport to the Spawnpoint!',
      'The Spawnpoint is consumed and placed on a 1-round cooldown.',
      'Upon teleporting, scent hounds broadcast an 11-house clue: 1 true new shelter + 10 decoy houses.',
    ],
  },
  {
    id: 'win_conditions',
    title: '10. Win Conditions',
    badge: 'Victory',
    icon: <Trophy className="w-5 h-5 text-manuscript-gold" />,
    summary:
      'Victory is decided when The Fugitive is slain or all regular hunters fall.',
    bullets: [
      'If all regular hunters die while The Fugitive lives: The Fugitive wins.',
      'If The Fugitive is slain: The surviving hunter faction with the greatest living headcount wins (ties result in a Draw).',
      'Solo Overrides: Lucky wins solo if alive at match end; Cursed wins by dying; Squire wins if their assigned Lord survives; Spy wins alongside a living Fugitive.',
    ],
  },
  {
    id: 'chat',
    title: '11. Chat Permissions',
    badge: 'Channels',
    icon: <MessageSquare className="w-5 h-5 text-indigo-900" />,
    summary:
      'Communication is strictly governed by phase, life status, and faction secrecy.',
    bullets: [
      'Town Forum (Global): Open to living players during Day; silenced during Night Curfew.',
      'Faction Council (Team): Private to faction members (plus infiltrating Spy; Prisoner is excluded from Communists).',
      'The Sepulchre (Dead Chat): Exclusively for the deceased and Ghosts—living players cannot read it.',
      'Communist Ghosts can still advise their team council, while Zombies are mute and cannot speak.',
    ],
    quiz: {
      question: 'Practice Check: Can a living player read messages in The Sepulchre (Dead Chat)?',
      options: [
        'Yes, during the Night phase.',
        'No, the living are strictly blocked from reading Dead Chat.',
        'Only if they are an Investigator.',
      ],
      correctIndex: 1,
      explanation: 'Dead Chat is strictly isolated so dead players cannot leak secret information to the living.',
    },
  },
];

export const TutorialModal: React.FC = () => {
  const { isTutorialOpen, closeTutorial, t, playSound } = useSettings();
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  const chapter = TUTORIAL_CHAPTERS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TUTORIAL_CHAPTERS.length - 1;

  useEffect(() => {
    if (!isTutorialOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && stepIndex < TUTORIAL_CHAPTERS.length - 1) {
        setStepIndex((i) => i + 1);
      } else if (e.key === 'ArrowLeft' && stepIndex > 0) {
        setStepIndex((i) => i - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isTutorialOpen, stepIndex]);

  const handleSelectQuiz = (chapterId: string, optionIdx: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [chapterId]: optionIdx }));
    const ch = TUTORIAL_CHAPTERS.find((c) => c.id === chapterId);
    if (ch?.quiz) {
      playSound(optionIdx === ch.quiz.correctIndex ? 'reward' : 'alert');
    }
  };

  return (
    <ManuscriptModal
      isOpen={isTutorialOpen}
      onClose={() => closeTutorial(false)}
      title={t.tutorial.title}
      subtitle={t.tutorial.subtitle}
      maxWidth="xl"
      footer={
        <div className="w-full flex items-center justify-between gap-3">
          <span className="text-xs font-mono text-ink-light">
            {t.tutorial.stepOf} {stepIndex + 1} / {TUTORIAL_CHAPTERS.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="parchment"
              size="sm"
              disabled={isFirst}
              icon={<ChevronLeft className="w-4 h-4" />}
              onClick={() => {
                playSound('click');
                setStepIndex((i) => Math.max(0, i - 1));
              }}
            >
              {t.tutorial.previous}
            </Button>
            {isLast ? (
              <Button
                variant="wax"
                size="sm"
                icon={<CheckCircle className="w-4 h-4" />}
                onClick={() => {
                  playSound('levelUp');
                  closeTutorial(true);
                }}
              >
                {t.tutorial.finish}
              </Button>
            ) : (
              <Button
                variant="wax"
                size="sm"
                icon={<ChevronRight className="w-4 h-4" />}
                onClick={() => {
                  playSound('click');
                  setStepIndex((i) => Math.min(TUTORIAL_CHAPTERS.length - 1, i + 1));
                }}
              >
                {t.tutorial.next}
              </Button>
            )}
          </div>
        </div>
      }
    >
      {/* Chapter Progress Bar & Quick Jump Pills */}
      <div className="space-y-2">
        <div
          className="w-full h-2 bg-parchment-300 rounded-full overflow-hidden border border-parchment-400"
          role="progressbar"
          aria-valuenow={stepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={TUTORIAL_CHAPTERS.length}
          aria-label="Tutorial progress"
        >
          <div
            className="h-full bg-manuscript-burgundy transition-all duration-300"
            style={{ width: `${Math.round(((stepIndex + 1) / TUTORIAL_CHAPTERS.length) * 100)}%` }}
          />
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Tutorial chapters">
          {TUTORIAL_CHAPTERS.map((ch, idx) => (
            <button
              key={ch.id}
              role="tab"
              aria-selected={idx === stepIndex}
              onClick={() => {
                playSound('click');
                setStepIndex(idx);
              }}
              className={`px-2 py-1 rounded text-[11px] font-serif transition-colors min-h-[32px] ${
                idx === stepIndex
                  ? 'bg-manuscript-burgundy text-parchment-50 font-bold'
                  : idx < stepIndex
                  ? 'bg-parchment-300 text-ink hover:bg-parchment-400'
                  : 'bg-parchment-200 text-ink-light hover:bg-parchment-300'
              }`}
            >
              {idx + 1}. {ch.badge}
            </button>
          ))}
        </div>
      </div>

      {/* Active Chapter Content */}
      <div className="p-4 rounded bg-parchment-50 border border-parchment-400 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            {chapter.icon}
            <h4 className="font-serif font-bold text-lg text-ink">{chapter.title}</h4>
          </div>
          <span className="px-2 py-0.5 rounded bg-parchment-200 border border-parchment-400 text-[10px] font-serif uppercase tracking-wider text-manuscript-burgundy font-bold">
            {chapter.badge}
          </span>
        </div>

        <p className="text-sm font-body text-ink leading-relaxed">{chapter.summary}</p>

        <ul className="space-y-1.5 text-xs sm:text-sm font-body text-ink-light list-disc pl-5">
          {chapter.bullets.map((b, i) => (
            <li key={i} className="leading-relaxed">
              {b}
            </li>
          ))}
        </ul>

        {/* Optional Interactive Knowledge Check */}
        {chapter.quiz && (
          <div className="mt-4 p-3 rounded bg-parchment-200/80 border border-parchment-400 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-manuscript-burgundy">
              <HelpCircle className="w-4 h-4" />
              <span>{chapter.quiz.question}</span>
            </div>
            <div className="space-y-1.5">
              {chapter.quiz.options.map((opt, idx) => {
                const chosen = selectedAnswers[chapter.id];
                const isSelected = chosen === idx;
                const isCorrect = idx === chapter.quiz!.correctIndex;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectQuiz(chapter.id, idx)}
                    className={`w-full text-left px-3 py-2 rounded border text-xs font-serif transition-all min-h-[40px] ${
                      isSelected
                        ? isCorrect
                          ? 'bg-emerald-900/15 border-emerald-700 text-emerald-950 font-bold'
                          : 'bg-red-900/15 border-red-700 text-red-950 font-bold'
                        : 'bg-parchment-50 border-parchment-400 text-ink hover:bg-parchment-100'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {selectedAnswers[chapter.id] !== undefined && (
              <p
                className={`text-xs font-body italic pt-1 ${
                  selectedAnswers[chapter.id] === chapter.quiz.correctIndex
                    ? 'text-emerald-900'
                    : 'text-red-900'
                }`}
              >
                {selectedAnswers[chapter.id] === chapter.quiz.correctIndex
                  ? `Correct! ${chapter.quiz.explanation}`
                  : `Not quite. ${chapter.quiz.explanation}`}
              </p>
            )}
          </div>
        )}
      </div>
    </ManuscriptModal>
  );
};
