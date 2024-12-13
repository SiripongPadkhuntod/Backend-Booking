const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

module.exports = {
    sendConfirmationEmail: async (to, subject, htmlContent) => {
        try {
            const info = await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: to,
                subject: subject,
                html: htmlContent
            });
            console.log('Email sent:', info.response);
            return info;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }
};