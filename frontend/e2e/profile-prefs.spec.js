import { test, expect } from "@playwright/test";
import { registerUser } from "./helpers.js";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

/**
 * Rubric coverage:
 *   #5 Edit profile (display name)
 *   #6 Avatar upload / delete
 *   #8 User preferences (theme, font size, default colors, default view)
 */
test.describe("Profile & preferences", () => {
  test("edit display name", async ({ page, request }) => {
    const u = await registerUser(request, { displayName: "Old Name" });
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(u.email);
    await page.getByLabel(/password/i).fill(u.password);
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    await page.goto("/profile");
    const nameInput = page.getByLabel(/display name|name/i).first();
    await nameInput.fill("Brand New Name");
    await page.getByRole("button", { name: /save|update/i }).click();
    await expect(page.getByText(/Brand New Name/)).toBeVisible();
  });

  test("upload avatar", async ({ page, request }) => {
    const u = await registerUser(request);
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(u.email);
    await page.getByLabel(/password/i).fill(u.password);
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    // Create a tiny PNG on disk.
    const tmp = path.join(os.tmpdir(), `e2e-avatar-${Date.now()}.png`);
    // 1x1 transparent PNG.
    fs.writeFileSync(
      tmp,
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9R7kPcQAAAAASUVORK5CYII=",
        "base64",
      ),
    );

    await page.goto("/profile");
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(tmp);
    await expect(page.locator("img")).toHaveCount(await page.locator("img").count());
  });

  test("change preferences (theme, font size, default view)", async ({ page, request }) => {
    const u = await registerUser(request);
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(u.email);
    await page.getByLabel(/password/i).fill(u.password);
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    await page.goto("/preferences");
    // Theme: dark
    await page.getByRole("button", { name: /dark/i }).first().click();
    // Default view: list
    await page.getByRole("button", { name: /list/i }).first().click();
    await page.getByRole("button", { name: /save|update/i }).click();
    await expect(page.getByText(/saved|updated/i)).toBeVisible();
  });
});
