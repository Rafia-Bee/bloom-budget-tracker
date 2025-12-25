/**
 * Unauthenticated User Flow Tests
 *
 * Tests for users who are not logged in - ensures public endpoints work,
 * login/register pages render correctly, and the app handles unauthenticated
 * state gracefully (this was the 401 storm issue).
 */

import { test, expect } from "./fixtures.js";

test.describe("Unauthenticated User Flow", () => {
    test.describe("App Loading", () => {
        test("app loads without JavaScript errors for new visitors", async ({ page }) => {
            const jsErrors = [];
            page.on("pageerror", (error) => jsErrors.push(error.message));

            await page.goto("/");

            // Wait for page to settle
            await page.waitForLoadState("networkidle");

            // No JS errors should occur
            expect(jsErrors).toHaveLength(0);
        });

        test("unauthenticated user is redirected to login", async ({ page }) => {
            await page.goto("/dashboard");

            // Should redirect to login
            await expect(page).toHaveURL("/login");
        });

        test("protected routes redirect to login", async ({ page }) => {
            const protectedRoutes = ["/dashboard", "/debts", "/goals", "/settings", "/recurring"];

            for (const route of protectedRoutes) {
                await page.goto(route);
                await expect(page).toHaveURL("/login");
            }
        });
    });

    test.describe("Public API Endpoints", () => {
        test("currencies endpoint returns data without auth", async ({ page, request }) => {
            // Direct API call to public endpoint
            const response = await request.get("http://localhost:5000/api/v1/currencies");

            expect(response.status()).toBe(200);

            const data = await response.json();
            expect(data.currencies).toBeDefined();
            expect(Array.isArray(data.currencies)).toBeTruthy();
            expect(data.currencies.length).toBeGreaterThan(0);

            // Verify currency structure
            const euro = data.currencies.find((c) => c.code === "EUR");
            expect(euro).toBeDefined();
            expect(euro.name).toBe("Euro");
            expect(euro.symbol).toBe("€");
        });

        test("exchange rates endpoint returns data without auth", async ({ page, request }) => {
            const response = await request.get("http://localhost:5000/api/v1/currencies/rates?base=EUR");

            expect(response.status()).toBe(200);

            const data = await response.json();
            expect(data.base).toBe("EUR");
            expect(data.rates).toBeDefined();
            expect(typeof data.rates.USD).toBe("number");
        });

        test("currency convert endpoint works without auth", async ({ page, request }) => {
            const response = await request.post("http://localhost:5000/api/v1/currencies/convert", {
                data: {
                    amount: 10000, // 100 EUR in cents
                    from_currency: "EUR",
                    to_currency: "USD",
                },
            });

            expect(response.status()).toBe(200);

            const data = await response.json();
            expect(data.converted_amount).toBeDefined();
            expect(data.rate).toBeDefined();
        });
    });

    test.describe("Login Page", () => {
        test("login page renders all required elements", async ({ page }) => {
            await page.goto("/login");

            // App branding
            await expect(page.locator("h1")).toContainText("Bloom");

            // Form elements
            await expect(page.locator('input[name="email"]')).toBeVisible();
            await expect(page.locator('input[name="password"]')).toBeVisible();
            await expect(page.locator('button[type="submit"]')).toBeVisible();

            // Navigation links
            await expect(page.locator('a[href="/register"]')).toBeVisible();

            // Theme toggle should be accessible (contains "Dark Mode" or "Light Mode")
            await expect(page.locator("button").filter({ hasText: /Dark Mode|Light Mode/i })).toBeVisible();
        });

        test("login form shows validation errors for invalid email", async ({ page }) => {
            await page.goto("/login");

            await page.fill('input[name="email"]', "invalid-email");
            await page.fill('input[name="password"]', "password123");
            await page.click('button[type="submit"]');

            // Should show validation error
            await expect(page.locator("text=valid email")).toBeVisible({ timeout: 5000 });
        });

        test("login form shows validation errors for short password", async ({ page }) => {
            await page.goto("/login");

            await page.fill('input[name="email"]', "test@test.com");
            await page.fill('input[name="password"]', "short");
            await page.click('button[type="submit"]');

            // Should show validation error
            await expect(page.locator("text=6 characters")).toBeVisible({ timeout: 5000 });
        });

        test("login form shows error for invalid credentials", async ({ page }) => {
            await page.goto("/login");

            await page.fill('input[name="email"]', "wrong@email.com");
            await page.fill('input[name="password"]', "wrongpassword");
            await page.click('button[type="submit"]');

            // Should show error message
            await expect(page.locator("text=/invalid|incorrect|failed/i")).toBeVisible({ timeout: 10000 });
        });

        test("can navigate from login to register", async ({ page }) => {
            await page.goto("/login");

            await page.click('a[href="/register"]');

            await expect(page).toHaveURL("/register");
        });
    });

    test.describe("Register Page", () => {
        test("register page renders all required elements", async ({ page }) => {
            await page.goto("/register");

            // Form elements
            await expect(page.locator('input[name="email"]')).toBeVisible();
            await expect(page.locator('input[name="password"]')).toBeVisible();
            await expect(page.locator('button[type="submit"]')).toBeVisible();

            // Navigation link to login
            await expect(page.locator('a[href="/login"]')).toBeVisible();
        });

        test("can navigate from register to login", async ({ page }) => {
            await page.goto("/register");

            await page.click('a[href="/login"]');

            await expect(page).toHaveURL("/login");
        });
    });

    test.describe("Theme Toggle", () => {
        test("theme toggle works on login page", async ({ page }) => {
            await page.goto("/login");

            // Get initial state (check html element for dark class)
            const html = page.locator("html");
            const initialIsDark = await html.evaluate((el) => el.classList.contains("dark"));

            // Click theme toggle (contains "Dark Mode" or "Light Mode" text)
            const themeToggle = page.locator("button").filter({ hasText: /Dark Mode|Light Mode/i });
            await themeToggle.first().click();

            // Theme should have changed
            const newIsDark = await html.evaluate((el) => el.classList.contains("dark"));
            expect(newIsDark).not.toBe(initialIsDark);
        });
    });
});
