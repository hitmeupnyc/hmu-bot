import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard without waiting for networkidle
    await page.goto('/');
    
    // Wait for the main heading to ensure page is loaded
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    
    // Wait for at least one statistic to load (not show '--')
    await expect(page.getByTestId('stat-total-members-value')).not.toHaveText('--');
  });

  test('should display all statistics cards', async ({ page }) => {
    // Check for all statistic cards
    await expect(page.getByTestId('stat-total-members')).toBeVisible();
    await expect(page.getByTestId('stat-active-members')).toBeVisible();
    await expect(page.getByTestId('stat-upcoming-events')).toBeVisible();
    await expect(page.getByTestId('stat-professional-affiliates')).toBeVisible();
    
    // Statistics should show numbers (not loading placeholders)
    const totalMembersValue = await page.getByTestId('stat-total-members-value').textContent();
    expect(totalMembersValue).not.toBe('--');
    expect(totalMembersValue).toMatch(/^\d+$/);
    
    // Active members should be a number
    const activeMembersValue = await page.getByTestId('stat-active-members-value').textContent();
    expect(activeMembersValue).not.toBe('--');
    expect(activeMembersValue).toMatch(/^\d+$/);
    
    // All statistics should be numbers
    const statsValues = await page.locator('[data-testid$="-value"]').allTextContents();
    statsValues.forEach(value => {
      expect(value).not.toBe('--');
      expect(value).toMatch(/^\d+$/);
    });
  });

  test('should display recent members section', async ({ page }) => {
    // Check for recent members section
    await expect(page.getByRole('heading', { name: 'Recent Members' })).toBeVisible();
    
    // Should have a table with member information
    const recentMembersSection = page.locator('div').filter({ hasText: 'Recent Members' }).locator('..');
    const memberRows = recentMembersSection.locator('tbody tr');
    
    // Should show up to 5 recent members
    const rowCount = await memberRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(0);
    expect(rowCount).toBeLessThanOrEqual(5);
    
    // If there are members, check the structure
    if (rowCount > 0) {
      // First member should have name, email, and join date
      const firstRow = memberRows.first();
      await expect(firstRow.locator('td').first()).not.toBeEmpty();
      await expect(firstRow.getByRole('link')).toBeVisible(); // Name should be a link
    }
  });


  test('should display upcoming events section', async ({ page }) => {
    // Check for upcoming events section - use more specific selector to avoid duplicates
    await expect(page.getByRole('heading', { name: 'Upcoming Events' }).nth(1)).toBeVisible();
    
    // Check the second Upcoming Events section (not the stats card)
    const upcomingEventsSection = page.locator('.bg-white').filter({ hasText: 'Upcoming Events' }).nth(1);
    await expect(upcomingEventsSection).toBeVisible();
    
    // Check if there's content (either events or "No events" message)
    const hasNoEvents = await upcomingEventsSection.getByText('No events scheduled.').isVisible().catch(() => false);
    
    if (!hasNoEvents) {
      // Should show event entries
      const eventEntries = upcomingEventsSection.locator('.border-l-4');
      const eventCount = await eventEntries.count();
      expect(eventCount).toBeGreaterThan(0);
    }
  });

  // Skip this test - Recent Members section doesn't have links to member details
  // The recent members display doesn't include clickable links to navigate to member pages
  test('should navigate to members page from recent members', async ({ page }) => {
    // Wait for recent members section by finding the heading
    const recentMembersHeading = page.getByRole('heading', { name: 'Recent Members' });
    await expect(recentMembersHeading).toBeVisible();
    
    // Get the parent section that contains the heading and member list
    const recentMembersSection = recentMembersHeading.locator('..');
    
    // Find all links within the section (member name links)
    const memberLinks = recentMembersSection.getByRole('link');
    
    // Wait for at least one member link to be visible
    await expect(memberLinks.first()).toBeVisible();
    
    // Get the member name and click the link
    const memberName = await memberLinks.first().textContent();
    await memberLinks.first().click();
    
    // Should navigate to member details page
    await page.waitForLoadState('networkidle');
    // The heading will show the preferred name (first word from the link text)
    const preferredName = memberName?.split(' ')[0] || '';
    await expect(page.getByRole('heading', { level: 1 }).filter({ hasText: preferredName })).toBeVisible();
    // Check for the back button (it's an icon button with data-testid)
    await expect(page.getByTestId('back-to-members-btn')).toBeVisible();
  });

  test('should show loading state initially', async ({ page }) => {
    // Intercept the members API to delay response
    await page.route('**/api/members**', async route => {
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.continue();
    });
    
    // Navigate to dashboard
    await page.goto('/');
    
    // Check for loading state immediately
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    
    // Statistics should show loading placeholder initially
    const totalMembersCard = page.locator('.bg-white').filter({ hasText: 'Total Members' });
    await expect(totalMembersCard).toBeVisible();
    
    // Check for loading indicator
    const statsValue = totalMembersCard.locator('.text-3xl');
    await expect(statsValue).toHaveText('--');
    
    // Wait for actual value to load
    await expect(statsValue).not.toHaveText('--');
    const loadedValue = await statsValue.textContent();
    expect(loadedValue).toMatch(/^\d+$/);
  });

  test('should update statistics when data changes', async ({ page }) => {
    // Get initial total members count using data-testid
    const totalMembersValue = page.getByTestId('stat-total-members-value');
    await expect(totalMembersValue).not.toHaveText('--');
    const initialCount = await totalMembersValue.textContent();
    
    // Navigate to members page and add a new member
    await page.getByRole('link', { name: 'Members' }).click();
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
    
    await page.getByRole('button', { name: 'Add Member' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Member' })).toBeVisible();
    
    const timestamp = Date.now();
    await page.getByLabel('First Name *').fill('Dashboard');
    await page.getByLabel('Last Name *').fill('Test');
    await page.getByLabel('Email *').fill(`dashboard-test-${timestamp}@example.com`);
    await page.getByRole('button', { name: 'Create Member' }).click();
    
    // Wait for modal to close and member to be created
    await expect(page.getByRole('heading', { name: 'Add New Member' })).not.toBeVisible();
    await expect(page.getByText(`dashboard-test-${timestamp}@example.com`)).toBeVisible();
    
    // Navigate back to dashboard
    await page.goto('/');
    
    // Wait for dashboard to load with updated data
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByTestId('stat-total-members-value')).not.toHaveText('--');
    await expect(totalMembersValue).not.toHaveText('--');
    
    // Total members count should be incremented
    const newCount = await totalMembersValue.textContent();
    expect(parseInt(newCount || '0')).toBe(parseInt(initialCount || '0') + 1);
  });

  test('should display all sections in correct layout', async ({ page }) => {
    // Check that all major sections are present and in order
    const headings = page.getByRole('heading', { level: 3 });
    
    // Get all section headings
    const headingTexts = await headings.allTextContents();
    
    // Should include these sections
    expect(headingTexts).toContain('Recent Members');
    expect(headingTexts).toContain('Upcoming Events');
    
    // Statistics grid should be at the top
    const statsGrid = page.locator('.grid').first();
    await expect(statsGrid).toBeVisible();
    
    // Should have 4 statistics cards in the grid
    const statCards = statsGrid.locator('.bg-white');
    await expect(statCards).toHaveCount(4);
  });

  test('should handle empty state gracefully', async ({ page }) => {
    // Even with no data, dashboard should display properly
    // Check that sections exist even if empty
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Recent Members' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Upcoming Events' }).nth(1)).toBeVisible();
    
    // Statistics should show 0 or appropriate empty state
    const statsValues = await page.locator('[data-testid$="-value"]').allTextContents();
    statsValues.forEach(value => {
      expect(value).toMatch(/^\d+$/); // Should be a number
    });
  });
});
