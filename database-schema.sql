-- PostgreSQL Schema for Nurse Scheduling System
-- ระบบจัดการเวรพยาบาล

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table - ตารางผู้ใช้
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'nurse' CHECK (role IN ('nurse', 'head_nurse')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Shifts Table - ตารางเวรการทำงาน
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    shift_type VARCHAR(20) NOT NULL CHECK (shift_type IN ('morning', 'afternoon', 'night')),
    required_nurses INTEGER DEFAULT 1 CHECK (required_nurses > 0),
    department VARCHAR(100) DEFAULT 'General',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Shift Assignments Table - ตารางการจัดเวรให้พยาบาล
CREATE TABLE shift_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'completed', 'on_leave')),
    assigned_by UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Prevent duplicate assignments
    UNIQUE(user_id, shift_id)
);

-- 4. Leave Requests Table - ตารางคำขอลา
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_assignment_id UUID NOT NULL REFERENCES shift_assignments(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    request_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance - ดัชนีเพื่อประสิทธิภาพที่ดีขึ้น
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_shifts_date ON shifts(date);
CREATE INDEX idx_shifts_type ON shifts(shift_type);
CREATE INDEX idx_shifts_department ON shifts(department);
CREATE INDEX idx_shifts_created_by ON shifts(created_by);
CREATE INDEX idx_shift_assignments_user_id ON shift_assignments(user_id);
CREATE INDEX idx_shift_assignments_shift_id ON shift_assignments(shift_id);
CREATE INDEX idx_shift_assignments_status ON shift_assignments(status);
CREATE INDEX idx_shift_assignments_assigned_by ON shift_assignments(assigned_by);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_requested_by ON leave_requests(requested_by);
CREATE INDEX idx_leave_requests_shift_assignment ON leave_requests(shift_assignment_id);
CREATE INDEX idx_leave_requests_approved_by ON leave_requests(approved_by);

-- Composite indexes for common queries
CREATE INDEX idx_shifts_date_type ON shifts(date, shift_type);
CREATE INDEX idx_assignments_user_date ON shift_assignments(user_id, shift_id);
CREATE INDEX idx_leave_requests_status_date ON leave_requests(status, request_date);

-- Triggers for updated_at timestamps - ตัวกระตุ้นสำหรับอัปเดต timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at 
    BEFORE UPDATE ON shifts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_assignments_updated_at 
    BEFORE UPDATE ON shift_assignments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at 
    BEFORE UPDATE ON leave_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies - นโยบายความปลอดภัยระดับแถว
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Users can read their own data - ผู้ใช้สามารถอ่านข้อมูลของตัวเอง
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id::text);

-- Head nurses can view all users - หัวหน้าพยาบาลสามารถดูผู้ใช้ทั้งหมด
CREATE POLICY "Head nurses can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid() AND role = 'head_nurse'
        )
    );

-- Users can update their own profile - ผู้ใช้สามารถอัปเดตโปรไฟล์ของตัวเอง
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id::text);

-- Head nurses can manage all users - หัวหน้าพยาบาลสามารถจัดการผู้ใช้ทั้งหมด
CREATE POLICY "Head nurses can manage all users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid() AND role = 'head_nurse'
        )
    );

-- Shifts policies - นโยบายสำหรับเวร
CREATE POLICY "Everyone can view shifts" ON shifts
    FOR SELECT USING (true);

CREATE POLICY "Head nurses can manage shifts" ON shifts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid() AND role = 'head_nurse'
        )
    );

-- Shift assignments policies - นโยบายสำหรับการจัดเวร
CREATE POLICY "Users can view own assignments" ON shift_assignments
    FOR SELECT USING (auth.uid() = user_id::text);

CREATE POLICY "Head nurses can view all assignments" ON shift_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid() AND role = 'head_nurse'
        )
    );

CREATE POLICY "Head nurses can manage assignments" ON shift_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid() AND role = 'head_nurse'
        )
    );

-- Leave requests policies - นโยบายสำหรับคำขอลา
CREATE POLICY "Users can view own leave requests" ON leave_requests
    FOR SELECT USING (auth.uid() = requested_by::text);

CREATE POLICY "Head nurses can view all leave requests" ON leave_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid() AND role = 'head_nurse'
        )
    );

CREATE POLICY "Users can create own leave requests" ON leave_requests
    FOR INSERT WITH CHECK (auth.uid() = requested_by::text);

