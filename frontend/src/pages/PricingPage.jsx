import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, Star, Zap, Crown, Building2, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import { billingApi } from "../services/api";
import useAuthStore from "../hooks/useAuthStore";
import { getApiErrorMessage } from "../utils/apiError";

const FEATURE_LABELS = {
  cv_analysis: "Lebenslauf-Analysen / Monat",
  cover_letter: "Motivationsschreiben / Monat",
  job_alerts: "Aktive Job-Alerts",
  ai_chat: "KI-Bewerbungsassistent / Monat",
  job_search: "Jobsuche / Tag",
};

/**
 * Formats a plan limit for display, converting -1 to "Unbegrenzt".
 * @param {number} value
 * @returns {string|number}
 */
function formatLimit(value) {
  return value === -1 ? "Unbegrenzt" : value;
}

const plans = [
  {
    key: "basic",
    name: "Basic",
    subtitle: "Zum Ausprobieren",
    price: "0",
    period: "",
    icon: Star,
    color: "gray",
    highlighted: false,
    badge: null,
    limits: { cv_analysis: 5, cover_letter: 5, job_alerts: 2, ai_chat: 15, job_search: 5 },
    extras: ["Lebenslauf hochladen", "Job-Suche", "Pipeline-Tracking"],
  },
  {
    key: "pro",
    name: "Pro",
    subtitle: "Für aktive Bewerber",
    price: "4,99",
    period: "/ Monat",
    icon: Zap,
    color: "blue",
    highlighted: true,
    badge: "Beliebt",
    limits: { cv_analysis: 15, cover_letter: 25, job_alerts: 10, ai_chat: 200, job_search: 20 },
    extras: ["Prioritäts-Support", "Alles aus Basic"],
  },
  {
    key: "max",
    name: "Max",
    subtitle: "Unbegrenzte Power",
    price: "7,99",
    period: "/ Monat",
    icon: Crown,
    color: "purple",
    highlighted: false,
    badge: "Bestes Angebot",
    limits: { cv_analysis: -1, cover_letter: -1, job_alerts: -1, ai_chat: -1, job_search: -1 },
    extras: ["24h Support", "Alles aus Pro", "Unbegrenzte Nutzung"],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    subtitle: "Für Teams & Agenturen",
    price: null,
    period: "",
    icon: Building2,
    color: "slate",
    highlighted: false,
    badge: null,
    limits: { cv_analysis: -1, cover_letter: -1, job_alerts: -1, ai_chat: -1, job_search: -1 },
    extras: ["Dedizierter Manager", "Custom Integrationen", "SLA & Compliance"],
  },
];

const cardBorder = {
  gray: "border-[#1f2937] hover:border-slate-600",
  blue: "border-brand-500/60 ring-1 ring-brand-500/20",
  purple: "border-[#1f2937] hover:border-brand-500/40",
  slate: "border-[#1f2937] hover:border-slate-500/50",
};

const iconBg = {
  gray: "bg-slate-900",
  blue: "bg-brand-500/15",
  purple: "bg-brand-500/15",
  slate: "bg-slate-800",
};

const iconFg = {
  gray: "text-slate-300",
  blue: "text-brand-300",
  purple: "text-brand-300",
  slate: "text-slate-300",
};

const ctaStyle = {
  basic: "bg-slate-900 text-slate-500 cursor-default border border-[#1f2937]",
  pro: "bg-gradient-to-r from-brand-500 to-accent-600 text-white hover:from-brand-400 hover:to-accent-500 shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40",
  max: "bg-gradient-to-r from-brand-500 to-accent-600 text-white hover:from-brand-400 hover:to-accent-500 shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40",
  enterprise: "bg-[#111827] text-slate-100 hover:bg-[#0f172a] border border-[#1f2937]",
};

