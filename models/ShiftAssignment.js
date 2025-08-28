const { pool } = require('../config/database');

class ShiftAssignment {
  static async create(assignmentData) {
    const { user_id, shift_id, assigned_by, notes } = assignmentData;
    
    const query = `
      INSERT INTO shift_assignments (user_id, shift_id, assigned_by, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await pool.query(query, [user_id, shift_id, assigned_by, notes]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT sa.*, 
             u.name as user_name,
             s.date, s.start_time, s.end_time, s.shift_type, s.department,
             a.name as assigned_by_name
      FROM shift_assignments sa
      JOIN users u ON sa.user_id = u.id
      JOIN shifts s ON sa.shift_id = s.id
      JOIN users a ON sa.assigned_by = a.id
      WHERE sa.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const query = `
      SELECT sa.*, 
             s.date, s.start_time, s.end_time, s.shift_type, s.department,
             a.name as assigned_by_name
      FROM shift_assignments sa
      JOIN shifts s ON sa.shift_id = s.id
      JOIN users a ON sa.assigned_by = a.id
      WHERE sa.user_id = $1
      ORDER BY s.date ASC, s.start_time ASC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async findByShiftId(shiftId) {
    const query = `
      SELECT sa.*, 
             u.name as user_name,
             a.name as assigned_by_name
      FROM shift_assignments sa
      JOIN users u ON sa.user_id = u.id
      JOIN users a ON sa.assigned_by = a.id
      WHERE sa.shift_id = $1
      ORDER BY u.name
    `;
    const result = await pool.query(query, [shiftId]);
    return result.rows;
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT sa.*, 
             u.name as user_name,
             s.date, s.start_time, s.end_time, s.shift_type, s.department,
             a.name as assigned_by_name
      FROM shift_assignments sa
      JOIN users u ON sa.user_id = u.id
      JOIN shifts s ON sa.shift_id = s.id
      JOIN users a ON sa.assigned_by = a.id
    `;
    
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (filters.user_id) {
      conditions.push(`sa.user_id = $${paramCount}`);
      values.push(filters.user_id);
      paramCount++;
    }

    if (filters.shift_id) {
      conditions.push(`sa.shift_id = $${paramCount}`);
      values.push(filters.shift_id);
      paramCount++;
    }

    if (filters.status) {
      conditions.push(`sa.status = $${paramCount}`);
      values.push(filters.status);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY s.date DESC, s.start_time ASC`;
    
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async update(id, updateData) {
    const { status, notes } = updateData;
    
    const query = `
      UPDATE shift_assignments 
      SET status = COALESCE($1, status),
          notes = COALESCE($2, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await pool.query(query, [status, notes, id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM shift_assignments WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getUserSchedule(userId, startDate, endDate) {
    const query = `
      SELECT sa.*, 
             s.date, s.start_time, s.end_time, s.shift_type, s.department,
             a.name as assigned_by_name
      FROM shift_assignments sa
      JOIN shifts s ON sa.shift_id = s.id
      JOIN users a ON sa.assigned_by = a.id
      WHERE sa.user_id = $1 AND s.date BETWEEN $2 AND $3
      ORDER BY s.date ASC, s.start_time ASC
    `;
    
    const result = await pool.query(query, [userId, startDate, endDate]);
    return result.rows;
  }
}

module.exports = ShiftAssignment;
