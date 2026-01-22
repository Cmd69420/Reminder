// ==================== services/email.service.js ====================
const axios = require('axios');
const logger = require('../utils/logger');
const { BREVO_API_KEY, BREVO_FROM_EMAIL, BREVO_FROM_NAME } = require('../config/env');

/**
 * Send email notification using Brevo (formerly Sendinblue)
 */
async function sendEmail({ to, subject, body }) {
  try {
    logger.info(`Sending email to: ${to}`);
    logger.info(`Subject: ${subject}`);
    
    // Validate required configuration
    if (!BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY is not configured');
    }
    
    if (!BREVO_FROM_EMAIL) {
      throw new Error('BREVO_FROM_EMAIL is not configured');
    }
    
    // Prepare email data for Brevo API
    const emailData = {
      sender: {
        name: BREVO_FROM_NAME || 'Reminder System',
        email: BREVO_FROM_EMAIL
      },
      to: [
        {
          email: to,
          name: to.split('@')[0] // Extract name from email if not provided
        }
      ],
      subject: subject,
      htmlContent: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .email-container {
                background-color: #f9f9f9;
                border-radius: 8px;
                padding: 30px;
                border: 1px solid #e0e0e0;
              }
              .header {
                background-color: #4CAF50;
                color: white;
                padding: 20px;
                border-radius: 8px 8px 0 0;
                text-align: center;
                margin: -30px -30px 20px -30px;
              }
              .content {
                background-color: white;
                padding: 25px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .footer {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
                font-size: 12px;
                color: #666;
                text-align: center;
              }
              .button {
                display: inline-block;
                padding: 12px 24px;
                margin: 20px 0;
                background-color: #4CAF50;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="header">
                <h2 style="margin: 0;">Reminder Notification</h2>
              </div>
              <div class="content">
                ${body.replace(/\n/g, '<br>')}
              </div>
              <div class="footer">
                <p>This is an automated reminder from your Reminder System.</p>
                <p>Please do not reply to this email.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      textContent: body // Plain text fallback
    };
    
    // Send email via Brevo API
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      emailData,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': BREVO_API_KEY
        }
      }
    );
    
    logger.info(`✅ Email sent successfully. Message ID: ${response.data.messageId}`);
    
    return {
      success: true,
      messageId: response.data.messageId,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    // Enhanced error logging
    if (error.response) {
      // Brevo API error
      logger.error('Brevo API Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        to: to,
        subject: subject
      });
      
      // Provide more specific error messages
      if (error.response.status === 401) {
        throw new Error('Invalid Brevo API key. Please check your BREVO_API_KEY configuration.');
      } else if (error.response.status === 400) {
        throw new Error(`Brevo validation error: ${JSON.stringify(error.response.data)}`);
      } else {
        throw new Error(`Brevo API error: ${error.response.data.message || error.message}`);
      }
    } else if (error.request) {
      // Network error
      logger.error('Network error sending email:', error.message);
      throw new Error('Network error: Unable to reach Brevo API');
    } else {
      // Other errors
      logger.error('Error sending email:', error.message);
      throw error;
    }
  }
}

/**
 * Test email configuration
 */
async function testEmailConfig() {
  try {
    logger.info('Testing Brevo email configuration...');
    
    // Send a test email
    const result = await sendEmail({
      to: BREVO_FROM_EMAIL, // Send test to yourself
      subject: 'Brevo Configuration Test',
      body: 'This is a test email to verify Brevo configuration.\n\nIf you receive this, your email service is working correctly!'
    });
    
    logger.info('✅ Email configuration test successful!');
    return result;
    
  } catch (error) {
    logger.error('❌ Email configuration test failed:', error.message);
    throw error;
  }
}

module.exports = {
  sendEmail,
  testEmailConfig
};