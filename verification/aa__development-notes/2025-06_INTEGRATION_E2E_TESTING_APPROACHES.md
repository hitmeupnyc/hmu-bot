# Integration & E2E Testing Approaches for HMU Discord Verification Bot

## Overview

This document outlines several approaches for implementing comprehensive integration and end-to-end (E2E) testing for the HMU Discord verification bot. The bot handles complex multi-step workflows involving Discord interactions, Google Sheets validation, email verification, and role assignment.

## Current Architecture Analysis

### **Key Integration Points:**
- **Discord Webhooks**: Signature verification → Interaction handling → Response generation
- **Google Sheets API**: OAuth → Sheet validation → Membership checking
- **Mailjet Email**: Authentication → Template rendering → Delivery
- **KV Storage**: OTP management → Role configuration → Session persistence
- **Multi-step Workflows**: Setup → Verification → Role assignment

### **Critical User Journeys:**
1. **Admin Setup Flow**: `/setup` command → Modal → Google Sheets validation → Role configuration
2. **OAuth Verification**: Button click → Discord OAuth → Email validation → Role assignment
3. **Manual Verification**: Email input → OTP generation → Code verification → Role assignment
4. **Error Recovery**: Invalid inputs → Error messages → Retry mechanisms

---

## Approach 1: Hono Test Client Integration Testing

### **Strategy**
Use Hono's built-in test client to test the complete HTTP request/response cycle without external network calls, leveraging MSW for external service simulation.

### **Implementation**

```typescript
// tests/integration/discord-interactions.test.ts
import { testClient } from 'hono/testing';
import app from '../../index';
import { server } from '../../mocks/setup';
import { createDiscordInteraction, createValidSignature } from '../fixtures/discord-interactions';

describe('Discord Interaction Integration', () => {
  const client = testClient(app);
  
  it('completes full setup workflow', async () => {
    // 1. Setup command interaction
    const setupInteraction = createDiscordInteraction({
      type: 2, // APPLICATION_COMMAND
      data: { name: 'setup', options: [/* role options */] }
    });
    
    const setupResponse = await client.discord.$post({
      json: setupInteraction,
      header: createValidSignature(setupInteraction)
    });
    
    expect(setupResponse.status).toBe(200);
    const setupData = await setupResponse.json();
    expect(setupData.type).toBe(9); // MODAL
    expect(setupData.data.custom_id).toBe('modal-setup');
    
    // 2. Modal submission with Google Sheets URL
    const modalInteraction = createDiscordInteraction({
      type: 5, // MODAL_SUBMIT
      data: { 
        custom_id: 'modal-setup',
        components: [{ components: [{ value: 'https://docs.google.com/spreadsheets/d/valid-sheet-123/edit' }] }]
      }
    });
    
    const modalResponse = await client.discord.$post({
      json: modalInteraction,
      header: createValidSignature(modalInteraction)
    });
    
    const modalData = await modalResponse.json();
    expect(modalData.type).toBe(4); // CHANNEL_MESSAGE_WITH_SOURCE
    expect(modalData.data.content).toContain('Welcome to Hit Me Up NYC');
    expect(modalData.data.components[0].components).toHaveLength(2); // OAuth + Manual buttons
  });
});
```

### **Advantages:**
- ✅ **Realistic HTTP handling**: Tests actual request parsing, middleware, routing
- ✅ **Fast execution**: No network overhead, all mocked
- ✅ **Easy debugging**: Full access to internal state and logs
- ✅ **MSW integration**: Reuses existing external service mocks

### **Disadvantages:**
- ❌ **Limited environment testing**: Doesn't test deployment-specific issues
- ❌ **No real Discord validation**: Can't test actual Discord signature verification
- ❌ **Missing edge cases**: May not catch environment-specific failures

---

## Approach 2: Vitest Environment-Based E2E Testing

### **Strategy**
Create a dedicated test environment that spins up the actual Hono app with real environment variables and external service stubs, testing complete workflows.

### **Implementation**

