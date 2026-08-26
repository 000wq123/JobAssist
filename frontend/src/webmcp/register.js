/**
 * WebMCP registration lifecycle.
 *
 * - Feature-detects `document.modelContext` (Chrome 152+ with
 *   --enable-features=WebMCPTesting; absent otherwise → graceful no-op).
 * - Registers the workspace tools once per page load.
 * - Uses an AbortController so Vite HMR / SPA teardown can unregister
 *   (the API unregisters via signal, there is no unregisterTool method).
 * - Guards against duplicate names (throws InvalidStateError in Chrome),
 *   which matters when HMR re-runs this module.
 */

let registered = false;
let abortController = null;

/** True when the current page exposes the WebMCP API. */
export function isWebMcpAvailable() {
  return typeof document !== "undefined" && !!document.modelContext;
}

/**
 * Register all workspace tools. Safe to call multiple times:
 * no-ops when already registered or when WebMCP is unavailable.
 * Returns { registered: boolean, tools: string[] } for diagnostics.
 */
export function registerWebMcpTools(toolDefs) {
  if (registered) {
    return { registered: true, tools: toolDefs.map((t) => t.name), alreadyRegistered: true };
  }
  if (!isWebMcpAvailable()) {
    return { registered: false, tools: [] };
  }

  // Unregister any leftovers from a previous HMR round with the same names.
  try {
    const existing = new Set(
      (document.modelContext.getTools?.() ?? []).map((t) => t.name)
    );
    const wanted = new Set(toolDefs.map((t) => t.name));
    const clash = [...existing].filter((n) => wanted.has(n));
    if (clash.length > 0) {
      return { registered: false, tools: [], error: "duplicate_tool_names", clash };
    }
  } catch {
    /* discovery failed — let register() surface the real error below */
  }

  abortController = new AbortController();
  try {
    for (const def of toolDefs) {
      document.modelContext.registerTool({
        name: def.name,
        description: def.description,
        inputSchema: def.inputSchema,
        annotations: def.annotations,
        execute: def.execute,
        signal: abortController.signal,
      });
    }
  } catch (err) {
    // Partial failure: unwind whatever registered so we don't half-register.
    abortController.abort();
    abortController = null;
    return { registered: false, tools: [], error: err?.name ?? "register_failed", message: err?.message };
  }

  registered = true;
  return { registered: true, tools: toolDefs.map((t) => t.name) };
}

/** Unregister everything (HMR teardown / tests). Idempotent. */
export function unregisterWebMcpTools() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
  registered = false;
}
