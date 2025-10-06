/**
 * BatchProcessor.js - Pure Business Logic for Batch Processing Operations
 *
 * All functions are pure (no side effects, deterministic)
 * 100% testable without Google APIs
 */

const BatchProcessor = {

  /**
   * Create batches from arrays
   * Pure function - no side effects
   *
   * @param {Array} rows - Array of row data
   * @param {Array} indexes - Array of row indexes
   * @param {number} batchSize - Size of each batch (default 10)
   * @returns {Array<Object>} Array of batch objects { rows, indexes, batchNumber }
   */
  createBatches(rows, indexes, batchSize = 10) {
    if (!Array.isArray(rows) || !Array.isArray(indexes)) {
      return [];
    }

    if (rows.length !== indexes.length) {
      throw new Error('Rows and indexes arrays must have the same length');
    }

    const batches = [];

    for (let i = 0; i < rows.length; i += batchSize) {
      batches.push({
        rows: rows.slice(i, i + batchSize),
        indexes: indexes.slice(i, i + batchSize),
        batchNumber: Math.floor(i / batchSize) + 1,
        totalBatches: Math.ceil(rows.length / batchSize)
      });
    }

    return batches;
  },

  /**
   * Map rows with their corresponding indexes
   * Pure function - no side effects
   *
   * @param {Array} rows - Array of row data
   * @param {Array} indexes - Array of row indexes
   * @returns {Array<Object>} Array of { row, rowIndex } objects
   */
  mapRowsWithIndexes(rows, indexes) {
    if (!Array.isArray(rows) || !Array.isArray(indexes)) {
      return [];
    }

    if (rows.length !== indexes.length) {
      throw new Error('Rows and indexes arrays must have the same length');
    }

    return rows.map((row, i) => ({
      row: row,
      rowIndex: indexes[i]
    }));
  },

  /**
   * Collect and aggregate batch processing results
   * Pure function - no side effects
   *
   * @param {Array<Object>} results - Array of result objects with { success, error }
   * @returns {Object} { successCount, errorCount, totalCount, successRate }
   */
  collectBatchResults(results) {
    if (!Array.isArray(results)) {
      return {
        successCount: 0,
        errorCount: 0,
        totalCount: 0,
        successRate: 0
      };
    }

    const successCount = results.filter(r => r && r.success === true).length;
    const errorCount = results.filter(r => r && r.success === false).length;
    const totalCount = results.length;
    const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;

    return {
      successCount: successCount,
      errorCount: errorCount,
      totalCount: totalCount,
      successRate: Math.round(successRate * 100) / 100 // Round to 2 decimal places
    };
  },

  /**
   * Split array into chunks
   * Pure function - no side effects
   *
   * @param {Array} array - Array to chunk
   * @param {number} chunkSize - Size of each chunk
   * @returns {Array<Array>} Array of chunks
   */
  chunkArray(array, chunkSize = 10) {
    if (!Array.isArray(array)) {
      return [];
    }

    if (chunkSize <= 0) {
      throw new Error('Chunk size must be greater than 0');
    }

    const chunks = [];

    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }

    return chunks;
  },

  /**
   * Calculate batch progress percentage
   * Pure function - no side effects
   *
   * @param {number} currentBatch - Current batch number (1-indexed)
   * @param {number} totalBatches - Total number of batches
   * @returns {number} Progress percentage (0-100)
   */
  calculateProgress(currentBatch, totalBatches) {
    if (totalBatches === 0) {
      return 0;
    }

    if (currentBatch < 1 || currentBatch > totalBatches) {
      throw new Error('Current batch must be between 1 and total batches');
    }

    const progress = (currentBatch / totalBatches) * 100;
    return Math.round(progress * 100) / 100; // Round to 2 decimal places
  },

  /**
   * Determine if more batches remain
   * Pure function - no side effects
   *
   * @param {number} currentBatch - Current batch number (1-indexed)
   * @param {number} totalBatches - Total number of batches
   * @returns {boolean} True if more batches remain
   */
  hasMoreBatches(currentBatch, totalBatches) {
    return currentBatch < totalBatches;
  },

  /**
   * Validate batch data structure
   * Pure function - no side effects
   *
   * @param {Object} batch - Batch object to validate
   * @returns {Object} { isValid: boolean, errors: Array<string> }
   */
  validateBatch(batch) {
    const errors = [];

    if (!batch || typeof batch !== 'object') {
      errors.push('Batch must be an object');
      return { isValid: false, errors: errors };
    }

    if (!Array.isArray(batch.rows)) {
      errors.push('Batch must have rows array');
    }

    if (!Array.isArray(batch.indexes)) {
      errors.push('Batch must have indexes array');
    }

    if (batch.rows && batch.indexes && batch.rows.length !== batch.indexes.length) {
      errors.push('Batch rows and indexes must have same length');
    }

    if (typeof batch.batchNumber !== 'number' || batch.batchNumber < 1) {
      errors.push('Batch number must be a positive number');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  },

  /**
   * Flatten array of batch results into single array
   * Pure function - no side effects
   *
   * @param {Array<Array>} batchResults - Array of arrays of results
   * @returns {Array} Flattened array
   */
  flattenBatchResults(batchResults) {
    if (!Array.isArray(batchResults)) {
      return [];
    }

    return batchResults.reduce((acc, batch) => {
      if (Array.isArray(batch)) {
        return acc.concat(batch);
      }
      return acc;
    }, []);
  },

  /**
   * Group results by status
   * Pure function - no side effects
   *
   * @param {Array<Object>} results - Array of result objects with success property
   * @returns {Object} { successful: Array, failed: Array }
   */
  groupResultsByStatus(results) {
    if (!Array.isArray(results)) {
      return { successful: [], failed: [] };
    }

    return {
      successful: results.filter(r => r && r.success === true),
      failed: results.filter(r => r && r.success === false)
    };
  }
};

