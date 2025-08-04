import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard and wait for initial load
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Wait for the main heading to ensure page is loaded
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    
    // Wait for statistics to load (they show '--' while loading)
    await page.waitForFunction(() => {
      const statsElements = document.querySelectorAll('[data-testid$="-value"]');
      return Array.from(statsElements).length >= 4 && 
             Array.from(statsElements).every(el => el.textContent !== '--');
    }, { timeout: 10000 });
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

  test('should display member breakdown by access level', async ({ page }) => {
    // Check for access level breakdown section
    await expect(page.getByRole('heading', { name: 'Members by Access Level' })).toBeVisible();
    
    // Should show access levels with counts
    const breakdownSection = page.locator('div').filter({ hasText: 'Members by Access Level' }).locator('..');
    
    // Wait for the breakdown section to be visible
    await expect(breakdownSection).toBeVisible();
    
    // Check for access level labels - wait for each one
    await expect(breakdownSection.getByText('Member')).toBeVisible();
    await expect(breakdownSection.getByText('Admin')).toBeVisible();
    await expect(breakdownSection.getByText('Owner')).toBeVisible();
    
    // Wait for and verify member count
    const memberCountElement = breakdownSection.locator('div').filter({ hasText: 'Member' }).locator('span').last();
    await expect(memberCountElement).toBeVisible();
    const memberCount = await memberCountElement.textContent();
    expect(memberCount).toMatch(/^\d+$/);
  });

  test('should display upcoming events section', async ({ page }) => {
    // Check for upcoming events section
    await expect(page.getByRole('heading', { name: 'Upcoming Events' })).toBeVisible();
    
    const upcomingEventsSection = page.locator('div').filter({ hasText: 'Upcoming Events' }).locator('..');
    await expect(upcomingEventsSection).toBeVisible();
    
    // Wait for content to load - either events or empty message
    await page.waitForFunction(() => {
      const section = document.querySelector('div:has(h2:has-text("Upcoming Events"))');
      if (!section) return false;
      return section.querySelector('.bg-gray-50') !== null || 
             section.textContent?.includes('No upcoming events') || false;
    });
    
    // Check if there are any upcoming events
    const hasNoEvents = await upcomingEventsSection.getByText('No upcoming events').isVisible().catch(() => false);
    
    if (!hasNoEvents) {
      // Should show event cards with details
      const eventCards = upcomingEventsSection.locator('.bg-gray-50');
      await expect(eventCards.first()).toBeVisible();
      const eventCount = await eventCards.count();
      expect(eventCount).toBeGreaterThan(0);
      
      // First event should have name, date, and capacity
      if (eventCount > 0) {
        const firstEvent = eventCards.first();
        await expect(firstEvent.locator('h4')).toBeVisible();
        await expect(firstEvent.locator('h4')).not.toBeEmpty();
        await expect(firstEvent.getByText(/\w+ \d+, \d{4}/)).toBeVisible();
        await expect(firstEvent.getByText(/Capacity:/)).toBeVisible();
      }
    }
  });

  test('should navigate to members page from recent members', async ({ page }) => {
    // Wait for recent members to load
    const recentMembersSection = page.locator('div').filter({ hasText: 'Recent Members' }).locator('..');
    const memberRows = recentMembersSection.locator('tbody tr');
    
    const rowCount = await memberRows.count();
    if (rowCount === 0) {
      test.skip();
      return;
    }
    
    // Click on first member name
    const firstMemberLink = memberRows.first().getByRole('link');
    const memberName = await firstMemberLink.textContent();
    await firstMemberLink.click();
    
    // Should navigate to member details page
    await expect(page.getByRole('heading', { level: 1 })).toContainText(memberName || '');
    await expect(page.getByRole('button', { name: 'Back to Members' })).toBeVisible();
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
    
    // Navigate back to dashboard with a fresh load to ensure cache is bypassed
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Wait for dashboard to load with updated data
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(totalMembersValue).not.toHaveText('--');
    
    // Total members count should be incremented
    const newCount = await totalMembersValue.textContent();
    expect(parseInt(newCount || '0')).toBe(parseInt(initialCount || '0') + 1);
  });

  test('should display all sections in correct layout', async ({ page }) => {
    // Check that all major sections are present and in order
    const headings = page.getByRole('heading', { level: 2 });
    
    // Get all section headings
    const headingTexts = await headings.allTextContents();
    
    // Should include these sections
    expect(headingTexts).toContain('Recent Members');
    expect(headingTexts).toContain('Members by Access Level');
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
    await expect(page.getByRole('heading', { name: 'Upcoming Events' })).toBeVisible();
    
    // Statistics should show 0 or appropriate empty state
    const statsValues = await page.locator('.text-3xl').allTextContents();
    statsValues.forEach(value => {
      expect(value).toMatch(/^\d+$/); // Should be a number
    });
  });
});