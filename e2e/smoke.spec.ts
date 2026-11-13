import { test, expect } from "@playwright/test";

// Smoke tests sin DB real: valida que las rutas responden y el middleware
// hace su trabajo (sin sesión, redirige a /login).

test("navegar a / sin sesión redirige a /login", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL(/\/login/);
  await expect(page.getByText(/GYMIA/i)).toBeVisible();
});

test("en /login se ven el form email y el botón de Google", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByPlaceholder(/email/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /continuar con google/i })).toBeVisible();
});

test("/manifest.webmanifest responde JSON válido", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.name).toBe("GYMIA");
  expect(body.start_url).toBe("/hoy");
  expect(body.theme_color).toBe("#0A0A0B");
  expect(Array.isArray(body.icons)).toBe(true);
});

test("/icon y /apple-icon responden imagen", async ({ request }) => {
  for (const path of ["/icon", "/apple-icon"]) {
    const res = await request.get(path);
    expect(res.ok(), path).toBeTruthy();
    expect(res.headers()["content-type"]).toContain("image/");
  }
});
