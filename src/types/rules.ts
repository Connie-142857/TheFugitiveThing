// The Fugitive - Official Game Rule Definitions & Constants
// Based on the authoritative rulebook

export type TeamId = 'investigators' | 'annihilators' | 'communists' | 'soldiers' | 'solo' | 'fugitive';

export interface TeamDefinition {
  id: TeamId;
  name: string;
  description: string;
  passiveName: string;
  passiveDescription: string;
  color: string;
  badge: string;
}

export const TEAMS: Record<TeamId, TeamDefinition> = {
  investigators: {
    id: 'investigators',
    name: 'Investigators',
    description: 'Seekers of truth and justice. Rely on strategic intelligence, interrogations, and clues to locate The Fugitive.',
    passiveName: 'Intercepted Dispatch',
    passiveDescription: 'At the start of each day, one message sent in each rival team chat group is intercepted and delivered to the Investigators.',
    color: '#1e382b', // Dark Forest Green
    badge: 'Eye of Vigilance'
  },
  annihilators: {
    id: 'annihilators',
    name: 'Annihilators',
    description: 'Agents of devastation and unbridled chaos. Willing to burn down houses and gamble lives to eradicate The Fugitive.',
    passiveName: 'Nightly Demolition',
    passiveDescription: 'At the onset of night, choose a house number. If no Annihilator dies during the night and The Fugitive is there, The Fugitive dies. If The Fugitive is not there, the house is demolished.',
    color: '#58181f', // Burgundy Red
    badge: 'Blazing Torch'
  },
  communists: {
    id: 'communists',
    name: 'Communists',
    description: 'Collective union of equals. Individual members must cooperate and share weapons, contraptions, and ghostly resolve.',
    passiveName: 'Proletariat Spirits',
    passiveDescription: 'At dawn, if a teammate perished during the previous night, they rise as a Ghost. Ghosts retain ability usage but do not count toward living headcounts. If all living members become ghosts, the team is defeated.',
    color: '#8b1e1e', // Crimson Red
    badge: 'Hammer & Quill'
  },
  soldiers: {
    id: 'soldiers',
    name: 'Soldiers',
    description: 'Disciplined lone wolves armed with lethal artillery and tactical commands, relying on military precision.',
    passiveName: 'Combat Fortitude',
    passiveDescription: 'The first time an attempt is made on a Soldier\'s life, they have a 50% chance of surviving the lethal blow.',
    color: '#715734', // Antique Bronze/Khaki
    badge: 'Crossed Sabres'
  },
  solo: {
    id: 'solo',
    name: 'Solo Infiltrators',
    description: 'Independent operatives covertly embedded into existing teams, each carrying their own secret win condition.',
    passiveName: 'Deep Infiltration',
    passiveDescription: 'The total number of Solo operatives is announced at match start, but their names, teams, and identities remain shrouded.',
    color: '#3d2b1f', // Deep Sepia
    badge: 'Dagger & Mask'
  },
  fugitive: {
    id: 'fugitive',
    name: 'The Fugitive',
    description: 'The elusive solitary target pursued by all teams. Wins if all pursuing players are eliminated.',
    passiveName: 'Spawnpoint Mastery',
    passiveDescription: 'Can establish a hidden Spawnpoint in any valid house. If attacked while an active Spawnpoint exists, teleports instantly to safety, generating an 11-house clue (1 actual location + 10 decoy houses).',
    color: '#c29b38', // Antique Gold
    badge: 'Fugitive Seal'
  }
};

export type RoleCategory = 'essential' | 'support' | 'solo' | 'target';
export type AbilityTiming = 'day' | 'night' | 'passive' | 'unique';

export interface AbilityDefinition {
  id: string;
  name: string;
  timing: AbilityTiming;
  description: string;
  maxUses?: number; // undefined means unlimited/cooldown based
  causesCrime?: boolean;
}

export interface RoleDefinition {
  id: string;
  name: string;
  team: TeamId;
  category: RoleCategory;
  description: string;
  abilities: AbilityDefinition[];
  cannotCommitCrimes?: boolean;
  hasPassiveProtection?: boolean;
}

