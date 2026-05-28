import { Link, useLocation } from "react-router-dom";
import { Sparkles, ArrowLeft } from "lucide-react";

/**
 * Shared shell for static legal / marketing pages (Terms, Privacy, Impressum,
 * Contact). Mirrors the landing/auth visual language — page-level radial
 * glows, transparent header, narrow centered content column.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children   Page body (sections).
 * @param {string} props.title               H1 title for the page.
 * @param {string} [props.subtitle]          Small caption under the title (e.g. "Stand: …").
 * @param {boolean} [props.wide]              If true, content spans the full 12-col grid (for card grids like pricing).
 */
export default function LegalLayout({ children, title, subtitle, wide = false }) {
  const location = useLocation();
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[var(--color-bg)] text-[var(--color-fg)] font-sans" style={{ isolation: 'isolate' }}>
      {/* Top + bottom radial glows — match the landing page */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(124,92,255,0.18), transparent 70%)",
          willChange: "transform",
          contain: "paint",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[320px]"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 100%, rgba(124,92,255,0.10), transparent 70%)",
          willChange: "transform",
          contain: "paint",
        }}
      />

      {/* Top bar */}
      <header className="relative z-10">
        <div className="mx-auto grid max-w-[1200px] grid-cols-12 items-center gap-4 px-5 py-5 sm:px-8">
          <Link
            to="/"
            className="col-span-6 inline-flex items-center gap-1.5 text-[13px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Zur Startseite
          </Link>
          <Link to="/" className="col-span-6 flex items-center gap-2 justify-self-end">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--color-accent-500)]">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">JobAssist</span>
          </Link>
        </div>
      </header>

      <main key={location.pathname} className="relative z-10 auth-card-enter">
        <div className="mx-auto grid max-w-[1200px] grid-cols-12 gap-6 px-5 sm:px-8 pt-10 pb-16">
          <div
            className={
              wide
                ? "col-span-12"
                : "col-span-12 md:col-span-10 md:col-start-2 lg:col-span-8 lg:col-start-3"
            }
          >
            <div className={`mb-12 ${wide ? "text-center max-w-[720px] mx-auto" : ""}`}>
              <h1 className="text-[36px] sm:text-[48px] font-semibold tracking-tight leading-[1.1] text-[var(--color-fg)]">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-3 text-[13px] text-[var(--color-fg-dim)]">{subtitle}</p>
              )}
            </div>
            {children}

            {/* Footer link strip */}
            <div className="mt-10 mb-4 pt-6 border-t border-[var(--color-border-subtle)] flex flex-wrap justify-center gap-5 text-[12px] text-[var(--color-fg-dim)]">
              <Link to="/pricing"   className="hover:text-[var(--color-accent-300)] transition-colors">Preise</Link>
              <Link to="/terms"     className="hover:text-[var(--color-accent-300)] transition-colors">AGB</Link>
              <Link to="/privacy"   className="hover:text-[var(--color-accent-300)] transition-colors">Datenschutz</Link>
              <Link to="/impressum" className="hover:text-[var(--color-accent-300)] transition-colors">Impressum</Link>
              <Link to="/contact"   className="hover:text-[var(--color-accent-300)] transition-colors">Kontakt</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
