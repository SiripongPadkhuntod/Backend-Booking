const db = require('../config/database');
const EmailService = require('./emailService');

class ReservationService {
    static async createReservation(reservationData) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // ตรวจสอบความขัดแย้งของการจอง
            const [conflicts] = await connection.query(
                `SELECT * FROM reservations 
                WHERE table_id = ? 
                AND reservation_date = ? 
                AND (
                    (reservation_time_from < ? AND reservation_time_to > ?) OR
                    (reservation_time_from < ? AND reservation_time_to > ?) OR
                    (reservation_time_from >= ? AND reservation_time_to <= ?)
                )`,
                [
                    reservationData.table_id, 
                    reservationData.reservation_date, 
                    reservationData.starttime, reservationData.starttime,
                    reservationData.endtime, reservationData.endtime,
                    reservationData.starttime, reservationData.endtime
                ]
            );

            if (conflicts.length > 0) {
                throw new Error('Time slot already booked');
            }

            // สร้างการจอง
            const [result] = await connection.query(
                'INSERT INTO reservations (user_id, table_id, reservation_date, reservation_time_from, reservation_time_to, room_id) VALUES (?, ?, ?, ?, ?, ?)', 
                [
                    reservationData.user_id, 
                    reservationData.table_id, 
                    reservationData.reservation_date, 
                    reservationData.starttime, 
                    reservationData.endtime, 
                    reservationData.roomid
                ]
            );

            // ดึงข้อมูลผู้ใช้
            const [users] = await connection.query(
                'SELECT * FROM users WHERE user_id = ?', 
                [reservationData.user_id]
            );

            await connection.commit();

            // ส่งอีเมลยืนยัน
            await EmailService.sendReservationConfirmation(users[0], {
                date: reservationData.reservation_date,
                startTime: reservationData.starttime,
                endTime: reservationData.endtime,
                tableNumber: reservationData.table_id,
                roomId: reservationData.roomid
            });

            return {
                status: 200,
                message: 'Reservation successful',
                reservationId: result.insertId
            };

        } catch (error) {
            await connection.rollback();
            console.error('Reservation error:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async cancelReservation(reservationId, userId) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // ตรวจสอบการจองก่อน
            const [reservations] = await connection.query(
                'SELECT * FROM reservations WHERE reservation_id = ? AND user_id = ?', 
                [reservationId, userId]
            );

            if (reservations.length === 0) {
                throw new Error('Reservation not found');
            }

            // ลบการจอง
            await connection.query(
                'DELETE FROM reservations WHERE reservation_id = ?', 
                [reservationId]
            );

            // อัปเดตสถานะโต๊ะ
            await connection.query(
                'UPDATE tables SET status = "available" WHERE table_id = ?', 
                [reservations[0].table_id]
            );

            await connection.commit();

            return {
                status: 200,
                message: 'Reservation cancelled successfully'
            };

        } catch (error) {
            await connection.rollback();
            console.error('Cancel reservation error:', error);
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = ReservationService;