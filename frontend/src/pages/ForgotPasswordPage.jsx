import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { authApi } from "../services/api";
import AuthLayout from "../components/ui/AuthLayout";
import { Loader2, Mail } from "lucide-react";

/** Forgot-password page — submits an email and shows a confirmation screen. */
export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [sent, setSent] = useState(false);

  const t = "var(--ja-auth-transition)";

  const onSubmit = async (data) => {
    try {
      await authApi.forgotPassword(data.email);
      setSent(true);
    } catch {
      // Always show success to prevent email enumeration
      setSent(true);
    }
  };

  const inputCls = `w-full h-[48px] rounded-[8px] border px-3.5 text-[14px] placeholder:text-[var(--ja-auth-muted)] transition-colors duration-[110ms] outline-none`;

  if (sent) {
    return (
      <AuthLayout backTo="/login" backLabel="Zurück zum Login">
        <div className="text-center py-2">
          <div className="grid h-12 w-12 place-items-center rounded-xl mx-auto mb-5"
            style={{ background: "rgba(93, 159, 104, 0.10)" }}>
            <Mail className="h-6 w-6 text-[#5d9f68]" />
          </div>
          <h2 className="text-[24px] sm:text-[28px] font-bold tracking-[-0.03em] leading-[1.15]"
            style={{ color: "var(--ja-auth-text, #171717)", transition: t }}>
            Check deine Inbox.
          </h2>
          <p className="mt-3 max-w-[44ch] mx-auto text-[14px]" style={{ color: "var(--ja-auth-secondary, #666)", transition: t }}>
            Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir dir einen Link zum Zurücksetzen
            deines Passworts gesendet.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center h-[44px] px-6 rounded-[8px] text-[13px] font-semibold transition-colors duration-[110ms]"
            style={{
              background: "var(--ja-auth-cta, #e30613)",
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
          Passwort vergessen?
        </h2>
        <p className="mt-2 text-[14px]" style={{ color: "var(--ja-auth-secondary, #666)", transition: t }}>
          Gib deine E-Mail-Adresse ein — wir senden dir einen Link.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <span>Wird gesendet…</span>
            </>
          ) : (
            <span>Link senden</span>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}