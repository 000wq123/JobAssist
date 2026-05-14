import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight, ExternalLink, FileText, Sparkles, RefreshCw,
  Stethoscope, Code2, GraduationCap, ChefHat, Scale, TrendingUp,
  Palette, Megaphone, Truck, Wrench, Building2, ShieldCheck,
  HeartPulse, FlaskConical, Landmark, Leaf, Dumbbell, Camera,
  Music, Gavel, Plane, ShoppingCart, Cpu, BriefcaseBusiness,
} from "lucide-react";

const STATUS_CFG = {
  bookmarked:   { label: "Gespeichert",  color: "#94a3b8" },
  applied:      { label: "Beworben",     color: "#10b981" },
  interviewing: { label: "Gespräch",     color: "#3b82f6" },
  offered:      { label: "Angebot",      color: "#fbbf24" },
  rejected:     { label: "Abgelehnt",    color: "#ef4444" },
};

const FILTER_TABS = [
  { key: "all",          label: "Alle" },
  { key: "bookmarked",   label: "Gespeichert" },
  { key: "applied",      label: "Beworben" },
  { key: "interviewing", label: "Gespräch" },
  { key: "offered",      label: "Angebot" },
  { key: "rejected",     label: "Abgelehnt" },
];

const PULL_THRESHOLD = 60;
const PAGE_SIZE = 12;

const JOB_ICON_MAP = [
  { icon: Stethoscope,     rx: /\b(arzt|ärztin|doctor|physician|medizin|medical|zahnarzt|dentist|psychiater|psychiatrist|radiolog|orthopäd)/i },
  { icon: HeartPulse,      rx: /\b(pflege|nursing|nurse|krankenpflege|pflegekraft|altenpflege|pflegeassistenz|sanitäter|paramedic)/i },
  { icon: FlaskConical,    rx: /\b(labor|chemiker|chemist|pharma|biochem|biolog|scientist|forscher|researcher|analytiker|analyst)/i },
  { icon: Code2,           rx: /\b(entwickler|developer|software|engineer|programmer|devops|backend|frontend|fullstack|web|mobile|cloud|data scientist|machine learning|ki|ai)/i },
  { icon: Cpu,             rx: /\b(elektronik|elektrotechnik|electrical|hardware|embedded|firmware|chip|semiconductor)/i },
  { icon: GraduationCap,   rx: /\b(lehrer|lehrerin|teacher|pädagog|erzieher|erzieherin|ausbilder|trainer|dozent|professor|tutor|nachhilfe)/i },
  { icon: ChefHat,         rx: /\b(koch|köchin|chef|küche|baker|bäcker|catering|gastro|restaurant|konditor)/i },
  { icon: Scale,           rx: /\b(jurist|lawyer|attorney|legal|recht|anwalt|anwältin|richter|notar|compliance|steuerberater|auditor)/i },
  { icon: TrendingUp,      rx: /\b(finance|finanz|accountant|buchhalter|controlling|treasury|investment|banking|versicherung|insurance|fondsmanager)/i },
  { icon: Palette,         rx: /\b(design|designer|graphic|grafik|ux|ui|creative|illustrator|art director|brand|motion)/i },
  { icon: Megaphone,       rx: /\b(marketing|seo|content|social media|pr|public relations|kommunikation|werbung|advertising|copywriter)/i },
  { icon: ShoppingCart,    rx: /\b(sales|vertrieb|verkauf|account manager|kundenberater|handel|retail|ecommerce|e-commerce)/i },
  { icon: Truck,           rx: /\b(logistik|logistics|fahrer|driver|transport|lager|warehouse|supply chain|zusteller|kurier|courier|spedition)/i },
  { icon: Wrench,          rx: /\b(mechanic|mechaniker|techniker|instandhaltung|monteur|service technician|wartung|reparatur|installateur)/i },
  { icon: Building2,       rx: /\b(immobilien|real estate|architektur|architect|bauleiter|bauingenieur|construction|facility)/i },
  { icon: ShieldCheck,     rx: /\b(security|sicherheit|schutz|guard|wachmann|it security|cybersecurity|datenschutz|risikomanagement)/i },
  { icon: Landmark,        rx: /\b(verwaltung|administration|behörde|öffentlich|government|politik|staatlich|beamter)/i },
  { icon: Leaf,            rx: /\b(umwelt|environmental|sustainability|nachhaltig|garten|landwirtschaft|agriculture|forst|forestry)/i },
  { icon: Dumbbell,        rx: /\b(sport|fitness|trainer|coach|physiotherap|ergotherap|athletic)/i },
  { icon: Camera,          rx: /\b(fotograf|photographer|video|kamera|media|journalist|redakteur|editor|film)/i },
  { icon: Music,           rx: /\b(musik|musiker|musician|sound|audio|entertainer|veranstaltung|event)/i },
  { icon: Gavel,           rx: /\b(richter|judge|staatsanwalt|prosecutor|kriminolog)/i },
  { icon: Plane,           rx: /\b(pilot|aviation|luftfahrt|airline|flugbegleiter|cabin crew|reise|travel)/i },
  { icon: BriefcaseBusiness, rx: /\b(manager|management|geschäftsführer|ceo|cto|cfo|direktor|director|leiter|head of)/i },
];

