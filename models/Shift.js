const { pool } = require('../config/database');

class Shift {
  static async create(shiftData) {
    const { date, start_time, end_time, shift_type, required_nurses, department, created_by } = shiftData;
    
    const query = `
      INSERT INTO shifts (date, start_time, end_time, shift_type, required_nurses, department, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      date, start_time, end_time, shift_type, required_nurses, department, created_by
    ]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT s.*, u.name as created_by_name
      FROM shifts s
      JOIN users u ON s.created_by = u.id
      WHERE s.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT s.*, u.name as created_by_name
      FROM shifts s
      JOIN users u ON s.created_by = u.id
    `;
    
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (filters.date) {
      conditions.push(`s.date = $${paramCount}`);
      values.push(filters.date);
      paramCount++;
    }

    if (filters.shift_type) {
      conditions.push(`s.shift_type = $${paramCount}`);
      values.push(filters.shift_type);
      paramCount++;
    }

    if (filters.department) {
      conditions.push(`s.department = $${paramCount}`);
      values.push(filters.department);
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
    const { date, start_time, end_time, shift_type, required_nurses, department } = updateData;
    
    const query = `
      UPDATE shifts 
      SET date = COALESCE($1, date),
          start_time = COALESCE($2, start_time),
          end_time = COALESCE($3, end_time),
          shift_type = COALESCE($4, shift_type),
          required_nurses = COALESCE($5, required_nurses),
          department = COALESCE($6, department),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      date, start_time, end_time, shift_type, required_nurses, department, id
    ]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM shifts WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getShiftsByDateRange(startDate, endDate) {
    const query = `
      SELECT s.*, u.name as created_by_name
      FROM shifts s
      JOIN users u ON s.created_by = u.id
      WHERE s.date BETWEEN $1 AND $2
      ORDER BY s.date ASC, s.start_time ASC
    `;
    
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }
}

module.exports = Shift;