```typescript
// tests/e2e/verification-workflows.test.ts
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { startTestServer, stopTestServer } from '../helpers/test-server';
import { createMockKVNamespace } from '../mocks/kv-store';
import { DiscordTestClient } from '../helpers/discord-client';

describe('End-to-End Verification Workflows', () => {
  let testServer: { port: number; stop: () => Promise<void> };
  let discordClient: DiscordTestClient;
  let mockKV: any;
  
  beforeAll(async () => {
    mockKV = createMockKVNamespace();
    testServer = await startTestServer({
      env: {
        DISCORD_PUBLIC_KEY: 'test-key',
        GOOGLE_SA_PRIVATE_KEY: 'test-private-key',
        MAILJET_PUBLIC: 'test-public',
        MAILJET_KEY: 'test-key',
        hmu_bot: mockKV
      }
    });
    
    discordClient = new DiscordTestClient(`http://localhost:${testServer.port}`);
  });
  
  afterAll(async () => {
    await testServer.stop();
  });
  
  it('completes OAuth verification workflow', async () => {
    // 1. User clicks OAuth button (simulated)
    const oauthUrl = 'https://discord.com/oauth2/authorize?client_id=...';
    
    // 2. Simulate OAuth callback with valid code
    const oauthResponse = await discordClient.simulateOAuth({
      code: 'valid-oauth-code',
      email: 'vetted@example.com'
    });
    
    expect(oauthResponse.status).toBe(200);
    expect(oauthResponse.body).toContain('Thank you');
    
    // 3. Verify role was assigned (check KV store)
    const vettedRoleId = await mockKV.get('vetted');
    expect(vettedRoleId).toBeTruthy();
    
    // 4. Verify membership was checked (MSW request verification)
    expect(discordClient.getRequestHistory()).toContainEqual(
      expect.objectContaining({
        url: expect.stringContaining('sheets.googleapis.com'),
        method: 'GET'
      })
    );
  });
  
  it('completes manual email verification workflow', async () => {
    // 1. Manual verification button interaction
    const manualInteraction = await discordClient.sendInteraction({
      type: 3, // MESSAGE_COMPONENT
      data: { custom_id: 'manual-verify' }
    });
    
    expect(manualInteraction.data.type).toBe(9); // MODAL
    
    // 2. Submit email modal
    const emailInteraction = await discordClient.sendInteraction({
      type: 5, // MODAL_SUBMIT
      data: {
        custom_id: 'modal-verify-email',
        components: [{ components: [{ value: 'test@example.com' }] }]
      }
    });
    
    expect(emailInteraction.data.content).toContain('check your email');
    
    // 3. Verify OTP was stored
    const storedOTP = await mockKV.get('email:test@example.com');
    expect(storedOTP).toMatch(/^\d{6}$/);
    
    // 4. Submit OTP code
    const otpInteraction = await discordClient.sendInteraction({
      type: 5, // MODAL_SUBMIT
      data: {
        custom_id: `modal-confirm-code:test@example.com`,
        components: [{ components: [{ value: storedOTP }] }]
      }
    });
    
    expect(otpInteraction.data.content).toContain('verified your email');
  });
});
```

### **Advantages:**
- ✅ **Complete workflow testing**: Tests entire request → response → side effect chains
- ✅ **Real environment simulation**: Uses actual environment variables and configurations
- ✅ **State persistence testing**: Validates KV storage and session management
- ✅ **Comprehensive coverage**: Tests both happy paths and error scenarios

### **Disadvantages:**
- ❌ **Slower execution**: Requires server startup/teardown
- ❌ **Complex setup**: Needs sophisticated test infrastructure
- ❌ **Resource intensive**: May require dedicated test databases/storage

---

## Approach 3: Contract Testing with External Services

### **Strategy**
Use contract testing (similar to Pact) to verify that our service correctly integrates with external APIs while maintaining fast, isolated tests.

### **Implementation**

```typescript
// tests/contracts/discord-api.contract.test.ts
import { describe, it, expect } from 'vitest';
import { ContractTester } from '../helpers/contract-tester';
import { fetchEmailFromCode, grantRole } from '../../lib/discord';

