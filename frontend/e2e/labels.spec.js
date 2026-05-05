import { test, expect } from "@playwright/test";
import { registerUser } from "./helpers.js";

/**
 * Rubric coverage:
 *   #18 Create / list labels
 *   #19 Rename / delete label without removing the note
 *   #20 Filter notes by label
 */
test.describe("Labels", () => {
  test("create label, attach to note, filter, rename, delete", async ({ page, request }) => {
    const u = await registerUser(request);
    const headers = { Authorization: `Bearer ${u.token}` };

    // Create label + note via API for speed.
    const labelRes = await request.post("http://localhost:8000/api/labels", {
      data: { name: "Work", color: "#ff0000" },
      headers,
    });
    const label = (await labelRes.json()).data;

    const noteRes = await request.post("http://localhost:8000/api/notes", {
      data: { title: "Sprint planning", content: "agenda", label_ids: [label.id] },
      headers,
    });
    const note = (await noteRes.json()).data;
    expect(note.title).toBe("Sprint planning");

    // Login and verify label visible in sidebar.
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(u.email);
    await page.getByLabel(/password/i).fill(u.password);
    await page.getByRole("button", { name: /sign in|log in/i }).click();

    await expect(page.getByText(/Work/)).toBeVisible();

    // Click the label to filter — note "Sprint planning" should remain visible,
    // any note without that label should disappear.
    await request.post("http://localhost:8000/api/notes", {
      data: { title: "Personal note", content: "no label" },
      headers,
    });
    await page.reload();
    await page.getByText(/^Work$/).first().click();
    await expect(page.getByText("Sprint planning")).toBeVisible();
    await expect(page.getByText("Personal note")).toHaveCount(0);

    // Rename the label via API and verify cascading rename.
    await request.put(`http://localhost:8000/api/labels/${label.id}`, {
      data: { name: "Office" },
      headers,
    });
    await page.reload();
    await expect(page.getByText(/Office/)).toBeVisible();

    // Delete the label and verify the note is preserved.
    await request.delete(`http://localhost:8000/api/labels/${label.id}`, { headers });
    await page.reload();
    await expect(page.getByText("Sprint planning")).toBeVisible();
    await expect(page.getByText(/Office/)).toHaveCount(0);
  });
});
