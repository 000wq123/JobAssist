import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Bell,
  Settings,
  CreditCard,
  LogOut,
  Search,
  Menu,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";
import useAuthStore from "../../hooks/useAuthStore";
import { authApi } from "../../services/api";

const NAV_ITEMS = [
  { to: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
  { to: "/jobs",         label: "Stellen",      icon: Briefcase },
  { to: "/lebenslauf",   label: "Lebenslauf",   icon: FileText },
  { to: "/job-alerts",   label: "Alerts",       icon: Bell },
];

const USER_MENU = [
  { to: "/settings", label: "Einstellungen", icon: Settings },
  { to: "/billing",  label: "Abonnement",    icon: CreditCard },
];

/**
 * Extracts initials from a full name or email.
 * Examples: "Max Mustermann" → "MM", "ada@x.com" → "A"
 */
function getInitials(name, email) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

/**
 * Detects whether to render ⌘ or Ctrl shortcut hint.
 */
function isMac() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

/**
 * TopNav — minimal 56px navigation bar.
 * Uses 12-col grid for layout (per project conventions).
 *
 * @param {object} props
 * @param {object} [props.me]
 * @param {object} [props.profile]
 * @param {() => void} props.onMenuClick - Mobile drawer trigger
 * @param {() => void} props.onCommandClick - Open command palette
 */
export default function TopNav({ me, profile, onMenuClick, onCommandClick }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const mac = isMac();

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* network error – continue local logout */ }
    useAuthStore.getState().logout();
    navigate("/login");
  };

  const userName = me?.full_name || me?.email?.split("@")[0] || "Benutzer";
  const initials = getInitials(me?.full_name, me?.email);

  return (
    <header
      className="sticky top-0 z-40 bg-[var(--color-bg)]/70 backdrop-blur-md border-b border-[var(--color-border-subtle)]"
    >
      {/* Note: page-level radial glow lives on AppShell so it bleeds through the
          frosted-glass header — no internal glow here (would create banding). */}
      <div className="relative grid grid-cols-12 items-center gap-2 h-14 max-w-[1440px] mx-auto px-4 md:px-6 lg:px-10">
        {/* Left: logo + mobile menu */}
        <div className="col-span-3 flex items-center gap-2">
          <NavLink to="/dashboard" className="flex items-center gap-2 group">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--color-accent-500)]">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="hidden sm:block text-[14px] font-semibold text-[var(--color-fg)] tracking-tight">
              JobAssist
            </span>
          </NavLink>
        </div>

        {/* Center: nav */}
        <nav className="col-span-6 hidden md:flex items-center justify-center gap-0.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  "inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[13px] font-medium transition-colors",
                  "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-400)]",
                  isActive
                    ? "text-[var(--color-fg)] bg-[var(--color-bg-elev-1)]"
                    : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-1)]",
                )
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right: command + avatar */}
        <div className="col-span-9 md:col-span-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCommandClick}
            className={clsx(
              "hidden sm:inline-flex items-center gap-2 h-8 px-2.5 rounded-md",
              "bg-[var(--color-bg-elev-1)] border border-[var(--color-border)] text-[var(--color-fg-muted)]",
              "hover:bg-[var(--color-bg-elev-2)] hover:text-[var(--color-fg)] transition-colors",
              "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-400)]",
            )}
            aria-label="Befehlsmenü öffnen"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="text-[12px]">Suchen</span>
            <kbd className="ml-1 inline-flex items-center justify-center min-w-[24px] h-[18px] px-1.5 rounded bg-[var(--color-bg-elev-3)] border border-[var(--color-border)] font-mono text-[10px] text-[var(--color-fg-dim)]">
              {mac ? "⌘K" : "Ctrl K"}
            </kbd>
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className={clsx(
                "inline-flex items-center gap-1.5 h-8 pl-1 pr-2 rounded-md",
                "border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]",
                "hover:bg-[var(--color-bg-elev-2)] hover:border-[var(--color-border-strong)] transition-colors",
                "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-400)]",
              )}
              aria-label="Benutzermenü"
              aria-expanded={menuOpen}
            >
              {profile?.avatar ? (
                <img src={profile.avatar} alt="" className="w-6 h-6 rounded object-cover" />
              ) : (
                <span className="grid place-items-center w-6 h-6 rounded bg-[var(--color-accent-500)]/15 border border-[var(--color-accent-500)]/30 text-[var(--color-accent-200)] text-[10px] font-semibold">
                  {initials}
                </span>
              )}
              <ChevronDown className={clsx("w-3 h-3 text-[var(--color-fg-dim)] transition-transform", menuOpen && "rotate-180")} />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1.5 w-60 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-1 z-50 animate-slide-up"
                style={{ boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}
              >
                <div className="px-2.5 py-2 mb-1 border-b border-[var(--color-border-subtle)]">
                  <p className="text-[13px] font-semibold text-[var(--color-fg)] truncate">{userName}</p>
                  <p className="text-[11.5px] text-[var(--color-fg-dim)] truncate">{me?.email}</p>
                </div>
                {USER_MENU.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="grid grid-cols-12 items-center gap-2 px-2.5 py-2 rounded-md text-[13px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-3)] transition-colors"
                  >
                    <Icon className="col-span-1 w-3.5 h-3.5" />
                    <span className="col-span-11">{label}</span>
                  </NavLink>
                ))}
                <div className="my-1 h-px bg-[var(--color-border-subtle)]" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="grid grid-cols-12 items-center gap-2 w-full px-2.5 py-2 rounded-md text-[13px] text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
                >
                  <LogOut className="col-span-1 w-3.5 h-3.5" />
                  <span className="col-span-11 text-left">Abmelden</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
