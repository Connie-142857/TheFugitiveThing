import React from 'react';

export const OrnamentalFlourish: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center justify-center gap-3 my-4 ${className}`}>
      <div className="h-px bg-gradient-to-r from-transparent via-parchment-500 to-parchment-600 flex-1 max-w-xs" />
      <svg
        className="w-6 h-6 text-manuscript-burgundy flex-shrink-0 opacity-80"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2L14.5 8.5L21 9L16 14L17.5 21L12 17.5L6.5 21L8 14L3 9L9.5 8.5L12 2Z" />
      </svg>
      <div className="h-px bg-gradient-to-l from-transparent via-parchment-500 to-parchment-600 flex-1 max-w-xs" />
    </div>
  );
};

export const ManuscriptDivider: React.FC<{ label?: string; className?: string }> = ({
  label,
  className = '',
}) => {
  if (label) {
    return (
      <div className={`relative flex items-center justify-center my-6 ${className}`}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-parchment-400" />
        </div>
        <div className="relative bg-parchment-100 px-4 py-1 text-xs font-serif font-bold uppercase tracking-widest text-manuscript-burgundy border border-parchment-400 rounded">
          {label}
        </div>
      </div>
    );
  }

  return (
    <div className={`my-4 border-t border-dashed border-parchment-400 ${className}`} />
  );
};