describe('Discord API Contracts', () => {
  const contractTester = new ContractTester('discord-api');
  
  it('validates OAuth token exchange contract', async () => {
    const mockResponse = {
      access_token: 'mock-token',
      token_type: 'Bearer',
      expires_in: 3600
    };
    
    contractTester.expectRequest({
      method: 'POST',
      path: '/api/oauth2/token',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: expect.stringContaining('grant_type=authorization_code')
    }).willRespondWith({
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: mockResponse
    });
    
    const result = await fetchEmailFromCode('test-code', 'client-id', 'client-secret', 'redirect-uri');
    
    expect(result.id).toBeTruthy();
    expect(result.email).toBeTruthy();
    contractTester.verifyInteractions();
  });
  
  it('validates role assignment contract', async () => {
    contractTester.expectRequest({
      method: 'PUT',
      path: '/api/guilds/123/members/456/roles/789',
      headers: { 
        'Authorization': expect.stringMatching(/^Bot .+/),
        'Content-Type': 'application/json'
      }
    }).willRespondWith({
      status: 204
    });
    
    const result = await grantRole('bot-token', '123', '789', '456');
    
    expect(result.ok).toBe(true);
    contractTester.verifyInteractions();
  });
});

// tests/contracts/google-sheets.contract.test.ts
describe('Google Sheets API Contracts', () => {
  const contractTester = new ContractTester('google-sheets-api');
  
  it('validates sheet data fetching contract', async () => {
    contractTester.expectRequest({
      method: 'GET',
      path: '/v4/spreadsheets/sheet-123/values/Vetted%20Members!D1:D',
      headers: { 'Authorization': expect.stringMatching(/^Bearer .+/) }
    }).willRespondWith({
      status: 200,
      body: {
        range: 'Vetted Members!D1:D',
        majorDimension: 'ROWS',
        values: [['Email Address'], ['test@example.com']]
      }
    });
    
    // Test actual function call
    const result = await checkMembership(mockContext, 'test@example.com');
    
    expect(result.isVetted).toBe(true);
    contractTester.verifyInteractions();
  });
});
```

### **Advantages:**
- ✅ **API compatibility verification**: Ensures external APIs work as expected
- ✅ **Breaking change detection**: Catches API changes early
- ✅ **Documentation**: Contracts serve as living API documentation
- ✅ **Fast feedback**: No real external calls needed

### **Disadvantages:**
- ❌ **Complex tooling**: Requires contract testing framework
- ❌ **Maintenance overhead**: Contracts need updates when APIs change
- ❌ **Limited real-world testing**: May miss subtle integration issues

---

## Approach 4: Playwright-Based Browser E2E Testing

### **Strategy**
Use Playwright to test the complete user experience including Discord's web interface, simulating real user interactions from Discord client to verification completion.

### **Implementation**

```typescript
// tests/e2e/browser/verification-flow.spec.ts
import { test, expect } from '@playwright/test';
import { DiscordPageHelper } from '../helpers/discord-page';
import { MockEmailProvider } from '../helpers/email-provider';

