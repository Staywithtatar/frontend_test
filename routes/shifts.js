const express = require('express');
const Shift = require('../models/Shift');
const ShiftAssignment = require('../models/ShiftAssignment');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { pool } = require('../config/database');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateShiftRequest:
 *       type: object
 *       required:
 *         - date
 *         - start_time
 *         - end_time
 *         - shift_type
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *           description: วันที่เวร
 *           example: "2024-01-15"
 *         start_time:
 *           type: string
 *           format: time
 *           description: เวลาเริ่มเวร
 *           example: "08:00"
 *         end_time:
 *           type: string
 *           format: time
 *           description: เวลาสิ้นสุดเวร
 *           example: "16:00"
 *         shift_type:
 *           type: string
 *           enum: [morning, afternoon, night]
 *           description: ประเภทเวร
 *           example: "morning"
 *         required_nurses:
 *           type: integer
 *           minimum: 1
 *           description: จำนวนพยาบาลที่ต้องการ
 *           example: 2
 *         department:
 *           type: string
 *           description: แผนก
 *           example: "Emergency"
 *     
 *     UpdateShiftRequest:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *           description: วันที่เวร
 *         start_time:
 *           type: string
 *           format: time
 *           description: เวลาเริ่มเวร
 *         end_time:
 *           type: string
 *           format: time
 *           description: เวลาสิ้นสุดเวร
 *         shift_type:
 *           type: string
 *           enum: [morning, afternoon, night]
 *           description: ประเภทเวร
 *         required_nurses:
 *           type: integer
 *           minimum: 1
 *           description: จำนวนพยาบาลที่ต้องการ
 *         department:
 *           type: string
 *           description: แผนก
 */

