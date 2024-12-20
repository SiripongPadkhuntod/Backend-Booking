const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const cors = require('cors'); // เพิ่ม CORS
const app = express();
require('dotenv').config();
const jwt = require('jsonwebtoken');


const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const { type } = require('os');
const { console } = require('inspector');
const PORT = 3000;


const corsOptions = {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const transporter = nodemailer.createTransport({
    service: 'gmail',  // ใช้บริการ Gmail หรือสามารถใช้บริการอื่นได้
    auth: {
        user: process.env.EMAIL_USER, // อีเมลของผู้ส่ง
        pass: process.env.EMAIL_PASSWORD // รหัสผ่านอีเมลของผู้ส่ง
    }
});

// ตรวจสอบการเชื่อมต่อ
// const db = mysql.createConnection(process.env.DATABASE_URL2);
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to MySQL database.');
    }
});

app.use(express.json());





// Route พื้นฐาน
app.get('/', (req, res) => {
    res.send('Hello, Express! API Server is running by Stop');
});

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(403).json({ status: 403, message: 'Token is required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(403).json({ status: 403, message: 'Token is required' });
    }

    // ตรวจสอบความถูกต้องของ token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ status: 401, message: 'Invalid or expired token' });
        }

        // เพิ่มข้อมูล user ใน request เพื่อใช้งานใน Route อื่น
        req.user = decoded;
        next();
    });
};

// Route สำหรับตรวจสอบ token
app.post('/verifyToken', verifyToken, (req, res) => {
    res.status(200).json({ status: 200, message: 'Token is valid', user: req.user });
});

