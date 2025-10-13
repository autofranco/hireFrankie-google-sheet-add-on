/**
 * LeadValidation.js - Pure Business Logic for Lead Validation
 *
 * All functions are pure (no side effects, deterministic)
 * 100% testable without Google APIs
 */

const LeadValidation = {

  /**
   * Check if a lead row has all required fields
   * Pure function - no side effects
   *
   * @param {Array} row - Row data array indexed by COLUMNS constants
   * @returns {Object} { isValid: boolean, errors: Array<string> }
   */
  isValidLead(row) {
    const errors = [];

    if (!row[COLUMNS.EMAIL] || row[COLUMNS.EMAIL].toString().trim() === '') {
      errors.push('Missing email address');
    }

    if (!row[COLUMNS.FIRST_NAME] || row[COLUMNS.FIRST_NAME].toString().trim() === '') {
      errors.push('Missing first name');
    }

    if (!row[COLUMNS.COMPANY_URL] || row[COLUMNS.COMPANY_URL].toString().trim() === '') {
      errors.push('Missing company URL');
    }

    if (!row[COLUMNS.POSITION] || row[COLUMNS.POSITION].toString().trim() === '') {
      errors.push('Missing position');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  },

  /**
   * Determine if a row should be processed based on status and validity
   * Pure function - no side effects
   *
   * @param {string} status - Current status value
   * @param {Array} row - Row data array
   * @returns {boolean} True if row should be processed
   */
  shouldProcess(status, row) {
    // Process if status is empty or 'Processing'
    const statusAllowsProcessing = !status || status === '' || status === 'Processing';

    if (!statusAllowsProcessing) {
      return false;
    }

    // Check if row has valid data
    const validation = this.isValidLead(row);
    return validation.isValid;
  },

  /**
   * Filter rows to find unprocessed leads
   * Pure function - no side effects
   *
   * @param {Array<Array>} dataRows - 2D array of row data
   * @param {Array<number>} rowIndexes - Corresponding row indexes (1-based)
   * @returns {Object} { rows: Array, indexes: Array }
   */
  filterUnprocessedRows(dataRows, rowIndexes) {
    const unprocessedRows = [];
    const unprocessedIndexes = [];

    dataRows.forEach((row, i) => {
      const status = row[COLUMNS.STATUS];

      if (this.shouldProcess(status, row)) {
        unprocessedRows.push(row);
        unprocessedIndexes.push(rowIndexes[i]);
      }
    });

    return {
      rows: unprocessedRows,
      indexes: unprocessedIndexes
    };
  },

  /**
   * Validate character limit for a field
   * Pure function - no side effects
   *
   * @param {string} value - Field value to validate
   * @param {number} limit - Maximum character count
   * @param {string} fieldName - Name of the field (for error message)
   * @returns {Object} { isValid: boolean, error: string|null, length: number }
   */
  validateCharacterLimit(value, limit, fieldName) {
    if (!value || typeof value !== 'string') {
      return {
        isValid: true,
        error: null,
        length: 0
      };
    }

    const length = value.length;

    if (length > limit) {
      return {
        isValid: false,
        error: `${fieldName} 超出字符限制！\n當前長度: ${length}\n限制: ${limit}\n超出: ${length - limit} 字符`,
        length: length
      };
    }

    return {
      isValid: true,
      error: null,
      length: length
    };
  },

  /**
   * Validate email format
   * Pure function - no side effects
   *
   * @param {string} email - Email address to validate
   * @returns {boolean} True if email format is valid
   */
  isValidEmail(email) {
    if (!email || typeof email !== 'string') {
      return false;
    }

    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }
};

// ============================================
// TEST FUNCTIONS (Run manually in Apps Script)
// ============================================

/**
 * Test LeadValidation.isValidLead
 */
function testIsValidLead() {
  console.log('=== Testing isValidLead ===');

  // Test valid lead
  const validRow = new Array(18).fill('');
  validRow[COLUMNS.EMAIL] = 'test@example.com';
  validRow[COLUMNS.FIRST_NAME] = 'John';
  validRow[COLUMNS.COMPANY_URL] = 'https://company.com';
  validRow[COLUMNS.DEPARTMENT] = 'Engineering';
  validRow[COLUMNS.POSITION] = 'CTO';

  const result1 = LeadValidation.isValidLead(validRow);
  console.log('Valid lead:', result1);
  assert(result1.isValid === true, 'Should be valid');
  assert(result1.errors.length === 0, 'Should have no errors');

  // Test invalid lead (missing email)
  const invalidRow = new Array(18).fill('');
  invalidRow[COLUMNS.FIRST_NAME] = 'John';

  const result2 = LeadValidation.isValidLead(invalidRow);
  console.log('Invalid lead:', result2);
  assert(result2.isValid === false, 'Should be invalid');
  assert(result2.errors.length > 0, 'Should have errors');

  console.log('✅ isValidLead tests passed');
}

/**
 * Test LeadValidation.shouldProcess
 */
function testShouldProcess() {
  console.log('=== Testing shouldProcess ===');

  const validRow = new Array(18).fill('');
  validRow[COLUMNS.EMAIL] = 'test@example.com';
  validRow[COLUMNS.FIRST_NAME] = 'John';
  validRow[COLUMNS.COMPANY_URL] = 'https://company.com';
  validRow[COLUMNS.DEPARTMENT] = 'Engineering';
  validRow[COLUMNS.POSITION] = 'CTO';

  // Should process empty status
  assert(LeadValidation.shouldProcess('', validRow) === true, 'Should process empty status');

  // Should process 'Processing' status
  assert(LeadValidation.shouldProcess('Processing', validRow) === true, 'Should process Processing status');

  // Should NOT process 'Done' status
  assert(LeadValidation.shouldProcess('Done', validRow) === false, 'Should not process Done status');

  // Should NOT process 'Running' status
  assert(LeadValidation.shouldProcess('Running', validRow) === false, 'Should not process Running status');

  // Should NOT process invalid row
  const invalidRow = new Array(18).fill('');
  assert(LeadValidation.shouldProcess('', invalidRow) === false, 'Should not process invalid row');

  console.log('✅ shouldProcess tests passed');
}

/**
 * Test LeadValidation.filterUnprocessedRows
 */
function testFilterUnprocessedRows() {
  console.log('=== Testing filterUnprocessedRows ===');

  const validRow = new Array(18).fill('');
  validRow[COLUMNS.EMAIL] = 'test@example.com';
  validRow[COLUMNS.FIRST_NAME] = 'John';
  validRow[COLUMNS.COMPANY_URL] = 'https://company.com';
  validRow[COLUMNS.DEPARTMENT] = 'Engineering';
  validRow[COLUMNS.POSITION] = 'CTO';

  const doneRow = [...validRow];
  doneRow[COLUMNS.STATUS] = 'Done';

  const processingRow = [...validRow];
  processingRow[COLUMNS.STATUS] = 'Processing';

  const dataRows = [validRow, doneRow, processingRow];
  const rowIndexes = [2, 3, 4];

  const result = LeadValidation.filterUnprocessedRows(dataRows, rowIndexes);

  console.log('Filtered result:', result);
  assert(result.rows.length === 2, 'Should return 2 unprocessed rows');
  assert(result.indexes.length === 2, 'Should return 2 indexes');
  assert(result.indexes[0] === 2, 'First index should be 2');
  assert(result.indexes[1] === 4, 'Second index should be 4');

  console.log('✅ filterUnprocessedRows tests passed');
}

/**
 * Test LeadValidation.validateCharacterLimit
 */
function testValidateCharacterLimit() {
  console.log('=== Testing validateCharacterLimit ===');

  // Valid length
  const result1 = LeadValidation.validateCharacterLimit('Hello', 10, 'Test Field');
  assert(result1.isValid === true, 'Should be valid');
  assert(result1.length === 5, 'Length should be 5');

  // Exceeds limit
  const result2 = LeadValidation.validateCharacterLimit('Hello World!', 5, 'Test Field');
  assert(result2.isValid === false, 'Should be invalid');
  assert(result2.error.includes('超出字符限制'), 'Should have error message');

  // Empty string
  const result3 = LeadValidation.validateCharacterLimit('', 10, 'Test Field');
  assert(result3.isValid === true, 'Empty should be valid');

  console.log('✅ validateCharacterLimit tests passed');
}

/**
 * Test LeadValidation.isValidEmail
 */
function testIsValidEmail() {
  console.log('=== Testing isValidEmail ===');

  assert(LeadValidation.isValidEmail('test@example.com') === true, 'Valid email should pass');
  assert(LeadValidation.isValidEmail('user.name+tag@example.co.uk') === true, 'Complex email should pass');
  assert(LeadValidation.isValidEmail('invalid.email') === false, 'Invalid email should fail');
  assert(LeadValidation.isValidEmail('') === false, 'Empty email should fail');
  assert(LeadValidation.isValidEmail(null) === false, 'Null should fail');

  console.log('✅ isValidEmail tests passed');
}

/**
 * Run all LeadValidation tests
 */
function runAllLeadValidationTests() {
  console.log('========================================');
  console.log('Running All LeadValidation Tests');
  console.log('========================================');

  testIsValidLead();
  testShouldProcess();
  testFilterUnprocessedRows();
  testValidateCharacterLimit();
  testIsValidEmail();

  console.log('========================================');
  console.log('✅ ALL TESTS PASSED');
  console.log('========================================');
}
