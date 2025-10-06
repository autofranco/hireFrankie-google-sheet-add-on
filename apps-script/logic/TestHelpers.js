/**
 * Test Helpers for Apps Script
 *
 * This module provides custom assertion functions that work in Google Apps Script environment.
 * Apps Script doesn't support console.assert(), so we provide alternatives that throw errors
 * on assertion failures.
 */

const TestHelpers = {
  /**
   * Assert that a condition is true
   * @param {boolean} condition - The condition to check
   * @param {string} message - Error message if assertion fails
   * @throws {Error} If condition is false
   */
  assert(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  },

  /**
   * Assert that two values are equal (using ===)
   * @param {*} actual - The actual value
   * @param {*} expected - The expected value
   * @param {string} [message] - Optional custom error message
   * @throws {Error} If values are not equal
   */
  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      const msg = message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
      throw new Error(`Assertion failed: ${msg}`);
    }
  },

  /**
   * Assert that a value is truthy
   * @param {*} value - The value to check
   * @param {string} message - Error message if assertion fails
   * @throws {Error} If value is falsy
   */
  assertTruthy(value, message) {
    if (!value) {
      throw new Error(`Assertion failed: ${message} (got ${JSON.stringify(value)})`);
    }
  },

  /**
   * Assert that a value is falsy
   * @param {*} value - The value to check
   * @param {string} message - Error message if assertion fails
   * @throws {Error} If value is truthy
   */
  assertFalsy(value, message) {
    if (value) {
      throw new Error(`Assertion failed: ${message} (got ${JSON.stringify(value)})`);
    }
  },

  /**
   * Assert that a collection has a specific length
   * @param {Array|string} collection - The collection to check
   * @param {number} expectedLength - Expected length
   * @param {string} message - Error message if assertion fails
   * @throws {Error} If length doesn't match
   */
  assertLength(collection, expectedLength, message) {
    const actualLength = collection ? collection.length : 0;
    if (actualLength !== expectedLength) {
      const msg = message || `Expected length ${expectedLength}, got ${actualLength}`;
      throw new Error(`Assertion failed: ${msg}`);
    }
  },

  /**
   * Assert that a value is within a numeric range
   * @param {number} value - The value to check
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (inclusive)
   * @param {string} message - Error message if assertion fails
   * @throws {Error} If value is outside range
   */
  assertInRange(value, min, max, message) {
    if (value < min || value > max) {
      const msg = message || `Expected value between ${min} and ${max}, got ${value}`;
      throw new Error(`Assertion failed: ${msg}`);
    }
  },

  /**
   * Assert that a value is an instance of a specific type
   * @param {*} value - The value to check
   * @param {Function} type - The expected constructor/type
   * @param {string} message - Error message if assertion fails
   * @throws {Error} If value is not an instance of type
   */
  assertInstanceOf(value, type, message) {
    if (!(value instanceof type)) {
      const msg = message || `Expected instance of ${type.name}, got ${typeof value}`;
      throw new Error(`Assertion failed: ${msg}`);
    }
  },

  /**
   * Assert that a value is of a specific type
   * @param {*} value - The value to check
   * @param {string} expectedType - The expected type (from typeof)
   * @param {string} message - Error message if assertion fails
   * @throws {Error} If type doesn't match
   */
  assertType(value, expectedType, message) {
    const actualType = typeof value;
    if (actualType !== expectedType) {
      const msg = message || `Expected type ${expectedType}, got ${actualType}`;
      throw new Error(`Assertion failed: ${msg}`);
    }
  },

  /**
   * Assert that an array or object contains a specific element/property
   * @param {Array|Object} collection - The collection to check
   * @param {*} element - The element to find (or property name for objects)
   * @param {string} message - Error message if assertion fails
   * @throws {Error} If element is not found
   */
  assertContains(collection, element, message) {
    let found = false;

    if (Array.isArray(collection)) {
      found = collection.includes(element);
    } else if (typeof collection === 'object' && collection !== null) {
      found = element in collection;
    }

    if (!found) {
      const msg = message || `Expected collection to contain ${JSON.stringify(element)}`;
      throw new Error(`Assertion failed: ${msg}`);
    }
  },

  /**
   * Assert that two objects are deeply equal
   * @param {*} actual - The actual value
   * @param {*} expected - The expected value
   * @param {string} message - Error message if assertion fails
   * @throws {Error} If objects are not deeply equal
   */
  assertDeepEqual(actual, expected, message) {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);

    if (actualStr !== expectedStr) {
      const msg = message || `Expected ${expectedStr}, got ${actualStr}`;
      throw new Error(`Assertion failed: ${msg}`);
    }
  }
};

/**
 * Global assert function for backwards compatibility with console.assert() style
 * @param {boolean} condition - The condition to check
 * @param {string} message - Error message if assertion fails
 */
function assert(condition, message) {
  TestHelpers.assert(condition, message);
}