app.post('/register', async (req, res) => {
    const { email, password, username, studentID, firstname, lastname } = req.body;

    // Validate input fields
    if (!email || !password || !username || !studentID || !firstname || !lastname) {
        return res.status(400).json({ status: 400, message: 'All fields are required' });
    }

    // Validate email domain
    if (!email.endsWith('@rsu.ac.th')) {
        return res.status(400).json({ status: 400, message: 'Please use an RSU email' });
    }

    try {
        // Check if email already exists
        const checkEmailQuery = 'SELECT * FROM users WHERE email = ?';
        const results = await executeQuery(checkEmailQuery, [email]);

        if (results.length > 0) {
            return res.status(400).json({ status: 400, message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user into database
        const insertQuery = `
            INSERT INTO users (email, password, username, student_id, first_name, last_name)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        await executeQuery(insertQuery, [email, hashedPassword, username, studentID, firstname, lastname]);

        // Success response
        res.status(200).json({ status: 200, message: 'User registered successfully' });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ status: 500, message: 'Error registering user', error: error.message });
    }
});

app.put('/editprofile', async (req, res) => {
    const { email, first_name, last_name, phonenumber, student_id, department } = req.body;

    // Validate input fields
    if (!email || !first_name || !last_name || !phonenumber || !student_id || !department) {
        return res.status(400).json({ status: 400, message: 'All fields are required' });
    }

    try {
        // Check if email or phone number already exists in the database
        const emailCheckQuery = 'SELECT * FROM users WHERE email = ?';
        const phoneCheckQuery = 'SELECT * FROM users WHERE phonenumber = ?';

        const emailCheckResult = await executeQuery(emailCheckQuery, [email]);
        const phoneCheckResult = await executeQuery(phoneCheckQuery, [phonenumber]);

        // If email is already in use by another user (excluding the current user)
        if (emailCheckResult.length > 0 && emailCheckResult[0].email !== email) {
            return res.status(400).json({ status: 400, message: 'Email is already in use' });
        }

        // If phone number is already in use by another user (excluding the current user)
        if (phoneCheckResult.length > 0 && phoneCheckResult[0].phonenumber !== phonenumber) {
            return res.status(400).json({ status: 400, message: 'Phone number is already in use' });
        }

        // Update user information in the database
        const query = `
            UPDATE users
            SET first_name = ?, last_name = ?, phonenumber = ?, student_id = ?, department = ?
            WHERE email = ?
        `;
        const result = await executeQuery(query, [first_name, last_name, phonenumber, student_id, department, email]);

        // If no rows were affected, it means user was not found
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 404, message: 'User not found' });
        }

        //add to log
        const logquery = 'INSERT INTO logs (user_id , action , description) VALUES (?, ?,?)';
        let description = 'User update profile for ' + email;

        const userdata = await executeQuery('SELECT * FROM users WHERE email = ?', [email]);
        const user = userdata[0];
        db.query(logquery, [user.user_id, 'update profile', description], (err) => {
            if (err) {
                return res.status(500).send('Error updating user' + err);
            }

            res.send({
                status: 200,
                data: "Update complete",
                user: email
            });
        });

        // Success response
        // res.status(200).json({
        //     status: 200,
        //     message: 'Update complete',
        //     user: email,
        // });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ status: 500, message: 'Error updating user', error: error.message });
    }
});

app.get('/users', async (req, res) => {
    try {
        let query = 'SELECT * FROM users'; // ดึงข้อมูลทั้งหมดจากฐานข้อมูล

        // ถ้ามีการส่ง id ใน request ให้ค้นหาผู้ใช้จาก id
        if (req.query.id) {
            query = 'SELECT * FROM users WHERE user_id = ?'; // ค้นหาผู้ใช้ตาม user_id
            const user = await executeQuery(query, [req.query.id]);

            if (user.length === 0) {
                return res.status(404).json({
                    status: 404,
                    message: 'User not found',
                });
            }

            // ลบฟิลด์ password จากผลลัพธ์ก่อนส่งกลับ
            const { password, ...userData } = user[0];

            // ส่งข้อมูลผู้ใช้คนนั้น
            return res.status(200).json({
                status: 200,
                data: userData,
            });
        }

        // หากไม่มีการส่ง id ให้ดึงข้อมูลทั้งหมด
        const users = await executeQuery(query);

        // ลบฟิลด์ password จากทุกผู้ใช้
        const usersWithoutPassword = users.map(user => {
            const { password, ...userData } = user;
            return userData;
        });

        // ส่งข้อมูลผู้ใช้ทั้งหมด
        res.status(200).json({
            status: 200,
            data: usersWithoutPassword,
        });
    } catch (err) {
        console.error('Error querying users:', err);
        res.status(500).json({
            status: 500,
            message: 'Error querying users',
            error: err.message,
        });
    }
});

// Route สำหรับการยกเลิกการจอง
app.put('/reservations/cancel', (req, res) => {
    const { reservation_id , userid } = req.body;
    if (!reservation_id) {
        return res.status(400).send('Reservation ID is required');
    }

    const query = 'UPDATE reservations SET status = "cancelled" WHERE reservation_id = ?';
    db.query(query, [reservation_id], (err) => {
        if (err) {
            return res.status(500).send('Error cancelling reservation' + err);
        }

        //add to log
        const logquery = 'INSERT INTO logs (user_id , action , description,reservation_id) VALUES (?, ?,?,?)';
        let description = 'User cancel reservation for ' + reservation_id;
        db.query(logquery, [userid, 'cancel reservation', description ,reservation_id ], (err) => {
            if (err) {
                return res.status(500).send('Error updating user' + err);
            }

            res.send({
                status: 200,
                data: "Reservation cancelled",
                reservation_id: reservation_id
            });
        });

        // res.send({
        //     status: 200,
        //     data: "Reservation cancelled",
        //     reservation_id: reservation_id
        // });
    });
});

app.post('/api/auth/google', async (req, res) => {
    const { token } = req.body;

    try {
        // Verify Google ID Token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const email = payload.email;

        // Validate email domain
        if (!email.endsWith('@rsu.ac.th')) {
            return res.status(403).json({ status: 403, message: 'Invalid email domain' });
        }

        // Check if user exists
        const query = 'SELECT * FROM users WHERE email = ?';
        const results = await executeQuery(query, [email]);

        if (results.length === 0) {
            // Create new user if not found
            const img = payload.picture;
            const username = email.split('@')[0].replace('.', '');
            const insertQuery = `
                INSERT INTO users (email, username, first_name, last_name, photo)
                VALUES (?, ?, ?, ?, ?)
            `;
            await executeQuery(insertQuery, [email, username, payload.given_name, payload.family_name, img]);

            //add to log
            const userdata = await executeQuery('SELECT * FROM users WHERE email = ?', [email]);
            const user = userdata[0];
            const logquery = 'INSERT INTO logs (user_id , action , description) VALUES (?, ?,?)';
            let description = 'User created by google for ' + email;
            db.query(logquery, [user.user_id, 'create user', description], (err) => {
                if (err) {
                    return res.status(500).send('Error updating user' + err);
                }

                // res.send({
                //     status: 200,
                //     data: "User created successfully",
                //     user: email
                // });
            });

            // return res.status(200).json({ message: 'User created and login successful' });
        }

        // Generate JWT token for existing user
        const user = results[0];
        const jwtToken = jwt.sign(
            { user_id: user.user_id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            status: 200,
            user_id: user.user_id,
            email: user.email,
            role: user.role,
            token: jwtToken,
            message: 'Login successful',
        });
    } catch (error) {
        console.error('Error during Google login:', error);
        res.status(401).json({ status: 401, message: 'Invalid token', error: error.message });
    }
});

// Route สำหรับการ setpassword
app.put('/setpassword', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).send('All fields are required');
    }

    if (!email.endsWith('@rsu.ac.th')) {
        return res.status(400).send('Please use an RSU email');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'UPDATE users SET password = ? WHERE email = ?';
    db.query(query, [hashedPassword, email], async (err) => {
        if (err) {
            return res.status(500).send('Error updating password' + err);
        }

        const userdata = await executeQuery('SELECT * FROM users WHERE email = ?', [email]);
        const user = userdata[0];

        //add to log
        const logquery = 'INSERT INTO logs (user_id , action , description) VALUES (?, ?,?)';
        let description = 'User set password for ' + email;
        db.query(logquery, [user.user_id, 'set password',description], (err) => {
            if (err) {
                return res.status(500).send('Error updating password' + err);
            }

            res.send({
                status: 200,
                data: "Password updated successfully"
            });
        });

    });
});

app.post('/login', async (req, res) => {
    const { email, username, password } = req.body;

    // Validate input
    if ((!email && !username) || !password) {
        return res.status(400).json({ status: 400, message: 'Email or username and password are required' });
    }

    try {
        let user;
        if (email) {
            // Login by email
            user = await loginUser(email, password, 'email');
        } else if (username) {
            // Login by username
            user = await loginUser(username, password, 'username');
        } else {
            return res.status(400).json({ status: 400, message: 'Email or username is required' });
        }

        // Send response with JWT token
        res.status(200).json({
            status: 200,
            user_id: user.user.user_id,
            username: user.user.username,
            email: user.user.email,
            role: user.user.role,
            firstname: user.user.first_name,
            lastname: user.user.last_name,
            token: user.token,
        });
    } catch (error) {
        console.error('Error processing login:', error);
        res.status(error.status || 500).json({ status: error.status || 500, message: error.message });
    }
});

app.get('/reservations', async (req, res) => {
    const { month, day } = req.query;
    let query = `
        SELECT * FROM reservations 
        JOIN tables ON reservations.table_id = tables.table_id
        JOIN users ON reservations.user_id = users.user_id
        WHERE reservations.status = "active"
    `;
    const params = [];

    if (month) {
        query += ` AND DATE_FORMAT(reservations.reservation_date, '%Y-%m') = ?`;
        params.push(month);
    }
    if (day) {
        query += ` AND DATE(reservations.reservation_date) = ?`;
        params.push(day);
    }

    try {
        const results = await executeQuery(query, params);
        if (results.length === 0) {
            return res.status(200).send({
                status: 404,
                message: 'No reservations found',
            });
        }
        res.status(200).send({
            status: 200,
            data: results,
        });
    } catch (err) {
        console.error('Error querying reservations:', err);
        res.status(200).send({
            status: 500,
            message: 'Error querying reservations' + err
        });
    }
});

app.post('/reservations', async (req, res) => {
    try {
        const { user_id, table_id, reservation_date, starttime, endtime, note, roomid } = req.body;

        // Validate input
        if (!user_id || !table_id || !reservation_date || !starttime || !endtime || !roomid) {
            return res.status(400).json({ status: 400, message: 'All fields are required' });
        }

        // Check if table exists
        const table = await executeQuery('SELECT * FROM tables WHERE table_id = ?', [table_id]);
        if (table.length === 0) {
            return res.status(404).json({ status: 404, message: 'Table not found' });
        }

        // Check for conflicting reservations
        const conflictQuery = `
            SELECT * FROM reservations 
            WHERE table_id = ? 
            AND reservation_date = ? 
            AND (
                (reservation_time_from < ? AND reservation_time_to > ?) OR
                (reservation_time_from < ? AND reservation_time_to > ?) OR
                (reservation_time_from >= ? AND reservation_time_to <= ?)
            )
            AND status = 'active'
        `;
        const conflicts = await executeQuery(conflictQuery, [
            table_id, reservation_date, starttime, starttime, endtime, endtime, starttime, endtime
        ]);

        if (conflicts.length > 0) {
            return res.status(409).json({
                status: 409,
                message: 'This time slot is already booked for the selected table',
                data: conflicts,
            });
        }

        // Insert reservation
        const insertQuery = `
            INSERT INTO reservations (user_id, table_id, reservation_date, reservation_time_from, reservation_time_to, room_id, note)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        await executeQuery(insertQuery, [user_id, table_id, reservation_date, starttime, endtime, roomid, note]);

        // Fetch user email
        const user = await executeQuery('SELECT * FROM users WHERE user_id = ?', [user_id]);
        if (user.length === 0) {
            return res.status(404).json({ status: 404, message: 'User not found' });
        }
        const userEmail = user[0].email;
        const userfullname = `${user[0].first_name} ${user[0].last_name}`;

        // Send confirmation email
        const formattedDateEng = new Date(reservation_date).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
        await sendConfirmationEmail(userEmail, userfullname, table_id, formattedDateEng, starttime, endtime, roomid);

        // Success response
        res.status(200).json({ status: 200, message: 'Reservation successful' });
    } catch (error) {
        console.error('Error making reservation:', error);
        res.status(500).json({ status: 500, message: 'Error making reservation', error });
    }
});

//route สำหรับการดึงข้อมูลโต๊ะ 
app.get('/tables', (req, res) => {
    const query = 'SELECT * FROM tables';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error querying tables:', err);
            return res.status(500).send('Error querying tables');
        }
        res.send({
            status: 200,
            data: results
        });
    });
});

