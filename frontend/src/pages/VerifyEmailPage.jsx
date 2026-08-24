import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import AuthLayout from "../components/ui/AuthLayout";
import useAuthStore from "../hooks/useAuthStore";
import { authApi, initApi } from "../services/api";

/** Email-verification landing page — auto-verifies the token from the URL query string. */
export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("loading");
  const setUser = useAuthStore((s) => s.setUser);
  const storedUser = useAuthStore((s) => s.user);
  const sessionToken = useAuthStore((s) => s.token);
  const hasSession = Boolean(sessionToken);

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

        if (storedUser) setUser({ ...storedUser, is_verified: true });

        try {
          const initRes = await initApi.fetch();
          if (initRes.data?.me) setUser(initRes.data.me);
        } catch {
          /* non-blocking */
        }
      })
      .catch(() => setStatus("error"));
  }, [hasSession, setUser, storedUser, token]);

  const t = "var(--ja-auth-transition)";

  return (
    <AuthLayout backTo={hasSession ? "/dashboard" : "/login"} backLabel={hasSession ? "Zum Dashboard" : "Zum Login"}>
      <div className="text-center py-2">
        {status === "loading" && (
          <>
            <div className="grid h-12 w-12 place-items-center rounded-xl mx-auto mb-5"
              style={{ background: "rgba(97, 82, 243, 0.10)" }}>
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--ja-auth-focus, #6152F3)" }} />
            </div>
            <h2 className="text-[24px] font-bold tracking-[-0.03em] leading-[1.15]"
              style={{ color: "var(--ja-auth-text, #171717)", transition: t }}>
              E-Mail wird bestätigt…
            </h2>
            <p className="mt-3 text-[13px]" style={{ color: "var(--ja-auth-secondary, #666)", transition: t }}>
              Einen Moment bitte.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="grid h-12 w-12 place-items-center rounded-xl mx-auto mb-5"
              style={{ background: "rgba(93, 159, 104, 0.10)" }}>
              <CheckCircle2 className="h-6 w-6 text-[#5d9f68]" />
            </div>
            <h2 className="text-[24px] sm:text-[28px] font-bold tracking-[-0.03em] leading-[1.15]"
              style={{ color: "var(--ja-auth-text, #171717)", transition: t }}>
              E-Mail bestätigt.
            </h2>
            <p className="mt-3 text-[14px]" style={{ color: "var(--ja-auth-secondary, #666)", transition: t }}>
              Deine E-Mail-Adresse wurde erfolgreich bestätigt.
            </p>
            <Link
              to={hasSession ? "/dashboard" : "/login"}
              className="mt-6 inline-flex items-center h-[44px] px-6 rounded-[8px] text-[13px] font-semibold transition-colors duration-[110ms]"
              style={{
                background: "var(--ja-auth-cta, #6152F3)",
                color: "var(--ja-auth-cta-text, #fff)",
              }}
            >
              {hasSession ? "Zum Dashboard" : "Zum Login"}
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="grid h-12 w-12 place-items-center rounded-xl mx-auto mb-5"
              style={{ background: "rgba(239, 68, 68, 0.10)" }}>
              <XCircle className="h-6 w-6 text-[#ef4444]" />
            </div>
            <h2 className="text-[24px] font-bold tracking-[-0.03em] leading-[1.15]"
              style={{ color: "var(--ja-auth-text, #171717)", transition: t }}>
              Bestätigung fehlgeschlagen
            </h2>
            <p className="mt-3 max-w-[40ch] mx-auto text-[14px]" style={{ color: "var(--ja-auth-secondary, #666)", transition: t }}>
              Der Link ist ungültig oder abgelaufen. Bitte melde dich an und fordere eine neue
              Bestätigungs-Mail an.
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
          </>
        )}
      </div>
    </AuthLayout>
  );
}