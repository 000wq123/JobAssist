import axios from "axios";
import queryClient from "../queryClient";
import { STORAGE_KEYS, removeKey } from "../storageKeys";

export const defaultBaseURL = (() => {
  const url = import.meta.env.VITE_API_URL || (() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      // Production hostnames → Railway backend
      if (host === "jobassist.tech" || host === "www.jobassist.tech") {
        return "https://jobassist-backend-production-9e7e.up.railway.app/api";
      }
      // localhost / 127.0.0.1 → local dev backend
      if (host === "localhost" || host === "127.0.0.1") {
        return "http://localhost:8000/api";
      }
    }
    return "/api";
  })();
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log("🔌 API URL:", url);
  }
  return url;
})();

// Default timeouts per endpoint. AI endpoints can take 30+ s, so the default
// 10 s timeout was killing legitimate requests mid-flight.
const TIMEOUT_DEFAULT_MS = 15000;
const TIMEOUT_AI_MS = 90000;
const AI_PATH_HINTS = [
  "/cover-letter/",
  "/interview/",
  "/resume/", // upload + analyze can be slow
  "/jobs/match",
  "/match",
  "/courses",
  "/research/",
  "/ai/",
];

function pickTimeout(url = "") {
  return AI_PATH_HINTS.some((hint) => url.includes(hint)) ? TIMEOUT_AI_MS : TIMEOUT_DEFAULT_MS;
}

const api = axios.create({
  baseURL: defaultBaseURL,
  headers: { "Content-Type": "application/json" },
  timeout: TIMEOUT_DEFAULT_MS,
  // Required so the browser sends the httpOnly refresh-token cookie
  // on /auth/refresh and accepts Set-Cookie on /auth/login.
  withCredentials: true,
});

const USAGE_FEATURES = [
  { match: "/resume/analyze", feature: "cv_analysis" },
  { match: "/cover-letter/generate", feature: "cover_letter" },
  { match: "/interview/generate", feature: "ai_chat" },
  { match: "/interview/rate",     feature: "ai_chat" },
  { match: "/jobs/match", feature: "cv_analysis" },
  { match: "/research/", feature: "ai_chat" },
  { match: "/jobs/search/recommended", feature: "job_search" },
  { match: "/jobs/search/custom", feature: "job_search" },
];

function updateUsageList(usage = [], feature, delta = 1) {
  return usage.map((item) => {
    if (item.feature !== feature) return item;
    const nextUsed = (item.used || 0) + delta;
    return {
      ...item,
      used: nextUsed,
      remaining: item.limit === -1 ? -1 : Math.max(0, (item.limit || 0) - nextUsed),
    };
  });
}

function syncLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function bumpUsageCaches(feature) {
  if (!feature) return;

  queryClient.setQueryData(["billing-overview"], (old) => {
    if (!old?.usage) return old;
    const next = { ...old, usage: updateUsageList(old.usage, feature, 1) };
    syncLocalStorage("billing", next);
    return next;
  });

  queryClient.setQueryData(["init"], (old) => {
    if (!old?.usage) return old;
    const next = { ...old, usage: updateUsageList(old.usage, feature, 1) };
    syncLocalStorage("init", next);
    return next;
  });
}

// Attach the in-memory access token + a per-route timeout to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Honour an explicit `timeout` set at the call site, otherwise pick by URL.
  if (config.timeout == null || config.timeout === TIMEOUT_DEFAULT_MS) {
    config.timeout = pickTimeout(config.url || "");
  }
  return config;
});

// Silent token refresh state
let isRefreshing = false;
let refreshQueue = []; // callbacks waiting for new token

function processQueue(error, token = null) {
  refreshQueue.forEach((cb) => (error ? cb.reject(error) : cb.resolve(token)));
  refreshQueue = [];
}

/** Tell the rest of the app the session is gone — handled in `App.jsx`. */
function broadcastUnauthenticated() {
  removeKey(STORAGE_KEYS.ACCESS_TOKEN);
  removeKey(STORAGE_KEYS.REFRESH_TOKEN);
  // Custom event so the navigation handler stays in React-Router land —
  // never use `window.location.href` (which kills the SPA cache + bundle).
  window.dispatchEvent(new CustomEvent("auth:unauthenticated"));
}

