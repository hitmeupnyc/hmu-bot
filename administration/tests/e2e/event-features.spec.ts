import { expect, test } from '@playwright/test';

test.describe('Event Advanced Features', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to events page
    await page.goto('/events');
    await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible();

    // Wait for events table to be visible
    await expect(
      page.locator('tbody').or(page.getByText('No events scheduled'))
    ).toBeVisible();
  });

  test('should display event statistics correctly', async ({ page }) => {
    // Go to first event details
    const table = await page.getByRole('table');
    await table.getByRole('link').first().click();

    // Overview tab should be active by default
    await expect(
      page.getByRole('heading', { name: 'Event Statistics' })
    ).toBeVisible();

    // Check statistics display
    const stats = ['Total Registrations:', 'Volunteers:', 'Checked In:'];

    for (const stat of stats) {
      const statElement = page.getByText(stat);
      await expect(statElement).toBeVisible();

      // Should have a number value
      const statValue = await statElement.locator('..').textContent();
      expect(statValue).toMatch(/\d+/);
    }

    // Check-in count should be visible
    const checkedInElement = page.getByText('Checked In:').locator('..');
    await expect(checkedInElement).toBeVisible();
  });
});