CREATE POLICY "Head nurses can manage leave requests" ON leave_requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid() AND role = 'head_nurse'
        )
    );

-- Insert sample data for testing - ข้อมูลตัวอย่างสำหรับการทดสอบ
INSERT INTO users (name, email, password_hash, role) VALUES
    ('Admin Nurse', 'admin@hospital.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.sm6', 'head_nurse'),
    ('Jane Nurse', 'jane@hospital.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.sm6', 'nurse'),
    ('John Nurse', 'john@hospital.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.sm6', 'nurse'),
    ('Sarah Nurse', 'sarah@hospital.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.sm6', 'nurse'),
    ('Mike Nurse', 'mike@hospital.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.sm6', 'nurse');

-- Sample shifts - เวรตัวอย่าง
INSERT INTO shifts (date, start_time, end_time, shift_type, required_nurses, department, created_by) VALUES
    ('2024-01-15', '08:00:00', '16:00:00', 'morning', 2, 'Emergency', (SELECT id FROM users WHERE email = 'admin@hospital.com')),
    ('2024-01-15', '16:00:00', '00:00:00', 'afternoon', 2, 'Emergency', (SELECT id FROM users WHERE email = 'admin@hospital.com')),
    ('2024-01-15', '00:00:00', '08:00:00', 'night', 1, 'Emergency', (SELECT id FROM users WHERE email = 'admin@hospital.com')),
    ('2024-01-16', '08:00:00', '16:00:00', 'morning', 2, 'General Ward', (SELECT id FROM users WHERE email = 'admin@hospital.com')),
    ('2024-01-16', '16:00:00', '00:00:00', 'afternoon', 2, 'General Ward', (SELECT id FROM users WHERE email = 'admin@hospital.com'));

-- Sample shift assignments - การจัดเวรตัวอย่าง
INSERT INTO shift_assignments (user_id, shift_id, assigned_by, notes) VALUES
    ((SELECT id FROM users WHERE email = 'jane@hospital.com'), 
     (SELECT id FROM shifts WHERE date = '2024-01-15' AND shift_type = 'morning'), 
     (SELECT id FROM users WHERE email = 'admin@hospital.com'), 'Regular assignment'),
    
    ((SELECT id FROM users WHERE email = 'john@hospital.com'), 
     (SELECT id FROM shifts WHERE date = '2024-01-15' AND shift_type = 'morning'), 
     (SELECT id FROM users WHERE email = 'admin@hospital.com'), 'Regular assignment'),
    
    ((SELECT id FROM users WHERE email = 'sarah@hospital.com'), 
     (SELECT id FROM shifts WHERE date = '2024-01-15' AND shift_type = 'afternoon'), 
     (SELECT id FROM users WHERE email = 'admin@hospital.com'), 'Regular assignment'),
    
    ((SELECT id FROM users WHERE email = 'mike@hospital.com'), 
     (SELECT id FROM shifts WHERE date = '2024-01-15' AND shift_type = 'afternoon'), 
     (SELECT id FROM users WHERE email = 'admin@hospital.com'), 'Regular assignment');

-- Sample leave requests - คำขอลาตัวอย่าง
INSERT INTO leave_requests (shift_assignment_id, requested_by, reason) VALUES
    ((SELECT id FROM shift_assignments WHERE user_id = (SELECT id FROM users WHERE email = 'jane@hospital.com') LIMIT 1),
     (SELECT id FROM users WHERE email = 'jane@hospital.com'),
     'Personal emergency');

-- Views for common queries - มุมมองสำหรับคำถามที่ใช้บ่อย
CREATE VIEW nurse_schedule_view AS
SELECT 
    sa.id as assignment_id,
    u.name as nurse_name,
    u.email as nurse_email,
    s.date,
    s.start_time,
    s.end_time,
    s.shift_type,
    s.department,
    sa.status as assignment_status,
    sa.notes as assignment_notes,
    a.name as assigned_by_name,
    sa.created_at as assigned_at
FROM shift_assignments sa
JOIN users u ON sa.user_id = u.id
JOIN shifts s ON sa.shift_id = s.id
JOIN users a ON sa.assigned_by = a.id
WHERE u.role = 'nurse'
ORDER BY s.date, s.start_time, u.name;

CREATE VIEW leave_requests_summary_view AS
SELECT 
    lr.id,
    lr.status,
    lr.reason,
    lr.request_date,
    u.name as requested_by_name,
    s.date as shift_date,
    s.shift_type,
    s.department,
    a.name as approved_by_name,
    lr.approved_at,
    lr.admin_notes
