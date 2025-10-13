/**
 * Toast Notification Service - Non-blocking user feedback
 * Provides toast notifications that don't interrupt user workflow
 */

const ToastService = {

  /**
   * Show a success toast notification
   * @param {string} message - Success message to display
   * @param {number} duration - Duration in seconds (default: 3)
   */
  showSuccess(message, duration = 3) {
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        `✅ ${message}`,
        'OK',
        duration
      );
      console.log(`✅ Success Toast: ${message}`);
    } catch (error) {
      console.log(`✅ Success (Toast Failed): ${message}`);
    }
  },

  /**
   * Show an info toast notification
   * @param {string} message - Info message to display
   * @param {number} duration - Duration in seconds (default: 4)
   */
  showInfo(message, duration = 4) {
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        `ℹ️ ${message}`,
        'Info',
        duration
      );
      console.log(`ℹ️ Info Toast: ${message}`);
    } catch (error) {
      console.log(`ℹ️ Info (Toast Failed): ${message}`);
    }
  },

  /**
   * Show a warning toast notification
   * @param {string} message - Warning message to display
   * @param {number} duration - Duration in seconds (default: 5)
   */
  showWarning(message, duration = 5) {
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        `⚠️ ${message}`,
        'Warning',
        duration
      );
      console.log(`⚠️ Warning Toast: ${message}`);
    } catch (error) {
      console.log(`⚠️ Warning (Toast Failed): ${message}`);
    }
  },

  /**
   * Show a completion toast for long operations
   * @param {string} operation - What operation completed
   * @param {Object} stats - Optional statistics object
   * @param {number} duration - Duration in seconds (default: 4)
   */
  showCompletion(operation, stats = null, duration = 4) {
    let message = `${operation} done`;

    if (stats) {
      if (stats.success !== undefined && stats.error !== undefined) {
        message += `\nOK: ${stats.success} | Fail: ${stats.error}`;
      } else if (stats.count !== undefined) {
        message += `\nCount: ${stats.count}`;
      }
    }

    this.showSuccess(message, duration);
  },

  /**
   * Show a processing toast for operations in progress
   * @param {string} message - Processing message
   * @param {number} duration - Duration in seconds (default: 2)
   */
  showProcessing(message, duration = 2) {
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast(
        `⏳ ${message}`,
        'Working',
        duration
      );
      console.log(`⏳ Processing Toast: ${message}`);
    } catch (error) {
      console.log(`⏳ Processing (Toast Failed): ${message}`);
    }
  },

  /**
   * Show email-specific success toast
   * @param {string} emailType - Type of email sent
   * @param {string} recipientName - Name of recipient
   * @param {number} duration - Duration in seconds (default: 3)
   */
  showEmailSuccess(emailType, recipientName, duration = 3) {
    const message = `${emailType} sent to ${recipientName}`;
    this.showSuccess(message, duration);
  },

  /**
   * Show batch operation results
   * @param {string} operation - Operation name
   * @param {number} successCount - Number of successful operations
   * @param {number} errorCount - Number of failed operations
   * @param {number} duration - Duration in seconds (default: 5)
   */
  showBatchResult(operation, successCount, errorCount, duration = 5) {
    const message = `${operation}\n✅ OK: ${successCount} | ❌ Fail: ${errorCount}`;

    if (errorCount > 0) {
      this.showWarning(message, duration);
    } else {
      this.showSuccess(message, duration);
    }
  }
};

// Global functions for backward compatibility
function showSuccessToast(message, duration = 3) {
  return ToastService.showSuccess(message, duration);
}

function showInfoToast(message, duration = 4) {
  return ToastService.showInfo(message, duration);
}

function showCompletionToast(operation, stats = null, duration = 4) {
  return ToastService.showCompletion(operation, stats, duration);
}