//route SELECT * FROM `availability` 
app.get('/availability', (req, res) => {
    const query = 'SELECT * FROM availability WHERE start_date >= NOW()'; // กรองเฉพาะ start_date ตั้งแต่ปัจจุบัน
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error querying availability:', err);
            return res.status(200).send({
                status: 500,
                message: 'Error querying availability'
            });
        }
        if (results.length === 0) {
            return res.status(200).send({
                status: 404,
                message: 'No availability found'
            });
        }
        res.send({
            status: 200,
            data: results
        });
    });
});

<<<<<<< HEAD



=======
>>>>>>> 2e420206414fde6984d7b4153785c52b619d444d
//route getall role
app.get('/role', (req, res) => {
    const query = 'SELECT * FROM role';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error querying role:', err);
            return res.status(200).send({
                status: 500,
                message: 'Error querying role'
            });
        }
        res.send(results);
    });
});

//route setrole 
app.put('/user/setrole', (req, res) => {
    const { user_id, role } = req.body;

    // ตรวจสอบว่า role ที่ส่งมาเป็น 'admin' หรือ 'user'
    if (!user_id || !role) {
        return res.status(400).send('All fields are required');
    }

    const query = 'UPDATE users SET role = ? WHERE user_id = ?';
    db.query(query, [role, user_id], (err) => {
        if (err) {
            return res.status(500).send('Error updating role' + err);
        }

        res.status(200).send({
            status: 200,
            data: "Update complete",
            user: user_id
        });
    });
});

