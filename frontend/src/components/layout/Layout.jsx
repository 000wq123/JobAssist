import { useState, useEffect, useRef, Suspense } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  LogOut,
  Sparkles,
  Settings,
  User,
  Mail,
  Wand2,
  Bell,
  CreditCard,
  MoreHorizontal,
  ChevronUp,
  X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import clsx from "clsx";

import useAuthStore from "../../hooks/useAuthStore";
import { useI18n } from "../../context/I18nContext";
import { initApi, authApi } from "../../services/api";
import { getApiErrorMessage } from "../../utils/apiError";

const NAV_KEYS = [
  { to: "/dashboard", tKey: "navigation.dashboard", icon: LayoutDashboard },
  { to: "/resume", tKey: "navigation.myResumes", icon: FileText },
  { to: "/jobs", tKey: "navigation.jobs", icon: Briefcase },
  { to: "/ai-assistant", tKey: "navigation.aiAssistant", icon: Wand2 },
  { to: "/job-alerts", tKey: "navigation.jobAlerts", icon: Bell },
];

const USER_MENU_ITEMS = [
  { to: "/settings", tKey: "navigation.preferences", icon: Settings },
  { to: "/billing", tKey: "navigation.billing", icon: CreditCard },
];

/**
 * Inner content of the sidebar: logo, nav links, user avatar, and logout button.
 * @param {object} props
 * @param {object|null} props.me
 * @param {object|null} props.profile
 * @param {Function} props.t - i18n translation helper.
 * @param {() => void} props.handleLogout
 * @param {() => void} [props.onNavClick] - Called after a nav link is clicked (closes mobile drawer).
 */
