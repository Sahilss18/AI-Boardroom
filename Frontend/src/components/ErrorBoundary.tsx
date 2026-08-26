import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React UI error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#040711] text-slate-100 flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
          <div className="absolute inset-0 cyber-grid-overlay pointer-events-none opacity-20" />
          <div className="relative z-10 max-w-lg w-full p-8 rounded-[24px] bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-[#060914] border border-rose-500/40 shadow-[0_0_50px_rgba(244,63,94,0.2)] backdrop-blur-2xl text-center flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-500/50 flex items-center justify-center text-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.3)]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h2
                style={{ fontFamily: "'Michroma', sans-serif" }}
                className="text-lg sm:text-xl font-bold text-white uppercase tracking-wider"
              >
                Interface Rendering Exception
              </h2>
              <p
                style={{ fontFamily: "'Exo 2', sans-serif" }}
                className="text-xs sm:text-sm text-slate-400 mt-2"
              >
                The boardroom interface encountered an unexpected rendering error.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full p-3.5 rounded-xl bg-slate-950/80 border border-rose-500/30 text-rose-300 text-xs font-mono text-left max-h-32 overflow-y-auto break-all">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReset}
              style={{ fontFamily: "'Michroma', sans-serif" }}
              className="px-6 py-3 rounded-xl border border-cyan-400/80 bg-gradient-to-r from-neon-cyan via-cyan-400 to-sky-400 text-slate-950 font-bold text-xs tracking-wider uppercase flex items-center gap-2 hover:shadow-[0_0_30px_rgba(0,240,255,0.6)] hover:scale-105 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Interface</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
