import { Component } from "react";
import * as Sentry from "@sentry/react";

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    // Stale chunk after a new deploy — hard reload to fetch fresh bundle
    if (error?.message?.includes("Failed to fetch dynamically imported module")) {
      window.location.reload();
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    Sentry.captureException(error, { extra: info });
  }

  // Reset error state when the route changes without unmounting children
  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-center max-w-lg">
            <h2 className="text-lg font-semibold text-slate-100 mb-1">Etwas ist schiefgelaufen</h2>
            <p className="text-sm text-slate-400 mb-3">Die Seite konnte nicht geladen werden.</p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-xs text-left bg-white/5 text-red-400 rounded-lg p-3 mb-3 overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 text-sm font-semibold bg-gradient-to-r from-brand-500 to-accent-600 text-white rounded-lg shadow-md shadow-brand-500/30 transition-all hover:from-brand-400 hover:to-accent-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              Erneut versuchen
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
