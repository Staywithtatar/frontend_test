const express = require('express');
const ShiftAssignment = require('../models/ShiftAssignment');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ScheduleResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           properties:
 *             schedule:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ShiftAssignment'
 *             groupedSchedule:
 *               type: object
 *               additionalProperties:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ShiftAssignment'
 *             summary:
 *               type: object
 *               properties:
 *                 totalShifts:
 *                   type: integer
 *                   description: จำนวนเวรทั้งหมด
 *                 completedShifts:
 *                   type: integer
 *                   description: จำนวนเวรที่เสร็จแล้ว
 *                 upcomingShifts:
 *                   type: integer
 *                   description: จำนวนเวรที่กำลังจะมาถึง
 *                 onLeaveShifts:
 *                   type: integer
 *                   description: จำนวนเวรที่ลา
 *                 dateRange:
 *                   type: object
 *                   properties:
 *                     start:
 *                       type: string
 *                       format: date
 *                     end:
 *                       type: string
 *                       format: date
 */

/**
 * @swagger
 * /api/my-schedule:
 *   get:
 *     summary: ดูเวรของตัวเอง
 *     description: พยาบาลดูเวรการทำงานของตัวเองพร้อมสรุปสถิติ
 *     tags: [My Schedule]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [assigned, completed, on_leave]
 *         description: สถานะเวร
 *     responses:
 *       200:
 *         description: ดึงข้อมูลสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScheduleResponse'
 *       401:
 *         description: ไม่มีสิทธิ์เข้าถึง
 *       403:
 *         description: ไม่มีสิทธิ์เข้าถึง
 *       500:
 *         description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
// GET /my-schedule - (พยาบาล) ดูเวรตัวเอง
router.get('/', authenticateToken, requireRole(['nurse']), async (req, res) => {
  try {
    const { start_date, end_date, status } = req.query;
    
    // Default to current month if no dates provided
    let startDate = start_date;
    let endDate = end_date;
    
    if (!startDate || !endDate) {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    }

    // Get user's schedule
    const schedule = await ShiftAssignment.getUserSchedule(req.user.id, startDate, endDate);

    // Filter by status if provided
    let filteredSchedule = schedule;
    if (status) {
      filteredSchedule = schedule.filter(assignment => assignment.status === status);
    }

    // Group by date for better organization
    const groupedSchedule = filteredSchedule.reduce((acc, assignment) => {
      const date = assignment.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(assignment);
      return acc;
    }, {});

    // Calculate summary statistics
    const totalShifts = filteredSchedule.length;
    const completedShifts = filteredSchedule.filter(s => s.status === 'completed').length;
    const upcomingShifts = filteredSchedule.filter(s => s.status === 'assigned').length;
    const onLeaveShifts = filteredSchedule.filter(s => s.status === 'on_leave').length;

    res.json({
      success: true,
      data: {
        schedule: filteredSchedule,
        groupedSchedule,
        summary: {
          totalShifts,
          completedShifts,
          upcomingShifts,
          onLeaveShifts,
          dateRange: {
            start: startDate,
            end: endDate
          }
        }
      }
    });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get schedule'
    });
  }
});

// GET /my-schedule/upcoming - Get upcoming shifts only
router.get('/upcoming', authenticateToken, requireRole(['nurse']), async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get user's upcoming assignments
    const now = new Date();
    const startDate = now.toISOString().split('T')[0];
    const endDate = new Date(now.getFullYear() + 1, 11, 31).toISOString().split('T')[0]; // End of year
    
    const schedule = await ShiftAssignment.getUserSchedule(req.user.id, startDate, endDate);
    
    // Filter for upcoming shifts only
    const upcomingShifts = schedule
      .filter(assignment => 
        assignment.status === 'assigned' && 
        new Date(assignment.date) >= now
      )
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: upcomingShifts
    });
  } catch (error) {
    console.error('Get upcoming schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get upcoming schedule'
    });
  }
});

// GET /my-schedule/today - Get today's shifts
router.get('/today', authenticateToken, requireRole(['nurse']), async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const schedule = await ShiftAssignment.getUserSchedule(req.user.id, today, today);
    
    // Filter for today's shifts
    const todaysShifts = schedule.filter(assignment => 
      assignment.status === 'assigned' || assignment.status === 'completed'
    );

    res.json({
      success: true,
      data: {
        date: today,
        shifts: todaysShifts,
        totalShifts: todaysShifts.length
      }
    });
  } catch (error) {
    console.error('Get today schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get today schedule'
    });
  }
});

// GET /my-schedule/week - Get this week's schedule
router.get('/week', authenticateToken, requireRole(['nurse']), async (req, res) => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (6 - now.getDay())); // End of week (Saturday)
    
    const startDate = startOfWeek.toISOString().split('T')[0];
    const endDate = endOfWeek.toISOString().split('T')[0];
    
    const schedule = await ShiftAssignment.getUserSchedule(req.user.id, startDate, endDate);
    
    // Group by day of week
    const weekSchedule = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      weekSchedule[dateStr] = schedule.filter(s => s.date === dateStr);
    }

    res.json({
      success: true,
      data: {
        weekRange: {
          start: startDate,
          end: endDate
        },
        schedule: weekSchedule,
        totalShifts: schedule.length
      }
    });
  } catch (error) {
    console.error('Get week schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get week schedule'
    });
  }
});

// GET /my-schedule/month - Get this month's schedule
router.get('/month', authenticateToken, requireRole(['nurse']), async (req, res) => {
  try {
    const { month, year } = req.query;
    
    let targetMonth, targetYear;
    if (month && year) {
      targetMonth = parseInt(month) - 1; // Month is 0-indexed
      targetYear = parseInt(year);
    } else {
      const now = new Date();
      targetMonth = now.getMonth();
      targetYear = now.getFullYear();
    }
    
    const startDate = new Date(targetYear, targetMonth, 1).toISOString().split('T')[0];
    const endDate = new Date(targetYear, targetMonth + 1, 0).toISOString().split('T')[0];
    
    const schedule = await ShiftAssignment.getUserSchedule(req.user.id, startDate, endDate);
    
    // Group by date
    const monthSchedule = {};
    for (let i = 1; i <= new Date(targetYear, targetMonth + 1, 0).getDate(); i++) {
      const date = new Date(targetYear, targetMonth, i).toISOString().split('T')[0];
      monthSchedule[date] = schedule.filter(s => s.date === date);
    }

    res.json({
      success: true,
      data: {
        month: targetMonth + 1,
        year: targetYear,
        schedule: monthSchedule,
        totalShifts: schedule.length,
        summary: {
          totalShifts: schedule.length,
          completedShifts: schedule.filter(s => s.status === 'completed').length,
          upcomingShifts: schedule.filter(s => s.status === 'assigned').length,
          onLeaveShifts: schedule.filter(s => s.status === 'on_leave').length
        }
      }
    });
  } catch (error) {
    console.error('Get month schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get month schedule'
    });
  }
});

module.exports = router;