/**
 * Returns a Lucide icon component that matches the job role, or null.
 * @param {string|null} role
 * @returns {React.ElementType|null}
 */
function getJobIcon(role) {
  if (!role) return null;
  for (const { icon, rx } of JOB_ICON_MAP) {
    if (rx.test(role)) return icon;
  }
  return null;
}

/**
 * Avatar tile showing a clearbit logo (or status-coloured fallback icon) for a job entry.
 * @param {object} props
 * @param {string} props.company
 * @param {string} props.status
 * @param {string} [props.url]
 * @param {string} [props.role]
 */
function LogoField({ company, status, url, role }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.bookmarked;

  const domain = (() => {
    if (url) {
      try { return new URL(url).hostname.replace(/^www\./, ""); } catch {}
    }
    if (company) {
      return company.toLowerCase().replace(/\s+(gmbh|ag|inc|ltd|llc|corp|se|kg|mbh|co\.?)$/i, "").replace(/[^a-z0-9]/g, "") + ".com";
    }
    return null;
  })();

  const sources = domain ? [
    `https://logo.clearbit.com/${domain}`,
  ] : [];

  const [srcIndex, setSrcIndex] = useState(0);
  useEffect(() => { setSrcIndex(0); }, [domain]);

  const logoSrc = srcIndex < sources.length ? sources[srcIndex] : null;

  return (
    <div
      className="flex-shrink-0 w-10 h-10 rounded-[10px] flex items-center justify-center overflow-hidden"
      style={{
        background: !logoSrc ? `${cfg.color}12` : "rgba(255,255,255,0.04)",
        boxShadow: `inset 0 0 0 1px ${!logoSrc ? `${cfg.color}18` : "rgba(255,255,255,0.06)"}`,
      }}
    >
      {logoSrc ? (
        <img
          src={logoSrc}
          alt={company || ""}
          className="w-7 h-7 object-contain"
          onError={() => setSrcIndex(i => i + 1)}
        />
      ) : (() => {
        const JobIcon = getJobIcon(role);
        return JobIcon
          ? <JobIcon size={20} style={{ color: cfg.color }} strokeWidth={1.5} />
          : <span className="text-[0.875rem] font-semibold" style={{ color: cfg.color }}>{(company || "?").charAt(0).toUpperCase()}</span>;
      })()}
    </div>
  );
}

/**
 * Circular progress ring indicating the AI match score (0–100).
 * @param {object} props
 * @param {number|null} props.score
 */
