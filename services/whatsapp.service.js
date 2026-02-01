const twilio = require('twilio');
const logger = require('../utils/logger');
const { 
  TWILIO_ACCOUNT_SID, 
  TWILIO_AUTH_TOKEN, 
  TWILIO_WHATSAPP_FROM 
} = require('../config/env');

// Initialize Twilio client
let twilioClient = null;

function getTwilioClient() {
  if (!twilioClient) {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env');
    }
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

/**
 * Format phone number for WhatsApp
 * Ensures number has whatsapp: prefix and correct format
 */
function formatWhatsAppNumber(phoneNumber) {
  // Remove any existing whatsapp: prefix
  let number = phoneNumber.replace(/^whatsapp:/i, '');
  
  // Remove all non-digit characters except +
  number = number.replace(/[^\d+]/g, '');
  
  // Ensure it starts with +
  if (!number.startsWith('+')) {
    // If it starts with a country code (e.g., 91 for India), add +
    if (number.length >= 10) {
      number = '+' + number;
    } else {
      throw new Error('Phone number must include country code');
    }
  }
  
  return `whatsapp:${number}`;
}

/**
 * Send WhatsApp notification using Twilio
 */
async function sendWhatsApp({ to, body }) {
  try {
    logger.info(`Sending WhatsApp to: ${to}`);
    
    // Validate configuration
    if (!TWILIO_WHATSAPP_FROM) {
      throw new Error('TWILIO_WHATSAPP_FROM is not configured');
    }
    
    const client = getTwilioClient();
    
    // Format recipient number
    const formattedTo = formatWhatsAppNumber(to);
    
    logger.info(`Formatted WhatsApp number: ${formattedTo}`);
    
    // Send message via Twilio
    const message = await client.messages.create({
      body: body,
      from: TWILIO_WHATSAPP_FROM,
      to: formattedTo
    });
    
    logger.info(`✅ WhatsApp sent successfully. Message SID: ${message.sid}`);
    
    return {
      success: true,
      messageId: message.sid,
      status: message.status,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    // Enhanced error logging
    if (error.code) {
      logger.error('Twilio API Error:', {
        code: error.code,
        message: error.message,
        moreInfo: error.moreInfo,
        to: to
      });
      
      // Provide more specific error messages
      switch (error.code) {
        case 21211:
          throw new Error('Invalid WhatsApp number. Please check the format and country code.');
        case 21408:
          throw new Error('Permission denied. WhatsApp number may not be registered with Twilio sandbox.');
        case 21610:
          throw new Error('WhatsApp message not allowed. Recipient must join the sandbox first.');
        case 20003:
          throw new Error('Invalid Twilio credentials. Please check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
        default:
          throw new Error(`Twilio error: ${error.message}`);
      }
    } else {
      logger.error('Error sending WhatsApp:', error.message);
      throw error;
    }
  }
}

/**
 * Test WhatsApp configuration
 */
async function testWhatsAppConfig(testPhoneNumber) {
  try {
    logger.info('Testing Twilio WhatsApp configuration...');
    
    if (!testPhoneNumber) {
      throw new Error('Test phone number is required. Use your WhatsApp number that joined the sandbox.');
    }
    
    // Send a test message
    const result = await sendWhatsApp({
      to: testPhoneNumber,
      body: 'This is a test message from your Reminder System.\n\nIf you receive this, your WhatsApp integration is working correctly! 🎉'
    });
    
    logger.info('✅ WhatsApp configuration test successful!');
    return result;
    
  } catch (error) {
    logger.error('❌ WhatsApp configuration test failed:', error.message);
    throw error;
  }
}

/**
 * Check if WhatsApp is properly configured
 */
function isWhatsAppConfigured() {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_FROM);
}

module.exports = {
  sendWhatsApp,
  testWhatsAppConfig,
  isWhatsAppConfigured,
  formatWhatsAppNumber
};