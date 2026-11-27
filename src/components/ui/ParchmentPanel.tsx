import React from 'react';

export type PanelVariant = 'sheet' | 'bound' | 'framed' | 'banner' | 'scroll';

interface ParchmentPanelProps {
  children: React.ReactNode;
  variant?: PanelVariant;
  className?: string;
}

export const ParchmentPanel: React.FC<ParchmentPanelProps> = ({
  children,
  variant = 'sheet',
  className = '',
}) => {
  if (variant === 'framed') {
    return (
      <div className={`manuscript-border p-5 rounded bg-parchment-100 ${className}`}>
        {children}
      </div>
    );
  }

  if (variant === 'bound') {
    return (
      <div
        className={`relative bg-parchment-100 border-l-4 border-l-[#3d2b1f] border-t border-r border-b border-parchment-400 p-6 rounded shadow-md ${className}`}
      >
        {/* Left Stitching Effect */}
        <div className="absolute left-1.5 top-0 bottom-0 flex flex-col justify-around py-3 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-1.5 h-3 bg-[#241710] rounded-sm opacity-60" />
          ))}
        </div>
        <div className="pl-3">{children}</div>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div
        className={`relative bg-gradient-to-r from-parchment-200 via-parchment-100 to-parchment-200 border-y-2 border-manuscript-gold p-4 text-center shadow-sm ${className}`}
      >
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-3 bg-manuscript-gold/40 rounded-full" />
        {children}
      </div>
    );
  }

  if (variant === 'scroll') {
    return (
      <div className={`relative p-6 bg-parchment-100 border-y-4 border-[#8c6d3d] shadow-lg rounded-sm ${className}`}>
        {/* Scroll rolled ends */}
        <div className="absolute -top-2 left-0 right-0 h-2 bg-[#8c6d3d] rounded-t-sm shadow-inner" />
        <div className="absolute -bottom-2 left-0 right-0 h-2 bg-[#8c6d3d] rounded-b-sm shadow-inner" />
        {children}
      </div>
    );
  }

  // Default 'sheet'
  return (
    <div
      className={`bg-parchment-50 border border-parchment-400 p-5 rounded shadow-sm hover:shadow transition-shadow ${className}`}
    >
      {children}
    </div>
  );
};
