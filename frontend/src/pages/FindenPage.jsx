/**
 * FindenPage — discovery surface for new jobs.
 *
 * v1 state (this file): functional placeholder using the existing search form
 * extracted from JobsPage. Renders KI-Empfehlungen and Eigene Suche tabs, plus
 * a list of results using the shared `JobRow` component.
 *
 * v2 (step 6): redesign as a TikTok-style feed — one job per screen, Verlauf
 * strip, undo toast, story-hero per card. The data hooks stay the same; only
 * the presentation changes.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Search, Sparkles, Globe, Building2, ShoppingBag, Landmark } from "lucide-react";

import { jobApi } from "../services/api";
import useUsageGuard from "../hooks/useUsageGuard";
import { getApiErrorMessage } from "../utils/apiError";

import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Tabs from "../components/ui/Tabs";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import JobRow from "../components/jobs/JobRow";

const JOB_TYPES = ["Vollzeit", "Teilzeit", "Praktikum", "Lehre", "Samstagsjob", "Freiberuflich"];

const loadStored = (key) => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : undefined; } catch { return undefined; }
};

/** Loading placeholder for a search row. */
function RowSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-3 py-4 items-baseline">
      <div className="col-span-7"><Skeleton className="h-4 w-3/5 mb-1.5" /><Skeleton className="h-3 w-2/5" /></div>
      <div className="col-span-3"><Skeleton className="h-3 w-20" /></div>
      <div className="col-span-2"><Skeleton className="h-4 w-10 ml-auto" /></div>
    </div>
  );
}

/**
 * FindenPage — search & discovery. Step 6 will replace this layout with the
 * TikTok-feed design from /demo/v6/index.html.
 */