// Complete Catalogue of Roles translated strictly according to rulebook
export const ROLES: Record<string, RoleDefinition> = {
  // === INVESTIGATORS ===
  detective: {
    id: 'detective',
    name: 'Detective',
    team: 'investigators',
    category: 'essential',
    description: 'During the day, interrogate a player with up to 3 yes/no questions. The subject is not forced to tell the truth, but lying marks them as having committed a crime. If the subject lies having already committed a crime, the Detective executes them.',
    abilities: [
      {
        id: 'interrogate',
        name: 'Interrogate',
        timing: 'day',
        description: 'Ask up to 3 yes/no questions to a suspect. Lies incur a Crime status; lying with a prior crime results in execution.'
      }
    ]
  },
  sniper: {
    id: 'sniper',
    name: 'Sniper',
    team: 'investigators',
    category: 'essential',
    description: 'During the night, equipped with 3 bullets. Can shoot up to 3 distinct houses; if The Fugitive is present, they die. Alternatively, can shoot a player to kill them, which counts as committing a crime. If the Sniper already had a crime, the Sniper dies of unspecified causes.',
    abilities: [
      {
        id: 'sniper_barrage',
        name: 'House Barrage',
        timing: 'night',
        description: 'Shoot up to 3 houses. Kills The Fugitive if inside.'
      },
      {
        id: 'sniper_assassinate',
        name: 'Target Player',
        timing: 'night',
        description: 'Shoot a player to eliminate them. Incurs a Crime. If already a criminal, the Sniper dies mysteriously.',
        causesCrime: true
      }
    ]
  },
  verifier: {
    id: 'verifier',
    name: 'Verifier',
    team: 'investigators',
    category: 'support',
    description: 'During the night, ask the Host or System one yes/no question. The answer provided is guaranteed to be absolute truth.',
    abilities: [
      {
        id: 'divine_inquiry',
        name: 'Authoritative Inquiry',
        timing: 'night',
        description: 'Submit a yes/no query to the authoritative system/host and receive an unfalsified truth.'
      }
    ]
  },
  police_officer: {
    id: 'police_officer',
    name: 'Police Officer',
    team: 'investigators',
    category: 'support',
    description: 'During the night, arrest a player from a rival team. That player cannot use abilities for the remainder of the night and commits a crime. If that player previously committed a crime, they are executed by the Police Officer.',
    abilities: [
      {
        id: 'arrest',
        name: 'Arrest & Detain',
        timing: 'night',
        description: 'Block target ability usage, inflict Crime. If target was already a criminal, execute them.'
      }
    ]
  },
  watchman: {
    id: 'watchman',
    name: 'Watchman',
    team: 'investigators',
    category: 'support',
    description: 'During the night, stand on high guard. If anyone attempts to kill you, they die before striking. If The Fugitive attempts to kill you, The Fugitive\'s location is revealed within a 7-house range (±3 houses).',
    hasPassiveProtection: true,
    abilities: [
      {
        id: 'counter_guard',
        name: 'Vigilant Retaliation',
        timing: 'passive',
        description: 'Pre-emptively kill assassins targeting you; reveal The Fugitive within ±3 houses if targeted by them.'
      }
    ]
  },
  gossip: {
    id: 'gossip',
    name: 'Gossip',
    team: 'investigators',
    category: 'support',
    description: 'At the start of each day, receive whispered rumors about the previous night (who died, approximate hour, unique abilities activated, and who committed a crime). Whispers may occasionally contain distorted details or false reports.',
    abilities: [
      {
        id: 'hear_rumors',
        name: 'Town Whispers',
        timing: 'day',
        description: 'Receive morning intelligence dossier on nighttime deaths, unique ability usages, and crimes.'
      }
    ]
  },
  assassin: {
    id: 'assassin',
    name: 'Assassin',
    team: 'investigators',
    category: 'support',
    description: 'Each night, name up to 3 players and their exact roles. If all guesses are completely correct, all named targets die. If even one guess is incorrect, none die.',
    abilities: [
      {
        id: 'calculated_strike',
        name: 'Precision Contract',
        timing: 'night',
        description: 'Name up to 3 players and roles. If 100% correct, eliminates all targets simultaneously.'
      }
    ]
  },
  scientist: {
    id: 'scientist',
    name: 'Scientist',
    team: 'investigators',
    category: 'support',
    description: 'Once per match, brew an alchemical elixir combining 2 ingredients and administer it to a player at nightfall: Lotus Flower (tracks actions), Dandelion (death ward), Poison (lethal illness), Mind-Devouring Powder (incurs crime/steals ability).',
    abilities: [
      {
        id: 'brew_concoction',
        name: 'Alchemical Brew',
        timing: 'unique',
        maxUses: 1,
        description: 'Combine two reagents (Lotus, Dandelion, Poison, Mind Powder) and dose a target player.'
      }
    ]
  },

  // === ANNIHILATORS ===
  detonator: {
    id: 'detonator',
    name: 'Detonator',
    team: 'annihilators',
    category: 'essential',
    description: 'During the day, plant an explosive charge on a house or player. If you perish during the subsequent night, all planted charges detonate, obliterating all marked houses and players.',
    abilities: [
      {
        id: 'plant_bomb',
        name: 'Plant Demolition Charge',
        timing: 'day',
        description: 'Attach a hidden explosive to a house or player.'
      }
    ]
  },
  arsonist: {
    id: 'arsonist',
    name: 'Arsonist',
    team: 'annihilators',
    category: 'essential',
    description: 'During the night, engulf a player in flames. The ignited player gains an extra ability use that night but burns to death at the following dawn unless extinguished. Passive roles are unaffected.',
    abilities: [
      {
        id: 'ignite',
        name: 'Ignite Target',
        timing: 'night',
        description: 'Grant target +1 ability usage this night; target perishes at next sunrise if unextinguished.'
      }
    ]
  },
  firefighter: {
    id: 'firefighter',
    name: 'Firefighter',
    team: 'annihilators',
    category: 'support',
    description: 'At night, douse an ignited player, extinguishing flames and preventing dawn death (if they already spent their bonus action, they commit a crime). During the day, axe a player to death—publicly broadcasted immediately, committing a crime; if already a criminal, dies.',
    abilities: [
      {
        id: 'extinguish',
        name: 'Extinguish Flames',
        timing: 'night',
        description: 'Save burning player from dawn death; incurs crime if bonus action was already consumed.'
      },
      {
        id: 'axe_execution',
        name: 'Axe Execution',
        timing: 'day',
        causesCrime: true,
        description: 'Instantly execute a player in broad daylight. Broadcasted publicly. Incurs crime; criminal dies.'
      }
    ]
  },
  daredevil: {
    id: 'daredevil',
    name: 'Daredevil',
    team: 'annihilators',
    category: 'support',
    description: 'Upon suffering a lethal blow, instead gains an adrenaline frenzy granting 1 additional day of life. During this final day, can attempt to slaughter unlimited targets; each strike carries a risk of killing a teammate.',
    hasPassiveProtection: true,
    abilities: [
      {
        id: 'adrenaline_rampage',
        name: 'Adrenaline Rampage',
        timing: 'day',
        description: 'Kill as many players as desired; each attempt risks collateral death of a teammate.'
      }
    ]
  },
  president: {
    id: 'president',
    name: 'President',
    team: 'annihilators',
    category: 'support',
    description: 'Once per match, launch a devastating nuclear strike across a cluster of 7 houses. If The Fugitive is inside, they are eliminated and all 7 houses are leveled. The President perishes upon launch.',
    abilities: [
      {
        id: 'nuclear_strike',
        name: 'Tactical Nuke',
        timing: 'unique',
        maxUses: 1,
        description: 'Obliterate a sector of 7 houses. Kills The Fugitive if present. Self-sacrificial.'
      }
    ]
  },
  necromancer: {
    id: 'necromancer',
    name: 'Necromancer',
    team: 'annihilators',
    category: 'support',
    description: 'During the night, if a teammate has fallen, resurrect them as an obedient Zombie. Zombies cannot perform actions, but count as living members for team preservation.',
    abilities: [
      {
        id: 'raise_zombie',
        name: 'Reanimate Fallen',
        timing: 'night',
        description: 'Raise deceased teammate as a passive Zombie that counts toward living headcount.'
      }
    ]
  },
  mutagenic_doctor: {
    id: 'mutagenic_doctor',
    name: 'Mutagenic Doctor',
    team: 'annihilators',
    category: 'support',
    description: 'Once per match at night, mutate a zombie or deceased player into another Mutagenic Doctor. If converted from a zombie, they gain a one-night assassination action.',
    abilities: [
      {
        id: 'mutagenic_transfusion',
        name: 'Mutagenic Transfusion',
        timing: 'unique',
        maxUses: 1,
        description: 'Transform zombie or corpse into a new Mutagenic Doctor with immediate kill potential.'
      }
    ]
  },
  lunamancer: {
    id: 'lunamancer',
    name: 'Lunamancer',
    team: 'annihilators',
    category: 'support',
    description: 'During the day, invoke eclipse to immediately plunge the world into night. The team becomes immortal until natural night occurs. Cooldown of 1 full night before re-use.',
    abilities: [
      {
        id: 'eclipse',
        name: 'Lunar Eclipse',
        timing: 'day',
        description: 'Force immediate night; grants team invulnerability until natural night cycle.'
      }
    ]
  },

  // === COMMUNISTS ===
  worker: {
    id: 'worker',
    name: 'Worker',
    team: 'communists',
    category: 'essential',
    description: 'During the day, forge a weapon and bestow it upon a comrade. The recipient gains the ability to shoot a player or house during the night until morning. Killing a player incurs a crime; criminals die.',
    abilities: [
      {
        id: 'forge_weapon',
        name: 'Distribute Arms',
        timing: 'day',
        description: 'Arm a comrade with a firearm for the night. Incurs crime upon player kill.'
      }
    ]
  },
  peasant: {
    id: 'peasant',
    name: 'Peasant',
    team: 'communists',
    category: 'essential',
    description: 'Each night, nourish a comrade with communal bread. The fed player cleanses all status ailments and becomes immortal throughout the rest of the night and the following day.',
    abilities: [
      {
        id: 'nourish',
        name: 'Communal Bread',
        timing: 'night',
        description: 'Cleanse all debuffs from comrade; confers complete immortality through next day.'
      }
    ]
  },
  time_traveler: {
    id: 'time_traveler',
    name: 'Time Traveler',
    team: 'communists',
    category: 'support',
    description: 'Once per match during the day, revert the game state to the dawn of that current day. Recharges all abilities and lets The Fugitive re-select their house. Does NOT restore destroyed houses, cleanse status effects, or revive the dead.',
    abilities: [
      {
        id: 'temporal_rewind',
        name: 'Temporal Rewind',
        timing: 'unique',
        maxUses: 1,
        description: 'Rewind clock to current dawn, replenishing daytime ability charges.'
      }
    ]
  },
  engineer: {
    id: 'engineer',
    name: 'Engineer',
    team: 'communists',
    category: 'support',
    description: 'Once per match, construct 1 of 3 mechanical inventions (Defibrillator: revives player while intact; Turret: shoots house day & night; Disruptor: silences The Fugitive). Assign a secret code 1-5; The Fugitive guesses nightly to dismantle it.',
    abilities: [
      {
        id: 'build_contraption',
        name: 'Construct Machine',
        timing: 'unique',
        maxUses: 1,
        description: 'Build Defibrillator (revive), Turret (bombardment), or Disruptor (silence Fugitive).'
      }
    ]
  },
  commander: {
    id: 'commander',
    name: 'Commander',
    team: 'communists',
    category: 'support',
    description: 'Each night, select a distinct player (cannot repeat selections). Usurps and gains the chosen player\'s active ability for the remainder of that night.',
    abilities: [
      {
        id: 'commandeer_tactics',
        name: 'Commandeer Ability',
        timing: 'night',
        description: 'Mirror and utilize the chosen target\'s ability throughout the night.'
      }
    ]
  },
  painter: {
    id: 'painter',
    name: 'Painter',
    team: 'communists',
    category: 'support',
    description: 'During the day, inspire a player. That player is granted +1 bonus ability usage during the ensuing night.',
    abilities: [
      {
        id: 'inspire',
        name: 'Artistic Inspiration',
        timing: 'day',
        description: 'Bestow an extra ability charge upon chosen ally for the night phase.'
      }
    ]
  },
  lover: {
    id: 'lover',
    name: 'Lover',
    team: 'communists',
    category: 'support',
    description: 'Soulbound to an unwitting player from a rival team. If either dies, both perish. Notified whenever the partner acts. Can shoot an arrow at a house or player daily (killing a player commits a crime; criminal dies).',
    abilities: [
      {
        id: 'lovers_arrow',
        name: 'Fateful Arrow',
        timing: 'day',
        causesCrime: true,
        description: 'Shoot an arrow at house or player. Player death commits a crime.'
      }
    ]
  },
  prisoner: {
    id: 'prisoner',
    name: 'Prisoner',
    team: 'communists',
    category: 'support',
    cannotCommitCrimes: true,
    description: 'Exiled from the Communist team chat at the beginning of the match. Can execute one player each night without ever incurring crimes.',
    abilities: [
      {
        id: 'shackled_execution',
        name: 'Nocturnal Execution',
        timing: 'night',
        description: 'Assassinate one player each night. Immune to accumulating crimes.'
      }
    ]
  },

  // === SOLDIERS ===
  trooper: {
    id: 'trooper',
    name: 'Trooper',
    team: 'soldiers',
    category: 'essential',
    cannotCommitCrimes: true,
    description: 'Each night, fire a standard issue rifle at a player or a house. Military personnel are legally exempt from committing crimes.',
    abilities: [
      {
        id: 'rifle_fire',
        name: 'Rifle Shot',
        timing: 'night',
        description: 'Shoot a player or house. Immune to committing crimes.'
      }
    ]
  },
  lieutenant: {
    id: 'lieutenant',
    name: 'Lieutenant',
    team: 'soldiers',
    category: 'essential',
    description: 'During the day, designate a squadmate. That squadmate is relieved of duty and cannot use their ability next night; the Lieutenant commands and executes their ability instead.',
    abilities: [
      {
        id: 'assume_command',
        name: 'Assume Command',
        timing: 'day',
        description: 'Confiscate teammate\'s ability for the night, disabling them.'
      }
    ]
  },
  dictator: {
    id: 'dictator',
    name: 'Dictator',
    team: 'soldiers',
    category: 'support',
    description: 'Once per match, declare open war on a rival team. During wartime, both warring factions can execute 1 player nightly. Executing anyone outside the warring factions constitutes a severe crime.',
    abilities: [
      {
        id: 'declare_war',
        name: 'Declaration of War',
        timing: 'unique',
        maxUses: 1,
        description: 'Engage a rival team in total war until one side is completely eliminated.'
      }
    ]
  },
  mortar: {
    id: 'mortar',
    name: 'Mortar',
    team: 'soldiers',
    category: 'support',
    description: 'Each night, fire heavy mortar ordnance at a cluster of 2 adjacent houses. Demolishes both houses and eliminates The Fugitive if sheltered within.',
    abilities: [
      {
        id: 'mortar_barrage',
        name: 'Artillery Barrage',
        timing: 'night',
        description: 'Target 2 houses: demolishes both and kills The Fugitive if inside.'
      }
    ]
  },
  veteran: {
    id: 'veteran',
    name: 'Veteran',
    team: 'soldiers',
    category: 'support',
    hasPassiveProtection: true,
    description: 'Hardened by countless battles: survives death 2 additional times (plus the Soldier 50% passive). Nightly: inspects an outsider and uncovers their team affiliation.',
    abilities: [
      {
        id: 'intelligence_inspection',
        name: 'Reconnaissance',
        timing: 'night',
        description: 'Inspect a non-Soldier to discover their true team.'
      }
    ]
  },
  general: {
    id: 'general',
    name: 'General',
    team: 'soldiers',
    category: 'support',
    description: 'Each night, consult the Host or authoritative tactical assessor to learn which faction currently holds the strategic advantage.',
    abilities: [
      {
        id: 'tactical_appraisal',
        name: 'Tactical Situation Report',
        timing: 'night',
        description: 'Query the authoritative game moderator about which team currently leads.'
      }
    ]
  },
  executioner: {
    id: 'executioner',
    name: 'Executioner',
    team: 'soldiers',
    category: 'support',
    description: 'During the day, nominate a suspect for public trial and execution. A town vote is convened; if voted guilty, the condemned is executed at dusk.',
    abilities: [
      {
        id: 'tribunal_nomination',
        name: 'Convene Tribunal',
        timing: 'day',
        description: 'Nominate suspect for public hanging vote.'
      }
    ]
  },
  lunatic: {
    id: 'lunatic',
    name: 'Lunatic',
    team: 'soldiers',
    category: 'support',
    description: 'Cursed with an insatiable bloodlust: under strict obligation to target a player for death each night. If the intended victim survives due to protective wards or if the Lunatic fails to choose, the Lunatic dies.',
    abilities: [
      {
        id: 'frenzied_mandate',
        name: 'Mandatory Bloodshed',
        timing: 'night',
        description: 'Must target a player to kill. If target survives or action is neglected, Lunatic dies.'
      }
    ]
  },

  // === SOLO ROLES (Infiltrators) ===
  cursed: {
    id: 'cursed',
    name: 'The Cursed',
    team: 'solo',
    category: 'solo',
    description: 'Nightly: select a player to swap teams and roles with. If you remain The Cursed when the match concludes, you lose. If you die while bearing The Cursed role, you triumph alone!',
    abilities: [
      {
        id: 'curse_transference',
        name: 'Transference',
        timing: 'night',
        description: 'Swap role and team with another player. Win upon death.'
      }
    ]
  },
  lucky: {
    id: 'lucky',
    name: 'The Lucky',
    team: 'solo',
    category: 'solo',
    description: 'A miraculous survivor. Wins if still breathing when the game concludes, stealing victory solely for themselves while all others taste defeat.',
    abilities: []
  },
  parasite: {
    id: 'parasite',
    name: 'The Parasite',
    team: 'solo',
    category: 'solo',
    description: 'If someone attempts to slay you, you infect them: you steal their role and team, and they perish. If you later die, the former host returns from the grave with their original role and team.',
    hasPassiveProtection: true,
    abilities: [
      {
        id: 'parasitic_retaliation',
        name: 'Host Assumption',
        timing: 'passive',
        description: 'Steal role and life of your killer. Original host revives if you perish.'
      }
    ]
  },
  squire: {
    id: 'squire',
    name: 'The Squire',
    team: 'solo',
    category: 'solo',
    description: 'At match onset, a random player is designated as your Lord. If your Lord is alive when the match ends, you win, regardless of whether you are dead or alive.',
    abilities: []
  },
  spy: {
    id: 'spy',
    name: 'The Spy',
    team: 'solo',
    category: 'solo',
    description: 'Wins if The Fugitive wins! Secretly present in the communications of all factions. If a team deduces your traitorous identity, they may vote to expel you from their channel.',
    abilities: []
  },

  // === THE FUGITIVE ===
  fugitive: {
    id: 'fugitive',
    name: 'The Fugitive',
    team: 'fugitive',
    category: 'target',
    description: 'The elusive quarry hunted by the four factions. Wins if all hunters are wiped out. Each day, may perform exactly 1 action: Relocate House, Eliminate Player, Investigate Player, or Inquire Host. Possesses the Spawnpoint defense.',
    abilities: [
      {
        id: 'relocate_house',
        name: 'Relocate Hideout',
        timing: 'day',
        description: 'Move into any valid, undemolished house on the map.'
      },
      {
        id: 'fugitive_eliminate',
        name: 'Assassinate Hunter',
        timing: 'day',
        description: 'Silently eliminate a player of choice.'
      },
      {
        id: 'fugitive_investigate',
        name: 'Scout Identity',
        timing: 'day',
        description: 'Uncover the secret role and team of target player.'
      },
      {
        id: 'fugitive_inquire',
        name: 'Whisper to Moderator',
        timing: 'day',
        description: 'Ask the host/system a truthful yes/no inquiry.'
      },
      {
        id: 'create_spawnpoint',
        name: 'Establish Spawnpoint',
        timing: 'day',
        description: 'Set a secret escape shelter. If attacked, teleports here, generating 11 clues (1 real + 10 decoys).'
      }
    ]
  }
};

