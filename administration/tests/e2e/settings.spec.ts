import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to settings page
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
    
    // Wait for integration buttons to be visible
    await expect(page.getByRole('button', { name: 'Configure Eventbrite' })).toBeVisible();
  });

  test('should display all integration sections', async ({ page }) => {
    // Check for integration buttons
    await expect(page.getByRole('button', { name: 'Configure Eventbrite' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Configure Patreon' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Configure Klaviyo' })).toBeVisible();
    
    // Check for email templates section
    await expect(page.getByRole('heading', { name: 'Email Templates' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Template' })).toBeVisible();
  });

  test('should display existing email templates', async ({ page }) => {
    // Wait for email templates heading to be visible
    await expect(page.getByRole('heading', { name: 'Email Templates' })).toBeVisible();
    
    // Check for default templates
    await expect(page.getByText('Welcome Email')).toBeVisible();
    await expect(page.getByText('Event Reminder')).toBeVisible();
    await expect(page.getByText('Follow-up')).toBeVisible();
    
    // Each template should have edit and delete buttons
    const welcomeTemplate = page.locator('.bg-white').filter({ hasText: 'Welcome Email' });
    await expect(welcomeTemplate).toBeVisible();
    await expect(welcomeTemplate.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(welcomeTemplate.getByRole('button', { name: 'Delete' })).toBeVisible();
  });

  test('should open email template editor when edit is clicked', async ({ page }) => {
    // Wait for Welcome Email template to be visible
    await expect(page.getByText('Welcome Email')).toBeVisible();
    
    // Click edit on Welcome Email template
    const welcomeTemplate = page.locator('.bg-white').filter({ hasText: 'Welcome Email' });
    await expect(welcomeTemplate).toBeVisible();
    await welcomeTemplate.getByRole('button', { name: 'Edit' }).click();
    
    // Modal should open with template editor
    await expect(page.getByRole('heading', { name: 'Edit Email Template' })).toBeVisible();
    
    // Form fields should be visible and pre-filled
    const templateNameField = page.getByLabel('Template Name *');
    await expect(templateNameField).toBeVisible();
    await expect(templateNameField).toHaveValue('Welcome Email');
    
    const subjectField = page.getByLabel('Subject Line *');
    await expect(subjectField).toBeVisible();
    await expect(subjectField).not.toHaveValue('');
    
    const bodyField = page.getByLabel('Email Body *');
    await expect(bodyField).toBeVisible();
    await expect(bodyField).not.toHaveValue('');
    
    // Should show available variables
    await expect(page.getByText('Available variables:')).toBeVisible();
    await expect(page.getByText('{{first_name}}')).toBeVisible();
    await expect(page.getByText('{{last_name}}')).toBeVisible();
    await expect(page.getByText('{{preferred_name}}')).toBeVisible();
    await expect(page.getByText('{{email}}')).toBeVisible();
    
    // Cancel should close modal
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Email Template' })).not.toBeVisible();
  });

  test('should update email template', async ({ page }) => {
    // Wait for Follow-up template to be visible
    await expect(page.getByText('Follow-up')).toBeVisible();
    
    // Edit the Follow-up template
    const followUpTemplate = page.locator('.bg-white').filter({ hasText: 'Follow-up' });
    await expect(followUpTemplate).toBeVisible();
    await followUpTemplate.getByRole('button', { name: 'Edit' }).click();
    
    // Wait for modal to open
    await expect(page.getByRole('heading', { name: 'Edit Email Template' })).toBeVisible();
    
    // Update the subject line
    const timestamp = Date.now();
    const newSubject = `Updated Follow-up - ${timestamp}`;
    const subjectField = page.getByLabel('Subject Line *');
    await expect(subjectField).toBeVisible();
    await subjectField.fill(newSubject);
    
    // Save changes
    await page.getByRole('button', { name: 'Save Template' }).click();
    
    // Modal should close
    await expect(page.getByRole('heading', { name: 'Edit Email Template' })).not.toBeVisible();
    
    // Updated subject should be visible in the template list
    await expect(page.getByText(newSubject)).toBeVisible();
  });

  test('should create new email template', async ({ page }) => {
    // Click Add Template button
    await page.getByRole('button', { name: 'Add Template' }).click();
    
    // Modal should open
    await expect(page.getByRole('heading', { name: 'Create Email Template' })).toBeVisible();
    
    // Fill out the form
    const timestamp = Date.now();
    const templateName = `Test Template ${timestamp}`;
    await page.getByLabel('Template Name *').fill(templateName);
    await page.getByLabel('Subject Line *').fill(`Test Subject ${timestamp}`);
    await page.getByLabel('Email Body *').fill(`Hi {{first_name}},\n\nThis is a test template created at ${timestamp}.\n\nBest regards,\nThe Team`);
    
    // Save the template
    await page.getByRole('button', { name: 'Create Template' }).click();
    
    // Modal should close
    await expect(page.getByRole('heading', { name: 'Create Email Template' })).not.toBeVisible();
    
    // New template should appear in the list
    await expect(page.getByText(templateName)).toBeVisible();
    
    // Should have edit and delete buttons
    const newTemplate = page.locator('.bg-white').filter({ hasText: templateName });
    await expect(newTemplate.getByRole('button', { name: 'Edit' })).toBeVisible();
    await expect(newTemplate.getByRole('button', { name: 'Delete' })).toBeVisible();
  });

  test('should delete email template with confirmation', async ({ page }) => {
    // First create a template to delete
    await page.getByRole('button', { name: 'Add Template' }).click();
    const timestamp = Date.now();
    const templateName = `Delete Test ${timestamp}`;
    await page.getByLabel('Template Name *').fill(templateName);
    await page.getByLabel('Subject Line *').fill('To be deleted');
    await page.getByLabel('Email Body *').fill('This template will be deleted');
    await page.getByRole('button', { name: 'Create Template' }).click();
    
    // Wait for modal to close and template to appear
    await expect(page.getByRole('heading', { name: 'Create Email Template' })).not.toBeVisible();
    await expect(page.getByText(templateName)).toBeVisible();
    
    // Setup dialog handler
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('Are you sure you want to delete');
      dialog.accept();
    });
    
    // Click delete on the new template
    const templateToDelete = page.locator('.bg-white').filter({ hasText: templateName });
    await templateToDelete.getByRole('button', { name: 'Delete' }).click();
    
    // Template should be removed from the list
    await expect(page.getByText(templateName)).not.toBeVisible();
  });

  test('should validate required fields in template form', async ({ page }) => {
    // Click Add Template
    await page.getByRole('button', { name: 'Add Template' }).click();
    
    // Try to save without filling fields
    await page.getByRole('button', { name: 'Create Template' }).click();
    
    // Form should still be open (validation prevents submission)
    await expect(page.getByRole('heading', { name: 'Create Email Template' })).toBeVisible();
    
    // Fill only name and try again
    await page.getByLabel('Template Name *').fill('Incomplete Template');
    await page.getByRole('button', { name: 'Create Template' }).click();
    
    // Should still be open
    await expect(page.getByRole('heading', { name: 'Create Email Template' })).toBeVisible();
  });

  test('should preview template variables in editor', async ({ page }) => {
    // Edit a template
    const welcomeTemplate = page.locator('.bg-white').filter({ hasText: 'Welcome Email' });
    await welcomeTemplate.getByRole('button', { name: 'Edit' }).click();
    
    // Check that the body contains template variables
    const bodyField = page.getByLabel('Email Body *');
    const bodyContent = await bodyField.inputValue();
    
    // Should contain template variables
    expect(bodyContent).toContain('{{first_name}}');
    
    // Verify variables list is helpful
    await expect(page.getByText('Available variables:')).toBeVisible();
    const variablesList = page.locator('text=Available variables:').locator('..');
    await expect(variablesList).toContainText('{{first_name}}');
    await expect(variablesList).toContainText('{{preferred_name || first_name}}');
  });

  test('should open integration configuration modals', async ({ page }) => {
    // Test Eventbrite configuration
    await page.getByRole('button', { name: 'Configure Eventbrite' }).click();
    await expect(page.getByRole('heading', { name: 'Configure Eventbrite Integration' })).toBeVisible();
    await expect(page.getByLabel('API Key')).toBeVisible();
    await expect(page.getByLabel('Organization ID')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Configure Eventbrite Integration' })).not.toBeVisible();
    
    // Test Patreon configuration
    await page.getByRole('button', { name: 'Configure Patreon' }).click();
    await expect(page.getByRole('heading', { name: 'Configure Patreon Integration' })).toBeVisible();
    await expect(page.getByLabel('Access Token')).toBeVisible();
    await expect(page.getByLabel('Campaign ID')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Configure Patreon Integration' })).not.toBeVisible();
    
    // Test Klaviyo configuration
    await page.getByRole('button', { name: 'Configure Klaviyo' }).click();
    await expect(page.getByRole('heading', { name: 'Configure Klaviyo Integration' })).toBeVisible();
    await expect(page.getByLabel('API Key')).toBeVisible();
    await expect(page.getByLabel('List ID')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: 'Configure Klaviyo Integration' })).not.toBeVisible();
  });

  test('should handle long template content', async ({ page }) => {
    // Create a template with long content
    await page.getByRole('button', { name: 'Add Template' }).click();
    
    const longContent = 'Lorem ipsum dolor sit amet, '.repeat(50);
    await page.getByLabel('Template Name *').fill('Long Content Template');
    await page.getByLabel('Subject Line *').fill('Test Long Content');
    await page.getByLabel('Email Body *').fill(longContent);
    
    // Save the template
    await page.getByRole('button', { name: 'Create Template' }).click();
    
    // Should handle long content gracefully
    await expect(page.getByText('Long Content Template')).toBeVisible();
    
    // Edit to verify content was saved
    const longTemplate = page.locator('.bg-white').filter({ hasText: 'Long Content Template' });
    await longTemplate.getByRole('button', { name: 'Edit' }).click();
    
    const savedContent = await page.getByLabel('Email Body *').inputValue();
    expect(savedContent).toBe(longContent);
    
    // Cleanup
    await page.getByRole('button', { name: 'Cancel' }).click();
  });
});