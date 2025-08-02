# Deep Dive Methodology Reference - 2025-08-02

## Overview

This document serves as a comprehensive reference for conducting thorough deep dives into broken functionality, using the Edit Event investigation as a template for future similar work.

## Phase 1: Investigation & Analysis

### 1.1 Initial Assessment
- **Read previous analysis** - Check existing notes for context
- **Identify scope** - Determine if it's UI, backend, integration, or full-stack issue
- **Gather evidence** - Use browser testing, logs, network requests

### 1.2 Systematic Component Analysis
```bash
# Frontend Investigation
grep -r "EditEvent\|updateEvent" client/src/
grep -r "onClick\|handler" problematic-component.tsx

# Backend Investigation  
grep -r "PUT\|update.*endpoint" server/src/routes/
grep -r "updateEntity" server/src/services/

# E2E Test Coverage
grep -r "edit\|update" tests/e2e/
```

### 1.3 Create Comprehensive Analysis Document
Structure:
```markdown
# [Feature] Deep Dive Analysis - [Date]

## Executive Summary
- Brief status (✅/❌/⚠️)
- Key findings
- Impact assessment

## Detailed Analysis
### 1. [Component] Issues
- Current state
- Expected behavior
- Root cause

## Technical Implementation Notes
### Root Cause Analysis
### Impact Assessment  
### Recommendations
```

## Phase 2: Implementation Strategy

### 2.1 Create Todo List
Use TodoWrite tool to break down work:
```
1. Backend API fixes (high priority)
2. Frontend integration (high priority)  
5. Manual testing (medium priority)
3. UI/UX improvements (medium priority)
4. Test coverage (medium priority)
```

### 2.2 Backend-First Approach
**Always fix backend before frontend:**

1. **Add/Update Types** 
   ```typescript
   // Add schemas first
   export const UpdateEntitySchema = Schema.Struct({
     id: Schema.Number,
     field: Schema.optional(Schema.String),
     // ...
   });
   ```

2. **Implement Effects**
   ```typescript
   export const updateEntity = (data: UpdateEntity) =>
     Effect.gen(function* () {
       const db = yield* DatabaseService;
       const validatedData = yield* Schema.decodeUnknown(UpdateEntitySchema)(data);
       // Implementation...
     });
   ```

3. **Add Routes**
   ```typescript
   router.put('/:id', effectToExpress((req, res) =>
     Effect.gen(function* () {
       const id = yield* extractId(req);
       const data = yield* extractBody<UpdatePayload>(req);
       // Implementation...
     })
   ));
   ```

### 2.3 Frontend Integration

1. **Add React Query Hooks**
   ```typescript
   export function useUpdateEntity() {
     const queryClient = useQueryClient();
     return useMutation({
       mutationFn: async (data: UpdateRequest) => {
         const response = await api.put(`/entities/${data.id}`, data);
         return response.data;
       },
       onSuccess: () => {
         queryClient.invalidateQueries({ queryKey: entityKeys.all });
       },
     });
   }
   ```

2. **Update Components**
   - Replace direct service calls with React Query hooks
   - Add proper loading states
   - Handle error cases
   - Update UI state management

### 2.4 Project Guidelines Adherence
- **Always use React Query** for data fetching
- **Follow existing patterns** - examine similar components first
  - Always leave things better than you found them
- **Use TypeScript** - ensure full type safety
- **Follow bitfield patterns** - avoid booleans where possible

## Phase 3: Testing Strategy

### 3.1 Manual Testing Checklist
```
□ Test primary workflow (happy path)
□ Test alternative entry points  
□ Test edge cases (validation, errors)
□ Test UI state changes
□ Test data persistence
□ Test navigation flows
```

### 3.2 E2E Test Implementation

**Test Coverage Areas:**
- Primary functionality from each entry point
- Form validation 
- Error handling
- Multi-field operations
- Navigation between related pages

## Phase 4: Documentation

### 4.2 Documentation Updates
- Update analysis notes with findings
- Document any workarounds or design decisions
- Note any technical debt or future improvements

## Key Tools & Commands

### Investigation Tools
```bash
# Database inspection
npm run db:inspect

# Network debugging
# Use browser dev tools / Playwright MCP
```

### Development Tools
```bash
# Start development
npm run dev:kill-ports; npm run dev > /dev/null 2>&1 &

# Test specific functionality
npx playwright test --grep "test-name"

# Check types
npm run typecheck

# Run linting
npm run lint
```

## Best Practices Learned

### 1. Investigation Approach
- **Start with the full picture** - understand user journey
- **Work backwards from errors** - follow error traces
- **Check both UI and API** - don't assume where the issue is
- **Use browser debugging** - Playwright MCP is invaluable

### 2. Implementation Approach  
- **Backend first** - establish solid API foundation
- **Type safety throughout** - schemas, interfaces, validation
- **React Query integration** - follow project patterns
- **Comprehensive testing** - don't just test happy path

### 3. Testing Strategy
- **Test from user perspective** - real workflows
- **Cover edge cases** - validation, errors, empty states
- **Test multiple entry points** - different ways to reach functionality
- **Verify data persistence** - ensure changes stick

### 4. Common Pitfalls to Avoid
- Don't assume existing code is correct
- Don't skip backend validation 
- Don't forget to handle loading states
- Don't write tests that depend on specific data
- Don't forget to invalidate React Query caches

## Templates for Future Use

### Investigation Template
```markdown
# [Feature] Deep Dive Analysis - [Date]

## Executive Summary ❌/⚠️/✅
**CRITICAL FINDING:** [Main issue]

## Detailed Analysis
### 1. [Component] Issues ❌
### 2. [Component] Issues ❌  
### 3. [Component] Issues ❌

## Root Cause Analysis
## Impact Assessment
## Recommendations
```

### Todo Template
```javascript
TodoWrite([
  {id: "1", content: "Fix backend [issue]", status: "pending", priority: "high"},
  {id: "2", content: "Add frontend [feature]", status: "pending", priority: "high"},
  {id: "3", content: "Update component [aspect]", status: "pending", priority: "medium"},
  {id: "4", content: "Add e2e tests", status: "pending", priority: "medium"},
  {id: "5", content: "Manual testing", status: "pending", priority: "medium"}
])
```

### Test Template
```typescript
test('should [action] successfully from [entry point]', async ({ page }) => {
  // Navigate to starting point
  await page.getByRole('link', { name: 'Section' }).click();
  
  // Perform action
  await page.getByRole('button', { name: 'Action' }).click();
  
  // Verify results
  await expect(page.getByText('Success indicator')).toBeVisible();
});
```

## Success Metrics

A successful deep dive should result in:
- ✅ **Complete functionality** - feature works as intended
- ✅ **Comprehensive testing** - edge cases covered
- ✅ **Clean implementation** - follows project patterns
- ✅ **Proper documentation** - findings recorded
- ✅ **No regressions** - existing functionality unaffected

---

*Use this methodology for any significant debugging or feature implementation work to ensure thorough, systematic analysis and implementation.*
