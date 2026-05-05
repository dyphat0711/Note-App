/**
 * Shared E2E helpers.
 *
 * The backend exposes a fully RESTful API at /api/* that we hit directly to
 * provision users and seed data — much faster (and far less flaky) than
 * exercising the entire React signup wizard for every spec.
 */
const API_BASE = process.env.E2E_API_BASE || "http://localhost:8000/api";

let counter = 0;
export function uniqueEmail(prefix = "user") {
  counter += 1;
  return `${prefix}.${Date.now()}.${counter}@e2e.test`;
}

export async function registerUser(request, { displayName, email, password = "Password123!" } = {}) {
  const finalEmail = email || uniqueEmail();
  const res = await request.post(`${API_BASE}/register`, {
    data: {
      display_name: displayName || "E2E User",
      email: finalEmail,
      password,
      password_confirmation: password,
    },
  });
  if (!res.ok()) {
    throw new Error(`registerUser failed (${res.status()}): ${await res.text()}`);
  }
  const body = await res.json();
  return { email: finalEmail, password, token: body.access_token, user: body.user };
}

export async function loginViaUI(page, email, password) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/dashboard|\/notes|\/$/);
}

export function authedHeaders(token) {
  return { Authorization: `Bearer ${token}`, Accept: "application/json" };
}
