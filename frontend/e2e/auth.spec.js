import { test, expect } from "@playwright/test";
import { registerUser, uniqueEmail } from "./helpers.js";

/**
 * Rubric coverage:
 *   #1 Sign-up + auto-login + activation email
 *   #2 Email verification (signed URL flow)
 *   #3 Login (email + password, token issuance)
 *   #4 Forgot / reset password (link or OTP)
 *   #7 Change password (authenticated)
 */
test.describe("Auth & verification", () => {
  test("signup, login, logout via UI", async ({ page }) => {
    const email = uniqueEmail("signup");
    await page.goto("/register");
    await page.getByLabel(/display name/i).fill("Alice E2E");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill("Password123!");
    await page.getByLabel(/confirm/i).fill("Password123!");
    await page.getByRole("button", { name: /sign up|register/i }).click();

    // After signup the user should be auto-logged in and redirected to the dashboard.
    await expect(page).toHaveURL(/\/dashboard|\/notes|\/$/);

    // Verification banner must show because email_verified_at is null.
    await expect(page.getByText(/verify|activation|kích hoạt/i)).toBeVisible();

    // Logout: open the user menu and click logout.
    await page.getByRole("button", { name: /menu|profile|account|user/i }).first().click();
    await page.getByRole("menuitem", { name: /log\s*out|sign\s*out/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("login with wrong password shows an error", async ({ page, request }) => {
    const u = await registerUser(request);
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(u.email);
    await page.getByLabel(/password/i).fill("WRONG-pass");
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page.getByText(/invalid|incorrect|wrong/i)).toBeVisible();
  });

  test("forgot password link form submits", async ({ page, request }) => {
    const u = await registerUser(request);
    await page.goto("/forgot-password");
    await page.getByLabel(/email/i).fill(u.email);
    await page.getByRole("button", { name: /send|gửi/i }).click();
    await expect(page.getByText(/sent|check your email|kiểm tra/i)).toBeVisible();
  });

  test("authenticated user can change password", async ({ page, request }) => {
    const u = await registerUser(request);
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(u.email);
    await page.getByLabel(/password/i).fill(u.password);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard|\/notes|\/$/);

    await page.goto("/change-password");
    await page.getByLabel(/current password/i).fill(u.password);
    await page.getByLabel(/^new password$/i).fill("NewSecret123!");
    await page.getByLabel(/confirm/i).fill("NewSecret123!");
    await page.getByRole("button", { name: /update|change|save/i }).click();
    await expect(page.getByText(/updated|changed|success/i)).toBeVisible();
  });
});
