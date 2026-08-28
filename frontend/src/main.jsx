import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { I18nProvider } from "./context/I18nContext";
import { ThemeProvider } from "./context/ThemeContext";
import "./index.css";
import { getAnalyticsConsent } from "./components/CookieConsentBanner";

// Only initialize Sentry when the user has explicitly opted into analytics.
// This aligns telemetry with the cookie-consent promise.
if (import.meta.env.VITE_SENTRY_DSN && getAnalyticsConsent() === true) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
    release: import.meta.env.VITE_APP_VERSION,
  });
}

// Listen for a later opt-in and init Sentry dynamically.
window.addEventListener("cookie-consent-changed", (e) => {
  if (e.detail?.analytics && import.meta.env.VITE_SENTRY_DSN && !Sentry.getClient()) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0,
      release: import.meta.env.VITE_APP_VERSION,
    });
  }
});

// WebMCP: expose read-only workspace tools to MCP clients (Chrome 152+ with
// WebMCPTesting flag). Opt-in via env; dynamic import so the module never
// lands in the main bundle and absence of the API is a graceful no-op.
if (import.meta.env.VITE_ENABLE_WEBMCP === "1") {
  Promise.all([
    import("./webmcp/tools/workspace"),
    import("./webmcp/register"),
  ])
    .then(([tools, reg]) => {
      reg.installDebugSurface(tools.TOOL_DEFS);
      const result = reg.registerWebMcpTools(tools.TOOL_DEFS);
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.info("[webmcp]", result);
      }
      if (import.meta.hot) {
        import.meta.hot.dispose(() => reg.unregisterWebMcpTools());
      }
    })
    .catch(() => {/* webmcp is best-effort; never block app boot */});
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </ThemeProvider>
      {/* Bottom-right keeps toasts clear of browser translation UI (top-center)
          and the mobile bottom nav / CV selection dock (raised via .ja-toast-region). */}
      <Toaster
        position="bottom-right"
        containerClassName="ja-toast-region"
        containerStyle={{ right: 24, bottom: 24 }}
        gutter={10}
        toastOptions={{
          duration: 3500,
          style: {
            background: 'var(--color-bg-elev-2)',
            color: 'var(--color-fg)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: '500',
            boxShadow: 'var(--ja-shadow-card)',
            padding: '10px 14px',
          },
          success: {
            duration: 3000,
            iconTheme: { primary: 'var(--ja-success)', secondary: 'var(--color-bg-elev-2)' },
          },
          error: {
            duration: 4000,
            iconTheme: { primary: 'var(--ja-error)', secondary: 'var(--color-bg-elev-2)' },
          },
          loading: {
            duration: 3000,
            iconTheme: { primary: 'var(--color-accent-500)', secondary: 'var(--color-bg-elev-2)' },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
