const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Nurse Scheduling System API',
      version: '1.0.0',
      description: 'REST API สำหรับระบบจัดการเวรพยาบาล',
      contact: {
        name: 'API Support',
        email: 'support@hospital.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'https://frontendtest-production-2019.up.railway.app',
        description: 'Development server'
      },
      {
        url: 'https://api.hospital.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token สำหรับ authentication'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User ID'
            },
            name: {
              type: 'string',
              description: 'ชื่อผู้ใช้'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'อีเมลผู้ใช้'
            },
            role: {
              type: 'string',
              enum: ['nurse', 'head_nurse'],
              description: 'บทบาท: nurse (พยาบาล) หรือ head_nurse (หัวหน้าพยาบาล)'
            },
            is_active: {
              type: 'boolean',
              description: 'สถานะการใช้งาน'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'วันที่สร้าง'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'วันที่อัปเดตล่าสุด'
            }
          }
        },
        Shift: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Shift ID'
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'วันที่เวร'
            },
            start_time: {
              type: 'string',
              format: 'time',
              description: 'เวลาเริ่มเวร'
            },
            end_time: {
              type: 'string',
              format: 'time',
              description: 'เวลาสิ้นสุดเวร'
            },
            shift_type: {
              type: 'string',
              enum: ['morning', 'afternoon', 'night'],
              description: 'ประเภทเวร: morning (เช้า), afternoon (บ่าย), night (ดึก)'
            },
            required_nurses: {
              type: 'integer',
              minimum: 1,
              description: 'จำนวนพยาบาลที่ต้องการ'
            },
            department: {
              type: 'string',
              description: 'แผนก'
            },
            created_by: {
              type: 'string',
              format: 'uuid',
              description: 'ID ของผู้สร้างเวร'
            },
            created_by_name: {
              type: 'string',
              description: 'ชื่อผู้สร้างเวร'
            }
          }
        },
        ShiftAssignment: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Assignment ID'
            },
            user_id: {
              type: 'string',
              format: 'uuid',
              description: 'User ID ของพยาบาล'
            },
            user_name: {
              type: 'string',
              description: 'ชื่อพยาบาล'
            },
            shift_id: {
              type: 'string',
              format: 'uuid',
              description: 'Shift ID'
            },
            status: {
              type: 'string',
              enum: ['assigned', 'completed', 'on_leave'],
              description: 'สถานะ: assigned (จัดแล้ว), completed (เสร็จแล้ว), on_leave (ลา)'
            },
            assigned_by: {
              type: 'string',
              format: 'uuid',
              description: 'ID ของผู้จัดเวร'
            },
            assigned_by_name: {
              type: 'string',
              description: 'ชื่อผู้จัดเวร'
            },
            notes: {
              type: 'string',
              description: 'หมายเหตุ'
            }
          }
        },
        LeaveRequest: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Leave Request ID'
            },
            shift_assignment_id: {
              type: 'string',
              format: 'uuid',
              description: 'Shift Assignment ID'
            },
            requested_by: {
              type: 'string',
              format: 'uuid',
              description: 'ID ของผู้ขอลา'
            },
            requested_by_name: {
              type: 'string',
              description: 'ชื่อผู้ขอลา'
            },
            reason: {
              type: 'string',
              description: 'เหตุผลการลา'
            },
            status: {
              type: 'string',
              enum: ['pending', 'approved', 'rejected'],
              description: 'สถานะ: pending (รอ), approved (อนุมัติ), rejected (ปฏิเสธ)'
            },
            approved_by: {
              type: 'string',
              format: 'uuid',
              description: 'ID ของผู้อนุมัติ'
            },
            approved_by_name: {
              type: 'string',
              description: 'ชื่อผู้อนุมัติ'
            },
            approved_at: {
              type: 'string',
              format: 'date-time',
              description: 'วันที่อนุมัติ'
            },
            admin_notes: {
              type: 'string',
              description: 'หมายเหตุจากผู้ดูแล'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              description: 'ข้อความแสดงข้อผิดพลาด'
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              description: 'ข้อความแสดงความสำเร็จ'
            },
            data: {
              type: 'object',
              description: 'ข้อมูลที่ส่งกลับ'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'การยืนยันตัวตนและการเข้าสู่ระบบ'
      },
      {
        name: 'Users',
        description: 'การจัดการผู้ใช้'
      },
      {
        name: 'Shifts',
        description: 'การจัดการเวรการทำงาน'
      },
      {
        name: 'Shift Assignments',
        description: 'การจัดเวรให้พยาบาล'
      },
      {
        name: 'My Schedule',
        description: 'การดูเวรของตัวเอง'
      },
      {
        name: 'Leave Requests',
        description: 'การขอลาและการอนุมัติ'
      }
    ]
  },
  apis: ['./routes/*.js', './server.js'] // Path to the API docs
};

const specs = swaggerJsdoc(options);

module.exports = specs;
