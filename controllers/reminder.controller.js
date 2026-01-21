const pool = require('../config/database');
const logger = require('../utils/logger');
const { calculateNextReminderDate, formatDate } = require('../utils/helpers');

/**
 * Get all reminders
 */
const getAllReminders = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, client_id, status } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT r.*, c.full_name as client_name, c.email as client_email, 
             c.whatsapp_number as client_whatsapp, u.full_name as created_by_name
      FROM reminders r
      INNER JOIN clients c ON r.client_id = c.id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;
    
    if (client_id) {
      paramCount++;
      query += ` AND r.client_id = $${paramCount}`;
      params.push(client_id);
    }
    
    if (status) {
      paramCount++;
      query += ` AND r.status = $${paramCount}`;
      params.push(status);
    }
    
    query += ` ORDER BY r.expiry_date ASC, r.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM reminders WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;
    
    if (client_id) {
      countParamCount++;
      countQuery += ` AND client_id = $${countParamCount}`;
      countParams.push(client_id);
    }
    
    if (status) {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      data: {
        reminders: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get single reminder by ID
 */
const getReminderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT r.*, c.full_name as client_name, c.email as client_email,
              c.whatsapp_number as client_whatsapp, u.full_name as created_by_name
       FROM reminders r
       INNER JOIN clients c ON r.client_id = c.id
       LEFT JOIN users u ON r.created_by = u.id
       WHERE r.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }
    
    res.json({
      success: true,
      data: { reminder: result.rows[0] }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Create new reminder
 */
const createReminder = async (req, res, next) => {
  try {
    const {
      client_id,
      product_service_name,
      description,
      expiry_date,
      notification_channel,
      reminder_schedule
    } = req.body;
    
    // Validation
    if (!client_id || !product_service_name || !expiry_date || !notification_channel) {
      return res.status(400).json({
        success: false,
        message: 'Client ID, product/service name, expiry date, and notification channel are required'
      });
    }
    
    if (!['email', 'whatsapp', 'both'].includes(notification_channel)) {
      return res.status(400).json({
        success: false,
        message: 'Notification channel must be email, whatsapp, or both'
      });
    }
    
    if (!Array.isArray(reminder_schedule) || reminder_schedule.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Reminder schedule must be a non-empty array of days before expiry'
      });
    }
    
    // Check if client exists
    const clientCheck = await pool.query('SELECT id FROM clients WHERE id = $1', [client_id]);
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    
    // Calculate next reminder date
    const nextReminderDate = calculateNextReminderDate(
      new Date(expiry_date),
      reminder_schedule
    );
    
    const result = await pool.query(
      `INSERT INTO reminders 
       (client_id, product_service_name, description, expiry_date, notification_channel, 
        reminder_schedule, next_reminder_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        client_id,
        product_service_name,
        description || null,
        expiry_date,
        notification_channel,
        JSON.stringify(reminder_schedule),
        nextReminderDate ? formatDate(nextReminderDate) : null,
        req.user.id
      ]
    );
    
    logger.info(`Reminder created: ${result.rows[0].id} by user ${req.user.id}`);
    
    res.status(201).json({
      success: true,
      message: 'Reminder created successfully',
      data: { reminder: result.rows[0] }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Update reminder
 */
const updateReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      product_service_name,
      description,
      expiry_date,
      notification_channel,
      reminder_schedule,
      status
    } = req.body;
    
    // Check if reminder exists
    const existingReminder = await pool.query('SELECT * FROM reminders WHERE id = $1', [id]);
    
    if (existingReminder.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramCount = 0;
    
    if (product_service_name !== undefined) {
      paramCount++;
      updates.push(`product_service_name = $${paramCount}`);
      params.push(product_service_name);
    }
    
    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      params.push(description);
    }
    
    if (expiry_date !== undefined) {
      paramCount++;
      updates.push(`expiry_date = $${paramCount}`);
      params.push(expiry_date);
    }
    
    if (notification_channel !== undefined) {
      if (!['email', 'whatsapp', 'both'].includes(notification_channel)) {
        return res.status(400).json({
          success: false,
          message: 'Notification channel must be email, whatsapp, or both'
        });
      }
      paramCount++;
      updates.push(`notification_channel = $${paramCount}`);
      params.push(notification_channel);
    }
    
    if (reminder_schedule !== undefined) {
      if (!Array.isArray(reminder_schedule) || reminder_schedule.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Reminder schedule must be a non-empty array'
        });
      }
      paramCount++;
      updates.push(`reminder_schedule = $${paramCount}`);
      params.push(JSON.stringify(reminder_schedule));
    }
    
    if (status !== undefined) {
      if (!['active', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status must be active, completed, or cancelled'
        });
      }
      paramCount++;
      updates.push(`status = $${paramCount}`);
      params.push(status);
    }
    
    // Recalculate next reminder date if expiry_date or reminder_schedule changed
    if (expiry_date !== undefined || reminder_schedule !== undefined) {
      const newExpiryDate = expiry_date || existingReminder.rows[0].expiry_date;
      const newSchedule = reminder_schedule || existingReminder.rows[0].reminder_schedule;
      
      const nextReminderDate = calculateNextReminderDate(
        new Date(newExpiryDate),
        newSchedule,
        existingReminder.rows[0].last_checked_at
      );
      
      paramCount++;
      updates.push(`next_reminder_date = $${paramCount}`);
      params.push(nextReminderDate ? formatDate(nextReminderDate) : null);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    paramCount++;
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    
    const query = `
      UPDATE reminders
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, params);
    
    logger.info(`Reminder updated: ${id} by user ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Reminder updated successfully',
      data: { reminder: result.rows[0] }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Delete reminder
 */
const deleteReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM reminders WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }
    
    logger.info(`Reminder deleted: ${id} by user ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Reminder deleted successfully'
    });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllReminders,
  getReminderById,
  createReminder,
  updateReminder,
  deleteReminder
};