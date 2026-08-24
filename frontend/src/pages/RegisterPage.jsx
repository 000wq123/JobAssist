import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

import AuthLayout from "../components/ui/AuthLayout";
import useAuthStore from "../hooks/useAuthStore";
import { authApi, initApi } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";

/** Registration page — name, email, password, confirm with split-screen layout. */
export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const login = useAuthStore((s) => s.login);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();

  const t = "var(--ja-auth-transition)";

  const onSubmit = async (data) => {
    try {
      const res = await authApi.register(data);
      login(res.data.access_token);

      try {
        const initRes = await initApi.fetch();
        if (initRes.data?.me) setUser(initRes.data.me);
      } catch { /* init fetch failure is non-blocking */ }

      navigate("/dashboard");
      toast.success("Konto erstellt. Bitte bestätige deine E-Mail.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Registrierung fehlgeschlagen"));
    }
  };

  const passwordValue = watch("password") ?? "";

  const inputCls = `w-full h-[48px] rounded-[8px] border px-3.5 text-[14px] placeholder:text-[var(--ja-auth-muted)] transition-colors duration-[110ms] outline-none`;
  const inputStyle = (fieldErr) => ({
    background: "var(--ja-auth-input-bg, #fff)",
    borderColor: fieldErr ? "#ef4444" : "var(--ja-auth-input-border, #e7e6e3)",
    color: "var(--ja-auth-text, #171717)",
  });

  return (
    <AuthLayout>
      {/* ── Heading ──────────────────────────────────────────────── */}
      <div className="mb-7">
        <h2 className="text-[24px] sm:text-[28px] font-bold tracking-[-0.03em] leading-[1.15]"
          style={{ color: "var(--ja-auth-text, #171717)", transition: t }}>
          Konto erstellen.
        </h2>
        <p className="mt-2 text-[14px]" style={{ color: "var(--ja-auth-secondary, #666)", transition: t }}>
          Kostenlos. Keine Kreditkarte erforderlich.
        </p>
      </div>

      {/* ── Form ─────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block mb-1.5 text-[12px] font-semibold" htmlFor="full_name"
            style={{ color: "var(--ja-auth-secondary, #666)", transition: t }}>
            Vollständiger Name
          </label>
          <input
            id="full_name"
            autoComplete="name"
            placeholder="Max Mustermann"
            className={inputCls}
            style={inputStyle()}
            {...register("full_name")}
          />
        </div>

        {/* Email */}
        <div>
          <label className="block mb-1.5 text-[12px] font-semibold" htmlFor="email"
            style={{ color: "var(--ja-auth-secondary, #666)", transition: t }}>
            E-Mail-Adresse
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="du@beispiel.at"
            className={inputCls}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            style={inputStyle(errors.email)}
            {...register("email", { required: "E-Mail ist erforderlich" })}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="mt-1.5 text-[12px] text-[#ef4444]">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block mb-1.5 text-[12px] font-semibold" htmlFor="password"
            style={{ color: "var(--ja-auth-secondary, #666)", transition: t }}>
            Passwort
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Mindestens 8 Zeichen"
              className={`${inputCls} pr-10`}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
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
              // eslint-disable-next-line no-restricted-syntax -- icon overlay inside relative input, not layout
              className="absolute inset-y-0 right-0 flex items-center px-3 transition-colors"
              tabIndex={-1}
              style={{ color: "var(--ja-auth-muted, #909090)" }}
              aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" role="alert" className="mt-1.5 text-[12px] text-[#ef4444]">{errors.password.message}</p>
          )}
          {/* Inline password requirements */}
          {passwordValue && !errors.password && (
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]"
              style={{ color: "var(--ja-auth-muted, #909090)" }}>
              {[
                { l: "8+ Zeichen", ok: passwordValue.length >= 8 },
                { l: "Großbuchstabe", ok: /[A-Z]/.test(passwordValue) },
                { l: "Kleinbuchstabe", ok: /[a-z]/.test(passwordValue) },
                { l: "Zahl", ok: /[0-9]/.test(passwordValue) },
              ].map((r) => (
                <span key={r.l} className="inline-flex items-center gap-1">
                  <CheckCircle2
                    className={`h-3 w-3 ${r.ok ? "text-[#5d9f68]" : ""}`}
                    style={{ color: r.ok ? "#5d9f68" : "var(--ja-auth-muted, #909090)" }}
                  />
                  {r.l}
                </span>
              ))}
            </div>
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
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
              style={inputStyle(errors.confirmPassword)}
              {...register("confirmPassword", {
                required: "Bitte bestätige dein Passwort",
                validate: (v) => v === watch("password") || "Passwörter stimmen nicht überein",
              })}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              // eslint-disable-next-line no-restricted-syntax -- icon overlay inside relative input, not layout
              className="absolute inset-y-0 right-0 flex items-center px-3 transition-colors"
              tabIndex={-1}
              style={{ color: "var(--ja-auth-muted, #909090)" }}
              aria-label={showConfirm ? "Passwort verbergen" : "Passwort anzeigen"}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p id="confirmPassword-error" role="alert" className="mt-1.5 text-[12px] text-[#ef4444]">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Submit */}
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
              <span>Konto wird erstellt…</span>
            </>
          ) : (
            <span>Konto erstellen</span>
          )}
        </button>
      </form>

      {/* ── Bottom link ──────────────────────────────────────────── */}
      <p className="mt-6 text-center text-[13px]" style={{ color: "var(--ja-auth-secondary, #666)", transition: t }}>
        Bereits ein Konto?{" "}
        <Link
          to="/login"
          className="font-semibold hover:underline transition-colors"
          style={{ color: "var(--ja-auth-link, #6152F3)" }}
        >
          Anmelden
        </Link>
      </p>
    </AuthLayout>
  );
}