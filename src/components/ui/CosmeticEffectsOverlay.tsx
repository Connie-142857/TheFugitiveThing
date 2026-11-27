import React, { useEffect, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  dx: number;
  dy: number;
}

interface CosmeticEffectsOverlayProps {
  effectId?: string;
  contained?: boolean;
}

export const CosmeticEffectsOverlay: React.FC<CosmeticEffectsOverlayProps> = ({
  effectId,
  contained = false,
}) => {
  const { preferences } = useSettings();
  const [bursts, setBursts] = useState<Particle[]>([]);

  const isEmbers = effectId === 'effect_ember_sparks';
  const isGold = effectId === 'effect_golden_halo';

  useEffect(() => {
    if ((!isEmbers && !isGold) || preferences.reducedMotion || contained) return;

    const handleClick = (e: MouseEvent) => {
      const nowId = Date.now() + Math.random();
      const newParticles: Particle[] = Array.from({ length: 6 }, (_, i) => ({
        id: nowId + i,
        x: e.clientX,
        y: e.clientY,
        size: 4 + (i % 3) * 2,
        dx: (Math.random() - 0.5) * 48,
        dy: -16 - Math.random() * 34,
      }));
      setBursts((prev) => [...prev.slice(-18), ...newParticles]);
      setTimeout(() => {
        setBursts((prev) => prev.filter((p) => !newParticles.some((np) => np.id === p.id)));
      }, 650);
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [isEmbers, isGold, preferences.reducedMotion, contained]);

  if (!isEmbers && !isGold) return null;
  if (preferences.reducedMotion) return null;

  const ambientDots = Array.from({ length: contained ? 8 : 14 }, (_, i) => ({
    left: `${(i * 19 + 7) % 94}%`,
    top: `${(i * 29 + 11) % 88}%`,
    delay: `${(i * 0.45).toFixed(2)}s`,
    size: i % 2 === 0 ? 'w-1.5 h-1.5' : 'w-2 h-2',
  }));

  const colorClass = isEmbers
    ? 'bg-orange-500 shadow-[0_0_8px_rgba(234,88,12,0.9)]'
    : 'bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.95)]';

  return (
    <div
      aria-hidden="true"
      className={`${
        contained ? 'absolute inset-0' : 'fixed inset-0'
      } pointer-events-none overflow-hidden z-20`}
    >
      {/* Ambient Screen Particles */}
      {ambientDots.map((dot, idx) => (
        <span
          key={idx}
          className={`absolute rounded-full opacity-60 animate-pulse ${dot.size} ${colorClass}`}
          style={{ left: dot.left, top: dot.top, animationDelay: dot.delay }}
        />
      ))}

      {/* Action / Click Burst Particles */}
      {bursts.map((p) => (
        <span
          key={p.id}
          className={`fixed rounded-full transition-all duration-500 opacity-85 ${colorClass}`}
          style={{
            left: p.x + p.dx,
            top: p.y + p.dy,
            width: p.size,
            height: p.size,
          }}
        />
      ))}
    </div>
  );
};
