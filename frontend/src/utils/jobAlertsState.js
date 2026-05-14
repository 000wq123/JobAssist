// Default limits match the "basic" plan. The real limits are always returned
// by the backend in the JobAlertListResponse and should be preferred.
export const DEFAULT_DAILY_RUN_LIMIT = 3;
export const DEFAULT_DAILY_CREATION_LIMIT = 3;
export const REWRITE_WINDOW_MS = 3 * 60 * 60 * 1000;

/**
 * Derive run-button state from the list-response usage object.
 * @param {{ daily_manual_run_count?: number, daily_manual_run_limit?: number }} usage
 */
export function getRunState(usage = {}) {
  const used = usage.daily_manual_run_count ?? 0;
  const limit = usage.daily_manual_run_limit ?? DEFAULT_DAILY_RUN_LIMIT;
  const unlimited = limit === -1;
  const atLimit = !unlimited && used >= limit;
  return {
    used,
    limit,
    remaining: unlimited ? -1 : Math.max(0, limit - used),
    atLimit,
    unlimited,
  };
}

/**
 * Derive create/edit button state from the list-response usage object.
 * @param {{ daily_creation_count?: number, daily_creation_limit?: number }} usage
 */
export function getCreationState(usage = {}) {
  const used = usage.daily_creation_count ?? 0;
  const limit = usage.daily_creation_limit ?? DEFAULT_DAILY_CREATION_LIMIT;
  const unlimited = limit === -1;
  const atLimit = !unlimited && used >= limit;
  return {
    used,
    limit,
    remaining: unlimited ? -1 : Math.max(0, limit - used),
    atLimit,
    unlimited,
  };
}

/**
 * Check whether a 3-hour per-alert cooldown still applies before the next edit.
 */
export function getRewriteState(alert, now = Date.now()) {
  const base = alert?.updated_at
    ? new Date(alert.updated_at)
    : alert?.created_at
    ? new Date(alert.created_at)
    : null;
  if (!base) return { canRewrite: true, remainingMin: 0 };
  const remainingMs = base.getTime() + REWRITE_WINDOW_MS - now;
  return remainingMs <= 0
    ? { canRewrite: true, remainingMin: 0 }
    : { canRewrite: false, remainingMin: Math.ceil(remainingMs / 60000) };
}

/** Optimistically adjust the job_alerts used/remaining counts in billing caches. */
export function updateUsageList(usage = [], delta) {
  return usage.map((item) => {
    if (item.feature !== "job_alerts") return item;
    const nextUsed = Math.max(0, (item.used || 0) + delta);
    return {
      ...item,
      used: nextUsed,
      remaining: item.limit === -1 ? -1 : Math.max(0, item.limit - nextUsed),
    };
  });
}