app.get('/get/roles', (req, res) => {
    const query = "SHOW COLUMNS FROM users LIKE 'role'";
    db.query(query, (err, result) => {
        if (err) {
            return res.status(500).send('Error fetching ENUM values' + err);
        }

        // ดึงค่า ENUM จากผลลัพธ์
        const enumValues = result[0].Type.match(/\(([^)]+)\)/)[1].split(',');

        res.status(200).send({
            status: 200,
            roles: enumValues
        });
    });
});

app.get('/user/role', (req, res) => {
    const query = 'SELECT role,first_name,last_name,user_id FROM users';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error querying users:', err);
            return res.status(200).send({
                status: 500,
                message: 'Error querying users'
            });
        }
        res.status(200).send({
            status: 200,
            results: results
        });
    });
});

// Route สำหรับการตรวจสอบว่ามี password หรือยัง
app.get('/checkpassword', async (req, res) => {
    const { email } = req.query;

    // ตรวจสอบว่า email ถูกส่งมาหรือไม่
    if (!email) {
        return res.status(400).json({ status: 400, message: 'Email is required' });
    }

    try {
        // Query เพื่อตรวจสอบว่า password มีหรือไม่
        const query = 'SELECT password FROM users WHERE email = ?';
        const results = await executeQuery(query, [email]);

        // ตรวจสอบว่า user พบหรือไม่
        if (results.length === 0) {
            return res.status(404).json({ status: 404, message: 'User not found' });
        }

        // ส่งผลลัพธ์ว่า password มีหรือไม่
        res.status(200).json({
            status: 200,
            data: results[0].password ? true : false,
        });
    } catch (error) {
        console.error('Error checking password:', error);
        res.status(500).json({ status: 500, message: 'Error checking password', error: error.message });
    }
});

