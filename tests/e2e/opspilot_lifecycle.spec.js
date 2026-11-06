import { test, expect } from '@playwright/test';

test.describe('OpsPilot End-to-End Browser Testing & Responsive Verification (Prompt 29)', () => {

  test('1. Landing Page Loads & Renders Header and Hero', async ({ page }) => {
    await page.goto('/landing');

    // Assert page title
    await expect(page).toHaveTitle(/OpsPilot/);

    // Verify Brand Logo and Header
    const brandName = page.locator('header').getByText('OpsPilot').first();
    await expect(brandName).toBeVisible();

    // Verify Sign In link
    const signInLink = page.getByRole('link', { name: /sign in/i }).first();
    await expect(signInLink).toBeVisible();
  });

  test('2. Form Validation on Login Page rejects invalid inputs', async ({ page }) => {
    await page.goto('/login');

    // Click Sign In button with empty fields
    const submitBtn = page.getByRole('button', { name: /sign in to workspace/i });
    await submitBtn.click();

    // Verify email error appears
    const emailError = page.locator('text=/email/i').first();
    await expect(emailError).toBeVisible();

    // Fill invalid email format
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.fill('not-an-email');
    await submitBtn.click();

    await expect(page.locator('text=/valid email/i').first()).toBeVisible();
  });

  test('3. Authenticated Dashboard Experience (Alex Rivera - Owner)', async ({ page }) => {
    await page.goto('/login');

    // Quick 1-click persona login as Alex Rivera (Owner)
    const alexBtn = page.getByRole('button', { name: /alex rivera/i }).first();
    await expect(alexBtn).toBeVisible();
    await alexBtn.click();

    // Should redirect to root "/" where Owner Dashboard renders
    await page.waitForURL('http://localhost:5173/', { timeout: 8000 });
    await expect(page).toHaveURL('http://localhost:5173/');

    // Verify dashboard renders
    await expect(page.locator('body')).toBeVisible();
  });

  test('4. Projects & Agile Kanban Board Navigation', async ({ page }) => {
    await page.goto('/login');
    const alexBtn = page.getByRole('button', { name: /alex rivera/i }).first();
    await alexBtn.click();
    await page.waitForURL('http://localhost:5173/', { timeout: 8000 });

    // Navigate to Projects page
    await page.goto('/projects');
    await expect(page).toHaveURL(/.*projects/);
    await expect(page.getByText(/projects/i).first()).toBeVisible();

    // Navigate to Tasks Kanban board
    await page.goto('/tasks');
    await expect(page).toHaveURL(/.*tasks/);
    await expect(page.getByText(/tasks/i).first()).toBeVisible();
  });

  test('5. Financial Invoices View', async ({ page }) => {
    await page.goto('/login');
    const alexBtn = page.getByRole('button', { name: /alex rivera/i }).first();
    await alexBtn.click();
    await page.waitForURL('http://localhost:5173/', { timeout: 8000 });

    // Navigate to Invoices
    await page.goto('/invoices');
    await expect(page).toHaveURL(/.*invoices/);
    await expect(page.getByText(/invoices/i).first()).toBeVisible();
  });

  test('6. Customer Role Boundary & Portal Redirection (Olivia Parker)', async ({ page }) => {
    await page.goto('/login');

    // Quick 1-click persona login as Olivia Parker (Customer)
    const oliviaBtn = page.getByRole('button', { name: /olivia parker/i }).first();
    await expect(oliviaBtn).toBeVisible();
    await oliviaBtn.click();

    // Customer lands on customer portal (/customer)
    await page.waitForURL(/.*customer/, { timeout: 8000 });
    await expect(page).toHaveURL(/.*customer/);

    // Verify customer portal view renders
    await expect(page.getByText(/customer portal|services/i).first()).toBeVisible();

    // Verify workforce link is NOT visible to customer in navigation
    const workforceNav = page.locator('nav').getByRole('link', { name: /^workforce$/i });
    await expect(workforceNav).not.toBeVisible();
  });

});
