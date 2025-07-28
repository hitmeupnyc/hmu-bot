import { test, expect } from '@playwright/test';

test.describe('Member CRUD Operations', () => {
  test('should create a new member through the UI', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to members page
    await page.getByRole('link', { name: 'Members' }).click();
    
    // Click Add Member button
    await page.getByRole('button', { name: 'Add Member' }).click();
    
    // Modal should open
    await expect(page.getByText('Add New Member')).toBeVisible();
    
    // Fill out the form
    await page.getByLabel('First Name *').fill('Alice');
    await page.getByLabel('Last Name *').fill('Johnson');
    await page.getByLabel('Preferred Name').fill('Ali');
    await page.getByLabel('Email *').fill('alice.johnson@example.com');
    await page.getByLabel('Pronouns').fill('she/they');
    await page.getByLabel('Sponsor Notes').fill('Test member created via UI');
    await page.getByLabel('Professional Affiliate').check();
    
    // Submit the form
    await page.getByRole('button', { name: 'Create Member' }).click();
    
    // Modal should close and member should appear in the list
    await expect(page.getByText('Add New Member')).not.toBeVisible();
    await expect(page.getByText('Ali (Alice) Johnson')).toBeVisible();
    await expect(page.getByText('alice.johnson@example.com')).toBeVisible();
    await expect(page.getByText('she/they')).toBeVisible();
    
    // Should show both Active and Professional badges for Alice
    const aliceRow = page.locator('tr', { hasText: 'Ali (Alice) Johnson' });
    await expect(aliceRow.getByText('Active')).toBeVisible();
    await expect(aliceRow.getByText('Professional')).toBeVisible();
  });

  test('should edit an existing member', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to members page
    await page.getByRole('link', { name: 'Members' }).click();
    
    // Find the first member row and click edit button
    const memberRow = page.locator('tbody tr').first();
    await memberRow.locator('button').first().click(); // Edit button
    
    // Modal should open with existing data
    await expect(page.getByText('Edit Member')).toBeVisible();
    
    // Update the email
    await page.getByLabel('Email *').fill('updated.email@example.com');
    
    // Submit the form
    await page.getByRole('button', { name: 'Update Member' }).click();
    
    // Modal should close and updated email should appear
    await expect(page.getByText('Edit Member')).not.toBeVisible();
    await expect(page.getByText('updated.email@example.com')).toBeVisible();
  });

  test('should search for members', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to members page
    await page.getByRole('link', { name: 'Members' }).click();
    
    // Use search
    await page.getByPlaceholder('Search members...').fill('Alice');
    
    // Should filter results - Alice should be visible
    await expect(page.getByText('Alice')).toBeVisible();
    
    // Johnny should not be visible when searching for Alice
    await expect(page.getByText('Johnny')).not.toBeVisible();
    
    // Clear search
    await page.getByPlaceholder('Search members...').fill('');
    
    // All members should be visible again
    await expect(page.getByText('Alice')).toBeVisible();
    await expect(page.getByText('Johnny')).toBeVisible();
  });

  test('should delete a member with confirmation', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to members page
    await page.getByRole('link', { name: 'Members' }).click();
    
    // Count initial members
    const initialRows = await page.locator('tbody tr').count();
    
    // Setup dialog handler to accept confirmation
    page.on('dialog', dialog => dialog.accept());
    
    // Find a member row and click delete button (second button)
    const memberRow = page.locator('tbody tr').last();
    await memberRow.locator('button').last().click(); // Delete button
    
    // Should have one fewer member
    await expect(page.locator('tbody tr')).toHaveCount(initialRows - 1);
  });
});