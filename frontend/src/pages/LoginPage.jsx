import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff, Loader2, ArrowRight, Mail, Lock } from "lucide-react";
import { authApi, initApi } from "../services/api";
import useAuthStore from "../hooks/useAuthStore";
import AuthLayout from "../components/ui/AuthLayout";
import queryClient from "../queryClient";
import { getApiErrorMessage } from "../utils/apiError";

/** Login page — email/password sign-in flow. */
export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const fingerprintRef = useRef(null);
  const login = useAuthStore((s) => s.login);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();

  useEffect(() => {
    import("@fingerprintjs/fingerprintjs")
      .then((FingerprintJS) => FingerprintJS.default.load())
      .then((fp) => fp.get())
      .then((result) => { fingerprintRef.current = result.visitorId; })
      .catch(() => {});
  }, []);

  const onSubmit = async (data) => {
    try {
      const res = await authApi.login({ ...data, fingerprint: fingerprintRef.current ?? null });
      login(res.data.access_token, res.data.refresh_token);
      queryClient.clear();
      navigate("/dashboard");

      initApi
        .fetch()
        .then((initRes) => {
          const initData = initRes.data;
          try {
            localStorage.setItem("init", JSON.stringify(initData));
          } catch {}
          queryClient.setQueryData(["init"], initData);
          if (initData.me) setUser(initData.me);
        })
        .catch(() => {});
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Anmeldung fehlgeschlagen"));
    }
  };

  return (
    <AuthLayout>
      <div className="mb-7 text-center">
        <h1 className="text-[32px] sm:text-[40px] font-semibold tracking-tight leading-[1.1] text-[var(--color-fg)]">
          Willkommen{" "}
          <span className="font-display italic text-[var(--color-accent-300)]">zurück</span>.
        </h1>
        <p className="mt-3 text-[14px] text-[var(--color-fg-muted)]">
          Setze deine Bewerbung fort.
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

        <div className="col-span-12">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[12px] font-semibold text-[var(--color-fg-muted)]" htmlFor="password">
              Passwort
            </label>
            <Link
              to="/forgot-password"
              className="text-[12px] text-[var(--color-accent-300)] hover:text-[var(--color-accent-200)] transition-colors"
            >
              Vergessen?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-fg-dim)]" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Dein Passwort"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elev-1)] pl-10 pr-10 py-2.5 text-[14px] text-[var(--color-fg)] placeholder:text-[var(--color-fg-dim)] focus:outline-none focus:border-[var(--color-accent-500)]/70 transition-colors"
              {...register("password", { required: "Passwort ist erforderlich" })}
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="col-span-12 mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent-500)] px-5 py-3 text-[14px] font-semibold text-white hover:bg-[var(--color-accent-400)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Anmeldung läuft…</span>
            </>
          ) : (
            <>
              <span>Anmelden</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-7 text-center text-[13px] text-[var(--color-fg-muted)]">
        Noch kein Konto?{" "}
        <Link
          to="/register"
          className="font-semibold text-[var(--color-accent-300)] hover:text-[var(--color-accent-200)] transition-colors"
        >
          Jetzt registrieren
        </Link>
      </p>
    </AuthLayout>
  );
}
