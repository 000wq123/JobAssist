import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { authApi } from "../services/api";
import AuthLayout from "../components/ui/AuthLayout";
import Button from "../components/ui/Button";
import { ArrowLeft, Loader2, Mail } from "lucide-react";

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

  return (
    <AuthLayout>
      <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Zurück zum Login
      </Link>

      {sent ? (
        <div className="text-center py-8">
          <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">E-Mail gesendet</h2>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir dir einen Link zum Zurücksetzen deines Passworts gesendet.
          </p>
          <Link to="/login" className="btn-primary inline-block mt-6">Zurück zum Login</Link>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-100 mb-1">Passwort vergessen?</h2>
            <p className="text-slate-400 text-sm">Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen.</p>
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

            <Button type="submit" size="lg" fullWidth disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Wird gesendet…</span>
                </>
              ) : (
                "Link senden"
              )}
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
