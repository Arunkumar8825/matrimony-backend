const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Create transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Email templates
const templates = {
  emailVerification: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 10px 20px; background: #4CAF50; 
                  color: white; text-decoration: none; border-radius: 5px; }
        .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Yadhavar Matrimony</h1>
        </div>
        <div class="content">
          <h2>Welcome, ${data.name}!</h2>
          <p>Thank you for registering with Yadhavar Matrimony.</p>
          <p>Please verify your email address by clicking the button below:</p>
          <p style="text-align: center;">
            <a href="${process.env.CLIENT_URL}/verify-email?token=${data.verificationToken}" 
               class="button">Verify Email</a>
          </p>
          <p>Or copy this link: ${process.env.CLIENT_URL}/verify-email?token=${data.verificationToken}</p>
          <p>If you did not create an account, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Yadhavar Matrimony. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,
  
  passwordReset: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 10px 20px; background: #2196F3; 
                  color: white; text-decoration: none; border-radius: 5px; }
        .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hello ${data.name},</h2>
          <p>You requested to reset your password for your Yadhavar Matrimony account.</p>
          <p>Click the button below to reset your password:</p>
          <p style="text-align: center;">
            <a href="${data.resetUrl}" class="button">Reset Password</a>
          </p>
          <p>Or copy this link: ${data.resetUrl}</p>
          <p>This link will expire in 10 minutes.</p>
          <p>If you did not request a password reset, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Yadhavar Matrimony. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `,
  
  interestReceived: (data) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #FF9800; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .profile { display: flex; align-items: center; margin: 20px 0; }
        .profile-img { width: 80px; height: 80px; border-radius: 50%; margin-right: 20px; }
        .profile-info { flex: 1; }
        .button { display: inline-block; padding: 10px 20px; background: #FF9800; 
                  color: white; text-decoration: none; border-radius: 5px; }
        .footer { margin-top: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Interest Received!</h1>
        </div>
        <div class="content">
          <h2>Congratulations ${data.receiverName}!</h2>
          <p>You have received interest from:</p>
          
          <div class="profile">
            <img src="${data.senderPhoto}" alt="Profile" class="profile-img">
            <div class="profile-info">
              <h3>${data.senderName}</h3>
              <p>Age: ${data.senderAge} | Profession: ${data.senderProfession}</p>
              <p>Location: ${data.senderLocation}</p>
              ${data.message ? `<p><strong>Message:</strong> ${data.message}</p>` : ''}
            </div>
          </div>
          
          <p style="text-align: center;">
            <a href="${process.env.CLIENT_URL}/interests/received" class="button">View Interest</a>
          </p>
          
          <p>Login to your account to accept or decline this interest.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Yadhavar Matrimony. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
};

// Send email
exports.sendEmail = async ({ email, subject, template, data }) => {
  try {
    const html = templates[template](data);

    const mailOptions = {
      from: `"Yadhavar Matrimony" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: subject,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Send bulk email
exports.sendBulkEmail = async (emails, subject, html) => {
  try {
    const mailOptions = {
      from: `"Yadhavar Matrimony" <${process.env.EMAIL_FROM}>`,
      bcc: emails,
      subject: subject,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error sending bulk email:', error);
    throw error;
  }
};