test.describe('Discord Verification User Journey', () => {
  let discordPage: DiscordPageHelper;
  let emailProvider: MockEmailProvider;
  
  test.beforeEach(async ({ page }) => {
    discordPage = new DiscordPageHelper(page);
    emailProvider = new MockEmailProvider();
    
    // Setup test guild with verification bot
    await discordPage.joinTestGuild();
    await discordPage.setupVerificationBot();
  });
  
  test('admin sets up verification with Google Sheets', async () => {
    // 1. Admin runs /setup command
    await discordPage.runSlashCommand('/setup', {
      'vetted-role': '@Vetted Members',
      'private-role': '@Private Members'
    });
    
    // 2. Modal appears for Google Sheets URL
    await expect(discordPage.modal()).toBeVisible();
    await discordPage.fillModal({
      'sheet-url': 'https://docs.google.com/spreadsheets/d/test-sheet/edit'
    });
    
    // 3. Success message with verification buttons
    await expect(discordPage.lastMessage()).toContainText('Welcome to Hit Me Up NYC');
    await expect(discordPage.button('Verify me')).toBeVisible();
    await expect(discordPage.button('Manually verify email')).toBeVisible();
  });
  
  test('user completes OAuth verification flow', async ({ context }) => {
    // 1. User clicks OAuth verification button
    await discordPage.clickButton('Verify me');
    
    // 2. Redirected to Discord OAuth page
    const oauthPage = await context.waitForEvent('page');
    await expect(oauthPage).toHaveURL(/discord\.com\/oauth2\/authorize/);
    
    // 3. User authorizes application
    await oauthPage.click('[data-testid="authorize-button"]');
    
    // 4. Redirected back to success page
    await expect(oauthPage).toHaveURL(/hitmeupnyc\.com\/oauth/);
    await expect(oauthPage.locator('body')).toContainText('verified successfully');
    
    // 5. Back in Discord, user has new role
    await discordPage.refreshUserRoles();
    await expect(discordPage.userRole('Vetted Members')).toBeVisible();
  });
  
  test('user completes manual email verification', async () => {
    // 1. User clicks manual verification button
    await discordPage.clickButton('Manually verify email');
    
    // 2. Email input modal appears
    await expect(discordPage.modal()).toBeVisible();
    await discordPage.fillModal({ email: 'test@example.com' });
    
    // 3. Confirmation message appears
    await expect(discordPage.lastMessage()).toContainText('check your email');
    await expect(discordPage.button('Enter verification code')).toBeVisible();
    
    // 4. User receives email (mocked)
    const otpCode = await emailProvider.getLastOTPCode('test@example.com');
    expect(otpCode).toMatch(/^\d{6}$/);
    
    // 5. User clicks to enter code
    await discordPage.clickButton('Enter verification code');
    await discordPage.fillModal({ code: otpCode });
    
    // 6. Success message and role assignment
    await expect(discordPage.lastMessage()).toContainText('verified your email');
    await discordPage.refreshUserRoles();
    await expect(discordPage.userRole('Vetted Members')).toBeVisible();
  });
  
  test('handles verification errors gracefully', async () => {
    // Test invalid email
    await discordPage.clickButton('Manually verify email');
    await discordPage.fillModal({ email: 'notfound@example.com' });
    await expect(discordPage.lastMessage()).toContainText('not on the list');
    
    // Test invalid OTP code
    await discordPage.clickButton('Manually verify email');
    await discordPage.fillModal({ email: 'test@example.com' });
    await discordPage.clickButton('Enter verification code');
    await discordPage.fillModal({ code: '000000' });
    await expect(discordPage.lastMessage()).toContainText('not the right code');
  });
});
```

### **Advantages:**
- ✅ **True user experience testing**: Tests exactly what users see and interact with
- ✅ **Visual regression detection**: Can catch UI/UX issues
- ✅ **Cross-browser compatibility**: Tests multiple browsers and devices
- ✅ **Real Discord integration**: Tests against actual Discord interface

### **Disadvantages:**
- ❌ **Extremely slow**: Full browser automation is time-intensive
- ❌ **Brittle**: Discord UI changes can break tests
- ❌ **Complex setup**: Requires Discord bot in test guild
- ❌ **Limited CI compatibility**: Hard to run in CI environments

---

## Approach 5: Hybrid Microservice Integration Testing

### **Strategy**
Test each service integration point independently with realistic data flows, then combine them into broader workflow tests.

### **Implementation**

```typescript
// tests/integration/service-chains.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createServiceChain } from '../helpers/service-chain';
import { mockServices } from '../mocks/services';

