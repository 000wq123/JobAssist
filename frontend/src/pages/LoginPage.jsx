import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { authApi, initApi } from "../services/api";
import useAuthStore from "../hooks/useAuthStore";
import AuthLayout from "../components/ui/AuthLayout";
import Button from "../components/ui/Button";
import queryClient from "../queryClient";
import { getApiErrorMessage } from "../utils/apiError";

/** Login page with email/password form and persistent session handling. */
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

  const onSubmit = async (data) => {
    try {
      const res = await authApi.login(data);
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
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl font-bold text-slate-100 mb-1">Willkommen zurück</h2>
        <p className="text-slate-400 text-sm sm:text-base">
          Melde dich bei deinem JobAssist-Konto an
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
              placeholder="Dein Passwort eingeben"
              {...register("password", { required: "Passwort ist erforderlich" })}
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
          <div className="text-right mt-1">
            <Link
              to="/forgot-password"
              className="text-xs text-brand-300 hover:text-brand-200 transition-colors"
            >
              Passwort vergessen?
            </Link>
          </div>
        </div>

        <Button type="submit" size="lg" fullWidth disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Anmeldung läuft…</span>
            </>
          ) : (
            "Anmelden"
          )}
        </Button>
      </form>

      <p className="text-sm text-center text-slate-400 mt-6">
        Noch kein Konto?{" "}
        <Link to="/register" className="text-brand-300 font-semibold hover:text-brand-200 transition-colors">
          Jetzt registrieren
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
