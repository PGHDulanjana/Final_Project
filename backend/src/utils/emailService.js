const nodemailer = require('nodemailer');

// Check if email configuration is available
const isEmailConfigured = () => {
  return !!(process.env.EMAIL_HOST && process.env.EMAIL_PORT && process.env.EMAIL_USER && process.env.EMAIL_PASS);
};

// Create transporter only if email is configured
let transporter = null;

if (isEmailConfigured()) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false // For development, set to true in production
    }
  });

  // Verify connection
  transporter.verify((error, success) => {
    if (error) {
      console.error('Email service configuration error:', error.message);
      console.error('Please check your EMAIL_HOST, EMAIL_PORT, EMAIL_USER, and EMAIL_PASS environment variables');
    } else {
      console.log('Email service is ready');
    }
  });
} else {
  console.warn('Email service is not configured. EMAIL_HOST, EMAIL_PORT, EMAIL_USER, and EMAIL_PASS must be set in environment variables.');
}

const sendEmail = async (to, subject, text, html = null) => {
  try {
    // Check if email is configured
    if (!isEmailConfigured() || !transporter) {
      console.error('Email service is not configured');
      return {
        success: false,
        error: 'Email service is not configured. Please set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, and EMAIL_PASS environment variables.'
      };
    }

    const mailOptions = {
      from: `"XpertKarate" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html: html || text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Email send error:', error.message);
    console.error('Error details:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email'
    };
  }
};

const sendNotificationEmail = async (userEmail, title, message) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">${title}</h2>
      <p style="color: #666; line-height: 1.6;">${message}</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 12px;">This is an automated message from XpertKarate Tournament Management System.</p>
    </div>
  `;

  return await sendEmail(userEmail, title, message, html);
};

const sendRegistrationConfirmation = async (userEmail, tournamentName) => {
  const subject = 'Tournament Registration Confirmation';
  const message = `Your registration for ${tournamentName} has been confirmed.`;
  return await sendNotificationEmail(userEmail, subject, message);
};

const sendMatchScheduleNotification = async (userEmail, matchName, scheduledTime) => {
  const subject = 'Match Schedule Notification';
  const message = `Your match "${matchName}" is scheduled for ${scheduledTime}.`;
  return await sendNotificationEmail(userEmail, subject, message);
};

const sendPaymentConfirmation = async (userEmail, amount, tournamentName) => {
  const subject = 'Payment Confirmation';
  const message = `Your payment of $${amount} for ${tournamentName} has been confirmed.`;
  return await sendNotificationEmail(userEmail, subject, message);
};

const sendPasswordResetOTP = async (userEmail, otp) => {
  const subject = 'Password Reset OTP';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Password Reset OTP</h2>
      <p style="color: #666; line-height: 1.6; margin-top: 20px;">
        You requested to reset your password for your XpertKarate account.
      </p>
      <p style="color: #666; line-height: 1.6;">
        Use the following OTP (One-Time Password) to reset your password. This OTP will expire in 10 minutes.
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <div style="background-color: #f3f4f6; border: 2px dashed #3b82f6; border-radius: 10px; padding: 20px; display: inline-block;">
          <p style="color: #999; font-size: 14px; margin: 0 0 10px 0;">Your OTP Code</p>
          <p style="color: #3b82f6; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">
            ${otp}
          </p>
        </div>
      </div>
      <p style="color: #666; line-height: 1.6; font-size: 14px;">
        Enter this code on the password reset page to continue.
      </p>
      <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <strong>Security Notice:</strong> Never share this OTP with anyone. If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
      </p>
      <p style="color: #999; font-size: 12px; margin-top: 10px;">
        This is an automated message from XpertKarate Tournament Management System.
      </p>
    </div>
  `;
  const text = `
    Password Reset OTP
    
    You requested to reset your password for your XpertKarate account.
    
    Your OTP Code: ${otp}
    
    This OTP will expire in 10 minutes.
    
    Enter this code on the password reset page to continue.
    
    Security Notice: Never share this OTP with anyone. If you didn't request this password reset, please ignore this email.
  `;
  return await sendEmail(userEmail, subject, text, html);
};

module.exports = {
  sendEmail,
  sendNotificationEmail,
  sendRegistrationConfirmation,
  sendMatchScheduleNotification,
  sendPaymentConfirmation,
  sendPasswordResetOTP
};

