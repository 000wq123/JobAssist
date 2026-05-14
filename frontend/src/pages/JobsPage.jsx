import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Briefcase, Search, MapPin, ExternalLink, ChevronDown, Sparkles, SearchCheck, Bookmark } from "lucide-react";
import { jobApi, aiAssistantApi, researchApi } from "../services/api";
import SavedJobsSection from "../components/SavedJobsSection";

/**
 * Premium tile wrapper — ultra-dark gradient with 1px inner glow at top.
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
function Tile({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 ${className}`}
      style={{
        background: 'linear-gradient(180deg, #080808 0%, #030303 100%)',
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04)',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Small label in ALL-CAPS with wide tracking.
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
function TileLabel({ children, className = '' }) {
  return (
    <span
      className={`block text-[10px] font-medium tracking-[0.18em] uppercase text-[#505058] ${className}`}
    >
      {children}
    </span>
  );
}

const SAVED_STATUS_CFG = {
  bookmarked:   { label: "Gespeichert",  color: "#94a3b8" },
  applied:      { label: "Beworben",     color: "#10b981" },
  interviewing: { label: "Gespräch",     color: "#3b82f6" },
  offered:      { label: "Angebot",      color: "#fbbf24" },
  rejected:     { label: "Abgelehnt",    color: "#ef4444" },
};
function _StatusBadge({ status }) {
  const cfg = SAVED_STATUS_CFG[status] || SAVED_STATUS_CFG.bookmarked;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}40` }} />
      <span className="text-[10px] font-medium tracking-[0.14em] uppercase text-[#505058]">{cfg.label}</span>
    </span>
  );
}

/**
 * Minimalist match-score ring (32px) — Apple Wallet style.
 * @param {object} props
 * @param {number|null} props.score
 */
function MiniMatchRing({ score }) {
  const normalized = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null;
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = normalized == null ? circumference * 0.35 : circumference - (normalized / 100) * circumference;
  const color = normalized == null ? '#3a3a42' : normalized >= 60 ? '#10b981' : normalized >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-8 h-8 flex-shrink-0">
      <svg viewBox="0 0 32 32" className="-rotate-90 w-8 h-8">
        <circle cx="16" cy="16" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
        <circle
          cx="16" cy="16" r={radius} fill="none"
          stroke={color} strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-500"
          style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-semibold tabular-nums" style={{ color }}>
        {normalized != null ? normalized : '—'}
      </span>
    </div>
  );
}

import ViennaMap from "../components/ViennaMap";
import CityMap from "../components/CityMap";
import ResearchModal from "../components/ResearchModal";
import useUsageGuard from "../hooks/useUsageGuard";
import { getApiErrorMessage } from "../utils/apiError";

const loadStored = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
};

