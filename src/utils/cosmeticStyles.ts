// Purely Visual Cosmetic Style Mapper for The Fugitive
// - Character Skins: Icon on profile image
// - Avatars: Background of profile image
// - Nameplates: Border around profile image & dossier
// - Backgrounds: Background of the app
// - Titles: Displayed below player name
// - Effects: Screen particles & action bursts

export interface CosmeticVisuals {
  skinIconName: string;
  avatarBgClass: string;
  avatarTextClass: string;
  nameplateClass: string;
  appBgClass: string;
  appBgIsDark: boolean;
  effectType: 'embers' | 'gold' | null;
  effectRingClass: string;
  effectLabel: string | null;
}

const SKIN_ICONS: Record<string, string> = {
  skin_default: 'User',
  skin_arsonist: 'Flame',
  skin_inquisitor: 'Eye',
  skin_sovereign_gold: 'Crown',
  skin_founder_relic: 'Sparkles',
};

const AVATAR_BACKGROUNDS: Record<string, { bg: string; text: string }> = {
  avatar_inquisitor: {
    bg: 'bg-parchment-300',
    text: 'text-ink',
  },
  avatar_wax_seal: {
    bg: 'bg-gradient-to-br from-[#8b1e1e] via-[#a32424] to-[#58181f]',
    text: 'text-parchment-50',
  },
  avatar_gilded_skull: {
    bg: 'bg-gradient-to-br from-amber-300 via-yellow-600 to-amber-900',
    text: 'text-stone-950',
  },
  avatar_phoenix_quill: {
    bg: 'bg-gradient-to-br from-orange-500 via-red-700 to-stone-900',
    text: 'text-amber-100',
  },
};

const NAMEPLATE_CLASSES: Record<string, string> = {
  border_parchment: 'border-2 border-[#5c462c]',
  nameplate_illuminated: 'border-[3px] border-amber-500 ring-2 ring-amber-300/70 shadow-md',
  nameplate_crimson_wax: 'border-[3px] border-[#8b1e1e] ring-2 ring-red-900/50 shadow-md',
};

const APP_BACKGROUND_CLASSES: Record<string, { cls: string; dark: boolean }> = {
  bg_citadel_library: {
    cls: 'bg-gradient-to-br from-amber-100 via-[#efe1bd] to-amber-200',
    dark: false,
  },
  bg_midnight_cobblestones: {
    cls: 'bg-gradient-to-br from-slate-800 via-stone-800 to-indigo-950',
    dark: true,
  },
  bg_royal_cathedral: {
    cls: 'bg-gradient-to-br from-purple-950 via-amber-900 to-emerald-950',
    dark: true,
  },
};

const EFFECT_STYLES: Record<string, { type: 'embers' | 'gold'; ring: string; label: string }> = {
  effect_ember_sparks: {
    type: 'embers',
    ring: 'ring-2 ring-orange-500/80 shadow-[0_0_16px_rgba(234,88,12,0.6)]',
    label: 'Ember Sparks Aura',
  },
  effect_golden_halo: {
    type: 'gold',
    ring: 'ring-2 ring-amber-400/90 shadow-[0_0_18px_rgba(217,119,6,0.7)]',
    label: 'Gilded Seal Shimmer',
  },
};

export function resolveCosmeticVisuals(
  equipped?: {
    skin?: string;
    avatar?: string;
    nameplate?: string;
    background?: string;
    title?: string;
    effect?: string;
  },
  fallbackAvatarId?: string
): CosmeticVisuals {
  const skinId = equipped?.skin || 'skin_default';
  const avatarId = equipped?.avatar || fallbackAvatarId || 'avatar_inquisitor';
  const avatarBg = AVATAR_BACKGROUNDS[avatarId] || AVATAR_BACKGROUNDS.avatar_inquisitor;
  const nameplate =
    (equipped?.nameplate && NAMEPLATE_CLASSES[equipped.nameplate]) ||
    NAMEPLATE_CLASSES.border_parchment;
  const bg = equipped?.background ? APP_BACKGROUND_CLASSES[equipped.background] : undefined;
  const eff = equipped?.effect ? EFFECT_STYLES[equipped.effect] : undefined;

  return {
    skinIconName: SKIN_ICONS[skinId] || 'User',
    avatarBgClass: avatarBg.bg,
    avatarTextClass: avatarBg.text,
    nameplateClass: nameplate,
    appBgClass: bg?.cls || 'bg-parchment-200',
    appBgIsDark: bg?.dark || false,
    effectType: eff?.type || null,
    effectRingClass: eff?.ring || '',
    effectLabel: eff?.label || null,
  };
}
