# Backend Booking System

ระบบจองห้องประชุมออนไลน์ (Backend API)

## รายละเอียดโครงการ

Backend API สำหรับระบบจองห้องประชุมออนไลน์ พัฒนาด้วย Node.js และ Express.js โดยใช้ MongoDB เป็นฐานข้อมูล ระบบรองรับการจัดการการจองห้องประชุม, การจัดการผู้ใช้ และการจัดการข้อมูลห้องประชุม

## เทคโนโลยีที่ใช้

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT (JSON Web Tokens)
- Bcrypt
- Cors
- Dotenv

## การติดตั้ง

1. Clone repository:
```bash
git clone https://github.com/SiripongPadkhuntod/Backend-Booking.git
```

2. เข้าไปยังโฟลเดอร์โครงการ:
```bash
cd Backend-Booking
```

3. ติดตั้ง dependencies:
```bash
npm install
```

4. สร้างไฟล์ .env และกำหนดค่าต่างๆ:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/booking_db
JWT_SECRET=your_jwt_secret_key
```

5. รันโปรแกรม:
```bash
# สำหรับ development
npm run dev

# สำหรับ production
npm start
```

## โครงสร้างโปรเจค

```
Backend-Booking/
├── src/
│   ├── config/       # การตั้งค่าต่างๆ
│   ├── controllers/  # Business logic
│   ├── middleware/   # Middleware functions
│   ├── models/       # Database models
│   ├── routes/       # API routes
│   └── utils/        # Utility functions
├── .env             # Environment variables
└── server.js        # Entry point
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - ลงทะเบียนผู้ใช้ใหม่
- `POST /api/auth/login` - เข้าสู่ระบบ

### Users
- `GET /api/users` - ดึงข้อมูลผู้ใช้ทั้งหมด
- `GET /api/users/:id` - ดึงข้อมูลผู้ใช้ตาม ID
- `PUT /api/users/:id` - อัพเดทข้อมูลผู้ใช้
- `DELETE /api/users/:id` - ลบผู้ใช้

### Rooms
- `GET /api/rooms` - ดึงข้อมูลห้องทั้งหมด
- `POST /api/rooms` - เพิ่มห้องใหม่
- `PUT /api/rooms/:id` - อัพเดทข้อมูลห้อง
- `DELETE /api/rooms/:id` - ลบห้อง

### Bookings
- `GET /api/bookings` - ดึงข้อมูลการจองทั้งหมด
- `POST /api/bookings` - สร้างการจองใหม่
- `PUT /api/bookings/:id` - อัพเดทข้อมูลการจอง
- `DELETE /api/bookings/:id` - ยกเลิกการจอง

## การตั้งค่าฐานข้อมูล

1. ติดตั้ง MongoDB บนเครื่อง
2. สร้างฐานข้อมูลชื่อ 'booking_db'
3. กำหนดค่า MONGODB_URI ในไฟล์ .env

## การรักษาความปลอดภัย

- ใช้ JWT สำหรับการยืนยันตัวตน
- เข้ารหัสรหัสผ่านด้วย Bcrypt
- ตรวจสอบสิทธิ์ผ่าน Middleware
- ป้องกัน CORS attacks

## การทดสอบ

```bash
# รันการทดสอบ
npm test

# รันการทดสอบพร้อมดู coverage
npm run test:coverage
```

## การ Deploy

1. เตรียม Production Environment
2. ตั้งค่า Environment Variables
3. Build โปรเจค
4. รัน Production Server

## การพัฒนาเพิ่มเติม

1. Fork repository
2. สร้าง feature branch
3. Commit changes
4. Push to branch
5. สร้าง Pull Request

## ข้อกำหนดในการพัฒนา

- ใช้ ESLint ตรวจสอบ code style
- เขียน Unit Tests สำหรับ features ใหม่
- ทำ Documentation สำหรับ API endpoints ใหม่
- ทดสอบ API ก่อน merge

## ผู้พัฒนา

- Thyme

## License

MIT License
