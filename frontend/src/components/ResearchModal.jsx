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
      toast.success("Die Recherche wurde sicher hinterlegt");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Die Recherche konnte nicht sicher hinterlegt werden"));
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-[#0f172a] shadow-2xl shadow-black/60 border border-[#1e293b]">
        <div className="flex items-start justify-between gap-3 border-b border-[#1e293b] px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Building2 className="h-5 w-5 flex-shrink-0 text-indigo-400" />
            <h2 className="truncate text-base font-bold text-white">{companyName} - Recherche</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-[#1e293b]"
            aria-label="Recherche schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
          <AIDisclosureBanner feature="company_research" />
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
              <p className="text-sm">Recherche läuft...</p>
            </div>
          ) : data ? (
            <>
              {hasContactInfo && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-200">Kontakt</h3>
                  <div className="space-y-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-4 text-sm">
                    {data.contact_info.email && (
                      <a
                        href={`mailto:${data.contact_info.email}`}
                        className="flex items-center gap-2 break-all text-indigo-400 hover:text-indigo-300"
                      >
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span>{data.contact_info.email}</span>
                      </a>
                    )}
                    {data.contact_info.phone && (
                      <a
                        href={`tel:${data.contact_info.phone}`}
                        className="flex items-center gap-2 text-slate-300 hover:text-slate-100"
                      >
                        <Phone className="h-4 w-4 flex-shrink-0" />
                        <span>{data.contact_info.phone}</span>
                      </a>
                    )}
                    {data.contact_info.location && (
                      <div className="flex items-center gap-2 text-slate-300">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span>{data.contact_info.location}</span>
                      </div>
                    )}
                    {data.contact_info.website && (
                      <a
                        href={data.contact_info.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 break-all text-indigo-400 hover:text-indigo-300"
                      >
                        <Globe className="h-4 w-4 flex-shrink-0" />
                        <span>{data.contact_info.website}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {data.known_data && Object.keys(data.known_data).length > 0 && (
                <div className="space-y-1.5 rounded-xl bg-[#030712] border border-[#1e293b] p-4 text-sm">
                  {data.known_data.ceo && (
                    <p>
                      <span className="font-medium text-slate-300">CEO:</span>{" "}
                      <span className="text-slate-400">{data.known_data.ceo}</span>
                    </p>
                  )}
                  {data.known_data.industry && (
                    <p>
                      <span className="font-medium text-slate-300">Branche:</span>{" "}
                      <span className="text-slate-400">{data.known_data.industry}</span>
                    </p>
                  )}
                  {data.known_data.employees && (
                    <p>
                      <span className="font-medium text-slate-300">Mitarbeiter:</span>{" "}
                      <span className="text-slate-400">{data.known_data.employees}</span>
                    </p>
                  )}
                  {data.known_data.founded && (
                    <p>
                      <span className="font-medium text-slate-300">Gegründet:</span>{" "}
                      <span className="text-slate-400">{data.known_data.founded}</span>
                    </p>
                  )}
                  {data.known_data.hq && (
                    <p>
                      <span className="font-medium text-slate-300">Hauptsitz:</span>{" "}
                      <span className="text-slate-400">{data.known_data.hq}</span>
                    </p>
                  )}
                  {data.known_data.mission && <p className="pt-1 italic text-slate-500">{data.known_data.mission}</p>}
                </div>
              )}

              {data.summary && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-200">Zusammenfassung</h3>
                  <p className="text-sm leading-relaxed text-slate-300">{data.summary}</p>
                </div>
              )}

              {data.hot_topics?.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-200">
                    <TrendingUp className="h-4 w-4 text-orange-400" />
                    Aktuelle Themen
                  </h3>
                  <ul className="space-y-1.5">
                    {data.hot_topics.map((topic, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-400" />
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.smart_questions?.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-200">
                    <MessageCircle className="h-4 w-4 text-indigo-400" />
                    Clevere Fragen fürs Interview
                  </h3>
                  <ul className="space-y-2">
                    {data.smart_questions.map((question, i) => (
                      <li key={i} className="flex items-start gap-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 text-sm text-slate-300">
                        <span className="flex-shrink-0 font-semibold text-indigo-400">{i + 1}.</span>
                        {question}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">Keine Daten verfügbar</p>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-[#1e293b] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60 sm:w-auto"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Aktualisieren
              </button>
            )}
            {jobId && data && !loading && (
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60 sm:w-auto"
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
            className="w-full rounded-lg border border-[#1e293b] px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-[#1e293b] sm:w-auto"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
