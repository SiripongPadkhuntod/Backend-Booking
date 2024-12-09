const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const cors = require('cors'); // เพิ่ม CORS
const app = express();
require('dotenv').config();

const jwt = require('jsonwebtoken');
const multer = require('multer');
const Path2D = require('path');
const fs = require('fs');

const nodemailer = require('nodemailer');



const PORT = 3000;

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


// ตรวจสอบการเชื่อมต่อ

// const db = mysql.createConnection(process.env.DATABASE_URL);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = 'uploads/';
        fs.mkdirSync(uploadPath, { recursive: true }); // สร้างโฟลเดอร์ถ้ายังไม่มี
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const ext = Path2D.extname(file.originalname);
        cb(null, Date.now() + ext);
    }
});

const upload = multer({ storage: storage });




app.use(cors()); // เปิดใช้งาน CORS
app.use(express.json());



// const db = mysql.createConnection(process.env.DATABASE_URL2);
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


// Route พื้นฐาน
app.get('/', (req, res) => {
    res.send('Hello, Express! API Server is running by Stop');
});

app.post('/upload', upload.single('file'), (req, res) => {
    if (res.headersSent) return; // ป้องกันการส่ง response ซ้ำ
    if (req.file && req.body.email) {
        const img = req.file.filename;
        const email = req.body.email;

        const query = 'UPDATE users SET photo = ? WHERE email = ?';
        db.query(query, [img, email], (err, result) => {
            if (err) {
                if (!res.headersSent) {
                    return res.status(500).json({ message: 'Error updating user: ' + err });
                }
            }

            if (!res.headersSent) {
                res.status(200).send({
                    status: 200,
                    data: 'Update complete',
                    user: email
                });
            }
        });
    } else {
        if (!res.headersSent) {
            res.status(400).json({ message: 'No file or email provided' });
        }
    }
});




//Route Register 
app.post('/register', async (req, res) => {
    const { email, password, username, studenID, firstname, lastname } = req.body;
    if (!email || !password) {
        return res.status(400).send('All fields are required');
    }

    if (!email.endsWith('@rsu.ac.th')) {
        return res.status(400).send('Please use an RSU email');
    }

    const checkEmailQuery = 'SELECT * FROM users WHERE email = ?';
    db.query(checkEmailQuery, [email], async (err, results) => {
        if (err) {
            return res.status(500).send({
                status: 500,
                message: 'Error checking email' + err
            });
        }

        if (results.length > 0) {
            return res.status(400).send({
                status: 400,
                message: 'Email already registered'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const insertQuery = 'INSERT INTO users (email, password, username, student_id, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)';
        db.query(insertQuery, [email, hashedPassword, username, studenID, firstname, lastname], (err, result) => {
            if (err) {
                return res.status(500).send({
                    status: 500,
                    message: 'Error registering user' + err
                });
            }

            res.send({
                status: 200,
                data: "User registered successfully"
            });
        });
    });
});


//Route Edit UserData 
app.put('/editprofile', (req, res) => {
    const { email, first_name, last_name, phonenumber, student_id, department } = req.body; // แก้ stdent_id เป็น student_id
    if (!email || !first_name || !last_name || !phonenumber || !student_id || !department) {
        return res.status(400).send('All fields are required');
    }

    const query = 'UPDATE users SET first_name = ?, last_name = ?, phonenumber = ?, student_id = ?, department = ? WHERE email = ?';
    db.query(query, [first_name, last_name, phonenumber, student_id, department, email], (err, result) => {
        if (err) {
            return res.status(500).send('Error updating user' + err);
        }

        res.status(200).send({
            status: 200,
            data: "Update complete",
            user: email
        });
    });
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


// Route สำหรับการดึงข้อมูลผู้ใช้จาก email
app.get('/users/email/:email', (req, res) => {
    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [req.params.email], (err, results) => {
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



// Route สำหรับการจองโต๊ะ

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





// Middleware สำหรับตรวจสอบ JWT
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // ดึง token จาก header
    if (!token) {
        return res.status(403).send('Token is required');
    }

    // ตรวจสอบ token ว่าถูกต้องหรือไม่
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send('Invalid or expired token');
        }
        req.user = decoded; // เพิ่มข้อมูล decoded ลงใน request
        next();
    });

    return next();
};

// Route สำหรับตรวจสอบ token
app.post('/verifyToken', verifyToken, (req, res) => {
    res.json({ status: "ok", user: req.user });
});


// Route สำหรับการล็อกอินด้วย Google
app.post('/api/auth/google', async (req, res) => {
    const { token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        console.log(payload);
        const email = payload.email;


        if (email.endsWith('@rsu.ac.th')) {
            const query = 'SELECT * FROM users WHERE email = ?';
            db.query(query, [email], (err, results) => {
                if (err) {
                    return res.status(500).json({ message: 'Error checking user', error: err.message });
                }

                if (results.length === 0) {
                    let img = "https://i.pinimg.com/736x/b9/c4/7e/b9c47ef70bff06613d397abfce02c6e7.jpg"
                    const username = email.split('@')[0].replace('.', '');
                    const insertQuery = 'INSERT INTO users (email, username, first_name, last_name, photo) VALUES (?, ?, ?, ?, ?)';
                    db.query(insertQuery, [email, username, payload.given_name, payload.family_name, img], (err, result) => {
                        if (err) {
                            return res.status(500).json({ message: 'Error saving user', error: err.message });
                        }
                        res.status(200).json({ message: 'User created and login successful' });
                    });
                } else {
                    const user = results[0];
                    const token = jwt.sign(
                        { user_id: user.user_id, email: user.email, role: user.role },
                        process.env.JWT_SECRET,
                        { expiresIn: '1h' }
                    );
                    res.status(200).json({
                        status: 200,
                        user_id: user.user_id,
                        email: user.email,
                        role: user.role,
                        token,
                        message: 'Login successful'
                    });


                }
            });
        } else {
            res.status(403).json({
                status: 403,
                message: 'Invalid email domain'
            });
        }
    } catch (error) {
        res.status(401).json({ message: 'Invalid token', error: error.message });
    }
});

// Route สำหรับการ Login ด้วย email
app.post('/login/email', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).send({
            status: 400,
            message: 'All fields are required'
        });
    }

    const emailDomain = email.split('@')[1];
    if (emailDomain !== 'rsu.ac.th') {
        return res.status(403).send({
            status: 403,
            message: 'Invalid email domain. Please use an RSU email.'
        });
    }

    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], async (err, results) => {
        if (err) {
            return res.status(500).send('Error querying user' + err);
        }

        if (results.length === 0) {
            return res.status(401).send({
                status: 401,
                message: 'Invalid email or password'
            });
        }

        const user = results[0];
        try {
            if (await bcrypt.compare(password, user.password)) {
                const token = jwt.sign(
                    { user_id: user.user_id, email: user.email, role: user.role },
                    process.env.JWT_SECRET,
                    { expiresIn: '1h' }
                );

                res.send({
                    user_id: user.user_id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    firstname: user.firstname,
                    lastname: user.lastname,
                    token,
                });
            } else {
                res.status(401).send({
                    status: 401,
                    message: 'Invalid email or password'
                });
            }
        } catch (error) {
            res.status(500).send({
                status: 500,
                message: 'Error processing login' + error
            });
        }
    });
});

