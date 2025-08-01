# Drag-and-Drop Header Mapping Implementation

## Overview

I've implemented a visual drag-and-drop header mapping interface to replace the dropdown-based column mapping system. This provides a much more intuitive way for users to connect their spreadsheet columns to the expected application fields.

## Components Created

### 1. HeaderMapping.tsx
- **Visual Layout**: Two-column layout with source headers (left) and target headers (right)
- **SVG Connection Area**: Central area showing connection lines between mapped columns
- **Drag and Drop**: Full HTML5 drag-and-drop implementation
- **Visual Feedback**: Color-coded headers and connection states

### 2. Comprehensive Playwright Tests
- **csv-import-mapping.spec.ts**: 6 test scenarios covering all drag-and-drop interactions
- **Test Coverage**: Header detection, drag operations, connection creation/removal, data processing

## Key Features Implemented

### Visual Design
- **Source Headers**: Blue-themed draggable items on the left showing user's column names
- **Target Headers**: Color-coded expected fields on the right (red for required, gray for optional, green when connected)
- **SVG Connections**: Dynamic lines with circles at endpoints showing active mappings
- **Drag Indicators**: Visual feedback during drag operations with opacity and scaling

### Interaction Model
- **Drag from Source to Target**: Creates new mapping connection
- **Drag from Target to Source**: Alternative mapping direction
- **Drag to SVG Area**: Removes existing connections
- **Duplicate Prevention**: New mappings replace previous ones for the same target

### Connection Logic
```typescript
interface Connection {
  sourceHeader: string;
  targetKey: string;
  sourceIndex: number;
  targetIndex: number;
}
```

### Dynamic Line Calculation
```typescript
const calculateLineCoordinates = (connection: Connection) => {
  const sourceElement = getHeaderElement(connection.sourceHeader, connection.sourceIndex, 'source');
  const targetElement = getHeaderElement(targetHeaders[connection.targetIndex].label, connection.targetIndex, 'target');
  
  // Calculate SVG coordinates relative to container
  const x1 = sourceRect.right - svgRect.left;
  const y1 = sourceRect.top + sourceRect.height / 2 - svgRect.top;
  const x2 = targetRect.left - svgRect.left;
  const y2 = targetRect.top + targetRect.height / 2 - svgRect.top;
  
  return { x1, y1, x2, y2 };
};
```

## Current Implementation Status

### ✅ Completed
- Visual layout with proper responsive design
- Drag and drop event handling structure  
- SVG connection line rendering
- Integration with existing CsvImport component
- Comprehensive test suite structure

### 🔄 In Progress
- Test failures due to strict mode violations (multiple elements with same text)
- Visual feedback classes not being applied during drag operations
- Drag and drop functionality needs refinement for Playwright compatibility

### ⏳ Needs Refinement
- More specific test selectors to avoid element conflicts
- Proper drag state management for visual feedback
- Connection line updates during drag operations
- Error handling for invalid drop targets

## Test Issues Identified

1. **Strict Mode Violations**: Multiple elements contain "Name" text, causing locator conflicts
2. **Visual Feedback Missing**: Drag state classes aren't being applied as expected
3. **Selector Specificity**: Need more specific test IDs to target exact elements

## Next Steps

1. **Fix Test Selectors**: Use more specific data attributes for unique element identification
2. **Implement Visual States**: Add proper CSS classes during drag operations
3. **Refine Drag Logic**: Ensure drag and drop works reliably in automated tests
4. **Add Connection Animation**: Smooth line drawing during drag operations

The foundation is solid with proper component architecture, comprehensive test coverage planning, and integration with the existing CSV import flow. The remaining work focuses on polishing the interaction details and ensuring test reliability.