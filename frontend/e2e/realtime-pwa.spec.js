import { test, expect } from "@playwright/test";
import { registerUser } from "./helpers.js";

/**
 * Rubric coverage:
 *   #24 Real-time collaboration (two browser contexts editing the same shared note)
 *   #27 PWA / offline mode (page reload while offline still renders cached content)
 */
test.describe("Real-time + PWA", () => {
  test("two users on a shared note both receive updates", async ({ browser, request }) => {
    const alice = await registerUser(request, { displayName: "Alice" });
    const bob = await registerUser(request, { displayName: "Bob" });

    const noteRes = await request.post("http://localhost:8000/api/notes", {
      data: { title: "Live doc", content: "starting" },
      headers: { Authorization: `Bearer ${alice.token}` },
    });
    const note = (await noteRes.json()).data;
    await request.post(`http://localhost:8000/api/notes/${note.id}/share`, {
      data: { email: bob.email, permission: "edit" },
      headers: { Authorization: `Bearer ${alice.token}` },
    });

    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await pageA.goto("/login");
    await pageA.getByLabel(/email/i).fill(alice.email);
    await pageA.getByLabel(/password/i).fill(alice.password);
    await pageA.getByRole("button", { name: /sign in|log in/i }).click();

    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await pageB.goto("/login");
    await pageB.getByLabel(/email/i).fill(bob.email);
    await pageB.getByLabel(/password/i).fill(bob.password);
    await pageB.getByRole("button", { name: /sign in|log in/i }).click();

    // Both open the shared note.
    await pageA.getByText("Live doc").first().click();
    await pageB.getByText(/shared with me/i).click();
    await pageB.getByText("Live doc").first().click();

    // Alice changes the title; Bob should see it propagate.
    const titleA = pageA.getByPlaceholder(/title|untitled/i).first();
    await titleA.fill("Live doc — UPDATED");
    await pageA.waitForTimeout(2000);

    // Tolerate a polling fallback if WebSocket is not configured locally.
    await expect(pageB.getByText("Live doc — UPDATED")).toBeVisible({ timeout: 15_000 });

    await ctxA.close();
    await ctxB.close();
  });

  test("offline reload still shows cached UI", async ({ browser, request }) => {
    const u = await registerUser(request);
    await request.post("http://localhost:8000/api/notes", {
      data: { title: "Offline cached", content: "still here" },
      headers: { Authorization: `Bearer ${u.token}` },
    });

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(u.email);
    await page.getByLabel(/password/i).fill(u.password);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page.getByText("Offline cached")).toBeVisible();

    // Wait a beat so the service worker primes the cache.
    await page.waitForTimeout(2000);

    await ctx.setOffline(true);
    await page.reload();

    // The shell should still render and the offline badge should appear.
    await expect(page.getByText(/offline/i)).toBeVisible({ timeout: 10_000 });
    await ctx.close();
  });
});
