const express = require('express');
const ShiftAssignment = require('../models/ShiftAssignment');
const Shift = require('../models/Shift');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateShiftAssignmentRequest:
 *       type: object
 *       required:
 *         - user_id
 *         - shift_id
 *       properties:
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID ของพยาบาล
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         shift_id:
 *           type: string
 *           format: uuid
 *           description: ID ของเวร
 *           example: "123e4567-e89b-12d3-a456-426614174001"
 *         notes:
 *           type: string
 *           description: หมายเหตุ
 *           example: "Regular assignment"
 *     
 *     UpdateShiftAssignmentRequest:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [assigned, completed, on_leave]
 *           description: สถานะการจัดเวร
 *           example: "completed"
 *         notes:
 *           type: string
 *           description: หมายเหตุ
 *           example: "Shift completed successfully"
 */

/**
 * @swagger
 * /api/shift-assignments:
 *   post:
 *     summary: จัดเวรให้พยาบาล
 *     description: หัวหน้าพยาบาลจัดเวรให้พยาบาล
 *     tags: [Shift Assignments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateShiftAssignmentRequest'
 *     responses:
 *       201:
 *         description: จัดเวรสำเร็จ
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
 *                   example: "Shift assigned successfully"
 *                 data:
 *                   $ref: '#/components/schemas/ShiftAssignment'
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง
 *       401:
 *         description: ไม่มีสิทธิ์เข้าถึง
 *       403:
 *         description: ไม่มีสิทธิ์เข้าถึง
 *       404:
 *         description: ไม่พบผู้ใช้หรือเวร
 *       409:
 *         description: เวรซ้ำหรือเต็ม
 *       500:
 *         description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
// POST /shift-assignments - (หัวหน้า) จัดเวรให้พยาบาล
router.post('/', authenticateToken, requireRole(['head_nurse']), async (req, res) => {
  try {
    const { user_id, shift_id, notes } = req.body;

    // Validation
    if (!user_id || !shift_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID and shift ID are required'
      });
    }

    // Check if user exists and is a nurse
    const user = await User.findById(user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role !== 'nurse') {
      return res.status(400).json({
        success: false,
        message: 'Can only assign shifts to nurses'
      });
    }

    if (!user.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign shifts to inactive users'
      });
    }

    // Check if shift exists
    const shift = await Shift.findById(shift_id);
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }

    // Check if user is already assigned to this shift
    const existingAssignment = await ShiftAssignment.findAll({
      user_id,
      shift_id
    });

    if (existingAssignment.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User is already assigned to this shift'
      });
    }

    // Check if shift is full
    const currentAssignments = await ShiftAssignment.findAll({ shift_id });
    if (currentAssignments.length >= shift.required_nurses) {
      return res.status(409).json({
        success: false,
        message: 'Shift is already full'
      });
    }

    // Check for double booking (user assigned to overlapping shifts)
    const userAssignments = await ShiftAssignment.findByUserId(user_id);
    const hasConflict = userAssignments.some(assignment => {
      if (assignment.shift_id === shift_id) return false; // Same shift
      
      const assignmentShift = userAssignments.find(a => a.shift_id === assignment.shift_id);
      if (!assignmentShift) return false;
      
      // Check if dates are the same
      if (assignment.date !== shift.date) return false;
      
      // Check for time overlap
      const newStart = new Date(`2000-01-01 ${shift.start_time}`);
      const newEnd = new Date(`2000-01-01 ${shift.end_time}`);
      const existingStart = new Date(`2000-01-01 ${assignment.start_time}`);
      const existingEnd = new Date(`2000-01-01 ${assignment.end_time}`);
      
      return (newStart < existingEnd && newEnd > existingStart);
    });

    if (hasConflict) {
      return res.status(409).json({
        success: false,
        message: 'User has conflicting shift assignments'
      });
    }

    // Create assignment
    const assignment = await ShiftAssignment.create({
      user_id,
      shift_id,
      assigned_by: req.user.id,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Shift assigned successfully',
      data: assignment
    });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign shift'
    });
  }
});

// GET /shift-assignments - Get all assignments with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { user_id, shift_id, status } = req.query;
    
    let filters = {};
    if (user_id) filters.user_id = user_id;
    if (shift_id) filters.shift_id = shift_id;
    if (status) filters.status = status;

    const assignments = await ShiftAssignment.findAll(filters);

    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get assignments'
    });
  }
});

// GET /shift-assignments/:id - Get specific assignment
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const assignment = await ShiftAssignment.findById(req.params.id);
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get assignment'
    });
  }
});

// PUT /shift-assignments/:id - Update assignment status
router.put('/:id', authenticateToken, requireRole(['head_nurse']), async (req, res) => {
  try {
    const { status, notes } = req.body;

    // Check if assignment exists
    const existingAssignment = await ShiftAssignment.findById(req.params.id);
    if (!existingAssignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Validation
    if (status && !['assigned', 'completed', 'on_leave'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be assigned, completed, or on_leave'
      });
    }

    // Update assignment
    const updatedAssignment = await ShiftAssignment.update(req.params.id, {
      status,
      notes
    });

    res.json({
      success: true,
      message: 'Assignment updated successfully',
      data: updatedAssignment
    });
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update assignment'
    });
  }
});

// DELETE /shift-assignments/:id - Remove assignment
router.delete('/:id', authenticateToken, requireRole(['head_nurse']), async (req, res) => {
  try {
    // Check if assignment exists
    const existingAssignment = await ShiftAssignment.findById(req.params.id);
    if (!existingAssignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Delete assignment
    await ShiftAssignment.delete(req.params.id);

    res.json({
      success: true,
      message: 'Assignment removed successfully'
    });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove assignment'
    });
  }
});

// GET /shift-assignments/shift/:shiftId - Get all assignments for a specific shift
router.get('/shift/:shiftId', authenticateToken, async (req, res) => {
  try {
    const assignments = await ShiftAssignment.findByShiftId(req.params.shiftId);

    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Get shift assignments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get shift assignments'
    });
  }
});

module.exports = router;
