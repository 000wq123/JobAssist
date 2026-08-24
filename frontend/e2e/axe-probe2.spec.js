import { test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("probe dash", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("ja:access_token", "t");
    localStorage.setItem("auth_user", JSON.stringify({ full_name: "Test User", email: "test@example.com" }));
  });
  await page.route("**/api/init", r => r.fulfill({ status: 200, contentType: "application/json",
    body: JSON.stringify({ me:{id:1,email:"t@e.com",full_name:"T",is_verified:true}, profile:{id:1,user_id:1,avatar:null},
      resumes:[],resumes_total:0,jobs_total:3,jobs_by_status:{bookmarked:1,applied:1,interviewing:1},plan:"max",usage:[] }) }));
  await page.route("**/api/jobs**", r => r.fulfill({ status:200, contentType:"application/json",
    body: JSON.stringify({ items: [1,2,3].map(i => ({ id:i, role:"Dev", company:"F", location:"Graz",
      created_at:new Date().toISOString(), updated_at:new Date().toISOString(),
      status:["bookmarked","applied","interviewing"][i-1], url:"", deadline:null, expires_at:null, salary_text:null })) }) }));
  await page.route("**/api/job-alerts**", r => r.fulfill({ status:200, contentType:"application/json",
    body: JSON.stringify({ alerts:[], daily_manual_run_count:0, daily_manual_run_limit:-1 }) }));
  await page.goto("/jobs", { waitUntil: "networkidle" });
  const results = await new AxeBuilder({ page }).withTags(["wcag2aa"]).analyze();
  for (const v of results.violations.filter(v => ["serious","critical"].includes(v.impact))) {
    for (const n of v.nodes) {
      console.log("HTML:", n.html.slice(0,300));
      console.log("FIX:", (n.failureSummary||"").split("\n").slice(1).join(" | ").slice(0,250));
    }
  }
});