const saveStored = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const CITY_DISTRICTS = {
  "graz": [
    { value: "8010", label: "1. Bezirk – Innere Stadt" },
    { value: "8010", label: "2. Bezirk – St. Leonhard" },
    { value: "8010", label: "3. Bezirk – Geidorf" },
    { value: "8020", label: "4. Bezirk – Lend" },
    { value: "8020", label: "5. Bezirk – Gries" },
    { value: "8010", label: "6. Bezirk – Jakomini" },
    { value: "8041", label: "7. Bezirk – Liebenau" },
    { value: "8042", label: "8. Bezirk – St. Peter" },
    { value: "8010", label: "9. Bezirk – Waltendorf" },
    { value: "8047", label: "10. Bezirk – Ries" },
    { value: "8044", label: "11. Bezirk – Mariatrost" },
    { value: "8051", label: "12. Bezirk – Andritz" },
    { value: "8052", label: "13. Bezirk – Gösting" },
    { value: "8020", label: "14. Bezirk – Eggenberg" },
    { value: "8054", label: "15. Bezirk – Wetzelsdorf" },
    { value: "8054", label: "16. Bezirk – Straßgang" },
    { value: "8055", label: "17. Bezirk – Puntigam" },
  ],
  "linz": [
    { value: "4020", label: "Innenstadt" },
    { value: "4020", label: "Bulgariplatz" },
    { value: "4020", label: "Franckviertel" },
    { value: "4020", label: "Kaplanhof" },
    { value: "4020", label: "Neue Heimat" },
    { value: "4020", label: "Bindermichl" },
    { value: "4020", label: "Spallerhof" },
    { value: "4040", label: "Urfahr" },
    { value: "4040", label: "Dornach-Auhof" },
    { value: "4030", label: "Ebelsberg" },
    { value: "4030", label: "Pichling" },
  ],
  "salzburg": [
    { value: "5020", label: "Altstadt" },
    { value: "5020", label: "Mülln" },
    { value: "5020", label: "Nonntal" },
    { value: "5020", label: "Elisabeth-Vorstadt" },
    { value: "5020", label: "Schallmoos" },
    { value: "5020", label: "Lehen" },
    { value: "5020", label: "Maxglan" },
    { value: "5020", label: "Gneis" },
    { value: "5020", label: "Leopoldskron-Moos" },
    { value: "5026", label: "Aigen" },
    { value: "5026", label: "Gnigl" },
    { value: "5023", label: "Itzling" },
    { value: "5023", label: "Liefering" },
  ],
  "innsbruck": [
    { value: "6020", label: "Innere Stadt" },
    { value: "6020", label: "Wilten" },
    { value: "6020", label: "Pradl" },
    { value: "6020", label: "Saggen" },
    { value: "6020", label: "Dreiheiligen" },
    { value: "6020", label: "Hötting" },
    { value: "6020", label: "Mariahilf–St. Nikolaus" },
    { value: "6020", label: "St. Nikolaus" },
    { value: "6020", label: "Hötting West" },
    { value: "6020", label: "Sieglanger–Mentlberg" },
    { value: "6020", label: "Amras" },
    { value: "6020", label: "Arzl" },
    { value: "6020", label: "Mühlau" },
    { value: "6020", label: "Rum" },
  ],
  "klagenfurt": [
    { value: "9020", label: "Innere Stadt" },
    { value: "9020", label: "Völkendorf" },
    { value: "9020", label: "Waidmannsdorf" },
    { value: "9020", label: "St. Ruprecht" },
    { value: "9020", label: "Annabichl" },
    { value: "9020", label: "Viktring" },
  ],
  "st. pölten": [
    { value: "3100", label: "Innenstadt" },
    { value: "3100", label: "Harland" },
    { value: "3100", label: "Pottenbrunn" },
    { value: "3100", label: "Spratzern" },
  ],
  "wels": [
    { value: "4600", label: "Innenstadt" },
    { value: "4600", label: "Neustadt" },
    { value: "4600", label: "Lichtenegg" },
  ],
  "villach": [
    { value: "9500", label: "Innere Stadt" },
    { value: "9500", label: "Völkendorf" },
    { value: "9500", label: "Perau" },
  ],
};