// Player Count Scaling Table based on Page 14 & 15 of Rulebook
export interface PlayerCountConfig {
  regularPlayers: number; // Regular players (excluding The Fugitive)
  activeTeams: number;
  playersPerTeam: number;
  soloCount: number;
  totalHouses: number;
  housesDestroyedPerRound: number;
}

export const PLAYER_COUNT_TABLE: PlayerCountConfig[] = [
  { regularPlayers: 6,  activeTeams: 2, playersPerTeam: 3, soloCount: 0, totalHouses: 30,  housesDestroyedPerRound: 1 },
  { regularPlayers: 7,  activeTeams: 2, playersPerTeam: 3, soloCount: 1, totalHouses: 35,  housesDestroyedPerRound: 1 },
  { regularPlayers: 8,  activeTeams: 2, playersPerTeam: 4, soloCount: 0, totalHouses: 40,  housesDestroyedPerRound: 1 },
  { regularPlayers: 9,  activeTeams: 2, playersPerTeam: 4, soloCount: 1, totalHouses: 45,  housesDestroyedPerRound: 1 },
  { regularPlayers: 10, activeTeams: 2, playersPerTeam: 4, soloCount: 2, totalHouses: 50,  housesDestroyedPerRound: 2 },
  { regularPlayers: 11, activeTeams: 2, playersPerTeam: 4, soloCount: 3, totalHouses: 55,  housesDestroyedPerRound: 2 },
  { regularPlayers: 12, activeTeams: 3, playersPerTeam: 4, soloCount: 0, totalHouses: 60,  housesDestroyedPerRound: 2 },
  { regularPlayers: 13, activeTeams: 3, playersPerTeam: 4, soloCount: 1, totalHouses: 65,  housesDestroyedPerRound: 2 },
  { regularPlayers: 14, activeTeams: 3, playersPerTeam: 4, soloCount: 2, totalHouses: 70,  housesDestroyedPerRound: 3 },
  { regularPlayers: 15, activeTeams: 3, playersPerTeam: 4, soloCount: 3, totalHouses: 75,  housesDestroyedPerRound: 3 },
  { regularPlayers: 16, activeTeams: 4, playersPerTeam: 4, soloCount: 0, totalHouses: 80,  housesDestroyedPerRound: 3 },
  { regularPlayers: 17, activeTeams: 4, playersPerTeam: 4, soloCount: 1, totalHouses: 85,  housesDestroyedPerRound: 3 },
  { regularPlayers: 18, activeTeams: 4, playersPerTeam: 4, soloCount: 2, totalHouses: 90,  housesDestroyedPerRound: 4 },
  { regularPlayers: 19, activeTeams: 4, playersPerTeam: 4, soloCount: 3, totalHouses: 95,  housesDestroyedPerRound: 4 },
  { regularPlayers: 20, activeTeams: 4, playersPerTeam: 5, soloCount: 0, totalHouses: 100, housesDestroyedPerRound: 4 },
  { regularPlayers: 21, activeTeams: 4, playersPerTeam: 5, soloCount: 1, totalHouses: 105, housesDestroyedPerRound: 5 },
  { regularPlayers: 22, activeTeams: 4, playersPerTeam: 5, soloCount: 2, totalHouses: 110, housesDestroyedPerRound: 5 },
  { regularPlayers: 23, activeTeams: 4, playersPerTeam: 5, soloCount: 3, totalHouses: 115, housesDestroyedPerRound: 5 },
  { regularPlayers: 24, activeTeams: 4, playersPerTeam: 5, soloCount: 4, totalHouses: 120, housesDestroyedPerRound: 6 },
  { regularPlayers: 25, activeTeams: 4, playersPerTeam: 6, soloCount: 1, totalHouses: 125, housesDestroyedPerRound: 6 },
  { regularPlayers: 26, activeTeams: 4, playersPerTeam: 6, soloCount: 2, totalHouses: 130, housesDestroyedPerRound: 6 },
  { regularPlayers: 27, activeTeams: 4, playersPerTeam: 6, soloCount: 3, totalHouses: 135, housesDestroyedPerRound: 7 },
  { regularPlayers: 28, activeTeams: 4, playersPerTeam: 6, soloCount: 4, totalHouses: 140, housesDestroyedPerRound: 7 },
  { regularPlayers: 29, activeTeams: 4, playersPerTeam: 7, soloCount: 1, totalHouses: 145, housesDestroyedPerRound: 7 },
  { regularPlayers: 30, activeTeams: 4, playersPerTeam: 7, soloCount: 2, totalHouses: 150, housesDestroyedPerRound: 8 },
  { regularPlayers: 31, activeTeams: 4, playersPerTeam: 7, soloCount: 3, totalHouses: 155, housesDestroyedPerRound: 8 },
  { regularPlayers: 32, activeTeams: 4, playersPerTeam: 7, soloCount: 4, totalHouses: 160, housesDestroyedPerRound: 8 },
];

export function getConfigForPlayerCount(regularPlayers: number): PlayerCountConfig | null {
  return PLAYER_COUNT_TABLE.find(c => c.regularPlayers === regularPlayers) || null;
}
