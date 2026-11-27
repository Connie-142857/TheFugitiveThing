import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface ManuscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const ManuscriptModal: React.FC<ManuscriptModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'md',
}) => {
  const titleId = useId();
  const descId = useId();
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus?.();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={subtitle ? descId : undefined}
    >
      {/* Background click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div
        className={`relative w-full ${maxWidthClasses[maxWidth]} bg-parchment-100 border-2 border-manuscript-charcoal rounded shadow-2xl overflow-hidden z-10 manuscript-page`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Header Ribbon */}
        <div className="bg-parchment-200 border-b border-parchment-400 px-5 py-3.5 flex items-center justify-between">
          <div>
            <h3 id={titleId} className="font-serif font-bold text-lg text-ink tracking-wide">
              {title}
            </h3>
            {subtitle && (
              <p id={descId} className="text-xs font-body italic text-ink-light mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded hover:bg-parchment-300 text-ink-light hover:text-ink transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            aria-label="Close dialogue"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[80vh] overflow-y-auto space-y-4">{children}</div>

        {/* Optional Footer */}
        {footer && (
          <div className="bg-parchment-200/80 border-t border-parchment-400 px-5 py-3 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
