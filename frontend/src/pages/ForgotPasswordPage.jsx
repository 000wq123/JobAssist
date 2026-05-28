import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { authApi } from "../services/api";
import AuthLayout from "../components/ui/AuthLayout";
import { ArrowRight, Loader2, Mail } from "lucide-react";

/** Forgot-password page — submits an email and shows a confirmation screen. */
export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [sent, setSent] = useState(false);

  const onSubmit = async (data) => {
    try {
      await authApi.forgotPassword(data.email);
      setSent(true);
    } catch {
      // Always show success to prevent email enumeration
      setSent(true);
    }
  };

  if (sent) {
    return (
      <AuthLayout backTo="/login" backLabel="Zurück zum Login">
        <div className="text-center py-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-success-soft)] mx-auto mb-5">
            <Mail className="h-7 w-7 text-[var(--color-success)]" />
          </div>
          <h1 className="text-[26px] sm:text-[32px] font-semibold tracking-tight leading-[1.15] text-[var(--color-fg)]">
            Check deine{" "}
            <span className="font-display italic text-[var(--color-accent-300)]">Inbox</span>.
          </h1>
          <p className="mt-3 max-w-[44ch] mx-auto text-[14px] text-[var(--color-fg-muted)]">
            Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir dir einen Link zum Zurücksetzen
            deines Passworts gesendet.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent-500)] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[var(--color-accent-400)] transition-colors"
          >
            Zum Login
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout backTo="/login" backLabel="Zurück zum Login">
      <div className="mb-7 text-center">
        <h1 className="text-[28px] sm:text-[36px] font-semibold tracking-tight leading-[1.1] text-[var(--color-fg)]">
          Passwort{" "}
          <span className="font-display italic text-[var(--color-accent-300)]">vergessen?</span>
        </h1>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)]">
          Gib deine E-Mail-Adresse ein — wir senden dir einen Link.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-12 gap-y-4">
        <div className="col-span-12">
          <label className="block mb-1.5 text-[12px] font-semibold text-[var(--color-fg-muted)]" htmlFor="email">
            E-Mail-Adresse
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-fg-dim)]" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="du@beispiel.at"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] pl-10 pr-3 py-2.5 text-[14px] text-[var(--color-fg)] placeholder:text-[var(--color-fg-dim)] focus:outline-none focus:border-[var(--color-accent-500)]/70 transition-colors"
              {...register("email", { required: "E-Mail ist erforderlich" })}
            />
          </div>
          {errors.email && (
            <p className="mt-1.5 text-[12px] text-[var(--color-error)]">{errors.email.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="col-span-12 mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent-500)] px-5 py-3 text-[14px] font-semibold text-white hover:bg-[var(--color-accent-400)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Wird gesendet…</span>
            </>
          ) : (
            <>
              <span>Link senden</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
