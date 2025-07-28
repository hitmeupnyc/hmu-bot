import { test, expect } from '@playwright/test';

test.describe('Member CRUD Operations', () => {
  test('should submit public application form', async ({ page }) => {
    // Add debugging
    page.on('response', response => {
      if (response.url().includes('/api/applications')) {
        console.log('API Response:', response.status(), response.url());
      }
    });
    
    await page.goto('/apply');
    
    // Fill out basic information with unique email
    const timestamp = Date.now();
    await page.getByLabel('Your Name *').fill('Jane Smith');
    await page.getByLabel('Pronouns').fill('she/her');
    await page.getByLabel('Preferred Name').fill('Janie');
    await page.getByLabel('Email Address *').fill(`jane.smith.${timestamp}@example.com`);
    await page.getByLabel('Birth Year *').fill('1990');
    
    // Fill out social media URLs (optional)
    await page.getByLabel('Primary URL').fill('https://fetlife.com/users/janesmith');
    
    // Fill out referral information
    await page.getByLabel('Referral Source *').selectOption('Friend/Word of mouth');
    
    // Fill out sponsor information
    await page.getByLabel('Sponsor Name *').fill('Alice Johnson');
    await page.getByLabel('Can you ask your sponsor to email us directly? *').check();
    
    // Fill out experience questionnaires
    await page.getByLabel('Describe your experience with kinky/sexy events *').fill('I have attended several community events and am familiar with kink practices.');
    await page.getByLabel('Tell us about yourself *').fill('I am a creative professional interested in exploring the community.');
    await page.getByLabel('Describe your understanding of consent *').fill('Consent is ongoing, enthusiastic agreement that can be withdrawn at any time.');
    
    // Optional additional info
    await page.getByLabel('Additional Information (Optional)').fill('Looking forward to learning more about the community.');
    
    // Consent policy agreement
    await page.getByLabel('Yes! I agree to the consent policy').check();
    
    // Submit the form
    await page.getByRole('button', { name: 'Submit Application' }).click();
    
    // Wait a bit for the submission to process
    await page.waitForTimeout(2000);
    
    // Check what's on the page now
    const pageContent = await page.textContent('body');
    console.log('Page content after submission:', pageContent?.substring(0, 500));
    
    // Should show success message
    await expect(page.getByRole('heading', { name: 'Application Submitted!' })).toBeVisible();
  });

  test('should validate required fields in application form', async ({ page }) => {
    await page.goto('/apply');
    
    // Fill in some fields but leave required ones empty to trigger custom validation
    await page.getByLabel('Pronouns').fill('they/them');
    await page.getByLabel('Preferred Name').fill('Test');
    
    // Try to submit without filling required fields
    await page.getByRole('button', { name: 'Submit Application' }).click();
    
    // Should show validation errors (either HTML5 or custom)
    // Check for HTML5 validation first, then fallback to custom validation
    const nameField = page.getByLabel('Your Name *');
    const emailField = page.getByLabel('Email Address *');
    
    // If HTML5 validation is shown, these fields should be focused or have validation states
    const nameInvalid = await nameField.evaluate(el => (el as HTMLInputElement).validity.valid === false);
    const emailInvalid = await emailField.evaluate(el => (el as HTMLInputElement).validity.valid === false);
    
    // Expect that validation prevents submission
    expect(nameInvalid || emailInvalid).toBe(true);
    
    // Check that we're still on the form page (not redirected to success)
    await expect(page.getByRole('heading', { name: 'HMU NYC Application' })).toBeVisible();
  });

  test('should show conditional fields based on referral source', async ({ page }) => {
    await page.goto('/apply');
    
    // Select 'Other' as referral source
    await page.getByLabel('Referral Source *').selectOption('Other');
    
    // Should show explanation field
    await expect(page.getByLabel('Please explain how you heard about us *')).toBeVisible();
    
    // Select 'Event attendee' as referral source
    await page.getByLabel('Referral Source *').selectOption('Event attendee');
    
    // Should show event name field
    await expect(page.getByLabel('Which event did you attend? *')).toBeVisible();
  });

  test('should validate age requirement', async ({ page }) => {
    await page.goto('/apply');
    
    // Fill required fields but use underage birth year
    const currentYear = new Date().getFullYear();
    const underageYear = currentYear - 20;
    const timestamp = Date.now();
    
    await page.getByLabel('Your Name *').fill('Test User');
    await page.getByLabel('Email Address *').fill(`test.${timestamp}@example.com`);
    
    // Remove HTML5 max constraint temporarily and fill the underage year
    await page.getByLabel('Birth Year *').evaluate((input) => {
      (input as HTMLInputElement).removeAttribute('max');
    });
    await page.getByLabel('Birth Year *').fill(underageYear.toString());
    
    await page.getByLabel('Referral Source *').selectOption('Friend/Word of mouth');
    await page.getByLabel('Sponsor Name *').fill('Test Sponsor');
    await page.getByLabel('Can you ask your sponsor to email us directly? *').check();
    await page.getByLabel('Describe your experience with kinky/sexy events *').fill('Test experience');
    await page.getByLabel('Tell us about yourself *').fill('Test description');
    await page.getByLabel('Describe your understanding of consent *').fill('Test consent understanding');
    await page.getByLabel('Yes! I agree to the consent policy').check();
    
    // Try to submit with underage birth year
    await page.getByRole('button', { name: 'Submit Application' }).click();
    
    // Should show age validation error
    await expect(page.getByText('You must be 21 or older to apply')).toBeVisible();
  });
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