/**
 * Email Sending Utility
 * 
 * Provides email sending functionality using Nodemailer.
 * Configured via environment variables for SMTP settings.
 * 
 * @module utils/sendEmail
 */
import nodemailer from "nodemailer";

/**
 * Send an email using a configured SMTP transporter.
 * 
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - HTML content of the email
 * @returns {Promise<void>} Resolves when email is sent
 * @throws {Error} If email sending fails
 */
export const sendEmail = async (options) => {
  
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  
  await transporter.sendMail(mailOptions);
};