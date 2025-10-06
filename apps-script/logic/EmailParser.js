/**
 * EmailParser.js - Pure Business Logic for Email Content Parsing
 *
 * All functions are pure (no side effects, deterministic)
 * 100% testable without Google APIs
 */

const EmailParser = {

  /**
   * Parse email content to extract subject and body
   * Pure function - no side effects
   *
   * Input format: "主旨：title\n內容：\nbody content"
   *
   * @param {string} content - Raw email content string
   * @returns {Object} { subject: string|null, body: string }
   */
  parseEmailContent(content) {
    if (!content || typeof content !== 'string') {
      return { subject: null, body: content || '' };
    }

    const lines = content.split('\n');
    let subject = null;
    let bodyLines = [];
    let inBodySection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Check for subject line
      if (trimmedLine.includes('主旨：') || trimmedLine.includes('主旨:')) {
        subject = trimmedLine.replace(/主旨[:：]/g, '').trim();
        continue;
      }

      // Check for content start line
      if (trimmedLine.includes('內容：') || trimmedLine.includes('內容:')) {
        inBodySection = true;

        // Check if there's text after the content marker on the same line
        const contentAfterMarker = line.replace(/.*?內容[:：]\s*/, '');
        if (contentAfterMarker.trim() !== '') {
          bodyLines.push(contentAfterMarker);
        }
        continue;
      }

      // If in content area, collect all subsequent lines
      if (inBodySection) {
        bodyLines.push(line); // Preserve original formatting and indentation
      }
    }

    // If no content marker found but subject exists, use remaining as body
    if (!inBodySection && subject && lines.length > 1) {
      const subjectLineIndex = lines.findIndex(line => line.includes('主旨'));
      if (subjectLineIndex >= 0 && subjectLineIndex < lines.length - 1) {
        bodyLines = lines.slice(subjectLineIndex + 1);
      }
    }

    // If no markers found, use entire content as body
    if (!subject && !inBodySection) {
      bodyLines = lines;
    }

    return {
      subject: subject,
      body: bodyLines.join('\n').trim()
    };
  },

  /**
   * Parse mail angles from AI response
   * Pure function - no side effects
   *
   * Expected format:
   * aspect1: ...
   * aspect2: ...
   * angle1: ...
   * angle2: ...
   * angle3: ...
   *
   * @param {string} response - AI-generated mail angles response
   * @returns {Object} { aspect1, aspect2, angle1, angle2, angle3 }
   */
  parseMailAngles(response) {
    if (!response || typeof response !== 'string') {
      return {
        aspect1: '',
        aspect2: '',
        angle1: '',
        angle2: '',
        angle3: ''
      };
    }

    const result = {
      aspect1: '',
      aspect2: '',
      angle1: '',
      angle2: '',
      angle3: ''
    };

    // Split by lines and parse key-value pairs
    const lines = response.split('\n');
    let currentKey = null;
    let currentValue = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Check for key patterns
      if (trimmed.startsWith('aspect1:') || trimmed.startsWith('aspect1：')) {
        if (currentKey) result[currentKey] = currentValue.join('\n').trim();
        currentKey = 'aspect1';
        currentValue = [trimmed.replace(/aspect1[:：]\s*/, '')];
      } else if (trimmed.startsWith('aspect2:') || trimmed.startsWith('aspect2：')) {
        if (currentKey) result[currentKey] = currentValue.join('\n').trim();
        currentKey = 'aspect2';
        currentValue = [trimmed.replace(/aspect2[:：]\s*/, '')];
      } else if (trimmed.startsWith('angle1:') || trimmed.startsWith('angle1：')) {
        if (currentKey) result[currentKey] = currentValue.join('\n').trim();
        currentKey = 'angle1';
        currentValue = [trimmed.replace(/angle1[:：]\s*/, '')];
      } else if (trimmed.startsWith('angle2:') || trimmed.startsWith('angle2：')) {
        if (currentKey) result[currentKey] = currentValue.join('\n').trim();
        currentKey = 'angle2';
        currentValue = [trimmed.replace(/angle2[:：]\s*/, '')];
      } else if (trimmed.startsWith('angle3:') || trimmed.startsWith('angle3：')) {
        if (currentKey) result[currentKey] = currentValue.join('\n').trim();
        currentKey = 'angle3';
        currentValue = [trimmed.replace(/angle3[:：]\s*/, '')];
      } else if (currentKey && trimmed) {
        // Continue current value
        currentValue.push(trimmed);
      }
    }

    // Save last key-value pair
    if (currentKey) {
      result[currentKey] = currentValue.join('\n').trim();
    }

    return result;
  },

  /**
   * Validate email address format
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
  },

  /**
   * Sanitize email content for safe HTML rendering
   * Pure function - no side effects
   *
   * @param {string} content - Email content to sanitize
   * @returns {string} Sanitized content
   */
  sanitizeEmailContent(content) {
    if (!content || typeof content !== 'string') {
      return '';
    }

    // Basic HTML escaping
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Convert plain text to HTML with line breaks
   * Pure function - no side effects
   *
   * @param {string} text - Plain text
   * @returns {string} HTML formatted text
   */
  textToHtml(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    // Convert newlines to <br> tags
    return text.replace(/\n/g, '<br>');
  },

  /**
   * Extract subject from email content if present
   * Pure function - no side effects
   *
   * @param {string} content - Email content
   * @returns {string|null} Extracted subject or null
   */
  extractSubject(content) {
    const parsed = this.parseEmailContent(content);
    return parsed.subject;
  },

  /**
   * Extract body from email content
   * Pure function - no side effects
   *
   * @param {string} content - Email content
   * @returns {string} Extracted body
   */
  extractBody(content) {
    const parsed = this.parseEmailContent(content);
    return parsed.body;
  },

  /**
   * Truncate text to specified length
   * Pure function - no side effects
   *
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated text with ellipsis if needed
   */
  truncateText(text, maxLength = 100) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    if (text.length <= maxLength) {
      return text;
    }

    return text.substring(0, maxLength) + '...';
  },

  /**
   * Check if string is empty or whitespace only
   * Pure function - no side effects
   *
   * @param {string} str - String to check
   * @returns {boolean} True if empty or whitespace only
   */
  isEmpty(str) {
    return !str || typeof str !== 'string' || str.trim().length === 0;
  }
};

