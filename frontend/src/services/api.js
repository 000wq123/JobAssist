import useAuthStore from "../hooks/useAuthStore";
import { clearSwrCache } from "../hooks/useFetch";

export const defaultBaseURL = (() => {
  const url = import.meta.env.VITE_API_URL || (() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      // Production hostnames → same-eTLD API subdomain to avoid 3rd-party cookies
      if (host === "jobassist.tech" || host === "www.jobassist.tech") {
        return "https://api.jobassist.tech/api";
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
// 15 s timeout would kill legitimate requests mid-flight.
const TIMEOUT_DEFAULT_MS = 15000;
const TIMEOUT_AI_MS = 90000;
const AI_PATH_HINTS = [
  "/cover-letter/",
  "/interview/",
  "/resume/",
  "/courses",
  "/research/",
  "/ai/",
];

function pickTimeout(url = "") {
  return AI_PATH_HINTS.some((hint) => url.includes(hint)) ? TIMEOUT_AI_MS : TIMEOUT_DEFAULT_MS;
}

/**
 * Error object shaped like an axios error so call sites that read
 * `err.response?.status` / `err.response?.data` keep working unchanged.
 */
export class ApiError extends Error {
  constructor(message, { status, data, url, config } = {}) {
    super(message);
    this.name = "ApiError";
    if (status != null) this.response = { status, data };
    this.config = config || { url };
  }
}

// Single-flight silent token refresh.
let isRefreshing = false;
let refreshQueue = [];

// In-flight GET dedupe: identical GETs (same method+URL) issued concurrently
// share ONE network request. This is what makes React StrictMode's dev
// double-effects harmless (the second mount rides the first request instead of
// firing a duplicate), and it protects against accidental double-fires in
// production (e.g. two components mounting the same resource at once).
// Mutations are never deduped — two identical POSTs are legitimately distinct.
/** @type {Map<string, Promise<any>>} */
const inflightGets = new Map();

function getRequestKey(method, fullUrl, body) {
  if (method !== "GET") return null;
  const bodyKey = body == null ? "" : JSON.stringify(body);
  return `${method}:${fullUrl}:${bodyKey}`;
}

function processQueue(error, token = null) {
  refreshQueue.forEach((cb) => (error ? cb.reject(error) : cb.resolve(token)));
  refreshQueue = [];
}

function broadcastUnauthenticated() {
  try {
    sessionStorage.removeItem("ja:access_token");
    // Drop the cached bootstrap payload + SWR rows too, so a later boot can
    // never re-flash another (or this) user's saved jobs/CVs after logout.
    sessionStorage.removeItem("ja:init_cache");
  } catch {
    /* ignore */
  }
  clearSwrCache();
  inflightGets.clear();
  // Custom event so the navigation handler stays in React-Router land.
  window.dispatchEvent(new CustomEvent("auth:unauthenticated"));
}

async function rawRequest(method, url, body, config = {}) {
  const { params, headers = {}, signal: externalSignal, timeout, _retried, responseType, priority } = config;

  let fullUrl = url.startsWith("http") ? url : `${defaultBaseURL}${url}`;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) fullUrl += (fullUrl.includes("?") ? "&" : "?") + qs;
  }

  const token = useAuthStore.getState().token;
  const finalHeaders = { "Content-Type": "application/json", ...headers };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  let fetchBody;
  if (body === undefined || body === null) {
    fetchBody = undefined;
  } else if (typeof FormData !== "undefined" && body instanceof FormData) {
    // Let the browser set the multipart boundary.
    delete finalHeaders["Content-Type"];
    fetchBody = body;
  } else {
    fetchBody = JSON.stringify(body);
  }

  const effectiveTimeout = timeout ?? pickTimeout(url);
  const controller = new AbortController();
  let timer;
  if (effectiveTimeout) {
    timer = setTimeout(() => controller.abort(), effectiveTimeout);
  }
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", onExternalAbort);
  }

  try {
    const res = await fetch(fullUrl, {
      method,
      headers: finalHeaders,
      body: fetchBody,
      credentials: "include",
      signal: controller.signal,
      priority,
    });

    let data = null;
    if (res.ok && responseType === "blob") {
      data = await res.blob();
    } else {
      const text = await res.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }
    }

    if (!res.ok) {
      const detail = data?.detail;
      const message =
        typeof detail === "string" ? detail : detail?.message || `Request failed (${res.status})`;
      throw new ApiError(message, {
        status: res.status,
        data,
        url,
        config: { url, method, _retried },
      });
    }

    return { data, status: res.status, headers: res.headers, config: { url, method } };
  } finally {
    if (timer) clearTimeout(timer);
    if (externalSignal) externalSignal.removeEventListener("abort", onExternalAbort);
  }
}

async function request(method, url, body, config = {}) {
  // GET dedupe — see `inflightGets`. The raw URL is resolved up front so the
  // key is stable across callers of the same endpoint.
  let fullUrlForDedupe = null;
  if (method === "GET") {
    fullUrlForDedupe = url.startsWith("http") ? url : `${defaultBaseURL}${url}`;
    if (config.params) {
      const qs = new URLSearchParams(config.params).toString();
      if (qs) fullUrlForDedupe += (fullUrlForDedupe.includes("?") ? "&" : "?") + qs;
    }
    const key = getRequestKey(method, fullUrlForDedupe, body);
    if (key && inflightGets.has(key)) {
      return inflightGets.get(key);
    }
    if (key) {
      const promise = doRequest(method, url, body, config).finally(() => inflightGets.delete(key));
      inflightGets.set(key, promise);
      return promise;
    }
  }
  return doRequest(method, url, body, config);
}