function NeonMatchRing({ score }) {
  const normalized = Number.isFinite(score)
    ? Math.max(0, Math.min(100, Math.round(score)))
    : null;
  const r = 14;
  const circ = 2 * Math.PI * r;
  const offset =
    normalized == null ? circ * 0.35 : circ - (normalized / 100) * circ;

  const color =
    normalized == null
      ? "#3a3a42"
      : normalized >= 60
        ? "#10b981"
        : normalized >= 40
          ? "#f59e0b"
          : "#ef4444";

  return (
    <div className="relative w-9 h-9 flex-shrink-0">
      <svg viewBox="0 0 36 36" className="-rotate-90 w-9 h-9">
        <defs>
          <filter id={`nrGlow-${normalized}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx="18" cy="18" r={r} fill="none" stroke="#111114" strokeWidth="1.5" />
        <circle
          cx="18" cy="18" r={r} fill="none"
          stroke={color} strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
          filter={`url(#nrGlow-${normalized})`}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[0.5625rem] font-semibold tabular-nums"
        style={{ color }}
      >
        {normalized != null ? normalized : "—"}
      </span>
    </div>
  );
}

/**
 * Returns a short German relative-time string (e.g. "Heute", "Vor 3T").
 * @param {string|null} dateStr
 * @returns {string|null}
 */
function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Heute";
  if (days === 1) return "Gestern";
  return `Vor ${days}T`;
}

/**
 * Animated placeholder row shown while job data is loading.
 * @param {object} props
 * @param {React.CSSProperties} [props.style]
 */
function SkeletonRow({ style }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 animate-pulse" style={style}>
      <div className="flex-shrink-0 w-10 h-10 rounded-[10px] bg-white/[0.05]" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3 bg-white/[0.07] rounded-md w-3/5" />
        <div className="h-2.5 bg-white/[0.04] rounded-md w-2/5" />
      </div>
      <div className="w-9 h-9 rounded-full bg-white/[0.04] flex-shrink-0" />
      <div className="w-3.5 h-3.5 bg-white/[0.03] rounded flex-shrink-0" />
    </div>
  );
}

/**
 * Premium "Gespeicherte Stellen" section — row-based transaction list.
 *
 * @param {object} props
 * @param {Array}   props.jobs      - Array of saved job objects
 * @param {boolean} [props.loading] - Show skeleton rows while fetching
 * @param {Function} [props.onRefresh] - Async callback for pull-to-refresh
 * @param {string}  [props.className]
 */
