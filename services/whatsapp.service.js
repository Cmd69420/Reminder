const logger = require('../utils/logger');
const { 
  TWILIO_ACCOUNT_SID, 
  TWILIO_AUTH_TOKEN, 
  TWILIO_WHATSAPP_FROM 
} = require('../config/env');

/**
 * Send WhatsApp notification (Placeholder - implement when Twilio is ready)
 */
async function sendWhatsApp({ to, body }) {
  try {
    logger.info(`[WHATSAPP PLACEHOLDER] Sending WhatsApp to: ${to}`);
    logger.info(`Body: ${body}`);
    
    // TODO: Implement actual Twilio integration when credentials are available
    // const twilio = require('twilio');
    // const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    // 
    // // Ensure phone number is in correct format
    // const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    // 
    // const message = await client.messages.create({
    //   body,
    //   from: TWILIO_WHATSAPP_FROM,
    //   to: formattedTo
    // });
    // 
    // return {
    //   success: true,
    //   messageId: message.sid,
    //   status: message.status,
    //   timestamp: new Date().toISOString()
    // };
    
    // For now, simulate successful send
    return {
      success: true,
      messageId: `placeholder-wa-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logger.error('Error sending WhatsApp:', error);
    throw error;
  }
}

module.exports = {
  sendWhatsApp
};