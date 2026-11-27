import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ManuscriptErrorState: React.FC<ErrorStateProps> = ({
  title = 'A Grievous Error Has Occurred',
  message,
  onRetry,
}) => {
  return (
    <div className="border-2 border-red-900/60 bg-red-950/10 p-6 rounded text-center max-w-md mx-auto my-6 space-y-3 shadow-md">
      <div className="w-12 h-12 rounded-full bg-red-900/20 text-red-900 flex items-center justify-center mx-auto border border-red-800">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="font-serif font-bold text-lg text-red-950">{title}</h3>
      <p className="text-xs font-body text-red-900 leading-relaxed">{message}</p>
      {onRetry && (
        <div className="pt-2">
          <Button variant="danger" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={onRetry}>
            Seek Resolution (Retry)
          </Button>
        </div>
      )}
    </div>
  );
};
