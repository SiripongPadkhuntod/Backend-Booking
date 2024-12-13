const validator = require('validator');

class ValidationUtil {
    static validateEmail(email) {
        if (!email) {
            throw new Error('Email is required');
        }
        if (!validator.isEmail(email)) {
            throw new Error('Invalid email format');
        }
        if (!email.endsWith('@rsu.ac.th')) {
            throw new Error('Only RSU emails are allowed');
        }
    }

    static validatePassword(password) {
        if (!password) {
            throw new Error('Password is required');
        }
        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters long');
        }
        // เพิ่มเงื่อนไขอื่นๆ เช่น ตัวอักษรพิมพ์ใหญ่ พิมพ์เล็ก ตัวเลข
    }

    static validateReservationData(data) {
        const requiredFields = [
            'user_id', 
            'table_id', 
            'reservation_date', 
            'starttime', 
            'endtime', 
            'roomid'
        ];

        requiredFields.forEach(field => {
            if (!data[field]) {
                throw new Error(`${field} is required`);
            }
        });

        // ตรวจสอบวันที่และเวลา
        if (new Date(data.reservation_date) < new Date()) {
            throw new Error('Reservation date cannot be in the past');
        }

        if (data.starttime >= data.endtime) {
            throw new Error('Start time must be before end time');
        }
    }
}

module.exports = ValidationUtil;