import { Component } from "react";
import * as Sentry from "@sentry/react";
import { getAnalyticsConsent } from "./CookieConsentBanner";

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
    // Only forward errors to Sentry after explicit analytics consent
    // and once Sentry has been initialized.
    try {
      if (getAnalyticsConsent() === true && Sentry.getClient()) {
        Sentry.captureException(error, { extra: info });
      }
    } catch {
      // Swallow any telemetry errors; never disrupt UX
    }
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
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-error)]/10 border border-[var(--color-error)]/25">
            <svg className="w-6 h-6 text-[var(--color-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-center max-w-lg">
            <h2 className="text-[18px] font-semibold tracking-tight text-[var(--color-fg)] mb-1.5">Etwas ist schiefgelaufen</h2>
            <p className="text-[13px] text-[var(--color-fg-muted)] mb-4">Die Seite konnte nicht geladen werden.</p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-[11px] text-left bg-[var(--color-bg-elev-1)] text-[var(--color-error)] border border-[var(--color-border-subtle)] rounded-lg p-3 mb-4 overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-[13px] font-semibold rounded-lg bg-[var(--color-accent-500)] text-white transition-colors hover:bg-[var(--color-accent-400)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
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
