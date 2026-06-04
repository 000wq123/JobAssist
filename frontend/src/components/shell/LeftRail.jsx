import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Bell,
  Settings,
  CreditCard,
  LogOut,
  Search,
  Sparkles,
  ChevronUp,
} from "lucide-react";
import clsx from "clsx";
import useAuthStore from "../../hooks/useAuthStore";
import { authApi } from "../../services/api";

const PRIMARY = [
  { to: "/dashboard",    label: "Dashboard",  icon: LayoutDashboard },
  { to: "/jobs",         label: "Stellen",    icon: Briefcase },
  { to: "/lebenslauf",   label: "Lebenslauf", icon: FileText },
  { to: "/job-alerts",   label: "Alerts",     icon: Bell },
];

const SECONDARY = [
  { to: "/settings", label: "Einstellungen", icon: Settings },
  { to: "/billing",  label: "Mein Plan",     icon: CreditCard },
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
 * NavRow — single nav item. Active state: subtle filled bg + bright text.
 * Inactive: muted text, hover lifts to elev-1.
 *
 * @param {{ to: string, label: string, icon: import('lucide-react').LucideIcon }} props
 */
function NavRow({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          "group grid grid-cols-[18px_1fr] items-center gap-2.5 h-8 px-2.5 rounded-md",
          "text-[13px] font-medium transition-colors duration-100",
          "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-400)]",
          isActive
            ? "text-[var(--color-fg)] bg-[var(--color-bg-elev-3)]"
            : "text-[var(--color-fg-dim)] hover:text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)]",
        )
      }
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

/**
 * LeftRail — persistent desktop navigation rail (≥ md breakpoint).
 *
 * 220 px wide, full viewport height, sticky. True dark surface.
 * Sections: brand → search → primary nav → divider → secondary nav → legal → user pill.
 *
 * @param {object} props
 * @param {object} [props.me]
 * @param {object} [props.profile]
 * @param {() => void} props.onCommandClick
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
    try { await authApi.logout(); } catch { /* ignore */ }
    useAuthStore.getState().logout();
    navigate("/login");
  };

  const userName = me?.full_name || me?.email?.split("@")[0] || "Benutzer";
  const initials = getInitials(me?.full_name, me?.email);

  return (
    <aside
      className={clsx(
        "hidden md:flex flex-col",
        "sticky top-0 self-start h-screen w-[220px] flex-shrink-0",
        "border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)]",
        "z-30",
      )}
    >
      {/* Brand */}
      <div className="h-13 px-3 flex items-center border-b border-[var(--color-border-subtle)]">
        <NavLink to="/dashboard" className="flex items-center gap-2.5 px-1 py-3">
          <div className="grid h-6 w-6 place-items-center rounded-md bg-[var(--color-accent-500)]">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <span className="text-[13px] font-semibold text-[var(--color-fg)] tracking-tight">
            JobAssist
          </span>
        </NavLink>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <button
          type="button"
          onClick={onCommandClick}
          className={clsx(
            "w-full grid grid-cols-[14px_1fr_auto] items-center gap-2 h-7 px-2.5 rounded-md",
            "bg-[var(--color-bg-elev-2)] border border-[var(--color-border-subtle)]",
            "text-[12px] text-[var(--color-fg-faint)]",
            "hover:bg-[var(--color-bg-elev-3)] hover:text-[var(--color-fg-dim)] hover:border-[var(--color-border)] transition-colors duration-100",
            "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-400)]",
          )}
          aria-label="Befehlsmenü öffnen"
        >
          <Search className="w-3 h-3" />
          <span className="text-left">Suchen…</span>
          <kbd className="inline-flex items-center justify-center min-w-[22px] h-[16px] px-1 rounded bg-[var(--color-bg-elev-3)] border border-[var(--color-border-subtle)] font-mono text-[9px] text-[var(--color-fg-faint)]">
            {mac ? "⌘K" : "^K"}
          </kbd>
        </button>
      </div>

      {/* Primary nav */}
      <nav className="px-2 flex-1 overflow-y-auto pt-1">
        <div className="grid grid-cols-1 gap-px">
          {PRIMARY.map((item) => <NavRow key={item.to} {...item} />)}
        </div>

        <div className="my-3 mx-1 h-px bg-[var(--color-border-subtle)]" aria-hidden="true" />

        <div className="grid grid-cols-1 gap-px">
          {SECONDARY.map((item) => <NavRow key={item.to} {...item} />)}
        </div>
      </nav>

      {/* Legal links */}
      <div className="px-3 py-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        {[
          { to: "/terms",     label: "AGB" },
          { to: "/privacy",   label: "Datenschutz" },
          { to: "/impressum", label: "Impressum" },
          { to: "/contact",   label: "Kontakt" },
        ].map(({ to, label }, i, arr) => (
          <span key={to} className="flex items-center gap-2">
            <Link
              to={to}
              className="text-[10px] text-[var(--color-fg-faint)] hover:text-[var(--color-fg-dim)] transition-colors"
            >
              {label}
            </Link>
            {i < arr.length - 1 && (
              <span className="text-[var(--color-fg-faint)] text-[9px] select-none">&middot;</span>
            )}
          </span>
        ))}
      </div>

      {/* User pill */}
      <div
        className="px-2 pt-2 pb-3 border-t border-[var(--color-border-subtle)]"
        ref={menuRef}
      >
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className={clsx(
              "w-full grid grid-cols-[26px_1fr_14px] items-center gap-2 h-10 px-2 rounded-md",
              "text-left transition-colors duration-100",
              "hover:bg-[var(--color-bg-elev-2)]",
              "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-400)]",
            )}
            aria-label="Benutzermenü"
            aria-expanded={menuOpen}
          >
            {profile?.avatar ? (
              <img src={profile.avatar} alt="" className="w-6 h-6 rounded object-cover" />
            ) : (
              <span className="grid place-items-center w-6 h-6 rounded bg-[var(--color-accent-500)]/20 border border-[var(--color-accent-500)]/30 text-[var(--color-accent-300)] text-[10px] font-semibold">
                {initials}
              </span>
            )}
            <span className="min-w-0">
              <span className="block text-[12px] font-semibold text-[var(--color-fg)] truncate leading-tight">
                {userName}
              </span>
              <span className="block text-[10.5px] text-[var(--color-fg-dim)] truncate leading-tight mt-px">
                {me?.email}
              </span>
            </span>
            <ChevronUp
              className={clsx(
                "w-3 h-3 text-[var(--color-fg-faint)] transition-transform duration-150",
                menuOpen && "rotate-180",
              )}
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-3)] p-1 z-50 animate-slide-up"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: "100%",
                marginBottom: "6px",
                boxShadow: "0 16px 40px rgba(0,0,0,0.60), 0 4px 12px rgba(0,0,0,0.40)",
              }}
            >
              <div className="px-2.5 py-2 mb-1 border-b border-[var(--color-border-subtle)]">
                <p className="text-[12px] font-semibold text-[var(--color-fg)] truncate">{userName}</p>
                <p className="text-[10.5px] text-[var(--color-fg-dim)] truncate mt-px">{me?.email}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); handleLogout(); }}
                className="grid grid-cols-[14px_1fr] items-center gap-2 w-full px-2.5 py-2 rounded-md text-[12.5px] text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
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