/**
 * @swagger
 * /api/shifts:
 *   post:
 *     summary: สร้างเวรใหม่
 *     description: สร้างเวรการทำงานใหม่ (เฉพาะหัวหน้าพยาบาล)
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateShiftRequest'
 *     responses:
 *       201:
 *         description: สร้างเวรสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Shift created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Shift'
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง
 *       401:
 *         description: ไม่มีสิทธิ์เข้าถึง
 *       403:
 *         description: ไม่มีสิทธิ์เข้าถึง
 *       409:
 *         description: เวรซ้ำหรือขัดแย้ง
 *       500:
 *         description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
// POST /shifts - (หัวหน้า) สร้างเวร
router.post('/', authenticateToken, requireRole(['head_nurse']), async (req, res) => {
  try {
    const { date, start_time, end_time, shift_type, required_nurses, department } = req.body;

    // Validation
    if (!date || !start_time || !end_time || !shift_type) {
      return res.status(400).json({
        success: false,
        message: 'Date, start_time, end_time, and shift_type are required'
      });
    }

    if (!['morning', 'afternoon', 'night'].includes(shift_type)) {
      return res.status(400).json({
        success: false,
        message: 'Shift type must be morning, afternoon, or night'
      });
    }

    if (required_nurses && required_nurses < 1) {
      return res.status(400).json({
        success: false,
        message: 'Required nurses must be at least 1'
      });
    }

    // Check if shift already exists for the same date and time
    const existingShifts = await Shift.findAll({ date });
    const hasConflict = existingShifts.some(shift => {
      if (shift.shift_type === shift_type) {
        return true; // Same shift type on same date
      }
      // Check for time overlap
      const newStart = new Date(`2000-01-01 ${start_time}`);
      const newEnd = new Date(`2000-01-01 ${end_time}`);
      const existingStart = new Date(`2000-01-01 ${shift.start_time}`);
      const existingEnd = new Date(`2000-01-01 ${shift.end_time}`);
      
      return (newStart < existingEnd && newEnd > existingStart);
    });

    if (hasConflict) {
      return res.status(409).json({
        success: false,
        message: 'Shift conflict detected for the same date and time'
      });
    }

    // Create shift
    const shift = await Shift.create({
      date,
      start_time,
      end_time,
      shift_type,
      required_nurses: required_nurses || 1,
      department: department || 'General',
      created_by: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Shift created successfully',
      data: shift
    });
  } catch (error) {
    console.error('Create shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create shift'
    });
  }
});

/**
 * @swagger
 * /api/shifts:
 *   get:
 *     summary: ดูรายการเวรทั้งหมด
 *     description: ดูรายการเวรการทำงานทั้งหมดพร้อมตัวกรอง
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: วันที่เฉพาะ
 *       - in: query
 *         name: shift_type
 *         schema:
 *           type: string
 *           enum: [morning, afternoon, night]
 *         description: ประเภทเวร
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: แผนก
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: วันที่เริ่มต้น
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: วันที่สิ้นสุด
 *     responses:
 *       200:
 *         description: ดึงข้อมูลสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Shift'
 *       401:
 *         description: ไม่มีสิทธิ์เข้าถึง
 *       500:
 *         description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
// GET /shifts - Get all shifts with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { date, shift_type, department, start_date, end_date } = req.query;
    
    let filters = {};
    if (date) filters.date = date;
    if (shift_type) filters.shift_type = shift_type;
    if (department) filters.department = department;

    let shifts;
    if (start_date && end_date) {
      shifts = await Shift.getShiftsByDateRange(start_date, end_date);
    } else {
      shifts = await Shift.findAll(filters);
    }

    res.json({
      success: true,
      data: shifts
    });
  } catch (error) {
    console.error('Get shifts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get shifts'
    });
  }
});

/**
 * @swagger
 * /api/shifts/calendar:
 *   get:
 *     summary: ดูปฏิทินเวรทั้งหมด (สำหรับ Head Nurse)
 *     description: Head Nurse ดูปฏิทินเวรทั้งหมดที่มีการจัดเวรพยาบาลในแต่ละวัน
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: วันที่เริ่มต้น
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: วันที่สิ้นสุด
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *         description: แผนกที่ต้องการดู
 *     responses:
 *       200:
 *         description: ดึงข้อมูลสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       shift:
 *                         $ref: '#/components/schemas/Shift'
 *                       assignments:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/ShiftAssignment'
 *       401:
 *         description: ไม่มีสิทธิ์เข้าถึง
 *       403:
 *         description: ไม่มีสิทธิ์เข้าถึง
 *       500:
 *         description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
// GET /shifts/calendar - (Head Nurse) ดูปฏิทินเวรทั้งหมด
router.get('/calendar', authenticateToken, requireRole(['head_nurse']), async (req, res) => {
  try {
    const { start_date, end_date, department } = req.query;
    
    // Default to current month if no dates provided
    let startDate = start_date;
    let endDate = end_date;
    
    if (!startDate || !endDate) {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    }

    // Build query for shifts
    let shiftsQuery = `
      SELECT * FROM shifts 
      WHERE date BETWEEN $1 AND $2
    `;
    let queryParams = [startDate, endDate];
    let paramCount = 3;

    if (department && department !== 'all') {
      shiftsQuery += ` AND department = $${paramCount}`;
      queryParams.push(department);
      paramCount++;
    }

    shiftsQuery += ` ORDER BY date ASC, start_time ASC`;
    
    const shiftsResult = await pool.query(shiftsQuery, queryParams);
    const shifts = shiftsResult.rows;

    // Get assignments for each shift
    const shiftsWithAssignments = await Promise.all(
      shifts.map(async (shift) => {
        const assignments = await ShiftAssignment.findByShiftId(shift.id);
        return {
          shift,
          assignments: assignments || []
        };
      })
    );

    res.json({
      success: true,
      data: shiftsWithAssignments
    });
  } catch (error) {
    console.error('Get shifts calendar error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get shifts calendar'
    });
  }
});

// GET /shifts/:id - Get specific shift
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    res.json({
      success: true,
      data: shift
    });
  } catch (error) {
    console.error('Get shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get shift'
    });
  }
});

// PUT /shifts/:id - Update shift (head nurse only)
router.put('/:id', authenticateToken, requireRole(['head_nurse']), async (req, res) => {
  try {
    const { date, start_time, end_time, shift_type, required_nurses, department } = req.body;

    // Check if shift exists
    const existingShift = await Shift.findById(req.params.id);
    if (!existingShift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    // Validation
    if (shift_type && !['morning', 'afternoon', 'night'].includes(shift_type)) {
      return res.status(400).json({
        success: false,
        message: 'Shift type must be morning, afternoon, or night'
      });
    }

    if (required_nurses && required_nurses < 1) {
      return res.status(400).json({
        success: false,
        message: 'Required nurses must be at least 1'
      });
    }

    // Update shift
    const updatedShift = await Shift.update(req.params.id, {
      date,
      start_time,
      end_time,
      shift_type,
      required_nurses,
      department
    });

    res.json({
      success: true,
      message: 'Shift updated successfully',
      data: updatedShift
    });
  } catch (error) {
    console.error('Update shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update shift'
    });
  }
});

// DELETE /shifts/:id - Delete shift (head nurse only)
router.delete('/:id', authenticateToken, requireRole(['head_nurse']), async (req, res) => {
  try {
    // Check if shift exists
    const existingShift = await Shift.findById(req.params.id);
    if (!existingShift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    // Delete shift
    await Shift.delete(req.params.id);

    res.json({
      success: true,
      message: 'Shift deleted successfully'
    });
  } catch (error) {
    console.error('Delete shift error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete shift'
    });
  }
});

module.exports = router;
