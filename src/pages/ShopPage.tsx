import React, { useState, useMemo } from 'react';
import { ParchmentPanel } from '../components/ui/ParchmentPanel';
import { Button } from '../components/ui/Button';
import { BookTabs } from '../components/ui/BookTabs';
import { ManuscriptModal } from '../components/ui/Modal';
import { PlayerAvatar } from '../components/ui/PlayerAvatar';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  COSMETIC_CATALOGUE,
  purchaseCosmeticInFirestore,
  equipCosmeticInFirestore,
  unequipCosmeticInFirestore,
} from '../services/shopService';
import { CosmeticItem } from '../types/player';
import {
  Coins,
  Sparkles,
  Check,
  Lock,
  ShoppingBag,
  Package,
  Eye,
  ArrowUpDown,
  ShieldCheck,
} from 'lucide-react';

const RARITY_STYLES: Record<CosmeticItem['rarity'], string> = {
  common: 'bg-stone-200 text-stone-800 border-stone-400',
  rare: 'bg-sky-100 text-sky-900 border-sky-400',
  epic: 'bg-purple-100 text-purple-900 border-purple-400',
  legendary: 'bg-amber-100 text-amber-950 border-manuscript-gold',
};

const RARITY_RANK: Record<CosmeticItem['rarity'], number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

