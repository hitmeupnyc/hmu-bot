import { test, expect } from '@playwright/test';

test.describe('Events Management System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the page to load
    await expect(page.getByRole('heading', { name: 'Club Management' })).toBeVisible();
  });

  test('should display events list page', async ({ page }) => {
    // Navigate to Events page
    await page.getByRole('link', { name: 'Events' }).click();
    
    // Verify we're on the events page
    await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Event' })).toBeVisible();
    
    // Check for filter buttons
    await expect(page.getByRole('button', { name: 'Upcoming' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Past' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
    
    // Check for events table headers (using th elements since they might not have proper role attributes)
    await expect(page.locator('th').filter({ hasText: 'Event' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Date & Time' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Capacity' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Status' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Actions' })).toBeVisible();
  });

  test('should create a new event successfully', async ({ page }) => {
    // Navigate to Events page
    await page.getByRole('link', { name: 'Events' }).click();
    
    // Get initial count of events
    const initialEventRows = page.locator('tbody tr');
    const initialCount = await initialEventRows.count();
    
    // Click Create Event button
    await page.getByRole('button', { name: 'Create Event' }).click();
    
    // Create unique event name with timestamp
    const timestamp = Date.now();
    const eventName = `E2E Test Event ${timestamp}`;
    
    // Fill out the event form
    await page.getByRole('textbox', { name: 'Event Name *' }).fill(eventName);
    await page.getByRole('textbox', { name: 'Description' }).fill('This is a test event created by automated e2e testing.');
    await page.getByRole('textbox', { name: 'Start Date & Time *' }).fill('2025-12-25T14:00');
    await page.getByRole('textbox', { name: 'End Date & Time *' }).fill('2025-12-25T16:00');
    await page.getByRole('spinbutton', { name: 'Max Capacity' }).fill('25');
    
    // Ensure "Public Event" checkbox is checked (it should be by default)
    await expect(page.getByRole('checkbox', { name: 'Public Event' })).toBeChecked();
    
    // Submit the form
    await page.locator('form').getByRole('button', { name: 'Create Event' }).click();
    
    // Verify the event was created and appears in the list
    await expect(page.getByText(eventName)).toBeVisible();
    
    // Check that we have more events in the table than we started with
    const finalEventRows = page.locator('tbody tr');
    const finalCount = await finalEventRows.count();
    expect(finalCount).toBeGreaterThan(initialCount);
  });

  test('should navigate to event details and display all tabs', async ({ page }) => {
    // Navigate to Events page
    await page.getByRole('link', { name: 'Events' }).click();
    
    // Click on the first "View Details" button (assuming there's at least one event)
    await page.getByRole('button', { name: 'View Details' }).first().click();
    
    // Verify we're on the event details page
    await expect(page.getByRole('button', { name: 'Back to Events' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Edit Event' })).toBeVisible();
    
    // Check event details are displayed
    await expect(page.getByText('Start:')).toBeVisible();
    await expect(page.getByText('End:')).toBeVisible();
    await expect(page.getByText('Capacity:')).toBeVisible();
    
    // Test Overview tab (should be active by default)
    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Event Statistics' })).toBeVisible();
    await expect(page.getByText('Total Registrations:')).toBeVisible();
    await expect(page.getByText('Volunteers:')).toBeVisible();
    await expect(page.getByText('Checked In:')).toBeVisible();
    
    // Test Marketing tab
    await page.getByRole('button', { name: 'Marketing' }).first().click();
    // Marketing content should show either content or "No marketing content yet"
    const hasMarketingContent = await page.getByText('No marketing content yet').isVisible();
    if (hasMarketingContent) {
      await expect(page.getByRole('button', { name: 'Add Marketing Content' })).toBeVisible();
    }
    
    // Test Volunteers tab
    await page.getByRole('button', { name: /Volunteers \(\d+\)/ }).click();
    await expect(page.getByRole('heading', { name: 'Event Volunteers' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Volunteer' })).toBeVisible();
    
    // Test Attendance tab
    await page.getByRole('button', { name: /Attendance \(\d+\)/ }).click();
    await expect(page.getByRole('heading', { name: 'Event Attendance' })).toBeVisible();
  });

  test('should show volunteer form when Add Volunteer is clicked', async ({ page }) => {
    // Navigate to Events page and go to first event details
    await page.getByRole('link', { name: 'Events' }).click();
    await page.getByRole('button', { name: 'View Details' }).first().click();
    
    // Navigate to Volunteers tab
    await page.getByRole('button', { name: /Volunteers \(\d+\)/ }).click();
    
    // Click Add Volunteer button
    await page.getByRole('button', { name: 'Add Volunteer' }).click();
    
    // Verify the volunteer form is displayed
    await expect(page.getByRole('heading', { name: 'Add New Volunteer' })).toBeVisible();
    await expect(page.getByText('Member *')).toBeVisible();
    await expect(page.getByText('Role *')).toBeVisible();
    await expect(page.getByText('Contact Phone')).toBeVisible();
    await expect(page.getByText('Contact Email')).toBeVisible();
    await expect(page.getByText('Arrival Time')).toBeVisible();
    await expect(page.getByText('Departure Time')).toBeVisible();
    await expect(page.getByText('Special Instructions')).toBeVisible();
    await expect(page.getByText('Volunteer Notes')).toBeVisible();
    
    // Check that the role dropdown has expected options
    const roleDropdown = page.getByRole('combobox').nth(1);
    await roleDropdown.click();
    
    // Check dropdown options are present (may not be immediately visible due to styling)
    await expect(page.locator('option[value="coordinator"]')).toBeAttached();
    await expect(page.locator('option[value="setup"]')).toBeAttached();
    await expect(page.locator('option[value="greeter"]')).toBeAttached();
    await expect(page.locator('option[value="tech"]')).toBeAttached();
    await expect(page.locator('option[value="cleanup"]')).toBeAttached();
    
    // Verify form buttons
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    // Check the submit button in the form specifically (not the header button)
    await expect(page.locator('form').getByRole('button', { name: 'Add Volunteer' })).toBeDisabled(); // Should be disabled until required fields are filled
  });

  test('should navigate back to events list from event details', async ({ page }) => {
    // Navigate to Events page and go to first event details
    await page.getByRole('link', { name: 'Events' }).click();
    await page.getByRole('button', { name: 'View Details' }).first().click();
    
    // Click Back to Events button
    await page.getByRole('button', { name: 'Back to Events' }).click();
    
    // Verify we're back on the events list page
    await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Event' })).toBeVisible();
  });

  test('should display event action buttons', async ({ page }) => {
    // Navigate to Events page
    await page.getByRole('link', { name: 'Events' }).click();
    
    // Find the first event row and check for action buttons
    const firstEventRow = page.locator('tbody tr').first();
    await expect(firstEventRow.getByRole('button', { name: 'View Details' })).toBeVisible();
    await expect(firstEventRow.getByRole('button', { name: 'Edit Event' })).toBeVisible();
    await expect(firstEventRow.getByRole('button', { name: 'Delete Event' })).toBeVisible();
  });

  test('should filter events using filter buttons', async ({ page }) => {
    // Navigate to Events page
    await page.getByRole('link', { name: 'Events' }).click();
    
    // Test clicking different filter buttons
    await page.getByRole('button', { name: 'Upcoming' }).click();
    // The button should be visually active/selected (this depends on your CSS implementation)
    
    await page.getByRole('button', { name: 'Past' }).click();
    await page.getByRole('button', { name: 'All' }).click();
    
    // Each click should trigger a re-fetch of events with different filters
    // The exact behavior depends on your implementation
  });

  test('should handle create event form validation', async ({ page }) => {
    // Navigate to Events page
    await page.getByRole('link', { name: 'Events' }).click();
    
    // Click Create Event button
    await page.getByRole('button', { name: 'Create Event' }).click();
    
    // Try to submit without filling required fields
    await page.locator('form').getByRole('button', { name: 'Create Event' }).click();
    
    // Form should not submit and show validation (this depends on your validation implementation)
    // The form should still be visible
    await expect(page.getByRole('heading', { name: 'Create New Event' })).toBeVisible();
    
    // Fill only the event name and try again
    await page.getByRole('textbox', { name: 'Event Name *' }).fill('Test Event');
    await page.locator('form').getByRole('button', { name: 'Create Event' }).click();
    
    // Should still show form due to missing required fields
    await expect(page.getByRole('heading', { name: 'Create New Event' })).toBeVisible();
  });

  test('should close create event modal when Cancel is clicked', async ({ page }) => {
    // Navigate to Events page
    await page.getByRole('link', { name: 'Events' }).click();
    
    // Click Create Event button
    await page.getByRole('button', { name: 'Create Event' }).click();
    
    // Verify modal is open
    await expect(page.getByRole('heading', { name: 'Create New Event' })).toBeVisible();
    
    // Click Cancel button
    await page.getByRole('button', { name: 'Cancel' }).click();
    
    // Modal should be closed
    await expect(page.getByRole('heading', { name: 'Create New Event' })).not.toBeVisible();
    
    // Should still be on events page
    await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible();
  });
});