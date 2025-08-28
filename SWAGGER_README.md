# 📚 Swagger/OpenAPI Documentation

## 🎯 ภาพรวม

ระบบจัดการเวรพยาบาลมี Swagger/OpenAPI documentation ที่ครบถ้วนสำหรับทุก API endpoints พร้อมตัวอย่างการใช้งานและคำอธิบายภาษาไทย

## 🚀 การเข้าถึง

### Development

```
http://localhost:5000/api-docs
```

### Production

```
https://your-domain.com/api-docs
```

## 📋 API Endpoints ที่มี Documentation

### 🔐 Authentication

- `POST /api/auth/register` - สมัครผู้ใช้ใหม่
- `POST /api/auth/login` - เข้าสู่ระบบ
- `GET /api/auth/me` - ดูโปรไฟล์ตัวเอง
- `GET /api/auth/users` - ดูผู้ใช้ทั้งหมด

### 👥 Users

- การจัดการผู้ใช้ในระบบ

### 📅 Shifts

- `POST /api/shifts` - สร้างเวรใหม่
- `GET /api/shifts` - ดูรายการเวรทั้งหมด
- `PUT /api/shifts/:id` - อัปเดตเวร
- `DELETE /api/shifts/:id` - ลบเวร

### 🔄 Shift Assignments

- `POST /api/shift-assignments` - จัดเวรให้พยาบาล
- `GET /api/shift-assignments` - ดูการจัดเวรทั้งหมด
- `PUT /api/shift-assignments/:id` - อัปเดตสถานะการจัดเวร
- `DELETE /api/shift-assignments/:id` - ลบการจัดเวร

### 📋 My Schedule

- `GET /api/my-schedule` - ดูเวรของตัวเอง
- `GET /api/my-schedule/today` - ดูเวรวันนี้
- `GET /api/my-schedule/week` - ดูเวรสัปดาห์นี้
- `GET /api/my-schedule/month` - ดูเวรเดือนนี้

### 📤 Leave Requests

- `POST /api/leave-requests` - ขออนุมัติลา
- `GET /api/leave-requests` - ดูคำขอลาทั้งหมด
- `GET /api/leave-requests/my` - ดูคำขอลาของตัวเอง
- `PATCH /api/leave-requests/:id/approve` - อนุมัติ/ปฏิเสธคำขอลา

### 🖥️ System

- `GET /api/health` - Health Check

## 🔑 Authentication

### JWT Bearer Token

```bash
Authorization: Bearer <your_jwt_token>
```

### วิธีการรับ Token

1. เรียกใช้ `POST /api/auth/login`
2. รับ JWT token จาก response
3. ใช้ token ใน header ของ request อื่นๆ

## 📖 การใช้งาน Swagger UI

### 1. เปิด Swagger UI

```
http://localhost:5000/api-docs
```

### 2. Authorize

- คลิกปุ่ม "Authorize" ด้านบน
- ใส่ JWT token ในรูปแบบ: `Bearer <token>`
- คลิก "Authorize"

### 3. ทดสอบ API

- เลือก endpoint ที่ต้องการทดสอบ
- คลิก "Try it out"
- กรอกข้อมูลที่จำเป็น
- คลิก "Execute"

### 4. ดู Response

- Response จะแสดงในส่วน "Responses"
- มีตัวอย่างข้อมูลและ error codes

## 🧪 การทดสอบ

### ข้อมูลตัวอย่าง

```json
{
  "email": "jane@hospital.com",
  "password": "password123"
}
```

### ตัวอย่าง Request

```bash
curl -X POST "http://localhost:5000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@hospital.com",
    "password": "password123"
  }'
```

## 🔧 การตั้งค่า

### 1. ติดตั้ง Dependencies

```bash
npm install swagger-jsdoc swagger-ui-express
```

### 2. Import ใน server.js

```javascript
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./config/swagger");
```

### 3. ใช้ Middleware

```javascript
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
```

## 📝 การเพิ่ม Documentation

### 1. เพิ่ม Schema

```javascript
/**
 * @swagger
 * components:
 *   schemas:
 *     YourSchema:
 *       type: object
 *       properties:
 *         field:
 *           type: string
 *           description: คำอธิบาย
 */
```

### 2. เพิ่ม Endpoint

```javascript
/**
 * @swagger
 * /api/your-endpoint:
 *   get:
 *     summary: คำอธิบายสั้น
 *     description: คำอธิบายละเอียด
 *     tags: [Your Tag]
 *     responses:
 *       200:
 *         description: สำเร็จ
 */
```

### 3. Tags

- `Authentication` - การยืนยันตัวตน
- `Users` - การจัดการผู้ใช้
- `Shifts` - การจัดการเวร
- `Shift Assignments` - การจัดเวร
- `My Schedule` - เวรของตัวเอง
- `Leave Requests` - การขอลา
- `System` - ระบบ

## 🌟 ฟีเจอร์พิเศษ

### 1. ภาษาไทย

- คำอธิบายและข้อความทั้งหมดเป็นภาษาไทย
- รองรับการใช้งานในประเทศไทย

### 2. ตัวอย่างข้อมูล

- มีตัวอย่างข้อมูลที่ใช้งานได้จริง
- ครอบคลุมทุก endpoint

### 3. Error Handling

- แสดง error codes ทั้งหมด
- คำอธิบายข้อผิดพลาดที่ชัดเจน

### 4. Security

- รองรับ JWT Bearer Token
- แสดงสิทธิ์การเข้าถึงแต่ละ endpoint

## 🚨 หมายเหตุสำคัญ

### 1. Development vs Production

- Development: `http://localhost:5000`
- Production: เปลี่ยน URL ใน swagger config

### 2. Security

- ไม่เปิด Swagger UI ใน production environment
- ใช้ environment variables สำหรับ sensitive data

### 3. Performance

- Swagger UI โหลดเฉพาะเมื่อจำเป็น
- ไม่กระทบต่อ performance ของ API

## 📞 การสนับสนุน

หากมีปัญหาหรือคำถามเกี่ยวกับ Swagger documentation:

1. ตรวจสอบ console logs
2. ตรวจสอบ network requests
3. ตรวจสอบ JWT token
4. ติดต่อทีมพัฒนา

## 🔄 การอัปเดต

### 1. Schema Changes

- อัปเดต swagger config
- รีสตาร์ทเซิร์ฟเวอร์

### 2. New Endpoints

- เพิ่ม JSDoc comments
- อัปเดต tags และ descriptions

### 3. Version Control

- เก็บ version history
- ใช้ semantic versioning

---

**หมายเหตุ**: Swagger documentation นี้พัฒนาขึ้นเพื่อให้ทีมพัฒนาและผู้ใช้งานสามารถเข้าใจและทดสอบ API ได้อย่างง่ายดาย
