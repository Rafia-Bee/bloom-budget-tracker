/**
 * Global Setup for Playwright E2E Tests
 *
 * Runs once before all tests to set up shared authentication state.
 * This avoids hitting rate limits by logging in only once per test run.
 *
 * IMPORTANT: HttpOnly cookies (like JWT auth) cannot be saved via storageState.
 * We use context.cookies() to capture ALL cookies including HttpOnly ones,
 * then save them to a separate JSON file for test fixtures to restore.
 */

import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

export const TEST_USER = {
  email: "test@test.com",
  password: "test123",
};

export const AUTH_STATE_PATH = "e2e/.auth/user.json";
export const COOKIES_PATH = "e2e/.auth/cookies.json";

/**
 * Global setup - authenticates once and saves cookies (including HttpOnly) for all tests
 */
async function globalSetup(config) {
  const baseURL = config.projects[0].use.baseURL || "http://localhost:3000";

  // Ensure auth directory exists
  const authDir = path.dirname(AUTH_STATE_PATH);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Launch browser for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to login page
    await page.goto(`${baseURL}/login`);

    // Wait for form to be ready
    await page.waitForSelector('input[type="email"]', {
      state: "visible",
      timeout: 10000,
    });

    // Fill credentials
    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);

    // Submit and wait for redirect
    await Promise.all([
      page.waitForURL(/\/(dashboard)?$/, { timeout: 15000 }),
      page.click('button[type="submit"]'),
    ]);

    // Get ALL cookies including HttpOnly ones (storageState doesn't include HttpOnly)
    const cookies = await context.cookies();

    // Save cookies to separate file for test fixtures to use
    fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));

    // Also save storageState for localStorage (non-HttpOnly stuff)
    await context.storageState({ path: AUTH_STATE_PATH });

    console.log(
      `✅ Global setup: Saved ${cookies.length} cookies (including HttpOnly)`,
    );
  } catch (error) {
    console.error("❌ Global setup failed:", error.message);
    // Create empty files so tests can handle auth individually
    fs.writeFileSync(COOKIES_PATH, JSON.stringify([]));
    fs.writeFileSync(
      AUTH_STATE_PATH,
      JSON.stringify({ cookies: [], origins: [] }),
    );
  } finally {
    await browser.close();
  }
}

export default globalSetup;
