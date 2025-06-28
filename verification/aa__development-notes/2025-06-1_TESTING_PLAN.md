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
- [ ] **Invalid URL handling**
- [ ] **Sheet validation**
- [ ] **KV storage operations**

#### 1.2 Membership Checking Logic (`index.ts:399-426`)

**Status**: 🔄 Planned  
**Location**: `membership.test.ts`

- [ ] **Email membership validation**
- [ ] **Case-insensitive matching**
- [ ] **Malformed data handling**
- [ ] **Error scenarios**

### Phase 2: External Service Integration (Priority: HIGH)

#### 2.1 Discord Integration Tests (`discord.ts`)

**Status**: 🔄 Planned  
**Location**: `discord.test.ts`

- [ ] **OAuth token exchange**
- [ ] **User data retrieval**
- [ ] **Role assignment**
- [ ] **Retry mechanism**

#### 2.2 Google Sheets Integration (`google-sheets.ts`)

**Status**: 🔄 Planned  
**Location**: `google-sheets.test.ts`

- [ ] **Sheet data fetching**
- [ ] **Access token management**
- [ ] **Error handling**

#### 2.3 Email Service Tests (`mailjet.ts`)

**Status**: 🔄 Planned  
**Location**: `mailjet.test.ts`

- [ ] **Email sending**
- [ ] **Template validation**
- [ ] **Error responses**

### Phase 3: Security & Input Validation (Priority: MEDIUM)

#### 3.1 Input Sanitization Tests

**Status**: 🔄 Planned  
**Location**: `security.test.ts`

- [ ] **Email validation**
- [ ] **URL validation**
- [ ] **OTP validation**

#### 3.2 Authentication & Authorization

**Status**: 🔄 Planned  
**Location**: `auth.test.ts`

- [ ] **Discord signature verification**
- [ ] **Session management**

### Phase 4: Integration & E2E Testing (Priority: MEDIUM)

#### 4.1 Discord Interaction Flows

**Status**: 🔄 Planned  
**Location**: `interactions.test.ts`

- [ ] **Slash command handling**
- [ ] **Button interactions**
- [ ] **Modal submissions**

#### 4.2 Complete Verification Flows

**Status**: 🔄 Planned  
**Location**: `flows.test.ts`

- [ ] **OAuth verification**
- [ ] **Manual verification**

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

**Phase 1 Complete**: Review core business logic tests **Phase 2 Complete**: Review external service integration  
**Phase 3 Complete**: Review security implementation **Phase 4 Complete**: Review full system integration **Phase 5 Complete**: Final performance and reliability review

## Implementation Notes

- Start each phase by creating mock implementations
- Write failing tests first (TDD approach)
- Focus on edge cases and error conditions
- Document any test limitations or assumptions
- Update this plan as requirements evolve

---

**Next Steps**: Begin Phase 1.1 - Setup Function Tests
