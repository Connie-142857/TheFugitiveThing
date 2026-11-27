import React from 'react';
import { Scroll } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const ManuscriptEmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  action,
  icon,
}) => {
  return (
    <div className="manuscript-border p-8 rounded bg-parchment-100 text-center flex flex-col items-center justify-center max-w-md mx-auto my-6 space-y-3">
      <div className="w-14 h-14 rounded-full bg-parchment-200 border border-parchment-400 flex items-center justify-center text-manuscript-charcoal shadow-inner">
        {icon || <Scroll className="w-7 h-7 text-manuscript-burgundy opacity-80" />}
      </div>
      <h3 className="font-serif font-bold text-lg text-ink tracking-wide">{title}</h3>
      <p className="text-xs font-body text-ink-light leading-relaxed max-w-xs">{description}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};