// ============================================
// TEST FUNCTIONS (Run manually in Apps Script)
// ============================================

/**
 * Test BatchProcessor.createBatches
 */
function testCreateBatches() {
  console.log('=== Testing createBatches ===');

  const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const indexes = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

  const batches = BatchProcessor.createBatches(rows, indexes, 5);

  console.log('Batches:', batches);
  console.assert(batches.length === 3, 'Should create 3 batches');
  console.assert(batches[0].rows.length === 5, 'First batch should have 5 items');
  console.assert(batches[2].rows.length === 2, 'Last batch should have 2 items');
  console.assert(batches[0].batchNumber === 1, 'First batch number should be 1');
  console.assert(batches[0].totalBatches === 3, 'Total batches should be 3');

  console.log('✅ createBatches tests passed');
}

/**
 * Test BatchProcessor.mapRowsWithIndexes
 */
function testMapRowsWithIndexes() {
  console.log('=== Testing mapRowsWithIndexes ===');

  const rows = [['a', 'b'], ['c', 'd'], ['e', 'f']];
  const indexes = [2, 3, 4];

  const result = BatchProcessor.mapRowsWithIndexes(rows, indexes);

  console.log('Mapped result:', result);
  console.assert(result.length === 3, 'Should have 3 mapped items');
  console.assert(result[0].rowIndex === 2, 'First item should have index 2');
  console.assert(result[0].row[0] === 'a', 'First row data should match');

  console.log('✅ mapRowsWithIndexes tests passed');
}

/**
 * Test BatchProcessor.collectBatchResults
 */
function testCollectBatchResults() {
  console.log('=== Testing collectBatchResults ===');

  const results = [
    { success: true },
    { success: true },
    { success: false },
    { success: true },
    { success: false }
  ];

  const summary = BatchProcessor.collectBatchResults(results);

  console.log('Summary:', summary);
  console.assert(summary.successCount === 3, 'Should have 3 successes');
  console.assert(summary.errorCount === 2, 'Should have 2 errors');
  console.assert(summary.totalCount === 5, 'Should have 5 total');
  console.assert(summary.successRate === 60, 'Success rate should be 60%');

  console.log('✅ collectBatchResults tests passed');
}

/**
 * Test BatchProcessor.chunkArray
 */
