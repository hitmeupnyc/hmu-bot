# HMU Verification Bot Testing Plan

## Overview

This document outlines the comprehensive testing strategy for the HMU Discord verification bot. The bot validates community members against Google Sheets containing vetted and private member lists through both OAuth and manual email verification flows.

## Current Status

✅ **Completed**: Basic utility function tests (9 tests)
- Email processing (`cleanEmail`, `sanitizeEmail`) 
- Data validation (`retrieveSheetId`, `getEmailListFromSheetValues`)
- Test infrastructure with Vitest + TypeScript

## Testing Roadmap

### Phase 1: Core Business Logic (Priority: HIGH)

#### 1.1 Setup Function Tests (`index.ts:474-517`)
**Status**: 🔄 Next Up  
**Location**: `setup.test.ts`

- [ ] **Valid Google Sheets URL extraction**
  - Extract document ID from various URL formats
  - Handle URLs with additional parameters
- [ ] **Invalid URL handling** 
  - Non-Google Sheets URLs
  - Malformed URLs
  - Empty/null inputs
- [ ] **Sheet validation**
  - Verify "Vetted Members" and "Private Members" sheets exist
  - Check for "Email Address" in column D
  - Handle missing sheets gracefully
- [ ] **KV storage operations**
  - Role IDs and sheet ID persistence
  - Error handling for storage failures

#### 1.2 Membership Checking Logic (`index.ts:399-426`)
**Status**: 🔄 Planned  
**Location**: `membership.test.ts`

- [ ] **Email membership validation**
  - Member found in vetted list
  - Member found in private list  
  - Member found in both lists
  - Member not found in either list
- [ ] **Case-insensitive matching**
  - Mixed case emails
  - Uppercase/lowercase variations
- [ ] **Malformed data handling**
  - Empty sheet values
  - Null/undefined entries
  - Unexpected data structures
- [ ] **Error scenarios**
  - Missing sheet document ID
  - Invalid sheet ranges
  - Network failures

### Phase 2: External Service Integration (Priority: HIGH)

#### 2.1 Discord Integration Tests (`discord.ts`)
**Status**: 🔄 Planned  
**Location**: `discord.test.ts`

- [ ] **OAuth token exchange**
  - Valid authorization code
  - Invalid/expired codes
  - Network errors
- [ ] **User data retrieval**
  - Email and user ID extraction
  - Unverified email handling
  - Missing permissions
- [ ] **Role assignment**
  - Successful role grants
  - Permission errors
  - User not in guild
- [ ] **Retry mechanism**
  - Exponential backoff behavior
  - Max retry limits
  - Final failure handling

#### 2.2 Google Sheets Integration (`google-sheets.ts`)
**Status**: 🔄 Planned  
**Location**: `google-sheets.test.ts`

- [ ] **Sheet data fetching**
  - Valid range requests
  - Invalid sheet IDs
  - Permission errors
- [ ] **Access token management**
  - Initial token acquisition
  - Token refresh on expiry
  - Authentication failures
- [ ] **Error handling**
  - Rate limiting
  - Service unavailability
  - Malformed responses

#### 2.3 Email Service Tests (`mailjet.ts`)
**Status**: 🔄 Planned  
**Location**: `mailjet.test.ts`

- [ ] **Email sending**
  - Successful delivery
  - Invalid recipient addresses
  - Authentication failures
- [ ] **Template validation**
  - Correct OTP code insertion
  - Message formatting
  - Character encoding
- [ ] **Error responses**
  - Rate limiting
  - Service errors
  - Invalid API credentials

### Phase 3: Security & Input Validation (Priority: MEDIUM)

#### 3.1 Input Sanitization Tests
**Status**: 🔄 Planned  
**Location**: `security.test.ts`

- [ ] **Email validation**
  - Valid email formats
  - Invalid formats
  - SQL injection attempts
  - XSS payloads
- [ ] **URL validation**
  - Malicious URLs
  - Local file attempts
  - Protocol bypasses
