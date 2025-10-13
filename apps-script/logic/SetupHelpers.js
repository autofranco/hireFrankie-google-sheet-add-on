/**
 * SetupHelpers.js - Pure Business Logic for Sheet Setup Configuration
 *
 * All functions are pure (no side effects, deterministic)
 * 100% testable without Google APIs
 */

const SetupHelpers = {

  /**
   * Create header row array
   * Pure function - no side effects
   *
   * @returns {Array<string>} Header row array
   */
  createHeaderRow() {
    return [
      'Email Address*',
      'First Name*',
      'Company url*',
      'Department*',
      'Position*',
      'Leads Profile',
      '1st mail angle',
      '1st follow up mail',
      '1st mail schedule',
      '2nd mail angle',
      '2nd follow up mail',
      '2nd mail schedule',
      '3rd mail angle',
      '3rd follow up mail',
      '3rd mail schedule',
      'send now',
      'status',
      'info'
    ];
  },

  /**
   * Get column width configuration
   * Pure function - no side effects
   *
   * @returns {Object} Column index to width mapping (1-indexed)
   */
  getColumnWidthConfig() {
    return {
      1: 110,  // Email Address
      2: 80,   // First Name
      3: 95,   // Company url
      4: 70,   // Department
      5: 70,   // Position
      6: 200,  // Leads Profile
      7: 150,  // 1st mail angle
      8: 150,  // 1st follow up mail
      9: 75,   // 1st mail schedule
      10: 150, // 2nd mail angle
      11: 150, // 2nd follow up mail
      12: 75,  // 2nd mail schedule
      13: 150, // 3rd mail angle
      14: 150, // 3rd follow up mail
      15: 75,  // 3rd mail schedule
      16: 70,  // send now
      17: 70,  // status
      18: 200  // info
    };
  },

  /**
   * Get indices of headers that should be gray
   * Pure function - no side effects
   *
   * @param {Array<string>} headers - Header row array
   * @returns {Array<number>} Array of column indices (1-indexed)
   */
  getGrayHeaderIndices(headers) {
    const grayHeaders = [
      'Leads Profile',
      '1st mail angle',
      '1st follow up mail',
      '1st mail schedule',
      '2nd mail angle',
      '2nd follow up mail',
      '2nd mail schedule',
      '3rd mail angle',
      '3rd follow up mail',
      '3rd mail schedule',
      'send now',
      'status',
      'info'
    ];

    return grayHeaders
      .map(headerText => headers.indexOf(headerText) + 1)
      .filter(index => index > 0); // Filter out -1 (not found) results
  },

  /**
   * Get status dropdown values
   * Pure function - no side effects
   *
   * @returns {Array<string>} Status values for dropdown
   */
  getStatusDropdownValues() {
    return ['', 'Processing', 'Running', 'Done'];
  },

  /**
   * Get status color configuration
   * Pure function - no side effects
   *
   * @param {string} status - Status value
   * @returns {Object} { background: string, fontColor: string }
   */
  getStatusColor(status) {
    switch (status) {
      case 'Running':
        return {
          background: '#f0f0f0', // Light gray
          fontColor: '#666666'   // Dark gray
        };
      case 'Processing':
      case 'Done':
        return {
          background: null,      // No background
          fontColor: null        // Default font color
        };
      default:
        return {
          background: null,      // Transparent
          fontColor: null        // Default font color
        };
    }
  },

  /**
   * Get info color configuration based on message content
   * Pure function - no side effects
   *
   * @param {string} infoMessage - Info message content
   * @returns {Object} { background: string, fontColor: string }
   */
  getInfoColor(infoMessage) {
    if (!infoMessage || typeof infoMessage !== 'string') {
      return {
        background: null,
        fontColor: null
      };
    }

    const message = infoMessage.toLowerCase();

    if (message.includes('bounced')) {
      return {
        background: '#ffebee', // Light red
        fontColor: '#c62828'   // Dark red
      };
    } else if (message.includes('email opened') || message.includes('opened')) {
      return {
        background: '#e8f5e8', // Light green
        fontColor: '#2e7d32'   // Dark green
      };
    } else if (message.includes('lead replied') || message.includes('replied')) {
      return {
        background: '#e3f2fd', // Light blue
        fontColor: '#1565c0'   // Dark blue
      };
    }

    return {
      background: null,
      fontColor: null
    };
  },

  /**
   * Generate spreadsheet title with timestamp
   * Pure function - no side effects
   *
   * @param {string} currentTitle - Current spreadsheet title
   * @param {Date} timestamp - Timestamp for title (defaults to now)
   * @returns {string} New title or original if already contains marker
   */
  generateSpreadsheetTitle(currentTitle, timestamp = new Date()) {
    if (!currentTitle || typeof currentTitle !== 'string') {
      currentTitle = 'Untitled';
    }

    // If already contains marker, return as is
    if (currentTitle.includes('Auto Lead Warmer')) {
      return currentTitle;
    }

    const dateStr = `${(timestamp.getMonth() + 1).toString().padStart(2, '0')}/${timestamp.getDate().toString().padStart(2, '0')}`;
    const timeStr = `${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}`;

    return `${currentTitle} - Auto Lead Warmer (${dateStr} ${timeStr})`;
  },

  /**
   * Get mail angle column indices
   * Pure function - no side effects
   *
   * @returns {Array<number>} Array of column indices (1-indexed)
   */
  getMailAngleColumns() {
    return [
      COLUMNS.MAIL_ANGLE_1 + 1,
      COLUMNS.MAIL_ANGLE_2 + 1,
      COLUMNS.MAIL_ANGLE_3 + 1
    ];
  },

  /**
   * Get schedule column indices
   * Pure function - no side effects
   *
   * @returns {Array<number>} Array of column indices (1-indexed)
   */
  getScheduleColumns() {
    return [
      COLUMNS.SCHEDULE_1 + 1,
      COLUMNS.SCHEDULE_2 + 1,
      COLUMNS.SCHEDULE_3 + 1
    ];
  },

  /**
   * Get follow-up mail column indices
   * Pure function - no side effects
   *
   * @returns {Array<number>} Array of column indices (1-indexed)
   */
  getFollowUpMailColumns() {
    return [
      COLUMNS.FOLLOW_UP_1 + 1,
      COLUMNS.FOLLOW_UP_2 + 1,
      COLUMNS.FOLLOW_UP_3 + 1
    ];
  },

  /**
   * Validate header row
   * Pure function - no side effects
   *
   * @param {Array<string>} actualHeaders - Actual header row from sheet
   * @returns {Object} { isValid: boolean, errors: Array<string> }
   */
  validateHeaderRow(actualHeaders) {
    const expectedHeaders = this.createHeaderRow();
    const errors = [];

    if (!Array.isArray(actualHeaders)) {
      errors.push('Headers must be an array');
      return { isValid: false, errors: errors };
    }

    if (actualHeaders.length !== expectedHeaders.length) {
      errors.push(`Expected ${expectedHeaders.length} columns, found ${actualHeaders.length}`);
    }

    // Check each required column
    expectedHeaders.forEach((expected, index) => {
      if (actualHeaders[index] !== expected) {
        errors.push(`Column ${index + 1}: expected "${expected}", found "${actualHeaders[index]}"`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  },

  /**
   * Calculate default row height
   * Pure function - no side effects
   *
   * @returns {number} Row height in pixels
   */
  getDefaultRowHeight() {
    return 200;
  },

  /**
   * Get header row styling configuration
   * Pure function - no side effects
   *
   * @returns {Object} Styling properties
   */
  getHeaderRowStyle() {
    return {
      fontWeight: 'bold',
      background: '#f0f0f0',
      grayFontColor: '#949494'
    };
  }
};

// ============================================
// TEST FUNCTIONS (Run manually in Apps Script)
// ============================================

/**
 * Test SetupHelpers.createHeaderRow
 */
function testCreateHeaderRow() {
  console.log('=== Testing createHeaderRow ===');

  const headers = SetupHelpers.createHeaderRow();

  console.log('Headers:', headers);
  assert(Array.isArray(headers), 'Should return array');
  assert(headers.length === 18, 'Should have 18 columns');
  assert(headers[0] === 'Email Address*', 'First column should be Email Address*');
  assert(headers[17] === 'info', 'Last column should be info');

  console.log('✅ createHeaderRow tests passed');
}

/**
 * Test SetupHelpers.getColumnWidthConfig
 */
function testGetColumnWidthConfig() {
  console.log('=== Testing getColumnWidthConfig ===');

  const config = SetupHelpers.getColumnWidthConfig();

  console.log('Column widths:', config);
  assert(typeof config === 'object', 'Should return object');
  assert(config[1] === 110, 'Email column should be 110px');
  assert(config[18] === 200, 'Info column should be 200px');

  console.log('✅ getColumnWidthConfig tests passed');
}

/**
 * Test SetupHelpers.getGrayHeaderIndices
 */
function testGetGrayHeaderIndices() {
  console.log('=== Testing getGrayHeaderIndices ===');

  const headers = SetupHelpers.createHeaderRow();
  const grayIndices = SetupHelpers.getGrayHeaderIndices(headers);

  console.log('Gray header indices:', grayIndices);
  assert(Array.isArray(grayIndices), 'Should return array');
  assert(grayIndices.length === 13, 'Should have 13 gray headers');
  assert(grayIndices.includes(6), 'Should include Leads Profile column (6)');

  console.log('✅ getGrayHeaderIndices tests passed');
}

/**
 * Test SetupHelpers.getStatusDropdownValues
 */
function testGetStatusDropdownValues() {
  console.log('=== Testing getStatusDropdownValues ===');

  const values = SetupHelpers.getStatusDropdownValues();

  console.log('Status values:', values);
  assert(Array.isArray(values), 'Should return array');
  assert(values.length === 4, 'Should have 4 status values');
  assert(values.includes('Running'), 'Should include Running');

  console.log('✅ getStatusDropdownValues tests passed');
}

/**
 * Test SetupHelpers.getStatusColor
 */
function testGetStatusColor() {
  console.log('=== Testing getStatusColor ===');

  const runningColor = SetupHelpers.getStatusColor('Running');
  const doneColor = SetupHelpers.getStatusColor('Done');

  console.log('Running color:', runningColor);
  console.log('Done color:', doneColor);

  assert(runningColor.background === '#f0f0f0', 'Running should have gray background');
  assert(doneColor.background === null, 'Done should have no background');

  console.log('✅ getStatusColor tests passed');
}

/**
 * Test SetupHelpers.getInfoColor
 */
function testGetInfoColor() {
  console.log('=== Testing getInfoColor ===');

  const bouncedColor = SetupHelpers.getInfoColor('Email bounced');
  const openedColor = SetupHelpers.getInfoColor('已開信');
  const repliedColor = SetupHelpers.getInfoColor('已回信');
  const normalColor = SetupHelpers.getInfoColor('Normal message');

  console.log('Bounced color:', bouncedColor);
  console.log('Opened color:', openedColor);
  console.log('Replied color:', repliedColor);
  console.log('Normal color:', normalColor);

  assert(bouncedColor.background === '#ffebee', 'Bounced should have red background');
  assert(openedColor.background === '#e8f5e8', 'Opened should have green background');
  assert(repliedColor.background === '#e3f2fd', 'Replied should have blue background');
  assert(normalColor.background === null, 'Normal should have no background');

  console.log('✅ getInfoColor tests passed');
}

/**
 * Test SetupHelpers.generateSpreadsheetTitle
 */
function testGenerateSpreadsheetTitle() {
  console.log('=== Testing generateSpreadsheetTitle ===');

  const timestamp = new Date(2025, 0, 8, 14, 30, 0);

  const title1 = SetupHelpers.generateSpreadsheetTitle('My Sheet', timestamp);
  const title2 = SetupHelpers.generateSpreadsheetTitle('My Sheet - Auto Lead Warmer (01/08 14:30)', timestamp);

  console.log('New title:', title1);
  console.log('Existing title:', title2);

  assert(title1.includes('Auto Lead Warmer'), 'Should add marker');
  assert(title1.includes('01/08'), 'Should include date');
  assert(title2 === 'My Sheet - Auto Lead Warmer (01/08 14:30)', 'Should not modify existing');

  console.log('✅ generateSpreadsheetTitle tests passed');
}

/**
 * Test SetupHelpers.validateHeaderRow
 */
function testValidateHeaderRow() {
  console.log('=== Testing validateHeaderRow ===');

  const validHeaders = SetupHelpers.createHeaderRow();
  const invalidHeaders = ['Wrong', 'Headers'];

  const result1 = SetupHelpers.validateHeaderRow(validHeaders);
  const result2 = SetupHelpers.validateHeaderRow(invalidHeaders);

  console.log('Valid result:', result1);
  console.log('Invalid result:', result2);

  assert(result1.isValid === true, 'Valid headers should pass');
  assert(result2.isValid === false, 'Invalid headers should fail');
  assert(result2.errors.length > 0, 'Invalid headers should have errors');

  console.log('✅ validateHeaderRow tests passed');
}

/**
 * Run all SetupHelpers tests
 */
function runAllSetupHelpersTests() {
  console.log('========================================');
  console.log('Running All SetupHelpers Tests');
  console.log('========================================');

  testCreateHeaderRow();
  testGetColumnWidthConfig();
  testGetGrayHeaderIndices();
  testGetStatusDropdownValues();
  testGetStatusColor();
  testGetInfoColor();
  testGenerateSpreadsheetTitle();
  testValidateHeaderRow();

  console.log('========================================');
  console.log('✅ ALL TESTS PASSED');
  console.log('========================================');
}