// ============================================
// TEST FUNCTIONS (Run manually in Apps Script)
// ============================================

/**
 * Test EmailParser.parseEmailContent
 */
function testParseEmailContent() {
  console.log('=== Testing parseEmailContent ===');

  // Test with proper format
  const content1 = '主旨：Test Subject\n內容：\nThis is the body\nMultiple lines';
  const result1 = EmailParser.parseEmailContent(content1);
  console.log('Result 1:', result1);
  console.assert(result1.subject === 'Test Subject', 'Subject should be extracted');
  console.assert(result1.body.includes('This is the body'), 'Body should be extracted');

  // Test with alternative format
  const content2 = '主旨:Another Subject\n內容:Body starts here';
  const result2 = EmailParser.parseEmailContent(content2);
  console.log('Result 2:', result2);
  console.assert(result2.subject === 'Another Subject', 'Subject with : should work');

  // Test without markers
  const content3 = 'Just plain content';
  const result3 = EmailParser.parseEmailContent(content3);
  console.log('Result 3:', result3);
  console.assert(result3.subject === null, 'No subject should be null');
  console.assert(result3.body === 'Just plain content', 'Content should be in body');

  console.log('✅ parseEmailContent tests passed');
}

/**
 * Test EmailParser.parseMailAngles
 */
function testParseMailAngles() {
  console.log('=== Testing parseMailAngles ===');

  const response = `aspect1: First aspect content
aspect2: Second aspect content
angle1: First angle content
angle2: Second angle content
angle3: Third angle content`;

  const result = EmailParser.parseMailAngles(response);
  console.log('Parsed angles:', result);

  console.assert(result.aspect1 === 'First aspect content', 'aspect1 should be parsed');
  console.assert(result.aspect2 === 'Second aspect content', 'aspect2 should be parsed');
  console.assert(result.angle1 === 'First angle content', 'angle1 should be parsed');
  console.assert(result.angle2 === 'Second angle content', 'angle2 should be parsed');
  console.assert(result.angle3 === 'Third angle content', 'angle3 should be parsed');

  console.log('✅ parseMailAngles tests passed');
}

