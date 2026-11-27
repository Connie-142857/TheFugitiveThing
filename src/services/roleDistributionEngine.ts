// Authoritative Role Distribution & Match Balancing Engine
import { TEAMS, ROLES, getConfigForPlayerCount } from '../types/rules.ts';
import type { TeamId, RoleDefinition } from '../types/rules.ts';
import type { RoomSettings, SecretRoleBriefingData, PlayerInMatch, HouseState } from '../types/game.ts';

export interface PlayerCandidate {
  uid: string;
  username: string;
  avatarId?: string;
}

export interface MatchValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recommendedPlayerCount: number;
  minimumPlayerCount: number;
}

export interface RoleAssignmentResult {
  fugitiveUid: string;
  fugitiveInitialHouse: number;
  totalHouses: number;
  housesDestroyedPerRound: number;
  secretBriefings: Record<string, SecretRoleBriefingData>;
  publicRoster: Record<string, PlayerInMatch>;
  initialHouses: Record<number, HouseState>;
}

// Fisher-Yates array shuffling
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Validates match readiness and player-count configuration against the rulebook
 */
export function validateMatchConfiguration(
  playerCount: number,
  settings: RoomSettings
): MatchValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const minRequired = 7; // 6 regular + 1 Fugitive
  const recommended = 16; // 15 regular + 1 Fugitive

  if (playerCount < minRequired) {
    errors.push(
      `Insufficient hunters. By decree of the rulebook, a minimum of 7 players (6 regular hunters + 1 The Fugitive) is strictly required. Current: ${playerCount}.`
    );
  }

  if (playerCount >= minRequired && playerCount < recommended) {
    warnings.push(
      `While valid with ${playerCount} players, the rulebook recommends 16 or more players for full 4-faction tactical balance.`
    );
  }

  const regularCount = playerCount - 1;
  const officialConfig = getConfigForPlayerCount(regularCount);

  if (!officialConfig) {
    warnings.push(
      `Player count (${playerCount}) uses an interpolated squad configuration rather than a predefined table row.`
    );
  }

  if (settings.activeTeams.length < 2) {
    errors.push('At least two active factions are required to establish match tension.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    minimumPlayerCount: minRequired,
    recommendedPlayerCount: recommended,
  };
}

/**
 * Pure authoritative role assignment generator
 */