describe('Service Integration Chains', () => {
  beforeEach(() => {
    mockServices.reset();
  });
  
  it('tests Discord → Google Sheets → Role Assignment chain', async () => {
    const chain = createServiceChain([
      'discord-signature-verification',
      'google-sheets-membership-check', 
      'discord-role-assignment'
    ]);
    
    const result = await chain.execute({
      discordInteraction: {
        data: { name: 'verify-email', options: [{ name: 'email', value: 'vetted@example.com' }] },
        member: { user: { id: '123456789' } }
      },
      signature: 'valid-signature',
      timestamp: Date.now().toString()
    });
    
    expect(result.success).toBe(true);
    expect(result.steps).toEqual([
      { service: 'discord-signature-verification', status: 'success' },
      { service: 'google-sheets-membership-check', status: 'success', data: { isVetted: true } },
      { service: 'discord-role-assignment', status: 'success', data: { roleAssigned: 'vetted-role' } }
    ]);
  });
  
  it('tests Email → OTP → Mailjet → KV Storage chain', async () => {
    const chain = createServiceChain([
      'email-validation',
      'otp-generation',
      'mailjet-email-send',
      'kv-storage-otp'
    ]);
    
    const result = await chain.execute({
      email: 'test@example.com',
      otpLength: 6,
      expirationMinutes: 5
    });
    
    expect(result.success).toBe(true);
    expect(result.steps[2].data.emailSent).toBe(true);
    expect(result.steps[3].data.stored).toBe(true);
    
    // Verify OTP can be retrieved
    const storedOTP = await mockServices.kv.get('email:test@example.com');
    expect(storedOTP).toMatch(/^\d{6}$/);
  });
  
  it('handles partial failure chains gracefully', async () => {
    // Simulate Google Sheets API failure
    mockServices.googleSheets.simulateFailure('PERMISSION_DENIED');
    
    const chain = createServiceChain([
      'discord-signature-verification',
      'google-sheets-membership-check',
      'error-response-generation'
    ]);
    
    const result = await chain.execute({
      discordInteraction: { /* ... */ },
      signature: 'valid-signature'
    });
    
    expect(result.success).toBe(false);
    expect(result.failurePoint).toBe('google-sheets-membership-check');
    expect(result.errorResponse).toContain('Something went wrong checking membership');
  });
});

// tests/integration/workflow-orchestration.test.ts
describe('Complete Workflow Orchestration', () => {
  it('orchestrates full verification workflow with timing', async () => {
    const orchestrator = new WorkflowOrchestrator();
    
    // Define workflow steps with dependencies
    const workflow = orchestrator.defineWorkflow('user-verification', [
      { step: 'setup-validation', depends: [] },
      { step: 'user-input-collection', depends: ['setup-validation'] },
      { step: 'membership-verification', depends: ['user-input-collection'] },
      { step: 'role-assignment', depends: ['membership-verification'] },
      { step: 'confirmation-message', depends: ['role-assignment'] }
    ]);
    
    // Execute with timing and dependency validation
    const execution = await workflow.execute({
      initialData: { guildId: 'test-guild', userId: 'test-user' }
    });
    
    expect(execution.status).toBe('completed');
    expect(execution.duration).toBeLessThan(5000); // 5 second SLA
    expect(execution.steps).toHaveLength(5);
    
    // Verify each step completed successfully
    execution.steps.forEach(step => {
      expect(step.status).toBe('success');
      expect(step.duration).toBeLessThan(2000); // Individual step SLA
    });
  });
});
```

### **Advantages:**
- ✅ **Modular testing**: Each integration point tested independently
- ✅ **Failure isolation**: Easy to identify which service caused issues
- ✅ **Performance monitoring**: Can track timing for each service call
- ✅ **Dependency validation**: Ensures correct execution order

### **Disadvantages:**
- ❌ **Complex test framework**: Requires sophisticated orchestration tooling
- ❌ **Maintenance overhead**: Many integration points to maintain
- ❌ **Potential gaps**: May miss interactions between service chains

---

## Recommended Implementation Strategy

### **Phase 1: Foundation (Immediate)**
**Approach 2: Vitest Environment-Based E2E Testing**
- Fastest to implement with existing infrastructure
- Leverages current MSW setup and testing patterns
- Provides comprehensive workflow coverage
- Good balance of realism vs. speed

### **Phase 2: Enhancement (Short-term)**
**Approach 1: Hono Test Client Integration + Approach 5: Service Chains**
- Add Hono test client for HTTP-level integration testing
- Implement service chain testing for complex workflows
- Provides additional confidence without major infrastructure changes

### **Phase 3: Advanced (Long-term)**
**Approach 3: Contract Testing**
- Implement contract testing for external API stability
- Provides early warning for breaking changes
- Improves external service integration reliability

### **Not Recommended:**
**Approach 4: Playwright Browser E2E** - Too complex and brittle for Discord bot testing

## Implementation Priority

1. **High Priority**: Complete workflow testing (OAuth, manual verification, error paths)
2. **Medium Priority**: Service integration chains and performance validation  
3. **Low Priority**: Contract testing and advanced orchestration

This strategy provides comprehensive integration testing while maintaining development velocity and test reliability.