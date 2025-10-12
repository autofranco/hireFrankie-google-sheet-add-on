# Logic Modules - Pure Business Logic Layer

## Overview

This folder contains **pure business logic** modules extracted from the main services. All functions in these modules are:

- ✅ **Pure Functions** - No side effects, deterministic output
- ✅ **100% Testable** - Can be tested without Google APIs
- ✅ **Framework Independent** - No dependency on SpreadsheetApp, GmailApp, etc.
- ✅ **Easy to Reason About** - Clear inputs and outputs

## Architecture Pattern

This follows the **"Functional Core, Imperative Shell"** pattern:

```
┌──────────────────────────────────────────┐
│  IMPERATIVE SHELL (Services)             │
│  - SheetService.js                       │
│  - EmailService.js                       │
│  - ProcessingService.js                  │
│  - Calls Google APIs                     │
│  - Handles side effects                  │
│                                           │
│  ┌────────────────────────────────────┐  │
│  │  FUNCTIONAL CORE (logic/)          │  │
│  │  - Pure business logic             │  │
│  │  - No side effects                 │  │
│  │  - 100% testable                   │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

## Modules

### 1. LeadValidation.js
**Purpose:** Lead data validation and filtering

**Functions:**
- `isValidLead(row)` - Check if lead has required fields
- `shouldProcess(status, row)` - Determine if row should be processed
- `filterUnprocessedRows(dataRows, rowIndexes)` - Filter rows by status
- `validateCharacterLimit(value, limit, fieldName)` - Character limit validation
- `isValidEmail(email)` - Email format validation

**Example:**
```javascript
const row = ['test@example.com', 'John', 'https://company.com', 'Dept', 'CTO'];
const result = LeadValidation.isValidLead(row);
// { isValid: true, errors: [] }
```

### 2. ScheduleCalculator.js
**Purpose:** Schedule time calculations and date manipulation

**Functions:**
- `getNextHourSlot(fromDate)` - Get next work hour slot
- `getNextWeekHourSlot(date)` - Get same time one week later
- `formatScheduleTime(date)` - Format as "MM/DD HH:00"
- `parseScheduleTime(scheduleText)` - Parse schedule string to Date
- `isScheduleDue(scheduleTime, currentTime)` - Check if email should send
- `formatDate(date)` - Format as "YYYY-MM-DD HH:MM"
- `getHoursDifference(startDate, endDate)` - Calculate hours between dates
- `isWorkHours(date)` - Check if within work hours

**Example:**
```javascript
const nextSlot = ScheduleCalculator.getNextHourSlot(new Date());
const formatted = ScheduleCalculator.formatScheduleTime(nextSlot);
// "01/15 09:00"
```

### 3. EmailParser.js
**Purpose:** Email content parsing and text manipulation

**Functions:**
- `parseEmailContent(content)` - Extract subject and body
- `parseMailAngles(response)` - Parse AI-generated angles
- `isValidEmail(email)` - Email format validation
- `sanitizeEmailContent(content)` - HTML escaping
- `textToHtml(text)` - Convert newlines to `<br>`
- `extractSubject(content)` - Extract subject only
- `extractBody(content)` - Extract body only
- `truncateText(text, maxLength)` - Truncate with ellipsis
- `isEmpty(str)` - Check if empty or whitespace

**Example:**
```javascript
const content = '主旨：Hello\n內容：\nWorld';
const parsed = EmailParser.parseEmailContent(content);
// { subject: 'Hello', body: 'World' }
```

### 4. BatchProcessor.js
**Purpose:** Batch processing operations and array utilities

**Functions:**
- `createBatches(rows, indexes, batchSize)` - Create batches from arrays
- `mapRowsWithIndexes(rows, indexes)` - Combine rows with indexes
- `collectBatchResults(results)` - Aggregate success/error counts
- `chunkArray(array, chunkSize)` - Split array into chunks
- `calculateProgress(currentBatch, totalBatches)` - Calculate progress %
- `hasMoreBatches(currentBatch, totalBatches)` - Check if more remain
- `validateBatch(batch)` - Validate batch structure
- `flattenBatchResults(batchResults)` - Flatten nested arrays
- `groupResultsByStatus(results)` - Group by success/failure

**Example:**
```javascript
const rows = [1, 2, 3, 4, 5];
const indexes = [2, 3, 4, 5, 6];
const batches = BatchProcessor.createBatches(rows, indexes, 2);
// [{ rows: [1,2], indexes: [2,3], batchNumber: 1, totalBatches: 3 }, ...]
```

### 5. SetupHelpers.js
**Purpose:** Sheet setup configuration and styling

**Functions:**
- `createHeaderRow()` - Generate header array
- `getColumnWidthConfig()` - Column width mappings
- `getGrayHeaderIndices(headers)` - Identify gray headers
- `getStatusDropdownValues()` - Status field values
- `getStatusColor(status)` - Status cell colors
- `getInfoColor(infoMessage)` - Info cell colors based on content
- `generateSpreadsheetTitle(currentTitle, timestamp)` - Generate title with timestamp
- `getMailAngleColumns()` - Mail angle column indices
- `getScheduleColumns()` - Schedule column indices
- `getFollowUpMailColumns()` - Follow-up mail column indices
- `validateHeaderRow(actualHeaders)` - Validate header structure
- `getDefaultRowHeight()` - Default row height in pixels
- `getHeaderRowStyle()` - Header styling config

**Example:**
```javascript
const headers = SetupHelpers.createHeaderRow();
// ['Email Address*', 'First Name*', ...]

