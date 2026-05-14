import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import OnboardingTutorial from "./components/OnboardingTutorial";

import CookieConsentBanner from "./components/CookieConsentBanner";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/layout/Layout";
import UpgradeModal from "./components/UpgradeModal";
import useAuthStore from "./hooks/useAuthStore";
import queryClient from "./queryClient";

const loadLandingPage = () => import("./pages/LandingPage");
const loadLoginPage = () => import("./pages/LoginPage");
const loadRegisterPage = () => import("./pages/RegisterPage");
const loadDashboardPage = () => import("./pages/DashboardPage");
const loadResumePage = () => import("./pages/ResumePage");
const loadJobsPage = () => import("./pages/JobsPage");
const loadJobDetailPage = () => import("./pages/JobDetailPage");
const loadSettingsPage = () => import("./pages/SettingsPage");
const loadAIAssistantPage = () => import("./pages/AIAssistantPage");
const loadJobAlertsPage = () => import("./pages/JobAlertsPage");
const loadCoverLetterPage = () => import("./pages/CoverLetterPage");
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

const LandingPage = lazy(loadLandingPage);
const LoginPage = lazy(loadLoginPage);
const RegisterPage = lazy(loadRegisterPage);
const DashboardPage = lazy(loadDashboardPage);
const ResumePage = lazy(loadResumePage);
const JobsPage = lazy(loadJobsPage);
const JobDetailPage = lazy(loadJobDetailPage);
const SettingsPage = lazy(loadSettingsPage);
const AIAssistantPage = lazy(loadAIAssistantPage);
const JobAlertsPage = lazy(loadJobAlertsPage);
const CoverLetterPage = lazy(loadCoverLetterPage);
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

const preloaders = [
  loadDashboardPage,
  loadJobsPage,
  loadResumePage,
  loadJobAlertsPage,
  loadSettingsPage,
  loadBillingPage,
  loadAIAssistantPage,
];

/**
 * Route guard that redirects unauthenticated users to /login.
 * @param {object} props
 * @param {React.ReactNode} props.children
 */
function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token);
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
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/resume" element={<ResumePage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/:jobId" element={<Suspense fallback={null}><JobDetailPage /></Suspense>} />
          <Route path="/ai-assistant" element={<AIAssistantPage />} />
          <Route path="/cover-letter" element={<CoverLetterPage />} />
          <Route path="/job-alerts" element={<JobAlertsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/billing" element={<BillingPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

/** Root application component — sets up QueryClient, Router, and global providers. */
export default function App() {
  useEffect(() => {
    const warm = () => preloaders.forEach((load) => load().catch(() => {}));

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(warm, { timeout: 0 });
      return () => window.cancelIdleCallback(id);
    }

    const timer = window.setTimeout(warm, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <UpgradeModal />
      <OnboardingTutorial />
      <AppRoutes />
      <CookieConsentBanner />
    </>
  );
}
