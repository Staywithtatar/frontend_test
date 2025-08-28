const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: อีเมลผู้ใช้
 *           example: "jane@hospital.com"
 *         password:
 *           type: string
 *           description: รหัสผ่าน
 *           example: "SecurePass123"
 *     
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           description: ชื่อผู้ใช้
 *           example: "Jane Doe"
 *         email:
 *           type: string
 *           format: email
 *           description: อีเมลผู้ใช้
 *           example: "jane@hospital.com"
 *         password:
 *           type: string
 *           description: รหัสผ่าน
 *           example: "SecurePass123"
 *         role:
 *           type: string
 *           enum: [nurse, head_nurse]
 *           description: บทบาทผู้ใช้
 *           example: "nurse"
 *     
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Login successful"
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/User'
 *             token:
 *               type: string
 *               description: JWT token
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: สมัครผู้ใช้ใหม่
 *     description: สมัครผู้ใช้ใหม่ (ไม่ต้องการ authentication)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: สร้างผู้ใช้สำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: ไม่มีสิทธิ์เข้าถึง
 *       409:
 *         description: อีเมลซ้ำ
 *       500:
 *         description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
// POST /auth/register - สมัครผู้ใช้ใหม่ (ไม่ต้องการ authentication)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    if (role && !['nurse', 'head_nurse'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either "nurse" or "head_nurse"'
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'nurse'
    });

    // Remove password from response
    const { password_hash, ...userResponse } = user;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: เข้าสู่ระบบ
 *     description: เข้าสู่ระบบและรับ JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: เข้าสู่ระบบสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง
 *       401:
 *         description: อีเมลหรือรหัสผ่านไม่ถูกต้อง
 *       500:
 *         description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
// POST /auth/login - login และรับ JWT
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isValidPassword = await User.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password_hash, ...userResponse } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: ดูโปรไฟล์ตัวเอง
 *     description: ดูข้อมูลโปรไฟล์ของผู้ใช้ที่เข้าสู่ระบบอยู่
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
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
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: ไม่มีสิทธิ์เข้าถึง
 *       500:
 *         description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
// GET /auth/me - Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
});

/**
 * @swagger
 * /api/auth/users:
 *   get:
 *     summary: ดูผู้ใช้ทั้งหมด
 *     description: ดูรายการผู้ใช้ทั้งหมดในระบบ (เฉพาะหัวหน้าพยาบาล)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
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
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: ไม่มีสิทธิ์เข้าถึง
 *       403:
 *         description: ไม่มีสิทธิ์เข้าถึง
 *       500:
 *         description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
// GET /auth/users - Get all users (head nurse only)
router.get('/users', authenticateToken, requireRole(['head_nurse']), async (req, res) => {
  try {
    const users = await User.findAll();
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
});

/**
 * @swagger
 * /api/auth/register-public:
 *   post:
 *     summary: สมัครผู้ใช้ใหม่ (ไม่ต้องการ authentication)
 *     description: สมัครผู้ใช้ใหม่สำหรับพยาบาลทั่วไป
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: ชื่อผู้ใช้
 *                 example: "Jane Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: อีเมลผู้ใช้
 *                 example: "jane@hospital.com"
 *               password:
 *                 type: string
 *                 description: รหัสผ่าน
 *                 example: "SecurePass123"
 *     responses:
 *       201:
 *         description: สร้างผู้ใช้สำเร็จ
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
 *                   example: "User created successfully"
 *                 data:
 *                   type: object
 *       400:
 *         description: ข้อมูลไม่ถูกต้อง
 *       409:
 *         description: อีเมลซ้ำ
 *       500:
 *         description: ข้อผิดพลาดภายในเซิร์ฟเวอร์
 */
// POST /auth/register-public - สมัครผู้ใช้ใหม่ (ไม่ต้องการ authentication)
router.post('/register-public', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user with default role 'nurse'
    const user = await User.create({
      name,
      email,
      password,
      role: 'nurse' // Default role for public registration
    });

    // Remove password from response
    const { password_hash, ...userResponse } = user;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Public registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
});

module.exports = router;
