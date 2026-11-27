import React from 'react';
import { Shield } from 'lucide-react';

interface PlayerAvatarProps {
  username: string;
  avatarUrl?: string;
  level?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isFugitive?: boolean;
  className?: string;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  username,
  avatarUrl,
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

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Framed Avatar Circle */}
      <div
        className={`${sizeClasses[size]} rounded-full border-2 ${
          isFugitive ? 'border-amber-600 bg-amber-950/30' : 'border-[#5c462c] bg-parchment-300'
        } shadow-md overflow-hidden flex items-center justify-center font-serif font-black text-ink select-none`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
        ) : (
          <span className="tracking-tighter">{initials}</span>
        )}
      </div>

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