export function assignRolesAndFactions(
  candidates: PlayerCandidate[],
  settings: RoomSettings,
  preferredFugitiveUid?: string
): RoleAssignmentResult {
  if (candidates.length < 7) {
    throw new Error('Cannot assign roles: minimum 7 players required.');
  }

  const shuffledCandidates = shuffle(candidates);

  // 1. Assign The Fugitive
  let fugitiveIndex = -1;
  if (preferredFugitiveUid) {
    fugitiveIndex = shuffledCandidates.findIndex((c) => c.uid === preferredFugitiveUid);
  }
  if (fugitiveIndex === -1) {
    fugitiveIndex = 0; // First in shuffled array
  }

  const fugitivePlayer = shuffledCandidates.splice(fugitiveIndex, 1)[0];
  const regularHunters = shuffledCandidates; // Remaining players

  // 2. Derive Scaling Configuration
  const regularCount = regularHunters.length;
  const scaling = getConfigForPlayerCount(regularCount) || {
    regularPlayers: regularCount,
    activeTeams: Math.min(settings.activeTeams.length, 4),
    playersPerTeam: Math.floor(regularCount / Math.max(1, settings.activeTeams.length)),
    soloCount: settings.soloRoleCount,
    totalHouses: settings.totalHouses,
    housesDestroyedPerRound: settings.housesDestroyedPerRound,
  };

  const totalHouses = settings.totalHouses || scaling.totalHouses || 80;
  const housesDestroyedPerRound =
    settings.housesDestroyedPerRound || scaling.housesDestroyedPerRound || 3;

  // The Fugitive's secret initial hideout
  const fugitiveInitialHouse = Math.floor(1 + Math.random() * totalHouses);

  // 3. Partition Regular Hunters into Active Teams
  const activeTeams = settings.activeTeams.length >= 2 ? settings.activeTeams : (['investigators', 'annihilators'] as TeamId[]);
  const teamBuckets: Record<TeamId, PlayerCandidate[]> = {
    investigators: [],
    annihilators: [],
    communists: [],
    soldiers: [],
    solo: [],
    fugitive: [],
  };

  regularHunters.forEach((hunter, idx) => {
    const assignedTeam = activeTeams[idx % activeTeams.length];
    teamBuckets[assignedTeam].push(hunter);
  });

  // 4. Select and Embed Solo Infiltrators
  const soloRolesPool = shuffle(['cursed', 'lucky', 'parasite', 'squire', 'spy']);
  const requestedSolos =
    settings.soloRoleCount !== undefined ? settings.soloRoleCount : scaling.soloCount;
  const maxSolosAllowed = Math.max(0, regularHunters.length - activeTeams.length * 2);
  const soloCount = Math.min(requestedSolos, soloRolesPool.length, maxSolosAllowed);

  // Pick hunters to secretly become solo infiltrators
  const soloHunterUids = new Set<string>();
  const soloRoleMap = new Map<string, string>(); // uid -> roleId

  if (soloCount > 0) {
    // Pick candidates spread across teams
    const candidatesForSolo = shuffle([...regularHunters]);
    for (let i = 0; i < soloCount; i++) {
      const targetHunter = candidatesForSolo[i];
      soloHunterUids.add(targetHunter.uid);
      soloRoleMap.set(targetHunter.uid, soloRolesPool[i]);
    }
  }

  // 5. Assign Roles for Each Team (Essential first, then Support)
  const secretBriefings: Record<string, SecretRoleBriefingData> = {};
  const publicRoster: Record<string, PlayerInMatch> = {};

  const allRolesList = Object.values(ROLES);

  for (const teamId of activeTeams) {
    const members = teamBuckets[teamId];
    const teamDef = TEAMS[teamId];

    // Essential roles for this team
    const essentialRoles = allRolesList.filter(
      (r) => r.team === teamId && r.category === 'essential'
    );
    // Support roles for this team
    const supportRoles = shuffle(
      allRolesList.filter((r) => r.team === teamId && r.category === 'support')
    );

    let essentialIdx = 0;
    let supportIdx = 0;

    for (const member of members) {
      const isSolo = soloHunterUids.has(member.uid);

      if (isSolo) {
        // Solo role
        const soloRoleId = soloRoleMap.get(member.uid)!;
        const soloRoleDef = ROLES[soloRoleId];

        secretBriefings[member.uid] = {
          uid: member.uid,
          roleId: soloRoleId,
          roleName: soloRoleDef.name,
          team: 'solo',
          publicCoverTeam: teamId, // External public facade
          category: 'solo',
          roleDescription: soloRoleDef.description,
          teamPassive: {
            name: TEAMS.solo.passiveName,
            description: TEAMS.solo.passiveDescription,
          },
          abilities: soloRoleDef.abilities,
          winCondition: getWinConditionForRole(soloRoleId),
          assignedAt: Date.now(),
        };
      } else {
        // Faction Member: prioritize Essential roles
        let roleDef: RoleDefinition;
        if (essentialIdx < essentialRoles.length) {
          roleDef = essentialRoles[essentialIdx++];
        } else if (supportIdx < supportRoles.length) {
          roleDef = supportRoles[supportIdx++];
        } else {
          // Fallback if team size exceeds unique roles
          roleDef = essentialRoles[0];
        }

        secretBriefings[member.uid] = {
          uid: member.uid,
          roleId: roleDef.id,
          roleName: roleDef.name,
          team: teamId,
          publicCoverTeam: teamId,
          category: roleDef.category,
          roleDescription: roleDef.description,
          teamPassive: {
            name: teamDef.passiveName,
            description: teamDef.passiveDescription,
          },
          abilities: roleDef.abilities,
          winCondition: `Victory for the ${teamDef.name}: Strike down The Fugitive or have the greatest living headcount when The Fugitive dies.`,
          assignedAt: Date.now(),
        };
      }

      // Public representation: role and solo status are HIDDEN
      publicRoster[member.uid] = {
        uid: member.uid,
        username: member.username,
        isHost: false,
        isFugitive: false,
        isAlive: true,
        isZombie: false,
        isGhost: false,
        isImmortal: false,
        crimes: 0,
        consecutiveIdleRounds: 0,
        statusEffects: {
          extraAbilityUses: 0,
        },
        team: teamId, // Publicly appears as this team
        survivedAttacksCount: 0,
      };
    }
  }

  // 6. Form Special Interconnections (Squire Lord, Lover Soulbound)
  const candidateLookup = new Map(candidates.map((c) => [c.uid, c.username]));

  // Link Squire
  for (const [uid, briefing] of Object.entries(secretBriefings)) {
    if (briefing.roleId === 'squire') {
      const otherUids = candidates.filter((c) => c.uid !== uid).map((c) => c.uid);
      const chosenLordUid = otherUids[Math.floor(Math.random() * otherUids.length)];
      if (publicRoster[uid]) {
        publicRoster[uid].assignedLordUid = chosenLordUid;
      }
      briefing.specialKnowledge = {
        assignedLordUid: chosenLordUid,
        assignedLordName: candidateLookup.get(chosenLordUid) || 'Unknown Lord',
        notes: `Your Lord is ${candidateLookup.get(chosenLordUid)}. If they are breathing when the chronicle closes, you triumph!`,
      };
    }

    if (briefing.roleId === 'lover') {
      const rivalCandidates = candidates.filter(
        (c) => c.uid !== uid && publicRoster[c.uid]?.team !== briefing.team
      );
      const chosenSoulbound =
        rivalCandidates.length > 0
          ? rivalCandidates[Math.floor(Math.random() * rivalCandidates.length)]
          : candidates.filter((c) => c.uid !== uid)[0];

      if (publicRoster[uid]) {
        (publicRoster[uid] as any).soulboundPartnerUid = chosenSoulbound.uid;
      }
      if (publicRoster[chosenSoulbound.uid]) {
        (publicRoster[chosenSoulbound.uid] as any).soulboundPartnerUid = uid;
      }
      briefing.specialKnowledge = {
        soulboundUid: chosenSoulbound.uid,
        soulboundName: chosenSoulbound.username,
        notes: `You are soulbound to ${chosenSoulbound.username}. If either perishes, both perish.`,
      };
    }
  }

  // 7. Add The Fugitive
  const fugitiveRoleDef = ROLES.fugitive;
  secretBriefings[fugitivePlayer.uid] = {
    uid: fugitivePlayer.uid,
    roleId: 'fugitive',
    roleName: fugitiveRoleDef.name,
    team: 'fugitive',
    publicCoverTeam: 'fugitive',
    category: 'target',
    roleDescription: fugitiveRoleDef.description,
    teamPassive: {
      name: TEAMS.fugitive.passiveName,
      description: TEAMS.fugitive.passiveDescription,
    },
    abilities: fugitiveRoleDef.abilities,
    winCondition: 'The Fugitive triumphs alone if all pursuing hunters are completely eliminated.',
    specialKnowledge: {
      initialHouseNumber: fugitiveInitialHouse,
      notes: `Your clandestine sanctuary is currently established in House #${fugitiveInitialHouse}. Deploy Spawnpoints wisely to evade capture.`,
    },
    assignedAt: Date.now(),
  };

  publicRoster[fugitivePlayer.uid] = {
    uid: fugitivePlayer.uid,
    username: fugitivePlayer.username,
    isHost: false,
    isFugitive: true,
    isAlive: true,
    isZombie: false,
    isGhost: false,
    isImmortal: false,
    crimes: 0,
    consecutiveIdleRounds: 0,
    statusEffects: {
      extraAbilityUses: 0,
    },
    team: 'fugitive',
    survivedAttacksCount: 0,
  };

  // 8. Generate Initial House Grid
  const initialHouses: Record<number, HouseState> = {};
  for (let i = 1; i <= totalHouses; i++) {
    initialHouses[i] = {
      number: i,
      isDestroyed: false,
      isBurned: false,
    };
  }

  return {
    fugitiveUid: fugitivePlayer.uid,
    fugitiveInitialHouse,
    totalHouses,
    housesDestroyedPerRound,
    secretBriefings,
    publicRoster,
    initialHouses,
  };
}

function getWinConditionForRole(roleId: string): string {
  switch (roleId) {
    case 'cursed':
      return 'You win solely if you perish while bearing The Cursed role. If you are alive at match conclusion bearing The Cursed, you lose.';
    case 'lucky':
      return 'You win if you are alive when the chronicle closes. You take victory solely for yourself while all others taste defeat.';
    case 'parasite':
      return 'If attacked, you steal the killer\'s identity and they die. Win with the faction you end the game belonging to.';
    case 'squire':
      return 'You win if your assigned Lord is alive when the game ends, regardless of whether you are dead or alive.';
    case 'spy':
      return 'You win if The Fugitive wins! You are present in all faction communication channels.';
    default:
      return 'Standard faction victory conditions apply.';
  }
}
