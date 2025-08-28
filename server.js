const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/database');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Nurse Scheduling System API Documentation',
  customfavIcon: '/favicon.ico'
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/shift-assignments', require('./routes/shift-assignments'));
app.use('/api/my-schedule', require('./routes/my-schedule'));
app.use('/api/leave-requests', require('./routes/leave-requests'));

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health Check
 *     description: ตรวจสอบสถานะการทำงานของ API
 *     tags: [System]
 *     responses:
 *       200:
 *         description: API ทำงานปกติ
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
 *                   example: "Nurse Scheduling API is running"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-15T10:30:00.000Z"
 */
// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Nurse Scheduling API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;

// Start server
const startServer = async () => {
  try {
    await testConnection();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 API Documentation: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
