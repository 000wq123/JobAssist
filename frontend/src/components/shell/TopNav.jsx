import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
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
import Popover from "../ui/Popover";

const USER_MENU = [
  { to: "/settings", label: "Einstellungen", icon: Settings },
  { to: "/billing",  label: "Mein Plan",     icon: CreditCard },
];

/**
 * Extracts initials from a full name or email.
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

function isMac() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

/**
 * TopNav — minimal 56px navigation bar for mobile.
 * Uses 12-col grid for layout (per project conventions).
 *
 * @param {object} props
 * @param {object} [props.me]
 * @param {object} [props.profile]
 * @param {() => void} props.onMenuClick
 * @param {() => void} props.onCommandClick
 */
export default function TopNav({ me, profile, onMenuClick, onCommandClick }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtnRef = useRef(null);
  const navigate = useNavigate();
  const mac = isMac();

  useEffect(() => {
    if (!menuOpen) return;
    const handler = () => { if (document.hidden) setMenuOpen(false); };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [menuOpen]);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    useAuthStore.getState().logout();
    navigate("/login");
  };

  const userName = me?.full_name || me?.email?.split("@")[0] || "Benutzer";
  const initials = getInitials(me?.full_name, me?.email);

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-bg-elev-1)]/80 backdrop-blur-md border-b border-[var(--color-border-subtle)]">
      <div className="grid grid-cols-12 items-center gap-2 h-13 max-w-[1440px] mx-auto px-4">

        {/* Left: hamburger + logo */}
        <div className="col-span-6 flex items-center gap-2">
          <button
            type="button"
            onClick={onMenuClick}
            className="grid place-items-center w-8 h-8 rounded-md text-[var(--color-fg-dim)] hover:text-[var(--color-fg-muted)] hover:bg-[var(--color-bg-elev-2)] transition-colors"
            aria-label="Menü öffnen"
          >
            <Menu className="w-4 h-4" />
          </button>
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded-md bg-[var(--color-accent-500)]">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <span className="hidden sm:block text-[13px] font-semibold text-[var(--color-fg)] tracking-tight">
              JobAssist
            </span>
          </NavLink>
        </div>

        {/* Right: search + avatar */}
        <div className="col-span-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCommandClick}
            className={clsx(
              "hidden sm:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md",
              "bg-[var(--color-bg-elev-2)] border border-[var(--color-border-subtle)] text-[var(--color-fg-faint)]",
              "hover:bg-[var(--color-bg-elev-3)] hover:text-[var(--color-fg-dim)] hover:border-[var(--color-border)] transition-colors",
              "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-400)]",
            )}
            aria-label="Befehlsmenü öffnen"
          >
            <Search className="w-3 h-3" />
            <span className="text-[11.5px]">Suchen</span>
            <kbd className="ml-0.5 inline-flex items-center justify-center min-w-[20px] h-[15px] px-1 rounded bg-[var(--color-bg-elev-3)] border border-[var(--color-border-subtle)] font-mono text-[9px] text-[var(--color-fg-faint)]">
              {mac ? "⌘K" : "^K"}
            </kbd>
          </button>

          <div>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className={clsx(
                "inline-flex items-center gap-1.5 h-7 pl-1 pr-2 rounded-md",
                "border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-2)]",
                "hover:bg-[var(--color-bg-elev-3)] hover:border-[var(--color-border)] transition-colors",
                "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-400)]",
              )}
              aria-label="Benutzermenü"
              aria-expanded={menuOpen}
              ref={menuBtnRef}
            >
              {profile?.avatar ? (
                <img src={profile.avatar} alt="" className="w-5 h-5 rounded object-cover" />
              ) : (
                <span className="grid place-items-center w-5 h-5 rounded bg-[var(--color-accent-500)]/20 border border-[var(--color-accent-500)]/30 text-[var(--color-accent-300)] text-[9px] font-semibold">
                  {initials}
                </span>
              )}
              <ChevronDown
                className={clsx(
                  "w-3 h-3 text-[var(--color-fg-faint)] transition-transform duration-150",
                  menuOpen && "rotate-180",
                )}
              />
            </button>

            <Popover
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              anchorRef={menuBtnRef}
              align="right"
              className="w-56 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-3)] p-1 animate-slide-up"
              style={{ boxShadow: "0 16px 40px rgba(0,0,0,0.60), 0 4px 12px rgba(0,0,0,0.40)" }}
            >
              <div className="px-2.5 py-2 mb-1 border-b border-[var(--color-border-subtle)]">
                <p className="text-[12px] font-semibold text-[var(--color-fg)] truncate">{userName}</p>
                <p className="text-[10.5px] text-[var(--color-fg-dim)] truncate mt-px">{me?.email}</p>
              </div>
              {USER_MENU.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="grid grid-cols-12 items-center gap-2 px-2.5 py-2 rounded-md text-[12.5px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)] transition-colors"
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
                className="grid grid-cols-12 items-center gap-2 w-full px-2.5 py-2 rounded-md text-[12.5px] text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
              >
                <LogOut className="col-span-1 w-3.5 h-3.5" />
                <span className="col-span-11 text-left">Abmelden</span>
              </button>
            </Popover>
          </div>
        </div>
      </div>
    </header>
  );
}
