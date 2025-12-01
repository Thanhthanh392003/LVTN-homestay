// src/lib/mailer.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false, // STARTTLS (587)
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function sendMail({ to, subject, html, cc, bcc }) {
    const from =
        process.env.SMTP_FROM ||
        `"${process.env.BRAND_NAME || "GreenStay"}" <no-reply@greenstay.vn>`;
    const info = await transporter.sendMail({ from, to, cc, bcc, subject, html });
    console.log("[MAIL] sent:", info.messageId, "to:", to);
    return info;
}

module.exports = { sendMail };
