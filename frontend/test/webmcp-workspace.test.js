import { describe, it, expect, vi, beforeEach } from "vitest";
import { TOOL_DEFS, getWorkspaceContext, getJobDetails, compareFit } from "../src/webmcp/tools/workspace";

// Mock the api client — handlers must consume { data } responses and map
// ApiError-shaped throws into structured errors.
vi.mock("../src/services/api", () => ({
  jobApi: {
    list: vi.fn(),
    get: vi.fn(),
    match: vi.fn(),
  },
  initApi: {
    fetch: vi.fn(),
  },
}));

import { jobApi, initApi } from "../src/services/api";

const INIT_PAYLOAD = {
  me: { id: 1, email: "t@gmail.com", full_name: "T User" },
  resumes: [{ id: 7, filename: "cv.pdf" }],
  jobs_total: 2,
  jobs_by_status: { bookmarked: 1, applied: 1 },
  plan: "max",
};

function apiError(status, message = "fail") {
  const e = new Error(message);
  e.response = { status };
  return e;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getWorkspaceContext", () => {
  it("returns shaped workspace data on success", async () => {
    initApi.fetch.mockResolvedValue({ data: INIT_PAYLOAD });
    jobApi.list.mockResolvedValue({
      data: {
        items: [
          { id: 5, role: "Dev", company: "ACME", status: "applied" },
          { id: 9, title: "Ops (no role field)", company: "Globex", status: "bookmarked" },
        ],
      },
    });

    const res = await getWorkspaceContext();
    expect(res.ok).toBe(true);
    expect(res.data.user.name).toBe("T User");
    expect(res.data.jobs_total).toBe(2);
    expect(res.data.resumes).toEqual([{ id: 7, filename: "cv.pdf" }]);
    expect(res.data.recent_jobs[0]).toMatchObject({ id: 5, role: "Dev", company: "ACME" });
    // falls back to `title` when `role` is absent
    expect(res.data.recent_jobs[1].role).toBe("Ops (no role field)");
  });

  it("maps 401 to unauthenticated code", async () => {
    initApi.fetch.mockRejectedValue(apiError(401));
    const res = await getWorkspaceContext();
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe("unauthenticated");
    expect(res.error.status).toBe(401);
  });

  it("maps network TypeError to network_error code", async () => {
    initApi.fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    const res = await getWorkspaceContext();
    expect(res.error.code).toBe("network_error");
  });
});

describe("getJobDetails", () => {
  it("rejects non-positive / non-integer ids with invalid_arguments", async () => {
    for (const bad of ["abc", 0, -3, 1.5, null, undefined]) {
      const res = await getJobDetails({ id: bad });
      expect(res.ok).toBe(false);
      expect(res.error.code).toBe("invalid_arguments");
    }
    expect(jobApi.get).not.toHaveBeenCalled();
  });

  it("returns shaped job on success", async () => {
    jobApi.get.mockResolvedValue({
      data: { id: 5, role: "Dev", company: "ACME", status: "applied", url: "https://x" },
    });
    const res = await getJobDetails({ id: 5 });
    expect(res.ok).toBe(true);
    expect(res.data.job).toMatchObject({ id: 5, role: "Dev", company: "ACME" });
    expect(jobApi.get).toHaveBeenCalledWith(5);
  });

  it("maps 404 to not_found code", async () => {
    jobApi.get.mockRejectedValue(apiError(404));
    const res = await getJobDetails({ id: 999 });
    expect(res.ok).toBe(false);
    expect(res.error.code).toBe("not_found");
  });
});

describe("compareFit", () => {
  it("rejects invalid ids without hitting the API", async () => {
    for (const bad of [{}, { job_id: 1 }, { resume_id: 2 }, { job_id: "x", resume_id: 1 }, { job_id: -1, resume_id: 1 }]) {
      const res = await compareFit(bad);
      expect(res.ok).toBe(false);
      expect(res.error.code).toBe("invalid_arguments");
    }
    expect(jobApi.match).not.toHaveBeenCalled();
  });

  it("returns match payload on success", async () => {
    jobApi.match.mockResolvedValue({ data: { score: 0.82, reasons: ["x"] } });
    const res = await compareFit({ job_id: 5, resume_id: 7 });
    expect(res.ok).toBe(true);
    expect(res.data.match).toMatchObject({ score: 0.82 });
    expect(jobApi.match).toHaveBeenCalledWith(5, 7);
  });

  it("maps quota exhaustion (402) to usage_exhausted", async () => {
    jobApi.match.mockRejectedValue(apiError(402));
    const res = await compareFit({ job_id: 5, resume_id: 7 });
    expect(res.error.code).toBe("usage_exhausted");
  });
});

describe("TOOL_DEFS manifests", () => {
  it("are read-only and have unique names with valid schemas", () => {
    const names = TOOL_DEFS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const def of TOOL_DEFS) {
      if (def.name === "compare_fit") {
        expect(def.annotations.readOnlyHint).toBe(false);
      } else {
        expect(def.annotations.readOnlyHint).toBe(true);
      }
      expect(def.inputSchema.type).toBe("object");
      expect(typeof def.execute).toBe("function");
      expect(def.description.length).toBeGreaterThan(20);
    }
  });
});
