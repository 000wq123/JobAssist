import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

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
    <AuthLayout>
      <div className="text-center py-8">
        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 text-brand-400 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-100">E-Mail wird bestätigt...</h2>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">E-Mail bestätigt</h2>
            <p className="text-sm text-slate-400 mb-4">
              Deine E-Mail-Adresse wurde erfolgreich bestätigt.
            </p>
            <Link to={hasSession ? "/dashboard" : "/login"} className="btn-primary inline-block">
              {hasSession ? "Zum Dashboard" : "Zum Login"}
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-7 h-7 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Bestätigung fehlgeschlagen</h2>
            <p className="text-sm text-slate-400 mb-4">Der Link ist ungültig oder abgelaufen.</p>
            <Link to="/login" className="btn-primary inline-block">
              Zum Login
            </Link>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
