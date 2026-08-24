import { useState, useEffect, useRef, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Briefcase, FileText, Bell,
  Settings, LogOut, Search,
  Sun, Moon, Monitor, ChevronUp,
} from "lucide-react";
import clsx from "clsx";
import useAuthStore from "../../hooks/useAuthStore";
import { authApi } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";

const PRIMARY = [
  { to: "/dashboard",  label: "Übersicht",   icon: LayoutDashboard, preload: () => import("../../pages/DashboardPage") },
  { to: "/jobs",       label: "Stellen",     icon: Briefcase,      preload: () => import("../../pages/JobsLayout") },
  { to: "/lebenslauf", label: "Lebenslauf",  icon: FileText,       preload: () => import("../../pages/CVBuilderPage") },
  { to: "/job-alerts", label: "Alerts",      icon: Bell,            preload: () => import("../../pages/JobAlertsPage") },
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

/* ── NavRow ── */
function NavRow({ to, label, icon: Icon, preload }) {
  const prefetched = useRef(false);

  const onIntent = useCallback(() => {
    if (prefetched.current || !preload) return;
    prefetched.current = true;
    preload().catch(() => {});
  }, [preload]);

  return (
    <NavLink
      to={to}
      onMouseEnter={onIntent}
      onFocus={onIntent}
      className={({ isActive }) =>
        clsx(
          "group relative grid grid-cols-[18px_1fr] items-center gap-3 h-9 pl-3 pr-3 my-px rounded-md",
          "text-[13px] font-medium transition-colors duration-100",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--app-focus-ring)]/30",
          isActive
            ? "font-semibold"
            : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]",
        )
      }
      style={({ isActive }) => ({
        color: `var(--app-${isActive ? "text" : "text-secondary"})`,
        background: isActive ? "var(--app-surface-hover, rgba(0,0,0,0.03))" : "transparent",
      })}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              style={{
                position: "absolute", left: 0, top: "6px", bottom: "6px",
                width: "3px", borderRadius: "9999px",
                background: "var(--app-brand, #E30613)",
              }}
            />
          )}
          <div
            className="w-[18px] h-[18px] rounded flex items-center justify-center flex-shrink-0 transition-colors"
            style={{
              background: isActive ? "var(--app-brand-soft, #FFF0F1)" : "transparent",
              color: `var(--app-${isActive ? "brand" : "text-secondary"})`,
            }}
          >
            <Icon className="w-[15px] h-[15px]" />
          </div>
          <span className="truncate">{label}</span>
        </>
      )}
    </NavLink>
  );
}

