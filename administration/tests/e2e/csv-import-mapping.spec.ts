import { test, expect } from '@playwright/test';

test.describe('CSV Import Header Mapping', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to members page and open CSV import modal
    await page.goto('/members');
    await page.click('button:has-text("Import CSV")');
    await expect(page.locator('h2:has-text("Import Applications")')).toBeVisible();
  });

  test('should show mapping interface when headers do not match exactly', async ({ page }) => {
    // Paste sample TSV data with non-matching headers
    const sampleData = [
      'Full Name\tEmail Address\tAge\tHow did you hear about us\tSponsor\tSponsor OK\tExperience\tAbout Me\tConsent Info\tPolicy Agreement',
      'John Doe\tjohn@example.com\t1990\tFetlife\tJane Smith\ttrue\tI have experience\tI am friendly\tConsent is important\tyes'
    ].join('\n');

    await page.fill('textarea[placeholder*="Paste your data"]', sampleData);
    
    // Should show mapping interface
    await expect(page.locator('h3:has-text("Map Your Columns")')).toBeVisible();
    
    // Should show source headers on the left
    await expect(page.locator('[data-testid="source-headers"]')).toBeVisible();
    await expect(page.locator('text=Full Name')).toBeVisible();
    await expect(page.locator('text=Email Address')).toBeVisible();
    
    // Should show target headers on the right
    await expect(page.locator('[data-testid="target-headers"]')).toBeVisible();
    await expect(page.locator('text=Name')).toBeVisible();
    await expect(page.locator('text=Email')).toBeVisible();
    
    // Should show SVG connection area
    await expect(page.locator('[data-testid="mapping-svg"]')).toBeVisible();
  });

  test('should allow dragging from source to target headers', async ({ page }) => {
    // Paste sample data to trigger mapping interface
    const sampleData = [
      'Full Name\tEmail Address\tAge',
      'John Doe\tjohn@example.com\t1990'
    ].join('\n');

    await page.fill('textarea[placeholder*="Paste your data"]', sampleData);
    await expect(page.locator('h3:has-text("Map Your Columns")')).toBeVisible();

    // Get source and target elements
    const sourceHeader = page.locator('[data-testid="source-header"]:has-text("Full Name")');
    const targetHeader = page.locator('[data-testid="target-header"]:has-text("Name")');
    
    // Perform drag and drop
    await sourceHeader.dragTo(targetHeader);
    
    // Should create a connection line
    await expect(page.locator('[data-testid="connection-line"]')).toBeVisible();
    
    // Should show mapping in the interface
    await expect(page.locator('[data-testid="mapping-indicator"]')).toContainText('Full Name → Name');
  });

  test('should allow removing connections by dragging to empty space', async ({ page }) => {
    // Setup mapping interface
    const sampleData = [
      'Full Name\tEmail Address',
      'John Doe\tjohn@example.com'
    ].join('\n');

    await page.fill('textarea[placeholder*="Paste your data"]', sampleData);
    await expect(page.locator('h3:has-text("Map Your Columns")')).toBeVisible();

    // Create a connection first
    const sourceHeader = page.locator('[data-testid="source-header"]:has-text("Full Name")');
    const targetHeader = page.locator('[data-testid="target-header"]:has-text("Name")');
    await sourceHeader.dragTo(targetHeader);
    
    // Verify connection exists
    await expect(page.locator('[data-testid="connection-line"]')).toBeVisible();
    
    // Drag source header to empty space in SVG to remove connection
    const svgArea = page.locator('[data-testid="mapping-svg"]');
    await sourceHeader.dragTo(svgArea, { targetPosition: { x: 100, y: 100 } });
    
    // Connection should be removed
    await expect(page.locator('[data-testid="connection-line"]')).not.toBeVisible();
  });

  test('should handle multiple connections and prevent duplicate mappings', async ({ page }) => {
    // Setup with multiple headers
    const sampleData = [
      'Full Name\tEmail Address\tAge\tSource',
      'John Doe\tjohn@example.com\t1990\tFetlife'
    ].join('\n');

    await page.fill('textarea[placeholder*="Paste your data"]', sampleData);
    await expect(page.locator('h3:has-text("Map Your Columns")')).toBeVisible();

    // Create multiple connections
    await page.locator('[data-testid="source-header"]:has-text("Full Name")').dragTo(
      page.locator('[data-testid="target-header"]:has-text("Name")')
    );
    await page.locator('[data-testid="source-header"]:has-text("Email Address")').dragTo(
      page.locator('[data-testid="target-header"]:has-text("Email")')
    );
    
    // Should show multiple connection lines
    await expect(page.locator('[data-testid="connection-line"]')).toHaveCount(2);
    
    // Try to map a different source to the same target (should replace previous mapping)
    await page.locator('[data-testid="source-header"]:has-text("Age")').dragTo(
      page.locator('[data-testid="target-header"]:has-text("Name")')
    );
    
    // Should still have 2 lines, but Age should now be connected to Name
    await expect(page.locator('[data-testid="connection-line"]')).toHaveCount(2);
    await expect(page.locator('[data-testid="mapping-indicator"]')).toContainText('Age → Name');
  });

  test('should process data after mapping is complete', async ({ page }) => {
    // Setup mapping interface
    const sampleData = [
      'Full Name\tEmail Address\tBorn\tHow heard\tSponsor Name\tSponsor Email OK\tKinky Exp\tSelf Desc\tConsent Info\tPolicy OK',
      'John Doe\tjohn@example.com\t1990\tFetlife\tJane Smith\ttrue\tExperienced\tFriendly person\tConsent matters\tyes'
    ].join('\n');

    await page.fill('textarea[placeholder*="Paste your data"]', sampleData);
    await expect(page.locator('h3:has-text("Map Your Columns")')).toBeVisible();

    // Map required fields
    await page.locator('[data-testid="source-header"]:has-text("Full Name")').dragTo(
      page.locator('[data-testid="target-header"]:has-text("Name")')
    );
    await page.locator('[data-testid="source-header"]:has-text("Email Address")').dragTo(
      page.locator('[data-testid="target-header"]:has-text("Email")')
    );
    await page.locator('[data-testid="source-header"]:has-text("Born")').dragTo(
      page.locator('[data-testid="target-header"]:has-text("Birth Year")')
    );
    await page.locator('[data-testid="source-header"]:has-text("How heard")').dragTo(
      page.locator('[data-testid="target-header"]:has-text("Referral Source")')
    );
    await page.locator('[data-testid="source-header"]:has-text("Sponsor Name")').dragTo(
      page.locator('[data-testid="target-header"]:has-text("Sponsor Name")')
    );
    await page.locator('[data-testid="source-header"]:has-text("Sponsor Email OK")').dragTo(
      page.locator('[data-testid="target-header"]:has-text("Sponsor Email Confirmation")')
    );
    await page.locator('[data-testid="source-header"]:has-text("Kinky Exp")').dragTo(
      page.locator('[data-testid="target-header"]:has-text("Kinky Experience")')
    );
    await page.locator('[data-testid="source-header"]:has-text("Self Desc")').dragTo(
      page.locator('[data-testid="target-header"]:has-text("Self Description")')
    );
    await page.locator('[data-testid="source-header"]:has-text("Consent Info")').dragTo(
      page.locator('[data-testid="target-header"]:has-text("Consent Understanding")')
    );
    await page.locator('[data-testid="source-header"]:has-text("Policy OK")').dragTo(
      page.locator('[data-testid="target-header"]:has-text("Consent Policy Agreement")')
    );

    // Click Process Data button
    await page.click('button:has-text("Process Data")');
    
    // Should show preview interface
    await expect(page.locator('h3:has-text("Import Preview")')).toBeVisible();
    await expect(page.locator('text=Valid Applications')).toBeVisible();
    await expect(page.locator('text=1')).toBeVisible(); // Should show 1 valid application
  });

  test('should show visual feedback during drag operations', async ({ page }) => {
    // Setup mapping interface
    const sampleData = [
      'Full Name\tEmail Address',
      'John Doe\tjohn@example.com'
    ].join('\n');

    await page.fill('textarea[placeholder*="Paste your data"]', sampleData);
    await expect(page.locator('h3:has-text("Map Your Columns")')).toBeVisible();

    const sourceHeader = page.locator('[data-testid="source-header"]:has-text("Full Name")');
    const targetHeader = page.locator('[data-testid="target-header"]:has-text("Name")');

    // Start drag operation
    await sourceHeader.hover();
    await page.mouse.down();
    
    // Should show drag cursor or visual feedback
    await expect(sourceHeader).toHaveClass(/dragging|drag-active/);
    
    // Move towards target
    await targetHeader.hover();
    
    // Should show drop zone feedback
    await expect(targetHeader).toHaveClass(/drop-target|can-drop/);
    
    // Complete the drop
    await page.mouse.up();
    
    // Should create connection and remove drag states
    await expect(page.locator('[data-testid="connection-line"]')).toBeVisible();
    await expect(sourceHeader).not.toHaveClass(/dragging|drag-active/);
    await expect(targetHeader).not.toHaveClass(/drop-target|can-drop/);
  });
});