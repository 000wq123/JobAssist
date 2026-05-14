import { test, expect } from "vitest";

import { getCleanBillingUrl, getPlanName, getUsageBarState } from "../src/utils/billingState.js";

test("getUsageBarState maps known labels and near-limit state", () => {
  const result = getUsageBarState("job_search", 8, 10);

  expect(result.label).toBe("Jobsuchen (Heute)");
  expect(result.unlimited).toBe(false);
  expect(result.pct).toBe(80);
  expect(result.isNearLimit).toBe(true);
  expect(result.displayLimit).toBe(10);
});

test("getUsageBarState handles unlimited plans", () => {
  const result = getUsageBarState("ai_chat", 42, -1);

  expect(result.label).toBe("KI-Nachrichten (Diesen Monat)");
  expect(result.unlimited).toBe(true);
  expect(result.pct).toBe(0);
  expect(result.isNearLimit).toBe(false);
  expect(result.displayLimit).toBe("∞");
});

test("getPlanName falls back to Basic for unknown plans", () => {
  expect(getPlanName("max")).toBe("Max");
  expect(getPlanName("mystery")).toBe("Basic");
});

test("getCleanBillingUrl removes query params and preserves hash", () => {
  expect(getCleanBillingUrl("/billing")).toBe("/billing");
  expect(getCleanBillingUrl("/billing", "#usage")).toBe("/billing#usage");
});
