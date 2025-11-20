/**
 * Credit System Test Script
 *
 * Tests the credit deduction functionality
 * Run with: node test-credit-system.js YOUR_EMAIL@gmail.com
 */

const https = require('https');

const FIREBASE_URL = 'https://asia-east1-auto-lead-warmer-mvp.cloudfunctions.net';

// Get email from command line argument
const userEmail = process.argv[2];

if (!userEmail) {
  console.error('❌ Please provide your email address');
  console.log('Usage: node test-credit-system.js YOUR_EMAIL@gmail.com');
  process.exit(1);
}

// Helper function to make HTTP POST request
function callFirebaseFunction(functionName, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ data });

    const options = {
      hostname: 'asia-east1-auto-lead-warmer-mvp.cloudfunctions.net',
      path: `/${functionName}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (e) {
          reject(new Error('Failed to parse response: ' + responseData));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

// Test functions
async function checkCredit(email) {
  console.log('\n=== Test 1: Check Current Credit ===');
  console.log('User Email:', email);

  try {
    const response = await callFirebaseFunction('getUserInfo', { email });

    if (response.result) {
      const credit = response.result.credit || 0;
      const paymentStatus = response.result.paymentStatus;

      console.log('✅ Current Credit:', credit);
      console.log('Payment Status:', paymentStatus);
      return credit;
    } else {
      console.log('❌ No result in response:', response);
      return null;
    }
  } catch (error) {
    console.error('❌ Error checking credit:', error.message);
    return null;
  }
}

async function deductCredit(email, amount = 1) {
  console.log('\n=== Test 2: Deduct Credit ===');
  console.log('Attempting to deduct:', amount, 'credit(s)');

  try {
    const response = await callFirebaseFunction('deductUserCredit', {
      email,
      amount
    });

    if (response.result) {
      const result = response.result;

      if (result.success) {
        console.log('✅ Credit deducted successfully!');
        console.log('Deducted:', result.deducted);
        console.log('Remaining Credit:', result.remainingCredit);
      } else {
        console.log('⚠️  Deduction failed:', result.message);
        console.log('Current Credit:', result.remainingCredit);
      }

      return result;
    } else {
      console.log('❌ No result in response:', response);
      return null;
    }
  } catch (error) {
    console.error('❌ Error deducting credit:', error.message);
    return null;
  }
}

// Main test runner
async function runTests() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   CREDIT SYSTEM TEST SUITE             ║');
  console.log('╚════════════════════════════════════════╝');

  // Test 1: Check current credit
  const creditBefore = await checkCredit(userEmail);

  if (creditBefore === null) {
    console.log('\n❌ Failed to get initial credit. Stopping tests.');
    return;
  }

  // Test 2: Deduct 1 credit
  const deductResult = await deductCredit(userEmail, 1);

  if (!deductResult) {
    console.log('\n❌ Failed to deduct credit. Stopping tests.');
    return;
  }

  // Test 3: Verify credit after deduction
  console.log('\n=== Test 3: Verify Credit After Deduction ===');
  const creditAfter = await checkCredit(userEmail);

  // Summary
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   TEST SUMMARY                         ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('Credit Before:      ', creditBefore);
  console.log('Credit After:       ', creditAfter);
  console.log('Expected Decrease:  ', 1);
  console.log('Actual Decrease:    ', creditBefore - creditAfter);

  if (creditBefore - creditAfter === 1) {
    console.log('\n✅ ALL TESTS PASSED!');
  } else if (creditBefore === 0) {
    console.log('\n⚠️  User has 0 credits - deduction correctly rejected');
  } else {
    console.log('\n❌ TEST FAILED - Credit did not decrease correctly');
  }

  console.log('\n💡 TIP: Check the "用戶名單" Google Sheet to verify the credit column');
  console.log('   Sheet URL: https://docs.google.com/spreadsheets/d/1ueIdy4O4IzdZ3fMoio-NgfV74KNxBYBNu6junkf9idA');
}

// Run the tests
runTests().catch(console.error);
