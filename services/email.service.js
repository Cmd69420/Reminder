const logger = require('../utils/logger');
const { SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME } = require('../config/env');

/**
 * Send email notification (Placeholder - implement when SendGrid is ready)
 */
async function sendEmail({ to, subject, body }) {
  try {
    logger.info(`[EMAIL PLACEHOLDER] Sending email to: ${to}`);
    logger.info(`Subject: ${subject}`);
    logger.info(`Body: ${body}`);
    
    // TODO: Implement actual SendGrid integration when API key is available
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(SENDGRID_API_KEY);
    // 
    // const msg = {
    //   to,
    //   from: {
    //     email: SENDGRID_FROM_EMAIL,
    //     name: SENDGRID_FROM_NAME
    //   },
    //   subject,
    //   text: body,
    //   html: `<p>${body.replace(/\n/g, '<br>')}</p>`
    // };
    // 
    // await sgMail.send(msg);
    
    // For now, simulate successful send
    return {
      success: true,
      messageId: `placeholder-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logger.error('Error sending email:', error);
    throw error;
  }
}

module.exports = {
  sendEmail
};