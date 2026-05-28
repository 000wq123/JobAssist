import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Building2,
  Check,
  Globe,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RefreshCw,
  Save,
  TrendingUp,
  X,
} from "lucide-react";

import { jobApi } from "../services/api";
import AIDisclosureBanner from "./AIDisclosureBanner";
import { getApiErrorMessage } from "../utils/apiError";

/**
 * Portal-rendered modal displaying AI company research for a job application.
 * @param {object} props
 * @param {string} props.companyName
 * @param {object|null} props.data - Previously fetched research data, if any.
 * @param {boolean} props.loading
 * @param {() => void} props.onClose
 * @param {string|number} props.jobId
 * @param {() => Promise<void>} props.onRefresh - Triggers a fresh research call.
 */
export default function ResearchModal({ companyName, data, loading, onClose, jobId, onRefresh }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasContactInfo = useMemo(
    () => Boolean(data?.contact_info && Object.values(data.contact_info).some(Boolean)),
    [data]
  );

  const handleSave = async () => {
    if (!jobId || !data) return;

    setSaving(true);
    try {
      const res = await jobApi.saveResearch(jobId, data);
      queryClient.setQueryData(["jobs"], (old = []) =>
        old.map((job) => (job.id === res.data.id ? res.data : job))
      );
      queryClient.setQueryData(["jobs", String(jobId)], res.data);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setSaved(true);
      toast.success("Recherche gespeichert");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Recherche konnte nicht gespeichert werden"));
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-[var(--color-bg-elev-1)] shadow-2xl shadow-black/60 border border-[var(--color-border)]">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-subtle)] px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-[var(--color-accent-500)]/10 border border-[var(--color-accent-500)]/20">
              <Building2 className="h-4 w-4 text-[var(--color-accent-300)]" />
            </div>
            <h2 className="truncate text-[15px] font-semibold tracking-tight text-[var(--color-fg)]">{companyName} — Recherche</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-fg-muted)] transition-colors hover:bg-[var(--color-bg-elev-2)]"
            aria-label="Recherche schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
          <AIDisclosureBanner feature="company_research" />
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-[var(--color-fg-muted)]">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--color-accent-300)]" />
              <p className="text-[13px]">Recherche läuft…</p>
            </div>
          ) : data ? (
            <>
              {hasContactInfo && (
                <div>
                  <h3 className="mb-2 text-[13px] font-semibold text-[var(--color-fg)]">Kontakt</h3>
                  <div className="space-y-2 rounded-xl bg-[var(--color-accent-500)]/10 border border-[var(--color-accent-500)]/25 p-4 text-[13px]">
                    {data.contact_info.email && (
                      <a
                        href={`mailto:${data.contact_info.email}`}
                        className="flex items-center gap-2 break-all text-[var(--color-accent-300)] hover:text-[var(--color-accent-200)] transition-colors"
                      >
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span>{data.contact_info.email}</span>
                      </a>
                    )}
                    {data.contact_info.phone && (
                      <a
                        href={`tel:${data.contact_info.phone}`}
                        className="flex items-center gap-2 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                      >
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <span>{data.contact_info.phone}</span>
                      </a>
                    )}
                    {data.contact_info.location && (
                      <div className="flex items-center gap-2 text-[var(--color-fg-muted)]">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span>{data.contact_info.location}</span>
                      </div>
                    )}
                    {data.contact_info.website && (
                      <a
                        href={data.contact_info.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 break-all text-[var(--color-accent-300)] hover:text-[var(--color-accent-200)] transition-colors"
                      >
                        <Globe className="h-4 w-4 flex-shrink-0" />
                        <span>{data.contact_info.website}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {data.known_data && Object.keys(data.known_data).length > 0 && (
                <div className="space-y-1.5 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] p-4 text-sm">
                  {data.known_data.ceo && (
                    <p>
                      <span className="font-medium text-[var(--color-fg-muted)]">CEO:</span>{" "}
                      <span className="text-[var(--color-fg-muted)]">{data.known_data.ceo}</span>
                    </p>
                  )}
                  {data.known_data.industry && (
                    <p>
                      <span className="font-medium text-[var(--color-fg-muted)]">Branche:</span>{" "}
                      <span className="text-[var(--color-fg-muted)]">{data.known_data.industry}</span>
                    </p>
                  )}
                  {data.known_data.employees && (
                    <p>
                      <span className="font-medium text-[var(--color-fg-muted)]">Mitarbeiter:</span>{" "}
                      <span className="text-[var(--color-fg-muted)]">{data.known_data.employees}</span>
                    </p>
                  )}
                  {data.known_data.founded && (
                    <p>
                      <span className="font-medium text-[var(--color-fg-muted)]">Gegründet:</span>{" "}
                      <span className="text-[var(--color-fg-muted)]">{data.known_data.founded}</span>
                    </p>
                  )}
                  {data.known_data.hq && (
                    <p>
                      <span className="font-medium text-[var(--color-fg-muted)]">Hauptsitz:</span>{" "}
                      <span className="text-[var(--color-fg-muted)]">{data.known_data.hq}</span>
                    </p>
                  )}
                  {data.known_data.mission && <p className="pt-1 italic text-[var(--color-fg-dim)]">{data.known_data.mission}</p>}
                </div>
              )}

              {data.summary && (
                <div>
                  <h3 className="mb-2 text-[13px] font-semibold text-[var(--color-fg)]">Zusammenfassung</h3>
                  <p className="text-[13px] leading-relaxed text-[var(--color-fg-muted)]">{data.summary}</p>
                </div>
              )}

              {data.hot_topics?.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-fg)]">
                    <TrendingUp className="h-4 w-4 text-[var(--color-warning)]" />
                    Aktuelle Themen
                  </h3>
                  <ul className="space-y-1.5">
                    {data.hot_topics.map((topic, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--color-fg-muted)]">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--color-warning)]" />
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.smart_questions?.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-fg)]">
                    <MessageCircle className="h-4 w-4 text-[var(--color-accent-300)]" />
                    Clevere Fragen fürs Interview
                  </h3>
                  <ul className="space-y-2">
                    {data.smart_questions.map((question, i) => (
                      <li key={i} className="flex items-start gap-2 rounded-lg bg-[var(--color-accent-500)]/10 border border-[var(--color-accent-500)]/25 px-3 py-2 text-[13px] text-[var(--color-fg-muted)]">
                        <span className="flex-shrink-0 font-semibold text-[var(--color-accent-300)]">{i + 1}.</span>
                        {question}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="py-10 text-center text-sm text-[var(--color-fg-dim)]">Keine Daten verfügbar</p>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--color-border-subtle)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent-500)] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[var(--color-accent-400)] disabled:opacity-60 sm:w-auto"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Aktualisieren
              </button>
            )}
            {jobId && data && !loading && (
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--color-success)] px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : saved ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saved ? "Sicher hinterlegt" : "Recherche sichern"}
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-lg border border-[var(--color-border)] px-4 py-2 text-[13px] font-medium text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors hover:bg-[var(--color-bg-elev-2)] sm:w-auto"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
