import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle, ArrowRight } from "lucide-react";

import AuthLayout from "../components/ui/AuthLayout";
import useAuthStore from "../hooks/useAuthStore";
import queryClient from "../queryClient";
import { authApi, initApi } from "../services/api";
import { STORAGE_KEYS } from "../storageKeys";

/** Email-verification landing page — auto-verifies the token from the URL query string. */
export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("loading");
  const setUser = useAuthStore((s) => s.setUser);
  const storedUser = useAuthStore((s) => s.user);
  const hasSession = Boolean(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN));

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    authApi
      .verifyEmail(token)
      .then(async () => {
        setStatus("success");
        if (!hasSession) return;

        const optimisticUser = storedUser ? { ...storedUser, is_verified: true } : null;
        if (optimisticUser) {
          setUser(optimisticUser);
          queryClient.setQueryData(["init"], (old) =>
            old ? { ...old, me: { ...old.me, is_verified: true } } : old
          );
          try {
            const raw = localStorage.getItem("init");
            if (raw) {
              const parsed = JSON.parse(raw);
              localStorage.setItem(
                "init",
                JSON.stringify({ ...parsed, me: { ...parsed?.me, is_verified: true } })
              );
            }
          } catch {}
        }

        try {
          await queryClient.invalidateQueries({ queryKey: ["init"] });
          const initRes = await initApi.fetch();
          try {
            localStorage.setItem("init", JSON.stringify(initRes.data));
          } catch {}
          queryClient.setQueryData(["init"], initRes.data);
          if (initRes.data?.me) setUser(initRes.data.me);
        } catch {}
      })
      .catch(() => setStatus("error"));
  }, [hasSession, setUser, storedUser, token]);

  return (
    <AuthLayout backTo={hasSession ? "/dashboard" : "/login"} backLabel={hasSession ? "Zum Dashboard" : "Zum Login"}>
      <div className="text-center py-4">
        {status === "loading" && (
          <>
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-accent-500)]/10 mx-auto mb-5">
              <Loader2 className="h-7 w-7 text-[var(--color-accent-300)] animate-spin" />
            </div>
            <h1 className="text-[24px] font-semibold tracking-tight text-[var(--color-fg)]">
              E-Mail wird{" "}
              <span className="font-display italic text-[var(--color-accent-300)]">bestätigt</span>…
            </h1>
            <p className="mt-3 text-[13px] text-[var(--color-fg-muted)]">
              Einen Moment bitte.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-success-soft)] mx-auto mb-5">
              <CheckCircle2 className="h-7 w-7 text-[var(--color-success)]" />
            </div>
            <h1 className="text-[26px] sm:text-[32px] font-semibold tracking-tight leading-[1.15] text-[var(--color-fg)]">
              E-Mail{" "}
              <span className="font-display italic text-[var(--color-accent-300)]">bestätigt</span>.
            </h1>
            <p className="mt-3 text-[14px] text-[var(--color-fg-muted)]">
              Deine E-Mail-Adresse wurde erfolgreich bestätigt.
            </p>
            <Link
              to={hasSession ? "/dashboard" : "/login"}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent-500)] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[var(--color-accent-400)] transition-colors"
            >
              {hasSession ? "Zum Dashboard" : "Zum Login"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-error-soft)] mx-auto mb-5">
              <XCircle className="h-7 w-7 text-[var(--color-error)]" />
            </div>
            <h1 className="text-[26px] font-semibold tracking-tight text-[var(--color-fg)]">
              Bestätigung fehlgeschlagen
            </h1>
            <p className="mt-3 max-w-[40ch] mx-auto text-[14px] text-[var(--color-fg-muted)]">
              Der Link ist ungültig oder abgelaufen. Bitte melde dich an und fordere eine neue
              Bestätigungs-Mail an.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent-500)] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[var(--color-accent-400)] transition-colors"
            >
              Zum Login
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
