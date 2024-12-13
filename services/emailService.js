const { sendConfirmationEmail } = require('../config/email');

class EmailService {
    static async sendReservationConfirmation(user, reservationDetails) {
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <body>
            <h1>Reservation Confirmation</h1>
            <p>Dear ${user.first_name} ${user.last_name},</p>
            <p>Your reservation details:</p>
            <ul>
                <li>Date: ${reservationDetails.date}</li>
                <li>Time: ${reservationDetails.startTime} - ${reservationDetails.endTime}</li>
                <li>Table: ${reservationDetails.tableNumber}</li>
                <li>Room: ${reservationDetails.roomId}</li>
            </ul>
        </body>
        </html>
        `;

        try {
            await sendConfirmationEmail(
                user.email, 
                'Reservation Confirmation', 
                htmlContent
            );
        } catch (error) {
            console.error('Failed to send confirmation email:', error);
            throw error;
        }
    }
}

module.exports = EmailService;