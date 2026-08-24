import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import useFocusTrap from "../../hooks/useFocusTrap";
import { useNavigate } from "react-router-dom";
import {
  Search,
  LayoutDashboard,
  FileText,
  Briefcase,
  Bell,
  Settings,
  ArrowRight,
} from "lucide-react";

/**
 * Command groups — top-level intents and navigation shortcuts.
 * Each command has: id, label, hint, icon, group, action.
 */
function buildCommands(navigate, close) {
  const go = (path) => () => {
    navigate(path);
    close();
  };
  return [
    // Actions
    { id: "find-jobs",   group: "Aktionen",  label: "Stellen suchen",          hint: "Finde passende Jobs in Österreich", icon: Briefcase, action: go("/jobs") },
    { id: "alerts",      group: "Aktionen",  label: "Job-Alert einrichten",    hint: "Neue Stellen automatisch finden",    icon: Bell,      action: go("/job-alerts") },

    // Navigation
    { id: "nav-dashboard", group: "Navigation", label: "Dashboard",     icon: LayoutDashboard, action: go("/dashboard") },
    { id: "nav-jobs",      group: "Navigation", label: "Stellenmarkt",  icon: Briefcase,        action: go("/jobs") },
    { id: "nav-resume",    group: "Navigation", label: "Lebenslauf",    icon: FileText,         action: go("/lebenslauf") },
    { id: "nav-alerts",    group: "Navigation", label: "Job-Alerts",    icon: Bell,             action: go("/job-alerts") },
    { id: "nav-settings",  group: "Navigation", label: "Einstellungen", icon: Settings,         action: go("/settings") },
  ];
}

/**
 * CommandMenu — global ⌘K / Ctrl+K palette for navigation and AI actions.
 * Hand-rolled (no cmdk dep) to keep bundle lean.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 */
export default function CommandMenu({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const dialogRef = useRef(null);

  const commands = useMemo(() => buildCommands(navigate, onClose), [navigate, onClose]);

  const allCommands = commands;

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return allCommands.filter(
      (c) => c.label.toLowerCase().includes(q) || (c.hint || "").toLowerCase().includes(q),
    );
  }, [query, commands, allCommands]);

  // Group by `group`
  const grouped = useMemo(() => {
    const acc = {};
    filtered.forEach((c) => {
      acc[c.group] = acc[c.group] || [];
      acc[c.group].push(c);
    });
    return acc;
  }, [filtered]);

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      // Focus input on next tick
      const id = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(id);
    }
  }, [open]);

  // Trap focus while open and return focus on close
  useFocusTrap(open, dialogRef);

  // Global Escape to close regardless of focused element
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Reset active index when filter changes
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[activeIdx];
        if (cmd) cmd.action();
      }
    },
    [filtered, activeIdx, onClose],
  );

  if (!open) return null;

  let runningIdx = -1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Befehle"
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 animate-fade-in"
      onClick={onClose}
    >
      {/* Scrim */}
      <div
// eslint-disable-next-line no-restricted-syntax -- scrim overlay, not layout
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[600px] rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elev-2)] overflow-hidden animate-slide-up"
        style={{ boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}
      >
        {/* Search */}
        <div className="grid grid-cols-12 items-center gap-3 px-4 h-12 border-b border-[var(--color-border)]">
          <Search className="col-span-1 w-4 h-4 text-[var(--color-fg-dim)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Suche oder gib einen Befehl ein…"
            className="col-span-11 bg-transparent border-0 outline-none text-[14px] text-[var(--color-fg)] placeholder:text-[var(--color-fg-dim)] w-full"
          />
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[420px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-[var(--color-fg-dim)]">
              Keine Ergebnisse
            </div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="mb-2 last:mb-0">
                <div className="px-2 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-dim)]">
                  {group}
                </div>
                <div className="grid grid-cols-1 gap-0.5">
                  {items.map((c) => {
                    runningIdx += 1;
                    const isActive = runningIdx === activeIdx;
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.id}
                        onMouseEnter={() => setActiveIdx(runningIdx)}
                        onClick={c.action}
                        className={`grid grid-cols-12 items-center gap-3 w-full text-left px-3 py-2.5 rounded-md transition-colors ${
                          isActive
                            ? "bg-[var(--color-bg-elev-3)]"
                            : "hover:bg-[var(--color-bg-elev-3)]"
                        }`}
                      >
                        <Icon
                          className={`col-span-1 w-4 h-4 ${
                            isActive ? "text-[var(--color-accent-300)]" : "text-[var(--color-fg-dim)]"
                          }`}
                        />
                        <div className="col-span-10 min-w-0">
                          <div className="text-[13px] font-medium text-[var(--color-fg)] truncate">
                            {c.label}
                          </div>
                          {c.hint && (
                            <div className="text-[11.5px] text-[var(--color-fg-dim)] truncate">
                              {c.hint}
                            </div>
                          )}
                        </div>
                        {isActive && (
                          <ArrowRight className="col-span-1 justify-self-end w-3.5 h-3.5 text-[var(--color-accent-300)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="grid grid-cols-12 items-center gap-2 px-4 h-9 border-t border-[var(--color-border)] bg-[var(--color-bg-elev-1)] text-[11px] text-[var(--color-fg-dim)]">
          <div className="col-span-8 flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded bg-[var(--color-bg-elev-3)] border border-[var(--color-border)] font-mono text-[10px]">↑↓</kbd>
              Navigieren
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded bg-[var(--color-bg-elev-3)] border border-[var(--color-border)] font-mono text-[10px]">⏎</kbd>
              Auswählen
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded bg-[var(--color-bg-elev-3)] border border-[var(--color-border)] font-mono text-[10px]">Esc</kbd>
              Schließen
            </span>
          </div>
          <div className="col-span-4 text-right">
            JobAssist · {filtered.length} {filtered.length === 1 ? "Befehl" : "Befehle"}
          </div>
        </div>
      </div>
    </div>
  );
}
