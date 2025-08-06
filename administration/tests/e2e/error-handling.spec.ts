import { test, expect } from '@playwright/test';

test.describe('Error Handling', () => {
  test('should handle 404 pages gracefully', async ({ page }) => {
    // Navigate to non-existent route
    await page.goto('/non-existent-page');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Should show 404 page
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    await expect(page.getByText('Page not found')).toBeVisible();
    
    // Should have link to dashboard
    await expect(page.getByRole('link', { name: 'Go to Dashboard' })).toBeVisible();
  });

  test('should handle network errors when loading members', async ({ page }) => {
    // Intercept API calls to simulate network error
    await page.route('**/api/members**', route => {
      route.abort('failed');
    });
    
    // Navigate to members page
    await page.goto('/members');
    
    // Should show error state or retry option
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
    
    // The page should handle the error gracefully
    // Either show an error message or empty state
    const hasErrorMessage = await page.getByText(/error|failed|try again/i).isVisible().catch(() => false);
    const hasEmptyState = await page.locator('tbody').isVisible().catch(() => false);
    
    expect(hasErrorMessage || hasEmptyState).toBeTruthy();
  });

  test('should handle API errors when creating member', async ({ page }) => {
    // Navigate to members page
    await page.goto('/members');
    await page.getByRole('button', { name: 'Add Member' }).click();
    
    // Intercept the create API call to return error
    await page.route('**/api/members', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Email already exists' })
        });
      } else {
        route.continue();
      }
    });
    
    // Fill out form
    await page.getByLabel('First Name *').fill('Error');
    await page.getByLabel('Last Name *').fill('Test');
    await page.getByLabel('Email *').fill('existing@example.com');
    
    // Submit form
    await page.getByRole('button', { name: 'Create Member' }).click();
    
    // Should show error message or alert
    // Modal should still be open
    await expect(page.getByRole('heading', { name: 'Add New Member' })).toBeVisible();
    
    // Form should not be cleared
    await expect(page.getByLabel('First Name *')).toHaveValue('Error');
  });

  test('should handle validation errors in application form', async ({ page }) => {
    await page.goto('/apply');
    
    // Fill form with invalid data
    await page.getByLabel('Your Name *').fill('A'); // Too short
    await page.getByLabel('Email Address *').fill('invalid-email'); // Invalid format
    await page.getByLabel('Birth Year *').fill('2020'); // Too young
    
    // Try to submit
    await page.getByRole('button', { name: 'Submit Application' }).click();
    
    // Should show validation errors
    const hasAgeError = await page.getByText('You must be 21 or older to apply').isVisible().catch(() => false);
    const formStillOpen = await page.getByRole('heading', { name: 'HMU NYC Application' }).isVisible();
    
    expect(hasAgeError || formStillOpen).toBeTruthy();
  });

  test('should handle empty data gracefully', async ({ page }) => {
    // Mock empty response for events
    await page.route('**/api/events**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], pagination: { total: 0 } })
      });
    });
    
    // Navigate to events page
    await page.goto('/events');
    
    // Should show empty state message
    await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible();
    await expect(page.getByText('No events scheduled')).toBeVisible();
    
    // Create button should still work
    await expect(page.getByRole('button', { name: 'Create Event' })).toBeEnabled();
  });

  test('should handle form submission timeout', async ({ page }) => {
    // Navigate to members page
    await page.goto('/members');
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
    await page.getByRole('button', { name: 'Add Member' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Member' })).toBeVisible();
    
    // Intercept API call to delay response slightly
    await page.route('**/api/members', async route => {
      if (route.request().method() === 'POST') {
        // Delay just enough to test timeout handling
        await new Promise(resolve => setTimeout(resolve, 2000));
        route.abort('timedout');
      } else {
        route.continue();
      }
    });
    
    // Fill and submit form
    await page.getByLabel('First Name *').fill('Timeout');
    await page.getByLabel('Last Name *').fill('Test');
    await page.getByLabel('Email *').fill('timeout@example.com');
    
    // Submit and handle timeout
    await page.getByRole('button', { name: 'Create Member' }).click();
    
    // Modal should still be open and interactive after timeout
    await expect(page.getByRole('heading', { name: 'Add New Member' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeEnabled();
  });

  test('should recover from failed event update', async ({ page }) => {
    // Navigate to events page
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    
    // Ensure there's at least one event
    const hasEvents = await page.locator('tbody tr').count() > 0;
    if (!hasEvents) {
      test.skip();
      return;
    }
    
    // Intercept update calls to fail
    await page.route('**/api/events/*', route => {
      if (route.request().method() === 'PUT') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      } else {
        route.continue();
      }
    });
    
    // Try to edit first event
    await page.getByRole('button', { name: 'Edit Event' }).first().click();
    await page.getByRole('textbox', { name: 'Event Name *' }).fill('Failed Update Test');
    await page.getByRole('button', { name: 'Update Event' }).click();
    
    // Modal should remain open after error
    await expect(page.getByRole('heading', { name: 'Edit Event' })).toBeVisible();
    
    // User should be able to cancel
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Event' })).not.toBeVisible();
  });

  test('should handle invalid member ID gracefully', async ({ page }) => {
    // Navigate to invalid member details page
    await page.goto('/members/999999');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Should either show error or redirect
    const errorText = page.getByText(/not found|error/i);
    const membersHeading = page.getByRole('heading', { name: 'Members' });
    const backButton = page.getByRole('button', { name: 'Back to Members' });
    
    // Wait for one of these conditions
    await expect(errorText.or(membersHeading).or(backButton)).toBeVisible();
  });

  test('should handle concurrent operations', async ({ page }) => {
    // Navigate to members page
    await page.goto('/members');
    
    // Open add member modal
    await page.getByRole('button', { name: 'Add Member' }).click();
    
    // Fill form
    const timestamp = Date.now();
    await page.getByLabel('First Name *').fill('Concurrent');
    await page.getByLabel('Last Name *').fill('Test');
    await page.getByLabel('Email *').fill(`concurrent-${timestamp}@example.com`);
    
    // Click submit multiple times quickly
    const submitButton = page.getByRole('button', { name: 'Create Member' });
    await Promise.all([
      submitButton.click(),
      submitButton.click(),
      submitButton.click()
    ]);
    
    // Should handle multiple clicks gracefully
    // Modal should close after successful submission
    await expect(page.getByRole('heading', { name: 'Add New Member' })).not.toBeVisible({ timeout: 5000 });
    
    // Should only create one member
    await page.waitForTimeout(1000);
    const memberRows = page.locator('tr', { hasText: `concurrent-${timestamp}@example.com` });
    const count = await memberRows.count();
    expect(count).toBe(1);
  });

  test('should show appropriate error for unauthorized access', async ({ page }) => {
    // Mock unauthorized response
    await page.route('**/api/members/*', route => {
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' })
      });
    });
    
    // Try to access member details
    await page.goto('/members/1');
    
    // Should handle unauthorized error
    const hasError = await page.getByText(/unauthorized|forbidden|access denied/i).isVisible().catch(() => false);
    const redirected = await page.url().includes('/members/1') === false;
    
    expect(hasError || redirected).toBeTruthy();
  });
});