async function doRequest(method, url, body, config = {}) {
  try {
    return await rawRequest(method, url, body, config);
  } catch (err) {
    const status = err?.response?.status;
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh");

    // 401 → one silent refresh, then retry the original request once.
    if (status === 401 && !isAuthEndpoint && !config._retried) {
      if (isRefreshing) {
        await new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        });
        return rawRequest(method, url, body, { ...config, _retried: true });
      }

      isRefreshing = true;
      try {
        // No body — the refresh token rides on the httpOnly cookie.
        const res = await rawRequest("POST", "/auth/refresh", {}, {});
        const access_token = res.data?.access_token;
        if (!access_token) throw new Error("Refresh response missing access_token");
        useAuthStore.getState().setAccessToken(access_token);
        processQueue(null, access_token);
        try {
          return await rawRequest(method, url, body, { ...config, _retried: true });
        } catch (retryErr) {
          // Refresh succeeded but the retried request still 401s — the user row
          // no longer exists in the DB (e.g. after a DB swap/restore). The token
          // is validly signed but get_current_user rejects it, so the app would
          // otherwise loop on 401 forever while looking logged-in. Log out.
          if (retryErr?.response?.status === 401) {
            processQueue(retryErr, null);
            broadcastUnauthenticated();
          }
          throw retryErr;
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        broadcastUnauthenticated();
        throw refreshErr;
      } finally {
        isRefreshing = false;
      }
    }

    // Rate-limit signals (slowapi 429). JobAssist is free — there is no
    // usage-limit/upgrade signal anymore; only genuine rate limiting remains.
    if (status === 403 && err?.response?.data?.detail?.error === "job_cap_reached") {
      const detail = err.response.data.detail;
      window.dispatchEvent(new CustomEvent("rate-limited", { detail: { message: detail.message } }));
    }
    if (status === 429) {
      const detail = err?.response?.data?.detail || err?.response?.data?.error;
      const message = typeof detail === "string" ? detail : "Zu viele Anfragen. Bitte warte kurz.";
      window.dispatchEvent(new CustomEvent("rate-limited", { detail: { message } }));
    }

    throw err;
  }
}

const api = {
  get: (url, config) => request("GET", url, undefined, config),
  post: (url, body, config) => request("POST", url, body, config),
  patch: (url, body, config) => request("PATCH", url, body, config),
  put: (url, body, config) => request("PUT", url, body, config),
  delete: (url, config) => request("DELETE", url, undefined, config),
};

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
  getResponseBaselines: () => api.get("/jobs/response-baselines"),
  searchRecommended: (page = 1) => api.get(`/jobs/search/recommended?page=${page}`),
  searchCustom: (keywords, location = "", jobType = "", page = 1) => {
    const params = new URLSearchParams({ keywords, location, job_type: jobType, page });
    return api.get(`/jobs/search/custom?${params.toString()}`);
  },
  searchJooble: (keywords, location = "", page = 1) => {
    const params = new URLSearchParams({ keywords, location, page });
    return api.get(`/jobs/search/jooble?${params.toString()}`);
  },
  searchKarriere: (keywords, location = "", page = 1) => {
    const params = new URLSearchParams({ keywords, location, page });
    return api.get(`/jobs/search/karriere?${params.toString()}`);
  },
  searchWillhaben: (keywords, location = "", page = 1) => {
    const params = new URLSearchParams({ keywords, location, page });
    return api.get(`/jobs/search/willhaben?${params.toString()}`);
  },
  searchAms: (keywords, location = "", page = 1) => {
    const params = new URLSearchParams({ keywords, location, page });
    return api.get(`/jobs/search/ams?${params.toString()}`);
  },
};

// --- Company logos ---
// Logo requests need the same bearer token as every other API call. Fetching
// this URL directly from an <img> cannot attach that header, so callers load
// the binary response here and render it through a local object URL.
export const logoApi = {
  best: (company, url = "", priority = "auto") => api.get("/proxy/logo/best", {
    params: { company, url },
    responseType: "blob",
    timeout: 8_000,
    priority,
  }),
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
// Billing is disabled by default (ENABLE_BILLING env toggle).
// Stubbed with no-ops so existing imports don't break.
export const billingApi = {
  overview: () => Promise.resolve({ data: { plan: "max", usage: [] } }),
  plans: () => Promise.resolve({ data: [] }),
  createCheckout: () => Promise.reject(new Error("Billing is disabled")),
  createPortal: () => Promise.reject(new Error("Billing is disabled")),
};

// --- Profile / CV Builder ---
export const profileApi = {
  get: () => api.get("/profile/me"),
  patch: (data) => {
    const payload = { ...data, foto_url: data?.foto ?? data?.foto_url ?? null };
    delete payload.foto;
    return api.patch("/profile/me", payload);
  },
  generateCv: () => api.post("/profile/cv/generate"),
  // Saved-CV library sync — server-side mirror of `cv_library_v1` so saved
  // CVs follow the user across devices (pull on boot, push on every edit).
  getCvLibrary: () => api.get("/profile/cv-library"),
  putCvLibrary: (entries) => api.put("/profile/cv-library", { entries }),
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

// --- KV Wages (Lohnrechner) ---
export const kvWageApi = {
  list: (year = 2025) => api.get(`/kv-wages?year=${year}`),
  get: (category, year = 2025) => api.get(`/kv-wages/${category}?year=${year}`),
};

export default api;