// Handle 401 globally — attempt silent refresh before giving up.
// The refresh endpoint reads the httpOnly cookie set at login, so this
// works even though JavaScript can no longer see the refresh token.
api.interceptors.response.use(
  (res) => {
    // Keep monthly usage counters in sync immediately, then refetch in background.
    const url = res.config?.url || "";
    const usageFeature = USAGE_FEATURES.find((entry) => url.includes(entry.match))?.feature;
    if (usageFeature) {
      bumpUsageCaches(usageFeature);
      queryClient.invalidateQueries({ queryKey: ["billing-overview"] });
      queryClient.invalidateQueries({ queryKey: ["init"] });
    }
    return res;
  },
  async (err) => {
    // Usage limit hit — trigger upgrade modal
    if (err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") {
      queryClient.invalidateQueries({ queryKey: ["billing-overview"] });
      queryClient.invalidateQueries({ queryKey: ["init"] });
      const event = new CustomEvent("usage-limit", { detail: err.response.data.detail });
      window.dispatchEvent(event);
      return Promise.reject(err);
    }

    // Job-cap (per-user 500 max) → surfaced via the same upgrade-modal pattern
    if (err.response?.status === 403 && err.response?.data?.detail?.error === "job_cap_reached") {
      const detail = err.response.data.detail;
      window.dispatchEvent(new CustomEvent("rate-limited", { detail: { message: detail.message } }));
      return Promise.reject(err);
    }

    // Rate limit hit (slowapi / job alert cooldown)
    if (err.response?.status === 429) {
      const detail = err.response?.data?.detail || err.response?.data?.error;
      const message = typeof detail === "string" ? detail : "Zu viele Anfragen. Bitte warte kurz.";
      const event = new CustomEvent("rate-limited", { detail: { message } });
      window.dispatchEvent(event);
      return Promise.reject(err);
    }

    const url = err.config?.url || "";
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh");

    if (err.response?.status === 401 && !isAuthEndpoint && !err.config._retried) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          err.config.headers.Authorization = `Bearer ${token}`;
          err.config._retried = true;
          return api(err.config);
        });
      }

      isRefreshing = true;
      err.config._retried = true;

      try {
        // No body — refresh token rides on the httpOnly cookie. Legacy clients
        // can still send `{ refresh_token: ... }`; the backend prefers the cookie.
        const res = await api.post("/auth/refresh", {});
        const { access_token } = res.data;
        if (!access_token) throw new Error("Refresh response missing access_token");

        try {
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
        } catch {}
        // Invalidate cached queries so they re-fetch with the fresh token.
        queryClient.invalidateQueries();

        processQueue(null, access_token);
        err.config.headers.Authorization = `Bearer ${access_token}`;
        return api(err.config);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        broadcastUnauthenticated();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

// --- Auth ---
// Refresh / logout rely on the httpOnly cookie — no body required.
export const authApi = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
  refresh: () => api.post("/auth/refresh", {}),
  logout: () => api.post("/auth/logout", {}),
  verifyEmail: (token) => api.post("/auth/verify-email", { token }),
  resendVerification: () => api.post("/auth/resend-verification"),
  resendVerificationPublic: (email) => api.post("/auth/resend-verification-public", { email }),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token, new_password) => api.post("/auth/reset-password", { token, new_password }),
  deleteAccount: (password) => api.post("/auth/delete-account", { password }),
};

