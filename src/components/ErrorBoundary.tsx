import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  resetKey?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Krypt Cleaner] page crashed:', error, info.componentStack);
  }

  componentDidUpdate(prev: Props): void {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="max-w-xl">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
          <div className="flex items-center gap-2 text-red-300 mb-2">
            <AlertTriangle size={18} />
            <h2 className="text-base font-semibold">This page hit an error</h2>
          </div>
          <p className="text-sm text-white/60 leading-relaxed">
            Something went wrong rendering this page. The rest of the app is still fine —
            switch pages from the sidebar, or reload.
          </p>
          <pre className="mt-4 text-[11px] text-red-200/80 bg-black/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
            {error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/10 border border-white/15 text-white hover:bg-white/15 transition-colors"
          >
            <RotateCcw size={14} /> Reload app
          </button>
        </div>
      </div>
    );
  }
}
