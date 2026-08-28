import { useState, useEffect, useRef, Suspense } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Mail, X, Menu } from "lucide-react";
import useFocusTrap from "../../hooks/useFocusTrap";
import clsx from "clsx";

import useAuthStore from "../../hooks/useAuthStore";
import { authApi } from "../../services/api";
import { getApiErrorMessage } from "../../utils/apiError";
import { getInitials } from "../../utils/initials";
import { useBootstrap } from "../../context/BootstrapContext";

import Sidebar from "./Sidebar";
import CommandMenu from "./CommandMenu";
import OnboardingModal from "../OnboardingModal";

const NAV_ITEMS = [
  { to: "/dashboard",    label: "Übersicht",  icon: "LayoutDashboard" },
  { to: "/jobs",         label: "Stellen",    icon: "Briefcase" },
  { to: "/lebenslauf",   label: "Lebenslauf", icon: "FileText" },
];

/**
 * Mobile drawer — full-height left drawer with nav.
 */
function MobileDrawer({ open, onClose, me }) {
  const drawerRef = useRef(null);
  useFocusTrap(open, drawerRef);

  // Close on Escape while open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const navigate = useNavigate();
  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    useAuthStore.getState().logout();
    navigate("/login");
  };

  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigationsmenü"
        className="fixed inset-y-0 left-0 z-[70] w-[85vw] max-w-sm flex flex-col md:hidden"
        style={{ background: "var(--sidebar-bg, #FAFAF8)" }}
      >
        <div className="flex items-center justify-between h-14 px-4"
          style={{ borderColor: "var(--sidebar-border, #E7E7E4)" }}>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-sm"
              style={{ background: "var(--app-brand, #E30613)" }}>
              <span className="text-white text-[10px] font-bold leading-none">JA</span>
            </span>
            <span className="text-[14px] font-bold" style={{ color: "var(--sidebar-text-active, #171717)" }}>JobAssist</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 grid place-items-center rounded-sm"
            style={{ color: "var(--sidebar-text, #626262)" }}
            aria-label="Menü schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 p-4 border-b"
          style={{ borderColor: "var(--app-border-subtle, #EFEFEC)" }}>
          <span className="grid place-items-center w-9 h-9 rounded-full text-[11px] font-semibold"
            style={{ background: "var(--app-accent-soft)", color: "var(--app-accent)" }}>
            {getInitials(me?.full_name, me?.email)}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold truncate" style={{ color: "var(--app-text, #171717)" }}>
              {me?.full_name || "Benutzer"}
            </p>
            <p className="text-[11.5px] truncate" style={{ color: "var(--app-text-muted, #888)" }}>{me?.email}</p>
          </div>
        </div>

        <nav className="flex-1 p-2 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label }) => (
            <a
              key={to}
              href={to}
              onClick={(e) => { e.preventDefault(); navigate(to); onClose(); }}
              className="block px-3 py-2.5 rounded-sm text-[14px] font-medium"
              style={{ color: "var(--sidebar-text, #626262)" }}
            >{label}</a>
          ))}
          <div className="my-2 mx-3" style={{ height: "1px", background: "var(--sidebar-border, #E7E7E4)" }} />
          <a
            href="/job-alerts"
            onClick={(e) => { e.preventDefault(); navigate("/job-alerts"); onClose(); }}
            className="block px-3 py-2.5 rounded-sm text-[14px] font-medium"
            style={{ color: "var(--sidebar-text, #626262)" }}
          >Alerts</a>
          <a
            href="/settings"
            onClick={(e) => { e.preventDefault(); navigate("/settings"); onClose(); }}
            className="block px-3 py-2.5 rounded-sm text-[14px] font-medium"
            style={{ color: "var(--sidebar-text, #626262)" }}
          >Einstellungen</a>
        </nav>

        <div className="p-3 border-t" style={{ borderColor: "var(--app-border-subtle, #EFEFEC)" }}>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-3 py-2.5 rounded-sm text-[13px] font-medium text-left"
            style={{ color: "var(--app-error, #E05050)" }}
          >Abmelden</button>
        </div>
      </aside>
    </>
  );
}

/**
 * VerificationBanner — dashboard system notice for unverified e-mail.
 *
 * Polished amber notice: icon block, title + subtitle, resend action and an
 * optional dismiss (session-scoped, so it stays gone until the tab closes).
 *
 * @param {object} props
 * @param {object|null} [props.me] - Authenticated user from bootstrap/store.
 * @returns {React.ReactNode|null} Null when the user is verified or absent.
 */
