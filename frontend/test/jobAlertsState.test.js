import { test, expect } from "vitest";

import {
  DEFAULT_DAILY_RUN_LIMIT,
  getCreationState,
  getRewriteState,
  getRunState,
  REWRITE_WINDOW_MS,
  updateUsageList,
} from "../src/utils/jobAlertsState.js";

test("getRunState defaults to the basic plan limit when none is supplied", () => {
  expect(getRunState({})).toEqual({
    used: 0,
    limit: DEFAULT_DAILY_RUN_LIMIT,
    remaining: DEFAULT_DAILY_RUN_LIMIT,
    atLimit: false,
    unlimited: false,
  });
});

test("getRunState reports atLimit when daily count meets the limit", () => {
  const state = getRunState({
    daily_manual_run_count: 3,
    daily_manual_run_limit: 3,
  });

  expect(state.used).toBe(3);
  expect(state.limit).toBe(3);
  expect(state.remaining).toBe(0);
  expect(state.atLimit).toBe(true);
  expect(state.unlimited).toBe(false);
});

test("getRunState treats limit === -1 as unlimited (Pro plan)", () => {
  const state = getRunState({
    daily_manual_run_count: 99,
    daily_manual_run_limit: -1,
  });

  expect(state.unlimited).toBe(true);
  expect(state.atLimit).toBe(false);
  expect(state.remaining).toBe(-1);
});

test("getCreationState mirrors getRunState semantics for daily creation", () => {
  expect(
    getCreationState({ daily_creation_count: 2, daily_creation_limit: 3 }),
  ).toMatchObject({ used: 2, limit: 3, remaining: 1, atLimit: false });
  expect(
    getCreationState({ daily_creation_count: 3, daily_creation_limit: 3 }),
  ).toMatchObject({ atLimit: true, remaining: 0 });
});

test("getRewriteState blocks edits during cooldown", () => {
  const now = new Date("2026-03-26T12:00:00.000Z").getTime();
  const alert = {
    updated_at: new Date(now - (REWRITE_WINDOW_MS - 15 * 60 * 1000)).toISOString(),
  };

  expect(getRewriteState(alert, now)).toEqual({
    canRewrite: false,
    remainingMin: 15,
  });
});

test("updateUsageList only changes job_alerts usage", () => {
  const result = updateUsageList(
    [
      { feature: "job_alerts", used: 1, limit: 2, remaining: 1 },
      { feature: "cv_analysis", used: 3, limit: 5, remaining: 2 },
    ],
    1,
  );

  expect(result).toEqual([
    { feature: "job_alerts", used: 2, limit: 2, remaining: 0 },
    { feature: "cv_analysis", used: 3, limit: 5, remaining: 2 },
  ]);
});
