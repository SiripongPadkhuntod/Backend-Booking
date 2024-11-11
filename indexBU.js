// index.js

/*
// ติดตั้ง package ที่จำเป็นด้วยคำสั่ง
command 
npm install express mysql bcrypt
npm install nodemon --save-dev


npm start // รันด้วย node 
npm run dev  // รันด้วย nodemon (auto reload)

*/ 


const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const app = express();
const PORT = 3000;

// เชื่อมต่อกับ MySQL Database
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'test2',
    port: 3306
});


// ตรวจสอบการเชื่อมต่อ
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to MySQL database.');
    }
});

// Middleware สำหรับอ่าน JSON จาก body request
app.use(express.json());

// Route พื้นฐาน
app.get('/', (req, res) => {
    res.send('Hello, Express!');
});


// Route สำหรับการ Register
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    // ตรวจสอบว่า username และ password ถูกส่งมาหรือไม่
    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }

    try {
        // เข้ารหัสรหัสผ่านก่อนบันทึกลงฐานข้อมูล
        const hashedPassword = await bcrypt.hash(password, 10);

        // บันทึกข้อมูลผู้ใช้ลงในฐานข้อมูล
        const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
        db.query(query, [username, hashedPassword], (err, result) => {
            if (err) {
                console.error('Error inserting user:', err);
                return res.status(500).send('Error saving user');
            }
            res.send('User registered successfully');
        });
    } catch (error) {
        console.error('Error hashing password:', error);
        res.status(500).send('Error processing registration');
    }
});


// Route สำหรับการ Login และเมื่อ Login สำเร็จจะส่งข้อความ 'Login successful' + ส่งข้อมูลผู้ใช้กลับไป
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // ตรวจสอบว่า username และ password ถูกส่งมาหรือไม่
    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }

    // ค้นหาข้อมูลผู้ใช้จากฐานข้อมูล
    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], async (err, results) => {
        if (err) {
            console.error('Error querying user:', err);
            return res.status(500).send('Error querying user');
        }

        // ตรวจสอบว่ามีผู้ใช้หรือไม่
        if (results.length === 0) {
            return res.status(401).send('Invalid username or password');
        }

        // ตรวจสอบรหัสผ่าน
        const user = results[0];
        try {
            if (await bcrypt.compare(password, user.password)) {
                // ส่งข้อมูลผู้ใช้กลับไปเฉพราะ username และ id
                res.send({
                    id: user.id,
                    username: user.username
                });
            } else {
                res.status(401).send('Invalid username or password');
            }
        } catch (error) {
            console.error('Error checking password:', error);
            res.status(500).send('Error processing login');
        }
    });
});

// Route สำหรับการดึงข้อมูลผู้ใช้ทั้งหมด
app.get('/users', (req, res) => {
    const query = 'SELECT id, username FROM users';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error querying users:', err);
            return res.status(500).send('Error querying users');
        }
        res.send(results);
    });
});

// Route สำหรับการดึงข้อมูลผู้ใช้จาก id
app.get('/users/:id', (req, res) => {
    const query = 'SELECT id, username FROM users WHERE username = ?';
    db.query(query, [req.params.id], (err, results) => {
        if (err) {
            console.error('Error querying user:', err);
            return res.status(500).send('Error querying user');
        }

        if (results.length === 0) {
            return res.status(404).send('User not found');
        }

        res.send(results[0]);
    });
});

// Route สำหรับการอัปเดตข้อมูลผู้ใช้
app.put('/users/edit/:id', (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).send('Username is required');
    }

    const query = 'UPDATE users SET username = ? WHERE id = ?';
    db.query(query, [username, req.params.id], (err, result) => {
        if (err) {
            console.error('Error updating user:', err);
            return res.status(500).send('Error updating user');
        }

        res.send('User updated successfully');
    });
});


