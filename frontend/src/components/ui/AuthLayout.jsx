import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

/**
 * Auth shell — split-screen desktop, stacked mobile.
 *
 * All theme-sensitive inline styles carry transition: var(--ja-auth-transition)
 * so the entire auth scene transitions as one coordinated system in ~110ms.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children  Form content (heading + form + footer link).
 * @param {string} [props.backTo]           Override back link (defaults to "/").
 * @param {string} [props.backLabel]        Override back link label.
 */
export default function AuthLayout({ children, backTo = "/", backLabel = "Zur Startseite" }) {
  const location = useLocation();
  const { preference, setTheme } = useTheme();

  const iconCls = "w-3.5 h-3.5";

  const t = "var(--ja-auth-transition)";

  return (
    <div className="relative min-h-screen font-sans antialiased"
      style={{ background: "var(--ja-auth-page-bg, #faf9f7)", color: "var(--ja-auth-text, #171717)", transition: t }}>
      {/* ── Minimal auth header ──────────────────────────────────── */}
      <header className="relative z-20">
        <div className="mx-auto flex items-center justify-between px-5 py-4 sm:px-8 max-w-[1240px]">
          <Link to="/" className="flex items-center gap-2.5" aria-label="JobAssist Startseite">
            <span className="grid h-7 w-7 place-items-center rounded-sm bg-[#e30613]">
              <span className="text-white text-[10px] font-bold leading-none">JA</span>
            </span>
            <span className="text-[15px] font-bold tracking-[-0.02em]" style={{ color: "var(--ja-auth-text, #171717)", transition: t }}>JobAssist</span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Subtle theme toggle */}
            <div className="flex items-center rounded-full border p-0.5 gap-0.5"
              style={{ borderColor: "var(--ja-auth-border, #e7e6e3)", transition: t }}>
              {(["system", "light", "dark"]).map((tPref) => {
                const isActive = preference === tPref;
                const label = tPref === "system" ? "System" : tPref === "light" ? "Hell" : "Dunkel";
                const Icon = tPref === "system" ? Monitor : tPref === "light" ? Sun : Moon;
                return (
                  <button
                    key={tPref}
                    type="button"
                    onClick={() => setTheme(tPref)}
                    className="grid place-items-center w-7 h-7 rounded-full"
                    style={{
                      background: isActive ? "var(--ja-auth-theme-active, #fff)" : "transparent",
                      transition: "background-color 130ms ease-out",
                    }}
                    title={label}
                    aria-label={label}
                    aria-pressed={isActive}
                  >
                    <Icon className={iconCls} style={{ color: isActive ? "var(--ja-auth-text, #171717)" : "var(--ja-auth-muted, #909090)", transition: "color 110ms ease-out" }} />
                  </button>
                );
              })}
            </div>

            <Link
              to={backTo}
              className="inline-flex items-center gap-1.5 text-[13px] hover:underline"
              style={{ color: "var(--ja-auth-muted, #909090)", transition: t }}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {backLabel}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Split-screen body ────────────────────────────────────── */}
      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-68px)] max-w-[1240px] px-5 pb-16 sm:px-8">
        <div className="grid w-full grid-cols-1 lg:grid-cols-12 gap-0 items-center min-w-0">

          {/* ═══ LEFT: Brand + Product context ════════════════════ */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-center pr-12 min-w-0">
            {/* Red eyebrow — brand-red, does not theme */}
            <div className="flex items-center gap-2 mb-4 auth-left-enter" style={{ animationDelay: "0ms" }}>
              <span aria-hidden className="block w-0 h-0" style={{ borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: "7px solid #e30613" }} />
              <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#e30613]">Für Österreich. Für deine Karriere.</span>
            </div>

            <h1 className="font-bold tracking-[-0.045em] leading-[0.98] text-balance auth-left-enter"
              style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)", color: "var(--ja-auth-text, #171717)", transition: t, animationDelay: "35ms" }}>
              Bewerbungen.<br />Einfach gemacht.
            </h1>

            <p className="mt-4 text-[14px] leading-relaxed max-w-[400px] auth-left-enter"
              style={{ color: "var(--ja-auth-secondary, #666)", transition: t, animationDelay: "70ms" }}>
              Lebenslauf erstellen, Stellen finden, KV-Gehalt prüfen und Bewerbungen im Blick behalten.
            </p>

            {/* Compact product UI preview */}
            <div aria-hidden="true" className="mt-8 space-y-3 max-w-[380px]">
              {/* Mini tracker */}
              <div className="rounded-[8px] border p-4 auth-left-enter"
                style={{ background: "var(--ja-auth-card-bg, #fff)", borderColor: "var(--ja-auth-border, #e7e6e3)", transition: t, animationDelay: "120ms" }}>
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3"
                  style={{ color: "var(--ja-auth-muted, #909090)", transition: t }}>Deine Bewerbungen</div>
                {[
                  { role: "Projektleiter:in IT", co: "ÖBB", status: "Im Gespräch", c: "#3f7a4a", bg: "rgba(93,159,104,.10)" },
                  { role: "HR Generalist", co: "ACCENTURE", status: "Eingereicht", c: "#75591f", bg: "rgba(183,150,73,.10)" },
                  { role: "Marketing Manager", co: "Sanitas", status: "Antwort", c: "#4a6d94", bg: "rgba(110,143,181,.10)" },
                ].map((r) => (
                  <div key={r.role} className="flex items-center gap-2 py-2 border-b last:border-0"
                    style={{ borderColor: "var(--ja-auth-border, #e7e6e3)", transition: t }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium truncate" style={{ color: "var(--ja-auth-text, #171717)", transition: t }}>{r.role}</div>
                      <div className="text-[11px]" style={{ color: "var(--ja-auth-muted, #909090)", transition: t }}>{r.co}</div>
                    </div>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm flex-shrink-0" style={{ background: r.bg, color: r.c }}>{r.status}</span>
                  </div>
                ))}
              </div>

              {/* Mini KV card */}
              <div className="rounded-[8px] border p-4 flex items-end justify-between auth-left-enter"
                style={{ background: "var(--ja-auth-card-bg, #fff)", borderColor: "var(--ja-auth-border, #e7e6e3)", transition: t, animationDelay: "150ms" }}>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-1"
                    style={{ color: "var(--ja-auth-muted, #909090)", transition: t }}>KV-Check</div>
                  <div className="text-[26px] font-bold tracking-[-0.04em]" style={{ color: "var(--ja-auth-text, #171717)", transition: t }}>2.548 €</div>
                  <div className="text-[10px]" style={{ color: "var(--ja-auth-muted, #909090)", transition: t }}>Brutto / Monat (Vollzeit)</div>
                </div>
                <div className="flex items-end gap-[2px] h-[24px]">
                  {[8, 14, 18, 24, 28].map((h, k) => (
                    <div key={k} className="w-[10px] rounded-t-[1px]"
                      style={{
                        height: `${h}px`,
                        background: k === 4 ? "#e30613" : "var(--ja-auth-chart-bg, #fff1f1)",
                        transition: "background-color 110ms ease-out",
                      }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ═══ RIGHT: Form area ══════════════════════════════════ */}
          <div className="col-span-1 lg:col-span-7 flex justify-center lg:justify-end min-w-0">
            <div className="w-full max-w-[440px] lg:mr-4">
              <div
                key={location.pathname}
                className="auth-card-enter rounded-[12px] border p-7 sm:p-9"
                style={{
                  animationDelay: "80ms",
                  background: "var(--ja-auth-card-bg, #fff)",
                  borderColor: "var(--ja-auth-border, #e7e6e3)",
                  boxShadow: "var(--ja-auth-shadow, 0 2px 16px rgba(0,0,0,0.04))",
                  transition: t,
                }}
              >
                {children}
              </div>

              {/* Legal strip under card */}
              <div className="mt-5 flex justify-center gap-5 text-[11px]">
                <Link to="/terms"     className="hover:underline" style={{ color: "var(--ja-auth-muted, #909090)", transition: t }}>AGB</Link>
                <Link to="/privacy"   className="hover:underline" style={{ color: "var(--ja-auth-muted, #909090)", transition: t }}>Datenschutz</Link>
                <Link to="/impressum" className="hover:underline" style={{ color: "var(--ja-auth-muted, #909090)", transition: t }}>Impressum</Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}