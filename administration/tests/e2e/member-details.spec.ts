import { test, expect } from '@playwright/test';

test.describe('Member Details Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to members page and wait for full load
    await page.goto('/members', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
    
    // Wait for members table to load with data
    await expect(page.locator('tbody')).toBeVisible();
    
    // Wait for at least one member row to be visible
    await page.waitForFunction(() => {
      const rows = document.querySelectorAll('tbody tr');
      return rows.length > 0 && rows[0].querySelector('a') !== null;
    });
    
    await expect(page.locator('tbody tr').first()).toBeVisible();
    await expect(page.locator('tbody tr').first().locator('a')).toBeVisible();
  });

  test('should display member profile information', async ({ page }) => {
    // Click on the first member's name to go to details
    const firstMemberRow = page.locator('tbody tr').first();
    const memberName = await firstMemberRow.locator('td').first().textContent();
    
    // Click on member name link
    await firstMemberRow.locator('a').first().click();
    
    // Wait for member details page to load
    await expect(page.getByTestId('member-name-heading')).toContainText(memberName || '');
    
    // Verify basic member information is displayed
    await expect(page.locator('dt').filter({ hasText: 'Email' })).toBeVisible();
    await expect(page.locator('dt').filter({ hasText: 'Status' })).toBeVisible();
    await expect(page.locator('dt').filter({ hasText: 'Member Since' })).toBeVisible();
    
    // Verify action buttons
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send Email' })).toBeVisible();
    await expect(page.getByTestId('back-to-members-btn')).toBeVisible();
  });

  test('should navigate back to members list', async ({ page }) => {
    // Go to first member details
    await page.locator('tbody tr').first().locator('a').first().click();
    await expect(page.getByTestId('back-to-members-btn')).toBeVisible();
    
    // Click back button
    await page.getByTestId('back-to-members-btn').click();
    
    // Should be back on members page
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Member' })).toBeVisible();
  });

  test('should display audit log section', async ({ page }) => {
    // Go to first member details
    await page.locator('tbody tr').first().locator('a').first().click();
    
    // Wait for member details page to load
    await expect(page.getByTestId('back-to-members-btn')).toBeVisible();
    
    // Check for notes section
    await expect(page.getByRole('heading', { name: 'Notes' })).toBeVisible();
    
    // Check for add note form
    await expect(page.getByTestId('member-note-textarea')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Note' })).toBeVisible();
  });

  test('should add a note to member profile', async ({ page }) => {
    // Go to first member details
    await page.locator('tbody tr').first().locator('a').first().click();
    
    // Wait for member details page to load
    await expect(page.getByTestId('back-to-members-btn')).toBeVisible();
    await expect(page.getByTestId('member-note-textarea')).toBeVisible();
    
    // Add a note
    const noteText = `Test note added at ${Date.now()}`;
    await page.getByTestId('member-note-textarea').fill(noteText);
    await page.getByRole('button', { name: 'Add Note' }).click();
    
    // Wait for note to appear in activity log
    await expect(page.getByText(noteText)).toBeVisible();
    
    // Note form should be cleared
    await expect(page.getByTestId('member-note-textarea')).toHaveValue('');
  });

  test('should open edit member modal from details page', async ({ page }) => {
    // Go to first member details
    await page.locator('tbody tr').first().locator('a').first().click();
    
    // Click Edit Member button
    await page.getByRole('button', { name: 'Edit' }).click();
    
    // Modal should open
    await expect(page.getByRole('heading', { name: 'Edit Member' })).toBeVisible();
    
    // Form fields should be pre-filled
    const firstNameField = page.getByLabel('First Name *');
    await expect(firstNameField).not.toHaveValue('');
    
    // Cancel button should close modal
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Member' })).not.toBeVisible();
  });

  test('should update member information', async ({ page }) => {
    // Go to first member details
    await page.locator('tbody tr').first().locator('a').first().click();
    
    // Wait for member details page to load
    await expect(page.getByTestId('back-to-members-btn')).toBeVisible();
    
    // Click Edit Member button
    await page.getByRole('button', { name: 'Edit' }).click();
    
    // Modal should open
    await expect(page.getByRole('heading', { name: 'Edit Member' })).toBeVisible();
    
    // Update pronouns field (add new pronouns)
    const newPronouns = `they/them-${Date.now()}`;
    await page.getByLabel('Pronouns').fill(newPronouns);
    
    // Submit form
    await page.getByRole('button', { name: 'Update Member' }).click();
    
    // Modal should close
    await expect(page.getByRole('heading', { name: 'Edit Member' })).not.toBeVisible();
    
    // Updated pronouns should be visible on the page
    await expect(page.getByText(newPronouns)).toBeVisible();
  });

  test('should show email modal with templates', async ({ page }) => {
    // Go to first member details
    await page.locator('tbody tr').first().locator('a').first().click();
    
    // Click Send Email button
    await page.getByRole('button', { name: 'Send Email' }).click();
    
    // Email modal should open
    await expect(page.getByRole('heading', { name: 'Send Email' })).toBeVisible();
    
    // Template dropdown should be visible
    await expect(page.getByLabel('Choose Template (Optional)')).toBeVisible();
    
    // Subject and body fields should be visible
    await expect(page.getByLabel('Subject')).toBeVisible();
    await expect(page.getByLabel('Message')).toBeVisible();
    
    // Select a template
    await page.getByLabel('Choose Template (Optional)').selectOption('welcome');
    
    // Subject and body should be populated
    await expect(page.getByLabel('Subject')).not.toHaveValue('');
    await expect(page.getByLabel('Message')).not.toHaveValue('');
    
    // Cancel should close modal
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Send Email' })).not.toBeVisible();
  });

  test('should handle delete member with confirmation', async ({ page }) => {
    // Create a test member first to avoid deleting important data
    await page.goto('/members');
    await page.getByRole('button', { name: 'Add Member' }).click();
    
    const timestamp = Date.now();
    const testEmail = `delete-test-${timestamp}@example.com`;
    await page.getByLabel('First Name *').fill('Delete');
    await page.getByLabel('Last Name *').fill('Test');
    await page.getByLabel('Email *').fill(testEmail);
    await page.getByRole('button', { name: 'Create Member' }).click();
    
    // Wait for modal to close and member to appear
    await expect(page.getByText('Add New Member')).not.toBeVisible();
    await expect(page.getByText(testEmail)).toBeVisible();
    
    // Click on the newly created member
    const memberRow = page.locator('tr', { hasText: testEmail });
    await memberRow.locator('a').first().click();
    
    // Setup dialog handler to accept confirmation
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('Are you sure you want to delete');
      dialog.accept();
    });
    
    // Click Delete Member button
    await page.getByRole('button', { name: 'Delete' }).click();
    
    // Should redirect to members page after deletion
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
    
    // Member should no longer exist
    await expect(page.getByText(testEmail)).not.toBeVisible();
  });

  test('should display member flags correctly', async ({ page }) => {
    // Wait for active members to be visible
    await expect(page.locator('tbody tr').first()).toBeVisible();
    
    // Find a member with flags (Active/Professional)
    const activeRow = page.locator('tbody tr').filter({ hasText: 'Active' }).first();
    
    // If no active members, skip this test
    const activeCount = await activeRow.count();
    if (activeCount === 0) {
      test.skip();
      return;
    }
    
    // Wait for the active member row to be visible
    await expect(activeRow).toBeVisible();
    
    // Click on the active member
    await activeRow.locator('a').first().click();
    
    // Wait for details page to load using data-testid
    await expect(page.getByTestId('back-to-members-btn')).toBeVisible();
    
    // Should show member status badges
    await expect(page.getByText('Active', { exact: true })).toBeVisible();
    
    // Status badges should be displayed (contains access level info)
    await expect(page.getByText('Active', { exact: true })).toBeVisible();
    
    // Check that access level badge is present (Member/Admin/Owner badges)
    const statusArea = page.locator('dt').filter({ hasText: 'Status' }).locator('..').locator('dd');
    const statusText = await statusArea.textContent();
    expect(statusText).toMatch(/Member|Admin|Owner/);
  });

  test('should handle empty notes gracefully', async ({ page }) => {
    // Go to first member details
    await page.locator('tbody tr').first().locator('a').first().click();
    
    // Wait for member details page to load
    await expect(page.getByTestId('back-to-members-btn')).toBeVisible();
    await expect(page.getByTestId('member-note-textarea')).toBeVisible();
    
    // Button should be disabled when note is empty
    const noteInput = page.getByTestId('member-note-textarea');
    await expect(noteInput).toHaveValue('');
    
    // Add Note button should be disabled when textarea is empty
    const addNoteButton = page.getByRole('button', { name: 'Add Note' });
    await expect(addNoteButton).toBeDisabled();
    
    // Fill and clear to test
    await noteInput.fill('test');
    await expect(addNoteButton).toBeEnabled();
    await noteInput.clear();
    await expect(addNoteButton).toBeDisabled();
  });
});