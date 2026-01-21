const { format, addDays, differenceInDays } = require('date-fns');

/**
 * Calculate the next reminder date based on schedule
 * @param {Date} expiryDate - The expiry date of the product/service
 * @param {Array} reminderSchedule - Array of days before expiry to send reminders
 * @param {Date} lastCheckedAt - Last time the reminder was checked
 * @returns {Date|null} - Next reminder date or null if no more reminders
 */
function calculateNextReminderDate(expiryDate, reminderSchedule, lastCheckedAt = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  const daysUntilExpiry = differenceInDays(expiry, today);
  
  // Sort schedule in descending order (e.g., [30, 7, 1])
  const sortedSchedule = [...reminderSchedule].sort((a, b) => b - a);
  
  // Find the next reminder that hasn't been sent yet
  for (const daysBefore of sortedSchedule) {
    if (daysUntilExpiry >= daysBefore) {
      const reminderDate = addDays(expiry, -daysBefore);
      
      // If this reminder date is today or in the future, and hasn't been checked today
      if (reminderDate >= today) {
        // If lastCheckedAt exists and is today, skip to next reminder
        if (lastCheckedAt) {
          const lastChecked = new Date(lastCheckedAt);
          lastChecked.setHours(0, 0, 0, 0);
          if (lastChecked >= reminderDate) {
            continue;
          }
        }
        return reminderDate;
      }
    }
  }
  
  return null;
}

/**
 * Check if a reminder should be sent today
 * @param {Date} expiryDate - The expiry date
 * @param {Array} reminderSchedule - Array of days before expiry
 * @returns {boolean} - True if reminder should be sent today
 */
function shouldSendReminderToday(expiryDate, reminderSchedule) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  const daysUntilExpiry = differenceInDays(expiry, today);
  
  // Check if today matches any day in the reminder schedule
  return reminderSchedule.includes(daysUntilExpiry);
}

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
  return format(new Date(date), 'yyyy-MM-dd');
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (basic)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid phone
 */
function isValidPhone(phone) {
  const phoneRegex = /^\+?[\d\s-()]{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * Sanitize input string
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
}

module.exports = {
  calculateNextReminderDate,
  shouldSendReminderToday,
  formatDate,
  isValidEmail,
  isValidPhone,
  sanitizeInput
};