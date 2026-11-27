import { Component, ErrorInfo, ReactNode } from 'react';
import { ParchmentPanel } from './ParchmentPanel';
import { Button } from './Button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ManuscriptErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Manuscript uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-2xl mx-auto my-12 animate-fadeIn">
          <ParchmentPanel variant="framed" className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-manuscript-wax text-parchment-100 flex items-center justify-center mx-auto shadow-wax-seal border-2 border-red-950">
              <AlertTriangle className="w-8 h-8 text-amber-300" />
            </div>

            <div>
              <span className="text-xs font-serif uppercase tracking-widest text-manuscript-burgundy font-bold">
                Tribunal Inscription Disturbed
              </span>
              <h2 className="text-2xl font-serif font-black text-ink mt-1">
                A Rift in the High Chronicle
              </h2>
              <p className="text-xs font-body text-ink-light mt-1 max-w-md mx-auto">
                {this.props.fallbackMessage ||
                  'An unexpected ink blot has corrupted this parchment view. The Citadel scribes have recorded the disturbance.'}
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-red-950/10 border border-red-900/30 rounded text-left text-xs font-mono text-red-950 max-h-32 overflow-auto">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="wax"
                icon={<RefreshCw className="w-4 h-4" />}
                onClick={this.handleReload}
              >
                Restore Parchment
              </Button>
              <Button
                variant="parchment"
                icon={<Home className="w-4 h-4" />}
                onClick={this.handleGoHome}
              >
                Return to Gates
              </Button>
            </div>
          </ParchmentPanel>
        </div>
      );
    }

    return this.props.children;
  }
}