export const ShopPage: React.FC = () => {
  const { user, profile, openAuthModal } = useAuth();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<'shop' | 'inventory'>('shop');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [rarityFilter, setRarityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'rarity' | 'name'>('featured');
  const [hideOwned, setHideOwned] = useState<boolean>(false);

  const [previewItem, setPreviewItem] = useState<CosmeticItem | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const ownedSet = useMemo(() => new Set(profile?.inventory || []), [profile?.inventory]);
  const equippedMap = profile?.equippedCosmetics || {};
  const userCoins = profile?.coins ?? 0;
  const userLevel = profile?.level ?? 1;

  const isEquipped = (item: CosmeticItem) => equippedMap[item.category] === item.id;

  const featuredItems = useMemo(
    () => COSMETIC_CATALOGUE.filter((item) => item.isAvailable && item.featured),
    []
  );

  const displayedItems = useMemo(() => {
    let list = COSMETIC_CATALOGUE.filter((item) => {
      if (viewMode === 'shop') {
        if (!item.isAvailable) return false;
        if (hideOwned && ownedSet.has(item.id)) return false;
      } else {
        if (!ownedSet.has(item.id)) return false;
      }
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      if (rarityFilter !== 'all' && item.rarity !== rarityFilter) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return a.priceCoins - b.priceCoins;
        case 'price_desc':
          return b.priceCoins - a.priceCoins;
        case 'rarity':
          return RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
        case 'name':
          return a.name.localeCompare(b.name);
        case 'featured':
        default:
          return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.priceCoins - b.priceCoins;
      }
    });

    return list;
  }, [viewMode, activeCategory, rarityFilter, sortBy, hideOwned, ownedSet]);

  const handlePurchase = async (item: CosmeticItem) => {
    if (!user || !profile) {
      openAuthModal('login');
      return;
    }
    setIsProcessing(true);
    try {
      const res = await purchaseCosmeticInFirestore(user.uid, item.id, item.priceCoins);
      showToast(
        `Acquired "${res.item.name}" for ${res.item.priceCoins} Silver Coins! Remaining balance: ${res.newBalance} Coins.`,
        'success',
        'Purchase Confirmed'
      );
      setPreviewItem(null);
    } catch (err: any) {
      showToast(err?.message || 'Could not complete purchase.', 'danger', 'Purchase Failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEquip = async (item: CosmeticItem) => {
    if (!user) return;
    setIsProcessing(true);
    try {
      await equipCosmeticInFirestore(user.uid, item.id);
      showToast(`Equipped "${item.name}" on your Dossier.`, 'success', 'Regalia Equipped');
    } catch (err: any) {
      showToast(err?.message || 'Failed to equip cosmetic.', 'danger', 'Equipment Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnequip = async (item: CosmeticItem) => {
    if (!user) return;
    setIsProcessing(true);
    try {
      await unequipCosmeticInFirestore(user.uid, item.category);
      showToast(`Unequipped "${item.name}".`, 'info', 'Regalia Removed');
    } catch (err: any) {
      showToast(err?.message || 'Failed to unequip cosmetic.', 'danger', 'Equipment Error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Merchant Header & Coin Balance */}
      <ParchmentPanel variant="framed">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs font-serif uppercase tracking-widest text-manuscript-burgundy font-bold">
              The Grand Bazaar • Purely Cosmetic
            </span>
            <h2 className="text-2xl font-serif font-black text-ink">
              {viewMode === 'shop' ? "The Merchant's Catalogue" : 'My Cosmetic Inventory & Equipment'}
            </h2>
            <p className="text-xs font-body text-ink-light mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-manuscript-forest shrink-0" />
              Cosmetics never alter role abilities, combat damage, protections, or match victory rules.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-parchment-200 px-4 py-2 rounded border border-parchment-400">
              <Coins className="w-5 h-5 text-manuscript-gold" />
              <div>
                <span className="text-[10px] font-serif uppercase tracking-wider text-ink-light block">
                  Treasure Purse
                </span>
                <span className="text-lg font-serif font-bold text-ink">
                  {user ? `${userCoins} Coins` : 'Sign In'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Shop vs Inventory Switcher */}
        <div className="flex items-center gap-2 pt-4 mt-4 border-t border-parchment-300">
          <Button
            variant={viewMode === 'shop' ? 'wax' : 'parchment'}
            size="sm"
            icon={<ShoppingBag className="w-4 h-4" />}
            onClick={() => setViewMode('shop')}
          >
            Merchant Bazaar ({COSMETIC_CATALOGUE.filter((i) => i.isAvailable).length})
          </Button>
          <Button
            variant={viewMode === 'inventory' ? 'wax' : 'parchment'}
            size="sm"
            icon={<Package className="w-4 h-4" />}
            onClick={() => setViewMode('inventory')}
          >
            My Inventory ({ownedSet.size})
          </Button>
        </div>
      </ParchmentPanel>

      {/* Featured Items Spotlight (Shop mode) */}
      {viewMode === 'shop' && activeCategory === 'all' && featuredItems.length > 0 && (
        <ParchmentPanel variant="bound" className="space-y-3 border border-manuscript-gold/60 bg-amber-50/40">
          <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-manuscript-gold" />
            Featured Imperial Wares
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {featuredItems.map((item) => {
              const owned = ownedSet.has(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => setPreviewItem(item)}
                  className="p-3 rounded bg-parchment-50 border border-manuscript-gold/50 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between gap-2"
                >
                  <div>
                    <span
                      className={`text-[9px] uppercase font-serif font-bold px-1.5 py-0.5 rounded border ${RARITY_STYLES[item.rarity]}`}
                    >
                      {item.rarity}
                    </span>
                    <h4 className="font-serif font-bold text-xs text-ink mt-1.5">{item.name}</h4>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-serif pt-1 border-t border-parchment-300">
                    <span className="font-bold text-amber-900">
                      {owned ? 'Owned' : `${item.priceCoins} Coins`}
                    </span>
                    <span className="text-manuscript-burgundy underline">Preview</span>
                  </div>
                </div>
              );
            })}
          </div>
        </ParchmentPanel>
      )}

      {/* Category Tabs */}
      <BookTabs
        activeTab={activeCategory}
        onChange={setActiveCategory}
        tabs={[
          { id: 'all', label: 'All Categories' },
          { id: 'skin', label: 'Character Skins' },
          { id: 'avatar', label: 'Avatars' },
          { id: 'nameplate', label: 'Nameplates' },
          { id: 'background', label: 'Backgrounds' },
          { id: 'title', label: 'Titles' },
          { id: 'effect', label: 'Effects' },
        ]}
      />

      {/* Filter & Sort Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-parchment-100 p-3 rounded border border-parchment-300 text-xs font-serif">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-1.5 text-ink">
            <span>Rarity:</span>
            <select
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value)}
              className="bg-parchment-50 border border-parchment-400 rounded px-2 py-1 text-xs"
            >
              <option value="all">All Rarities</option>
              <option value="common">Common</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
            </select>
          </label>

          {viewMode === 'shop' && (
            <label className="flex items-center gap-1.5 cursor-pointer text-ink">
              <input
                type="checkbox"
                checked={hideOwned}
                onChange={(e) => setHideOwned(e.target.checked)}
                className="accent-manuscript-burgundy"
              />
              <span>Hide Owned</span>
            </label>
          )}
        </div>

        <label className="flex items-center gap-1.5 text-ink">
          <ArrowUpDown className="w-3.5 h-3.5 text-ink-light" />
          <span>Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-parchment-50 border border-parchment-400 rounded px-2 py-1 text-xs"
          >
            <option value="featured">Featured</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rarity">Rarity: Highest</option>
            <option value="name">Name (A–Z)</option>
          </select>
        </label>
      </div>

      {/* Item Grid */}
      {displayedItems.length === 0 ? (
        <ParchmentPanel variant="sheet" className="text-center py-10 text-xs font-body italic text-ink-light">
          {viewMode === 'inventory'
            ? 'No owned cosmetics match this filter yet. Visit the Merchant Bazaar to acquire regalia.'
            : 'No wares match your selected filters.'}
        </ParchmentPanel>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedItems.map((item) => {
            const owned = ownedSet.has(item.id);
            const equipped = isEquipped(item);
            const levelLocked = !!(item.minLevel && userLevel < item.minLevel);
            const canAfford = userCoins >= item.priceCoins;

            return (
              <ParchmentPanel
                key={item.id}
                variant="sheet"
                className={`flex flex-col justify-between space-y-3 border ${
                  equipped ? 'border-manuscript-forest ring-1 ring-manuscript-forest/40' : ''
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-serif uppercase font-bold px-2 py-0.5 rounded border ${RARITY_STYLES[item.rarity]}`}
                    >
                      {item.rarity}
                    </span>
                    <span className="text-[10px] font-mono uppercase text-ink-light">
                      {item.category}
                    </span>
                  </div>

                  <h4 className="font-serif font-bold text-base text-ink flex items-center gap-1.5">
                    <span>{item.name}</span>
                    {equipped && (
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-900 text-parchment-100 font-bold">
                        Equipped
                      </span>
                    )}
                    {owned && !equipped && (
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-parchment-300 text-ink font-bold">
                        Owned
                      </span>
                    )}
                  </h4>

                  <p className="text-xs font-body text-ink-light leading-relaxed">{item.description}</p>

                  {item.minLevel && (
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-serif ${
                        levelLocked ? 'text-red-900 font-bold' : 'text-ink-light'
                      }`}
                    >
                      {levelLocked && <Lock className="w-3 h-3" />}
                      Requires Rank Level {item.minLevel}
                    </span>
                  )}
                </div>

                <div className="pt-3 border-t border-parchment-300 flex items-center justify-between gap-2">
                  <span className="font-serif font-bold text-sm text-amber-900 flex items-center gap-1">
                    <Coins className="w-4 h-4 text-manuscript-gold" />
                    {item.priceCoins === 0 ? 'Free' : `${item.priceCoins} Coins`}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Eye className="w-3.5 h-3.5" />}
                      onClick={() => setPreviewItem(item)}
                      title="Preview Cosmetic"
                    >
                      Preview
                    </Button>

                    {owned ? (
                      equipped ? (
                        <Button
                          variant="parchment"
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => handleUnequip(item)}
                        >
                          Unequip
                        </Button>
                      ) : (
                        <Button
                          variant="wax"
                          size="sm"
                          disabled={isProcessing}
                          icon={<Check className="w-3.5 h-3.5" />}
                          onClick={() => handleEquip(item)}
                        >
                          Equip
                        </Button>
                      )
                    ) : (
                      <Button
                        variant="wax"
                        size="sm"
                        disabled={!user || levelLocked || !canAfford || isProcessing}
                        onClick={() => setPreviewItem(item)}
                      >
                        {!user
                          ? 'Sign In'
                          : levelLocked
                          ? `Lvl ${item.minLevel}`
                          : !canAfford
                          ? 'Low Coin'
                          : 'Acquire'}
                      </Button>
                    )}
                  </div>
                </div>
              </ParchmentPanel>
            );
          })}
        </div>
      )}

      {/* Cosmetic Preview & Purchase Confirmation Modal */}
      <ManuscriptModal
        isOpen={!!previewItem}
        onClose={() => setPreviewItem(null)}
        title={previewItem ? `Cosmetic Inspection: ${previewItem.name}` : ''}
      >
        {previewItem && (
          <div className="space-y-4">
            {/* Live Preview Card */}
            <div className="p-4 rounded-lg border-2 border-parchment-500 bg-parchment-200/70 flex items-center gap-4">
              <PlayerAvatar
                username={profile?.username || 'Hunter'}
                size="lg"
                level={userLevel}
              />
              <div>
                <span
                  className={`text-[9px] uppercase font-serif font-bold px-1.5 py-0.5 rounded border ${RARITY_STYLES[previewItem.rarity]}`}
                >
                  {previewItem.rarity} • {previewItem.category}
                </span>
                <h4 className="font-serif font-black text-base text-ink mt-1">
                  {profile?.username || 'Hunter'}
                </h4>
                <p className="text-xs font-serif text-manuscript-burgundy">
                  {previewItem.category === 'title' ? previewItem.assetPath : previewItem.name}
                </p>
              </div>
            </div>

            <p className="text-xs font-body text-ink-light">{previewItem.description}</p>

            <div className="p-2.5 rounded bg-emerald-950/10 border border-emerald-800/30 text-[11px] font-serif text-emerald-950">
              Purely Cosmetic Guarantee: Equipping this item grants zero gameplay, ability, or combat advantages.
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-parchment-300">
              <span className="font-serif font-bold text-sm text-amber-900 flex items-center gap-1">
                <Coins className="w-4 h-4 text-manuscript-gold" />
                Price: {previewItem.priceCoins} Coins
              </span>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPreviewItem(null)}>
                  Close
                </Button>
                {ownedSet.has(previewItem.id) ? (
                  isEquipped(previewItem) ? (
                    <Button
                      variant="parchment"
                      size="sm"
                      loading={isProcessing}
                      onClick={() => handleUnequip(previewItem)}
                    >
                      Unequip
                    </Button>
                  ) : (
                    <Button
                      variant="wax"
                      size="sm"
                      loading={isProcessing}
                      onClick={() => handleEquip(previewItem)}
                    >
                      Equip Now
                    </Button>
                  )
                ) : (
                  <Button
                    variant="wax"
                    size="sm"
                    loading={isProcessing}
                    disabled={
                      !user ||
                      userCoins < previewItem.priceCoins ||
                      !!(previewItem.minLevel && userLevel < previewItem.minLevel)
                    }
                    onClick={() => handlePurchase(previewItem)}
                  >
                    Confirm Purchase
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </ManuscriptModal>
    </div>
  );
};