function testChunkArray() {
  console.log('=== Testing chunkArray ===');

  const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const chunks = BatchProcessor.chunkArray(array, 3);

  console.log('Chunks:', chunks);
  console.assert(chunks.length === 4, 'Should have 4 chunks');
  console.assert(chunks[0].length === 3, 'First chunk should have 3 items');
  console.assert(chunks[3].length === 1, 'Last chunk should have 1 item');

  console.log('✅ chunkArray tests passed');
}

/**
 * Test BatchProcessor.calculateProgress
 */
function testCalculateProgress() {
  console.log('=== Testing calculateProgress ===');

  const progress1 = BatchProcessor.calculateProgress(1, 4);
  const progress2 = BatchProcessor.calculateProgress(2, 4);
  const progress4 = BatchProcessor.calculateProgress(4, 4);

  console.log('Progress:', { progress1, progress2, progress4 });
  console.assert(progress1 === 25, 'Progress should be 25%');
  console.assert(progress2 === 50, 'Progress should be 50%');
  console.assert(progress4 === 100, 'Progress should be 100%');

  console.log('✅ calculateProgress tests passed');
}

/**
 * Test BatchProcessor.hasMoreBatches
 */
function testHasMoreBatches() {
  console.log('=== Testing hasMoreBatches ===');

  console.assert(BatchProcessor.hasMoreBatches(1, 4) === true, 'Should have more batches');
  console.assert(BatchProcessor.hasMoreBatches(3, 4) === true, 'Should have more batches');
  console.assert(BatchProcessor.hasMoreBatches(4, 4) === false, 'Should not have more batches');

  console.log('✅ hasMoreBatches tests passed');
}

/**
 * Test BatchProcessor.validateBatch
 */
function testValidateBatch() {
  console.log('=== Testing validateBatch ===');

  const validBatch = {
    rows: [1, 2, 3],
    indexes: [2, 3, 4],
    batchNumber: 1
  };

  const invalidBatch = {
    rows: [1, 2, 3],
    indexes: [2, 3], // Mismatched length
    batchNumber: 1
  };

  const result1 = BatchProcessor.validateBatch(validBatch);
  const result2 = BatchProcessor.validateBatch(invalidBatch);

  console.log('Valid batch result:', result1);
  console.log('Invalid batch result:', result2);

  console.assert(result1.isValid === true, 'Valid batch should pass');
  console.assert(result2.isValid === false, 'Invalid batch should fail');
  console.assert(result2.errors.length > 0, 'Invalid batch should have errors');

  console.log('✅ validateBatch tests passed');
}

/**
 * Test BatchProcessor.flattenBatchResults
 */
function testFlattenBatchResults() {
  console.log('=== Testing flattenBatchResults ===');

  const batchResults = [
    [{ success: true }, { success: false }],
    [{ success: true }],
    [{ success: false }, { success: true }, { success: true }]
  ];

  const flattened = BatchProcessor.flattenBatchResults(batchResults);

  console.log('Flattened:', flattened);
  console.assert(flattened.length === 6, 'Should have 6 total results');

  console.log('✅ flattenBatchResults tests passed');
}

/**
 * Test BatchProcessor.groupResultsByStatus
 */
function testGroupResultsByStatus() {
  console.log('=== Testing groupResultsByStatus ===');

  const results = [
    { success: true, data: 'a' },
    { success: false, error: 'b' },
    { success: true, data: 'c' },
    { success: false, error: 'd' },
    { success: true, data: 'e' }
  ];

  const grouped = BatchProcessor.groupResultsByStatus(results);

  console.log('Grouped:', grouped);
  console.assert(grouped.successful.length === 3, 'Should have 3 successful');
  console.assert(grouped.failed.length === 2, 'Should have 2 failed');

  console.log('✅ groupResultsByStatus tests passed');
}

/**
 * Run all BatchProcessor tests
 */
function runAllBatchProcessorTests() {
  console.log('========================================');
  console.log('Running All BatchProcessor Tests');
  console.log('========================================');

  testCreateBatches();
  testMapRowsWithIndexes();
  testCollectBatchResults();
  testChunkArray();
  testCalculateProgress();
  testHasMoreBatches();
  testValidateBatch();
  testFlattenBatchResults();
  testGroupResultsByStatus();

  console.log('========================================');
  console.log('✅ ALL TESTS PASSED');
  console.log('========================================');
}
