import { Bookmark, Send, MessageSquare, Award, XCircle } from "lucide-react";

/**
 * Five-column pipeline status summary (bookmarked → applied → interview → offer → rejected).
 * @param {object} props
 * @param {Array<{status: string}>} [props.jobs]
 */
export default function PipelineStats({ jobs = [] }) {
  const stats = {
    bookmarked:   jobs.filter(j => j.status === "bookmarked").length,
    applied:      jobs.filter(j => j.status === "applied").length,
    interviewing: jobs.filter(j => j.status === "interviewing").length,
    offered:      jobs.filter(j => j.status === "offered").length,
    rejected:     jobs.filter(j => j.status === "rejected").length,
  };

  const statuses = [
    { key: "bookmarked",   label: "Gespeichert", icon: Bookmark,      iconColor: "text-[var(--color-info)]",       color: "bg-[var(--color-info-soft)] border-[var(--color-info)]/25" },
    { key: "applied",      label: "Beworben",    icon: Send,          iconColor: "text-[var(--color-success)]",    color: "bg-[var(--color-success-soft)] border-[var(--color-success)]/25" },
    { key: "interviewing", label: "Gespräch",    icon: MessageSquare, iconColor: "text-[#60a5fa]",                 color: "bg-[#60a5fa]/10 border-[#60a5fa]/25" },
    { key: "offered",      label: "Angebot",     icon: Award,         iconColor: "text-[var(--color-success)]",    color: "bg-[var(--color-success-soft)] border-[var(--color-success)]/25" },
    { key: "rejected",     label: "Abgelehnt",   icon: XCircle,       iconColor: "text-[var(--color-error)]",      color: "bg-[var(--color-error-soft)] border-[var(--color-error)]/25" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3">
      {statuses.map(({ key, label, icon: Icon, iconColor, color }) => (
        <div key={key} className={`p-3 sm:p-4 rounded-xl border ${color} animate-slide-up`}>
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${iconColor}`} />
            <span className="text-[10px] sm:text-xs font-semibold text-[var(--color-fg-muted)] truncate">{label}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[var(--color-fg)]">{stats[key] ?? 0}</div>
        </div>
      ))}
    </div>
  );
}