/**
 * Test EmailParser.isValidEmail
 */
function testIsValidEmail() {
  console.log('=== Testing isValidEmail ===');

  console.assert(EmailParser.isValidEmail('test@example.com') === true, 'Valid email should pass');
  console.assert(EmailParser.isValidEmail('user.name+tag@example.co.uk') === true, 'Complex email should pass');
  console.assert(EmailParser.isValidEmail('invalid.email') === false, 'Invalid email should fail');
  console.assert(EmailParser.isValidEmail('') === false, 'Empty email should fail');
  console.assert(EmailParser.isValidEmail(null) === false, 'Null should fail');

  console.log('✅ isValidEmail tests passed');
}

/**
 * Test EmailParser.sanitizeEmailContent
 */
function testSanitizeEmailContent() {
  console.log('=== Testing sanitizeEmailContent ===');

  const content = '<script>alert("xss")</script>';
  const result = EmailParser.sanitizeEmailContent(content);

  console.log('Sanitized:', result);
  console.assert(!result.includes('<script>'), 'Should escape HTML tags');
  console.assert(result.includes('&lt;'), 'Should have escaped characters');

  console.log('✅ sanitizeEmailContent tests passed');
}

/**
 * Test EmailParser.textToHtml
 */
function testTextToHtml() {
  console.log('=== Testing textToHtml ===');

  const text = 'Line 1\nLine 2\nLine 3';
  const result = EmailParser.textToHtml(text);

  console.log('HTML:', result);
  console.assert(result.includes('<br>'), 'Should contain <br> tags');
  console.assert(result === 'Line 1<br>Line 2<br>Line 3', 'Should format correctly');

  console.log('✅ textToHtml tests passed');
}

/**
 * Test EmailParser.extractSubject
 */
function testExtractSubject() {
  console.log('=== Testing extractSubject ===');

  const content = '主旨：Test Subject\n內容：\nBody content';
  const result = EmailParser.extractSubject(content);

  console.log('Extracted subject:', result);
  console.assert(result === 'Test Subject', 'Should extract subject');

  console.log('✅ extractSubject tests passed');
}

/**
 * Test EmailParser.extractBody
 */
function testExtractBody() {
  console.log('=== Testing extractBody ===');

  const content = '主旨：Test Subject\n內容：\nBody content\nMultiple lines';
  const result = EmailParser.extractBody(content);

  console.log('Extracted body:', result);
  console.assert(result.includes('Body content'), 'Should extract body');

  console.log('✅ extractBody tests passed');
}

/**
 * Test EmailParser.truncateText
 */
function testTruncateText() {
  console.log('=== Testing truncateText ===');

  const longText = 'This is a very long text that needs to be truncated';
  const result = EmailParser.truncateText(longText, 20);

  console.log('Truncated:', result);
  console.assert(result.length <= 23, 'Should be truncated (20 + "...")');
  console.assert(result.endsWith('...'), 'Should end with ellipsis');

  // Test short text
  const shortText = 'Short';
  const result2 = EmailParser.truncateText(shortText, 20);
  console.assert(result2 === 'Short', 'Short text should not be truncated');

  console.log('✅ truncateText tests passed');
}

/**
 * Test EmailParser.isEmpty
 */
function testIsEmpty() {
  console.log('=== Testing isEmpty ===');

  console.assert(EmailParser.isEmpty('') === true, 'Empty string should be empty');
  console.assert(EmailParser.isEmpty('   ') === true, 'Whitespace should be empty');
  console.assert(EmailParser.isEmpty(null) === true, 'Null should be empty');
  console.assert(EmailParser.isEmpty('content') === false, 'Non-empty should not be empty');

  console.log('✅ isEmpty tests passed');
}

/**
 * Run all EmailParser tests
 */
function runAllEmailParserTests() {
  console.log('========================================');
  console.log('Running All EmailParser Tests');
  console.log('========================================');

  testParseEmailContent();
  testParseMailAngles();
  testIsValidEmail();
  testSanitizeEmailContent();
  testTextToHtml();
  testExtractSubject();
  testExtractBody();
  testTruncateText();
  testIsEmpty();

  console.log('========================================');
  console.log('✅ ALL TESTS PASSED');
  console.log('========================================');
}