function VerificationBanner({ me }) {
  const [sending, setSending] = useState(false);
  // Dismiss only hides the notice for this browser session — verification is
  // still pending, so a fresh visit brings the banner back.
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("ja:verify_banner_dismissed_v1") === "1";
    } catch {
      return false;
    }
  });
  if (!me || me.is_verified !== false || dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await authApi.resendVerification();
      toast.success("E-Mail gesendet");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "E-Mail konnte nicht gesendet werden"));
    } finally {
      setSending(false);
    }
  };

  const handleDismiss = () => {
    try {
      sessionStorage.setItem("ja:verify_banner_dismissed_v1", "1");
    } catch { /* private mode — session-only dismiss still works in-memory */ }
    setDismissed(true);
  };

  return (
    <div
      role="status"
      className="animate-slide-up flex flex-wrap items-center gap-3.5 rounded-xl border px-4 py-3.5 mb-8"
      style={{
        background: "var(--app-notice-surface)",
        borderColor: "var(--app-notice-border)",
        boxShadow: "var(--app-shadow-card)",
      }}
    >
      <div
        className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg"
        style={{ background: "var(--app-notice-icon)" }}
      >
        <Mail className="h-[18px] w-[18px]" style={{ color: "var(--app-warning)" }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold leading-tight" style={{ color: "var(--app-text)" }}>
          E-Mail bestätigen
        </p>
        <p className="mt-0.5 text-[12.5px]" style={{ color: "var(--app-text-secondary)" }}>
          KI-Funktionen werden nach Bestätigung freigeschaltet.
        </p>
      </div>
      <button
        type="button"
        onClick={handleResend}
        disabled={sending}
        className="btn btn-secondary h-8 px-3 rounded-md text-[12px] font-medium flex-shrink-0 cursor-pointer"
      >
        {sending ? "Senden…" : "Erneut senden"}
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Hinweis schließen"
        className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-md border-none cursor-pointer transition-colors duration-150 hover:bg-[var(--app-surface-hover)]"
        style={{ background: "transparent", color: "var(--app-text-muted)" }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * AppShell v2 — authenticated app shell.
 *
 * - 180px Sidebar (desktop), with red JA brand, thin active line
 * - Mobile: hamburger menu + drawer + bottom nav
 * - ⌘K command menu
 * - Uses --app-* design tokens throughout
 *
 * Reads the single `/init` bootstrap payload from BootstrapContext; there is
 * no data-caching layer — every page fetches its own rows with plain fetch.
 */
export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const storedUser = useAuthStore((s) => s.user);
  const { init } = useBootstrap();

  // Persist identity from the bootstrap payload so the next hard reload has it.
  useEffect(() => {
    if (init?.me) setUser(init.me);
  }, [init, setUser]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const me = init?.me ?? storedUser;
  const profile = init?.profile;

  return (
    <div className="relative min-h-screen flex flex-col md:flex-row overflow-x-clip"
      style={{ background: "var(--app-bg, #FAFAF8)", transition: "var(--app-transition)" }}>

      {/* Desktop sidebar */}
      <Sidebar me={me} profile={profile} onCommandClick={() => setCmdOpen(true)} />

      {/* Right column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Skip link — first focusable element; visible only on focus */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:h-10 focus:px-4 focus:inline-flex focus:items-center focus:rounded-md focus:bg-[var(--app-brand, #E30613)] focus:text-white focus:text-[13px] focus:font-semibold"
        >
          Zum Inhalt springen
        </a>
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-40 flex items-center justify-between h-[56px] px-4 border-b"
          style={{ background: "var(--app-bg, #FAFAF8)", borderColor: "var(--app-border, #E7E7E4)" }}>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="grid place-items-center w-10 h-10 -ml-1.5 rounded-sm"
            style={{ color: "var(--app-text, #171717)" }}
            aria-label="Menü öffnen"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <span className="grid h-6 w-6 place-items-center rounded-sm"
              style={{ background: "var(--app-brand, #E30613)" }}>
              <span className="text-white text-[9px] font-bold leading-none">JA</span>
            </span>
            <span className="text-[14px] font-bold tracking-[-0.02em]" style={{ color: "var(--app-text, #171717)" }}>JobAssist</span>
          </div>
          <div className="w-10" />{/* spacer for centering */}
        </header>

        <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} me={me} />
        <CommandMenu open={cmdOpen} onClose={() => setCmdOpen(false)} />
        <OnboardingModal />

        <main
          id="main-content"
          tabIndex={-1}
          className={clsx(
            "relative z-10 flex-1 w-full",
            location.pathname.startsWith("/lebenslauf")
              ? "p-0"
              : location.pathname.startsWith("/jobs")
              ? "px-4 pt-4 pb-6 sm:px-6 sm:pt-6 lg:px-6 lg:pt-6 lg:pb-6"
              : "max-w-[1440px] mx-auto px-5 pt-8 pb-12 sm:px-8 sm:pt-10 sm:pb-10 lg:px-10 lg:pt-12 lg:pb-12",
          )}
        >
          {location.pathname.startsWith("/dashboard") && <VerificationBanner me={me} />}
          {/* No skeleton fallback: a blank frame is strictly preferable to any
              pulse/flash UI during a lazy page-chunk load. Pages are preloaded
              on idle, so transitions render near-instantly. */}
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="md:hidden sticky bottom-0 left-0 right-0 z-30 border-t"
          style={{
            background: "var(--app-bg, #FAFAF8)",
            borderColor: "var(--app-border, #E7E7E4)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <div className="grid grid-cols-3 h-14">
            {NAV_ITEMS.map(({ to, label }) => {
              const active = location.pathname === to || location.pathname.startsWith(to + "/");
              return (
                <a
                  key={to}
                  href={to}
                  onClick={(e) => { e.preventDefault(); navigate(to); }}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-0.5 transition-colors duration-100",
                    active ? "font-semibold" : "",
                  )}
                  style={{
                    color: active ? "var(--sidebar-text-active, #171717)" : "var(--sidebar-text, #626262)",
                  }}
                >
                  <span className="text-[10px] font-medium">{label}</span>
                </a>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
