const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const cors = require('cors'); // เพิ่ม CORS
const app = express();

const PORT =  8080;


// ตรวจสอบการเชื่อมต่อ
const db = mysql.createConnection(process.env.DATABASE_URL);

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

// Route สำหรับการ Login
app.post('/login', (req, res) => {
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
        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (!isPasswordMatch) {
            return res.status(401).send('Invalid username or password');
        }

        res.send('Login successful');
    });
});

    
// เริ่มต้นเซิร์ฟเวอร์
app.listen(process.env.PORT || PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
