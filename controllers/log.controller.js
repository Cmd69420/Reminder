const pool = require('../config/database');

/**
 * Get all notification logs
 */
const getAllLogs = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      client_id, 
      reminder_id, 
      status,
      channel
    } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT nl.*, c.full_name as client_name, r.product_service_name
      FROM notification_logs nl
      INNER JOIN clients c ON nl.client_id = c.id
      INNER JOIN reminders r ON nl.reminder_id = r.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;
    
    if (client_id) {
      paramCount++;
      query += ` AND nl.client_id = $${paramCount}`;
      params.push(client_id);
    }
    
    if (reminder_id) {
      paramCount++;
      query += ` AND nl.reminder_id = $${paramCount}`;
      params.push(reminder_id);
    }
    
    if (status) {
      paramCount++;
      query += ` AND nl.status = $${paramCount}`;
      params.push(status);
    }
    
    if (channel) {
      paramCount++;
      query += ` AND nl.channel = $${paramCount}`;
      params.push(channel);
    }
    
    query += ` ORDER BY nl.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM notification_logs WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;
    
    if (client_id) {
      countParamCount++;
      countQuery += ` AND client_id = $${countParamCount}`;
      countParams.push(client_id);
    }
    
    if (reminder_id) {
      countParamCount++;
      countQuery += ` AND reminder_id = $${countParamCount}`;
      countParams.push(reminder_id);
    }
    
    if (status) {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
    }
    
    if (channel) {
      countParamCount++;
      countQuery += ` AND channel = $${countParamCount}`;
      countParams.push(channel);
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      data: {
        logs: result.rows,
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
 * Get logs for a specific reminder
 */
const getLogsByReminder = async (req, res, next) => {
  try {
    const { reminder_id } = req.params;
    
    const result = await pool.query(
      `SELECT nl.*, c.full_name as client_name
       FROM notification_logs nl
       INNER JOIN clients c ON nl.client_id = c.id
       WHERE nl.reminder_id = $1
       ORDER BY nl.created_at DESC`,
      [reminder_id]
    );
    
    res.json({
      success: true,
      data: { logs: result.rows }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get logs for a specific client
 */
const getLogsByClient = async (req, res, next) => {
  try {
    const { client_id } = req.params;
    
    const result = await pool.query(
      `SELECT nl.*, r.product_service_name
       FROM notification_logs nl
       INNER JOIN reminders r ON nl.reminder_id = r.id
       WHERE nl.client_id = $1
       ORDER BY nl.created_at DESC`,
      [client_id]
    );
    
    res.json({
      success: true,
      data: { logs: result.rows }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get notification statistics
 */
const getStats = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (start_date && end_date) {
      dateFilter = 'WHERE created_at BETWEEN $1 AND $2';
      params.push(start_date, end_date);
    }
    
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE channel = 'email') as email_count,
        COUNT(*) FILTER (WHERE channel = 'whatsapp') as whatsapp_count
      FROM notification_logs
      ${dateFilter}
    `;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: { stats: result.rows[0] }
    });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllLogs,
  getLogsByReminder,
  getLogsByClient,
  getStats
};
