import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'warning' | 'danger';

export interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, duration: number = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { id, message, type, title, duration };
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast container floating in corner (above mobile nav bar) */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-20 md:bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === 'danger' ? 'alert' : 'status'}
            className={`pointer-events-auto transform transition-all duration-300 ease-out border p-3.5 rounded shadow-lg flex items-start gap-3 ${
              toast.type === 'danger'
                ? 'bg-red-950/95 border-red-700 text-red-100'
                : toast.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-700 text-emerald-100'
                : toast.type === 'warning'
                ? 'bg-amber-950/95 border-amber-600 text-amber-100'
                : 'bg-parchment-100 border-parchment-500 text-ink'
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === 'danger' && <AlertCircle className="w-5 h-5 text-red-400" />}
              {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-manuscript-gold" />}
            </div>
            <div className="flex-1 text-sm font-body">
              {toast.title && <div className="font-serif font-bold text-sm tracking-wide">{toast.title}</div>}
              <div className="text-xs leading-relaxed opacity-90">{toast.message}</div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 p-1 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Dismiss proclamation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
