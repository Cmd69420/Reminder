// ==================== services/notification.worker.js ====================
require('dotenv').config();
const pool = require('../config/database');
const { notificationQueue } = require('../config/queue');
const { sendEmail } = require('./email.service');
const { sendWhatsApp } = require('./whatsapp.service');
const logger = require('../utils/logger');
const { format } = require('date-fns');

/**
 * Process notification job
 */
notificationQueue.process(async (job) => {
  const {
    reminderId,
    clientId,
    clientName,
    channel,
    recipient,
    productServiceName,
    description,
    expiryDate
  } = job.data;
  
  logger.info(`Processing notification job ${job.id} for reminder ${reminderId}`);
  
  try {
    // Format expiry date
    const formattedExpiryDate = format(new Date(expiryDate), 'MMMM dd, yyyy');
    
    // Calculate days until expiry
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    // Create message
    let subject, messageBody;
    
    if (daysUntilExpiry > 0) {
      subject = `Reminder: ${productServiceName} expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`;
      messageBody = `Dear ${clientName},

This is a reminder that your ${productServiceName} will expire on ${formattedExpiryDate} (${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''} from now).

${description ? `Details: ${description}` : ''}

Please take necessary action to renew or update as needed.

Best regards,
Reminder System`;
    } else if (daysUntilExpiry === 0) {
      subject = `Urgent: ${productServiceName} expires TODAY`;
      messageBody = `Dear ${clientName},

This is an urgent reminder that your ${productServiceName} expires TODAY (${formattedExpiryDate}).

${description ? `Details: ${description}` : ''}

Please take immediate action to renew or update.

Best regards,
Reminder System`;
    } else {
      subject = `Alert: ${productServiceName} has EXPIRED`;
      messageBody = `Dear ${clientName},

Your ${productServiceName} has expired on ${formattedExpiryDate}.

${description ? `Details: ${description}` : ''}

Please renew or update as soon as possible.

Best regards,
Reminder System`;
    }
    
    // Create notification log entry
    const logResult = await pool.query(
      `INSERT INTO notification_logs 
       (reminder_id, client_id, channel, recipient, subject, message_body, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING id`,
      [reminderId, clientId, channel, recipient, subject, messageBody]
    );
    
    const logId = logResult.rows[0].id;
    
    // Send notification based on channel
    let result;
    if (channel === 'email') {
      result = await sendEmail({
        to: recipient,
        subject,
        body: messageBody
      });
    } else if (channel === 'whatsapp') {
      result = await sendWhatsApp({
        to: recipient,
        body: messageBody
      });
    } else {
      throw new Error(`Unknown channel: ${channel}`);
    }
    
    // Update log as sent
    await pool.query(
      `UPDATE notification_logs 
       SET status = 'sent', 
           external_message_id = $1,
           sent_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [result.messageId, logId]
    );
    
    logger.info(`✅ Successfully sent ${channel} notification for reminder ${reminderId}`);
    
    return { success: true, logId, messageId: result.messageId };
    
  } catch (error) {
    logger.error(`❌ Error sending notification for reminder ${reminderId}:`, error);
    
    // Update log as failed
    await pool.query(
      `UPDATE notification_logs 
       SET status = 'failed',
           error_message = $1,
           failed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE reminder_id = $2 AND client_id = $3 AND channel = $4 AND status = 'pending'`,
      [error.message, reminderId, clientId, channel]
    );
    
    throw error; // Let Bull handle retries
  }
});

// Queue event listeners
notificationQueue.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed successfully`);
});

notificationQueue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed:`, err.message);
});

notificationQueue.on('stalled', (job) => {
  logger.warn(`Job ${job.id} stalled`);
});

// Start worker
logger.info('🚀 Notification worker started and listening for jobs');

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing queue');
  await notificationQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing queue');
  await notificationQueue.close();
  process.exit(0);
});