- [ ] **OTP validation**
  - Valid 6-digit codes
  - Invalid formats
  - Injection attempts

#### 3.2 Authentication & Authorization
**Status**: 🔄 Planned  
**Location**: `auth.test.ts`

- [ ] **Discord signature verification**
  - Valid signatures
  - Invalid signatures
  - Replay attacks
- [ ] **Session management**
  - OTP expiration
  - Multiple verification attempts
  - Rate limiting

### Phase 4: Integration & E2E Testing (Priority: MEDIUM)

#### 4.1 Discord Interaction Flows
**Status**: 🔄 Planned  
**Location**: `interactions.test.ts`

- [ ] **Slash command handling**
  - `/setup` command flow
  - `/verify-email` command
  - Invalid commands
- [ ] **Button interactions**
  - OAuth verification flow
  - Manual verification flow
  - Error states
- [ ] **Modal submissions**
  - Email input validation
  - OTP code submission
  - Form validation errors

#### 4.2 Complete Verification Flows
**Status**: 🔄 Planned  
**Location**: `flows.test.ts`

- [ ] **OAuth verification**
  - End-to-end successful verification
  - User not in member lists
  - Discord API errors
- [ ] **Manual verification**
  - Email → OTP → role assignment
  - Invalid email addresses
  - Expired OTP codes
  - Role assignment failures

### Phase 5: Performance & Reliability (Priority: LOW)

#### 5.1 Load Testing
**Status**: 🔄 Future  

- [ ] **Concurrent verifications**
- [ ] **Rate limiting behavior**
- [ ] **Memory usage patterns**
- [ ] **Response time benchmarks**

#### 5.2 Error Recovery
**Status**: 🔄 Future  

- [ ] **Partial failure scenarios**
- [ ] **Service degradation**
- [ ] **Recovery mechanisms**

## Test Infrastructure

### Tools & Frameworks
- **Test Runner**: Vitest
- **Language**: TypeScript
- **Mocking**: Vitest built-in mocks
- **Assertions**: Vitest expect API
- **Coverage**: Vitest coverage reports

### Mock Strategy
- **External APIs**: Mock all HTTP requests (Discord, Google, Mailjet)
- **KV Store**: In-memory mock implementation
- **Environment**: Isolated test environment variables

### Test Organization
```
tests/
├── unit/
│   ├── utils.test.ts         ✅ Done
│   ├── setup.test.ts         🔄 Phase 1.1
│   ├── membership.test.ts    🔄 Phase 1.2
│   ├── discord.test.ts       🔄 Phase 2.1
│   ├── google-sheets.test.ts 🔄 Phase 2.2
│   ├── mailjet.test.ts       🔄 Phase 2.3
│   ├── security.test.ts      🔄 Phase 3.1
│   └── auth.test.ts          🔄 Phase 3.2
├── integration/
│   ├── interactions.test.ts  🔄 Phase 4.1
│   └── flows.test.ts         🔄 Phase 4.2
└── fixtures/
    ├── discord-payloads.ts
    ├── sheet-data.ts
    └── mock-responses.ts
```

## Success Criteria

### Code Coverage Targets
- **Unit Tests**: >90% line coverage
- **Integration Tests**: >80% coverage of critical paths
- **E2E Tests**: 100% coverage of user workflows

### Quality Gates
- [ ] All tests passing in CI
- [ ] No security vulnerabilities detected
- [ ] Performance benchmarks met
- [ ] Code review approval required

## Review Checkpoints

**Phase 1 Complete**: Review core business logic tests
**Phase 2 Complete**: Review external service integration  
**Phase 3 Complete**: Review security implementation
**Phase 4 Complete**: Review full system integration
**Phase 5 Complete**: Final performance and reliability review

## Implementation Notes

- Start each phase by creating mock implementations
- Write failing tests first (TDD approach)
- Focus on edge cases and error conditions
- Document any test limitations or assumptions
- Update this plan as requirements evolve

---

**Next Steps**: Begin Phase 1.1 - Setup Function Tests