// ==================== controllers/whatsapp.controller.js ====================
const logger = require('../utils/logger');
const twilio = require('twilio');

/**
 * Handle incoming WhatsApp messages from Twilio
 */
const handleIncomingMessage = async (req, res, next) => {
  try {
    const { From, Body, MessageSid, ProfileName } = req.body;
    
    logger.info('Received WhatsApp message:', {
      from: From,
      body: Body,
      messageSid: MessageSid,
      profileName: ProfileName
    });
    
    // Create TwiML response
    const twiml = new twilio.twiml.MessagingResponse();
    
    // Auto-reply logic
    const incomingMessage = Body.trim().toLowerCase();
    
    if (incomingMessage === 'help' || incomingMessage === 'hi' || incomingMessage === 'hello') {
      twiml.message('Hello! This is your Reminder System.\n\n' +
                   'You will receive automated reminders for your products and services.\n\n' +
                   'Reply "STOP" to unsubscribe from reminders.');
    } else if (incomingMessage === 'stop' || incomingMessage === 'unsubscribe') {
      twiml.message('You have been unsubscribed from reminders. Contact support to re-enable.');
    } else {
      twiml.message('Thank you for your message. This is an automated reminder system.');
    }
    
    // Send TwiML response
    res.type('text/xml');
    res.send(twiml.toString());
    
  } catch (error) {
    next(error);
  }
};

/**
 * Handle message status updates from Twilio
 */
const handleStatusCallback = async (req, res, next) => {
  try {
    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;
    
    logger.info('WhatsApp status update:', {
      messageSid: MessageSid,
      status: MessageStatus,
      errorCode: ErrorCode,
      errorMessage: ErrorMessage
    });
    
    res.sendStatus(200);
    
  } catch (error) {
    next(error);
  }
};

// THIS IS CRITICAL - Make sure this line exists at the end!
module.exports = {
  handleIncomingMessage,
  handleStatusCallback
};