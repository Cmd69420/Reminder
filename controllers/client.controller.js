const pool = require('../config/database');
const logger = require('../utils/logger');
const { isValidEmail, isValidPhone, sanitizeInput } = require('../utils/helpers');

/**
 * Get all clients
 */
const getAllClients = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search = '', is_active } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT c.*, u.full_name as created_by_name
      FROM clients c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;
    
    // Search filter
    if (search) {
      paramCount++;
      query += ` AND (c.full_name ILIKE $${paramCount} OR c.email ILIKE $${paramCount} OR c.company_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    // Active filter
    if (is_active !== undefined) {
      paramCount++;
      query += ` AND c.is_active = $${paramCount}`;
      params.push(is_active === 'true');
    }
    
    // Order and pagination
    query += ` ORDER BY c.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM clients WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;
    
    if (search) {
      countParamCount++;
      countQuery += ` AND (full_name ILIKE $${countParamCount} OR email ILIKE $${countParamCount} OR company_name ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }
    
    if (is_active !== undefined) {
      countParamCount++;
      countQuery += ` AND is_active = $${countParamCount}`;
      countParams.push(is_active === 'true');
    }
    
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      data: {
        clients: result.rows,
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
 * Get single client by ID
 */
const getClientById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT c.*, u.full_name as created_by_name
       FROM clients c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    
    res.json({
      success: true,
      data: { client: result.rows[0] }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Create new client
 */
const createClient = async (req, res, next) => {
  try {
    const {
      full_name,
      email,
      phone_number,
      whatsapp_number,
      company_name,
      notes
    } = req.body;
    
    // Validation
    if (!full_name) {
      return res.status(400).json({
        success: false,
        message: 'Full name is required'
      });
    }
    
    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }
    
    if (phone_number && !isValidPhone(phone_number)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }
    
    // Sanitize inputs
    const sanitizedData = {
      full_name: sanitizeInput(full_name),
      email: email ? email.toLowerCase() : null,
      phone_number: phone_number || null,
      whatsapp_number: whatsapp_number || null,
      company_name: company_name ? sanitizeInput(company_name) : null,
      notes: notes ? sanitizeInput(notes) : null,
      created_by: req.user.id
    };
    
    const result = await pool.query(
      `INSERT INTO clients (full_name, email, phone_number, whatsapp_number, company_name, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        sanitizedData.full_name,
        sanitizedData.email,
        sanitizedData.phone_number,
        sanitizedData.whatsapp_number,
        sanitizedData.company_name,
        sanitizedData.notes,
        sanitizedData.created_by
      ]
    );
    
    logger.info(`Client created: ${result.rows[0].id} by user ${req.user.id}`);
    
    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: { client: result.rows[0] }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Update client
 */
const updateClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      full_name,
      email,
      phone_number,
      whatsapp_number,
      company_name,
      notes,
      is_active
    } = req.body;
    
    // Check if client exists
    const existingClient = await pool.query('SELECT id FROM clients WHERE id = $1', [id]);
    
    if (existingClient.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramCount = 0;
    
    if (full_name !== undefined) {
      paramCount++;
      updates.push(`full_name = $${paramCount}`);
      params.push(sanitizeInput(full_name));
    }
    
    if (email !== undefined) {
      if (email && !isValidEmail(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }
      paramCount++;
      updates.push(`email = $${paramCount}`);
      params.push(email ? email.toLowerCase() : null);
    }
    
    if (phone_number !== undefined) {
      paramCount++;
      updates.push(`phone_number = $${paramCount}`);
      params.push(phone_number || null);
    }
    
    if (whatsapp_number !== undefined) {
      paramCount++;
      updates.push(`whatsapp_number = $${paramCount}`);
      params.push(whatsapp_number || null);
    }
    
    if (company_name !== undefined) {
      paramCount++;
      updates.push(`company_name = $${paramCount}`);
      params.push(company_name ? sanitizeInput(company_name) : null);
    }
    
    if (notes !== undefined) {
      paramCount++;
      updates.push(`notes = $${paramCount}`);
      params.push(notes ? sanitizeInput(notes) : null);
    }
    
    if (is_active !== undefined) {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      params.push(is_active);
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
      UPDATE clients
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, params);
    
    logger.info(`Client updated: ${id} by user ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Client updated successfully',
      data: { client: result.rows[0] }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Delete client
 */
const deleteClient = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM clients WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }
    
    logger.info(`Client deleted: ${id} by user ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Client deleted successfully'
    });
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient
};
