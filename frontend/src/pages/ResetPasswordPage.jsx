import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, CheckCircle2, Loader2, XCircle } from "lucide-react";
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

  const t = "var(--ja-auth-transition)";

  const onSubmit = async (data) => {
    setError(null);
    try {
      await authApi.resetPassword(token, data.password);
      setDone(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "Link ist ungültig oder abgelaufen"));
    }
  };

  const inputCls = `w-full h-[48px] rounded-[8px] border px-3.5 text-[14px] placeholder:text-[var(--ja-auth-muted)] transition-colors duration-[110ms] outline-none`;
  const inputStyle = (fieldErr) => ({
    background: "var(--ja-auth-input-bg, #fff)",
    borderColor: fieldErr ? "#ef4444" : "var(--ja-auth-input-border, #e7e6e3)",
    color: "var(--ja-auth-text, #171717)",
  });

  if (!token) {
    return (
      <AuthLayout backTo="/forgot-password" backLabel="Neuen Link anfordern">
        <div className="text-center py-2">
          <div className="grid h-12 w-12 place-items-center rounded-xl mx-auto mb-5"
            style={{ background: "rgba(239, 68, 68, 0.10)" }}>
            <XCircle className="h-6 w-6 text-[#ef4444]" />
          </div>
          <h2 className="text-[24px] font-bold tracking-[-0.03em] leading-[1.15]"
            style={{ color: "var(--ja-auth-text, #171717)", transition: t }}>
            Ungültiger Link
          </h2>
          <p className="mt-3 max-w-[40ch] mx-auto text-[14px]" style={{ color: "var(--ja-auth-secondary, #666)", transition: t }}>
            Dieser Link ist ungültig oder abgelaufen. Fordere bitte einen neuen an.
          </p>
          <Link
            to="/forgot-password"
            className="mt-6 inline-flex items-center h-[44px] px-6 rounded-[8px] text-[13px] font-semibold transition-colors duration-[110ms]"
            style={{
              background: "var(--ja-auth-cta, #6152F3)",
              color: "var(--ja-auth-cta-text, #fff)",
            }}
          >
            Neuen Link anfordern
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout backTo="/login" backLabel="Zurück zum Login">
        <div className="text-center py-2">
          <div className="grid h-12 w-12 place-items-center rounded-xl mx-auto mb-5"
            style={{ background: "rgba(93, 159, 104, 0.10)" }}>
            <CheckCircle2 className="h-6 w-6 text-[#5d9f68]" />
          </div>
          <h2 className="text-[24px] sm:text-[28px] font-bold tracking-[-0.03em] leading-[1.15]"
            style={{ color: "var(--ja-auth-text, #171717)", transition: t }}>
            Passwort aktualisiert.
          </h2>
          <p className="mt-3 text-[14px]" style={{ color: "var(--ja-auth-secondary, #666)", transition: t }}>
            Du kannst dich jetzt mit deinem neuen Passwort anmelden.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center h-[44px] px-6 rounded-[8px] text-[13px] font-semibold transition-colors duration-[110ms]"
            style={{
              background: "var(--ja-auth-cta, #6152F3)",
              color: "var(--ja-auth-cta-text, #fff)",
            }}
          >
            Zum Login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout backTo="/login" backLabel="Zurück zum Login">
      <div className="mb-7">
        <h2 className="text-[24px] sm:text-[28px] font-bold tracking-[-0.03em] leading-[1.15]"
          style={{ color: "var(--ja-auth-text, #171717)", transition: t }}>
          Neues Passwort.
        </h2>
        <p className="mt-2 text-[14px]" style={{ color: "var(--ja-auth-secondary, #666)", transition: t }}>
          Wähle ein neues Passwort für dein Konto.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* New password */}
        <div>
          <label className="block mb-1.5 text-[12px] font-semibold" htmlFor="password"
            style={{ color: "var(--ja-auth-secondary, #666)", transition: t }}>
            Neues Passwort
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Mindestens 8 Zeichen"
              className={`${inputCls} pr-10`}
              style={inputStyle(errors.password)}
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
              className="absolute inset-y-0 right-0 flex items-center px-3 transition-colors"
              tabIndex={-1}
              style={{ color: "var(--ja-auth-muted, #909090)" }}
              aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-[12px] text-[#ef4444]">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label className="block mb-1.5 text-[12px] font-semibold" htmlFor="confirmPassword"
            style={{ color: "var(--ja-auth-secondary, #666)", transition: t }}>
            Passwort bestätigen
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Passwort wiederholen"
              className={`${inputCls} pr-10`}
              style={inputStyle(errors.confirmPassword)}
              {...register("confirmPassword", {
                required: "Bitte bestätige dein Passwort",
                validate: (v) => v === watch("password") || "Passwörter stimmen nicht überein",
              })}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 transition-colors"
              tabIndex={-1}
              style={{ color: "var(--ja-auth-muted, #909090)" }}
              aria-label={showConfirm ? "Passwort verbergen" : "Passwort anzeigen"}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1.5 text-[12px] text-[#ef4444]">{errors.confirmPassword.message}</p>
          )}
        </div>

        {error && (
          <p className="text-[12px] text-[#ef4444]">{error}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-[48px] rounded-[8px] inline-flex items-center justify-center gap-2 text-[14px] font-semibold transition-colors duration-[110ms] disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: isSubmitting ? "var(--ja-auth-cta-hover, #4D40D6)" : "var(--ja-auth-cta, #6152F3)",
            color: "var(--ja-auth-cta-text, #fff)",
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Wird gespeichert…</span>
            </>
          ) : (
            <span>Passwort speichern</span>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}