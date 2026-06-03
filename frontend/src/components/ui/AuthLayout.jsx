import { Link, useLocation } from "react-router-dom";
import { Sparkles, ArrowLeft } from "lucide-react";

/**
 * Auth shell — Cron-style centered single column over the same page-level
 * radial purple glows used by the landing page. Form lives in a soft elevated
 * card. Top bar carries the back-to-home link and brand mark.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children  Form content (intro + form).
 * @param {string} [props.backTo]           Override the back link (defaults to "/").
 * @param {string} [props.backLabel]        Override the back link label.
 */
export default function AuthLayout({ children, backTo = "/", backLabel = "Zur Startseite" }) {
  const location = useLocation();
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[var(--color-bg)] text-[var(--color-fg)] font-sans">
      {/* Top radial purple glow — matches the landing hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[700px]"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(124,92,255,0.22), transparent 70%)",
        }}
      />
      {/* Bottom radial purple glow — matches the landing footer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[600px]"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(124,92,255,0.18), transparent 70%)",
        }}
      />

      {/* Top bar — back link + brand mark */}
      <header className="relative z-10">
        <div className="mx-auto grid max-w-[1200px] grid-cols-12 items-center gap-4 px-5 py-5 sm:px-8">
          <Link
            to={backTo}
            className="col-span-6 inline-flex items-center gap-1.5 text-[13px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
          <Link to="/" className="col-span-6 flex items-center gap-2 justify-self-end">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-accent-500)]">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">JobAssist</span>
          </Link>
        </div>
      </header>

      {/* Centered card */}
      <main className="relative z-10">
        <div className="mx-auto grid max-w-[1200px] grid-cols-12 gap-6 px-5 sm:px-8 pt-6 pb-20">
          <div className="col-span-12 md:col-span-8 md:col-start-3 lg:col-span-6 lg:col-start-4">
            <div
              key={location.pathname}
              className="auth-card-enter rounded-2xl border border-[var(--color-border)] p-7 sm:p-9 backdrop-blur-sm"
              style={{ background: "rgba(255,255,255,0.72)" }}
            >
              {children}
            </div>

            {/* Tiny legal strip under the card */}
            <div className="mt-6 flex justify-center gap-5 text-[11px] text-[var(--color-fg-dim)]">
              <Link to="/terms"     className="hover:text-[var(--color-fg-muted)] transition-colors">AGB</Link>
              <Link to="/privacy"   className="hover:text-[var(--color-fg-muted)] transition-colors">Datenschutz</Link>
              <Link to="/impressum" className="hover:text-[var(--color-fg-muted)] transition-colors">Impressum</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