const colors = SetupHelpers.getStatusColor('Running');
// { background: '#f0f0f0', fontColor: '#666666' }
```

## Testing

### Run All Tests

From Apps Script editor, execute:

```javascript
runAllLogicTests();
```

This will run all test functions across all 5 modules.

### Run Smoke Tests

Quick verification that all modules are working:

```javascript
runSmokeTests();
```

### Run Individual Module Tests

Each module has its own test runner:

```javascript
runAllLeadValidationTests();
runAllScheduleCalculatorTests();
runAllEmailParserTests();
runAllBatchProcessorTests();
runAllSetupHelpersTests();
```

## Integration with Services

The main services (SheetService, EmailService, ProcessingService) now delegate to these logic modules:

**Before (Mixed Responsibilities):**
```javascript
// SheetService.js
getUnprocessedData(sheet) {
  const data = sheet.getRange().getValues();

  // Business logic mixed with Google API calls
  const filtered = data.filter(row =>
    row[COLUMNS.EMAIL] && row[COLUMNS.FIRST_NAME] // ...
  );

  return filtered;
}
```

**After (Separation of Concerns):**
```javascript
// SheetService.js (Orchestration only)
getUnprocessedData(sheet) {
  const data = sheet.getRange().getValues();
  const allIndexes = data.map((_, i) => i + 2);

  // Delegate to pure logic
  const filtered = LeadValidation.filterUnprocessedRows(data, allIndexes);

  return filtered;
}
```

## Benefits

### 1. **Testability**
- Can test business logic without Google Apps Script environment
- No need to mock SpreadsheetApp, GmailApp, etc.
- Fast test execution

### 2. **Maintainability**
- Clear separation between business logic and I/O
- Easy to understand what each function does
- No hidden side effects

### 3. **Reusability**
- Pure functions can be used across multiple services
- No tight coupling to specific implementations

### 4. **Refactoring Safety**
- Tests verify behavior remains consistent
- Can confidently refactor without breaking changes

## Backward Compatibility

Utils.js has been updated to delegate to these logic modules, maintaining backward compatibility:

```javascript
// Utils.js (Backward compatible wrapper)
parseEmailContent(content) {
  return EmailParser.parseEmailContent(content);
}
```

All existing code continues to work without modification.

## File Structure

```
apps-script/
├── logic/                          # Pure business logic (NEW)
│   ├── LeadValidation.js          # Lead validation logic
│   ├── ScheduleCalculator.js      # Schedule calculations
│   ├── EmailParser.js             # Email parsing logic
│   ├── BatchProcessor.js          # Batch processing utilities
│   ├── SetupHelpers.js            # Setup configuration
│   ├── RunAllTests.js             # Test runner
│   └── README.md                  # This file
│
├── SheetService.js                # Uses logic modules
├── EmailService.js                # Uses logic modules
├── ProcessingService.js           # Uses logic modules
├── Utils.js                       # Delegates to logic modules
└── ...
```

## Next Steps

### Phase 2 (Future Enhancement)

If needed, you can further improve testability by:

1. **Adding lightweight API wrappers** for integration testing
2. **Refactoring services** into single-responsibility methods
3. **Implementing dependency injection** for critical paths

But for now, **Phase 1 is complete** - you have 60-70% of your business logic testable!

---

**Created:** 2025-01-06
**Pattern:** Functional Core, Imperative Shell
**Goal:** Make business logic testable without rewriting entire codebase
