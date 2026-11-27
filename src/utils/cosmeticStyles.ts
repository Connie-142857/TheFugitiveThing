// Purely Visual Cosmetic Style Mapper for The Fugitive
// Maps cosmetic item IDs to visual icons, borders, backgrounds, skins, and aura effects.

export interface CosmeticVisuals {
  avatarIconName: string | null;
  skinBgClass: string;
  skinTextClass: string;
  nameplateClass: string;
  backgroundClass: string;
  backgroundIsDark: boolean;
  effectRingClass: string;
  effectLabel: string | null;
}

const AVATAR_ICONS: Record<string, string> = {
  avatar_inquisitor: 'Eye',
  avatar_wax_seal: 'Shield',
  avatar_gilded_skull: 'Skull',
  avatar_phoenix_quill: 'Flame',
  avatar_arsonist: 'Flame',
  avatar_communist: 'Users',
  avatar_soldier: 'Shield',
  avatar_fugitive: 'Skull',
  avatar_scholar: 'Feather',
  avatar_knight: 'Crosshair',
  avatar_spy: 'KeyRound',
};

const SKIN_CLASSES: Record<string, { bg: string; text: string }> = {
  skin_default: {
    bg: 'bg-parchment-300',
    text: 'text-ink',
  },
  skin_arsonist: {
    bg: 'bg-gradient-to-br from-stone-800 via-red-950 to-amber-900',
    text: 'text-amber-200',
  },
  skin_inquisitor: {
    bg: 'bg-gradient-to-br from-[#58181f] via-[#8b1e1e] to-stone-900',
    text: 'text-parchment-100',
  },
  skin_sovereign_gold: {
    bg: 'bg-gradient-to-br from-amber-300 via-yellow-600 to-amber-900',
    text: 'text-stone-950',
  },
  skin_founder_relic: {
    bg: 'bg-gradient-to-br from-slate-900 via-amber-800 to-stone-950',
    text: 'text-amber-200',
  },
};

const NAMEPLATE_CLASSES: Record<string, string> = {
  border_parchment: 'border-2 border-[#5c462c]',
  nameplate_illuminated: 'border-[3px] border-amber-500 ring-2 ring-amber-300/60 shadow-md',
  nameplate_crimson_wax: 'border-[3px] border-[#8b1e1e] ring-2 ring-red-900/40 shadow-md',
};

const BACKGROUND_CLASSES: Record<string, { cls: string; dark: boolean }> = {
  bg_citadel_library: {
    cls: 'bg-gradient-to-br from-amber-100 via-parchment-200 to-amber-200/80 border-amber-700/50',
    dark: false,
  },
  bg_midnight_cobblestones: {
    cls: 'bg-gradient-to-br from-slate-900 via-stone-900 to-indigo-950 border-indigo-500/50',
    dark: true,
  },
  bg_royal_cathedral: {
    cls: 'bg-gradient-to-br from-purple-950 via-amber-900/80 to-emerald-950 border-manuscript-gold',
    dark: true,
  },
};

const EFFECT_CLASSES: Record<string, { ring: string; label: string }> = {
  effect_ember_sparks: {
    ring: 'ring-2 ring-orange-500/70 shadow-[0_0_16px_rgba(234,88,12,0.55)]',
    label: 'Ember Sparks',
  },
  effect_golden_halo: {
    ring: 'ring-2 ring-amber-400/90 shadow-[0_0_18px_rgba(217,119,6,0.65)]',
    label: 'Gilded Shimmer',
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
  const avatarId = equipped?.avatar || fallbackAvatarId;
  const skin = (equipped?.skin && SKIN_CLASSES[equipped.skin]) || SKIN_CLASSES.skin_default;
  const nameplate =
    (equipped?.nameplate && NAMEPLATE_CLASSES[equipped.nameplate]) ||
    NAMEPLATE_CLASSES.border_parchment;
  const bg = equipped?.background ? BACKGROUND_CLASSES[equipped.background] : undefined;
  const eff = equipped?.effect ? EFFECT_CLASSES[equipped.effect] : undefined;

  return {
    avatarIconName: (avatarId && AVATAR_ICONS[avatarId]) || null,
    skinBgClass: skin.bg,
    skinTextClass: skin.text,
    nameplateClass: nameplate,
    backgroundClass: bg?.cls || '',
    backgroundIsDark: bg?.dark || false,
    effectRingClass: eff?.ring || '',
    effectLabel: eff?.label || null,
  };
}
