import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FileText, Sparkles, Copy, Download, RefreshCw, Building2, ClipboardList } from "lucide-react";
import { resumeApi, motivationsschreibenApi, jobApi } from "../services/api";
import AIDisclosureBanner from "../components/AIDisclosureBanner";
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

const TONES = [
  { value: "konservativ", apiTone: "formell", label: "Konservativ", desc: "Klar, seriös und klassisch" },
  { value: "kreativ", apiTone: "kreativ", label: "Kreativ", desc: "Persönlich, lebendig und markant" },
  { value: "aggressiv", apiTone: "modern", label: "Aggressiv", desc: "Direkt, offensiv und selbstbewusst" },
];

/** AI cover-letter generator: pick a resume + job, choose tone, stream the result. */
export default function CoverLetterPage() {
  const [searchParams] = useSearchParams();
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [tone, setTone] = useState("konservativ");
  const [applicantName, setApplicantName] = useState("");
  const [applicantAddress, setApplicantAddress] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [editedText, setEditedText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const { guardedRun } = useUsageGuard("cover_letter");
  const prefilledJobId = searchParams.get("jobId");
  const prefilledResumeId = searchParams.get("resumeId");

  // Fetch uploaded resumes
  const { data: uploadedResumes = [] } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list().then((r) => {
      saveStored("resumes", r.data);
      return r.data;
    }),
    initialData: () => loadStored("resumes"),
    staleTime: 1000 * 60 * 2,
  });

  // Fetch saved jobs for import
  const { data: savedJobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => jobApi.list().then((r) => {
      const items = r.data?.items ?? r.data ?? [];
      saveStored("jobs", items);
      return items;
    }),
    initialData: () => loadStored("jobs"),
    initialDataUpdatedAt: 0,
    staleTime: 0,
  });

  useEffect(() => {
    if (prefilledResumeId && !selectedResumeId) {
      setSelectedResumeId(Number(prefilledResumeId));
    }
  }, [prefilledResumeId, selectedResumeId]);

  useEffect(() => {
    if (!prefilledJobId || !savedJobs.length) return;
    const job = savedJobs.find((entry) => String(entry.id) === String(prefilledJobId));
    if (!job) return;
    setSelectedJobId(String(job.id));
    setCompany(job.company || "");
    setRole(job.role || job.title || "");
    setJobDescription(job.description || "");
  }, [prefilledJobId, savedJobs]);

  const generateMutation = useMutation({
    mutationFn: (data) => motivationsschreibenApi.generate(data),
    onSuccess: (res) => {
      const text = res.data?.text;
      if (!text) {
        toast.error("KI hat keinen Text zurückgegeben. Bitte erneut versuchen.");
        return;
      }
      setGeneratedText(text);
      setEditedText(text);
      setIsEditing(false);
      toast.success("Motivationsschreiben erstellt!");
    },
    onError: (err) => {
      // Interceptor already showed UpgradeModal for usage limits
      if (err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") return;
      // Interceptor already showed rate-limit toast
      if (err.response?.status === 429) return;
      toast.error(getApiErrorMessage(err, "Fehler beim Erstellen des Motivationsschreibens"));
    },
  });

  const handleGenerate = () => {
    if (!jobDescription && !selectedResumeId) {
      toast.error("Bitte gib eine Stellenbeschreibung ein oder wähle einen Lebenslauf aus");
      return;
    }

    guardedRun(() => {
      const data = {
        company,
        role,
        job_description: jobDescription,
        tone: TONES.find((entry) => entry.value === tone)?.apiTone || "formell",
        applicant_name: applicantName,
        applicant_address: applicantAddress,
      };

      if (selectedResumeId) {
        data.resume_id = selectedResumeId;
      }

      generateMutation.mutate(data);
    });
  };

  const handleCopy = () => {
    const text = isEditing ? editedText : generatedText;
    navigator.clipboard.writeText(text);
    toast.success("In die Zwischenablage kopiert!");
  };

  const getFilename = (ext) =>
    `Motivationsschreiben_${company || "Bewerbung"}_${new Date().toISOString().split("T")[0]}.${ext}`;

  const handleDownloadTXT = () => {
    const text = isEditing ? editedText : generatedText;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = getFilename("txt");
    a.click();
    URL.revokeObjectURL(url);
    toast.success("TXT heruntergeladen!");
    setShowDownloadMenu(false);
  };

  const handleDownloadPDF = () => {
    const text = isEditing ? editedText : generatedText;
    const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Motivationsschreiben</title><style>@page{margin:2cm;size:A4}body{font-family:Georgia,serif;font-size:13px;line-height:1.7;margin:0}pre{white-space:pre-wrap;font-family:inherit}</style></head><body><pre>${escaped}</pre></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url);
    win.addEventListener("load", () => { win.print(); URL.revokeObjectURL(url); });
    toast.success("PDF-Druckdialog geöffnet!");
    setShowDownloadMenu(false);
  };

  const handleDownloadDOCX = () => {
    const text = isEditing ? editedText : generatedText;
    const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><style>body{font-family:Calibri,sans-serif;font-size:12pt;line-height:1.5}p{margin:0 0 6pt}</style></head><body><pre style="font-family:Calibri,sans-serif;font-size:12pt;white-space:pre-wrap;line-height:1.5">${escaped}</pre></body></html>`;
    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = getFilename("doc");
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Word-Dokument heruntergeladen!");
    setShowDownloadMenu(false);
  };

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
          Motivationsschreiben
        </h1>
        <p className="text-slate-400 mt-1">
          Erstelle ein überzeugendes Motivationsschreiben für deine Bewerbung
        </p>
      </div>

      <AIDisclosureBanner feature="cover_letter" />

      <div className={`grid gap-6 ${(generatedText || generateMutation.isPending) ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 mx-auto w-full max-w-3xl"}`}>
        {/* Left: Input Form */}
        <div className="space-y-5">
          {/* Resume Selection */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-brand-300" aria-hidden="true" />
              <h2 className="font-semibold text-slate-100">Lebenslauf auswählen</h2>
            </div>

            <select
              value={selectedResumeId || ""}
              onChange={(e) => setSelectedResumeId(e.target.value ? Number(e.target.value) : null)}
              className="input"
            >
              <option value="">Lebenslauf auswählen (optional)</option>
              {uploadedResumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.filename || r.name || r.full_name || `Lebenslauf ${r.id}`}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1.5">
              Dein Lebenslauf wird als Basis für das Motivationsschreiben verwendet
            </p>
          </div>

          {/* Job Details */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-green-400" />
              <h2 className="font-semibold text-slate-100">Stellendetails</h2>
            </div>

            <div className="space-y-3">
              {savedJobs.length > 0 && (
                <div className="pb-3 mb-1 border-b border-white/[0.05] flex items-center gap-3">
                  <label className="text-xs font-semibold text-brand-300 uppercase tracking-wide whitespace-nowrap flex-shrink-0">Stelle importieren</label>
                  <select
                    value={selectedJobId}
                    onChange={(e) => {
                      setSelectedJobId(e.target.value);
                      const job = savedJobs.find((j) => String(j.id) === e.target.value);
                      if (!job) return;
                      if (job.company) setCompany(job.company);
                      if (job.role || job.title) setRole(job.role || job.title);
                      if (job.description) setJobDescription(job.description);
                    }}
                    className="input min-w-0 flex-1 truncate"
                  >
                    <option value="">Auswählen...</option>
                    {savedJobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.role || j.title} {j.company ? `– ${j.company}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Unternehmen</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="z.B. Wiener Stadtwerke, Red Bull, OMV"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Stellenbezeichnung</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="z.B. Praktikant/in Marketing, Verkäufer/in"
                  className="input"
                />
              </div>
              <div>
                <label className="label">
                  Stellenbeschreibung
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Füge hier die Stellenbeschreibung ein..."
                  rows={8}
                  className="input resize-y"
                />
              </div>
            </div>
          </div>

          {/* Applicant Info (optional) */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="w-5 h-5 text-purple-400" />
              <h2 className="font-semibold text-slate-100">Absender (optional)</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Dein Name</label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="Max Mustermann"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Deine Adresse</label>
                <input
                  type="text"
                  value={applicantAddress}
                  onChange={(e) => setApplicantAddress(e.target.value)}
                  placeholder="Musterstraße 1, 1010 Wien"
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Tone Selection */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="font-semibold text-slate-100">Tonalität</h2>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTone(t.value)}
                    className={`px-3 py-3 rounded-xl text-sm font-medium transition-all border ${
                      tone === t.value
                        ? "bg-white/[0.06] text-brand-200 border-brand-500/30 shadow-sm"
                        : "bg-transparent text-slate-400 border-transparent hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="font-semibold">{t.label}</div>
                    <div className="text-xs mt-0.5 text-slate-500">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Der Regler verändert die Formulierung, nicht die Fakten aus Stelle und Lebenslauf.
            </p>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-brand-500 to-accent-600 hover:from-brand-400 hover:to-accent-500 text-white font-medium shadow-lg shadow-brand-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
          >
            {generateMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Wird generiert...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Motivationsschreiben generieren
              </>
            )}
          </button>
        </div>

        {/* Right: Generated Output — only rendered once generation begins */}
        {(generatedText || generateMutation.isPending) && (
        <div className="space-y-4">
          <div className="card lg:sticky lg:top-6 min-h-[320px] sm:min-h-[420px] flex flex-col">
            <div className="p-5 border-b border-[#171a21] flex flex-wrap items-center justify-between gap-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-400" />
                <h2 className="font-semibold text-slate-100">Ergebnis</h2>
              </div>
              {generatedText && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      if (isEditing) setGeneratedText(editedText);
                      setIsEditing(!isEditing);
                    }}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/[0.05] text-slate-300 hover:bg-white/[0.08] transition-colors"
                  >
                    {isEditing ? "Speichern" : "Bearbeiten"}
                  </button>
                  <button
                    onClick={handleCopy}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-brand-500/10 text-brand-200 hover:bg-brand-500/20 transition-colors flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Kopieren
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowDownloadMenu((v) => !v)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-300 hover:bg-green-500/20 transition-colors flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                    {showDownloadMenu && (
                      <div className="absolute right-0 top-full mt-1 bg-[#0b1220] border border-[#1f2937] rounded-lg shadow-xl z-10 py-1 min-w-[100px]">
                        <button onClick={handleDownloadTXT} className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/[0.05] text-slate-300 transition-colors">TXT</button>
                        <button onClick={handleDownloadPDF} className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/[0.05] text-slate-300 transition-colors">PDF</button>
                        <button onClick={handleDownloadDOCX} className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/[0.05] text-slate-300 transition-colors">DOCX</button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={generateMutation.isPending}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Neu
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 p-5">
              {generateMutation.isPending ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-slate-400">KI erstellt dein Motivationsschreiben...</p>
                </div>
              ) : isEditing ? (
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="input w-full h-full min-h-[320px] sm:min-h-[420px] resize-none font-mono leading-relaxed"
                />
              ) : (
                <div className="text-sm text-slate-300 leading-relaxed space-y-4">
                  {editedText.split(/\n+/).filter((p) => p.trim()).map((para, i) => (
                    <p key={i}>
                      {para.trim()}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
