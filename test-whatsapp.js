// ==================== test-whatsapp.js ====================
// Run with: node test-whatsapp.js +919876543210 (replace with your WhatsApp number)

require('dotenv').config();
const { sendWhatsApp, testWhatsAppConfig, isWhatsAppConfigured } = require('./services/whatsapp.service');
const logger = require('./utils/logger');

async function runWhatsAppTest() {
  console.log('\n🧪 Starting WhatsApp Configuration Test...\n');
  
  try {
    // Get phone number from command line argument
    const testPhoneNumber = process.argv[2];
    
    if (!testPhoneNumber) {
      console.error('❌ Error: Please provide your WhatsApp phone number');
      console.error('Usage: node test-whatsapp.js +919876543210');
      console.error('\nMake sure to:');
      console.error('1. Include country code (e.g., +91 for India)');
      console.error('2. This number must have joined the Twilio sandbox');
      console.error('3. Send "join timberwolf-mastiff" to +1 415 523 8886 on WhatsApp first\n');
      process.exit(1);
    }
    
    // Test 1: Check if configuration is complete
    console.log('✓ Checking Twilio configuration...');
    if (!isWhatsAppConfigured()) {
      throw new Error('Twilio WhatsApp is not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM in .env file');
    }
    console.log('  ✓ Configuration found\n');
    
    // Test 2: Check credentials
    console.log('✓ Checking Twilio credentials...');
    console.log(`  Account SID: ${process.env.TWILIO_ACCOUNT_SID?.substring(0, 10)}...`);
    console.log(`  From number: ${process.env.TWILIO_WHATSAPP_FROM}\n`);
    
    // Test 3: Send test message
    console.log(`✓ Sending test WhatsApp to: ${testPhoneNumber}...`);
    console.log('  (This may take a few seconds)\n');
    
    const result = await testWhatsAppConfig(testPhoneNumber);
    
    console.log('✅ WhatsApp sent successfully!');
    console.log(`  Message SID: ${result.messageId}`);
    console.log(`  Status: ${result.status}\n`);
    
    console.log('📱 Check your WhatsApp for the test message!');
    console.log('\n⚠️  IMPORTANT REMINDERS:');
    console.log('   - You must have joined the sandbox (send "join timberwolf-mastiff" to +1 415 523 8886)');
    console.log('   - Sandbox is for testing only');
    console.log('   - For production, you need to:');
    console.log('     1. Request WhatsApp Business API access from Twilio');
    console.log('     2. Get your own WhatsApp Business number approved');
    console.log('     3. Submit message templates for approval\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ WhatsApp test failed:', error.message);
    console.error('\nTroubleshooting steps:');
    console.error('1. Make sure you have copied .env.example to .env');
    console.error('2. Add your Twilio credentials to the .env file');
    console.error('3. Get credentials from: https://console.twilio.com');
    console.error('4. Make sure your phone number joined the sandbox:');
    console.error('   - Send "join timberwolf-mastiff" to +1 415 523 8886 on WhatsApp');
    console.error('5. Include country code in phone number (e.g., +919876543210)\n');
    
    if (error.code) {
      console.error(`Twilio Error Code: ${error.code}`);
      console.error(`More info: ${error.moreInfo || 'N/A'}\n`);
    }
    
    process.exit(1);
  }
}

// Run the test
runWhatsAppTest();