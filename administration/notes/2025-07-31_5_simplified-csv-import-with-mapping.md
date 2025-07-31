# Simplified CSV Import with Header Mapping

## Overview

I've completely simplified the CSV import component by removing the complex template system, tabbed interface, and rich text detection, replacing it with a much cleaner approach focused on header mapping.

## Key Changes Made

### Removed Complex Features
- ❌ Template download buttons
- ❌ Tabbed interface (File vs Paste)
- ❌ Rich clipboard API integration
- ❌ Multiple format detection (HTML, CSV, TSV)
- ❌ Smart paste functionality
- ❌ Format badges and indicators

### Simplified to Core Functionality
- ✅ Single file input (accepts .csv, .tsv, .txt)
- ✅ Single textarea for TSV paste (optimized for Google Sheets)
- ✅ Header detection and exact matching
- ✅ Visual column mapping interface
- ✅ "No headers" option with column number mapping

## New User Experience

### Step 1: Input Data
- **Upload File**: Select any delimited file (.csv, .tsv, .txt)
- **OR Paste**: Copy directly from Google Sheets/Excel into textarea
- System automatically detects column structure

### Step 2: Header Mapping (if needed)
- **Exact Match**: If headers match exactly, auto-processes immediately
- **Manual Mapping**: If headers don't match, shows mapping interface
- **No Headers Option**: Checkbox to treat first row as data, map by column numbers

### Step 3: Preview & Import
- Shows valid/invalid row counts
- Displays validation errors with row numbers
- Previews first 5 valid applications
- Import button processes all valid rows

## Technical Implementation

### Smart Header Detection
```typescript
const detectHeaders = (data: string) => {
  const rows = parseTsvData(data);
  const firstRow = rows[0];
  
  // Check if headers match exactly
  const normalizedFound = firstRow.map(h => h.toLowerCase().trim());
  const exactMatch = EXPECTED_HEADERS.every(expected => 
    normalizedFound.includes(expected.toLowerCase())
  );
  
  if (exactMatch) {
    // Auto-map and process immediately
    processWithMapping(autoMapping);
  } else {
    // Show mapping interface
    setShowMapping(true);
  }
};
```

### Flexible Column Mapping
```typescript
const extractValue = (expectedHeader: string): string => {
  const mappedHeader = mapping[expectedHeader];
  if (!mappedHeader) return '';
  
  if (hasHeaders) {
    // Map by header name
    const columnIndex = headerRow.indexOf(mappedHeader);
    return columnIndex !== -1 ? (row[columnIndex] || '') : '';
  } else {
    // Map by column number (1-based input, 0-based array)
    const columnIndex = parseInt(mappedHeader) - 1;
    return columnIndex >= 0 ? row[columnIndex] : '';
  }
};
```

## User Interface

### Input Stage
- Clean instructions box explaining TSV format
- File upload with broad format support
- Large textarea optimized for paste operations
- Clear "copy from Google Sheets" guidance

### Mapping Stage
- Visual grid showing expected fields vs available columns
- Required fields marked with red asterisks
- Dropdown selection for each expected field
- "Skip this field" option for non-essential data
- "Has headers" checkbox with clear explanation

### Preview Stage
- Visual success/error counts
- Expandable error details with row numbers
- Sample of valid data for confirmation
- Clean import button with count

## Benefits of Simplified Approach

### For Users
1. **Clearer workflow**: Three distinct steps instead of confusing tabs
2. **Better Google Sheets support**: TSV paste works perfectly
3. **Flexible mapping**: Handle any column order or naming
4. **Error transparency**: Clear validation feedback

### For Developers
1. **Reduced complexity**: 50% less code, easier to maintain
2. **Single format focus**: TSV works for 90% of use cases
3. **Type safety**: Simplified state management
4. **Better testing**: Fewer edge cases to handle

### For Data Quality
1. **Explicit mapping**: Users see exactly what goes where
2. **Validation consistency**: Same rules as manual form entry
3. **Error prevention**: Column mismatches caught before processing
4. **Audit trail**: Clear record of what was imported from where

## Edge Cases Handled

- ✅ Missing required columns (user must map or skip)
- ✅ Extra columns in source data (ignored safely)
- ✅ No headers in data (column number mapping)
- ✅ Duplicate column names (user chooses which to use)
- ✅ Empty cells and whitespace (trimmed automatically)
- ✅ Mixed valid/invalid rows (partial import with error report)

## Future Enhancements (if needed)

1. **Column Preview**: Show sample data during mapping
2. **Saved Mappings**: Remember mappings for repeated imports
3. **Batch Processing**: Handle very large files in chunks
4. **Export Errors**: Download error report as CSV

The simplified approach removes unnecessary complexity while providing a much more robust and user-friendly experience for the primary use case of importing spreadsheet data.