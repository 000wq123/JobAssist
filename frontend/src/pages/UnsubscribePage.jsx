import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Bell, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { jobAlertsApi } from "../services/api";

/** One-click unsubscribe page — consumes a token from the URL and calls the alerts API. */
export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Kein gültiger Abmelde-Token gefunden.");
      return;
    }
    jobAlertsApi.unsubscribe(token)
      .then(() => {
        setStatus("success");
        setMessage("Du wirst keine weiteren Job-Alerts von diesem Alert erhalten.");
      })
      .catch((err) => {
        setStatus("error");
        const detail = err?.response?.data?.detail;
        setMessage(typeof detail === "string" ? detail : "Der Link ist ungültig oder bereits abgelaufen.");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-sm w-full card rounded-3xl p-8 text-center">
        {status === "loading" && (
          <>
            <div className="w-14 h-14 rounded-full bg-white/[0.06] flex items-center justify-center mx-auto mb-5">
              <Loader2 className="w-7 h-7 text-slate-400 animate-spin" />
            </div>
            <h1 className="text-lg font-bold text-slate-100 mb-2">Abmeldung wird verarbeitet…</h1>
            <p className="text-sm text-slate-400">Bitte warte einen Moment.</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-7 h-7 text-green-400" />
            </div>
            <h1 className="text-lg font-bold text-slate-100 mb-2">Erfolgreich abgemeldet</h1>
            <p className="text-sm text-slate-400 mb-6">{message}</p>
            <Link
              to="/job-alerts"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-accent-600 text-white text-sm font-semibold shadow-lg shadow-brand-500/30 transition-all hover:from-brand-400 hover:to-accent-500 hover:shadow-xl hover:shadow-brand-500/40"
            >
              <Bell className="w-4 h-4" /> Alerts verwalten
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-7 h-7 text-red-400" />
            </div>
            <h1 className="text-lg font-bold text-slate-100 mb-2">Abmeldung fehlgeschlagen</h1>
            <p className="text-sm text-slate-400 mb-6">{message}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1f2937] text-slate-200 text-sm font-semibold hover:bg-[#2a3550] transition-colors"
            >
              Zur Startseite
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
