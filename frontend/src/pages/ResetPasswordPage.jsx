import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, CheckCircle2, Loader2, ArrowRight, Lock, XCircle } from "lucide-react";
import { authApi } from "../services/api";
import AuthLayout from "../components/ui/AuthLayout";
import { getApiErrorMessage } from "../utils/apiError";

/** Password-reset page — validates token from URL params, then accepts a new password. */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const onSubmit = async (data) => {
    setError(null);
    try {
      await authApi.resetPassword(token, data.password);
      setDone(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "Link ist ungültig oder abgelaufen"));
    }
  };

  if (!token) {
    return (
      <AuthLayout backTo="/forgot-password" backLabel="Neuen Link anfordern">
        <div className="text-center py-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-error-soft)] mx-auto mb-5">
            <XCircle className="h-7 w-7 text-[var(--color-error)]" />
          </div>
          <h1 className="text-[26px] font-semibold tracking-tight text-[var(--color-fg)]">
            Ungültiger Link
          </h1>
          <p className="mt-3 max-w-[40ch] mx-auto text-[14px] text-[var(--color-fg-muted)]">
            Dieser Link ist ungültig oder abgelaufen. Fordere bitte einen neuen an.
          </p>
          <Link
            to="/forgot-password"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent-500)] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[var(--color-accent-400)] transition-colors"
          >
            Neuen Link anfordern
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout backTo="/login" backLabel="Zurück zum Login">
        <div className="text-center py-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-success-soft)] mx-auto mb-5">
            <CheckCircle2 className="h-7 w-7 text-[var(--color-success)]" />
          </div>
          <h1 className="text-[26px] sm:text-[32px] font-semibold tracking-tight leading-[1.15] text-[var(--color-fg)]">
            Passwort{" "}
            <span className="font-display italic text-[var(--color-accent-300)]">aktualisiert</span>.
          </h1>
          <p className="mt-3 text-[14px] text-[var(--color-fg-muted)]">
            Du kannst dich jetzt mit deinem neuen Passwort anmelden.
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
          Neues{" "}
          <span className="font-display italic text-[var(--color-accent-300)]">Passwort</span>.
        </h1>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)]">
          Wähle ein neues Passwort für dein Konto.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-12 gap-y-4">
        <div className="col-span-12">
          <label className="block mb-1.5 text-[12px] font-semibold text-[var(--color-fg-muted)]" htmlFor="password">
            Neues Passwort
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-fg-dim)]" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Mindestens 8 Zeichen"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] pl-10 pr-10 py-2.5 text-[14px] text-[var(--color-fg)] placeholder:text-[var(--color-fg-dim)] focus:outline-none focus:border-[var(--color-accent-500)]/70 transition-colors"
              {...register("password", {
                required: "Passwort ist erforderlich",
                minLength: { value: 8, message: "Mindestens 8 Zeichen" },
                validate: (v) => {
                  if (!/[A-Z]/.test(v)) return "Mindestens ein Großbuchstabe";
                  if (!/[a-z]/.test(v)) return "Mindestens ein Kleinbuchstabe";
                  if (!/[0-9]/.test(v)) return "Mindestens eine Zahl";
                  return true;
                },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-fg-dim)] hover:text-[var(--color-fg-muted)] transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-[12px] text-[var(--color-error)]">{errors.password.message}</p>
          )}
        </div>

        <div className="col-span-12">
          <label className="block mb-1.5 text-[12px] font-semibold text-[var(--color-fg-muted)]" htmlFor="confirmPassword">
            Passwort bestätigen
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-fg-dim)]" />
            <input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Passwort wiederholen"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] pl-10 pr-10 py-2.5 text-[14px] text-[var(--color-fg)] placeholder:text-[var(--color-fg-dim)] focus:outline-none focus:border-[var(--color-accent-500)]/70 transition-colors"
              {...register("confirmPassword", {
                required: "Bitte bestätige dein Passwort",
                validate: (v) => v === watch("password") || "Passwörter stimmen nicht überein",
              })}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-fg-dim)] hover:text-[var(--color-fg-muted)] transition-colors"
              tabIndex={-1}
              aria-label={showConfirm ? "Passwort verbergen" : "Passwort anzeigen"}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1.5 text-[12px] text-[var(--color-error)]">{errors.confirmPassword.message}</p>
          )}
        </div>

        {error && (
          <p className="col-span-12 text-[12px] text-[var(--color-error)]">{error}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="col-span-12 mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent-500)] px-5 py-3 text-[14px] font-semibold text-white hover:bg-[var(--color-accent-400)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Wird gespeichert…</span>
            </>
          ) : (
            <>
              <span>Passwort speichern</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