// Middleware สำหรับจัดการข้อผิดพลาดทั่วไป
app.use((err, req, res) => {
    console.error(err.stack);
    res.status(500).send('Something broke!' + err.message);
});

// เริ่มต้นเซิร์ฟเวอร์
app.listen(process.env.PORT || PORT, () => {
    console.log(`Server is running `);
});


async function sendConfirmationEmail(email, fullname, tableId, date, startTime, endTime, roomId) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Reservation Confirmation - Booking Web App',
        html: `
            <<!DOCTYPE html>
                            <html lang="en">
                            <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <title>Reservation Confirmation</title>
                                <style>
                                    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');
                                    
                                    body {
                                        font-family: 'Roboto', Arial, sans-serif;
                                        background-color: #f4f4f4;
                                        margin: 0;
                                        padding: 0;
                                        line-height: 1.6;
                                        color: #333;
                                    }
                                    .email-container {
                                        max-width: 600px;
                                        margin: 20px auto;
                                        background-color: #ffffff;
                                        border-radius: 12px;
                                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                                        overflow: hidden;
                                    }
                                    .email-header {
                                        background-color: #2c3e50;
                                        color: white;
                                        text-align: center;
                                        padding: 20px;
                                    }
                                    .email-header h1 {
                                        margin: 0;
                                        font-size: 24px;
                                        font-weight: 300;
                                        letter-spacing: 1px;
                                    }
                                    .email-body {
                                        padding: 30px;
                                    }
                                    .reservation-details {
                                        background-color: #ecf0f1;
                                        border-left: 5px solid #3498db;
                                        padding: 20px;
                                        margin: 20px 0;
                                        border-radius: 4px;
                                    }
                                    .reservation-details p {
                                        margin: 10px 0;
                                        font-size: 16px;
                                    }
                                    .email-footer {
                                        background-color: #34495e;
                                        color: white;
                                        text-align: center;
                                        padding: 15px;
                                        font-size: 12px;
                                    }
                                    .contact-info {
                                        color: #3498db;
                                        font-weight: bold;
                                    }
                                </style>
                            </head>
                            <body>
                                <div class="email-container">
                                    <div class="email-header">
                                        <h1>Reservation Confirmation</h1>
                                    </div>
                                    
                                    <div class="email-body">
                                        <p>Dear ${fullname} Customer,</p>
                                        
                                        <p>We are pleased to confirm your reservation details:</p>
                                        
                                        <div class="reservation-details">
                                            <p><strong>Table ID:</strong> ${tableId}</p>
                                            <p><strong>Reservation Date:</strong> ${date}</p>
                                            <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
                                            <p><strong>Room:</strong> ${roomId}</p>
                                        </div>
                                        
                                        <p>If you have any questions or need to modify your reservation, please contact us at 
                                            <span class="contact-info">bookingwebapp.64@gmail.com</span>.
                                        </p>
                                        
                                        <p>Thank you for choosing our service. We look forward to serving you!</p>
                                    </div>
                                    
                                    <div class="email-footer">
                                        © 2024 Booking Web App. All Rights Reserved.
                                    </div>
                                </div>
                            </body>
                            </html>
        `,
    };

    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) return reject(err);
            console.log('Email sent:', info.response);
            resolve(info);
        });
    });
}

async function loginUser(identifier, password, identifierType) {
    const query = identifierType === 'email' ? 'SELECT * FROM users WHERE email = ?' : 'SELECT * FROM users WHERE username = ?';
    const results = await executeQuery(query, [identifier]);

    if (results.length === 0) {
        throw { status: 401, message: `Invalid ${identifierType} or password` };
    }

    const user = results[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw { status: 401, message: `Invalid ${identifierType} or password` };
    }

    // Generate JWT token
    const token = jwt.sign(
        { user_id: user.user_id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    return { user, token };
}

function executeQuery(query, params) {
    return new Promise((resolve, reject) => {
        db.query(query, params, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
}