/* ── Sidebar ── */
export default function Sidebar({ me, profile, onCommandClick }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { preference, setTheme } = useTheme();
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
      className="hidden md:flex flex-col sticky top-0 self-start h-screen flex-shrink-0 z-30 border-r"
      style={{
        width: "200px",
        background: "var(--app-bg, #FAFAF8)",
        borderColor: "var(--app-border, #E7E7E4)",
      }}
    >
      {/* Brand */}
      <div className="pt-5 pb-3 px-3">
        <NavLink to="/dashboard" className="flex items-center gap-2.5 px-1.5" aria-label="JobAssist">
          <span
            className="grid h-[26px] w-[26px] place-items-center rounded-[5px] flex-shrink-0"
            style={{ background: "var(--app-brand, #E30613)" }}
          >
            <span className="text-white text-[11px] font-bold leading-none">JA</span>
          </span>
          <span className="text-[15px] font-bold tracking-[-0.02em]" style={{ color: "var(--app-text, #171717)" }}>
            JobAssist
          </span>
        </NavLink>
      </div>

      {/* Search */}
      <div className="px-2.5 pb-1.5">
        <button
          type="button"
          onClick={onCommandClick}
          className="w-full flex items-center gap-2.5 h-9 px-3 rounded-md text-[12px] transition-colors duration-100"
          style={{
            color: "var(--app-text-muted, #888)",
            background: "var(--app-surface-hover, rgba(0,0,0,0.03))",
          }}
        >
          <Search className="w-[14px] h-[14px] flex-shrink-0" />
          <span className="text-left flex-1 truncate">Suchen…</span>
          <kbd
            className="inline-flex items-center justify-center h-[17px] px-1 rounded font-mono text-[9px] flex-shrink-0"
            style={{ color: "var(--app-text-faint, #B0B0AD)", background: "var(--app-surface, #FFF)" }}
          >
            {mac ? "⌘K" : "^K"}
          </kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="px-2 flex-1 overflow-y-auto pt-1">
        <div className="flex flex-col gap-0.5">
          {PRIMARY.map((item) => (
            <NavRow key={item.to} {...item} />
          ))}
        </div>

        <div className="my-3 mx-2.5" style={{ height: "1px", background: "var(--app-border, #E7E7E4)" }} />

        <NavRow to="/settings" label="Einstellungen" icon={Settings} />
      </nav>

      {/* Premium account card */}
      <div className="px-2 pt-0 pb-3" ref={menuRef}>
        <div
          className="rounded-lg border p-2"
          style={{ borderColor: "var(--app-border, #E7E7E4)", background: "var(--app-surface, #FFF)" }}
        >
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="w-full flex items-center gap-2.5 text-left rounded-md p-1.5 transition-colors duration-100 cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
            aria-label="Benutzermenü"
            aria-expanded={menuOpen}
          >
            {profile?.avatar ? (
              <img src={profile.avatar} alt="" className="w-[28px] h-[28px] rounded-full object-cover flex-shrink-0" />
            ) : (
              <span
                className="grid place-items-center w-[28px] h-[28px] rounded-full flex-shrink-0 text-[10px] font-semibold"
                style={{ background: "var(--app-brand, #E30613)15", color: "var(--app-brand, #E30613)" }}
              >
                {initials}
              </span>
            )}
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-[12px] font-semibold truncate leading-tight" style={{ color: "var(--app-text, #171717)" }}>
                {userName}
              </span>
              <span className="block text-[10.5px] truncate mt-0.5" style={{ color: "var(--app-text-muted, #888)" }}>
                Profil ansehen
              </span>
            </span>
            <ChevronUp
              className={clsx("w-3 h-3 flex-shrink-0 transition-transform duration-150", menuOpen && "rotate-180")}
              style={{ color: "var(--app-text-faint, #B0B0AD)" }}
            />
          </button>
        </div>

        {menuOpen && (
          <div
            role="menu"
            className="absolute left-2 right-2 rounded-lg border z-50 p-1.5 shadow-lg"
            style={{
              bottom: "80px",
              background: "var(--app-surface, #FFF)",
              borderColor: "var(--app-border, #E7E7E4)",
            }}
          >
            <div className="px-2.5 py-2 mb-1 border-b" style={{ borderColor: "var(--app-border, #E7E7E4)" }}>
              <p className="text-[12px] font-semibold truncate" style={{ color: "var(--app-text, #171717)" }}>{userName}</p>
              <p className="text-[10.5px] truncate mt-0.5" style={{ color: "var(--app-text-muted, #888)" }}>{me?.email}</p>
            </div>

            <div className="px-2 py-1.5 border-b" style={{ borderColor: "var(--app-border, #E7E7E4)" }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: "var(--app-text-faint, #B0B0AD)" }}>
                Darstellung
              </p>
              <div className="flex items-center gap-1">
                {(["system", "light", "dark"]).map((t) => {
                  const isActive = preference === t;
                  const Icon = t === "system" ? Monitor : t === "light" ? Sun : Moon;
                  const label = t === "system" ? "System" : t === "light" ? "Hell" : "Dunkel";
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTheme(t)}
                      className="grid place-items-center w-8 h-8 rounded-md transition-colors duration-100"
                      style={{
                        background: isActive ? "var(--app-surface-hover, rgba(0,0,0,0.04))" : "transparent",
                        color: isActive ? "var(--app-text, #171717)" : "var(--app-text-muted, #888)",
                      }}
                      title={label}
                      aria-label={label}
                      aria-pressed={isActive}
                    >
                      <Icon className="w-[15px] h-[15px]" />
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={() => { setMenuOpen(false); handleLogout(); }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md mt-0.5 text-[12.5px] font-medium transition-colors duration-100 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
              style={{ color: "var(--app-error, #E05050)" }}
            >
              <LogOut className="w-[15px] h-[15px]" />
              <span>Abmelden</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}