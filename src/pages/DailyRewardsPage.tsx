import React, { useEffect, useState } from 'react';
import { ParchmentPanel } from '../components/ui/ParchmentPanel';
import { Button } from '../components/ui/Button';
import { ManuscriptDivider } from '../components/ui/Divider';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  DAILY_REWARD_SCHEDULE,
  STREAK_MILESTONES,
  DAILY_REWARD_RESET_STRATEGY,
  getUtcDateString,
  getUtcDayDifference,
  isDailyRewardAvailable,
  claimDailyRewardInFirestore,
  fetchDailyClaimHistory,
  DailyClaimOutcome,
} from '../services/dailyRewardService';
import { getCosmeticById } from '../services/shopService';
import { DailyClaimRecord } from '../types/player';
import {
  Gift,
  CheckCircle,
  Clock,
  Sparkles,
  Award,
  Lock,
  Calendar,
  History,
} from 'lucide-react';

export const DailyRewardsPage: React.FC = () => {
  const { user, profile, openAuthModal } = useAuth();
  const { showToast } = useToast();
  const [isClaiming, setIsClaiming] = useState(false);
  const [recentOutcome, setRecentOutcome] = useState<DailyClaimOutcome | null>(null);
  const [claimHistory, setClaimHistory] = useState<DailyClaimRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const todayUtc = getUtcDateString();
  const streak = profile?.streak;
  const rewardAvailable = isDailyRewardAvailable(profile);
  const alreadyClaimedToday = !!user && !rewardAvailable;

  // Determine effective streak taking missed days into account for preview
  const lastClaimDate = streak?.lastClaimDate || '';
  const daysSinceLast = lastClaimDate ? getUtcDayDifference(lastClaimDate, todayUtc) : 0;
  const effectiveCurrentStreak =
    !lastClaimDate || daysSinceLast > 1 ? 0 : streak?.currentStreak || 0;

  const currentStreakDisplay = alreadyClaimedToday
    ? streak?.currentStreak || 1
    : effectiveCurrentStreak;

  const nextStreakDay = alreadyClaimedToday
    ? ((streak?.currentStreak || 1) - 1) % 7 + 1
    : (effectiveCurrentStreak % 7) + 1;

  const todaysTier = DAILY_REWARD_SCHEDULE[nextStreakDay - 1] || DAILY_REWARD_SCHEDULE[0];

  useEffect(() => {
    if (!user) {
      setClaimHistory([]);
      return;
    }
    setLoadingHistory(true);
    fetchDailyClaimHistory(user.uid, 14)
      .then(setClaimHistory)
      .catch(() => setClaimHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [user?.uid, profile?.streak?.lastClaimDate]);

  const handleClaim = async () => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    setIsClaiming(true);
    try {
      const outcome = await claimDailyRewardInFirestore(user.uid);
      setRecentOutcome(outcome);

      let msg = `Day ${outcome.dayInCycle} Tribute claimed! +${outcome.coinsAwarded} Coins & +${outcome.xpAwarded} XP.`;
      if (outcome.cosmeticUnlocked) {
        const cName = getCosmeticById(outcome.cosmeticUnlocked)?.name || outcome.cosmeticUnlocked;
        msg += ` Unlocked cosmetic: ${cName}!`;
      }
      showToast(msg, 'success', 'Fealty Acknowledged');

      if (outcome.leveledUp) {
        showToast(
          `Rank Ascended! You reached Level ${outcome.newLevel}: ${outcome.newRankTitle}!`,
          'info',
          'Level Up!'
        );
      }
      if (outcome.milestoneUnlocked) {
        showToast(
          `Streak Milestone: ${outcome.milestoneUnlocked.title}!`,
          'success',
          'Milestone Achieved!'
        );
      }
    } catch (err: any) {
      showToast(err?.message || 'Unable to claim daily tribute.', 'warning', 'Treasury Notice');
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <ParchmentPanel variant="framed" className="text-center py-6">
        <div className="max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-manuscript-forest/15 text-manuscript-forest border border-emerald-800/30 text-xs font-serif font-bold uppercase tracking-widest rounded">
            <Sparkles className="w-3.5 h-3.5" />
            Daily Ledger of Fealty • UTC Reset
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-ink uppercase">
            Consecutive Loyalty Tributes
          </h2>
          <p className="text-xs sm:text-sm font-body text-ink-light">
            Report to the Citadel daily (resets at 00:00 UTC) to earn Silver Coins, XP, and exclusive cosmetics.
          </p>
        </div>
      </ParchmentPanel>

      {/* Celebratory Claim Feedback (Accessible & Motion-Safe) */}
      {recentOutcome && (
        <ParchmentPanel
          variant="bound"
          className="border-2 border-manuscript-gold bg-amber-50/90 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 transition-all motion-reduce:transition-none"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-manuscript-gold text-parchment-100 flex items-center justify-center animate-bounce motion-reduce:animate-none">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-serif font-bold text-sm text-ink">
                Tribute Inscribed for {recentOutcome.utcDate}!
              </h4>
              <p className="text-xs font-body text-ink-light">
                Received <strong>+{recentOutcome.coinsAwarded} Coins</strong> and{' '}
                <strong>+{recentOutcome.xpAwarded} XP</strong> (Streak: Day {recentOutcome.newStreak}).
              </p>
            </div>
          </div>
          {recentOutcome.milestoneUnlocked && (
            <span className="text-xs font-serif font-bold px-3 py-1 rounded bg-emerald-900 text-parchment-100">
              Milestone: {recentOutcome.milestoneUnlocked.title}
            </span>
          )}
        </ParchmentPanel>
      )}

      {/* Current Streak & Today's Reward Card */}
      <ParchmentPanel variant="sheet" className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-manuscript-gold/20 border-2 border-manuscript-gold text-amber-900 flex flex-col items-center justify-center">
              <span className="font-serif font-black text-xl leading-none">{currentStreakDisplay}</span>
              <span className="text-[9px] uppercase font-serif font-bold">Days</span>
            </div>
            <div>
              <span className="text-xs font-serif uppercase tracking-wider text-manuscript-burgundy font-bold block">
                {alreadyClaimedToday ? "Today's Tribute Claimed" : "Today's Reward Available"}
              </span>
              <h3 className="font-serif font-black text-lg text-ink">
                {todaysTier.label}: {todaysTier.coins} Coins + {todaysTier.xp} XP
              </h3>
              <p className="text-[11px] font-body text-ink-light">
                Longest Streak: <strong>{streak?.longestStreak || currentStreakDisplay}</strong> days •
                Total Claims: <strong>{streak?.totalClaims || 0}</strong>
                {daysSinceLast > 1 && lastClaimDate && (
                  <span className="text-amber-900 font-bold ml-2">
                    (Previous streak missed a UTC day and will reset to Day 1)
                  </span>
                )}
              </p>
            </div>
          </div>

          <Button
            variant="wax"
            size="md"
            icon={<Gift className="w-4 h-4" />}
            loading={isClaiming}
            disabled={alreadyClaimedToday}
            className={!alreadyClaimedToday && user ? 'ring-2 ring-manuscript-gold/60' : ''}
            onClick={handleClaim}
          >
            {!user
              ? 'Sign In to Claim'
              : alreadyClaimedToday
              ? 'Claimed for Today (UTC)'
              : `Claim Day ${nextStreakDay} Tribute`}
          </Button>
        </div>
      </ParchmentPanel>

      {/* 7-Day Reward Calendar */}
      <div className="space-y-2">
        <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-ink flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-manuscript-burgundy" />
          7-Day Repeating Reward Calendar
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {DAILY_REWARD_SCHEDULE.map((tier) => {
            const isClaimed = alreadyClaimedToday
              ? tier.day <= nextStreakDay
              : tier.day < nextStreakDay;
            const isToday = !alreadyClaimedToday && tier.day === nextStreakDay;

            return (
              <div
                key={tier.day}
                className={`p-3 rounded border text-center flex flex-col justify-between min-h-[155px] transition-all motion-reduce:transition-none ${
                  isClaimed
                    ? 'bg-emerald-950/10 border-emerald-800/40 text-emerald-950'
                    : isToday
                    ? 'bg-amber-100 border-2 border-manuscript-gold text-ink shadow-md ring-2 ring-manuscript-gold/30'
                    : 'bg-parchment-50 border-parchment-400 text-ink-light'
                }`}
              >
                <div>
                  <span className="text-[10px] font-serif uppercase tracking-wider font-bold block">
                    Day {tier.day}
                  </span>
                  <div className="my-2 flex justify-center">
                    {isClaimed ? (
                      <CheckCircle className="w-6 h-6 text-emerald-800" />
                    ) : isToday ? (
                      <Gift className="w-6 h-6 text-manuscript-burgundy animate-pulse motion-reduce:animate-none" />
                    ) : (
                      <Lock className="w-5 h-5 text-ink-light/70" />
                    )}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-xs font-serif font-bold block">{tier.coins} Coins</span>
                  <span className="text-[10px] font-mono block text-emerald-900">+{tier.xp} XP</span>
                  {tier.cosmeticItemId && (
                    <span className="text-[9px] font-serif font-bold text-manuscript-burgundy block">
                      + Cosmetic
                    </span>
                  )}
                  <span className="text-[9px] uppercase tracking-wider font-serif pt-1 block font-bold">
                    {isClaimed ? 'Claimed' : isToday ? 'Available' : 'Locked'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ManuscriptDivider label="Consecutive Streak Milestones" />

      {/* Streak Milestones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {STREAK_MILESTONES.map((ms) => {
          const unlocked =
            (streak?.milestonesClaimed || []).includes(ms.streakDays) ||
            currentStreakDisplay >= ms.streakDays;
          const cosmeticName = ms.cosmeticItemId
            ? getCosmeticById(ms.cosmeticItemId)?.name || ms.cosmeticItemId
            : null;

          return (
            <div
              key={ms.streakDays}
              className={`p-3.5 rounded border flex items-start gap-3 ${
                unlocked
                  ? 'bg-emerald-950/10 border-emerald-800/40 text-ink'
                  : 'bg-parchment-100 border-parchment-400 text-ink-light'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-parchment-200 border border-parchment-400 flex items-center justify-center shrink-0 text-manuscript-gold">
                <Award className="w-4 h-4" />
              </div>
              <div className="text-xs font-serif">
                <div className="flex items-center gap-1.5">
                  <strong className="text-ink">{ms.title}</strong>
                  {unlocked && (
                    <span className="text-[9px] uppercase px-1 rounded bg-emerald-900 text-parchment-100 font-bold">
                      Reached
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-ink-light mt-0.5">
                  +{ms.bonusCoins} Coins • +{ms.bonusXp} XP
                  {cosmeticName ? ` • ${cosmeticName}` : ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Claim History */}
      <ParchmentPanel variant="bound" className="space-y-3">
        <h3 className="font-serif font-bold text-base text-ink flex items-center gap-2">
          <History className="w-4 h-4 text-manuscript-burgundy" />
          Daily Claim History ({claimHistory.length})
        </h3>
        {!user ? (
          <p className="text-xs font-body italic text-ink-light">
            Sign in to view your attendance claim ledger.
          </p>
        ) : loadingHistory ? (
          <p className="text-xs font-body italic text-ink-light">Loading claim ledger...</p>
        ) : claimHistory.length === 0 ? (
          <p className="text-xs font-body italic text-ink-light">
            No daily claims recorded yet. Claim today&apos;s tribute above to start your streak!
          </p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {claimHistory.map((c) => (
              <div
                key={c.utcDate}
                className="p-2.5 rounded bg-parchment-100 border border-parchment-300 flex items-center justify-between text-xs font-serif"
              >
                <div>
                  <strong className="text-ink">{c.utcDate}</strong>{' '}
                  <span className="text-ink-light">
                    (Day {c.dayInCycle} • Streak #{c.streakAtClaim})
                  </span>
                </div>
                <span className="font-mono font-bold text-amber-900">
                  +{c.coinsAwarded} Coins • +{c.xpAwarded} XP
                </span>
              </div>
            ))}
          </div>
        )}
      </ParchmentPanel>

      {/* Authoritative Timezone & Anti-Cheat Notice */}
      <ParchmentPanel variant="sheet" className="text-xs font-body text-ink-light space-y-1">
        <h4 className="font-serif font-bold text-sm text-ink flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-manuscript-burgundy" />
          Authoritative Server Time ({DAILY_REWARD_RESET_STRATEGY.timezone})
        </h4>
        <p>
          {DAILY_REWARD_RESET_STRATEGY.description} Claims are enforced via immutable UTC-date receipts
          and server timestamps (`request.time`) to prevent duplicate claims, replay requests, and clock manipulation.
        </p>
      </ParchmentPanel>
    </div>
  );
};
