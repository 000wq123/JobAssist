import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Check, Star, Zap, Crown, Building2, ArrowRight, Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

import { billingApi } from "../services/api";
import useAuthStore from "../hooks/useAuthStore";
import { getApiErrorMessage } from "../utils/apiError";
import LegalLayout from "../components/ui/LegalLayout";

const FEATURE_LABELS = {
  cv_analysis: "Lebenslauf-Analysen / Monat",
  cover_letter: "Motivationsschreiben / Monat",
  job_alerts: "Aktive Job-Alerts",
  ai_chat: "KI-Bewerbungsassistent / Monat",
  job_search: "Jobsuche / Tag",
};

/** Formats a plan limit for display; -1 means unbegrenzt. */
function formatLimit(value) {
  return value === -1 ? "Unbegrenzt" : value;
}

/** Purely presentational UI metadata keyed to plan keys. All business data
    (prices, limits) is fetched from the backend so there is one source of truth. */
const PLAN_UI = {
  basic: {
    subtitle: "Zum Ausprobieren",
    icon: Star,
    highlighted: false,
    badge: null,
    extras: ["Lebenslauf hochladen", "Job-Suche", "Pipeline-Tracking"],
  },
  pro: {
    subtitle: "Für aktive Bewerber",
    icon: Zap,
    highlighted: true,
    badge: "Beliebt",
    extras: ["Prioritäts-Support", "Alles aus Basic"],
  },
  max: {
    subtitle: "Unbegrenzte Power",
    icon: Crown,
    highlighted: false,
    badge: "Bestes Angebot",
    extras: ["24h Support", "Alles aus Pro", "Unbegrenzte Nutzung"],
  },
  enterprise: {
    subtitle: "Für Teams & Agenturen",
    icon: Building2,
    highlighted: false,
    badge: null,
    extras: ["Dedizierter Manager", "Custom Integrationen", "SLA & Compliance"],
  },
};

