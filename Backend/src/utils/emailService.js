const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  // Use SMTP config from environment variables
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

// Send OTP email
const sendOTPEmail = async (email, otp) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.FROM_EMAIL || `"NGO Connect" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Password Reset OTP - NGO Connect',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>You have requested to reset your password for your NGO Connect account.</p>
          <p>Your One-Time Password (OTP) is:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #dc2626; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p><strong>This OTP will expire in 15 minutes.</strong></p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <p>For security reasons, please do not share this OTP with anyone.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            This is an automated message from NGO Connect. Please do not reply to this email.
          </p>
        </div>
      `,
      text: `
        Password Reset Request - NGO Connect

        Hello,

        You have requested to reset your password for your NGO Connect account.

        Your One-Time Password (OTP) is: ${otp}

        This OTP will expire in 15 minutes.

        If you didn't request this password reset, please ignore this email.

        For security reasons, please do not share this OTP with anyone.

        This is an automated message from NGO Connect. Please do not reply to this email.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully:', info.messageId);

    // For Ethereal (development), log the preview URL
    if (process.env.NODE_ENV === 'development' && info.messageId) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new Error('Failed to send OTP email');
  }
};

// Send welcome email (for future use)
const sendWelcomeEmail = async (email, name) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"NGO Connect" <${process.env.EMAIL_USER || 'noreply@ngoconnect.com'}>`,
      to: email,
      subject: 'Welcome to NGO Connect!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Welcome to NGO Connect!</h2>
          <p>Hello ${name},</p>
          <p>Thank you for joining NGO Connect! We're excited to have you as part of our community.</p>
          <p>You can now:</p>
          <ul>
            <li>Connect with volunteers and NGOs</li>
            <li>Find opportunities to make a difference</li>
            <li>Build meaningful partnerships</li>
          </ul>
          <p>Get started by completing your profile and exploring opportunities in your area.</p>
          <p>Welcome aboard!</p>
          <p>The NGO Connect Team</p>
        </div>
      `,
      text: `
        Welcome to NGO Connect!

        Hello ${name},

        Thank you for joining NGO Connect! We're excited to have you as part of our community.

        You can now:
        - Connect with volunteers and NGOs
        - Find opportunities to make a difference
        - Build meaningful partnerships

        Get started by completing your profile and exploring opportunities in your area.

        Welcome aboard!

        The NGO Connect Team
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully:', info.messageId);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw new Error('Failed to send welcome email');
  }
};

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail
};
