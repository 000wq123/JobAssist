import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  Mail, Clock, Send, CheckCircle2, Loader2, MessageCircle, FileText, Shield, ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";

import LegalLayout from "../components/ui/LegalLayout";
import { contactApi } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";

const TOPICS = [
  "Allgemeine Frage",
  "Technischer Support",
  "Datenschutz / DSGVO",
  "Abrechnung & Abonnement",
  "Feedback & Verbesserungen",
  "Sonstiges",
];

const INFO_CARDS = [
  { icon: MessageCircle, label: "Allgemeine Fragen", sub: "Funktionen, Preise, Abos"  },
  { icon: FileText,      label: "Technischer Support", sub: "Fehler & Probleme"        },
  { icon: Shield,        label: "Datenschutz",         sub: "DSGVO-Anfragen"            },
];

/** Contact form page with subject categories and a success confirmation screen. */
export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { name: "", email: "", topic: "", message: "" },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await contactApi.send(data);
      setSubmitted(true);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Fehler beim Senden. Bitte versuche es erneut."));
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    "w-full rounded-lg border bg-[var(--color-bg-elev-1)] px-3 py-2.5 text-[14px] text-[var(--color-fg)] placeholder:text-[var(--color-fg-dim)] focus:outline-none focus:border-[var(--app-brand)]/70 transition-colors";

  return (
    <LegalLayout
      title={<>Kontakt & <span className="font-display italic text-[var(--app-brand)]">Support</span></>}
      subtitle="Wir helfen dir gerne weiter — ob technische Frage, Feedback oder Datenschutzanliegen."
    >
      {submitted ? (
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]/60 backdrop-blur-sm p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-success-soft)] mx-auto mb-5">
            <CheckCircle2 className="h-7 w-7 text-[var(--color-success)]" />
          </div>
          <h2 className="text-[24px] sm:text-[28px] font-semibold tracking-tight leading-[1.15] text-[var(--color-fg)]">
            Nachricht{" "}
            <span className="font-display italic text-[var(--app-brand)]">gesendet</span>.
          </h2>
          <p className="mt-3 max-w-[44ch] mx-auto text-[14px] text-[var(--color-fg-muted)]">
            Vielen Dank für deine Nachricht. Wir melden uns in der Regel innerhalb von 24 Stunden bei dir.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--app-brand)] hover:text-[var(--app-brand-hover)] transition-colors"
          >
            Weitere Nachricht senden
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Form */}
          <div className="col-span-12 md:col-span-7 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]/60 backdrop-blur-sm p-6 sm:p-7">
            <h2 className="text-[16px] font-semibold text-[var(--color-fg)] mb-5">Nachricht senden</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-12 gap-y-4">
              <div className="col-span-12">
                <label htmlFor="name" className="block mb-1.5 text-[12px] font-semibold text-[var(--color-fg-muted)]">Name</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Dein Name"
                  className={`${inputBase} ${errors.name ? "border-[var(--color-error)]/60" : "border-[var(--color-border)]"}`}
                  {...register("name", { required: "Name ist erforderlich" })}
                />
                {errors.name && <p className="mt-1.5 text-[12px] text-[var(--color-error)]">{errors.name.message}</p>}
              </div>

              <div className="col-span-12">
                <label htmlFor="email" className="block mb-1.5 text-[12px] font-semibold text-[var(--color-fg-muted)]">E-Mail</label>
                <input
                  id="email"
                  type="email"
                  placeholder="deine@email.at"
                  className={`${inputBase} ${errors.email ? "border-[var(--color-error)]/60" : "border-[var(--color-border)]"}`}
                  {...register("email", {
                    required: "E-Mail ist erforderlich",
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Ungültige E-Mail-Adresse" },
                  })}
                />
                {errors.email && <p className="mt-1.5 text-[12px] text-[var(--color-error)]">{errors.email.message}</p>}
              </div>

              <div className="col-span-12">
                <label htmlFor="topic" className="block mb-1.5 text-[12px] font-semibold text-[var(--color-fg-muted)]">Thema</label>
                <select
                  id="topic"
                  className={`${inputBase} appearance-none bg-no-repeat bg-[right_0.9rem_center] pr-10 cursor-pointer ${errors.topic ? "border-[var(--color-error)]/60" : "border-[var(--color-border)]"}`}
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a3a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
                  }}
                  {...register("topic", { required: "Bitte wähle ein Thema" })}
                >
                  <option value="">Thema auswählen…</option>
                  {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.topic && <p className="mt-1.5 text-[12px] text-[var(--color-error)]">{errors.topic.message}</p>}
              </div>

              <div className="col-span-12">
                <label htmlFor="message" className="block mb-1.5 text-[12px] font-semibold text-[var(--color-fg-muted)]">Nachricht</label>
                <textarea
                  id="message"
                  rows={5}
                  placeholder="Beschreibe dein Anliegen so genau wie möglich…"
                  className={`${inputBase} resize-none ${errors.message ? "border-[var(--color-error)]/60" : "border-[var(--color-border)]"}`}
                  {...register("message", {
                    required: "Nachricht ist erforderlich",
                    minLength: { value: 10, message: "Mindestens 10 Zeichen" },
                  })}
                />
                {errors.message && <p className="mt-1.5 text-[12px] text-[var(--color-error)]">{errors.message.message}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="col-span-12 mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent-500)] px-5 py-3 text-[14px] font-semibold text-white hover:bg-[var(--color-accent-400)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Wird gesendet…</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Nachricht senden</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Sidebar */}
          <div className="col-span-12 md:col-span-5 grid grid-cols-12 gap-3 content-start">
            <div className="col-span-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]/60 backdrop-blur-sm p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-[var(--color-accent-500)]/15 border border-[var(--color-accent-500)]/25">
                  <Mail className="h-4 w-4 text-[var(--app-brand)]" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[var(--color-fg)] leading-tight">Direkter Kontakt</p>
                  <a
                    href="mailto:hallo@jobassist.tech"
                    className="mt-0.5 inline-block text-[12px] text-[var(--app-brand)] underline decoration-dotted underline-offset-2 hover:text-[var(--app-brand-hover)] transition-colors"
                  >
                    hallo@jobassist.tech
                  </a>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[var(--color-fg-dim)]">
                    <Clock className="h-3 w-3" />
                    Antwort innerhalb von 24 Stunden
                  </div>
                </div>
              </div>
            </div>

            {INFO_CARDS.map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                className="col-span-12 group rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elev-1)]/60 backdrop-blur-sm p-5 flex items-center gap-3 hover:border-[var(--color-accent-500)]/40 hover:bg-[var(--color-bg-elev-1)]/80 transition-colors"
              >
                <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-[var(--color-bg-elev-2)] border border-[var(--color-border-subtle)] group-hover:border-[var(--color-accent-500)]/30 transition-colors">
                  <Icon className="h-4 w-4 text-[var(--color-fg-muted)] group-hover:text-[var(--app-brand)] transition-colors" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[var(--color-fg)] leading-tight">{label}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--color-fg-dim)]">{sub}</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-fg-dim)] group-hover:text-[var(--app-brand)] group-hover:translate-x-0.5 transition-all" />
              </div>
            ))}
          </div>
        </div>
      )}
    </LegalLayout>
  );
}