/** Pricing page showing Free/Pro/Enterprise plan cards with upgrade CTAs. */
export default function PricingPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const { data: initData } = useQuery({ queryKey: ["init"] });
  const currentPlan = initData?.plan || "basic";
  const [loadingPlan, setLoadingPlan] = useState(null);

  const handleUpgrade = async (planKey) => {
    if (!token) {
      navigate("/register");
      return;
    }

    if (planKey === "enterprise") {
      window.location.href = "mailto:jobassistsupport@gmail.com?subject=Enterprise-Anfrage";
      return;
    }

    setLoadingPlan(planKey);
    try {
      const res = await billingApi.createCheckout(planKey);
      window.location.href = res.data.checkout_url;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Fehler beim Starten des Checkout-Prozesses"));
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(91,79,232,0.18),transparent_28%),linear-gradient(180deg,#020617_0%,#000000_100%)] text-slate-100">
      {token && (
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Zurück
          </button>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6">
        <div className="mb-14 text-center animate-slide-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-200">
            <Zap className="h-3.5 w-3.5" /> Preise
          </div>
          <h1 className="mb-4 text-3xl font-extrabold leading-tight text-slate-100 sm:text-4xl md:text-5xl">
            Finde den passenden Plan
          </h1>
          <p className="mx-auto max-w-md text-base leading-relaxed text-slate-400 md:text-lg">
            Starte kostenlos und upgrade jederzeit, wenn du mehr brauchst.
          </p>
        </div>

        <div
          className="grid animate-slide-up grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4"
          style={{  }}
        >
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            const Icon = plan.icon;

            return (
              <div
                key={plan.key}
                className={`relative flex flex-col rounded-2xl border bg-[radial-gradient(circle_at_top,rgba(91,79,232,0.12),transparent_36%),linear-gradient(180deg,#111827_0%,#000000_100%)] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                  plan.highlighted
                    ? `${cardBorder[plan.color]} shadow-xl shadow-brand-900/30`
                    : `${cardBorder[plan.color]} shadow-sm`
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className={`rounded-full px-3.5 py-1 text-[11px] font-bold text-white shadow-md ${
                        plan.highlighted
                          ? "bg-gradient-to-r from-brand-500 to-accent-600"
                          : "bg-gradient-to-r from-brand-500 to-violet-500"
                      }`}
                    >
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-6 flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg[plan.color]}`}>
                      <Icon className={`h-5 w-5 ${iconFg[plan.color]}`} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-slate-100">{plan.name}</h3>
                      <p className="mt-0.5 text-xs text-slate-400">{plan.subtitle}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    {plan.price !== null ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[40px] font-extrabold leading-none tracking-tight text-slate-100">
                          {plan.price === "0" ? "Gratis" : `€${plan.price}`}
                        </span>
                        {plan.period && <span className="text-sm font-medium text-slate-400">{plan.period}</span>}
                      </div>
                    ) : (
                      <div className="flex items-baseline">
                        <span className="text-2xl font-bold text-slate-100">Auf Anfrage</span>
                      </div>
                    )}
                  </div>

                  <div className="mb-5 h-px bg-[#171a21]" />

                  <ul className="mb-6 flex-1 space-y-3">
                    {Object.entries(plan.limits).map(([feature, value]) => (
                      <li key={feature} className="flex items-start gap-2.5 text-[13px] leading-snug">
                        <div className="mt-0.5 flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/12">
                          <Check className="h-3 w-3 text-emerald-400" />
                        </div>
                        <span>
                          <span className="font-semibold text-slate-200">{formatLimit(value)}</span>{" "}
                          <span className="text-slate-400">{FEATURE_LABELS[feature]}</span>
                        </span>
                      </li>
                    ))}
                    {plan.extras.map((extra, index) => (
                      <li key={extra} className={`flex items-start gap-2.5 text-[13px] leading-snug ${index === 0 ? "text-slate-300" : "text-slate-400"}`}>
                        <div className="mt-0.5 flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded-full bg-slate-900">
                          <Check className="h-3 w-3 text-slate-500" />
                        </div>
                        {extra}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-brand-500/20 bg-brand-500/10 py-3 text-sm font-semibold text-brand-200"
                    >
                      Aktueller Plan
                    </button>
                  ) : plan.key === "basic" ? (
                    <button disabled className="w-full rounded-xl border border-[#1f2937] bg-slate-900 py-3 text-sm font-semibold text-slate-500">
                      Inklusive
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.key)}
                      disabled={loadingPlan === plan.key}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200 disabled:opacity-70 ${ctaStyle[plan.key]}`}
                    >
                      {loadingPlan === plan.key ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Wird geladen...
                        </>
                      ) : (
                        <>
                          {plan.key === "enterprise" ? "Kontakt aufnehmen" : "Plan wählen (Jetzt durchstarten)"}
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-slate-500">
          Keine MwSt. ausgewiesen. Jederzeit kündbar. Keine versteckten Kosten.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-slate-500">
          <Link to="/terms" className="transition-colors hover:text-slate-200">
            AGB
          </Link>
          <Link to="/privacy" className="transition-colors hover:text-slate-200">
            Datenschutz
          </Link>
          <Link to="/impressum" className="transition-colors hover:text-slate-200">
            Impressum
          </Link>
          <Link to="/contact" className="transition-colors hover:text-slate-200">
            Kontakt
          </Link>
        </div>
      </div>
    </div>
  );
}
