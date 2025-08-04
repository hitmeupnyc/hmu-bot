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
      
      // Fill marketing form
      await expect(page.getByRole('heading', { name: 'Add Marketing Content' })).toBeVisible();
      await page.getByLabel('Title *').fill('Early Bird Special');
      await page.getByLabel('Content *').fill('Get 20% off tickets when you register before November 1st!');
      await page.getByLabel('Call to Action').fill('Register Now');
      await page.getByLabel('CTA Link').fill('https://example.com/register');
      
      // Save marketing content
      await page.getByRole('button', { name: 'Save Content' }).click();
      
      // Modal should close
      await expect(page.getByRole('heading', { name: 'Add Marketing Content' })).not.toBeVisible();
      
      // Content should be visible
      await expect(page.getByText('Early Bird Special')).toBeVisible();
      await expect(page.getByText('Get 20% off tickets')).toBeVisible();
    }
  });

  test('should manage event volunteers', async ({ page }) => {
    // Ensure we have an event
    const hasEvents = await page.locator('tbody tr').count() > 0;
    if (!hasEvents) {
      test.skip();
      return;
    }
    
    // Go to first event details
    await page.getByRole('button', { name: 'View Details' }).first().click();
    
    // Navigate to Volunteers tab
    await page.getByRole('button', { name: /Volunteers \(\d+\)/ }).click();
    
    // Add a volunteer
    await page.getByRole('button', { name: 'Add Volunteer' }).click();
    
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
    await page.getByLabel('Contact Phone').fill('555-1234');
    await page.getByLabel('Special Instructions').fill('Please arrive 30 minutes early');
    
    // Submit form
    await page.locator('form').getByRole('button', { name: 'Add Volunteer' }).click();
    
    // Volunteer should be added to the list
    await expect(page.getByText('Greeter')).toBeVisible();
    
    // Form should be hidden
    await expect(page.getByRole('heading', { name: 'Add New Volunteer' })).not.toBeVisible();
  });

  test('should track event attendance', async ({ page }) => {
    // Ensure we have an event
    const hasEvents = await page.locator('tbody tr').count() > 0;
    if (!hasEvents) {
      test.skip();
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
    const attendanceSection = page.locator('div').filter({ hasText: 'Event Attendance' }).locator('..');
    await expect(attendanceSection).toBeVisible();
    
    // Wait for content to load
    await page.waitForFunction(() => {
      const section = document.querySelector('div:has(h3:has-text("Event Attendance"))');
      if (!section) return false;
      return section.querySelector('tbody tr') !== null || 
             section.textContent?.match(/No attendees|No registrations/i) || false;
    });
    
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
      await expect(attendanceSection.getByText(/No attendees|No registrations/i)).toBeVisible();
    }
  });

  test('should update marketing content', async ({ page }) => {
    // Create event with marketing content
    await page.getByRole('button', { name: 'Create Event' }).click();
    const eventName = `Marketing Update Test ${Date.now()}`;
    await page.getByRole('textbox', { name: 'Event Name *' }).fill(eventName);
    await page.getByRole('textbox', { name: 'Start Date & Time *' }).fill('2025-11-15T18:00');
    await page.getByRole('textbox', { name: 'End Date & Time *' }).fill('2025-11-15T20:00');
    await page.locator('form').getByRole('button', { name: 'Create Event' }).click();
    
    // Go to the new event
    await page.getByText(eventName).click();
    
    // Add initial marketing content
    await page.getByRole('button', { name: 'Marketing' }).first().click();
    await page.getByRole('button', { name: 'Add Marketing Content' }).click();
    await page.getByLabel('Title *').fill('Initial Content');
    await page.getByLabel('Content *').fill('This is the initial marketing content');
    await page.getByRole('button', { name: 'Save Content' }).click();
    
    // Wait for content to appear
    await expect(page.getByText('Initial Content')).toBeVisible();
    
    // Edit the content
    await page.getByRole('button', { name: 'Edit Content' }).click();
    
    // Update the content
    await page.getByLabel('Title *').fill('Updated Marketing Content');
    await page.getByLabel('Content *').fill('This content has been updated with new information');
    await page.getByLabel('Call to Action').fill('Learn More');
    
    // Save changes
    await page.getByRole('button', { name: 'Update Content' }).click();
    
    // Verify updates
    await expect(page.getByText('Updated Marketing Content')).toBeVisible();
    await expect(page.getByText('This content has been updated')).toBeVisible();
    await expect(page.getByText('Learn More')).toBeVisible();
  });

  test('should handle volunteer removal', async ({ page }) => {
    // Go to an event with volunteers
    const eventRows = page.locator('tbody tr');
    let foundEventWithVolunteers = false;
    
    // Find an event with volunteers
    const eventCount = await eventRows.count();
    for (let i = 0; i < eventCount; i++) {
      await eventRows.nth(i).getByRole('button', { name: 'View Details' }).click();
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
    
    if (!foundEventWithVolunteers) {
      test.skip();
      return;
    }
    
    // Count initial volunteers
    const volunteerRows = page.locator('tbody tr');
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
    const hasEvents = await page.locator('tbody tr').count() > 0;
    if (!hasEvents) {
      test.skip();
      return;
    }
    
    await page.getByRole('button', { name: 'View Details' }).first().click();
    await page.getByRole('button', { name: /Volunteers \(\d+\)/ }).click();
    
    // Open volunteer form
    await page.getByRole('button', { name: 'Add Volunteer' }).click();
    
    // Try to submit without required fields
    await page.locator('form').getByRole('button', { name: 'Add Volunteer' }).click();
    
    // Form should still be open
    await expect(page.getByRole('heading', { name: 'Add New Volunteer' })).toBeVisible();
    
    // Submit button should be disabled initially
    const submitButton = page.locator('form').getByRole('button', { name: 'Add Volunteer' });
    await expect(submitButton).toBeDisabled();
    
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
    const hasEvents = await page.locator('tbody tr').count() > 0;
    if (!hasEvents) {
      test.skip();
      return;
    }
    
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
    
    // Percentage should be shown for check-ins
    const percentageMatch = await page.getByText(/\d+%/).isVisible().catch(() => false);
    expect(percentageMatch).toBeTruthy();
  });

  test('should handle marketing content with long text', async ({ page }) => {
    // Create new event
    await page.getByRole('button', { name: 'Create Event' }).click();
    const eventName = `Long Content Test ${Date.now()}`;
    await page.getByRole('textbox', { name: 'Event Name *' }).fill(eventName);
    await page.getByRole('textbox', { name: 'Start Date & Time *' }).fill('2025-10-01T10:00');
    await page.getByRole('textbox', { name: 'End Date & Time *' }).fill('2025-10-01T12:00');
    await page.locator('form').getByRole('button', { name: 'Create Event' }).click();
    
    // Go to the event
    await page.getByText(eventName).click();
    await page.getByRole('button', { name: 'Marketing' }).first().click();
    
    // Add marketing content with long text
    await page.getByRole('button', { name: 'Add Marketing Content' }).click();
    
    const longContent = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(20);
    await page.getByLabel('Title *').fill('Extended Marketing Campaign');
    await page.getByLabel('Content *').fill(longContent);
    
    // Save
    await page.getByRole('button', { name: 'Save Content' }).click();
    
    // Content should be displayed (possibly truncated)
    await expect(page.getByText('Extended Marketing Campaign')).toBeVisible();
    
    // At least part of the content should be visible
    await expect(page.getByText(/Lorem ipsum/)).toBeVisible();
  });
});