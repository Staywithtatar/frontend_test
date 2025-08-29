const express = require('express');
const LeaveRequest = require('../models/LeaveRequest');
const ShiftAssignment = require('../models/ShiftAssignment');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateLeaveRequest:
 *       type: object
 *       required:
 *         - shift_assignment_id
 *         - reason
 *       properties:
 *         shift_assignment_id:
 *           type: string
 *           format: uuid
 *           description: ID ของการจัดเวร
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         reason:
 *           type: string
 *           description: เหตุผลการลา
 *           example: "Personal emergency"
 *     
 *     ApproveLeaveRequest:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           enum: [approved, rejected]
 *           description: สถานะการอนุมัติ
 *           example: "approved"
 *         admin_notes:
 *           type: string
 *           description: หมายเหตุจากผู้ดูแล
 *           example: "Approved due to emergency"
 */

/**
 * @swagger
 * /api/leave-requests:
 *   post:
 *     summary: ขออนุมัติลา
 *     description: พยาบาลขอลาสำหรับเวรที่ได้รับมอบหมาย
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateLeaveRequest'
 *     responses:
 *       201:
 *         description: ส่งคำขอลาสำเร็จ
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
 *                   example: "Leave request submitted successfully"
 *                 data:
 *                   $ref: '#/components/schemas/LeaveRequest'
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง
 *       401:
 *         description: ไม่มีสิทธิ์เข้าถึง
 *       403:
 *         description: ไม่มีสิทธิ์เข้าถึง
 *       409:
 *         description: มีคำขอลาอยู่แล้ว
 *       500:
 *         description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
// POST /leave-requests - (พยาบาล) ขออนุมัติลา
router.post('/', authenticateToken, requireRole(['nurse']), async (req, res) => {
  try {
    const { shift_assignment_id, reason } = req.body;

    // Validation
    if (!shift_assignment_id || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Shift assignment ID and reason are required'
      });
    }

    // Check if shift assignment exists and belongs to the user
    const assignment = await ShiftAssignment.findById(shift_assignment_id);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Shift assignment not found'
      });
    }

    if (assignment.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only request leave for your own shifts'
      });
    }

    // Check if assignment is in the future
    const shiftDate = new Date(assignment.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (shiftDate <= today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot request leave for past or today shifts'
      });
    }

    // Check if there's already a pending or approved leave request for this assignment
    const existingRequests = await LeaveRequest.findByShiftAssignmentId(shift_assignment_id);

    const hasActiveRequest = existingRequests.some(request => 
      request.status === 'pending' || request.status === 'approved'
    );

    if (hasActiveRequest) {
      return res.status(409).json({
        success: false,
        message: 'Leave request already exists for this shift'
      });
    }

    // Create leave request
    const leaveRequest = await LeaveRequest.create({
      shift_assignment_id,
      requested_by: req.user.id,
      reason
    });

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: leaveRequest
    });
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit leave request'
    });
  }
});

// GET /leave-requests - (หัวหน้า) ดูคำขอลาทั้งหมด
router.get('/', authenticateToken, requireRole(['head_nurse']), async (req, res) => {
  try {
    const { status, requested_by, shift_id } = req.query;
    
    let filters = {};
    if (status) filters.status = status;
    if (requested_by) filters.requested_by = requested_by;
    if (shift_id) filters.shift_id = shift_id;

    const leaveRequests = await LeaveRequest.findAll(filters);

    res.json({
      success: true,
      data: leaveRequests
    });
  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leave requests'
    });
  }
});

// GET /leave-requests/my - (พยาบาล) ดูคำขอลาของตัวเอง
router.get('/my', authenticateToken, requireRole(['nurse']), async (req, res) => {
  try {
    const { status } = req.query;
    
    let leaveRequests = await LeaveRequest.findByUserId(req.user.id);
    
    // Filter by status if provided
    if (status) {
      leaveRequests = leaveRequests.filter(request => request.status === status);
    }

    res.json({
      success: true,
      data: leaveRequests
    });
  } catch (error) {
    console.error('Get my leave requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leave requests'
    });
  }
});

// GET /leave-requests/pending - Get pending leave requests (head nurse only)
router.get('/pending', authenticateToken, requireRole(['head_nurse']), async (req, res) => {
  try {
    const pendingRequests = await LeaveRequest.getPendingRequests();

    res.json({
      success: true,
      data: pendingRequests
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending requests'
    });
  }
});

// GET /leave-requests/:id - Get specific leave request
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);
    
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Check if user can view this request
    if (req.user.role === 'nurse' && leaveRequest.requested_by !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own leave requests'
      });
    }

    res.json({
      success: true,
      data: leaveRequest
    });
  } catch (error) {
    console.error('Get leave request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leave request'
    });
  }
});

/**
 * @swagger
 * /api/leave-requests/{id}/approve:
 *   patch:
 *     summary: อนุมัติ/ปฏิเสธคำขอลา
 *     description: หัวหน้าพยาบาลอนุมัติหรือปฏิเสธคำขอลา
 *     tags: [Leave Requests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID ของคำขอลา
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApproveLeaveRequest'
 *     responses:
 *       200:
 *         description: อัปเดตสถานะสำเร็จ
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
 *                   example: "Leave request approved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/LeaveRequest'
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง
 *       401:
 *         description: ไม่มีสิทธิ์เข้าถึง
 *       403:
 *         description: ไม่มีสิทธิ์เข้าถึง
 *       404:
 *         description: ไม่พบคำขอลา
 *       500:
 *         description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
// PATCH /leave-requests/:id/approve - อนุมัติ/ปฏิเสธคำขอลา (head nurse only)
router.patch('/:id/approve', authenticateToken, requireRole(['head_nurse']), async (req, res) => {
  try {
    const { status, admin_notes } = req.body;

    // Validation
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either "approved" or "rejected"'
      });
    }

    // Check if leave request exists
    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Check if request is already processed
    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Leave request has already been processed'
      });
    }

    // Update leave request
    const updatedRequest = await LeaveRequest.update(req.params.id, {
      status,
      approved_by: req.user.id,
      admin_notes
    });

    // If approved, update shift assignment status to 'on_leave'
    if (status === 'approved') {
      await ShiftAssignment.update(leaveRequest.shift_assignment_id, {
        status: 'on_leave'
      });
    }

    res.json({
      success: true,
      message: `Leave request ${status} successfully`,
      data: updatedRequest
    });
  } catch (error) {
    console.error('Approve leave request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process leave request'
    });
  }
});

// PUT /leave-requests/:id - Update leave request (nurse can only update their own pending requests)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body;

    // Check if leave request exists
    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Check permissions
    if (req.user.role === 'nurse') {
      if (leaveRequest.requested_by !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own leave requests'
        });
      }

      if (leaveRequest.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Cannot update processed leave requests'
        });
      }
    }

    // Update leave request
    const updatedRequest = await LeaveRequest.update(req.params.id, {
      reason
    });

    res.json({
      success: true,
      message: 'Leave request updated successfully',
      data: updatedRequest
    });
  } catch (error) {
    console.error('Update leave request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update leave request'
    });
  }
});

// DELETE /leave-requests/:id - Cancel leave request (nurse can only cancel their own pending requests)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Check if leave request exists
    const leaveRequest = await LeaveRequest.findById(req.params.id);
    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Check permissions
    if (req.user.role === 'nurse') {
      if (leaveRequest.requested_by !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only cancel your own leave requests'
        });
      }

      if (leaveRequest.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel processed leave requests'
        });
      }
    }

    // Delete leave request
    await LeaveRequest.delete(req.params.id);

    res.json({
      success: true,
      message: 'Leave request cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel leave request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel leave request'
    });
  }
});

module.exports = router;
