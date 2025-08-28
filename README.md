# Nurse Scheduling System - Backend API

ระบบจัดการเวรพยาบาลด้วย REST API ที่พัฒนาด้วย Node.js, Express.js และ PostgreSQL

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **User Management**: Register, login, and manage users (nurses and head nurses)
- **Shift Management**: Create, update, and manage work shifts
- **Shift Assignment**: Assign nurses to specific shifts
- **Schedule Viewing**: Nurses can view their personal schedules
- **Leave Management**: Request, approve, and manage leave requests

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (with Supabase support)
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: Built-in input validation
- **CORS**: Cross-origin resource sharing support

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn package manager

## 🚀 Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd systems
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment setup**

   ```bash
   cp env.example .env
   # Edit .env file with your configuration
   ```

4. **Database setup**

   - Create PostgreSQL database
   - Run the SQL schema from the database schema section
   - Update DATABASE_URL in .env file

5. **Start the server**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 🗄️ Database Schema

ระบบใช้ PostgreSQL database schema ที่มีตารางหลักดังนี้:

- **users**: ข้อมูลผู้ใช้ (พยาบาล, หัวหน้าพยาบาล)
- **shifts**: ข้อมูลเวรการทำงาน
- **shift_assignments**: การจัดเวรให้พยาบาล
- **leave_requests**: คำขอลา

ดู SQL schema ที่สมบูรณ์ได้ในไฟล์ `database-schema.sql`

## 🔐 API Endpoints

### Authentication

#### POST `/api/auth/register`

สมัครผู้ใช้ใหม่ (เฉพาะหัวหน้าพยาบาล)

**Request Body:**

```json
{
  "name": "Jane Doe",
  "email": "jane@hospital.com",
  "password": "SecurePass123",
  "role": "nurse"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "uuid",
    "name": "Jane Doe",
    "email": "jane@hospital.com",
    "role": "nurse",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### POST `/api/auth/login`

เข้าสู่ระบบและรับ JWT token

**Request Body:**

```json
{
  "email": "jane@hospital.com",
  "password": "SecurePass123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Jane Doe",
      "email": "jane@hospital.com",
      "role": "nurse"
    },
    "token": "jwt_token_here"
  }
}
```

#### GET `/api/auth/me`

ดูข้อมูลโปรไฟล์ผู้ใช้ปัจจุบัน

**Headers:**

```
Authorization: Bearer <jwt_token>
```

### Shifts Management

#### POST `/api/shifts`

สร้างเวรใหม่ (เฉพาะหัวหน้าพยาบาล)

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Request Body:**

```json
{
  "date": "2024-01-15",
  "start_time": "08:00",
  "end_time": "16:00",
  "shift_type": "morning",
  "required_nurses": 2,
  "department": "Emergency"
}
```

#### GET `/api/shifts`

ดูรายการเวรทั้งหมด (พร้อม filters)

**Query Parameters:**

- `date`: วันที่เฉพาะ
- `shift_type`: ประเภทเวร (morning, afternoon, night)
- `department`: แผนก
- `start_date` & `end_date`: ช่วงวันที่

#### PUT `/api/shifts/:id`

อัปเดตข้อมูลเวร (เฉพาะหัวหน้าพยาบาล)

#### DELETE `/api/shifts/:id`

ลบเวร (เฉพาะหัวหน้าพยาบาล)

### Shift Assignments

#### POST `/api/shift-assignments`

จัดเวรให้พยาบาล (เฉพาะหัวหน้าพยาบาล)

**Request Body:**

```json
{
  "user_id": "nurse_uuid",
  "shift_id": "shift_uuid",
  "notes": "Emergency coverage needed"
}
```

#### GET `/api/shift-assignments`

ดูรายการการจัดเวรทั้งหมด

**Query Parameters:**

- `user_id`: ID ของพยาบาล
- `shift_id`: ID ของเวร
- `status`: สถานะ (assigned, completed, on_leave)

### Personal Schedule

#### GET `/api/my-schedule`

พยาบาลดูเวรของตัวเอง

**Query Parameters:**

- `start_date` & `end_date`: ช่วงวันที่
- `status`: สถานะเวร

**Response:**

```json
{
  "success": true,
  "data": {
    "schedule": [...],
    "groupedSchedule": {...},
    "summary": {
      "totalShifts": 20,
      "completedShifts": 15,
      "upcomingShifts": 5,
      "onLeaveShifts": 0
    }
  }
}
```

#### GET `/api/my-schedule/today`

ดูเวรของวันนี้

#### GET `/api/my-schedule/week`

ดูเวรของสัปดาห์นี้

#### GET `/api/my-schedule/month`

ดูเวรของเดือนนี้

### Leave Requests

#### POST `/api/leave-requests`

พยาบาลขอลา

**Request Body:**

```json
{
  "shift_assignment_id": "assignment_uuid",
  "reason": "Personal emergency"
}
```

#### GET `/api/leave-requests`

หัวหน้าพยาบาลดูคำขอลาทั้งหมด

#### GET `/api/leave-requests/my`

พยาบาลดูคำขอลาของตัวเอง

#### PATCH `/api/leave-requests/:id/approve`

หัวหน้าพยาบาลอนุมัติ/ปฏิเสธคำขอลา

**Request Body:**

```json
{
  "status": "approved",
  "admin_notes": "Approved due to emergency"
}
```

## 🔒 Authentication & Authorization

### JWT Token

- Token มีอายุ 24 ชั่วโมง
- ต้องส่งใน header: `Authorization: Bearer <token>`

### Role-based Access Control

- **nurse**: เข้าถึงข้อมูลของตัวเอง, ขอลา, ดูเวร
- **head_nurse**: เข้าถึงทุกฟีเจอร์, จัดการผู้ใช้, จัดเวร, อนุมัติลา

### Middleware

- `authenticateToken`: ตรวจสอบ JWT token
- `requireRole`: ตรวจสอบสิทธิ์ตาม role

## 📊 Response Format

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {...}
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description"
}
```

### HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `500`: Internal Server Error

## 🧪 Testing

### Swagger UI Testing

- **Interactive API Testing**: `http://localhost:5000/api-docs`
- **Real-time Documentation**: ทดสอบ API ได้โดยตรงผ่าน web interface
- **Authentication Support**: รองรับ JWT token testing
- **Schema Validation**: ตรวจสอบ request/response format

### Manual Testing

ใช้ Postman หรือ curl เพื่อทดสอบ API endpoints

### Example curl commands

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hospital.com","password":"password123"}'

# Create shift (with token)
curl -X POST http://localhost:5000/api/shifts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"date":"2024-01-15","start_time":"08:00","end_time":"16:00","shift_type":"morning"}'
```

## 🚀 Deployment

### Environment Variables

- `NODE_ENV`: production/development
- `PORT`: server port
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT

### Production Considerations

- ใช้ environment variables สำหรับ sensitive data
- เปิดใช้งาน SSL/TLS
- ตั้งค่า CORS ให้เหมาะสม
- ใช้ PM2 หรือ similar process manager

## 📝 API Documentation

### Swagger/OpenAPI

ระบบมี Swagger/OpenAPI documentation ที่ครบถ้วน:

- **Swagger UI**: `http://localhost:5000/api-docs`
- **Interactive Documentation**: ทดสอบ API ได้โดยตรง
- **ภาษาไทย**: คำอธิบายและตัวอย่างข้อมูลภาษาไทย
- **Authentication**: รองรับ JWT Bearer Token
- **Schema Definitions**: ข้อมูลโครงสร้างที่ชัดเจน

ดูรายละเอียดเพิ่มเติมใน [SWAGGER_README.md](./SWAGGER_README.md)

### Postman Collection

สร้าง Postman collection สำหรับทดสอบ API endpoints ทั้งหมด

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

หากมีปัญหาหรือคำถาม กรุณาสร้าง issue ใน repository หรือติดต่อทีมพัฒนา

---

**Note**: ระบบนี้พัฒนาสำหรับการใช้งานจริง ควรมีการทดสอบอย่างละเอียดก่อนใช้งานใน production environment
