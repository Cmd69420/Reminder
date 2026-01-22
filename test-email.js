// ==================== test-email.js ====================
// Run with: node test-email.js (from root directory)

require('dotenv').config();
const { sendEmail, testEmailConfig } = require('./services/email.service');
const logger = require('./utils/logger');

async function runEmailTest() {
  console.log('\n🧪 Starting Email Configuration Test...\n');
  
  try {
    // Test 1: Check if API key is configured
    console.log('✓ Checking Brevo API key...');
    if (!process.env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY is not set in .env file');
    }
    console.log('  ✓ API key found\n');
    
    // Test 2: Check if sender email is configured
    console.log('✓ Checking sender email...');
    if (!process.env.BREVO_FROM_EMAIL) {
      throw new Error('BREVO_FROM_EMAIL is not set in .env file');
    }
    console.log(`  ✓ Sender email: ${process.env.BREVO_FROM_EMAIL}\n`);
    
    // Test 3: Send test email
    console.log('✓ Sending test email...');
    const result = await testEmailConfig();
    console.log(`  ✓ Email sent successfully!`);
    console.log(`  Message ID: ${result.messageId}\n`);
    
    console.log('✅ All email tests passed!\n');
    console.log('Check your inbox at:', process.env.BREVO_FROM_EMAIL);
    console.log('\n⚠️  NOTE: Since you\'re using a Gmail address, the email might:');
    console.log('   - Go to spam folder');
    console.log('   - Take a few minutes to arrive');
    console.log('   - Not work for Gmail → Gmail sends');
    console.log('\nFor production, use a custom domain email!\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Email test failed:', error.message);
    console.error('\nTroubleshooting steps:');
    console.error('1. Make sure you have copied .env.example to .env');
    console.error('2. Add your Brevo API key to the .env file');
    console.error('3. Get your API key from: https://app.brevo.com/settings/keys/api');
    console.error('4. Make sure your sender email is in the .env file\n');
    
    if (error.response && error.response.data) {
      console.error('Brevo API Error Details:', JSON.stringify(error.response.data, null, 2));
    }
    
    process.exit(1);
  }
}

// Run the test
runEmailTest();