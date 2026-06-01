import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Bell,
  Calendar,
  Settings,
  CreditCard,
  LogOut,
  Search,
  Sparkles,
  ChevronUp,
  User,
} from "lucide-react";
import clsx from "clsx";
import useAuthStore from "../../hooks/useAuthStore";
import { authApi } from "../../services/api";

const PRIMARY = [
  { to: "/dashboard",    label: "Dashboard",  icon: LayoutDashboard },
  { to: "/jobs",         label: "Stellen",    icon: Briefcase },
  { to: "/lebenslauf",   label: "Lebenslauf", icon: FileText },
  { to: "/job-alerts",   label: "Alerts",     icon: Bell },
  { to: "/kalender",     label: "Kalender",   icon: Calendar },
];

const SECONDARY = [
  { to: "/settings", label: "Einstellungen", icon: Settings },
  { to: "/billing",  label: "Mein Plan",    icon: CreditCard },
];

function isMac() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

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
 * NavRow — a single nav item with consistent active/hover state.
 *
 * Active state uses a subtle filled background (not an accent border) so the
 * rail stays visually quiet in the Linear style.
 *
 * @param {{ to: string, label: string, icon: import('lucide-react').LucideIcon }} props
 */
function NavRow({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          "group grid grid-cols-[20px_1fr] items-center gap-2.5 h-8 px-2.5 rounded-md",
          "text-[13px] font-medium transition-colors",
          "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-400)]",
          isActive
            ? "text-[var(--color-fg)] bg-[var(--color-bg-elev-2)]"
            : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-1)]",
        )
      }
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

/**
 * LeftRail — persistent desktop navigation rail (≥ md breakpoint).
 *
 * 240 px wide, full viewport height, sticky. Sections from top to bottom:
 *   1. Brand mark (logo + product name)
 *   2. Search button (⌘K shortcut)
 *   3. Primary nav (Dashboard / Stellen / Lebenslauf / KI / Alerts)
 *   4. Hairline divider
 *   5. Secondary nav (Einstellungen / Abonnement)
 *   6. Bottom: user pill with popup menu (avatar + name → logout)
 *
 * Mobile (< md) hides this entirely; the mobile shell uses `TopNav` + the
 * existing bottom-nav inside `AppShell`.
 *
 * @param {object} props
 * @param {object} [props.me]
 * @param {object} [props.profile]
 * @param {() => void} props.onCommandClick - Opens command palette
 */
export default function LeftRail({ me, profile, onCommandClick }) {
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
    try { await authApi.logout(); } catch { /* ignore network failure, still log out locally */ }
    useAuthStore.getState().logout();
    navigate("/login");
  };

  const userName = me?.full_name || me?.email?.split("@")[0] || "Benutzer";
  const initials = getInitials(me?.full_name, me?.email);

  return (
    <aside
      className={clsx(
        "hidden md:flex flex-col",
        "sticky top-0 self-start h-screen w-[240px] flex-shrink-0",
        "border-r border-[var(--color-border-subtle)] bg-[var(--color-bg)]",
        "z-30",
      )}
    >
      {/* Brand */}
      <div className="h-14 px-3 flex items-center">
        <NavLink to="/dashboard" className="flex items-center gap-2 px-1">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--color-accent-500)]">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-[14px] font-semibold text-[var(--color-fg)] tracking-tight">
            JobAssist
          </span>
        </NavLink>
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onCommandClick}
          className={clsx(
            "w-full grid grid-cols-[16px_1fr_auto] items-center gap-2 h-8 px-2.5 rounded-md",
            "bg-[var(--color-bg-elev-1)] border border-[var(--color-border)]",
            "text-[12.5px] text-[var(--color-fg-muted)]",
            "hover:bg-[var(--color-bg-elev-2)] hover:text-[var(--color-fg)] transition-colors",
            "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-400)]",
          )}
          aria-label="Befehlsmenü öffnen"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-left">Suchen</span>
          <kbd className="inline-flex items-center justify-center min-w-[24px] h-[18px] px-1.5 rounded bg-[var(--color-bg-elev-3)] border border-[var(--color-border)] font-mono text-[10px] text-[var(--color-fg-dim)]">
            {mac ? "⌘K" : "Ctrl K"}
          </kbd>
        </button>
      </div>

      {/* Primary nav */}
      <nav className="px-2 flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-0.5">
          {PRIMARY.map((item) => <NavRow key={item.to} {...item} />)}
        </div>

        <div className="my-3 mx-2 h-px bg-[var(--color-border-subtle)]" aria-hidden="true" />

        <div className="grid grid-cols-1 gap-0.5">
          {SECONDARY.map((item) => <NavRow key={item.to} {...item} />)}
        </div>
      </nav>

      {/* Legal links — single line, dot-separated */}
      <div className="px-3 py-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {[
          { to: "/terms",     label: "AGB" },
          { to: "/privacy",   label: "Datenschutz" },
          { to: "/impressum", label: "Impressum" },
          { to: "/contact",   label: "Kontakt" },
        ].map(({ to, label }, i, arr) => (
          <span key={to} className="flex items-center gap-2">
            <Link to={to} className="text-[10.5px] text-[var(--color-fg-faint)] hover:text-[var(--color-fg-dim)] transition-colors">{label}</Link>
            {i < arr.length - 1 && <span className="text-[var(--color-fg-faint)] text-[10px] select-none">&middot;</span>}
          </span>
        ))}
      </div>

      {/* User pill */}
      <div className="px-2 pt-2 pb-3 border-t border-[var(--color-border-subtle)]" ref={menuRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className={clsx(
              "w-full grid grid-cols-[28px_1fr_16px] items-center gap-2.5 h-11 px-2 rounded-md",
              "text-left transition-colors",
              "hover:bg-[var(--color-bg-elev-1)]",
              "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-400)]",
            )}
            aria-label="Benutzermenü"
            aria-expanded={menuOpen}
          >
            {profile?.avatar ? (
              <img src={profile.avatar} alt="" className="w-7 h-7 rounded-md object-cover" />
            ) : (
              <span className="grid place-items-center w-7 h-7 rounded-md bg-[var(--color-accent-500)]/15 border border-[var(--color-accent-500)]/30 text-[var(--color-accent-200)] text-[11px] font-semibold">
                {initials}
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-[var(--color-fg)] truncate leading-tight">{userName}</span>
              <span className="block text-[11px] text-[var(--color-fg-muted)] truncate leading-tight mt-0.5">{me?.email}</span>
            </span>
            <ChevronUp className={clsx("w-3.5 h-3.5 text-[var(--color-fg-dim)] transition-transform", menuOpen && "rotate-180")} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute left-0 right-0 bottom-full mb-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] p-1 z-50 animate-slide-up"
              style={{ boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}
            >
              <NavLink
                to="/settings"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="grid grid-cols-[16px_1fr] items-center gap-2 px-2.5 py-2 rounded-md text-[13px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-3)] transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                <span>Profil</span>
              </NavLink>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); handleLogout(); }}
                className="grid grid-cols-[16px_1fr] items-center gap-2 w-full px-2.5 py-2 rounded-md text-[13px] text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="text-left">Abmelden</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
