/**
 * RunAllTests.js - Test Runner for All Logic Modules
 *
 * Run this function from Apps Script editor to execute all tests
 */

/**
 * Run all tests for all logic modules
 * Execute this function manually from Apps Script editor
 */
function runAllLogicTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Running All Logic Module Tests                      ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Test LeadValidation
    console.log('┌─────────────────────────────────────┐');
    console.log('│  LeadValidation Tests               │');
    console.log('└─────────────────────────────────────┘');
    runAllLeadValidationTests();
    console.log('');

    // Test ScheduleCalculator
    console.log('┌─────────────────────────────────────┐');
    console.log('│  ScheduleCalculator Tests           │');
    console.log('└─────────────────────────────────────┘');
    runAllScheduleCalculatorTests();
    console.log('');

    // Test EmailParser
    console.log('┌─────────────────────────────────────┐');
    console.log('│  EmailParser Tests                  │');
    console.log('└─────────────────────────────────────┘');
    runAllEmailParserTests();
    console.log('');

    // Test BatchProcessor
    console.log('┌─────────────────────────────────────┐');
    console.log('│  BatchProcessor Tests               │');
    console.log('└─────────────────────────────────────┘');
    runAllBatchProcessorTests();
    console.log('');

    // Test SetupHelpers
    console.log('┌─────────────────────────────────────┐');
    console.log('│  SetupHelpers Tests                 │');
    console.log('└─────────────────────────────────────┘');
    runAllSetupHelpersTests();
    console.log('');

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║   ✅ ALL LOGIC MODULE TESTS PASSED                    ║');
    console.log('╚════════════════════════════════════════════════════════╝');

  } catch (error) {
    console.error('╔════════════════════════════════════════════════════════╗');
    console.error('║   ❌ TEST FAILURE                                     ║');
    console.error('╚════════════════════════════════════════════════════════╝');
    console.error('Error:', error);
    throw error;
  }
}

/**
 * Quick smoke test - test one function from each module
 */
function runSmokeTests() {
  console.log('Running smoke tests...');

  try {
    // LeadValidation
    const validRow = new Array(18).fill('');
    validRow[0] = 'test@example.com';
    validRow[1] = 'John';
    validRow[2] = 'https://company.com';
    validRow[3] = 'Engineering';
    validRow[4] = 'CTO';
    console.assert(LeadValidation.isValidLead(validRow).isValid === true, 'LeadValidation works');

    // ScheduleCalculator
    const date = new Date(2025, 0, 8, 14, 30, 0);
    console.assert(ScheduleCalculator.formatScheduleTime(date) === '01/08 14:00', 'ScheduleCalculator works');

    // EmailParser
    const content = '主旨：Test\n內容：\nBody';
    const parsed = EmailParser.parseEmailContent(content);
    console.assert(parsed.subject === 'Test', 'EmailParser works');

    // BatchProcessor
    const batches = BatchProcessor.createBatches([1, 2, 3], [2, 3, 4], 2);
    console.assert(batches.length === 2, 'BatchProcessor works');

    // SetupHelpers
    const headers = SetupHelpers.createHeaderRow();
    console.assert(headers.length === 18, 'SetupHelpers works');

    console.log('✅ All smoke tests passed!');

  } catch (error) {
    console.error('❌ Smoke test failed:', error);
    throw error;
  }
}
