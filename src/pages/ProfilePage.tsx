import React, { useState, useEffect } from 'react';
import { ParchmentPanel } from '../components/ui/ParchmentPanel';
import { PlayerAvatar } from '../components/ui/PlayerAvatar';
import { Button } from '../components/ui/Button';
import { ManuscriptDivider } from '../components/ui/Divider';
import { EditProfileModal } from '../components/profile/EditProfileModal';
import { useAuth } from '../context/AuthContext';
import {
  getLevelProgress,
  ACHIEVEMENT_CATALOGUE,
  fetchPlayerMatchHistory,
} from '../services/progressionService';
import { getCosmeticById } from '../services/shopService';
import { resolveCosmeticVisuals } from '../utils/cosmeticStyles';
import { MatchHistoryRecord } from '../types/player';
import { ROLES } from '../types/rules';
import {
  Coins,
  Award,
  Shield,
  KeyRound,
  Sparkles,
  LogOut,
  UserPlus,
  LogIn,
  Flame,
  Skull,
  Crosshair,
  Trophy,
  Clock,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, profile, openAuthModal, logout } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [recentMatches, setRecentMatches] = useState<MatchHistoryRecord[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchPlayerMatchHistory(user.uid, 5)
      .then(setRecentMatches)
      .catch(() => setRecentMatches([]));
  }, [user?.uid, profile?.stats?.totalMatches]);

  // If user is not signed in, show unauthenticated citadel invitation
  if (!user || !profile) {
    return (
      <div className="space-y-6">
        <ParchmentPanel variant="framed" className="text-center py-10">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-manuscript-burgundy/15 border-2 border-manuscript-burgundy text-manuscript-burgundy flex items-center justify-center mx-auto shadow-inner">
              <Shield className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-serif uppercase tracking-widest text-manuscript-burgundy font-bold">
                Imperial Seal Required
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-black text-ink mt-1">
                The Citadel Registry
              </h2>
              <p className="text-xs sm:text-sm font-body text-ink-light mt-2 leading-relaxed">
                You walk as an unregistered traveler in the realm. Inscribe your name in the Great Ledger to claim
                your starting bounty of 100 silver coins, preserve your battle statistics, and track your daily streak.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="wax"
                icon={<UserPlus className="w-4 h-4" />}
                onClick={() => openAuthModal('register')}
              >
                Inscribe New Hunter
              </Button>
              <Button
                variant="ink"
                icon={<LogIn className="w-4 h-4" />}
                onClick={() => openAuthModal('login')}
              >
                Enter the Citadel
              </Button>
            </div>
          </div>
        </ParchmentPanel>
      </div>
    );
  }

  const levelInfo = getLevelProgress(profile.xp || 0);
  const xpProgressPercent = levelInfo.progressPercent;
  const playtimeMinutes = Math.floor((profile.stats?.totalPlaytimeMs || 0) / 60000);
  const dossierVisuals = resolveCosmeticVisuals(profile.equippedCosmetics, profile.avatarId);

  const unlockedMap = new Map<string, number>();
  for (const a of profile.achievements || []) {
    if (a.unlockedAt) unlockedMap.set(a.id, a.unlockedAt);
  }
  const mergedAchievements = ACHIEVEMENT_CATALOGUE.map((a) => ({
    ...a,
    unlockedAt: unlockedMap.get(a.id),
  }));

  return (
    <div className="space-y-6">
      {/* Dossier Header Card (Applies Equipped Background, Nameplate, Skin, Avatar & Effect) */}
      <ParchmentPanel
        variant="framed"
        className={`space-y-4 ${dossierVisuals.backgroundClass} ${
          dossierVisuals.backgroundIsDark ? 'text-parchment-50' : ''
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <PlayerAvatar
            username={profile.username}
            avatarId={profile.avatarId}
            equippedCosmetics={profile.equippedCosmetics}
            size="xl"
            level={profile.level}
            className="flex-shrink-0"
          />

          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span
                className={`text-xs font-serif uppercase tracking-widest font-bold ${
                  dossierVisuals.backgroundIsDark ? 'text-amber-300' : 'text-manuscript-burgundy'
                }`}
              >
                Hunter Dossier • Inscribed
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/25 text-emerald-300 border border-emerald-700/40 font-serif font-bold">
                Active Hunter
              </span>
            </div>

            <h2
              className={`text-2xl sm:text-3xl font-serif font-black ${
                dossierVisuals.backgroundIsDark ? 'text-parchment-50' : 'text-ink'
              }`}
            >
              {profile.username}
            </h2>
            <p className={`text-xs font-mono ${dossierVisuals.backgroundIsDark ? 'text-parchment-300' : 'text-ink-light'}`}>
              UID: {profile.uid}
            </p>

            {profile.bio && (
              <p
                className={`text-xs font-body italic pt-0.5 max-w-xl ${
                  dossierVisuals.backgroundIsDark ? 'text-parchment-200' : 'text-ink-light'
                }`}
              >
                &ldquo;{profile.bio}&rdquo;
              </p>
            )}

            {/* Level & XP Progression Bar */}
            <div className="pt-2 max-w-md">
              <div
                className={`flex justify-between text-xs font-serif mb-1 ${
                  dossierVisuals.backgroundIsDark ? 'text-parchment-200' : 'text-ink-light'
                }`}
              >
                <span>Rank {levelInfo.level}: {profile.title || levelInfo.rankTitle}</span>
                <span>{levelInfo.currentLevelXp} / {levelInfo.xpRequiredForNext} XP (Total: {profile.xp || 0})</span>
              </div>
              <div className="w-full h-2.5 bg-parchment-300 rounded-full overflow-hidden border border-parchment-500">
                <div
                  className="h-full bg-gradient-to-r from-manuscript-gold to-amber-600 transition-all duration-500"
                  style={{ width: `${Math.max(4, xpProgressPercent)}%` }}
                />
              </div>
            </div>

            {/* Currencies & Badges */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-3 text-xs font-serif">
              <span className="flex items-center gap-1.5 text-manuscript-gold font-bold bg-parchment-200 px-3 py-1 rounded border border-parchment-400">
                <Coins className="w-4 h-4" />
                {profile.coins} Silver Coins
              </span>
              <span className="flex items-center gap-1.5 text-manuscript-forest font-bold bg-parchment-200 px-3 py-1 rounded border border-parchment-400">
                <Sparkles className="w-4 h-4" />
                {profile.streak?.currentStreak || 1} Day Streak
              </span>
            </div>
          </div>

          <div className="sm:self-start flex flex-col sm:flex-row gap-2">
            <Button
              variant="parchment"
              size="sm"
              icon={<KeyRound className="w-4 h-4" />}
              onClick={() => setIsEditModalOpen(true)}
            >
              Edit Dossier
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<LogOut className="w-4 h-4" />}
              onClick={logout}
              title="Leave the Citadel"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </ParchmentPanel>

      {/* Equipped Cosmetics Section */}
      <ParchmentPanel variant="bound" className="space-y-3">
        <h3 className="font-serif font-bold text-lg text-ink flex items-center gap-2">
          <Award className="w-5 h-5 text-manuscript-burgundy" />
          Equipped Antique Regalia
        </h3>
        <p className="text-xs font-body text-ink-light">
          Cosmetics currently equipped from your personal inventory.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {[
            {
              label: 'Character Skin',
              value:
                (profile.equippedCosmetics?.skin && getCosmeticById(profile.equippedCosmetics.skin)?.name) ||
                'Trainee Vellum Robe',
            },
            {
              label: 'Avatar Emblem',
              value:
                (profile.equippedCosmetics?.avatar && getCosmeticById(profile.equippedCosmetics.avatar)?.name) ||
                getCosmeticById(profile.avatarId)?.name ||
                'Grand Inquisitor Emblem',
            },
            {
              label: 'Nameplate Border',
              value:
                (profile.equippedCosmetics?.nameplate &&
                  getCosmeticById(profile.equippedCosmetics.nameplate)?.name) ||
                'Antique Monastic Border',
            },
            {
              label: 'Profile Background',
              value:
                (profile.equippedCosmetics?.background &&
                  getCosmeticById(profile.equippedCosmetics.background)?.name) ||
                'Default Parchment',
            },
            {
              label: 'Honorary Title',
              value:
                (profile.equippedCosmetics?.title && getCosmeticById(profile.equippedCosmetics.title)?.name) ||
                profile.title ||
                'Novice Tracker',
            },
            {
              label: 'Cosmetic Effect',
              value:
                (profile.equippedCosmetics?.effect && getCosmeticById(profile.equippedCosmetics.effect)?.name) ||
                'None Equipped',
            },
          ].map((c, i) => (
            <div key={i} className="p-3 bg-parchment-100 rounded border border-parchment-300 text-center">
              <span className="text-[10px] font-serif uppercase tracking-wider text-ink-light block">
                {c.label}
              </span>
              <span className="text-xs font-serif font-bold text-ink mt-0.5 block truncate">
                {c.value}
              </span>
            </div>
          ))}
        </div>
      </ParchmentPanel>

      {/* Battle Honors / Statistics Summary */}
      <ParchmentPanel variant="sheet" className="space-y-4">
        <h3 className="font-serif font-bold text-lg text-ink flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-manuscript-forest" />
          Career Statistics
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-2.5 bg-parchment-200/80 rounded border border-parchment-300">
            <span className="text-[11px] font-serif text-ink-light block">Matches</span>
            <span className="text-xl font-serif font-bold text-ink">{profile.stats?.totalMatches || 0}</span>
          </div>
          <div className="p-2.5 bg-parchment-200/80 rounded border border-parchment-300">
            <span className="text-[11px] font-serif text-ink-light block">Victories / Losses</span>
            <span className="text-xl font-serif font-bold text-manuscript-forest">
              {profile.stats?.wins || 0} / <span className="text-red-900">{profile.stats?.losses || 0}</span>
            </span>
          </div>
          <div className="p-2.5 bg-parchment-200/80 rounded border border-parchment-300">
            <span className="text-[11px] font-serif text-ink-light block">Win Rate</span>
            <span className="text-xl font-serif font-bold text-manuscript-burgundy">
              {profile.stats?.winRate || 0}%
            </span>
          </div>
          <div className="p-2.5 bg-parchment-200/80 rounded border border-parchment-300">
            <span className="text-[11px] font-serif text-ink-light block">Survival Rate</span>
            <span className="text-xl font-serif font-bold text-emerald-900">
              {profile.stats?.survivalRate || 0}%
            </span>
          </div>
          <div className="p-2.5 bg-parchment-200/80 rounded border border-parchment-300">
            <span className="text-[11px] font-serif text-ink-light block">Kills</span>
            <span className="text-xl font-serif font-bold text-red-900">{profile.stats?.kills || 0}</span>
          </div>
          <div className="p-2.5 bg-parchment-200/80 rounded border border-parchment-300">
            <span className="text-[11px] font-serif text-ink-light block">Abilities Enacted</span>
            <span className="text-xl font-serif font-bold text-ink">{profile.stats?.successfulAbilities || 0}</span>
          </div>
          <div className="p-2.5 bg-parchment-200/80 rounded border border-parchment-300">
            <span className="text-[11px] font-serif text-ink-light block">Fugitive / Solo Wins</span>
            <span className="text-xl font-serif font-bold text-amber-900">
              {profile.stats?.fugitiveWins || 0} / {profile.stats?.soloWins || 0}
            </span>
          </div>
          <div className="p-2.5 bg-parchment-200/80 rounded border border-parchment-300">
            <span className="text-[11px] font-serif text-ink-light block">Total Playtime</span>
            <span className="text-xl font-serif font-bold text-ink">{playtimeMinutes}m</span>
          </div>
        </div>

        {/* Team Win Statistics */}
        <div className="pt-2 border-t border-parchment-300">
          <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-ink-light mb-2">
            Team Win Statistics
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs font-serif">
            {[
              { name: 'Investigators', val: profile.stats?.teamWins?.investigators || 0 },
              { name: 'Annihilators', val: profile.stats?.teamWins?.annihilators || 0 },
              { name: 'Communists', val: profile.stats?.teamWins?.communists || 0 },
              { name: 'Soldiers', val: profile.stats?.teamWins?.soldiers || 0 },
              { name: 'Solo', val: profile.stats?.teamWins?.solo || 0 },
              { name: 'Fugitive', val: profile.stats?.fugitiveWins || 0 },
            ].map((t) => (
              <div key={t.name} className="p-2 bg-parchment-100 rounded border border-parchment-300">
                <span className="text-[10px] text-ink-light block">{t.name}</span>
                <span className="font-bold text-sm text-ink">{t.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Role Win Statistics */}
        {profile.stats?.roleWins && Object.keys(profile.stats.roleWins).length > 0 && (
          <div className="pt-2 border-t border-parchment-300">
            <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-ink-light mb-2">
              Role Win Statistics
            </h4>
            <div className="flex flex-wrap gap-2 text-xs font-serif">
              {Object.entries(profile.stats.roleWins).map(([rId, count]) => (
                <span
                  key={rId}
                  className="px-2.5 py-1 rounded bg-parchment-100 border border-parchment-400 text-ink"
                >
                  <strong>{ROLES[rId]?.name || rId}:</strong> {count} win{count === 1 ? '' : 's'}
                </span>
              ))}
            </div>
          </div>
        )}
      </ParchmentPanel>

      {/* Recent Matches */}
      <ParchmentPanel variant="bound" className="space-y-3">
        <h3 className="font-serif font-bold text-lg text-ink flex items-center gap-2">
          <Clock className="w-5 h-5 text-manuscript-burgundy" />
          Recent Matches
        </h3>
        {recentMatches.length === 0 ? (
          <p className="text-xs font-body italic text-ink-light">
            No completed matches recorded in your ledger yet.
          </p>
        ) : (
          <div className="space-y-2">
            {recentMatches.map((m) => (
              <div
                key={m.matchId}
                className="p-3 rounded bg-parchment-100 border border-parchment-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-serif"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        m.result === 'victory'
                          ? 'bg-emerald-900/15 text-emerald-950 border border-emerald-800/30'
                          : 'bg-red-900/15 text-red-950 border border-red-800/30'
                      }`}
                    >
                      {m.result}
                    </span>
                    <strong className="text-ink">{m.roomName}</strong>
                    <span className="text-ink-light font-mono text-[10px]">
                      {new Date(m.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-light mt-0.5">
                    Role: <strong>{ROLES[m.playerRole]?.name || m.playerRole}</strong> ({m.playerTeam}) • {m.survived ? 'Survived' : 'Fallen'} • {m.kills} Kills
                  </p>
                </div>
                <span className="font-mono font-bold text-amber-900 bg-amber-500/10 border border-amber-700/30 px-2 py-1 rounded self-start sm:self-center">
                  +{m.xpEarned} XP
                </span>
              </div>
            ))}
          </div>
        )}
      </ParchmentPanel>

      <ManuscriptDivider label="Achievement Collection" />

      {/* Achievements / Feats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {mergedAchievements.map((feat) => (
          <div
            key={feat.id}
            className={`border p-4 rounded shadow-sm flex items-start gap-3 ${
              feat.unlockedAt
                ? 'bg-parchment-50 border-parchment-500 text-ink'
                : 'bg-parchment-300/30 border-dashed border-parchment-400 opacity-70'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-parchment-200 border border-parchment-400 flex items-center justify-center flex-shrink-0 text-manuscript-gold">
              {feat.icon === 'Skull' ? (
                <Skull className="w-4 h-4" />
              ) : feat.icon === 'Flame' ? (
                <Flame className="w-4 h-4" />
              ) : feat.icon === 'Trophy' ? (
                <Trophy className="w-4 h-4" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-serif font-bold text-sm text-ink">{feat.name}</h4>
                {feat.unlockedAt && (
                  <span className="text-[9px] uppercase px-1 rounded bg-emerald-950/20 text-emerald-950 font-bold">
                    Unlocked
                  </span>
                )}
              </div>
              <p className="text-xs font-body text-ink-light mt-0.5">{feat.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </div>
  );
};
