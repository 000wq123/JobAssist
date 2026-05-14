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
    { key: "bookmarked",   label: "Gespeichert", icon: Bookmark,      iconColor: "text-blue-400",   color: "bg-blue-500/10 border-blue-500/20" },
    { key: "applied",      label: "Beworben",    icon: Send,           iconColor: "text-green-400",  color: "bg-green-500/10 border-green-500/20" },
    { key: "interviewing", label: "Gespräch",    icon: MessageSquare,  iconColor: "text-purple-400", color: "bg-purple-500/10 border-purple-500/20" },
    { key: "offered",      label: "Angebot",     icon: Award,          iconColor: "text-amber-400",  color: "bg-amber-500/10 border-amber-500/20" },
    { key: "rejected",     label: "Abgelehnt",   icon: XCircle,        iconColor: "text-red-400",    color: "bg-red-500/10 border-red-500/20" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3">
      {statuses.map(({ key, label, icon: Icon, iconColor, color }) => (
        <div key={key} className={`p-3 sm:p-4 rounded-xl border ${color} animate-slide-up`}>
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${iconColor}`} />
            <span className="text-[10px] sm:text-xs font-semibold text-slate-400 truncate">{label}</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-100">{stats[key] ?? 0}</div>
        </div>
      ))}
    </div>
  );
}
