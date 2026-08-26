import { test, expect } from "@playwright/test";

test("flagged discovery", async ({ browser }) => {
  // requires PLAYWRIGHT_CHROMIUM_ARGS; fallback: skip if API absent
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("http://localhost:5174/");
  await page.waitForTimeout(1500);
  const hasMcp = await page.evaluate(() => !!document.modelContext);
  console.log("modelContext present:", hasMcp);
  if (hasMcp) {
    const tools = await page.evaluate(() => document.modelContext.getTools().map(t => ({ name: t.name, origin: t.origin })));
    console.log("TOOLS:", JSON.stringify(tools));
    expect(tools.map(t => t.name)).toContain("get_workspace_context");
  }
});
