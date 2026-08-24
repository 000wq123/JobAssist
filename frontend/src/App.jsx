import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import CookieConsentBanner from "./components/CookieConsentBanner";
import ErrorBoundary from "./components/ErrorBoundary";
import AppShell from "./components/shell/AppShell";
import UpgradeModal from "./components/UpgradeModal";
import useAuthStore from "./hooks/useAuthStore";
import { BootstrapProvider } from "./context/BootstrapContext";
import { authApi } from "./services/api";

const loadLandingPage = () => import("./pages/LandingPage");
const loadLoginPage = () => import("./pages/LoginPage");
const loadRegisterPage = () => import("./pages/RegisterPage");
const loadDashboardPage = () => import("./pages/DashboardPage");
const loadCVBuilderPage = () => import("./pages/CVBuilderPage");
const loadResumePage = () => import("./pages/ResumePage");
const loadJobsLayout = () => import("./pages/JobsLayout");
const loadJobDetailPage = () => import("./pages/JobDetailPage");
const loadSettingsPage = () => import("./pages/SettingsPage");
const loadJobAlertsPage = () => import("./pages/JobAlertsPage");
// PricingPage / BillingPage removed — JobAssist is now free & open-source
// Routes kept as dead imports for potential future re-enable via ENABLE_BILLING
const loadTermsPage = () => import("./pages/TermsPage");
const loadPrivacyPage = () => import("./pages/PrivacyPage");
const loadImpressumPage = () => import("./pages/ImpressumPage");
const loadContactPage = () => import("./pages/ContactPage");
const loadForgotPasswordPage = () => import("./pages/ForgotPasswordPage");
const loadResetPasswordPage = () => import("./pages/ResetPasswordPage");
const loadVerifyEmailPage = () => import("./pages/VerifyEmailPage");
const loadUnsubscribePage = () => import("./pages/UnsubscribePage");

const LandingPage = lazy(loadLandingPage);
const LoginPage = lazy(loadLoginPage);
const RegisterPage = lazy(loadRegisterPage);
const DashboardPage = lazy(loadDashboardPage);
const CVBuilderPage = lazy(loadCVBuilderPage);
const ResumePage = lazy(loadResumePage);
const JobsLayout = lazy(loadJobsLayout);
const JobDetailPage = lazy(loadJobDetailPage);
const SettingsPage = lazy(loadSettingsPage);
const JobAlertsPage = lazy(loadJobAlertsPage);

const TermsPage = lazy(loadTermsPage);
const PrivacyPage = lazy(loadPrivacyPage);
const ImpressumPage = lazy(loadImpressumPage);
const ContactPage = lazy(loadContactPage);
const ForgotPasswordPage = lazy(loadForgotPasswordPage);
const ResetPasswordPage = lazy(loadResetPasswordPage);
const VerifyEmailPage = lazy(loadVerifyEmailPage);
const UnsubscribePage = lazy(loadUnsubscribePage);

const preloaders = [
  loadDashboardPage,
  loadJobsLayout,
];

/**
 * Route guard that redirects unauthenticated users to /login.
 * @param {object} props
 * @param {React.ReactNode} props.children
 */
function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isBooting = useAuthStore((s) => s.isBooting);
  if (!isHydrated || (isBooting && !token)) return null;
  return token ? children : <Navigate to="/login" replace />;
}

/**
 * Listens for `auth:unauthenticated` events dispatched by `services/api.js`
 * after a refresh-token failure and performs a SPA navigation to /login.
 * Replaces the previous `window.location.href = "/login"` (which dropped
 * the JS bundle, lazy-route caches, and react-query state).
 */
function useUnauthenticatedRedirect() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  useEffect(() => {
    const handler = () => {
      logout();
      navigate("/login", { replace: true });
    };
    window.addEventListener("auth:unauthenticated", handler);
    return () => window.removeEventListener("auth:unauthenticated", handler);
  }, [navigate, logout]);
}

/** Declarative route tree wrapped in a per-route ErrorBoundary. */
function AppRoutes() {
  const location = useLocation();
  useUnauthenticatedRedirect();
  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Routes>
        <Route path="/" element={<Suspense fallback={null}><LandingPage /></Suspense>} />
        <Route path="/login" element={<Suspense fallback={null}><LoginPage /></Suspense>} />
        <Route path="/register" element={<Suspense fallback={null}><RegisterPage /></Suspense>} />
        
        <Route path="/terms" element={<Suspense fallback={null}><TermsPage /></Suspense>} />
        <Route path="/privacy" element={<Suspense fallback={null}><PrivacyPage /></Suspense>} />
        <Route path="/impressum" element={<Suspense fallback={null}><ImpressumPage /></Suspense>} />
        <Route path="/contact" element={<Suspense fallback={null}><ContactPage /></Suspense>} />
        <Route path="/forgot-password" element={<Suspense fallback={null}><ForgotPasswordPage /></Suspense>} />
        <Route path="/reset-password" element={<Suspense fallback={null}><ResetPasswordPage /></Suspense>} />
        <Route path="/verify-email" element={<Suspense fallback={null}><VerifyEmailPage /></Suspense>} />
        <Route path="/unsubscribe" element={<Suspense fallback={null}><UnsubscribePage /></Suspense>} />

        <Route
          element={
            <PrivateRoute>
              <BootstrapProvider>
                <AppShell />
              </BootstrapProvider>
            </PrivateRoute>
          }
        >
        <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/lebenslauf" element={<CVBuilderPage />} />
          <Route path="/lebenslauf/analyse" element={<ResumePage />} />
          <Route path="/resume" element={<Navigate to="/lebenslauf" replace />} />
          <Route path="/finden" element={<Navigate to="/jobs?tab=finden" replace />} />
          <Route path="/jobs" element={<JobsLayout />}>
            <Route path=":jobId" element={<JobDetailPage />} />
          </Route>
          <Route path="/job-alerts" element={<JobAlertsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

/** Root application component — sets up QueryClient, Router, and global providers. */
export default function App() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  useEffect(() => {
    const warm = () => preloaders.forEach((load) => load().catch(() => {}));

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(warm, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }

    const timer = window.setTimeout(warm, 3000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const finishBoot = () => {
      if (active) useAuthStore.getState().setBooting(false);
    };
    (async () => {
      try {
        const res = await authApi.refresh();
        const { access_token } = res.data || {};
        if (access_token && active) setAccessToken(access_token);
      } catch {
        // Silent refresh failed — the interceptor will retry on the next 401.
      } finally {
        finishBoot();
      }
    })();
    return () => {
      active = false;
    };
  }, [setAccessToken]);

  // Pre-emptive refresh every 30 min so the access token never expires
  // during user actions (saves, status changes, etc.). Prevents the
  // 401 → refresh → retry latency that makes clicks feel slow.
  // Only runs when the user is actually logged in.
  const token = useAuthStore((s) => s.token);
  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      authApi.refresh().then((res) => {
        const { access_token } = res.data || {};
        if (access_token) setAccessToken(access_token);
      }).catch(() => {});
    }, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [setAccessToken, token]);

  return (
    <>
      <UpgradeModal />
      <AppRoutes />
      <CookieConsentBanner />
    </>
  );
}
