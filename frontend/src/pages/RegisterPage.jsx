import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import AuthLayout from "../components/ui/AuthLayout";
import Button from "../components/ui/Button";
import useAuthStore from "../hooks/useAuthStore";
import queryClient from "../queryClient";
import { authApi, initApi } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";

/** Registration page with name, email, password fields and email-verification flow. */
export default function RegisterPage() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const fingerprintRef = useRef(null);
  const login = useAuthStore((s) => s.login);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();

  useEffect(() => {
    import("@fingerprintjs/fingerprintjs")
      .then((FingerprintJS) => FingerprintJS.default.load())
      .then((fp) => fp.get())
      .then((result) => { fingerprintRef.current = result.visitorId; })
      .catch(() => {}); // silently ignore if blocked
  }, []);

  const onSubmit = async (data) => {
    try {
      const res = await authApi.register({
        ...data,
        fingerprint: fingerprintRef.current ?? null,
      });
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

      toast.success("Konto erstellt. Bitte bestätige deine E-Mail, um alle Funktionen freizuschalten.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Registrierung fehlgeschlagen"));
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl font-bold text-slate-100 mb-1">Konto erstellen</h2>
        <p className="text-slate-400 text-sm sm:text-base">
          Starte jetzt mit deiner Bewerbung in Österreich
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="label">Vollständiger Name</label>
          <input className="input" placeholder="Max Mustermann" {...register("full_name")} />
        </div>

        <div>
          <label className="label">E-Mail-Adresse</label>
          <input
            className="input"
            type="email"
            placeholder="du@beispiel.at"
            {...register("email", { required: "E-Mail ist erforderlich" })}
          />
          {errors.email && <p className="text-red-500 text-xs mt-1.5">{errors.email.message}</p>}
        </div>

        <div>
          <label className="label">Passwort</label>
          <div className="relative">
            <input
              className="input pr-10"
              type={showPassword ? "text" : "password"}
              placeholder="Mindestens 8 Zeichen"
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
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-300 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="label">Passwort bestätigen</label>
          <div className="relative">
            <input
              className="input pr-10"
              type={showConfirm ? "text" : "password"}
              placeholder="Passwort wiederholen"
              {...register("confirmPassword", {
                required: "Bitte bestätige dein Passwort",
                validate: (v) => v === watch("password") || "Passwörter stimmen nicht überein",
              })}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-slate-300 transition-colors"
              tabIndex={-1}
              aria-label={showConfirm ? "Passwort verbergen" : "Passwort anzeigen"}
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-red-500 text-xs mt-1.5">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" size="lg" fullWidth disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Konto wird erstellt…</span>
            </>
          ) : (
            "Konto erstellen"
          )}
        </Button>
      </form>

      <p className="text-sm text-center text-slate-400 mt-6">
        Bereits ein Konto?{" "}
        <Link to="/login" className="text-brand-300 font-semibold hover:text-brand-200 transition-colors">
          Anmelden
        </Link>
      </p>

      <div className="flex justify-center gap-4 mt-6 text-xs text-slate-500">
        <Link to="/terms" className="hover:text-slate-300 transition-colors">
          AGB
        </Link>
        <Link to="/privacy" className="hover:text-slate-300 transition-colors">
          Datenschutz
        </Link>
        <Link to="/impressum" className="hover:text-slate-300 transition-colors">
          Impressum
        </Link>
      </div>
    </AuthLayout>
  );
}
