import { test, expect } from "@playwright/test";
import { registerUser } from "./helpers.js";

/**
 * Rubric coverage:
 *   #21 Password-protected notes (set / unlock)
 *   #22 "Better" lock flow (set, change, disable)
 *   #23 Sharing with another user (read / edit) + recipient view
 */
test.describe("Advanced features", () => {
  test("set, unlock, change, disable note password", async ({ page, request }) => {
    const u = await registerUser(request);
    const headers = { Authorization: `Bearer ${u.token}` };
    const noteRes = await request.post("http://localhost:8000/api/notes", {
      data: { title: "Diary", content: "secret" },
      headers,
    });
    const note = (await noteRes.json()).data;

    await page.goto("/login");
    await page.getByLabel(/email/i).fill(u.email);
    await page.getByLabel(/password/i).fill(u.password);
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    await page.getByText("Diary").click();
    await page.getByRole("button", { name: /lock|password/i }).first().click();

    // Set password
    await page.getByLabel(/^password$/i).fill("openme");
    await page.getByLabel(/confirm/i).fill("openme");
    await page.getByRole("button", { name: /set|enable|save/i }).click();
    await expect(page.getByText(/locked|protected/i)).toBeVisible();

    // Reload — note should require unlock.
    await page.reload();
    await page.getByText("Diary").click();
    await page.getByLabel(/password/i).fill("openme");
    await page.getByRole("button", { name: /unlock|open/i }).click();
    await expect(page.getByText(/secret/)).toBeVisible();

    // Sanity-check the API for change/disable.
    const changeRes = await request.patch(`http://localhost:8000/api/notes/${note.id}/password`, {
      data: {
        action: "change",
        current_password: "openme",
        password: "newpass",
        password_confirmation: "newpass",
      },
      headers,
    });
    expect(changeRes.ok()).toBeTruthy();

    const disableRes = await request.patch(`http://localhost:8000/api/notes/${note.id}/password`, {
      data: {
        action: "disable",
        current_password: "newpass",
      },
      headers,
    });
    expect(disableRes.ok()).toBeTruthy();
  });

  test("share a note with another registered user (read / edit)", async ({ browser, request }) => {
    const alice = await registerUser(request, { displayName: "Alice" });
    const bob = await registerUser(request, { displayName: "Bob" });

    const noteRes = await request.post("http://localhost:8000/api/notes", {
      data: { title: "Team plan", content: "Q3 roadmap" },
      headers: { Authorization: `Bearer ${alice.token}` },
    });
    const note = (await noteRes.json()).data;

    // Alice shares with Bob (edit permission).
    const shareRes = await request.post(`http://localhost:8000/api/notes/${note.id}/share`, {
      data: { email: bob.email, permission: "edit" },
      headers: { Authorization: `Bearer ${alice.token}` },
    });
    expect(shareRes.ok()).toBeTruthy();

    // Bob logs in and confirms the note appears under "Shared with me".
    const ctxBob = await browser.newContext();
    const pageBob = await ctxBob.newPage();
    await pageBob.goto("/login");
    await pageBob.getByLabel(/email/i).fill(bob.email);
    await pageBob.getByLabel(/password/i).fill(bob.password);
    await pageBob.getByRole("button", { name: /sign in|log in/i }).click();

    await pageBob.getByText(/shared with me/i).click();
    await expect(pageBob.getByText("Team plan")).toBeVisible();
    await ctxBob.close();
  });
});
