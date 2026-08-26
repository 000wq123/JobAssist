/**
 * WebMCP tools exposing the user's JobAssist workspace to a connected
 * MCP client (e.g. an AI agent in the browser).
 *
 * Design rules:
 * - Read-only: every tool is marked `annotations.readOnlyHint`.
 * - Auth reuses the existing api.js client (same cookies, same silent
 *   refresh) — zero parallel auth logic.
 * - Handlers return structured results and never throw raw API errors:
 *   callers get `{ ok: true, data }` or `{ ok: false, error }`.
 */
import { jobApi, initApi } from "../../services/api";

/** Wrap a promise into a structured result; normalize ApiError/other throws. */
async function guarded(fn) {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    const status = err?.response?.status;
    let code = "unknown_error";
    if (status === 401 || status === 403) code = "unauthenticated";
    else if (status === 404) code = "not_found";
    else if (status === 429) code = "rate_limited";
    else if (err instanceof TypeError) code = "network_error";
    return {
      ok: false,
      error: {
        code,
        status: status ?? null,
        message: err?.message || String(err),
      },
    };
  }
}

/** Shape a single backend job row into a compact, agent-friendly object. */
function shapeJob(j) {
  return {
    id: j.id,
    role: j.role ?? j.title ?? null,
    company: j.company ?? null,
    status: j.status ?? null,
    url: j.url ?? null,
    deadline: j.deadline ?? null,
    created_at: j.created_at ?? null,
    updated_at: j.updated_at ?? null,
  };
}

/**
 * get_workspace_context
 * Overview of the signed-in user's workspace: profile summary, resume list,
 * application counts by status. Mirrors what the dashboard shows.
 */
export async function getWorkspaceContext() {
  return guarded(async () => {
    const [initRes, jobsRes] = await Promise.all([initApi.fetch(), jobApi.list()]);
    const init = initRes.data ?? {};
    const jobsRaw = jobsRes.data?.items ?? jobsRes.data ?? [];
    const jobs = Array.isArray(jobsRaw) ? jobsRaw : [];

    return {
      user: {
        name: init.me?.full_name ?? null,
        email: init.me?.email ?? null,
        plan: init.plan ?? null,
      },
      resumes: (init.resumes ?? []).map((r) => ({
        id: r.id,
        filename: r.filename ?? null,
      })),
      jobs_total: init.jobs_total ?? jobs.length,
      jobs_by_status: init.jobs_by_status ?? {},
      recent_jobs: jobs.slice(0, 10).map(shapeJob),
    };
  });
}

/**
 * get_job_details
 * Full record for one job by id. IDs come from get_workspace_context's
 * recent_jobs — agents should not guess ids.
 */
export async function getJobDetails(args) {
  const id = Number(args?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return {
      ok: false,
      error: {
        code: "invalid_arguments",
        status: null,
        message: "`id` must be a positive integer",
      },
    };
  }
  return guarded(async () => {
    const res = await jobApi.get(id);
    return { job: shapeJob(res.data ?? {}) };
  });
}

/** Tool manifests (name/description/schema shared by registration + tests). */
export const TOOL_DEFS = [
  {
    name: "get_workspace_context",
    description:
      "Get an overview of the user's JobAssist workspace: who is signed in, " +
      "saved resumes, total applications and counts by status, and up to 10 " +
      "recent jobs with their ids. Use this before get_job_details.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    execute: getWorkspaceContext,
  },
  {
    name: "get_job_details",
    description:
      "Get full details of one saved job by its numeric id. Ids are listed by " +
      "get_workspace_context in recent_jobs.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "integer", minimum: 1, description: "Job id from get_workspace_context" },
      },
      required: ["id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
    execute: getJobDetails,
  },
];
