import React from 'react';
import { Hourglass } from 'lucide-react';

interface LoadingProps {
  label?: string;
  sublabel?: string;
  fullScreen?: boolean;
}

export const ManuscriptLoading: React.FC<LoadingProps> = ({
  label = 'Inscribing parchment...',
  sublabel = 'Awaiting authoritative dispatch',
  fullScreen = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center text-center p-8 space-y-3">
      <div className="relative">
        <Hourglass className="w-10 h-10 text-manuscript-burgundy animate-spin duration-1000" />
        <div className="w-3 h-3 bg-manuscript-gold rounded-full absolute -top-1 -right-1 animate-ping" />
      </div>
      <div>
        <h4 className="font-serif font-bold text-base text-ink tracking-wide">{label}</h4>
        {sublabel && <p className="text-xs font-body italic text-ink-light mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-parchment-200/90 backdrop-blur-xs">
        <div className="manuscript-border p-6 rounded bg-parchment-100 shadow-xl max-w-sm w-full mx-4">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