export default function SavedJobsSection({ jobs = [], loading = false, onRefresh, className = "" }) {
  const [activeTab, setActiveTab]   = useState("all");
  const [sortBy, setSortBy]         = useState("score");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [pullDist, setPullDist]     = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sentinelRef  = useRef(null);
  const touchStartY  = useRef(0);
  const sectionRef   = useRef(null);

  // Reset pagination when filter/sort changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTab, sortBy]);

  /* --- Filtering --- */
  const tabFilter = (job) => {
    if (activeTab === "all") return true;
    if (activeTab === "bookmarked") return !job.status || job.status === "bookmarked";
    return job.status === activeTab;
  };
  const filtered = jobs.filter(tabFilter);

  /* --- Sorting --- */
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "score") return (b.match_score ?? -1) - (a.match_score ?? -1);
    if (sortBy === "date")
      return new Date(b.updated_at || b.created_at || 0) -
             new Date(a.updated_at || a.created_at || 0);
    return (a.status || "").localeCompare(b.status || "");
  });
  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  /* --- Tab counts --- */
  const counts = {
    all:          jobs.length,
    bookmarked:   jobs.filter((j) => !j.status || j.status === "bookmarked").length,
    applied:      jobs.filter((j) => j.status === "applied").length,
    interviewing: jobs.filter((j) => j.status === "interviewing").length,
    offered:      jobs.filter((j) => j.status === "offered").length,
    rejected:     jobs.filter((j) => j.status === "rejected").length,
  };

  // IntersectionObserver — auto-load next page when sentinel scrolls into view
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((c) => c + PAGE_SIZE);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount]); // sentinel position changes with visibleCount

  // Pull-to-refresh touch handlers
  const handleTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (window.scrollY > 5 || !onRefresh) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) {
      setPullDist(Math.min(delta * 0.4, PULL_THRESHOLD));
    }
  }, [onRefresh]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDist >= PULL_THRESHOLD - 5 && onRefresh) {
      setIsRefreshing(true);
      try { await onRefresh(); } finally { setIsRefreshing(false); }
    }
    setPullDist(0);
  }, [pullDist, onRefresh]);

  // ── Empty / loading state (no saved jobs) ──────────────────────────────
  if (!jobs.length) {
    return (
      <section className={`col-span-12 ${className}`}>
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="block text-[0.625rem] font-medium tracking-[0.18em] uppercase text-[#505058]">
              Kuratierte Auswahl
            </span>
            <h2 className="mt-1 text-[1.375rem] sm:text-[1.625rem] font-semibold text-white tracking-tight leading-none">
              Gespeicherte Stellen
            </h2>
          </div>
        </div>
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: "rgba(255,255,255,0.02)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 0 rgba(255,255,255,0.04)",
          }}
        >
            <>
              <Sparkles size={24} className="text-[#3a3a42] mx-auto mb-3" />
              <p className="text-[0.8125rem] font-medium text-[#505058]">Noch keine Stellen gespeichert</p>
              <p className="text-[0.625rem] text-[#3a3a42] mt-1">
                Suche unten nach Jobs und speichere deine Favoriten
              </p>
            </>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className={`col-span-12 ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Pull-to-refresh indicator ── */}
      {(pullDist > 0 || isRefreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-150"
          style={{ height: isRefreshing ? 40 : pullDist }}
        >
          <RefreshCw
            size={16}
            className={`text-[#505058] transition-transform ${isRefreshing ? "animate-spin" : ""}`}
            style={{ transform: isRefreshing ? undefined : `rotate(${(pullDist / PULL_THRESHOLD) * 180}deg)` }}
          />
        </div>
      )}

      {/* ── Sticky section header + filter bar ── */}
      <div
        className="pb-4 px-2"
      >
        <div className="flex items-end justify-between pt-4 mb-4">
          <div>
            <span className="block text-[0.625rem] font-medium tracking-[0.18em] uppercase text-[#505058]">
              Kuratierte Auswahl
            </span>
            <h2 className="mt-1 text-[1.375rem] sm:text-[1.625rem] font-semibold text-white tracking-tight leading-none">
              Gespeicherte Stellen
            </h2>
          </div>
          <label className="sr-only" htmlFor="saved-jobs-sort">Stellen sortieren nach</label>
          <select
            id="saved-jobs-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            title="Sortierung der Stellenliste"
            className="text-[0.625rem] tracking-[0.14em] uppercase px-3 py-1.5 rounded-lg bg-transparent text-slate-400 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 appearance-none cursor-pointer"
          >
            <option value="score">Sortieren: Match ↓</option>
            <option value="date">Sortieren: Datum ↓</option>
            <option value="status">Sortieren: Status</option>
          </select>
        </div>

        {/* Filter tabs */}
        <div className="overflow-x-auto -mx-1 px-1 pb-0.5 no-scrollbar">
        <div
          className="inline-flex gap-1 p-1 rounded-xl bg-white/[0.03]"
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="relative px-2.5 sm:px-4 py-2 rounded-lg transition-all duration-200 min-h-[44px] whitespace-nowrap"
                style={
                  isActive
                    ? {
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
                        boxShadow:
                          "inset 0 1px 0 0 rgba(255,255,255,0.08), 0 0 12px rgba(91,79,232,0.08)",
                      }
                    : {}
                }
              >
                <span
                  className={`text-[0.625rem] font-medium tracking-[0.14em] uppercase transition-colors ${
                    isActive ? "text-white" : "text-[#3a3a42] hover:text-[#606068]"
                  }`}
                >
                  {tab.label}
                </span>
                <span
                  className={`ml-1.5 tabular-nums font-semibold text-[0.6rem] px-1.5 py-0.5 rounded-full transition-all ${
                    isActive
                      ? "bg-brand-500/20 text-brand-200"
                      : "text-[#505058]"
                  }`}
                >
                  {counts[tab.key]}
                </span>
                {isActive && (
                  <span
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-5 rounded-full"
                    style={{
                      background: "linear-gradient(90deg, #5B4FE8, #8B5CF6)",
                      boxShadow: "0 0 8px rgba(91,79,232,0.5)",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
        </div>
      </div>

      {/* ── Row-based list ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.02)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* Initial skeleton while loading with no data */}
        {loading && !visible.length
          ? Array.from({ length: 4 }).map((_, i) => (
              <SkeletonRow
                key={i}
                style={i > 0 ? { borderTop: "1px solid rgba(255,255,255,0.04)" } : undefined}
              />
            ))
          : !visible.length
          ? (
            <div className="p-8 text-center">
              <Sparkles size={24} className="text-[#3a3a42] mx-auto mb-3" />
              <p className="text-[0.8125rem] font-medium text-[#505058]">Noch keine Stellen gespeichert</p>
              <p className="text-[0.625rem] text-[#3a3a42] mt-1">
                Suche unten nach Jobs und speichere deine Favoriten
              </p>
            </div>
          )
          : visible.map((job, i) => {
              const score      = job.match_score != null ? Math.round(job.match_score) : null;
              const dateLabel  = timeAgo(job.updated_at || job.created_at);
              const statusCfg  = STATUS_CFG[job.status] || STATUS_CFG.bookmarked;

              return (
                <Link
                  key={job.id}
                  to={`/jobs/${job.id}`}
                  className="group flex items-center gap-3 px-5 py-3.5 transition-all duration-200 hover:bg-white/[0.02] active:bg-white/[0.04]"
                  style={
                    i > 0
                      ? {
                          borderTop: "1px solid transparent",
                          borderImage:
                            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 20%, rgba(255,255,255,0.04) 80%, transparent 100%) 1",
                        }
                      : {}
                  }
                >
                  {/* Logo */}
                  <div className="flex-shrink-0">
                    <LogoField company={job.company} status={job.status || "bookmarked"} url={job.url} role={job.role} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.8125rem] font-medium text-white truncate leading-tight">
                      {job.role}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[0.75rem] text-slate-300 truncate">
                        {job.company}
                      </span>
                      <span
                        className="flex-shrink-0 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.5625rem] font-semibold tracking-[0.14em] uppercase"
                        style={{
                          color: statusCfg.color,
                          background: `${statusCfg.color}14`,
                          border: `1px solid ${statusCfg.color}33`,
                        }}
                        title={`Status: ${statusCfg.label}`}
                      >
                        <span
                          className="h-1 w-1 rounded-full"
                          style={{ background: statusCfg.color, boxShadow: `0 0 4px ${statusCfg.color}80` }}
                        />
                        {statusCfg.label}
                      </span>
                      {job.location && (
                        <span className="text-[0.6875rem] text-slate-500 truncate max-w-[140px]" title={job.location}>
                          {job.location}
                        </span>
                      )}
                      {job.salary && (
                        <span className="text-[0.6875rem] text-emerald-400/80 truncate max-w-[120px]" title={job.salary}>
                          {job.salary}
                        </span>
                      )}
                      {dateLabel && (
                        <span className="text-[0.6875rem] text-slate-600 tabular-nums">
                          {dateLabel}
                        </span>
                      )}
                    </div>

                    {/* Quick actions — desktop hover only */}
                    <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-1">
                      <span
                        className="grid place-items-center w-7 h-7 rounded-lg transition-colors hover:bg-white/[0.04]"
                        title="Anzeige öffnen"
                      >
                        <ExternalLink size={13} className="text-[#3a3a42] group-hover:text-[#505058]" />
                      </span>
                      <span
                        className="grid place-items-center w-7 h-7 rounded-lg transition-colors hover:bg-white/[0.04]"
                        title="Anschreiben"
                      >
                        <FileText size={13} className="text-[#3a3a42] group-hover:text-[#505058]" />
                      </span>
                      <span
                        className="grid place-items-center w-7 h-7 rounded-lg transition-colors hover:bg-white/[0.04]"
                        title="Analysieren"
                      >
                        <Sparkles size={13} className="text-[#3a3a42] group-hover:text-[#505058]" />
                      </span>
                    </div>
                  </div>

                  {/* Right side: score ring + chevron */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <NeonMatchRing score={score} />
                    <ChevronRight
                      size={14}
                      className="text-[#1a1a22] transition-colors group-hover:text-[#3a3a42]"
                    />
                  </div>
                </Link>
              );
            })}

      </div>

      {/* Infinite scroll sentinel — triggers next page load */}
      {hasMore && <div ref={sentinelRef} className="h-1" />}
    </section>
  );
}
