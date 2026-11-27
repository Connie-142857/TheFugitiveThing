import React from 'react';

export type ButtonVariant = 'wax' | 'ink' | 'parchment' | 'gold' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'ink',
  size = 'md',
  icon,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantClasses: Record<ButtonVariant, string> = {
    wax: 'bg-[#8b1e1e] hover:bg-[#a32424] text-[#fdfbf7] border-2 border-[#58181f] shadow-[0_3px_8px_rgba(88,24,31,0.4)] active:translate-y-0.5',
    ink: 'bg-[#271c14] hover:bg-[#423326] text-[#f0e6ce] border-2 border-[#140d09] shadow-[2px_2px_0px_rgba(0,0,0,0.5)] active:translate-y-0.5',
    parchment: 'bg-[#e5d4ad] hover:bg-[#f0e6ce] text-[#271c14] border border-[#8c6d3d] shadow-[1px_1px_0px_rgba(70,45,20,0.3)] active:translate-y-0.5',
    gold: 'bg-[#c29b38] hover:bg-[#ddb452] text-[#271c14] border-2 border-[#8c6d3d] font-bold shadow-[0_3px_8px_rgba(140,109,61,0.35)] active:translate-y-0.5',
    outline: 'bg-transparent hover:bg-parchment-300/40 text-ink border-2 border-parchment-500 active:translate-y-0.5',
    danger: 'bg-red-900 hover:bg-red-800 text-white border-2 border-red-950 shadow-[2px_2px_0px_rgba(100,0,0,0.5)] active:translate-y-0.5',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`font-serif tracking-wider uppercase font-semibold rounded inline-flex items-center justify-center gap-2 transition-all select-none disabled:opacity-50 disabled:pointer-events-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};
