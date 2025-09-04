import { test as setup, expect } from '@playwright/test';

const authFile = './.auth/user.json';

setup('authenticate', async ({ page, request }) => {
  const testEmail = 'test@hitmeupnyc.com';
  
  console.log('Requesting magic link through normal flow...');
  
  // Request a magic link through the BetterAuth API
  const magicLinkResponse = await request.post('http://localhost:3000/api/auth/sign-in/magic-link', {
    data: { 
      email: testEmail,
      callbackURL: '/'
    }
  });
  
  console.log('Magic link response status:', magicLinkResponse.status());
  const responseText = await magicLinkResponse.text();
  console.log('Magic link response:', responseText);
  
  if (!magicLinkResponse.ok()) {
    throw new Error(`Failed to request magic link: ${responseText}`);
  }
  
  // In test mode, the magic link token should be deterministic
  // Let's try using the test token that should have been generated
  const testToken = 'test-token-e2e';
  const magicLinkUrl = `http://localhost:3000/api/auth/magic-link/verify?token=${testToken}&callbackURL=${encodeURIComponent('/')}`;
  
  console.log('Navigating to magic link:', magicLinkUrl);
  
  // Navigate to the magic link verification URL
  const response = await page.goto(magicLinkUrl);
  console.log('Magic link verification response status:', response?.status());
  
  // Wait for any redirects to complete
  await page.waitForLoadState('networkidle');
  
  // Check current URL
  const currentUrl = page.url();
  console.log('Current URL after magic link verification:', currentUrl);
  
  if (currentUrl.includes('/login') || currentUrl.includes('error=')) {
    console.error('Authentication failed - still on login page or error page');
    // Let's check what cookies we have
    const cookies = await page.context().cookies();
    console.log('Cookies after auth attempt:', cookies);
    throw new Error(`Authentication failed - URL: ${currentUrl}`);
  }
  
  // Give some time for authentication to fully complete
  await page.waitForTimeout(2000);
  
  // Check cookies before saving
  const cookies = await page.context().cookies();
  console.log('Cookies before saving state:', cookies);
  
  // Save the authentication state
  await page.context().storageState({ path: authFile });
  
  console.log('Authentication setup completed and saved to:', authFile);
});