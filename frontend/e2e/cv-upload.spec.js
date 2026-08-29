import { expect, test } from "@playwright/test";
import { mockApi } from "./helpers/cvPickerEnv.js";

function seedEmptyCv() {
  sessionStorage.setItem("ja:access_token", "test-access-token");
  sessionStorage.setItem("ja:cv_builder_mode", "landing");
  localStorage.setItem("jobassist_onboarding_done_v1", "1");
  localStorage.setItem("cookie_consent_v1", "accepted");
  localStorage.setItem(
    "auth_user",
    JSON.stringify({ id: 1, email: "qa@jobassist.tech", full_name: "QA User", is_verified: true }),
  );
  localStorage.removeItem("cv_profile_v1");
}

test("PDF hochladen opens the native file picker immediately on an empty CV", async ({ page }) => {
  await page.addInitScript(seedEmptyCv);
  mockApi(page);
  await page.goto("/lebenslauf");

  const uploadButton = page.getByRole("button", { name: "PDF hochladen", exact: true });
  await expect(uploadButton).toBeVisible();

  const chooserPromise = page.waitForEvent("filechooser", { timeout: 2_000 });
  await uploadButton.click();
  const chooser = await chooserPromise;

  expect(chooser.isMultiple()).toBe(false);
});