export default function FindenPage() {
  const qc = useQueryClient();
  const { guardedRun: guardSearch } = useUsageGuard("job_search");

  // Saved jobs — used only to detect "already saved" state for search results.
  const { data: savedJobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () =>
      jobApi.list().then((r) => {
        const items = r.data?.items ?? r.data ?? [];
        return items;
      }),
    initialData: () => loadStored("jobs") || [],
    initialDataUpdatedAt: 0,
    staleTime: 0,
  });

  // ─── Search state ───────────────────────────────────────────────
  const [searchTab, setSearchTab] = useState("recommended");
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("");
  const [submittedParams, setSubmittedParams] = useState(null);
  const [recommendedEnabled, setRecommendedEnabled] = useState(false);
  const [savedSearchIds, setSavedSearchIds] = useState(() => new Set());

  // Jooble search state
  const [joobleKeywords, setJoobleKeywords] = useState("");
  const [joobleLocation, setJoobleLocation] = useState("");
  const [joobleSubmitted, setJoobleSubmitted] = useState(null);

  // Scraper search states
  const [karriereKeywords, setKarriereKeywords] = useState("");
  const [karriereLocation, setKarriereLocation] = useState("");
  const [karriereSubmitted, setKarriereSubmitted] = useState(null);

  const [willhabenKeywords, setWillhabenKeywords] = useState("");
  const [willhabenLocation, setWillhabenLocation] = useState("");
  const [willhabenSubmitted, setWillhabenSubmitted] = useState(null);

  const [amsKeywords, setAmsKeywords] = useState("");
  const [amsLocation, setAmsLocation] = useState("");
  const [amsSubmitted, setAmsSubmitted] = useState(null);

  const { data: recommendedData, isFetching: recommendedLoading } = useQuery({
    queryKey: ["search", "recommended"],
    queryFn: () => jobApi.searchRecommended(1).then((r) => r.data),
    enabled: recommendedEnabled,
    placeholderData: () => qc.getQueryData(["search", "recommended"]),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const { data: customData, isFetching: customLoading } = useQuery({
    queryKey: ["search", "custom", submittedParams],
    enabled: !!submittedParams,
    queryFn: () => {
      if (!submittedParams) return null;
      return jobApi
        .searchCustom(submittedParams.keywords, submittedParams.location, submittedParams.jobType, 1)
        .then((r) => r.data);
    },
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const { data: joobleData, isFetching: joobleLoading } = useQuery({
    queryKey: ["search", "jooble", joobleSubmitted],
    enabled: !!joobleSubmitted,
    queryFn: () => {
      if (!joobleSubmitted) return null;
      return jobApi
        .searchJooble(joobleSubmitted.keywords, joobleSubmitted.location, 1)
        .then((r) => r.data);
    },
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const { data: karriereData, isFetching: karriereLoading } = useQuery({
    queryKey: ["search", "karriere", karriereSubmitted],
    enabled: !!karriereSubmitted,
    queryFn: () => {
      if (!karriereSubmitted) return null;
      return jobApi
        .searchKarriere(karriereSubmitted.keywords, karriereSubmitted.location, 1)
        .then((r) => r.data);
    },
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const { data: willhabenData, isFetching: willhabenLoading } = useQuery({
    queryKey: ["search", "willhaben", willhabenSubmitted],
    enabled: !!willhabenSubmitted,
    queryFn: () => {
      if (!willhabenSubmitted) return null;
      return jobApi
        .searchWillhaben(willhabenSubmitted.keywords, willhabenSubmitted.location, 1)
        .then((r) => r.data);
    },
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const { data: amsData, isFetching: amsLoading } = useQuery({
    queryKey: ["search", "ams", amsSubmitted],
    enabled: !!amsSubmitted,
    queryFn: () => {
      if (!amsSubmitted) return null;
      return jobApi
        .searchAms(amsSubmitted.keywords, amsSubmitted.location, 1)
        .then((r) => r.data);
    },
    placeholderData: (prev) => prev,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const activeData =
    searchTab === "recommended" ? recommendedData :
    searchTab === "jooble" ? joobleData :
    searchTab === "karriere" ? karriereData :
    searchTab === "willhaben" ? willhabenData :
    searchTab === "ams" ? amsData :
    customData;
  const searchResults = activeData?.jobs || [];
  const searchError = activeData?.error || null;
  const searchLoading =
    searchTab === "recommended" ? recommendedLoading :
    searchTab === "jooble" ? joobleLoading :
    searchTab === "karriere" ? karriereLoading :
    searchTab === "willhaben" ? willhabenLoading :
    searchTab === "ams" ? amsLoading :
    customLoading;

  const saveJobMutation = useMutation({
    mutationFn: jobApi.create,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      if (vars.__sourceId) {
        setSavedSearchIds((prev) => new Set([...prev, vars.__sourceId]));
      }
    },
    onError: (err, vars) => {
      toast.error(getApiErrorMessage(err, "Stelle konnte nicht gespeichert werden"));
      // Rollback optimistic state so the user can retry.
      if (vars?.__sourceId) {
        setSavedSearchIds((prev) => {
          const next = new Set(prev);
          next.delete(vars.__sourceId);
          return next;
        });
      }
    },
  });

  const handleRecommended = () => {
    guardSearch(() => {
      if (recommendedEnabled) {
        qc.invalidateQueries({ queryKey: ["search", "recommended"] });
      } else {
        setRecommendedEnabled(true);
      }
    });
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!keywords.trim()) {
      toast.error("Bitte Suchbegriffe eingeben");
      return;
    }
    guardSearch(() => {
      setSubmittedParams({ keywords: keywords.trim(), location: location.trim(), jobType });
    });
  };

  const handleJoobleSubmit = (e) => {
    e.preventDefault();
    if (!joobleKeywords.trim()) {
      toast.error("Bitte Suchbegriffe eingeben");
      return;
    }
    guardSearch(() => {
      setJoobleSubmitted({ keywords: joobleKeywords.trim(), location: joobleLocation.trim() });
    });
  };

  const handleKarriereSubmit = (e) => {
    e.preventDefault();
    if (!karriereKeywords.trim()) {
      toast.error("Bitte Suchbegriffe eingeben");
      return;
    }
    guardSearch(() => {
      setKarriereSubmitted({ keywords: karriereKeywords.trim(), location: karriereLocation.trim() });
    });
  };

  const handleWillhabenSubmit = (e) => {
    e.preventDefault();
    if (!willhabenKeywords.trim()) {
      toast.error("Bitte Suchbegriffe eingeben");
      return;
    }
    guardSearch(() => {
      setWillhabenSubmitted({ keywords: willhabenKeywords.trim(), location: willhabenLocation.trim() });
    });
  };

  const handleAmsSubmit = (e) => {
    e.preventDefault();
    if (!amsKeywords.trim()) {
      toast.error("Bitte Suchbegriffe eingeben");
      return;
    }
    guardSearch(() => {
      setAmsSubmitted({ keywords: amsKeywords.trim(), location: amsLocation.trim() });
    });
  };

  const handleSaveResult = (result) => {
    // Optimistic UI: mark as saved immediately, toast immediately, then
    // fire the network request in the background. The user perceives zero
    // latency — the save action is done the instant the click happens.
    setSavedSearchIds((prev) => new Set([...prev, result.source_id]));
    toast.success("Stelle gespeichert");
    saveJobMutation.mutate({
      company: result.company,
      role: result.title,
      description: result.description || `${result.title} bei ${result.company} in ${result.location}`,
      url: result.full_url || null,
      salary_text: result.salary || null,
      location: result.location || null,
      source: result.source || null,
      source_id: result.source_id || null,
      posted_at: result.updated || null,
      __sourceId: result.source_id,
    });
  };

  return (
    <div className="flex flex-col gap-10 animate-slide-up">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="min-w-0">
        <h1
          className="text-[28px] sm:text-[34px] font-semibold tracking-tight leading-[1.1] text-[var(--color-fg)]"
          style={{ letterSpacing: "-0.025em" }}
        >
          Finden
        </h1>
        <p className="mt-2.5 text-[14px] text-[var(--color-fg-muted)]">
          Neue Stellen — KI-Empfehlungen oder eigene Suche.
        </p>
      </header>

      {/* ── Search form ─ functional, simple ───────────────────────── */}
      <section className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)]/40 overflow-hidden">
        <header className="px-5 sm:px-6 pt-5 pb-4 border-b border-[var(--color-border-subtle)] flex items-end justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-[18px] sm:text-[19px] font-semibold tracking-tight text-[var(--color-fg)]">
              Neue Stelle finden
            </h2>
            <p className="mt-1 text-[12.5px] text-[var(--color-fg-muted)]">
              {searchTab === "recommended"
                ? "KI-Empfehlungen aus deinem Profil und Lebenslauf."
                : searchTab === "jooble"
                ? "Jooble durchsucht karriere.at, stepstone.at und weitere Quellen."
                : searchTab === "karriere"
                ? "Österreichs größte Jobbörse — direkt durchsuchen."
                : searchTab === "willhaben"
                ? "Kleinanzeigen-Plattform — gut für Minijobs und Teilzeit."
                : searchTab === "ams"
                ? "Arbeitsmarktservice — offizielle Stellen der Regierung."
                : "Eigene Suche — Begriffe, Ort und Art der Stelle frei wählen."}
            </p>
          </div>
          <Tabs
            items={[
              { value: "recommended", label: "Empfohlen", icon: Sparkles },
              { value: "custom",      label: "Eigene Suche", icon: Search },
              { value: "karriere",    label: "karriere.at", icon: Building2 },
              { value: "willhaben",   label: "willhaben", icon: ShoppingBag },
              { value: "ams",         label: "AMS", icon: Landmark },
              { value: "jooble",      label: "Jooble", icon: Globe },
            ]}
            value={searchTab}
            onChange={setSearchTab}
          />
        </header>

        <div className="p-5 sm:p-6">
          {searchTab === "recommended" ? (
            <div className="grid grid-cols-12 items-center gap-3">
              <p className="col-span-12 sm:col-span-8 text-[13px] text-[var(--color-fg-muted)]">
                Empfehlungen basierend auf deinen Präferenzen und deinem Lebenslauf.
              </p>
              <div className="col-span-12 sm:col-span-4 sm:justify-self-end">
                <Button onClick={handleRecommended} disabled={recommendedLoading} fullWidth>
                  {recommendedLoading ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                      Suche läuft…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      {recommendedEnabled ? "Erneut suchen" : "Empfehlungen abrufen"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : searchTab === "jooble" ? (
            <form onSubmit={handleJoobleSubmit} className="grid grid-cols-12 gap-3">
              <div className="col-span-12 sm:col-span-7">
                <label className="block text-[11px] font-medium text-[var(--color-fg-muted)] mb-1">Suchbegriffe</label>
                <Input
                  type="text"
                  placeholder="z.B. React, Verkauf, Praktikum"
                  value={joobleKeywords}
                  onChange={(e) => setJoobleKeywords(e.target.value)}
                  leadingIcon={<Search className="w-3.5 h-3.5" />}
                />
              </div>
              <div className="col-span-12 sm:col-span-5">
                <label className="block text-[11px] font-medium text-[var(--color-fg-muted)] mb-1">Ort</label>
                <Input
                  type="text"
                  placeholder="Wien, Graz, Linz…"
                  value={joobleLocation}
                  onChange={(e) => setJoobleLocation(e.target.value)}
                />
              </div>
              <div className="col-span-12">
                <Button type="submit" disabled={joobleLoading || !joobleKeywords.trim()}>
                  {joobleLoading ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                      Suche läuft…
                    </>
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5" />
                      Jooble durchsuchen
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : searchTab === "karriere" ? (
            <form onSubmit={handleKarriereSubmit} className="grid grid-cols-12 gap-3">
              <div className="col-span-12 sm:col-span-7">
                <label className="block text-[11px] font-medium text-[var(--color-fg-muted)] mb-1">Suchbegriffe</label>
                <Input
                  type="text"
                  placeholder="z.B. Software, Verkauf, Praktikum"
                  value={karriereKeywords}
                  onChange={(e) => setKarriereKeywords(e.target.value)}
                  leadingIcon={<Search className="w-3.5 h-3.5" />}
                />
              </div>
              <div className="col-span-12 sm:col-span-5">
                <label className="block text-[11px] font-medium text-[var(--color-fg-muted)] mb-1">Ort</label>
                <Input
                  type="text"
                  placeholder="Wien, Graz, Linz…"
                  value={karriereLocation}
                  onChange={(e) => setKarriereLocation(e.target.value)}
                />
              </div>
              <div className="col-span-12">
                <Button type="submit" disabled={karriereLoading || !karriereKeywords.trim()}>
                  {karriereLoading ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                      Suche läuft…
                    </>
                  ) : (
                    <>
                      <Building2 className="w-3.5 h-3.5" />
                      karriere.at durchsuchen
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : searchTab === "willhaben" ? (
            <form onSubmit={handleWillhabenSubmit} className="grid grid-cols-12 gap-3">
              <div className="col-span-12 sm:col-span-7">
                <label className="block text-[11px] font-medium text-[var(--color-fg-muted)] mb-1">Suchbegriffe</label>
                <Input
                  type="text"
                  placeholder="z.B. Aushilfe, Kellner, Minijob"
                  value={willhabenKeywords}
                  onChange={(e) => setWillhabenKeywords(e.target.value)}
                  leadingIcon={<Search className="w-3.5 h-3.5" />}
                />
              </div>
              <div className="col-span-12 sm:col-span-5">
                <label className="block text-[11px] font-medium text-[var(--color-fg-muted)] mb-1">Ort</label>
                <Input
                  type="text"
                  placeholder="Wien, Graz, Linz…"
                  value={willhabenLocation}
                  onChange={(e) => setWillhabenLocation(e.target.value)}
                />
              </div>
              <div className="col-span-12">
                <Button type="submit" disabled={willhabenLoading || !willhabenKeywords.trim()}>
                  {willhabenLoading ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                      Suche läuft…
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-3.5 h-3.5" />
                      willhaben durchsuchen
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : searchTab === "ams" ? (
            <form onSubmit={handleAmsSubmit} className="grid grid-cols-12 gap-3">
              <div className="col-span-12 sm:col-span-7">
                <label className="block text-[11px] font-medium text-[var(--color-fg-muted)] mb-1">Suchbegriffe</label>
                <Input
                  type="text"
                  placeholder="z.B. Software, Pflege, Verwaltung"
                  value={amsKeywords}
                  onChange={(e) => setAmsKeywords(e.target.value)}
                  leadingIcon={<Search className="w-3.5 h-3.5" />}
                />
              </div>
              <div className="col-span-12 sm:col-span-5">
                <label className="block text-[11px] font-medium text-[var(--color-fg-muted)] mb-1">Ort</label>
                <Input
                  type="text"
                  placeholder="Wien, Graz, Linz…"
                  value={amsLocation}
                  onChange={(e) => setAmsLocation(e.target.value)}
                />
              </div>
              <div className="col-span-12">
                <Button type="submit" disabled={amsLoading || !amsKeywords.trim()}>
                  {amsLoading ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                      Suche läuft…
                    </>
                  ) : (
                    <>
                      <Landmark className="w-3.5 h-3.5" />
                      AMS durchsuchen
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCustomSubmit} className="grid grid-cols-12 gap-3">
              <div className="col-span-12 sm:col-span-7">
                <label className="block text-[11px] font-medium text-[var(--color-fg-muted)] mb-1">Suchbegriffe</label>
                <Input
                  type="text"
                  placeholder="z.B. React, Verkauf, Praktikum"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  leadingIcon={<Search className="w-3.5 h-3.5" />}
                />
              </div>
              <div className="col-span-12 sm:col-span-5">
                <label className="block text-[11px] font-medium text-[var(--color-fg-muted)] mb-1">Ort</label>
                <Input
                  type="text"
                  placeholder="Wien, Graz, Linz…"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="col-span-12">
                <label className="block text-[11px] font-medium text-[var(--color-fg-muted)] mb-1.5">Stellenart</label>
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Stellenart">
                  {[{ value: "", label: "Alle" }, ...JOB_TYPES.map((t) => ({ value: t, label: t }))].map((opt) => {
                    const selected = jobType === opt.value;
                    return (
                      <button
                        key={opt.value || "all"}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setJobType(opt.value)}
                        className={
                          "h-8 px-3.5 rounded-full text-[12.5px] font-medium border transition-colors " +
                          (selected
                            ? "bg-[var(--color-accent-500)]/15 border-[var(--color-accent-500)]/50 text-[var(--color-accent-200)]"
                            : "bg-transparent border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:border-[var(--color-border-strong)]")
                        }
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="col-span-12">
                <Button type="submit" disabled={customLoading || !keywords.trim()}>
                  {customLoading ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                      Suche läuft…
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      Suchen
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ── Search results ─────────────────────────────────────────── */}
      {(searchLoading || searchResults.length > 0 || searchError || (activeData && !searchLoading)) && (
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg-dim)]">Ergebnisse</p>
            {!searchLoading && searchResults.length > 0 && <Badge variant="neutral" size="sm">{searchResults.length}</Badge>}
          </div>
          {searchLoading && searchResults.length === 0 ? (
            <div className="grid grid-cols-1 gap-1">
              {[0, 1, 2, 3].map((i) => <RowSkeleton key={i} />)}
            </div>
          ) : searchError ? (
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)] px-5 py-4">
              <p className="text-[13px] text-[var(--color-fg-muted)]">{searchError}</p>
            </div>
          ) : searchResults.length === 0 && activeData ? (
            <EmptyState tone="subtle" title="Keine Ergebnisse" description="Passe deine Suchbegriffe oder den Ort an." />
          ) : (
            <div className="grid grid-cols-1 divide-y divide-[var(--color-border-subtle)] border-t border-[var(--color-border-subtle)]">
              {searchResults.map((result) => {
                const id = result.source_id;
                const isSaved = savedSearchIds.has(id) ||
                  savedJobs.some((j) => j.url && result.full_url && j.url === result.full_url);
                return (
                  <JobRow
                    key={id}
                    job={{
                      ...result,
                      role: result.title,
                      updated: result.updated,
                    }}
                    onSave={() => handleSaveResult(result)}
                    isSaved={isSaved}
                    saving={false}
                    onClick={() => {
                      const url = result.full_url || result.url;
                      if (url) window.open(url, "_blank", "noopener");
                    }}
                  />
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
