// ==================== services/scheduler.service.js ====================
require('dotenv').config();
const pool = require('../config/database');
const { notificationQueue } = require('../config/queue');
const logger = require('../utils/logger');
const { shouldSendReminderToday, calculateNextReminderDate } = require('../utils/helpers');
const { SCHEDULER_INTERVAL } = require('../config/env');

/**
 * Poll database for reminders that are due today
 */
async function pollReminders() {
  try {
    logger.info('🔍 Polling reminders...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Find all active reminders where next_reminder_date is today or in the past
    const query = `
      SELECT r.*, c.full_name as client_name, c.email as client_email, 
             c.whatsapp_number as client_whatsapp
      FROM reminders r
      INNER JOIN clients c ON r.client_id = c.id
      WHERE r.status = 'active'
        AND c.is_active = true
        AND r.next_reminder_date <= $1
    `;
    
    const result = await pool.query(query, [today]);
    
    logger.info(`Found ${result.rows.length} reminders to process`);
    
    for (const reminder of result.rows) {
      try {
        // Double-check if we should send today (based on expiry date and schedule)
        if (!shouldSendReminderToday(reminder.expiry_date, reminder.reminder_schedule)) {
          logger.info(`Reminder ${reminder.id} not due today, recalculating next date`);
          
          // Recalculate next reminder date
          const nextReminderDate = calculateNextReminderDate(
            reminder.expiry_date,
            reminder.reminder_schedule,
            new Date()
          );
          
          await pool.query(
            `UPDATE reminders 
             SET next_reminder_date = $1, last_checked_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [nextReminderDate, reminder.id]
          );
          
          continue;
        }
        
        // Determine which channels to use
        const channels = [];
        if (reminder.notification_channel === 'email' || reminder.notification_channel === 'both') {
          if (reminder.client_email) {
            channels.push('email');
          }
        }
        if (reminder.notification_channel === 'whatsapp' || reminder.notification_channel === 'both') {
          if (reminder.client_whatsapp) {
            channels.push('whatsapp');
          }
        }
        
        if (channels.length === 0) {
          logger.warn(`No valid channels for reminder ${reminder.id}`);
          continue;
        }
        
        // Create notification jobs for each channel
        for (const channel of channels) {
          const recipient = channel === 'email' ? reminder.client_email : reminder.client_whatsapp;
          
          const jobData = {
            reminderId: reminder.id,
            clientId: reminder.client_id,
            clientName: reminder.client_name,
            channel,
            recipient,
            productServiceName: reminder.product_service_name,
            description: reminder.description,
            expiryDate: reminder.expiry_date
          };
          
          // Add to queue
          await notificationQueue.add(jobData, {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000
            }
          });
          
          logger.info(`Queued ${channel} notification for reminder ${reminder.id}`);
        }
        
        // Update reminder: mark as checked and calculate next reminder date
        const nextReminderDate = calculateNextReminderDate(
          reminder.expiry_date,
          reminder.reminder_schedule,
          new Date()
        );
        
        // Convert nextReminderDate to string or null explicitly
        const nextDateValue = nextReminderDate ? nextReminderDate.toISOString().split('T')[0] : null;
        
        // Determine new status
        const newStatus = nextDateValue === null ? 'completed' : 'active';
        
        await pool.query(
          `UPDATE reminders 
           SET last_checked_at = CURRENT_TIMESTAMP, 
               next_reminder_date = $1::date,
               status = $2::varchar
           WHERE id = $3`,
          [nextDateValue, newStatus, reminder.id]
        );
        
        logger.info(`Updated reminder ${reminder.id}: next_date=${nextDateValue}, status=${newStatus}`);
        
      } catch (error) {
        logger.error(`Error processing reminder ${reminder.id}:`, error);
      }
    }
    
    logger.info('✅ Polling complete');
    
  } catch (error) {
    logger.error('Error polling reminders:', error);
  }
}

/**
 * Start the scheduler
 */
function startScheduler() {
  logger.info(`🚀 Starting scheduler (interval: ${SCHEDULER_INTERVAL}ms)`);
  
  // Run immediately on start
  pollReminders();
  
  // Then run at regular intervals
  setInterval(pollReminders, SCHEDULER_INTERVAL);
}

// If this file is run directly (not imported)
if (require.main === module) {
  startScheduler();
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down scheduler');
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down scheduler');
    process.exit(0);
  });
}

module.exports = {
  pollReminders,
  startScheduler
};