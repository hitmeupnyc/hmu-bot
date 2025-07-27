import { test, expect } from '@playwright/test';

test.describe('Club Management System', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page title contains our app name
    await expect(page).toHaveTitle(/Club Management System/);
    
    // Check that the main heading is visible
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    
    // Check that the sidebar navigation is present
    await expect(page.getByText('Club Management')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Members' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Events' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
  });

  test('should navigate to members page', async ({ page }) => {
    await page.goto('/');
    
    // Click on Members link
    await page.getByRole('link', { name: 'Members' }).click();
    
    // Should be on members page
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Member' })).toBeVisible();
    await expect(page.getByPlaceholder('Search members...')).toBeVisible();
  });

  test('should navigate to events page', async ({ page }) => {
    await page.goto('/');
    
    // Click on Events link  
    await page.getByRole('link', { name: 'Events' }).click();
    
    // Should be on events page
    await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Event' })).toBeVisible();
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/');
    
    // Click on Settings link
    await page.getByRole('link', { name: 'Settings' }).click();
    
    // Should be on settings page
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Configure Eventbrite' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Configure Patreon' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Configure Klaviyo' })).toBeVisible();
  });
});