// Route สำหรับการจองโต๊ะ
app.post('/reservations', (req, res) => {
    const { user_id, table_id, reservation_date, duration } = req.body;

    // ตรวจสอบว่ามีข้อมูลที่จำเป็นหรือไม่
    if (!user_id || !table_id || !reservation_date || !duration) {
        return res.status(400).send('User ID, Table ID, Reservation Date, and Duration are required');
    }

    // ตรวจสอบสถานะโต๊ะ
    const checkTableQuery = 'SELECT * FROM tables WHERE table_id = ? AND status = "available"';
    db.query(checkTableQuery, [table_id], (err, results) => {
        if (err) {
            console.error('Error checking table status:', err);
            return res.status(500).send('Error checking table status');
        }

        if (results.length === 0) {
            return res.status(400).send('Table is not available');
        }

        // สร้างการจอง
        const insertReservationQuery = 'INSERT INTO reservations (user_id, table_id, reservation_date, duration) VALUES (?, ?, ?, ?)';
        db.query(insertReservationQuery, [user_id, table_id, reservation_date, duration], (err, result) => {
            if (err) {
                console.error('Error inserting reservation:', err);
                return res.status(500).send('Error making reservation');
            }

            // อัปเดตสถานะโต๊ะเป็น 'reserved'
            const updateTableQuery = 'UPDATE tables SET status = "reserved" WHERE table_id = ?';
            db.query(updateTableQuery, [table_id], (err) => {
                if (err) {
                    console.error('Error updating table status:', err);
                    return res.status(500).send('Error updating table status');
                }
                res.send('Table reserved successfully');
            });
        });
    });
});

// Route สำหรับการยกเลิกการจอง
app.delete('/reservations/:id', (req, res) => {
    const reservationId = req.params.id;

    // ตรวจสอบว่ามีการจองหรือไม่
    const query = 'SELECT * FROM reservations WHERE reservation_id = ?';
    db.query(query, [reservationId], (err, results) => {
        if (err) {
            console.error('Error querying reservation:', err);
            return res.status(500).send('Error querying reservation');
        }

        if (results.length === 0) {
            return res.status(404).send('Reservation not found');
        }

        // ยกเลิกการจอง
        const deleteReservationQuery = 'DELETE FROM reservations WHERE reservation_id = ?';
        db.query(deleteReservationQuery, [reservationId], (err) => {
            if (err) {
                console.error('Error deleting reservation:', err);
                return res.status(500).send('Error deleting reservation');
            }

            // อัปเดตสถานะโต๊ะเป็น 'available'
            const tableId = results[0].table_id;
            const updateTableQuery = 'UPDATE tables SET status = "available" WHERE table_id = ?';
            db.query(updateTableQuery, [tableId], (err) => {
                if (err) {
                    console.error('Error updating table status:', err);
                    return res.status(500).send('Error updating table status');
                }
                res.send('Reservation cancelled successfully');
            });
        });
    });
});

// Route สำหรับการดึงข้อมูลการจองทั้งหมด
app.get('/reservations', (req, res) => {
    const query = `
        SELECT r.reservation_id, r.user_id, r.table_id, r.reservation_date, r.duration, r.status, u.username 
        FROM reservations r
        JOIN users u ON r.user_id = u.user_id`;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error querying reservations:', err);
            return res.status(500).send('Error querying reservations');
        }
        res.send(results);
    });
});

// Route สำหรับการดึงข้อมูลการจองโดย ID
app.get('/reservations/:id', (req, res) => {
    const query = 'SELECT * FROM reservations WHERE reservation_id = ?';
    db.query(query, [req.params.id], (err, results) => {
        if (err) {
            console.error('Error querying reservation:', err);
            return res.status(500).send('Error querying reservation');
        }

        if (results.length === 0) {
            return res.status(404).send('Reservation not found');
        }

        res.send(results[0]);
    });
});

// Route สำหรับการดูประวัติการจองของผู้ใช้
app.get('/users/:id/reservations', (req, res) => {
    const userId = req.params.id;

    const query = `
        SELECT r.reservation_id, r.table_id, r.reservation_date, r.duration, r.status 
        FROM reservations r 
        WHERE r.user_id = ?`;
    
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error querying reservations:', err);
            return res.status(500).send('Error querying reservations');
        }

        if (results.length === 0) {
            return res.status(404).send('No reservations found for this user');
        }

        res.send(results);
    });
});




// เริ่มต้นเซิร์ฟเวอร์
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