//route สำหรับการดูการจองทั้งหมด
app.get('/reservations/all', (req, res) => {
    const query = `SELECT * FROM reservations 
                    JOIN tables ON reservations.table_id = tables.table_id
                    JOIN users ON reservations.user_id = users.user_id
                    WHERE reservations.reservation_date >= CURDATE();
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error querying reservations:', err);
            return res.status(500).send('Error querying reservations');
        }

        if (results.length === 0) {
            return res.status(404).send('No reservations found');
        }

        res.send(results);
    });
});

//route สำหรับการดึงข้อมูลการจองจาก เดือน
app.get('/reservations/:month', (req, res) => {
    const { month } = req.params;
    const query = `SELECT * FROM reservations 
                    JOIN tables ON reservations.table_id = tables.table_id
                    JOIN users ON reservations.user_id = users.user_id
                    WHERE DATE_FORMAT(reservations.reservation_date, '%Y-%m') = ?
    `;
    db.query(query, [month], (err, results) => {
        if (err) {
            console.error('Error querying reservations:', err);
            return res.status(500).send('Error querying reservations');
        }

        if (results.length === 0) {
            return res.status(404).send('No reservations found');
        }

        res.send(results);
    });
});

//route สำหรับการดึงข้อมูลการจองจาก วัน
app.get('/reservations/day/:day', (req, res) => {
    const { day } = req.params;
    const query = `SELECT table_number,reservation_time_from,reservation_time_to,first_name,last_name,reservation_date FROM reservations 
                    JOIN tables ON reservations.table_id = tables.table_id
                    JOIN users ON reservations.user_id = users.user_id
                    WHERE DATE(reservations.reservation_date) = ?
    `;
    db.query(query, [day], (err, results) => {
        if (err) {
            console.error('Error querying reservations:', err);
            return res.status(500).send('Error querying reservations');
        }

        if (results.length === 0) {
            return res.status(200).send({
                status: 404,
                data: "No reservations found"
            });
        }

        res.send(results);
    });
});

// กำหนดข้อมูลการตั้งค่าอีเมล (SMTP server)
const transporter = nodemailer.createTransport({
    service: 'gmail',  // ใช้บริการ Gmail หรือสามารถใช้บริการอื่นได้
    auth: {
        user: 'bookingwebapp.64@gmail.com',  // อีเมลของคุณ
        pass: 'ycle pnsn ntxk aspl'    // รหัสผ่านของอีเมล
    }
});


app.post('/reservations', (req, res) => {
    try {
        const { user_id, table_id, reservation_date, starttime, endtime, roomid } = req.body;

        if (!user_id || !table_id || !reservation_date || !starttime || !endtime || !roomid) {
            return res.status(400).send('All fields are required');
        }

        const checkTableQuery = 'SELECT * FROM tables WHERE table_id = ?';
        db.query(checkTableQuery, [table_id], (err, results) => {
            if (err) {
                return res.status(500).send({ message: 'Error checking table', error: err });
            }

            if (results.length === 0) {
                return res.status(404).send('Table not found');
            }

            const insertQuery = 'INSERT INTO reservations (user_id, table_id, reservation_date, reservation_time_from, reservation_time_to, room_id) VALUES (?, ?, ?, ?, ?, ?)';
            db.query(insertQuery, [user_id, table_id, reservation_date, starttime, endtime, roomid], (err, result) => {
                if (err) {
                    return res.status(500).send('Error making reservation' + err);
                }

                // ฟังก์ชันการส่งอีเมล
                let showmail = null
                const emailQuery = 'SELECT email FROM users WHERE user_id = ?'; // สมมุติว่ามีตาราง users เก็บข้อมูลอีเมลของผู้ใช้
                db.query(emailQuery, [user_id], (err, userResult) => {
                    if (err || userResult.length === 0) {
                        return res.status(500).send('Error fetching user email');
                    }

                    const userEmail = userResult[0].email;
                    showmail = userEmail
                    console.log('Sending email to:', userEmail);

                    const mailOptions = {
                        from: 'BookingWebApp.64@gmail.com',  // อีเมลของคุณ
                        to: userEmail,  // อีเมลของผู้ใช้
                        subject: 'Reservation Confirmation',
                        html: `
                        <html>
                        <head>
                            <style>
                                body {
                                    font-family: Arial, sans-serif;
                                    background-color: #f7f7f7;
                                    color: #333;
                                    margin: 0;
                                    padding: 0;
                                }
                                .container {
                                    width: 100%;
                                    max-width: 600px;
                                    margin: 20px auto;
                                    background-color: #fff;
                                    border-radius: 8px;
                                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                                    padding: 20px;
                                }
                                h1 {
                                    color: #d32f2f;
                                    font-size: 24px;
                                    text-align: center;
                                }
                                p {
                                    font-size: 16px;
                                    line-height: 1.5;
                                }
                                .details {
                                    margin-top: 20px;
                                    background-color: #f5f5f5;
                                    border-left: 4px solid #80ff00;
                                    padding: 15px;
                                }
                                .details p {
                                    margin: 5px 0;
                                }
                                .footer {
                                    text-align: center;
                                    font-size: 14px;
                                    margin-top: 20px;
                                    color: #777;
                                }
                                .footer a {
                                    color: #d32f2f;
                                    text-decoration: none;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h1>Reservation Confirmation</h1>
                                <p>Dear User,</p>
                                <p>Thank you for your reservation. Please find the details below:</p>
                                
                                <div class="details">
                                    <p><strong>Table ID:</strong> ${table_id}</p>
                                    <p><strong>Reservation Date:</strong> ${reservation_date}</p>
                                    <p><strong>Time:</strong> ${starttime} to ${endtime}</p>
                                    <p><strong>Room:</strong> ${roomid}</p>
                                </div>
                                
                                <p>If you have any inquiries, please contact us at <strong>bookingwebapp.64@gmail.com</strong>.</p>
                                <p>Thank you for choosing our service!</p>
                    
                                <div class="footer">
                                    <p>&copy; 2024 Booking Web App. All rights reserved.</p>
                                </div>
                            </div>
                        </body>
                        </html>
                        `
                    };
                    
                    

                    transporter.sendMail(mailOptions, (err, info) => {
                        if (err) {
                            console.log('Error sending email:', err);
                            return res.status(500).send('Error sending confirmation email');
                        }
                        console.log('Email sent: ' + info.response);
                    });
                });

                res.send({
                    status: 200,
                    data: "Reservation successful",
                });
            });
        });
    } catch (error) {
        res.status(500).send({
            status: 500,
            message: 'Error making reservation' + error
        });
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
    const query = 'SELECT * FROM availability';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error querying availability:', err);
            return res.status(500).send('Error querying availability');
        }
        res.send(results);
    });
});










// Middleware สำหรับจัดการข้อผิดพลาดทั่วไป
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!' + err.message);
});



app.use(cors({
    origin: '*', // หรือระบุโดเมนที่อนุญาต
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));



// เริ่มต้นเซิร์ฟเวอร์
app.listen(process.env.PORT || PORT, () => {
    console.log(`Server is running `);
});
