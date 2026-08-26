import { describe, it, expect, beforeEach } from "vitest";
import { registerWebMcpTools, unregisterWebMcpTools, isWebMcpAvailable } from "../src/webmcp/register";

const DEFS = [
  { name: "tool_a", description: "A test tool", inputSchema: { type: "object" }, execute: async () => ({ ok: true }) },
  { name: "tool_b", description: "Another", inputSchema: { type: "object" }, execute: async () => ({ ok: true }) },
];

function fakeModelContext() {
  const tools = new Map();
  return {
    registerTool: vi.fn((def) => {
      if (tools.has(def.name)) {
        throw Object.assign(new Error("Duplicate tool name"), { name: "InvalidStateError" });
      }
      tools.set(def.name, def);
      // Real Chrome removes the tool when its signal aborts.
      def.signal?.addEventListener("abort", () => tools.delete(def.name));
    }),
    getTools: vi.fn(() => [...tools.values()].map((d) => ({ name: d.name }))),
    _tools: tools,
  };
}

beforeEach(() => {
  unregisterWebMcpTools();
  delete document.modelContext;
});

describe("isWebMcpAvailable", () => {
  it("false when document.modelContext absent", () => {
    expect(isWebMcpAvailable()).toBe(false);
  });
  it("true when present", () => {
    document.modelContext = fakeModelContext();
    expect(isWebMcpAvailable()).toBe(true);
  });
});

describe("registerWebMcpTools", () => {
  it("no-op when API unavailable (graceful)", () => {
    const res = registerWebMcpTools(DEFS);
    expect(res.registered).toBe(false);
    expect(res.tools).toEqual([]);
  });

  it("registers all tools and reports them", () => {
    const ctx = fakeModelContext();
    document.modelContext = ctx;
    const res = registerWebMcpTools(DEFS);
    expect(res.registered).toBe(true);
    expect(res.tools).toEqual(["tool_a", "tool_b"]);
    expect(ctx._tools.size).toBe(2);
  });

  it("passes execute + signal through to registerTool", () => {
    const ctx = fakeModelContext();
    document.modelContext = ctx;
    registerWebMcpTools(DEFS);
    for (const call of ctx.registerTool.mock.calls) {
      expect(call[0].execute).toBeTypeOf("function");
      expect(call[0].signal).toBeInstanceOf(AbortSignal);
    }
  });

  it("second registration is an idempotent no-op", () => {
    document.modelContext = fakeModelContext();
    const first = registerWebMcpTools(DEFS);
    const second = registerWebMcpTools(DEFS);
    expect(first.registered).toBe(true);
    expect(second.alreadyRegistered).toBe(true);
  });

  it("detects duplicate leftovers from HMR instead of throwing", () => {
    const ctx = fakeModelContext();
    // Pre-seed with the same names as if a previous HMR round registered them
    ctx.registerTool({ name: "tool_a", execute: () => {} });
    document.modelContext = ctx;
    const res = registerWebMcpTools(DEFS);
    expect(res.registered).toBe(false);
    expect(res.error).toBe("duplicate_tool_names");
    expect(res.clash).toContain("tool_a");
  });

  it("aborts partial registration on mid-loop failure", () => {
    const ctx = {
      registerTool: vi.fn((def) => {
        if (def.name === "tool_b") throw new Error("boom");
      }),
      getTools: vi.fn(() => []),
    };
    document.modelContext = ctx;
    const res = registerWebMcpTools(DEFS);
    expect(res.registered).toBe(false);
    // tool_a was registered before failure → must have been unwound via abort
    expect(ctx.registerTool).toHaveBeenCalledTimes(2);
  });
});

describe("unregisterWebMcpTools", () => {
  it("allows re-registration after unregister", () => {
    document.modelContext = fakeModelContext();
    expect(registerWebMcpTools(DEFS).registered).toBe(true);
    unregisterWebMcpTools();
    expect(registerWebMcpTools(DEFS).registered).toBe(true);
  });
});
