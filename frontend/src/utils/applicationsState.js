export function parseJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function getMatchColorClass(_score) {
  return "bg-[var(--color-accent-500)]/10 text-[var(--color-accent-200)]";
}

export function getDeadlineMeta(deadlineValue, now = Date.now()) {
  if (!deadlineValue) return null;
  const deadline = new Date(deadlineValue);
  const nowDate = new Date(now);
  const sameCalendarDay =
    deadline.getFullYear() === nowDate.getFullYear() &&
    deadline.getMonth() === nowDate.getMonth() &&
    deadline.getDate() === nowDate.getDate();
  const daysLeft = Math.ceil((deadline.getTime() - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: "Überfällig", className: "bg-red-100 text-red-800" };
  if (sameCalendarDay || daysLeft === 0) return { label: "Heute", className: "bg-orange-100 text-orange-800" };
  if (daysLeft <= 3) return { label: `${daysLeft}T`, className: "bg-orange-100 text-orange-800" };
  return { label: `${daysLeft}T`, className: "bg-green-100 text-green-800" };
}

export function getMatchSummary(matchFeedback) {
  const parsed = parseJson(matchFeedback);
  return parsed?.summary || matchFeedback || "";
}

export function updateJobList(oldJobs = [], nextJob) {
  return oldJobs.map((entry) => (entry.id === nextJob.id ? nextJob : entry));
}

export function filterAndSortJobs(
  jobs,
  { searchQuery = "", filterStatus = "all", filterMinMatch = 0, sortBy = "recent" } = {}
) {
  return [...jobs]
    .filter((job) => {
      const matchesSearch =
        !searchQuery ||
        job.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || job.status === filterStatus;
      const matchesScore = job.match_score == null || job.match_score >= filterMinMatch;
      return matchesSearch && matchesStatus && matchesScore;
    })
    .sort((a, b) => {
      if (sortBy === "match-high") return (b.match_score || 0) - (a.match_score || 0);
      if (sortBy === "match-low") return (a.match_score || 0) - (b.match_score || 0);
      if (sortBy === "salary-high") return (parseInt(b.salary, 10) || 0) - (parseInt(a.salary, 10) || 0);
      if (sortBy === "salary-low") return (parseInt(a.salary, 10) || 0) - (parseInt(b.salary, 10) || 0);
      return new Date(b.created_at) - new Date(a.created_at);
    });
}

export function getDisabledReason({ feature, job, hasResume, isProcessing, draftLoading }) {
  if (feature === "research" && !job.company) return "Für Recherche fehlt der Firmenname";
  if ((feature === "match" || feature === "cover" || feature === "interview") && !hasResume) {
    return "Bitte zuerst einen Lebenslauf auswählen";
  }
  if (isProcessing) return "Aktion läuft bereits";
  if (feature === "draft" && draftLoading) return "Brief-Entwurf wird gerade erstellt";
  return "";
}
