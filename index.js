const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const cors = require('cors'); // เพิ่ม CORS
const app = express();
require('dotenv').config();

const PORT =  8080;

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


// ตรวจสอบการเชื่อมต่อ

// const db = mysql.createConnection(process.env.DATABASE_URL);

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bookingweb',
    port: 3306
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to MySQL database.');
    }
});


// Middleware สำหรับอ่าน JSON จาก body request
app.use(cors()); // เปิดใช้งาน CORS
app.use(express.json());

// Route พื้นฐาน
app.get('/', (req, res) => {
    res.send('Hello, Express!');
});

// Route สำหรับการ Register
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
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

// Route สำหรับการ Login ด้วย username และ password
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Username and password are required');
    }

    const query = 'SELECT * FROM users WHERE username = ?';
    db.query(query, [username], async (err, results) => {
        if (err) {
            console.error('Error querying user:', err);
            return res.status(500).send('Error querying user');
        }

        if (results.length === 0) {
            return res.status(401).send('Invalid username or password');
        }

        const user = results[0];
        try {
            if (await bcrypt.compare(password, user.password)) {
                res.send({
                    user_id: user.user_id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    firstname : user.firstname,
                    lastname : user.lastname,
                    phone : user.phone,
                    student_id : user.student_id,
                });
            } else {
                // res.status(401).send('Invalid username or password');
                //ส่งข้อความว่า username หรือ password ไม่ถูกต้อง
                res.status(401).send('Invalid username or password');
            }
        } catch (error) {
            console.error('Error checking password:', error);
            res.status(500).send('Error processing login');
        }
    });
});

// Route สำหรับการ Login ด้วย email
app.post('/login/email', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('Email and password are required');
    }

    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], async (err, results) => {
        if (err) {
            console.error('Error querying user:', err);
            return res.status(500).send('Error querying user');
        }

        if (results.length === 0) {
            return res.status(401).send('Invalid email or password');
        }

        const user = results[0];
        try {
            if (await bcrypt.compare(password, user.password)) {
                res.send({
                    user_id: user.user_id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    firstname : user.firstname,
                    lastname : user.lastname,
                    phone : user.phone,
                    student_id : user.student_id,
                });
            } else {
                res.status(401).send('Invalid email or password');
            }
        } catch (error) {
            console.error('Error checking password:', error);
            res.status(500).send('Error processing login');
        }
    });
});



app.post('/api/login', (req, res) => {
    const { email } = req.body;
  
    // ตรวจสอบว่าอีเมลมาจากโดเมน @rsu.ac.th
    if (email.endsWith('@rsu.ac.th')) {
      // ส่ง response ที่บอกว่าผู้ใช้สามารถล็อกอินได้
      res.json({ success: true });
    } else {
      // ถ้าไม่ใช่โดเมนที่อนุญาต
      res.json({ success: false, message: 'Only @rsu.ac.th emails are allowed.' });
    }
  });




// Route สำหรับการดึงข้อมูลผู้ใช้ทั้งหมด
app.get('/users', (req, res) => {
    const query = 'SELECT user_id, username FROM users';
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
    const query = 'SELECT user_id, username FROM users WHERE user_id = ?';
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

    const query = 'UPDATE users SET username = ? WHERE user_id = ?';
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

    if (!user_id || !table_id || !reservation_date || !duration) {
        return res.status(400).send('User ID, Table ID, Reservation Date, and Duration are required');
    }

    const checkTableQuery = 'SELECT * FROM tables WHERE table_id = ? AND status = "available"';
    db.query(checkTableQuery, [table_id], (err, results) => {
        if (err) {
            console.error('Error checking table status:', err);
            return res.status(500).send('Error checking table status');
        }

        if (results.length === 0) {
            return res.status(400).send('Table is not available');
        }

        const insertReservationQuery = 'INSERT INTO reservations (user_id, table_id, reservation_date, duration) VALUES (?, ?, ?, ?)';
        db.query(insertReservationQuery, [user_id, table_id, reservation_date, duration], (err, result) => {
            if (err) {
                console.error('Error inserting reservation:', err);
                return res.status(500).send('Error making reservation');
            }

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

    const query = 'SELECT * FROM reservations WHERE reservation_id = ?';
    db.query(query, [reservationId], (err, results) => {
        if (err) {
            console.error('Error querying reservation:', err);
            return res.status(500).send('Error querying reservation');
        }

        if (results.length === 0) {
            return res.status(404).send('Reservation not found');
        }

        const deleteReservationQuery = 'DELETE FROM reservations WHERE reservation_id = ?';
        db.query(deleteReservationQuery, [reservationId], (err) => {
            if (err) {
                console.error('Error deleting reservation:', err);
                return res.status(500).send('Error deleting reservation');
            }

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

app.get('/tables', (req, res) => {
    const query = 'SELECT * FROM tables';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error querying tables:', err);
            res.status(500).json({ 
                message: 'Error querying tables',
                error: err.message 
            });
            return;
        }

        if (!results || results.length === 0) {
            res.status(404).json({ 
                message: 'No tables found'
            });
            return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.json(results);
    });
});




// Route สำหรับการล็อกอินด้วย Google
app.post('/api/auth/google', async (req, res) => {
    const { token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        console.log('Ticket:', ticket);
        const payload = ticket.getPayload();
        console.log(payload);  // เพิ่มการพิมพ์ข้อมูล payload เพื่อตรวจสอบว่ามีข้อมูลที่ถูกต้อง
        const email = payload.email;

        if (email.endsWith('@rsu.ac.th')) {
            // เช็คว่าอีเมลนี้มีอยู่ในฐานข้อมูลหรือไม่
            const query = 'SELECT * FROM users WHERE email = ?';
            db.query(query, [email], (err, results) => {
                if (err) {
                    console.error('Error querying user:', err);
                    return res.status(500).json({ message: 'Error checking user', error: err.message });
                }

                if (results.length === 0) {
                    // ถ้าไม่พบผู้ใช้ในฐานข้อมูล ให้เพิ่มข้อมูลผู้ใช้ใหม่
                    const username = payload.name || email.split('@')[0]; // ใช้ชื่อจริงหรือส่วนของอีเมลก่อนเครื่องหมาย @ เป็น username
                    const insertQuery = 'INSERT INTO users (email, username, first_name, last_name) VALUES (?, ?, ?, ?)';
                    db.query(insertQuery, [email, username, payload.given_name, payload.family_name], (err, result) => {
                        if (err) {
                            console.error('Error inserting user:', err);
                            return res.status(500).json({ message: 'Error saving user', error: err.message });
                        }
                        res.status(200).json({ message: 'User created and login successful' });
                    });
                } else {
                    // ถ้ามีผู้ใช้ในฐานข้อมูลแล้ว ให้ล็อกอิน
                    res.status(200).json({ message: 'Login successful' });
                }
            });
        } else {
            res.status(403).json({ message: 'Invalid email domain' });
        }
    } catch (error) {
        console.error('Error verifying token:', error);
        res.status(401).json({ message: 'Invalid token', error: error.message });
    }
});

  


// Middleware สำหรับจัดการข้อผิดพลาดทั่วไป
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// CORS and COOP/COEP settings
app.use(cors({
    origin: 'http://localhost:5173', // URL ของ frontend
    methods: 'GET,POST',
    allowedHeaders: 'Content-Type,Authorization'
}));

// ตั้งค่า COOP และ COEP
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});

    
// เริ่มต้นเซิร์ฟเวอร์
app.listen(process.env.PORT || PORT, () => {
    console.log(`Server is running `);
});
