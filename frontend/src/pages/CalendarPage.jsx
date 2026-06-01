import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import clsx from "clsx";
import { jobApi } from "../services/api";

// ─── Helpers ──────────────────────────────────────────────────────────

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

function pad(n) {
  return String(n).padStart(2, "0");
}

/**
 * Extract the calendar date from an API ISO string.
 * "2026-06-15T00:00:00Z"  → local Date for 2026-06-15 00:00
 * "2026-06-15"            → local Date for 2026-06-15 00:00
 * Prevents timezone shifts from moving the event to the wrong day.
 */
function parseApiCalendarDate(isoString) {
  if (!isoString) return null;
  const datePart = isoString.split("T")[0];
  const [y, m, d] = datePart.split("-").map(Number);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
  return new Date(y, m - 1, d);
}

function formatDateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function deDate(d) {
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.`;
}

function deDateLong(d) {
  const days = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  return `${days[d.getDay()]}, ${pad(d.getDate())}.`;
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/**
 * Build a 35-cell (5×7) or 42-cell (6×7) grid for a given month.
 * Each cell: { date: Date|null, isToday: bool, isOutside: bool, isWeekend: bool }
 */
function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  // Monday-based offset: 0=Mon … 6=Sun
  let startOffset = firstOfMonth.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayKey = formatDateKey(today);

  const cells = [];
  for (let i = 0; i < startOffset; i++) {
    const d = new Date(year, month, 1 - (startOffset - i));
    cells.push({
      date: d,
      key: formatDateKey(d),
      isToday: false,
      isOutside: true,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      dayNum: d.getDate(),
    });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    const key = formatDateKey(d);
    cells.push({
      date: d,
      key,
      isToday: key === todayKey,
      isOutside: false,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      dayNum: i,
    });
  }
  // Pad to complete weeks
  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const need = 7 - remainder;
    for (let i = 1; i <= need; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({
        date: d,
        key: formatDateKey(d),
        isToday: false,
        isOutside: true,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        dayNum: d.getDate(),
      });
    }
  }
  return cells;
}

// ─── Derive calendar events from saved jobs ───────────────────────────

const BENCHMARK_RESPONSE_DAYS = 8;

function deriveEventsFromJobs(jobs) {
  if (!jobs || !jobs.length) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const events = [];

  jobs.forEach((job) => {
    const company = job.company || "Unbekanntes Unternehmen";
    const role = job.role || job.title || "Stelle";
    const title = `${company} · ${role}`;
    const id = String(job.id);

    // 1. Deadline event (detail page shows deadline || expires_at; match that)
    const deadlineValue = job.deadline || job.expires_at;
    if (deadlineValue) {
      const dl = parseApiCalendarDate(deadlineValue);
      if (dl) {
        const daysUntil = Math.round((dl - today) / (1000 * 60 * 60 * 24));
        const ctx = daysUntil < 0
          ? "Bewerbungsfrist ist vorbei."
          : daysUntil === 0
          ? "Bewerbungsfrist endet heute."
          : daysUntil === 1
          ? "Bewerbungsfrist endet morgen."
          : `Bewerbungsfrist in ${daysUntil} Tagen.`;
        events.push({
          id: `${id}-dl`,
          jobId: job.id,
          title,
          date: dl,
          type: "deadline",
          context: ctx,
          actionLabel: "Stelle öffnen",
          actionTo: `/jobs/${job.id}`,
        });
      }
    }

    // 2. Follow-up reminder (applied > 7 days ago, no response yet)
    if (job.status === "applied") {
      const applied = parseApiCalendarDate(job.updated_at || job.created_at) || today;
      const daysSince = Math.round((today - applied) / (1000 * 60 * 60 * 24));
      if (daysSince >= 7) {
        const followUpDate = addDays(applied, 7);
        events.push({
          id: `${id}-fu`,
          jobId: job.id,
          title,
          date: followUpDate,
          type: "followup",
          context: `${daysSince} Tage seit Bewerbung. Schnitt: ${BENCHMARK_RESPONSE_DAYS} Tage. Nachfragen ist okay.`,
          actionLabel: "Stelle öffnen",
          actionTo: `/jobs/${job.id}`,
        });
      }
    }
  });

  return events;
}

const TYPE_META = {
  deadline: {
    label: "Bewerbungsfrist",
    dotColor: "var(--color-warning)",
    pillBg: "rgba(251, 191, 36, 0.12)",
    pillText: "var(--color-warning)",
  },
  followup: {
    label: "Follow-up Erinnerung",
    dotColor: "var(--color-accent-300)",
    pillBg: "rgba(124, 92, 255, 0.12)",
    pillText: "var(--color-accent-300)",
  },
};

// ─── ICS generation ───────────────────────────────────────────────────

function generateICS({ title, date, context }) {
  const dt = date;
  const dtStr = `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}`;
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@jobassist.app`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JobAssist//DE",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART;VALUE=DATE:${dtStr}`,
    `DTEND;VALUE=DATE:${dtStr}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${context}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jobassist-${dtStr}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────

/**
 * CalendarPage — month grid + upcoming deadlines & reminders.
 *
 * Shows a compact month view with color-coded event pills
 * (deadline / follow-up) and a list of the next 7 days.
 *
 * @returns {JSX.Element}
 */
export default function CalendarPage() {
  const navigate = useNavigate();
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => jobApi.list(1, 100).then((r) => r.data?.items ?? r.data ?? []),
    staleTime: 1000 * 60 * 2,
  });

  const events = useMemo(() => deriveEventsFromJobs(jobs), [jobs]);

  const eventsByKey = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      const k = formatDateKey(ev.date);
      if (!map[k]) map[k] = [];
      map[k].push(ev);
    });
    return map;
  }, [events]);

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const upcoming = useMemo(() => {
    const todayMidnight = new Date(now);
    todayMidnight.setHours(0, 0, 0, 0);
    const end = addDays(todayMidnight, 7);
    return events
      .filter((ev) => ev.date >= todayMidnight && ev.date <= end)
      .sort((a, b) => a.date - b.date);
  }, [events, now]);

  const monthName = `${MONTHS[month]} ${year}`;
  const deadlineCount = events.filter((e) => e.type === "deadline").length;
  const reminderCount = events.filter((e) => e.type === "followup").length;

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  return (
    <div className="page-enter">
      {/* ─── Header ───────────────────────────────────────────────── */}
      <header className="mb-8 lg:mb-10">
        <p className="text-[12px] tracking-[0.14em] uppercase text-[var(--color-fg-dim)]">
          {monthName}
        </p>
        <div className="flex items-end justify-between mt-3">
          <h1 className="font-display text-[44px] lg:text-[56px] font-normal text-[var(--color-fg)] leading-[1.05] tracking-[-0.025em]">
            {deadlineCount} Fristen · {reminderCount} Erinnerungen
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevMonth}
              className="w-8 h-8 rounded-lg border border-[var(--color-border-subtle)] flex items-center justify-center text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] hover:border-[var(--color-border)] transition-colors"
              aria-label="Vorheriger Monat"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="w-8 h-8 rounded-lg border border-[var(--color-border-subtle)] flex items-center justify-center text-[var(--color-fg-dim)] hover:text-[var(--color-fg)] hover:border-[var(--color-border)] transition-colors"
              aria-label="Nächster Monat"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ─── Calendar Grid ────────────────────────────────────────── */}
      <section className="mb-10 lg:mb-14">
        {/* Weekday headers */}
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[var(--color-fg-dim)] text-center py-2.5 border-b border-[var(--color-border)] border-r border-r-[var(--color-border-subtle)] last:border-r-0"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells — rendered in rows of 7 */}
        {Array.from({ length: grid.length / 7 }).map((_, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-7 border-b border-[var(--color-border-subtle)] last:border-b-0">
            {grid.slice(rowIdx * 7, rowIdx * 7 + 7).map((cell) => {
              const dayEvents = eventsByKey[cell.key] || [];
              return (
                <div
                  key={cell.key}
                  className={clsx(
                    "min-h-[100px] p-2 relative transition-colors",
                    "max-sm:min-h-[56px] max-sm:p-1",
                    cell.isOutside && "opacity-30",
                    cell.isWeekend && !cell.isOutside && "bg-[rgba(255,255,255,0.015)]",
                    cell.isToday && "bg-[rgba(124,92,255,0.08)]",
                  )}
                  style={
                    cell.isToday
                      ? { boxShadow: "inset 0 0 0 1px rgba(124,92,255,0.35)" }
                      : {}
                  }
                >
                  <span
                    className={clsx(
                      "text-[12px] tnum",
                      cell.isToday
                        ? "text-[var(--color-fg)] font-semibold"
                        : cell.isOutside
                        ? "text-[var(--color-fg-muted)] opacity-40"
                        : cell.isWeekend
                        ? "text-[var(--color-fg-dim)]"
                        : "text-[var(--color-fg-dim)]",
                    )}
                  >
                    {cell.dayNum}
                  </span>
                  {cell.isToday && (
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-accent-500)]" />
                  )}
                  <div className="mt-1 flex flex-col gap-1 max-sm:hidden">
                    {dayEvents.slice(0, 2).map((ev) => {
                      const meta = TYPE_META[ev.type];
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => { navigate(ev.actionTo); }}
                          className="text-left text-[10.5px] leading-tight px-1.5 py-0.5 rounded truncate cursor-pointer transition-opacity hover:opacity-80"
                          style={{
                            backgroundColor: meta.pillBg,
                            color: meta.pillText,
                          }}
                          title={ev.title}
                        >
                          {ev.title}
                        </button>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <span className="text-[10px] text-[var(--color-fg-faint)] px-1">
                        +{dayEvents.length - 2}
                      </span>
                    )}
                  </div>
                  {/* Mobile: dots instead of pills */}
                  <div className="sm:hidden mt-0.5 flex gap-1">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const meta = TYPE_META[ev.type];
                      return (
                        <span
                          key={ev.id}
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: meta.dotColor }}
                        />
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <span className="text-[8px] text-[var(--color-fg-faint)]">+</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </section>

      {/* ─── Legend ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-4 mb-10 px-4 py-3 border border-[var(--color-border-subtle)] rounded-lg text-[12px] text-[var(--color-fg-muted)] bg-[var(--color-bg-elev-1)]">
        {Object.entries(TYPE_META).map(([key, meta]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span
              className="w-[5px] h-[5px] rounded-full inline-block"
              style={{ backgroundColor: meta.dotColor }}
            />
            {meta.label}
          </span>
        ))}
      </div>

      {/* ─── Nächste 7 Tage ───────────────────────────────────────── */}
      <section className="mb-14">
        <div className="flex items-baseline justify-between mb-5">
          <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[var(--color-fg-dim)]">
            Nächste 7 Tage
          </p>
          <p className="text-[11px] text-[var(--color-fg-dim)] tnum">
            bis {deDate(addDays(now, 7))}
          </p>
        </div>

        <div className="border border-[var(--color-border-subtle)] rounded-lg divide-y divide-[var(--color-border-subtle)]">
          {upcoming.length === 0 && !isLoading && (
            <div className="px-4 py-6 text-[13px] text-[var(--color-fg-dim)]">
              {jobs.length === 0
                ? "Speichere eine Stelle, um sie hier zu sehen."
                : "Keine Termine in den nächsten 7 Tagen."}
            </div>
          )}
          {upcoming.map((ev) => {
            const meta = TYPE_META[ev.type];
            return (
              <div
                key={ev.id}
                className="grid grid-cols-1 sm:grid-cols-12 gap-4 px-4 py-4 items-start sm:items-center"
              >
                <div className="sm:col-span-2 flex items-center gap-2">
                  <span
                    className="text-[12px] tnum font-medium"
                    style={{ color: meta.pillText }}
                  >
                    {deDateLong(ev.date)}
                  </span>
                </div>
                <div className="sm:col-span-6 min-w-0">
                  <p className="text-[14px] font-medium leading-snug text-[var(--color-fg)]">
                    {ev.title}
                  </p>
                  <p className="text-[12.5px] text-[var(--color-fg-muted)] mt-0.5">
                    {ev.context}
                  </p>
                </div>
                <div className="sm:col-span-4 flex items-center gap-3 sm:justify-end flex-wrap">
                  <button
                    type="button"
                    onClick={() => { navigate(ev.actionTo); }}
                    className="text-[12px] text-[var(--color-fg-dim)] hover:text-[var(--color-fg-muted)] transition-colors"
                  >
                    {ev.actionLabel} →
                  </button>
                  <button
                    type="button"
                    onClick={() => generateICS(ev)}
                    className="rounded-lg border border-[var(--color-border-subtle)] text-[12px] px-3 py-1.5 hover:bg-[var(--color-bg-elev-1)] transition-colors flex items-center gap-1.5 text-[var(--color-fg-muted)]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Zum Kalender
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
