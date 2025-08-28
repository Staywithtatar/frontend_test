const { pool } = require('../config/database');

class LeaveRequest {
  static async create(leaveData) {
    const { shift_assignment_id, requested_by, reason } = leaveData;
    
    const query = `
      INSERT INTO leave_requests (shift_assignment_id, requested_by, reason)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await pool.query(query, [shift_assignment_id, requested_by, reason]);
    return result.rows[0];
  }

  static async findById(id) {
    const query = `
      SELECT lr.*, 
             sa.user_id, sa.shift_id, sa.status as assignment_status,
             u.name as requested_by_name,
             s.date, s.start_time, s.end_time, s.shift_type, s.department,
             a.name as approved_by_name
      FROM leave_requests lr
      JOIN shift_assignments sa ON lr.shift_assignment_id = sa.id
      JOIN users u ON lr.requested_by = u.id
      JOIN shifts s ON sa.shift_id = s.id
      LEFT JOIN users a ON lr.approved_by = a.id
      WHERE lr.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const query = `
      SELECT lr.*, 
             sa.shift_id, sa.status as assignment_status,
             s.date, s.start_time, s.end_time, s.shift_type, s.department,
             a.name as approved_by_name
      FROM leave_requests lr
      JOIN shift_assignments sa ON lr.shift_assignment_id = sa.id
      JOIN shifts s ON sa.shift_id = s.id
      LEFT JOIN users a ON lr.approved_by = a.id
      WHERE lr.requested_by = $1
      ORDER BY lr.request_date DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT lr.*, 
             sa.user_id, sa.shift_id, sa.status as assignment_status,
             u.name as requested_by_name,
             s.date, s.start_time, s.end_time, s.shift_type, s.department,
             a.name as approved_by_name
      FROM leave_requests lr
      JOIN shift_assignments sa ON lr.shift_assignment_id = sa.id
      JOIN users u ON lr.requested_by = u.id
      JOIN shifts s ON sa.shift_id = s.id
      LEFT JOIN users a ON lr.approved_by = a.id
    `;
    
    const conditions = [];
    const values = [];
    let paramCount = 1;

    if (filters.status) {
      conditions.push(`lr.status = $${paramCount}`);
      values.push(filters.status);
      paramCount++;
    }

    if (filters.requested_by) {
      conditions.push(`lr.requested_by = $${paramCount}`);
      values.push(filters.requested_by);
      paramCount++;
    }

    if (filters.shift_id) {
      conditions.push(`sa.shift_id = $${paramCount}`);
      values.push(filters.shift_id);
      paramCount++;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ` ORDER BY lr.request_date DESC`;
    
    const result = await pool.query(query, values);
    return result.rows;
  }

  static async update(id, updateData) {
    const { status, approved_by, admin_notes } = updateData;
    
    let query;
    let values;
    
    if (status === 'approved' || status === 'rejected') {
      query = `
        UPDATE leave_requests 
        SET status = $1, 
            approved_by = $2, 
            approved_at = CURRENT_TIMESTAMP,
            admin_notes = COALESCE($3, admin_notes),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `;
      values = [status, approved_by, admin_notes, id];
    } else {
      query = `
        UPDATE leave_requests 
        SET status = $1,
            admin_notes = COALESCE($2, admin_notes),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;
      values = [status, admin_notes, id];
    }
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM leave_requests WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async getPendingRequests() {
    const query = `
      SELECT lr.*, 
             sa.user_id, sa.shift_id,
             u.name as requested_by_name,
             s.date, s.start_time, s.end_time, s.shift_type, s.department
      FROM leave_requests lr
      JOIN shift_assignments sa ON lr.shift_assignment_id = sa.id
      JOIN users u ON lr.requested_by = u.id
      JOIN shifts s ON sa.shift_id = s.id
      WHERE lr.status = 'pending'
      ORDER BY lr.request_date ASC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  static async getApprovedRequests(startDate, endDate) {
    const query = `
      SELECT lr.*, 
             sa.user_id, sa.shift_id,
             u.name as requested_by_name,
             s.date, s.start_time, s.end_time, s.shift_type, s.department,
             a.name as approved_by_name
      FROM leave_requests lr
      JOIN shift_assignments sa ON lr.shift_assignment_id = sa.id
      JOIN users u ON lr.requested_by = u.id
      JOIN shifts s ON sa.shift_id = s.id
      LEFT JOIN users a ON lr.approved_by = a.id
      WHERE lr.status = 'approved' AND s.date BETWEEN $1 AND $2
      ORDER BY s.date ASC
    `;
    
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }
}

module.exports = LeaveRequest;
