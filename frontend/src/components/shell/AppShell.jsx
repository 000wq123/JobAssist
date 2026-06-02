import { useState, useEffect, Suspense } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Mail, LayoutDashboard, FileText, Briefcase, Bell, Calendar, X, User, LogOut, Settings, CreditCard, Sparkles } from "lucide-react";
import clsx from "clsx";

import useAuthStore from "../../hooks/useAuthStore";
import { initApi, authApi, jobApi, settingsApi } from "../../services/api";
import { getApiErrorMessage } from "../../utils/apiError";

import TopNav from "./TopNav";
import LeftRail from "./LeftRail";
import CommandMenu from "./CommandMenu";
import OnboardingModal from "../OnboardingModal";

const NAV_ITEMS = [
  { to: "/dashboard",    label: "Dashboard", icon: LayoutDashboard },
  { to: "/jobs",         label: "Stellen",   icon: Briefcase },
  { to: "/lebenslauf",   label: "Lebenslauf",icon: FileText },
  { to: "/job-alerts",   label: "Alerts",    icon: Bell },
  { to: "/kalender",     label: "Kalender",  icon: Calendar },
];

/**
 * Mobile drawer — full-height left drawer with nav + user info.
 */
function MobileDrawer({ open, onClose, me, profile }) {
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
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="fixed inset-y-0 left-0 z-[70] w-[85vw] max-w-sm flex flex-col bg-[var(--color-bg-elev-1)] border-r border-[var(--color-border)] md:hidden"
      >
        <div className="grid grid-cols-12 items-center gap-2 h-14 px-4 border-b border-[var(--color-border)]">
          <div className="col-span-10 flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--color-accent-500)]">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[14px] font-semibold text-[var(--color-fg)]">JobAssist</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="col-span-2 justify-self-end w-9 h-9 grid place-items-center rounded-md text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]"
            aria-label="Menü schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-12 items-center gap-3 p-4 border-b border-[var(--color-border-subtle)]">
          {profile?.avatar ? (
            <img src={profile.avatar} alt="" className="col-span-2 w-9 h-9 rounded-md object-cover" />
          ) : (
            <span className="col-span-2 grid place-items-center w-9 h-9 rounded-md bg-[var(--color-bg-elev-3)] text-[var(--color-fg-muted)]">
              <User className="w-4 h-4" />
            </span>
          )}
          <div className="col-span-10 min-w-0">
            <p className="text-[13px] font-semibold text-[var(--color-fg)] truncate">{me?.full_name || "Benutzer"}</p>
            <p className="text-[11.5px] text-[var(--color-fg-dim)] truncate">{me?.email}</p>
          </div>
        </div>

        <nav className="flex-1 p-2 overflow-y-auto">
          <p className="px-2.5 mt-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-dim)]">
            Navigation
          </p>
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <a
              key={to}
              href={to}
              onClick={(e) => { e.preventDefault(); navigate(to); onClose(); }}
              className="grid grid-cols-12 items-center gap-2 px-2.5 py-2 rounded-md text-[14px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]"
            >
              <Icon className="col-span-1 w-4 h-4" />
              <span className="col-span-11">{label}</span>
            </a>
          ))}

          <p className="px-2.5 mt-4 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-dim)]">
            Konto
          </p>
          {[
            { to: "/settings", label: "Einstellungen", icon: Settings },
            { to: "/billing",  label: "Abonnement",    icon: CreditCard },
          ].map(({ to, label, icon: Icon }) => (
            <a
              key={to}
              href={to}
              onClick={(e) => { e.preventDefault(); navigate(to); onClose(); }}
              className="grid grid-cols-12 items-center gap-2 px-2.5 py-2 rounded-md text-[14px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]"
            >
              <Icon className="col-span-1 w-4 h-4" />
              <span className="col-span-11">{label}</span>
            </a>
          ))}
        </nav>

        <div className="p-3 border-t border-[var(--color-border-subtle)]">
          <button
            type="button"
            onClick={handleLogout}
            className="grid grid-cols-12 items-center gap-2 w-full px-2.5 py-2 rounded-md text-[13px] text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
          >
            <LogOut className="col-span-1 w-4 h-4" />
            <span className="col-span-11 text-left">Abmelden</span>
          </button>
        </div>
      </aside>
    </>
  );
}

/**
 * VerificationBanner — subtle banner shown when email is unverified.
 */
function VerificationBanner({ me }) {
  const [sending, setSending] = useState(false);
  if (!me || me.is_verified !== false) return null;

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

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--color-warning)]/25 bg-[var(--color-warning-soft)] px-4 py-3">
      <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-[var(--color-warning)]/15 border border-[var(--color-warning)]/25">
        <Mail className="h-4 w-4 text-[var(--color-warning)]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[var(--color-fg)] leading-tight">E-Mail bestätigen</p>
        <p className="mt-0.5 text-[12px] text-[var(--color-fg-muted)]">KI-Funktionen werden nach Bestätigung freigeschaltet.</p>
      </div>
      <button
        type="button"
        onClick={handleResend}
        disabled={sending}
        className="h-8 px-3 rounded-md text-[12px] font-semibold bg-[var(--color-bg-elev-2)] border border-[var(--color-border)] text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-3)] transition-colors disabled:opacity-50 flex-shrink-0"
      >
        {sending ? "Senden…" : "Erneut senden"}
      </button>
    </div>
  );
}

