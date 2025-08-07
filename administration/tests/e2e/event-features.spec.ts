import { test, expect } from '@playwright/test';

test.describe('Event Advanced Features', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to events page
    await page.goto('/events');
    await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible();
    
    // Wait for events table to be visible
    await expect(page.locator('tbody').or(page.getByText('No events scheduled'))).toBeVisible();
  });

  test('should manage event marketing content', async ({ page }) => {
    // Ensure there's at least one event
    const hasEvents = await page.locator('tbody tr').count() > 0;
    if (!hasEvents) {
      // Create an event first
      await page.getByRole('button', { name: 'Create Event' }).click();
      const eventName = `Marketing Test Event ${Date.now()}`;
      await page.getByRole('textbox', { name: 'Event Name *' }).fill(eventName);
      await page.getByRole('textbox', { name: 'Start Date & Time *' }).fill('2025-12-01T14:00');
      await page.getByRole('textbox', { name: 'End Date & Time *' }).fill('2025-12-01T16:00');
      await page.locator('form').getByRole('button', { name: 'Create Event' }).click();
      await expect(page.getByText(eventName)).toBeVisible();
    }
    
    // Go to first event details
    await page.getByRole('button', { name: 'View Details' }).first().click();
    
    // Navigate to Marketing tab
    await page.getByRole('button', { name: 'Marketing' }).first().click();
    
    // Check for empty state or existing content
    const hasNoContent = await page.getByText('No marketing content yet').isVisible().catch(() => false);
    
    if (hasNoContent) {
      // Add marketing content
      await page.getByRole('button', { name: 'Add Marketing Content' }).click();
      
      // Fill marketing form - h2 is the form title
      await expect(page.getByRole('heading', { name: 'Event Marketing Content', level: 2 })).toBeVisible();
      await page.getByLabel('Primary Marketing Copy').fill('Early Bird Special');
      await page.getByLabel('Blurb').fill('Get 20% off tickets when you register before November 1st!');
      await page.getByLabel('Social Media Copy').fill('Register Now');
      await page.getByLabel('Email Subject').fill('Limited Time: Early Bird Special!');
      
      // Save marketing content
      await page.getByRole('button', { name: 'Save Marketing Content' }).click();
      
      // Modal should close
      await expect(page.getByRole('heading', { name: 'Event Marketing Content', level: 2 })).not.toBeVisible();
      
      // Content should be visible - check in marketing content section
      const marketingSection = page.locator('div').filter({ hasText: 'Marketing Content' }).nth(1);
      await expect(marketingSection.getByText('Early Bird Special')).toBeVisible();
      await expect(marketingSection.getByText('Get 20% off tickets')).toBeVisible();
    }
  });

  test('should manage event volunteers', async ({ page }) => {
    // Ensure we have an event
    const hasEvents = await page.locator('tbody tr').count() > 0;
    if (!hasEvents) {
      expect(hasEvents).toBeGreaterThan(0);
      return;
    }
    
    // Go to first event details
    await page.getByRole('button', { name: 'View Details' }).first().click();
    await page.waitForLoadState('networkidle');
    
    // Navigate to Volunteers tab
    const volunteersTab = page.getByRole('button', { name: /Volunteers \(\d+\)/ });
    
    // Extract the initial volunteer count from the tab text
    const tabText = await volunteersTab.textContent();
    const initialCount = parseInt(tabText?.match(/\((\d+)\)/)?.[1] || '0');
    
    await volunteersTab.click();
    
    // Wait for volunteers section to load
    await expect(page.getByRole('heading', { name: 'Event Volunteers' })).toBeVisible();
    
    // Count the initial number of volunteer cards
    const volunteerSection = page.locator('div').filter({ hasText: 'Event Volunteers' }).first();
    const initialCardCount = await volunteerSection.locator('.space-y-4 > div').count();
    
    // Add a volunteer
    await page.getByRole('button', { name: 'Add Volunteer' }).click();
    await page.waitForTimeout(100); // Small wait for form to render
    
    // The member dropdown should be visible
    const memberDropdown = page.getByRole('combobox').first();
    await expect(memberDropdown).toBeVisible();
    
    // Select first available member
    const options = await memberDropdown.locator('option').count();
    if (options > 1) { // First option is usually empty
      await memberDropdown.selectOption({ index: 1 });
    }
    
    // Select a role
    const roleDropdown = page.getByRole('combobox').nth(1);
    await roleDropdown.selectOption('greeter');
    
    // Add optional details
    await page.locator('input[type="tel"]').fill('555-1234');
    await page.getByPlaceholder('Any special instructions for this volunteer').fill('Please arrive 30 minutes early');
    
    // Submit form
    await page.locator('form').getByRole('button', { name: 'Add Volunteer' }).click();
    
    // Wait for the form to close and volunteer to be added
    await expect(page.getByRole('heading', { name: 'Add New Volunteer' })).not.toBeVisible();
    
    // Verify a new volunteer card was added
    const newCardCount = await volunteerSection.locator('.space-y-4 > div').count();
    expect(newCardCount).toBe(initialCardCount + 1);
    
    // Verify the new volunteer has the greeter role
    // Get the last volunteer card (the one we just added)
    const lastVolunteerCard = volunteerSection.locator('.space-y-4 > div').last();
    await expect(lastVolunteerCard.getByText('Role: greeter')).toBeVisible();
  });

  test('should track event attendance', async ({ page }) => {
    // Ensure we have an event
    const hasEvents = await page.locator('tbody tr').count() > 0;
    if (!hasEvents) {
      expect(hasEvents).toBeGreaterThan(0);
      return;
    }
    
    // Go to first event details
    await page.getByRole('button', { name: 'View Details' }).first().click();
    
    // Wait for event details to load
    await expect(page.getByRole('button', { name: 'Back to Events' })).toBeVisible();
    
    // Navigate to Attendance tab
    await page.getByRole('button', { name: /Attendance \(\d+\)/ }).click();
    
    // Should show attendance list
    await expect(page.getByRole('heading', { name: 'Event Attendance' })).toBeVisible();
    
    // Check for attendance tracking features
    const attendanceSection = page.getByRole('heading', { name: 'Event Attendance' }).locator('..');
    await expect(attendanceSection).toBeVisible();
    
    // Wait for content to load
    await page.waitForTimeout(200); // Allow time for any dynamic content
    
    // Should have check-in functionality if there are attendees
    const hasAttendees = await attendanceSection.locator('tbody tr').count() > 0;
    
    if (hasAttendees) {
      // Should show attendee information
      const firstAttendee = attendanceSection.locator('tbody tr').first();
      await expect(firstAttendee).toBeVisible();
      
      // Should have check-in status
      const hasCheckedIn = await firstAttendee.getByText('Checked In').isVisible().catch(() => false);
      const hasNotCheckedIn = await firstAttendee.getByText('Not Checked In').isVisible().catch(() => false);
      
      expect(hasCheckedIn || hasNotCheckedIn).toBeTruthy();
      
      // Should have check-in button if not checked in
      if (hasNotCheckedIn) {
        await expect(firstAttendee.getByRole('button', { name: 'Check In' })).toBeVisible();
      }
    } else {
      // Should show empty state
      await expect(page.getByText(/No attendance records yet/i)).toBeVisible();
    }
  });

  test('should add marketing content', async ({ page }) => {
    test.setTimeout(10000); // 10 second timeout for this specific test
    // Create event
    await page.getByRole('button', { name: 'Create Event' }).click();
    const eventName = `Marketing Test ${Date.now()}`;
    await page.getByRole('textbox', { name: 'Event Name *' }).fill(eventName);
    await page.getByRole('textbox', { name: 'Start Date & Time *' }).fill('2025-11-15T18:00');
    await page.getByRole('textbox', { name: 'End Date & Time *' }).fill('2025-11-15T20:00');
    await page.locator('form').getByRole('button', { name: 'Create Event' }).click();
    
    // Wait for redirect to event details page
    await expect(page.getByRole('heading', { name: 'Create New Event' })).not.toBeVisible();
    await page.waitForURL(/\/events\/\d+$/);
    await expect(page.getByRole('heading', { name: eventName })).toBeVisible();
    await page.waitForLoadState('networkidle');
    
    // Go to Marketing tab
    await page.getByRole('button', { name: 'Marketing' }).click();
    await page.getByRole('button', { name: 'Add Marketing Content' }).click();
    
    // Add marketing content
    await page.getByLabel('Primary Marketing Copy').fill('Test Marketing Content');
    await page.getByLabel('Blurb').fill('This is a test blurb');
    await page.getByLabel('Social Media Copy').fill('Check out our event!');
    await page.getByRole('button', { name: 'Save Marketing Content' }).click();
    
    // Verify content was saved
    await expect(page.getByText('Test Marketing Content')).toBeVisible();
    await expect(page.getByText('This is a test blurb')).toBeVisible();
    await expect(page.getByText('Check out our event!')).toBeVisible();
  });

  // SKIPPED: The marketing content update functionality is not implemented in the backend.
  // The API only has a create endpoint (POST /api/events/:id/marketing) but no update endpoint.
  test.skip('should update marketing content', async ({ page }) => {
    test.setTimeout(10000); // 10 second timeout for this specific test
    // Create event with marketing content
    await page.getByRole('button', { name: 'Create Event' }).click();
    const eventName = `Marketing Update Test ${Date.now()}`;
    await page.getByRole('textbox', { name: 'Event Name *' }).fill(eventName);
    await page.getByRole('textbox', { name: 'Start Date & Time *' }).fill('2025-11-15T18:00');
    await page.getByRole('textbox', { name: 'End Date & Time *' }).fill('2025-11-15T20:00');
    await page.locator('form').getByRole('button', { name: 'Create Event' }).click();
    
    // Wait for modal to close and redirect to event details page
    await expect(page.getByRole('heading', { name: 'Create New Event' })).not.toBeVisible();
    
    // Should redirect to the event details page
    await page.waitForURL(/\/events\/\d+$/);
    await expect(page.getByRole('heading', { name: eventName })).toBeVisible();
    await page.waitForLoadState('networkidle');
    
    // Add initial marketing content
    await page.getByRole('button', { name: 'Marketing' }).click();
    await page.getByRole('button', { name: 'Add Marketing Content' }).click();
    await page.getByLabel('Primary Marketing Copy').fill('Initial Content');
    await page.getByLabel('Blurb').fill('This is the initial marketing content');
    await page.getByRole('button', { name: 'Save Marketing Content' }).click();
    
    // Wait for content to appear
    await expect(page.getByText('Initial Content')).toBeVisible();
    
    // Edit the content
    await page.getByRole('button', { name: 'Edit Marketing' }).click();
    
    // Wait for the edit form to be visible
    await expect(page.getByLabel('Primary Marketing Copy')).toBeVisible();
    
    // Update the content
    await page.getByLabel('Primary Marketing Copy').fill('Updated Marketing Content');
    await page.getByLabel('Blurb').fill('This content has been updated with new information');
    await page.getByLabel('Social Media Copy').fill('Learn More');
    
    // Save changes
    await page.getByRole('button', { name: 'Save Marketing Content' }).click();
    
    // Wait for the form to close and content to update
    await expect(page.getByRole('button', { name: 'Edit Marketing' })).toBeVisible();
    
    // Verify updates
    await expect(page.getByText('Updated Marketing Content')).toBeVisible();
    await expect(page.getByText('This content has been updated with new information')).toBeVisible();
    await expect(page.getByText('Learn More')).toBeVisible();
  });

  // SKIPPED: The volunteer removal functionality is not implemented in the current UI.
  test.skip('should handle volunteer removal', async ({ page }) => {
    
    // Go to an event with volunteers
    const eventRows = page.locator('tbody tr');
    let foundEventWithVolunteers = false;
    
    // Find an event with volunteers
    const eventCount = await eventRows.count();
    for (let i = 0; i < eventCount; i++) {
      await eventRows.nth(i).getByRole('button', { name: 'View Details' }).click();
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: /Volunteers \(\d+\)/ }).click();
      
      const volunteerCount = parseInt(
        (await page.getByRole('button', { name: /Volunteers \((\d+)\)/ }).textContent() || '0')
          .match(/\d+/)?.[0] || '0'
      );
      
      if (volunteerCount > 0) {
        foundEventWithVolunteers = true;
        break;
      }
      
      // Go back to events list
      await page.getByRole('button', { name: 'Back to Events' }).click();
    }
    
    // Count initial volunteers
    const volunteerRows = page.locator('div').filter({ hasText: 'Event Volunteers' }).locator('tbody tr');
    const initialCount = await volunteerRows.count();
    
    // Remove first volunteer
    const firstVolunteer = volunteerRows.first();
    
    // Setup dialog handler
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('remove this volunteer');
      dialog.accept();
    });
    
    await firstVolunteer.getByRole('button', { name: 'Remove' }).click();
    
    // Volunteer count should decrease
    await expect(volunteerRows).toHaveCount(initialCount - 1);
  });

  test('should validate volunteer form', async ({ page }) => {
    // Go to first event
    await page.getByRole('button', { name: 'View Details' }).first().click();
    await page.getByRole('button', { name: /Volunteers \(\d+\)/ }).click();
    
    // Open volunteer form
    await page.getByRole('button', { name: 'Add Volunteer' }).click();
    
    // Submit button should be disabled initially (no member or role selected)
    const submitButton = page.locator('form').getByRole('button', { name: 'Add Volunteer' });
    
    // Form should be open
    await expect(page.getByRole('heading', { name: 'Add New Volunteer' })).toBeVisible();
    
    // Select member
    const memberDropdown = page.getByRole('combobox').first();
    const options = await memberDropdown.locator('option').count();
    if (options > 1) {
      await memberDropdown.selectOption({ index: 1 });
    }
    
    // Button should still be disabled (need role)
    await expect(submitButton).toBeDisabled();
    
    // Select role
    await page.getByRole('combobox').nth(1).selectOption('setup');
    
    // Now button should be enabled
    await expect(submitButton).toBeEnabled();
  });

  test('should display event statistics correctly', async ({ page }) => {
    // Go to first event details
    await page.getByRole('button', { name: 'View Details' }).first().click();
    
    // Overview tab should be active by default
    await expect(page.getByRole('heading', { name: 'Event Statistics' })).toBeVisible();
    
    // Check statistics display
    const stats = [
      'Total Registrations:',
      'Volunteers:',
      'Checked In:'
    ];
    
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

  test('should handle marketing content with long text', async ({ page }) => {
    // Create new event
    await page.getByRole('button', { name: 'Create Event' }).click();
    const eventName = `Long Content Test ${Date.now()}`;
    await page.getByRole('textbox', { name: 'Event Name *' }).fill(eventName);
    await page.getByRole('textbox', { name: 'Start Date & Time *' }).fill('2025-10-01T10:00');
    await page.getByRole('textbox', { name: 'End Date & Time *' }).fill('2025-10-01T12:00');
    await page.locator('form').getByRole('button', { name: 'Create Event' }).click();
    
    // Wait for modal to close and redirect to event details page
    await expect(page.getByRole('heading', { name: 'Create New Event' })).not.toBeVisible();
    
    // Should redirect to the event details page
    await page.waitForURL(/\/events\/\d+$/);
    await expect(page.getByRole('heading', { name: eventName })).toBeVisible();
    
    // Wait for event details page and click Marketing tab
    await expect(page.getByRole('button', { name: 'Marketing' })).toBeVisible();
    await page.getByRole('button', { name: 'Marketing' }).click();
    
    // Add marketing content button should be visible
    await expect(page.getByRole('button', { name: 'Add Marketing Content' })).toBeVisible();
    await page.getByRole('button', { name: 'Add Marketing Content' }).click();
    
    const longContent = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(20);
    await page.getByLabel('Primary Marketing Copy').fill('Extended Marketing Campaign');
    await page.getByLabel('Blurb').fill(longContent);
    
    // Save
    await page.getByRole('button', { name: 'Save Marketing Content' }).click();
    
    // Content should be displayed (possibly truncated)
    await expect(page.getByText('Extended Marketing Campaign')).toBeVisible();
    
    // At least part of the content should be visible
    await expect(page.getByText(/Lorem ipsum/)).toBeVisible();
  });
});
