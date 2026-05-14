import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { I18nProvider } from "./context/I18nContext";
import queryClient from "./queryClient";
import "./index.css";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0,
    release: import.meta.env.VITE_APP_VERSION,
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <I18nProvider>
          <App />
          <Toaster
            position="top-right"
            gutter={10}
            toastOptions={{
              duration: 3500,
              style: {
                background: '#141414',
                color: '#F0F0F5',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '500',
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                padding: '10px 14px',
              },
              success: {
                duration: 3000,
                style: {
                  borderColor: 'rgba(45,212,191,0.35)',
                },
                iconTheme: { primary: '#2DD4BF', secondary: '#141414' },
              },
              error: {
                duration: 4000,
                style: {
                  borderColor: 'rgba(239,68,68,0.35)',
                },
                iconTheme: { primary: '#ef4444', secondary: '#141414' },
              },
              loading: {
                duration: 3000,
                iconTheme: { primary: '#7B72F0', secondary: '#141414' },
              },
            }}
          />
        </I18nProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