function usePlans() {
  return useQuery({
    queryKey: ["billing", "plans"],
    queryFn: async () => {
      const res = await billingApi.plans();
      return res.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/** Pricing page — 4 plan cards with upgrade CTAs through Stripe checkout. */
export default function PricingPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  // Read the init cache populated by AppShell (no queryFn — cache-only).
  // Only enable when authenticated; otherwise there's no AppShell to seed it.
  const { data: initData } = useQuery({ queryKey: ["init"], enabled: false });
  const currentPlan = initData?.plan || "basic";
  const [loadingPlan, setLoadingPlan] = useState(null);
  const { data: plansData, isLoading: plansLoading, error: plansError } = usePlans();

  const plans = plansData ?? [];
  if (plansError) {
    // Non-blocking: we still render the layout even if the API flakes.
    // eslint-disable-next-line no-console
    console.error("Failed to load plans", plansError);
  }

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
    <LegalLayout
      wide
      title={<>Starte kostenlos. <span className="font-display italic text-[var(--color-accent-300)]">Upgrade,</span> wann du willst.</>}
      subtitle="Alle Pläne ohne MwSt. · Jederzeit kündbar · Keine versteckten Kosten"
    >
      <div className="grid grid-cols-12 gap-5">
        {plansLoading && (
          <div className="col-span-12 flex items-center justify-center py-12 text-[var(--color-fg-muted)]">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Pläne werden geladen…
          </div>
        )}
        {!plansLoading && plans.map((plan) => {
          const ui = PLAN_UI[plan.key] || {};
          const Icon = ui.icon || Star;
          const isCurrent = currentPlan === plan.key;
          const isHighlighted = ui.highlighted;

          return (
            <div
              key={plan.key}
              className={`group col-span-12 sm:col-span-6 lg:col-span-3 relative flex flex-col rounded-2xl border p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_12px_40px_-12px_rgba(124,92,255,0.45)] ${
                isHighlighted
                  ? "border-[var(--color-accent-500)]/50 bg-[var(--color-bg-elev-1)]"
                  : "border-[var(--color-border)] bg-[var(--color-bg-elev-1)]/60 hover:border-[var(--color-accent-500)]/40"
              }`}
            >
              {ui.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span
                    className={`rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-md ${
                      isHighlighted
                        ? "bg-[var(--color-accent-500)] text-white"
                        : "bg-[var(--color-bg-elev-2)] text-[var(--color-accent-300)] border border-[var(--color-accent-500)]/30"
                    }`}
                  >
                    {ui.badge}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-5">
                <div
                  className={`grid h-10 w-10 place-items-center rounded-xl ${
                    isHighlighted ? "bg-[var(--color-accent-500)]/15" : "bg-[var(--color-bg-elev-2)]"
                  }`}
                >
                  <Icon
                    className={`h-4.5 w-4.5 ${
                      isHighlighted ? "text-[var(--color-accent-300)]" : "text-[var(--color-fg-muted)]"
                    }`}
                  />
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-[var(--color-fg)] leading-tight">{plan.name}</h3>
                  <p className="text-[11px] text-[var(--color-fg-muted)]">{ui.subtitle}</p>
                </div>
              </div>

              <div className="mb-5">
                {plan.price !== null ? (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[34px] font-bold tracking-tight tabular-nums text-[var(--color-fg)] leading-none">
                      {plan.price === 0 ? "Gratis" : `€${String(plan.price).replace(".", ",")}`}
                    </span>
                    {plan.price !== 0 && (
                      <span className="text-[12px] font-medium text-[var(--color-fg-muted)]">/ Monat</span>
                    )}
                  </div>
                ) : (
                  <span className="text-[22px] font-semibold text-[var(--color-fg)]">Auf Anfrage</span>
                )}
              </div>

              <div className="h-px bg-[var(--color-border-subtle)] mb-4" />

              <ul className="flex-1 space-y-3 mb-6">
                {Object.entries(plan.limits).map(([feature, value]) => (
                  <li key={feature} className="flex items-start gap-2.5 text-[13px] leading-snug">
                    <Check className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-[var(--color-accent-300)]" />
                    <span className="min-w-0">
                      <span className="font-semibold text-[var(--color-fg)]">{formatLimit(value)}</span>{" "}
                      <span className="text-[var(--color-fg-muted)]">{FEATURE_LABELS[feature]}</span>
                    </span>
                  </li>
                ))}
                {ui.extras?.map((extra) => (
                  <li key={extra} className="flex items-start gap-2.5 text-[13px] leading-snug">
                    <Check className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-[var(--color-fg-dim)]" />
                    <span className="min-w-0 text-[var(--color-fg-muted)]">{extra}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full cursor-not-allowed rounded-lg border border-[var(--color-accent-500)]/30 bg-[var(--color-accent-500)]/10 py-2.5 text-[13px] font-semibold text-[var(--color-accent-300)]"
                >
                  Aktueller Plan
                </button>
              ) : plan.key === "basic" ? (
                <button
                  disabled
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] py-2.5 text-[13px] font-semibold text-[var(--color-fg-dim)] cursor-not-allowed"
                >
                  Inklusive
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.key)}
                  disabled={loadingPlan === plan.key}
                  className={`w-full inline-flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    isHighlighted || plan.key === "max"
                      ? "bg-[var(--color-accent-500)] text-white hover:bg-[var(--color-accent-400)]"
                      : "border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] text-[var(--color-fg)] hover:bg-[var(--color-bg-elev-2)]"
                  }`}
                >
                  {loadingPlan === plan.key ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Wird geladen…
                    </>
                  ) : (
                    <>
                      {plan.key === "enterprise" ? "Kontakt aufnehmen" : "Plan wählen"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Tiny reassurance + FAQ pointers */}
      <div className="mt-6 grid grid-cols-12 gap-3">
        {[
          { t: "Jederzeit kündbar",   d: "Monatliche Abrechnung. Kein Lock-in, keine Vertragsbindung." },
          { t: "Sichere Zahlung",     d: "Abwicklung über Stripe. Kreditkarte oder SEPA-Lastschrift." },
          { t: "DSGVO-konform",       d: "EU-Server, keine Tracking-Cookies, jederzeit löschbar." },
        ].map((p) => (
          <div
            key={p.t}
            className="col-span-12 sm:col-span-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elev-1)]/40 p-5"
          >
            <p className="text-[13px] font-semibold text-[var(--color-fg)] mb-1.5">{p.t}</p>
            <p className="text-[12px] leading-relaxed text-[var(--color-fg-muted)]">{p.d}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-[12px] text-[var(--color-fg-dim)]">
        Fragen zur Abrechnung?{" "}
        <a href="/contact" className="text-[var(--color-accent-300)] hover:text-[var(--color-accent-200)] transition-colors underline-offset-2 hover:underline">
          Schreib uns
        </a>
        .
      </p>
    </LegalLayout>
  );
}
