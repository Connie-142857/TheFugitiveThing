import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const ManuscriptInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-serif font-bold text-ink uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-light">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full bg-parchment-50 border border-parchment-500 rounded px-3 py-2 text-sm text-ink placeholder:text-ink-light/50 focus:outline-none focus:ring-2 focus:ring-manuscript-gold focus:border-manuscript-charcoal font-body shadow-inner transition-colors ${
              icon ? 'pl-9' : ''
            } ${error ? 'border-red-600 focus:ring-red-600' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-800 font-serif font-semibold">{error}</p>}
        {hint && !error && <p className="text-xs text-ink-light font-body italic">{hint}</p>}
      </div>
    );
  }
);
ManuscriptInput.displayName = 'ManuscriptInput';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { label: string; value: string | number }[];
}

export const ManuscriptSelect = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-serif font-bold text-ink uppercase tracking-wider">
            {label}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`w-full bg-parchment-50 border border-parchment-500 rounded px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-manuscript-gold focus:border-manuscript-charcoal font-serif shadow-inner transition-colors ${
            error ? 'border-red-600 focus:ring-red-600' : ''
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-800 font-serif font-semibold">{error}</p>}
        {hint && !error && <p className="text-xs text-ink-light font-body italic">{hint}</p>}
      </div>
    );
  }
);
ManuscriptSelect.displayName = 'ManuscriptSelect';
