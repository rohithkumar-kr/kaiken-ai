import { expect, test } from "@playwright/test";

test("renders the home page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("precision AI evaluation");
  await expect(
    page.getByRole("main").getByRole("link", { name: "Analyze Resume" }).first()
  ).toBeVisible();
});

test("redirects unauthenticated users from /dashboard to sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