/**
 * AppShell — main authenticated app shell. Replaces ModernLayout.
 *
 * Features:
 * - 56px top nav with command palette
 * - Mobile drawer + bottom nav fallback
 * - ⌘K / Ctrl+K command menu
 * - Email verification banner
 * - 12-col content max-width 1200px
 */
export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const storedUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  // Warm critical caches immediately so dashboard + jobs page are instant.
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ["jobs"],
      queryFn: () => jobApi.list().then((r) => {
        const items = r.data?.items ?? r.data ?? [];
        try {
          localStorage.setItem("jobs", JSON.stringify(items));
          localStorage.setItem("jobs_ts", String(Date.now()));
        } catch { /* quota */ }
        return items;
      }),
      staleTime: 1000 * 60 * 2,
    });
    queryClient.prefetchQuery({
      queryKey: ["profile"],
      queryFn: () => settingsApi.getProfile().then((r) => {
        try { localStorage.setItem("profile", JSON.stringify(r.data)); } catch { /* quota */ }
        return r.data;
      }),
      staleTime: 1000 * 60 * 2,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hotkey: ⌘K / Ctrl+K
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

  const { data: initData } = useQuery({
    queryKey: ["init"],
    queryFn: () => {
      return initApi.fetch().then((r) => {
        try { localStorage.setItem("init", JSON.stringify(r.data)); } catch { /* ignore quota */ }
        setUser(r.data.me);
        return r.data;
      });
    },
    initialData: () => {
      try {
        const saved = localStorage.getItem("init");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.me) setUser(parsed.me);
          return parsed;
        }
      } catch {}
      return undefined;
    },
    staleTime: 1000 * 60 * 2,
  });

  const me = initData?.me ?? storedUser;
  const profile = initData?.profile;

  return (
    <div className="relative min-h-screen flex flex-col md:flex-row overflow-x-clip bg-[var(--color-bg)]">
      {/* Desktop persistent left rail (≥ md). Hidden on mobile — phones use
          TopNav + bottom-nav instead. */}
      <LeftRail
        me={me}
        profile={profile}
        onCommandClick={() => setCmdOpen(true)}
      />

      {/* Right column — content + (mobile-only) chrome. min-w-0 prevents flex
          children from forcing the parent to overflow when content is wide.
          Dashboard (Heute) is dark Cron-deep — same surface as the rest of
          the shell, no per-route override needed anymore. */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile-only top bar. On desktop the LeftRail owns nav + search +
            user menu, so this header is entirely hidden ≥ md. */}
        <div className="md:hidden">
          <TopNav
            me={me}
            profile={profile}
            onMenuClick={() => setMobileOpen(true)}
            onCommandClick={() => setCmdOpen(true)}
          />
        </div>

        <MobileDrawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          me={me}
          profile={profile}
        />

        <CommandMenu open={cmdOpen} onClose={() => setCmdOpen(false)} />
        <OnboardingModal />

        <main
          className={clsx(
            "relative z-10 flex-1 w-full",
            // Stellen master/detail wants edge-to-edge — bypass the reading-
            // width clamp and use a tight desktop gutter so the list pane
            // sits flush against the left rail (see /demo/v7).
            location.pathname.startsWith("/lebenslauf")
              ? "p-0"
              : location.pathname.startsWith("/jobs")
              ? "px-4 pt-4 pb-6 sm:px-6 sm:pt-6 lg:px-6 lg:pt-6 lg:pb-6"
              : "max-w-[1440px] mx-auto px-5 pt-8 pb-12 sm:px-8 sm:pt-10 sm:pb-10 lg:px-10 lg:pt-12 lg:pb-12",
          )}
        >
          <VerificationBanner me={me} />
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="md:hidden sticky bottom-0 left-0 right-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {(() => {
            const items = NAV_ITEMS.filter((item) => item.to !== "/kalender").slice(0, 4);
            return (
              <div className="grid grid-cols-4 h-14">
                {items.map(({ to, label, icon: Icon }) => {
                  const active = location.pathname === to || location.pathname.startsWith(to + "/");
                  return (
                    <a
                      key={to}
                      href={to}
                      onClick={(e) => { e.preventDefault(); navigate(to); }}
                      className={clsx(
                        "flex flex-col items-center justify-center gap-0.5 transition-colors",
                        active ? "text-[var(--color-accent-300)]" : "text-[var(--color-fg-dim)] hover:text-[var(--color-fg)]",
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px] font-medium">{label}</span>
                    </a>
                  );
                })}
              </div>
            );
          })()}
        </nav>
      </div>
    </div>
  );
}