// --- Resumes ---
export const resumeApi = {
  upload: (formData) =>
    api.post("/resume/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  list: () => api.get("/resume/"),
  get: (id) => api.get(`/resume/${id}`),
  delete: (id) => api.delete(`/resume/${id}`),
  analyze: (id) => api.post(`/resume/${id}/analyze`),
};

// --- Jobs ---
// NOTE: Only root routes ("/jobs/") use trailing slashes.
// All other routes must NOT have trailing slashes — a trailing slash causes a
// 307 redirect which strips the Authorization header, resulting in 401.
export const jobApi = {
  create: (data) => api.post("/jobs/", data),
  list: (page = 1, pageSize = 100) => api.get(`/jobs/?page=${page}&page_size=${pageSize}`),
  get: (id) => api.get(`/jobs/${id}`),
  delete: (id) => api.delete(`/jobs/${id}`),
  match: (jobId, resumeId) => api.post(`/jobs/${jobId}/match`, { resume_id: resumeId }),
  generateMatch: (jobId, resumeId) => api.post(`/jobs/${jobId}/match`, { resume_id: resumeId }),
  generateCoverLetter: (jobId, resumeId, tone = "professional") =>
    api.post("/cover-letter/generate", { job_id: jobId, resume_id: resumeId, tone }),
  generateInterviewPrep: (jobId, resumeId, numQuestions = 10) =>
    api.post("/interview/generate", { job_id: jobId, resume_id: resumeId, num_questions: numQuestions }),
  updateStatus: (jobId, status) => api.patch(`/jobs/${jobId}/status`, { status }),
  updateNotes: (jobId, notes) => api.patch(`/jobs/${jobId}/notes`, { notes }),
  updateDeadline: (jobId, deadline) => api.patch(`/jobs/${jobId}/deadline`, { deadline }),
  updateUrl: (jobId, url) => api.patch(`/jobs/${jobId}/url`, { url }),
  saveResearch: (jobId, researchData) => api.patch(`/jobs/${jobId}/research`, { research_data: JSON.stringify(researchData) }),
  getPipelineStats: () => api.get("/jobs/pipeline/stats"),
  searchRecommended: (page = 1) => api.get(`/jobs/search/recommended?page=${page}`),
  searchCustom: (keywords, location = "", jobType = "", page = 1) => {
    const params = new URLSearchParams({ keywords, location, job_type: jobType, page });
    return api.get(`/jobs/search/custom?${params.toString()}`);
  },
};

// --- Cover Letter ---
export const coverLetterApi = {
  generate: (jobId, resumeId, tone = "professional") =>
    api.post("/cover-letter/generate", { job_id: jobId, resume_id: resumeId, tone }),
};

// --- Interview Prep ---
export const interviewApi = {
  generate: (jobId, resumeId, numQuestions = 10) =>
    api.post("/interview/generate", {
      job_id: jobId,
      resume_id: resumeId,
      num_questions: numQuestions,
    }),
  rateAnswer: (question, userAnswer, suggestedAnswer) =>
    api.post("/interview/rate", {
      question,
      user_answer: userAnswer,
      suggested_answer: suggestedAnswer,
    }),
};

// --- Job Alerts ---
export const jobAlertsApi = {
  list: () => api.get("/job-alerts/"),
  create: (data) => api.post("/job-alerts/", data),
  update: (id, data) => api.patch(`/job-alerts/${id}`, data),
  delete: (id) => api.delete(`/job-alerts/${id}`),
  runNow: (id) => api.post(`/job-alerts/${id}/run`),
  unsubscribe: (token) => api.post("/job-alerts/unsubscribe", { token }),
};

// --- Courses ---
export const coursesApi = {
  generate: (jobId, resumeId) =>
    api.post(`/jobs/${jobId}/courses`, { resume_id: resumeId ?? null }),
};

// --- Research ---
export const researchApi = {
  research: (companyName, jobDescription = "") =>
    api.post("/research/", { company_name: companyName, job_description: jobDescription }),
};

// --- Init (bootstrap all data in one request) ---
export const initApi = {
  fetch: () => api.get("/init"),
};

// --- Billing ---
export const billingApi = {
  overview: () => api.get("/billing/overview"),
  plans: () => api.get("/billing/plans"),
  createCheckout: (plan) => api.post("/billing/create-checkout-session", { plan }),
  createPortal: () => api.post("/billing/create-portal-session"),
};

// --- AI Text Polish ---
export const aiApi = {
  polish: (text, context = "") => api.post("/ai/polish", { text, context }),
};

// --- Contact ---
export const contactApi = {
  send: (data) => api.post("/contact/send", data),
};

// --- Settings ---
export const settingsApi = {
  getProfile: () => api.get("/settings/profile"),
  updateProfile: (data, config) => api.put("/settings/profile", data, config),
  getPreferences: () => api.get("/settings/preferences"),
  updatePreferences: (data, config) => api.put("/settings/preferences", data, config),
};


export default api;