function SidebarContent({ me, profile, t, handleLogout, onNavClick }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handler = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-base font-bold text-white leading-none">JobAssist</h1>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto" aria-label="Hauptnavigation">
        {NAV_KEYS.map(({ to, tKey, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavClick}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200",
                "focus:outline-none focus-visible:outline-none",
                "focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base",
                isActive
                  ? "bg-brand-500/15 text-brand-200"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={clsx(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200",
                    isActive ? "bg-brand-500/25 text-brand-300" : "bg-white/5 text-slate-500"
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {t(tKey)}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-4 relative" ref={menuRef}>
        {menuOpen && (
          <div
            role="menu"
            className="absolute bottom-full left-3 right-3 mb-2 rounded-xl border border-white/10 bg-[#111827] shadow-2xl shadow-black/60 p-1.5 z-50"
          >
            {USER_MENU_ITEMS.map(({ to, tKey, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  onNavClick?.();
                }}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive ? "bg-brand-500/15 text-brand-200" : "text-slate-300 hover:bg-white/5 hover:text-white"
                  )
                }
              >
                <Icon className="w-4 h-4 text-slate-400" aria-hidden="true" />
                {t(tKey)}
              </NavLink>
            ))}
            <div className="my-1 h-px bg-white/10" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeMenu();
                handleLogout();
              }}
              className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              {t("common.logout")}
            </button>
          </div>
        )}

        <div className="border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Benutzermenü öffnen"
            className={clsx(
              "flex items-center gap-3 w-full px-2 py-2 rounded-xl transition-colors",
              menuOpen ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
            )}
          >
            {me ? (
              <>
                {profile?.avatar ? (
                  <img
                    src={profile.avatar}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-brand-500/30"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-semibold text-white truncate leading-tight">
                    {me.full_name || me.email?.split("@")[0]}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">{me.email}</p>
                </div>
                <ChevronUp
                  className={clsx("w-4 h-4 text-slate-500 transition-transform", menuOpen ? "rotate-0" : "rotate-180")}
                  aria-hidden="true"
                />
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="h-3.5 w-24 bg-white/10 rounded animate-pulse mb-1.5" />
                  <div className="h-2.5 w-32 bg-white/5 rounded animate-pulse" />
                </div>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Sticky top banner prompting the user to verify their email address.
 * Hidden once the user is verified.
 * @param {object} props
 * @param {object|null} props.me
 */
function VerificationBanner({ me }) {
  const [sending, setSending] = useState(false);

  if (!me || me.is_verified !== false) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await authApi.resendVerification();
      toast.success("Die Bestätigungs-E-Mail wurde sicher versendet");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Die Bestätigungs-E-Mail konnte nicht sicher versendet werden"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 sm:px-4"
    >
      <Mail className="h-4 w-4 flex-shrink-0 text-amber-400" aria-hidden="true" />
      <p className="min-w-0 flex-1 truncate text-xs text-amber-200 sm:text-[13px]">
        <span className="font-semibold text-amber-100">E-Mail bestätigen</span>
        <span className="mx-1.5 hidden text-amber-400/60 sm:inline">·</span>
        <span className="hidden sm:inline">KI-Funktionen werden erst nach Bestätigung freigeschaltet.</span>
      </p>
      <button
        type="button"
        onClick={handleResend}
        disabled={sending}
        aria-label="Bestätigungs-E-Mail erneut senden"
        className="flex-shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 hover:text-amber-100 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
      >
        {sending ? "Senden…" : "Erneut senden"}
      </button>
    </div>
  );
}

/**
 * Root app shell: 12-column CSS Grid with a fixed sidebar (col-span-2)
 * and a scrollable main area (col-span-10). Renders a mobile drawer on small screens.
 */
export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [animClass] = useState(() => (sessionStorage.getItem("app-loaded") ? "page-ready" : "page-enter"));
  const location = useLocation();

  useEffect(() => {
    sessionStorage.setItem("app-loaded", "1");
  }, []);

  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);
  const storedUser = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const isAssistantRoute = location.pathname === "/ai-assistant";

  const { data: initData } = useQuery({
    queryKey: ["init"],
    queryFn: () => initApi.fetch().then((r) => {
      try { localStorage.setItem("init", JSON.stringify(r.data)); } catch {}
      setUser(r.data.me);
      return r.data;
    }),
    initialData: () => {
      try {
        const saved = localStorage.getItem("init");
        return saved ? JSON.parse(saved) : undefined;
      } catch {
        return undefined;
      }
    },
    initialDataUpdatedAt: 0,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  });

  const me = initData?.me ?? storedUser;
  const profile = initData?.profile;

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    queryClient.clear();
    logout();
    navigate("/login");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[minmax(185px,215px)_1fr] min-h-screen bg-[#0A0A0A]">
      {/* Desktop sidebar — narrowed 15-20% from 220-260px to 185-215px */}
      <aside className="hidden md:flex sticky top-0 self-start h-screen bg-[#0A0A0A] border-r border-[#171a21] flex-col flex-shrink-0">
        <SidebarContent me={me} profile={profile} t={t} handleLogout={handleLogout} onNavClick={undefined} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile slide-in drawer — outside grid flow */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-[86vw] max-w-[320px] bg-black shadow-2xl shadow-black/50 flex flex-col transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Menü schließen"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:bg-white/10"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        <SidebarContent
          me={me}
          profile={profile}
          t={t}
          handleLogout={handleLogout}
          onNavClick={() => setMobileOpen(false)}
        />
      </aside>

      {/* Main content — col-span-10 on desktop, full width on mobile */}
      <div className="col-span-1 flex flex-col min-w-0 bg-[radial-gradient(circle_at_top,_rgba(91,79,232,0.18),_transparent_28%),linear-gradient(180deg,_#0A0A0A_0%,_#080a0c_52%,_#0A0A0A_100%)]">
<main className="flex-1 flex flex-col">
          {/* pb-20 md:pb-8 — padding for mobile bottom-nav */}
          <div key={location.key} className={`text-slate-100 bg-transparent animate-slide-up ${animClass} ${isAssistantRoute ? "flex-1 max-w-none w-full flex flex-col min-h-0 overflow-hidden pb-14 md:pb-0" : "flex-1 w-full px-4 py-5 pb-[calc(5rem+env(safe-area-inset-bottom))] md:px-8 md:py-8 md:pb-8"}`}>
            <div className={isAssistantRoute ? "flex-1 flex flex-col min-h-0" : "max-w-[1200px] mx-auto w-full"}>
              <VerificationBanner me={me} />
              <Suspense fallback={null}>
                <Outlet />
              </Suspense>
            </div>
          </div>
        </main>
      </div>

      {/* ── Mobile Bottom Navigation ──────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#171a21]"
        style={{
          background: 'rgba(0,0,0,0.97)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex">
          {[
            { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'  },
            { to: '/resume',       icon: FileText,         label: 'Lebenslauf' },
            { to: '/jobs',         icon: Briefcase,        label: 'Jobs'       },
            { to: '/ai-assistant', icon: Wand2,            label: 'KI'         },
          ].map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-3 gap-1 min-h-[56px] transition-colors ${
                  isActive ? 'text-brand-300' : 'text-slate-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-brand-500/20' : ''}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium leading-none">{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* "Mehr" — öffnet Drawer mit Einstellungen, Abonnement, Abmelden */}
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Weitere Optionen öffnen"
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 min-h-[56px] transition-colors ${
              mobileOpen ? 'text-brand-300' : 'text-slate-400'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${mobileOpen ? 'bg-brand-500/20' : ''}`}>
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-medium leading-none">Mehr</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
