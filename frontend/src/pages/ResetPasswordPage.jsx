import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, CheckCircle, Loader2 } from "lucide-react";
import { authApi } from "../services/api";
import AuthLayout from "../components/ui/AuthLayout";
import Button from "../components/ui/Button";
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
      <AuthLayout>
        <div className="text-center py-8">
          <h2 className="text-xl font-bold text-slate-100 mb-2">Ungültiger Link</h2>
          <p className="text-sm text-slate-400 mb-4">Dieser Link ist ungültig. Bitte fordere einen neuen an.</p>
          <Link to="/forgot-password" className="btn-primary inline-block">Neuen Link anfordern</Link>
        </div>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout>
        <div className="text-center py-8">
          <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Passwort zurückgesetzt</h2>
          <p className="text-sm text-slate-400 mb-4">Du kannst dich jetzt mit deinem neuen Passwort anmelden.</p>
          <Link to="/login" className="btn-primary inline-block">Zum Login</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-100 mb-1">Neues Passwort</h2>
        <p className="text-slate-400 text-sm">Wähle ein neues Passwort für dein Konto.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="label">Neues Passwort</label>
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
          {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
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
          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1.5">{errors.confirmPassword.message}</p>}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <Button type="submit" size="lg" fullWidth disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Wird gespeichert…</span>
            </>
          ) : (
            "Passwort speichern"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
