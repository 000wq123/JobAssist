# WebMCP Integration

Exposes read-mostly JobAssist workspace tools to MCP clients via the
[WebMCP](https://github.com/WebMCP) browser API (`document.modelContext`,
Chrome 152+ behind `--enable-features=WebMCPTesting`).

## Enabling

```
VITE_ENABLE_WEBMCP=1 npm run dev
```

Then launch Chrome with the flag:

```
google-chrome-stable --enable-features=WebMCPTesting http://localhost:5174
```

Without the env flag the module never loads. Without the browser flag
`document.modelContext` is absent and registration is a graceful no-op.
The code is dynamically imported, so it never enters the main bundle.

## Tools

| Tool | Read-only | Description |
|---|---|---|
| `get_workspace_context` | yes | Signed-in user, resumes, job counts by status, up to 10 recent jobs |
| `get_job_details` | yes | Full record for one job by numeric id |
| `compare_fit` | **no** — consumes usage quota | AI match analysis between a job and a resume |

All handlers return a structured envelope — they never throw:

```jsonc
// success
{ "ok": true, "data": { ... } }
// failure
{ "ok": false, "error": { "code": "...", "status": 401|null, "message": "..." } }
```

Error codes: `unauthenticated` (401), `forbidden` (403 non-quota),
`usage_exhausted` (402 / quota-related 403), `not_found` (404),
`rate_limited` (429), `network_error`, `invalid_arguments`, `unknown_error`.

## Registration lifecycle (`register.js`)

- Feature-detects `document.modelContext`; no-op when absent.
- Registers with an `AbortController` signal — aborting unregisters all
  tools (there is no `unregisterTool` method in the API).
- Guards against duplicate names (Chrome throws `InvalidStateError`),
  which matters after Vite HMR: leftovers are detected via `getTools()`
  and reported instead of thrown.
- Partial registration failure unwinds everything registered so far.
- Idempotent: second call returns `{ alreadyRegistered: true }`.

## Debugging

In dev mode (`import.meta.env.DEV`) a debug surface is installed:

```js
window.__webmcp.available   // is document.modelContext present?
window.__webmcp.registered  // did our tools register?
window.__webmcp.toolNames()
window.__webmcp.unregister()
```

Note: Chrome's `modelContext.getTools()` entries do not expose `.execute`
to page scripts — tool invocation happens inside the browser when an MCP
client calls them.

## Testing

- Unit: `test/webmcp-workspace.test.js` (handlers + error mapping + manifests),
  `test/webmcp-register.test.js` (lifecycle guards against a fake modelContext).
- E2E: `e2e/webmcp-wiring.spec.js` verifies the built app boots cleanly with
  the API absent (stock Chromium).

## Known environment limitation

`compare_fit` calls `/api/jobs/{id}/match`, which requires the backend's
AI service (Anthropic API key). Local dev without that key gets
`AI service error` from the endpoint; the handler itself is unit-tested
with a mocked client.
