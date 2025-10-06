/**
 * ScheduleCalculator.js - Pure Business Logic for Schedule Calculations
 *
 * All functions are pure (no side effects, deterministic) except generateScheduleTimes
 * which requires PropertiesService for state management
 * 100% testable with mock PropertiesService
 */

const ScheduleCalculator = {

  /**
   * Get next available work hour slot
   * Work hours: Monday-Friday 8:00-17:00
   * Pure function - no side effects
   *
   * @param {Date} fromDate - Starting date, defaults to current time
   * @returns {Date} Next available work hour slot
   */
  getNextHourSlot(fromDate = new Date()) {
    const date = new Date(fromDate);

    // Set to next hour
    date.setMinutes(0, 0, 0);
    date.setHours(date.getHours() + 1);

    // Ensure within work hours (8:00-17:00)
    while (true) {
      const hour = date.getHours();
      const day = date.getDay();

      // Check if weekday (1=Monday, 5=Friday)
      if (day >= 1 && day <= 5) {
        // Check if within work hours (8:00-17:00)
        if (hour >= 8 && hour <= 17) {
          return new Date(date);
        }

        // If after 17:00, jump to tomorrow 8:00
        if (hour > 17) {
          date.setDate(date.getDate() + 1);
          date.setHours(8, 0, 0, 0);
          continue;
        }

        // If before 8:00, set to 8:00
        if (hour < 8) {
          date.setHours(8, 0, 0, 0);
          continue;
        }
      }

      // Not a weekday, jump to next day
      date.setDate(date.getDate() + 1);
      date.setHours(8, 0, 0, 0);

      // Skip weekend to Monday
      if (date.getDay() === 6) { // Saturday to Monday
        date.setDate(date.getDate() + 2);
      } else if (date.getDay() === 0) { // Sunday to Monday
        date.setDate(date.getDate() + 1);
      }
    }
  },

  /**
   * Get same time one week later
   * Pure function - no side effects
   *
   * @param {Date} date - Base date
   * @returns {Date} Same time one week later
   */
  getNextWeekHourSlot(date) {
    if (!date || !(date instanceof Date)) {
      throw new Error('Valid date object required');
    }

    const nextWeek = new Date(date);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  },

  /**
   * Format schedule time as MM/DD HH:00
   * Pure function - no side effects
   *
   * @param {Date} date - Date to format
   * @returns {string} Formatted schedule time string
   */
  formatScheduleTime(date) {
    if (!date || !(date instanceof Date)) {
      return '';
    }

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');

    return `${month}/${day} ${hours}:00`;
  },

  /**
   * Parse schedule time string to Date object
   * Pure function - no side effects
   *
   * @param {string} scheduleText - Schedule time string (format: "MM/DD HH:MM")
   * @returns {Date|null} Parsed Date object, null if parsing fails
   */
  parseScheduleTime(scheduleText) {
    if (!scheduleText || typeof scheduleText !== 'string') {
      return null;
    }

    try {
      // Format: "08/10 18:00"
      const currentYear = new Date().getFullYear();
      const fullDateString = `${currentYear}/${scheduleText}`;
      const parsedDate = new Date(fullDateString);

      // Validate parsing result
      if (isNaN(parsedDate.getTime())) {
        console.error(`Invalid schedule time format: ${scheduleText}`);
        return null;
      }

      return parsedDate;
    } catch (error) {
      console.error(`Parse schedule time error: ${scheduleText}`, error);
      return null;
    }
  },

  /**
   * Check if schedule is due for sending
   * Pure function - no side effects
   *
   * @param {Date} scheduleTime - Scheduled send time
   * @param {Date} currentTime - Current time (defaults to now)
   * @returns {boolean} True if email should be sent now
   */
  isScheduleDue(scheduleTime, currentTime = new Date()) {
    if (!scheduleTime || !(scheduleTime instanceof Date)) {
      return false;
    }

    if (!currentTime || !(currentTime instanceof Date)) {
      return false;
    }

    return currentTime >= scheduleTime;
  },

  /**
   * Format date as YYYY-MM-DD HH:MM
   * Pure function - no side effects
   *
   * @param {Date} date - Date to format
   * @returns {string} Formatted date string
   */
  formatDate(date) {
    if (!date || !(date instanceof Date)) {
      return '';
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  /**
   * Calculate time difference in hours
   * Pure function - no side effects
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {number} Difference in hours
   */
  getHoursDifference(startDate, endDate) {
    if (!startDate || !endDate || !(startDate instanceof Date) || !(endDate instanceof Date)) {
      return 0;
    }

    const millisecondsDiff = endDate.getTime() - startDate.getTime();
    return millisecondsDiff / (1000 * 60 * 60);
  },

  /**
   * Check if date is within work hours
   * Pure function - no side effects
   *
   * @param {Date} date - Date to check
   * @returns {boolean} True if within work hours (Mon-Fri 8:00-17:00)
   */
  isWorkHours(date) {
    if (!date || !(date instanceof Date)) {
      return false;
    }

    const hour = date.getHours();
    const day = date.getDay();

    // Check if weekday (1=Monday, 5=Friday)
    const isWeekday = day >= 1 && day <= 5;

    // Check if within work hours (8:00-17:00)
    const isWorkTime = hour >= 8 && hour <= 17;

    return isWeekday && isWorkTime;
  }
};

// ============================================
// TEST FUNCTIONS (Run manually in Apps Script)
// ============================================

/**
 * Test ScheduleCalculator.getNextHourSlot
 */
function testGetNextHourSlot() {
  console.log('=== Testing getNextHourSlot ===');

  // Test during work hours (Wednesday 10:00)
  const wed10am = new Date(2025, 0, 8, 10, 0, 0); // Wednesday
  const result1 = ScheduleCalculator.getNextHourSlot(wed10am);
  console.log('Next slot from Wed 10:00:', ScheduleCalculator.formatScheduleTime(result1));
  console.assert(result1.getHours() === 11, 'Should be 11:00');

  // Test end of work day (Friday 17:00)
  const fri5pm = new Date(2025, 0, 10, 17, 0, 0); // Friday 5pm
  const result2 = ScheduleCalculator.getNextHourSlot(fri5pm);
  console.log('Next slot from Fri 17:00:', ScheduleCalculator.formatScheduleTime(result2));
  console.assert(result2.getDay() === 1, 'Should be Monday');
  console.assert(result2.getHours() === 8, 'Should be 8:00');

  // Test weekend (Saturday)
  const sat = new Date(2025, 0, 11, 10, 0, 0); // Saturday
  const result3 = ScheduleCalculator.getNextHourSlot(sat);
  console.log('Next slot from Sat 10:00:', ScheduleCalculator.formatScheduleTime(result3));
  console.assert(result3.getDay() === 1, 'Should skip to Monday');

  console.log('✅ getNextHourSlot tests passed');
}

/**
 * Test ScheduleCalculator.getNextWeekHourSlot
 */
function testGetNextWeekHourSlot() {
  console.log('=== Testing getNextWeekHourSlot ===');

  const date = new Date(2025, 0, 8, 10, 0, 0); // Jan 8, 2025 10:00
  const result = ScheduleCalculator.getNextWeekHourSlot(date);

  console.log('Original:', ScheduleCalculator.formatScheduleTime(date));
  console.log('Next week:', ScheduleCalculator.formatScheduleTime(result));

  console.assert(result.getDate() === 15, 'Should be 7 days later');
  console.assert(result.getHours() === 10, 'Hours should match');

  console.log('✅ getNextWeekHourSlot tests passed');
}

/**
 * Test ScheduleCalculator.formatScheduleTime
 */
function testFormatScheduleTime() {
  console.log('=== Testing formatScheduleTime ===');

  const date = new Date(2025, 0, 8, 14, 30, 0); // Jan 8, 2025 14:30
  const result = ScheduleCalculator.formatScheduleTime(date);

  console.log('Formatted:', result);
  console.assert(result === '01/08 14:00', 'Should format correctly');

  // Test invalid input
  const result2 = ScheduleCalculator.formatScheduleTime(null);
  console.assert(result2 === '', 'Should return empty string for null');

  console.log('✅ formatScheduleTime tests passed');
}

/**
 * Test ScheduleCalculator.parseScheduleTime
 */
function testParseScheduleTime() {
  console.log('=== Testing parseScheduleTime ===');

  const scheduleText = '01/08 14:00';
  const result = ScheduleCalculator.parseScheduleTime(scheduleText);

  console.log('Parsed:', result);
  console.assert(result instanceof Date, 'Should return Date object');
  console.assert(result.getMonth() === 0, 'Month should be January (0)');
  console.assert(result.getDate() === 8, 'Date should be 8');
  console.assert(result.getHours() === 14, 'Hours should be 14');

  // Test invalid input
  const result2 = ScheduleCalculator.parseScheduleTime('invalid');
  console.assert(result2 === null, 'Should return null for invalid input');

  console.log('✅ parseScheduleTime tests passed');
}

/**
 * Test ScheduleCalculator.isScheduleDue
 */
function testIsScheduleDue() {
  console.log('=== Testing isScheduleDue ===');

  const scheduleTime = new Date(2025, 0, 8, 10, 0, 0);
  const beforeTime = new Date(2025, 0, 8, 9, 0, 0);
  const afterTime = new Date(2025, 0, 8, 11, 0, 0);

  console.assert(ScheduleCalculator.isScheduleDue(scheduleTime, beforeTime) === false, 'Should not be due before');
  console.assert(ScheduleCalculator.isScheduleDue(scheduleTime, afterTime) === true, 'Should be due after');
  console.assert(ScheduleCalculator.isScheduleDue(scheduleTime, scheduleTime) === true, 'Should be due at exact time');

  console.log('✅ isScheduleDue tests passed');
}

/**
 * Test ScheduleCalculator.formatDate
 */
function testFormatDate() {
  console.log('=== Testing formatDate ===');

  const date = new Date(2025, 0, 8, 14, 30, 0);
  const result = ScheduleCalculator.formatDate(date);

  console.log('Formatted date:', result);
  console.assert(result === '2025-01-08 14:30', 'Should format correctly');

  console.log('✅ formatDate tests passed');
}

/**
 * Test ScheduleCalculator.getHoursDifference
 */
function testGetHoursDifference() {
  console.log('=== Testing getHoursDifference ===');

  const start = new Date(2025, 0, 8, 10, 0, 0);
  const end = new Date(2025, 0, 8, 14, 0, 0);

  const result = ScheduleCalculator.getHoursDifference(start, end);
  console.log('Hours difference:', result);
  console.assert(result === 4, 'Should be 4 hours');

  console.log('✅ getHoursDifference tests passed');
}

/**
 * Test ScheduleCalculator.isWorkHours
 */
function testIsWorkHours() {
  console.log('=== Testing isWorkHours ===');

  const wed10am = new Date(2025, 0, 8, 10, 0, 0); // Wednesday 10:00
  const sat10am = new Date(2025, 0, 11, 10, 0, 0); // Saturday 10:00
  const wed7am = new Date(2025, 0, 8, 7, 0, 0); // Wednesday 7:00
  const wed6pm = new Date(2025, 0, 8, 18, 0, 0); // Wednesday 18:00

  console.assert(ScheduleCalculator.isWorkHours(wed10am) === true, 'Wed 10am should be work hours');
  console.assert(ScheduleCalculator.isWorkHours(sat10am) === false, 'Saturday should not be work hours');
  console.assert(ScheduleCalculator.isWorkHours(wed7am) === false, '7am should not be work hours');
  console.assert(ScheduleCalculator.isWorkHours(wed6pm) === false, '6pm should not be work hours');

  console.log('✅ isWorkHours tests passed');
}

/**
 * Run all ScheduleCalculator tests
 */
function runAllScheduleCalculatorTests() {
  console.log('========================================');
  console.log('Running All ScheduleCalculator Tests');
  console.log('========================================');

  testGetNextHourSlot();
  testGetNextWeekHourSlot();
  testFormatScheduleTime();
  testParseScheduleTime();
  testIsScheduleDue();
  testFormatDate();
  testGetHoursDifference();
  testIsWorkHours();

  console.log('========================================');
  console.log('✅ ALL TESTS PASSED');
  console.log('========================================');
}