FROM leave_requests lr
JOIN users u ON lr.requested_by = u.id
JOIN shift_assignments sa ON lr.shift_assignment_id = sa.id
JOIN shifts s ON sa.shift_id = s.id
LEFT JOIN users a ON lr.approved_by = a.id
ORDER BY lr.request_date DESC;

-- Functions for common operations - ฟังก์ชันสำหรับการทำงานทั่วไป
CREATE OR REPLACE FUNCTION get_nurse_schedule(
    nurse_id UUID,
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    assignment_id UUID,
    shift_date DATE,
    start_time TIME,
    end_time TIME,
    shift_type VARCHAR(20),
    department VARCHAR(100),
    status VARCHAR(20),
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.id,
        s.date,
        s.start_time,
        s.end_time,
        s.shift_type,
        s.department,
        sa.status,
        sa.notes
    FROM shift_assignments sa
    JOIN shifts s ON sa.shift_id = s.id
    WHERE sa.user_id = nurse_id
    AND s.date BETWEEN start_date AND end_date
    ORDER BY s.date, s.start_time;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_shift_coverage(
    shift_date DATE,
    shift_type VARCHAR(20)
)
RETURNS TABLE (
    shift_id UUID,
    required_nurses INTEGER,
    assigned_nurses INTEGER,
    available_slots INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.required_nurses,
        COUNT(sa.id)::INTEGER as assigned_nurses,
        GREATEST(0, s.required_nurses - COUNT(sa.id))::INTEGER as available_slots
    FROM shifts s
    LEFT JOIN shift_assignments sa ON s.id = sa.shift_id AND sa.status != 'on_leave'
    WHERE s.date = shift_date AND s.shift_type = shift_type
    GROUP BY s.id, s.required_nurses;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation - ความคิดเห็นสำหรับเอกสาร
COMMENT ON TABLE users IS 'ตารางผู้ใช้ระบบ (พยาบาลและหัวหน้าพยาบาล)';
COMMENT ON TABLE shifts IS 'ตารางเวรการทำงาน';
COMMENT ON TABLE shift_assignments IS 'ตารางการจัดเวรให้พยาบาล';
COMMENT ON TABLE leave_requests IS 'ตารางคำขอลา';

COMMENT ON COLUMN users.role IS 'บทบาท: nurse (พยาบาล) หรือ head_nurse (หัวหน้าพยาบาล)';
COMMENT ON COLUMN shifts.shift_type IS 'ประเภทเวร: morning (เช้า), afternoon (บ่าย), night (ดึก)';
COMMENT ON COLUMN shift_assignments.status IS 'สถานะ: assigned (จัดแล้ว), completed (เสร็จแล้ว), on_leave (ลา)';
COMMENT ON COLUMN leave_requests.status IS 'สถานะ: pending (รอ), approved (อนุมัติ), rejected (ปฏิเสธ)';

-- Grant permissions - อนุญาตสิทธิ์
-- Note: In production, you should create specific database users with limited permissions
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

/*
=== ข้อดีของการใช้ Supabase PostgreSQL ===

1. **Built-in Authentication**: ไม่ต้องสร้าง auth system เอง
2. **Real-time**: อัพเดทข้อมูลแบบ real-time
3. **Row Level Security (RLS)**: ความปลอดภัยระดับแถว
4. **Auto-generated API**: REST และ GraphQL API อัตโนมัติ
5. **Dashboard**: จัดการข้อมูลผ่าน web interface
6. **Storage**: สำหรับเก็บไฟล์ (ถ้าต้องการ)

=== การเชื่อมต่อจาก Node.js ===
npm install @supabase/supabase-js
หรือ
npm install pg (สำหรับ direct PostgreSQL connection)

=== การใช้งาน ===
1. รัน SQL script นี้ใน PostgreSQL database
2. ตั้งค่า environment variables
3. รัน Node.js application
4. ทดสอบ API endpoints

=== หมายเหตุ ===
- ข้อมูลตัวอย่างใช้ password hash เดียวกัน (password: 'password123')
- ใน production ควรใช้ password ที่แข็งแกร่งและ unique
- ควรเปิดใช้งาน SSL สำหรับ database connection
- ควรมีการ backup ข้อมูลเป็นประจำ
*/