/** Job search page: live search with filters, match scoring, and inline job-add flow. */
export default function JobsPage() {
  const [_searchParams] = useSearchParams();
  const _navigate = useNavigate();
  const qc = useQueryClient();
  const [searchTab, setSearchTab] = useState("recommended");

const [savingJobId, setSavingJobId] = useState(null);
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [expandedJob, setExpandedJob] = useState(null);
  const [jobAnalyses, setJobAnalyses] = useState({});
  const [_analyzingJobId, setAnalyzingJobId] = useState(null);
  const [researchModal, setResearchModal] = useState(null); // { companyName, jobDescription }
  const [researchData, setResearchData] = useState(null);
  const [researchCache, setResearchCache] = useState(() => loadStored("job-search-research") || {});
  const [researchLoading, setResearchLoading] = useState(false);
  const [sortBy, setSortBy] = useState("date");
  const [visibleCount, setVisibleCount] = useState(5);
  const [_savedFilter, _setSavedFilter] = useState("all");
  const [_savedSort, _setSavedSort] = useState("score");
  const [customSearchParams, setCustomSearchParams] = useState({
    keywords: "",
    location: "",
    jobType: "",
    bezirk: "",
  });
  // Tracks what was last submitted — drives the query key so cache is reused for identical searches
  const [submittedCustomParams, setSubmittedCustomParams] = useState(null);
  const [recommendedEnabled, setRecommendedEnabled] = useState(false);
  const { data: _initData } = useQuery({ queryKey: ["init"] });
  const loadMoreSentinelRef = useRef(null);

  // Restore scroll position on mount; save it on unmount
  useEffect(() => {
    const savedY = sessionStorage.getItem("jobsPageScrollY");
    if (savedY) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: parseInt(savedY, 10), behavior: "instant" });
      });
    }
    return () => {
      sessionStorage.setItem("jobsPageScrollY", String(window.scrollY));
    };
  }, []);

  const { data: savedJobs = [], isError: jobsError, error: jobsErrorObj, isFetching: jobsFetching } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => {
      return jobApi.list().then(r => {
        const items = r.data?.items ?? r.data ?? [];
        saveStored("jobs", items);
        return items;
      }).catch(err => {
        console.error("[JobsPage] API error:", err.response?.status, err.message);
        throw err;
      });
    },
    initialData: () => {
      const cached = loadStored("jobs");
      return cached || [];
    },
    initialDataUpdatedAt: 0,
    staleTime: 0,
    retry: 2,
  });
  if (jobsError) console.error("[JobsPage] Failed to load saved jobs:", jobsErrorObj);
  const { guardedRun: guardSearch } = useUsageGuard("job_search");

  // Recommended search (based on preferences)
  const {
    data: recommendedResults = [],
    isFetching: recommendedLoading,
  } = useQuery({
    queryKey: ["search", "recommended"],
    queryFn: () => jobApi.searchRecommended(1).then(r => r.data.jobs || []),
    enabled: recommendedEnabled,
    placeholderData: () => qc.getQueryData(["search", "recommended"]),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  // Custom search — query key includes submitted params so identical searches reuse cache
  const {
    data: customResults = [],
    isFetching: customLoading,
  } = useQuery({
    queryKey: ["search", "custom", submittedCustomParams],
    retry: 1,
    queryFn: () => {
      if (!submittedCustomParams) return [];
      const loc = submittedCustomParams.bezirk || submittedCustomParams.location || "";
      return jobApi.searchCustom(
        submittedCustomParams.keywords,
        loc,
        submittedCustomParams.jobType,
        1
      ).then(r => r.data.jobs || []);
    },
    enabled: !!submittedCustomParams,
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 5,
  });

  // Save job from search results
  const saveJobMutation = useMutation({
    mutationFn: jobApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Die Stelle wurde sicher hinterlegt");
      setSavedJobIds((prev) => new Set([...prev, savingJobId]));
      setSavingJobId(null);
    },
    onError: () => {
      toast.error("Die Stelle konnte nicht sicher hinterlegt werden");
      setSavingJobId(null);
    },
  });

  // Re-run search automatically when bezirk changes (only if a search was already submitted)
  useEffect(() => {
    if (
      searchTab === "custom" &&
      submittedCustomParams &&
      customSearchParams.bezirk &&
      customSearchParams.keywords
    ) {
      setSubmittedCustomParams({ ...customSearchParams });
    }
  }, [customSearchParams, searchTab, submittedCustomParams]);

  const handleRecommendedSearch = () => {
    guardSearch(() => {
      if (recommendedEnabled) {
        qc.invalidateQueries({ queryKey: ["search", "recommended"] });
      } else {
        setRecommendedEnabled(true);
      }
    });
  };

  const handleCustomSearch = (e) => {
    e.preventDefault();
    guardSearch(() => { setVisibleCount(5); setSubmittedCustomParams({ ...customSearchParams }); });
  };

  const handleSaveSearchResult = (result) => {
    setSavingJobId(result.source_id);
    saveJobMutation.mutate({
      company: result.company,
      role: result.title,
      description: result.description || `${result.title} bei ${result.company} in ${result.location}`,
      url: result.full_url || null,
    });
  };

  const _handleAnalyzeJob = async (result, idx) => {
    setAnalyzingJobId(idx);
    try {
      const res = await aiAssistantApi.analyzeJob({
        title: result.title,
        company: result.company,
        description: result.description,
        location: result.location,
      });
      setJobAnalyses((prev) => ({ ...prev, [idx]: res.data }));
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Die Stellen-Analyse konnte nicht erstellt werden"));
    } finally {
      setAnalyzingJobId(null);
    }
  };

  const handleResearch = async (result) => {
    const cachedResearch = researchCache[result.source_id];
    if (cachedResearch) {
      setResearchData(cachedResearch);
      setResearchModal({ companyName: result.company, jobDescription: result.description || "", sourceId: result.source_id });
      return;
    }
    setResearchData(null);
    setResearchModal({ companyName: result.company, jobDescription: result.description || "", sourceId: result.source_id });
    setResearchLoading(true);
    try {
      const res = await researchApi.research(result.company, result.description || "");
      setResearchData(res.data);
      setResearchCache((prev) => {
        const next = { ...prev, [result.source_id]: res.data };
        saveStored("job-search-research", next);
        return next;
      });
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") { setResearchModal(null); return; }
      if (err.response?.status === 429) { setResearchModal(null); return; }
      toast.error(getApiErrorMessage(err, "Recherche fehlgeschlagen"));
      setResearchModal(null);
    } finally {
      setResearchLoading(false);
    }
  };

  // Time ago formatter
  const _timeAgo = (date) => {
    if (!date) return null;
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Heute";
    if (days === 1) return "Gestern";
    return `Vor ${days} Tagen`;
  };

  const handleRefreshResearch = async () => {
    if (!researchModal) return;
    setResearchLoading(true);
    try {
      const res = await researchApi.research(researchModal.companyName || "", researchModal.jobDescription || "");
      setResearchData(res.data);
      if (researchModal.sourceId) {
        setResearchCache((prev) => {
          const next = { ...prev, [researchModal.sourceId]: res.data };
          saveStored("job-search-research", next);
          return next;
        });
      }
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") return;
      if (err.response?.status === 429) return;
      toast.error(getApiErrorMessage(err, "Recherche fehlgeschlagen"));
    } finally {
      setResearchLoading(false);
    }
  };

  const rawSearchResults = searchTab === "recommended" ? recommendedResults : customResults;
  const searchLoading = searchTab === "recommended" ? recommendedLoading : customLoading;

  const activeBezirk = searchTab === "custom" ? customSearchParams.bezirk : "";

  // Adzuna returns district names in location.display_name (e.g. "Wien, Meidling"), not postal codes
  const BEZIRK_NAMES = {
    "1010": "innere stadt", "1020": "leopoldstadt", "1030": "landstraße",
    "1040": "wieden",       "1050": "margareten",   "1060": "mariahilf",
    "1070": "neubau",       "1080": "josefstadt",   "1090": "alsergrund",
    "1100": "favoriten",    "1110": "simmering",    "1120": "meidling",
    "1130": "hietzing",     "1140": "penzing",      "1150": "rudolfsheim",
    "1160": "ottakring",    "1170": "hernals",      "1180": "währing",
    "1190": "döbling",      "1200": "brigittenau",  "1210": "floridsdorf",
    "1220": "donaustadt",   "1230": "liesing",
  };

  const filteredResults = activeBezirk
    ? rawSearchResults.filter((r) => {
        const loc  = (r.location    || "").toLowerCase();
        const desc = (r.description || "").toLowerCase();
        const districtName = BEZIRK_NAMES[activeBezirk];
        const districtNum  = parseInt(activeBezirk.slice(1, 3), 10); // "1230" → 23

        // 1. Location field explicitly matches the selected district
        if (districtName && loc.includes(districtName)) return true;
        if (loc.includes(activeBezirk)) return true;

        // 2. Description mentions the postal code, district name, or number pattern
        if (desc.includes(activeBezirk)) return true;
        if (districtName && desc.includes(districtName)) return true;
        if (desc.includes(`${districtNum}. bezirk`)) return true;
        if (desc.includes(`${districtNum}. wiener`)) return true;

        // 3. Location is generic Wien (no specific district) — keep as ambiguous
        const isGenericWien = (loc === "wien" || loc === "vienna" || loc === "" || loc === "österreich");
        if (isGenericWien) return true;

        // 4. Everything else (Korneuburg, Graz, specific wrong district) — exclude
        return false;
      })
    : rawSearchResults;

  const searchResults = [...filteredResults].sort((a, b) => {
    if (sortBy === "date") return new Date(b.updated || 0) - new Date(a.updated || 0);
    if (sortBy === "title") return (a.title || "").localeCompare(b.title || "", "de");
    if (sortBy === "company") return (a.company || "").localeCompare(b.company || "", "de");
    if (sortBy === "salary") return (b.salary ? 1 : 0) - (a.salary ? 1 : 0);
    return 0;
  });

  // IntersectionObserver for search results infinite scroll
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || visibleCount >= searchResults.length) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisibleCount((c) => c + 5);
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, searchResults.length]);

  const handleRefreshJobs = () => qc.invalidateQueries({ queryKey: ["jobs"] });

  return (
    <div className="animate-slide-up font-sans">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-[1.75rem] sm:text-[2rem] font-semibold tracking-tight text-white leading-none">
          Stellen-Zentrale
        </h1>
        <p className="mt-2 text-[0.6875rem] tracking-[0.18em] uppercase text-[#3a3a42]">
          Kuratiert · Bewertet · Vorbereitet
        </p>
      </div>

      <div className="grid grid-cols-12 gap-3 sm:gap-4">
        {/* === Saved Jobs — Premium curated section === */}
        <SavedJobsSection
          jobs={savedJobs}
          loading={jobsFetching}
          onRefresh={handleRefreshJobs}
        />

        {/* === Search Section === */}
        <div className="col-span-12 mt-1">
          <Tile>
            {/* Tab Navigation — enlarged hitboxes for usability */}
            <div className="flex flex-wrap gap-1 mb-6">
              <button
                onClick={() => setSearchTab("recommended")}
                className="px-4 py-2.5 rounded-lg transition-colors focus:outline-none"
                style={searchTab === "recommended"
                  ? { background: 'rgba(91,79,232,0.12)', borderBottom: '2px solid #5B4FE8' }
                  : { borderBottom: '2px solid transparent' }}
              >
                <span className={`text-[12px] font-semibold tracking-[0.12em] uppercase ${
                  searchTab === "recommended" ? "text-white" : "text-[#606070] hover:text-[#909098]"
                }`}>
                  Empfohlen
                </span>
              </button>
              <button
                onClick={() => setSearchTab("custom")}
                className="px-4 py-2.5 rounded-lg transition-colors focus:outline-none"
                style={searchTab === "custom"
                  ? { background: 'rgba(91,79,232,0.12)', borderBottom: '2px solid #5B4FE8' }
                  : { borderBottom: '2px solid transparent' }}
              >
                <span className={`text-[12px] font-semibold tracking-[0.12em] uppercase ${
                  searchTab === "custom" ? "text-white" : "text-[#606070] hover:text-[#909098]"
                }`}>
                  Eigene Suche
                </span>
              </button>
            </div>

            {/* Recommended Tab */}
            {searchTab === "recommended" && (
              <div>
                <p className="text-[11px] text-[#505058] mb-4">
                  Basierend auf deinen Präferenzen und Fähigkeiten
                </p>
                <button
                  onClick={handleRecommendedSearch}
                  disabled={recommendedLoading}
                  className="flex items-center justify-center gap-2.5 rounded-xl py-3 px-5 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 w-full font-semibold text-[13px] text-white"
                  style={{
                    background: recommendedLoading
                      ? 'rgba(91,79,232,0.4)'
                      : 'linear-gradient(135deg, #5B4FE8 0%, #7C3AED 100%)',
                    boxShadow: recommendedLoading ? 'none' : '0 4px 18px rgba(91,79,232,0.35)',
                  }}
                >
                  {recommendedLoading ? (
                    <div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles size={15} />
                  )}
                  {recommendedLoading ? "Suche läuft…" : "Neue Chancen entdecken"}
                </button>
              </div>
            )}

            {/* Custom Search Tab */}
            {searchTab === "custom" && (
              <form onSubmit={handleCustomSearch} className="space-y-4">
                <div className="space-y-1.5">
                  <TileLabel>Suchbegriffe</TileLabel>
                  <input
                    type="text"
                    placeholder="z.B. Verkauf, Gastro, IT, Praktikum"
                    value={customSearchParams.keywords}
                    onChange={(e) =>
                      setCustomSearchParams({ ...customSearchParams, keywords: e.target.value })
                    }
                    className="w-full appearance-none rounded-xl bg-[#0c0c0e] px-4 py-2.5 text-[13px] text-white placeholder-[#3a3a42] focus:outline-none min-h-[44px]"
                    style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.03)' }}
                  />
                </div>
                <div className="space-y-1.5">
                  <TileLabel>Ort</TileLabel>
                  <input
                    type="text"
                    placeholder="z.B. Wien, Graz, Linz, Salzburg"
                    value={customSearchParams.location}
                    onChange={(e) =>
                      setCustomSearchParams({ ...customSearchParams, location: e.target.value })
                    }
                    className="w-full appearance-none rounded-xl bg-[#0c0c0e] px-4 py-2.5 text-[13px] text-white placeholder-[#3a3a42] focus:outline-none min-h-[44px]"
                    style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.03)' }}
                  />
                </div>
                {/wien|vienna/i.test(customSearchParams.location) && (
                  <ViennaMap
                    value={customSearchParams.bezirk}
                    onChange={(val) => setCustomSearchParams({ ...customSearchParams, bezirk: val })}
                  />
                )}
                {customSearchParams.location && !(/wien|vienna/i.test(customSearchParams.location)) && (() => {
                  const cityKey = customSearchParams.location.trim().toLowerCase();
                  const MAP_CITIES = ["graz", "linz", "salzburg", "innsbruck"];
                  if (MAP_CITIES.includes(cityKey)) {
                    return (
                      <CityMap
                        cityKey={cityKey}
                        selected={customSearchParams.bezirk}
                        onSelect={(val) => setCustomSearchParams({ ...customSearchParams, bezirk: val || "" })}
                      />
                    );
                  }
                  if (CITY_DISTRICTS[cityKey]) {
                    return (
                      <div className="space-y-1.5">
                        <TileLabel>Bezirk</TileLabel>
                        <select
                          value={customSearchParams.bezirk}
                          onChange={(e) => setCustomSearchParams({ ...customSearchParams, bezirk: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#0c0c0e] text-[13px] text-white rounded-xl focus:outline-none appearance-none min-h-[44px]"
                          style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.03)' }}
                        >
                          <option value="">Alle Bezirke</option>
                          {CITY_DISTRICTS[cityKey].map((d) => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                        </select>
                      </div>
                    );
                  }
                  return null;
                })()}
                <div className="space-y-1.5">
                  <TileLabel>Stellenart</TileLabel>
                  <select
                    value={customSearchParams.jobType}
                    onChange={(e) =>
                      setCustomSearchParams({ ...customSearchParams, jobType: e.target.value })
                    }
                    className="w-full appearance-none rounded-xl bg-[#0c0c0e] px-4 py-2.5 text-[13px] text-white focus:outline-none min-h-[44px]"
                    style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.03)' }}
                  >
                    <option value="">Alle Stellenarten</option>
                    <option value="Vollzeit">Vollzeit</option>
                    <option value="Teilzeit">Teilzeit</option>
                    <option value="Praktikum">Praktikum</option>
                    <option value="Samstagsjob">Samstagsjob</option>
                    <option value="Ferialjob">Ferialjob</option>
                    <option value="Geringfügig">Geringfügig</option>
                    <option value="Freiberuflich">Freiberuflich</option>
                    <option value="Lehre">Lehre</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={customLoading || !customSearchParams.keywords}
                  className="flex items-center justify-center gap-2.5 rounded-xl py-3 px-5 w-full transition-all duration-200 active:scale-[0.98] disabled:opacity-50 font-semibold text-[13px] text-white"
                  style={{
                    background: (customLoading || !customSearchParams.keywords)
                      ? 'rgba(91,79,232,0.25)'
                      : 'linear-gradient(135deg, #5B4FE8 0%, #7C3AED 100%)',
                    boxShadow: (!customLoading && customSearchParams.keywords) ? '0 4px 18px rgba(91,79,232,0.35)' : 'none',
                  }}
                >
                  {customLoading ? (
                    <div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search size={15} />
                  )}
                  {customLoading ? "Suche läuft…" : "Stellen suchen"}
                </button>
              </form>
            )}
          </Tile>
        </div>

        {/* === Search Results skeleton while loading === */}
        {searchLoading && searchResults.length === 0 && (
          <div className="col-span-12 mt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-xl p-4 animate-pulse"
                  style={{
                    background: 'linear-gradient(180deg, #0c0c0e 0%, #080808 100%)',
                    boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/[0.05] flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-3 bg-white/[0.07] rounded-md w-4/5" />
                      <div className="h-2.5 bg-white/[0.04] rounded-md w-2/5" />
                      <div className="h-2 bg-white/[0.03] rounded-md w-3/5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === Search Results === */}
        {searchResults.length > 0 && (
          <div className="col-span-12 mt-1">
            <Tile>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-baseline gap-3">
                  <TileLabel>Ergebnisse</TileLabel>
                  <span className="text-[22px] font-semibold text-white leading-none">{searchResults.length}</span>
                  {activeBezirk && (
                    <span className="flex items-center gap-1 text-[10px] text-[#505058]">
                      <MapPin size={10} /> {activeBezirk}
                    </span>
                  )}
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs tracking-[0.14em] uppercase px-3 py-2 min-h-[44px] rounded-lg bg-transparent text-[#505058] focus:outline-none appearance-none cursor-pointer"
                >
                  <option value="date">Neueste</option>
                  <option value="title">Titel</option>
                  <option value="company">Firma</option>
                  <option value="salary">Gehalt</option>
                </select>
              </div>

              {/* Results grid — 2 per row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {searchResults.map((result, index) => {
                  const isExpanded = expandedJob === index;
                  const analysis = jobAnalyses[index];
                  const matchScore = analysis?.match_score ?? analysis?.matching_score ?? analysis?.score ?? null;

                  return (
                    <div
                      key={`${result.source_id}-${index}`}
                      className="rounded-xl overflow-hidden"
                      style={{
                        background: 'linear-gradient(180deg, #0c0c0e 0%, #080808 100%)',
                        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04)',
                      }}
                    >
                      {/* Card header — always visible */}
                      <button
                        className={`w-full p-4 text-left transition-colors hover:bg-white/[0.02] ${isExpanded ? 'bg-white/[0.01]' : ''}`}
                        onClick={() => {
                          const newExpanded = isExpanded ? null : index;
                          if (newExpanded !== null && expandedJob !== null && expandedJob !== newExpanded) {
                            setJobAnalyses((prev) => { const next = { ...prev }; delete next[expandedJob]; return next; });
                          }
                          setExpandedJob(newExpanded);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <MiniMatchRing score={matchScore} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-white leading-tight" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {result.title || "Ohne Titel"}
                            </p>
                            <p className="text-[11px] text-[#505058] truncate mt-0.5">
                              {result.company || "Unbekannt"}
                            </p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {result.location && (
                                <span className="text-[10px] text-[#3a3a42]">{result.location}</span>
                              )}
                              {result.updated && (
                                <span className="text-[10px] text-[#3a3a42] tabular-nums">
                                  {new Date(result.updated).toLocaleDateString("de-AT")}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronDown size={14} className={`text-[#2a2a32] transition-transform duration-200 flex-shrink-0 mt-0.5 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {/* Expanded detail panel */}
                      {isExpanded && (
                        <div
                          className="px-4 pb-4 space-y-4"
                          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          {/* Description */}
                          {result.description && (
                            <div>
                              <TileLabel className="mb-2">Beschreibung</TileLabel>
                              <p className="text-[12px] text-[#808088] leading-relaxed">{result.description}</p>
                            </div>
                          )}

                          {result.salary && (
                            <div className="flex items-baseline gap-2">
                              <TileLabel>Gehalt</TileLabel>
                              <span className="text-[13px] font-medium text-emerald-400">{result.salary}</span>
                            </div>
                          )}

                          {/* Flat action-links with subtle icons */}
                          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '12px' }}>
                            {result.full_url && (
                              <a
                                href={result.full_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-[11px] font-medium text-[#505058] hover:text-brand-300 transition-colors"
                              >
                                <ExternalLink size={12} />
                                Anzeige öffnen
                              </a>
                            )}
                            <button
                              onClick={() => handleSaveSearchResult(result)}
                              disabled={savingJobId === result.source_id}
                              className="flex items-center gap-1.5 text-[11px] font-medium text-[#505058] hover:text-brand-300 transition-colors disabled:opacity-50"
                            >
                              {savingJobId === result.source_id ? (
                                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Bookmark size={12} className={savedJobIds.has(result.source_id) ? "fill-brand-300 text-brand-300" : ""} />
                              )}
                              {savedJobIds.has(result.source_id) ? "Gespeichert" : "Speichern"}
                            </button>
                            <button
                              onClick={() => handleResearch(result)}
                              className="flex items-center gap-1.5 text-[11px] font-medium text-[#505058] hover:text-emerald-400 transition-colors"
                            >
                              <SearchCheck size={12} />
                              Recherche
                            </button>
                          </div>

                          {/* AI Analysis */}
                          {analysis && (
                            <div className="space-y-3 mt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '12px' }}>
                              <div className="flex items-center gap-1.5">
                                <Sparkles size={11} className="text-brand-300" aria-hidden="true" />
                                <TileLabel>Stellen-Analyse</TileLabel>
                              </div>

                              {analysis.what_to_expect && (
                                <div>
                                  <TileLabel className="mb-1">Was dich erwartet</TileLabel>
                                  <p className="text-[12px] text-[#808088] leading-relaxed">{analysis.what_to_expect}</p>
                                </div>
                              )}

                              {analysis.requirements?.length > 0 && (
                                <div>
                                  <TileLabel className="mb-1">Anforderungen</TileLabel>
                                  <ul className="space-y-1">
                                    {analysis.requirements.map((r, i) => (
                                      <li key={i} className="text-[12px] text-[#808088] flex gap-2">
                                        <span className="text-brand-500/60 flex-shrink-0">·</span>{r}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {analysis.nice_to_have?.length > 0 && (
                                <div>
                                  <TileLabel className="mb-1">Von Vorteil</TileLabel>
                                  <ul className="space-y-1">
                                    {analysis.nice_to_have.map((r, i) => (
                                      <li key={i} className="text-[12px] text-[#808088] flex gap-2">
                                        <span className="text-emerald-500/60 flex-shrink-0">+</span>{r}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {analysis.tips?.length > 0 && (
                                <div className="rounded-xl p-3" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.04) 0%, rgba(251,191,36,0.01) 100%)' }}>
                                  <TileLabel className="mb-1 !text-amber-500/70">Bewerbungstipps</TileLabel>
                                  <ul className="space-y-1">
                                    {analysis.tips.map((t, i) => (
                                      <li key={i} className="text-[12px] text-amber-400/60 flex gap-2">
                                        <span className="flex-shrink-0 text-amber-500/40">{i + 1}.</span>{t}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </Tile>
          </div>
        )}

        {/* No Results */}
        {!searchLoading &&
          searchResults.length === 0 &&
          (searchTab === "recommended" ? recommendedResults : customResults) !==
            undefined &&
          (searchTab === "custom" &&
            submittedCustomParams?.keywords) && (
            <div className="col-span-12 mt-1">
              <Tile className="text-center py-10">
                <Briefcase size={20} className="text-[#3a3a42] mx-auto mb-3" />
                <p className="text-[12px] text-[#505058]">Keine Stellen gefunden</p>
              </Tile>
            </div>
          )}
      </div>

      {researchModal && (
        <ResearchModal
          companyName={researchModal.companyName}
          data={researchData}
          loading={researchLoading}
          onRefresh={handleRefreshResearch}
          onClose={() => { setResearchModal(null); setResearchData(null); }}
        />
      )}

    </div>
  );
}
