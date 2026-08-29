import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { authApi, initApi } from "../services/api";
import useAuthStore from "../hooks/useAuthStore";
import AuthLayout from "../components/ui/AuthLayout";
import { getApiErrorMessage } from "../utils/apiError";

/** Login page — email/password sign-in with split-screen layout. */
export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const login = useAuthStore((s) => s.login);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();

  const t = "var(--ja-auth-transition)";

  const onSubmit = async (data) => {
    try {
      const res = await authApi.login(data);
      login(res.data.access_token);

      try {
        const initRes = await initApi.fetch();
        if (initRes.data?.me) setUser(initRes.data.me);
      } catch { /* init fetch failure is non-blocking */ }

      navigate("/dashboard");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Anmeldung fehlgeschlagen"));
    }
  };

  const inputCls = `w-full h-[48px] rounded-[8px] border px-3.5 text-[14px] placeholder:text-[var(--ja-auth-muted)] transition-colors duration-[110ms] outline-none`;

  return (
    <AuthLayout>
      {/* ── Heading ──────────────────────────────────────────────── */}
      <div className="mb-7">
        <h2 className="text-[24px] sm:text-[28px] font-bold tracking-[-0.03em] leading-[1.15]"
          style={{ color: "var(--ja-auth-text, #171717)", transition: t }}>
          Willkommen zurück.
        </h2>
        <p className="mt-2 text-[14px]" style={{ color: "var(--ja-auth-secondary, #666)", transition: t }}>
          Setze deine Bewerbung fort.
        </p>
      </div>

      {/* ── Form ─────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            style={{
              background: "var(--ja-auth-input-bg, #fff)",
              borderColor: errors.email ? "#ef4444" : "var(--ja-auth-input-border, #e7e6e3)",
              color: "var(--ja-auth-text, #171717)",
            }}
            {...register("email", { required: "E-Mail ist erforderlich" })}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="mt-1.5 text-[12px] text-[#ef4444]">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[12px] font-semibold" htmlFor="password"
              style={{ color: "var(--ja-auth-secondary, #666)", transition: t }}>
              Passwort
            </label>
            <Link
              to="/forgot-password"
              className="text-[12px] font-medium hover:underline transition-colors"
              style={{ color: "var(--ja-auth-link, #e30613)" }}
            >
              Vergessen?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Dein Passwort"
              className={`${inputCls} pr-10`}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              style={{
                background: "var(--ja-auth-input-bg, #fff)",
                borderColor: errors.password ? "#ef4444" : "var(--ja-auth-input-border, #e7e6e3)",
                color: "var(--ja-auth-text, #171717)",
              }}
              {...register("password", { required: "Passwort ist erforderlich" })}
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
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-[48px] rounded-[8px] inline-flex items-center justify-center gap-2 text-[14px] font-semibold transition-colors duration-[110ms] disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: isSubmitting ? "var(--ja-auth-cta-hover, #c9000b)" : "var(--ja-auth-cta, #e30613)",
            color: "var(--ja-auth-cta-text, #fff)",
          }}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Anmelden…</span>
            </>
          ) : (
            <span>Anmelden</span>
          )}
        </button>
      </form>

      {/* ── Bottom link ──────────────────────────────────────────── */}
      <p className="mt-6 text-center text-[13px]" style={{ color: "var(--ja-auth-secondary, #666)", transition: t }}>
        Noch kein Konto?{" "}
        <Link
          to="/register"
          className="font-semibold hover:underline transition-colors"
          style={{ color: "var(--ja-auth-link, #e30613)" }}
        >
          Jetzt registrieren
        </Link>
      </p>
    </AuthLayout>
  );
}