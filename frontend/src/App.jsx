import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import CookieConsentBanner from "./components/CookieConsentBanner";
import ErrorBoundary from "./components/ErrorBoundary";
import AppShell from "./components/shell/AppShell";
import UpgradeModal from "./components/UpgradeModal";
import useAuthStore from "./hooks/useAuthStore";
import queryClient from "./queryClient";
import { authApi } from "./services/api";

const loadLandingPage = () => import("./pages/LandingPage");
const loadLoginPage = () => import("./pages/LoginPage");
const loadRegisterPage = () => import("./pages/RegisterPage");
const loadDashboardPage = () => import("./pages/DashboardPage");
const loadCVBuilderPage = () => import("./pages/CVBuilderPage");
const loadResumePage = () => import("./pages/ResumePage");
const loadJobsLayout = () => import("./pages/JobsLayout");
const loadJobsPage = () => import("./pages/JobsPage");
const loadFindenPage = () => import("./pages/FindenPage");
const loadJobDetailPage = () => import("./pages/JobDetailPage");
const loadSettingsPage = () => import("./pages/SettingsPage");
const loadJobAlertsPage = () => import("./pages/JobAlertsPage");
const loadPricingPage = () => import("./pages/PricingPage");
const loadBillingPage = () => import("./pages/BillingPage");
const loadTermsPage = () => import("./pages/TermsPage");
const loadPrivacyPage = () => import("./pages/PrivacyPage");
const loadImpressumPage = () => import("./pages/ImpressumPage");
const loadContactPage = () => import("./pages/ContactPage");
const loadForgotPasswordPage = () => import("./pages/ForgotPasswordPage");
const loadResetPasswordPage = () => import("./pages/ResetPasswordPage");
const loadVerifyEmailPage = () => import("./pages/VerifyEmailPage");
const loadUnsubscribePage = () => import("./pages/UnsubscribePage");
const loadCalendarPage = () => import("./pages/CalendarPage");

const LandingPage = lazy(loadLandingPage);
const LoginPage = lazy(loadLoginPage);
const RegisterPage = lazy(loadRegisterPage);
const DashboardPage = lazy(loadDashboardPage);
const CVBuilderPage = lazy(loadCVBuilderPage);
const ResumePage = lazy(loadResumePage);
const JobsLayout = lazy(loadJobsLayout);
const FindenPage = lazy(loadFindenPage);
const JobDetailPage = lazy(loadJobDetailPage);
const SettingsPage = lazy(loadSettingsPage);
const JobAlertsPage = lazy(loadJobAlertsPage);
const PricingPage = lazy(loadPricingPage);
const BillingPage = lazy(loadBillingPage);
const TermsPage = lazy(loadTermsPage);
const PrivacyPage = lazy(loadPrivacyPage);
const ImpressumPage = lazy(loadImpressumPage);
const ContactPage = lazy(loadContactPage);
const ForgotPasswordPage = lazy(loadForgotPasswordPage);
const ResetPasswordPage = lazy(loadResetPasswordPage);
const VerifyEmailPage = lazy(loadVerifyEmailPage);
const UnsubscribePage = lazy(loadUnsubscribePage);
const CalendarPage = lazy(loadCalendarPage);

const preloaders = [
  loadDashboardPage,
  loadJobsLayout,
  loadJobsPage,
];

/**
 * Route guard that redirects unauthenticated users to /login.
 * @param {object} props
 * @param {React.ReactNode} props.children
 */
function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  if (!isHydrated) return null;
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
      queryClient.clear();
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
        <Route path="/pricing" element={<Suspense fallback={null}><PricingPage /></Suspense>} />
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
              <AppShell />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<Suspense fallback={null}><DashboardPage /></Suspense>} />
          <Route path="/lebenslauf" element={<Suspense fallback={null}><CVBuilderPage /></Suspense>} />
          <Route path="/lebenslauf/analyse" element={<Suspense fallback={null}><ResumePage /></Suspense>} />
          <Route path="/resume" element={<Navigate to="/lebenslauf" replace />} />
          <Route path="/finden" element={<Suspense fallback={null}><FindenPage /></Suspense>} />
          <Route path="/jobs" element={<Suspense fallback={null}><JobsLayout /></Suspense>}>
            <Route path=":jobId" element={<Suspense fallback={null}><JobDetailPage /></Suspense>} />
          </Route>
          <Route path="/job-alerts" element={<Suspense fallback={null}><JobAlertsPage /></Suspense>} />
          <Route path="/kalender" element={<Suspense fallback={null}><CalendarPage /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={null}><SettingsPage /></Suspense>} />
          <Route path="/billing" element={<Suspense fallback={null}><BillingPage /></Suspense>} />
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
    (async () => {
      console.time("[perf] auth/refresh");
      try {
        const res = await authApi.refresh();
        console.timeEnd("[perf] auth/refresh");
        const { access_token } = res.data || {};
        if (access_token && active) setAccessToken(access_token);
      } catch {
        console.timeEnd("[perf] auth/refresh");
        // Silent refresh failed — the interceptor will retry on the next 401.
      }
    })();
    return () => {
      active = false;
    };
  }, [setAccessToken]);

  // Pre-emptive refresh every 30 min so the access token never expires
  // during user actions (saves, status changes, etc.). Prevents the
  // 401 → refresh → retry latency that makes clicks feel slow.
  useEffect(() => {
    const id = setInterval(() => {
      authApi.refresh().then((res) => {
        const { access_token } = res.data || {};
        if (access_token) setAccessToken(access_token);
      }).catch(() => {});
    }, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [setAccessToken]);

  return (
    <>
      <UpgradeModal />
      <AppRoutes />
      <CookieConsentBanner />
    </>
  );
}
