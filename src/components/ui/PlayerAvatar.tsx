import React from 'react';
import {
  Shield,
  Eye,
  Skull,
  Flame,
  Users,
  Feather,
  Crosshair,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { PlayerProfile } from '../../types/player';
import { resolveCosmeticVisuals } from '../../utils/cosmeticStyles';

interface PlayerAvatarProps {
  username: string;
  avatarUrl?: string;
  avatarId?: string;
  equippedCosmetics?: PlayerProfile['equippedCosmetics'];
  level?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isFugitive?: boolean;
  className?: string;
}

function renderAvatarEmblem(iconName: string | null, size: 'sm' | 'md' | 'lg' | 'xl') {
  if (!iconName) return null;
  const iconCls =
    size === 'sm'
      ? 'w-4 h-4'
      : size === 'md'
      ? 'w-5 h-5'
      : size === 'lg'
      ? 'w-7 h-7'
      : 'w-9 h-9';

  switch (iconName) {
    case 'Eye':
      return <Eye className={iconCls} />;
    case 'Shield':
      return <Shield className={iconCls} />;
    case 'Skull':
      return <Skull className={iconCls} />;
    case 'Flame':
      return <Flame className={iconCls} />;
    case 'Users':
      return <Users className={iconCls} />;
    case 'Feather':
      return <Feather className={iconCls} />;
    case 'Crosshair':
      return <Crosshair className={iconCls} />;
    case 'KeyRound':
      return <KeyRound className={iconCls} />;
    default:
      return null;
  }
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  username,
  avatarUrl,
  avatarId,
  equippedCosmetics,
  level = 1,
  size = 'md',
  isFugitive = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-20 h-20 text-2xl',
  };

  const initials = username
    ? username
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '??';

  const visuals = resolveCosmeticVisuals(equippedCosmetics, avatarId);
  const emblem = renderAvatarEmblem(visuals.avatarIconName, size);

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Framed Avatar Circle with Equipped Skin, Nameplate & Effect Aura */}
      <div
        className={`${sizeClasses[size]} rounded-full ${
          isFugitive
            ? 'border-2 border-amber-600 bg-amber-950/30 text-ink'
            : `${visuals.nameplateClass} ${visuals.skinBgClass} ${visuals.skinTextClass}`
        } ${visuals.effectRingClass} shadow-md overflow-hidden flex items-center justify-center font-serif font-black select-none transition-all`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
        ) : emblem ? (
          emblem
        ) : (
          <span className="tracking-tighter">{initials}</span>
        )}
      </div>

      {/* Cosmetic Effect Sparkle Badge */}
      {visuals.effectLabel && size !== 'sm' && (
        <div
          className="absolute -top-1 -left-1 bg-amber-500 text-stone-950 rounded-full p-0.5 shadow border border-amber-800 animate-pulse motion-reduce:animate-none"
          title={visuals.effectLabel}
        >
          <Sparkles className="w-3 h-3" />
        </div>
      )}

      {/* Level Tag Ribbon */}
      {level !== undefined && size !== 'sm' && (
        <div className="absolute -bottom-1 -right-1 bg-manuscript-charcoal text-parchment-100 text-[10px] font-serif font-bold px-1.5 py-0.2 rounded-full border border-manuscript-gold flex items-center gap-0.5 shadow-sm">
          <span>{level}</span>
        </div>
      )}

      {/* Fugitive Mark */}
      {isFugitive && (
        <div
          className="absolute -top-1 -right-1 bg-amber-600 text-white rounded-full p-0.5 shadow border border-amber-800"
          title="The Fugitive"
        >
          <Shield className="w-3 h-3" />
        </div>
      )}
    </div>
  );
};
