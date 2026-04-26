const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendAlertEmail(incident) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[EMAIL] Not configured - missing EMAIL_USER/EMAIL_PASS');
    return;
  }

  const mailOptions = {
    from: `"SOLIFE Monitoring" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_RECEIVER || process.env.EMAIL_USER,
    subject: ` [${incident.severity}] CRITICAL ALERT: ${incident.title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">CRITICAL INCIDENT DETECTED</h1>
        </div>
        <div style="padding: 20px; color: #333;">
          <p>Hello DevOps team,</p>
          <p>A new <strong>${incident.severity}</strong> severity incident has been detected.</p>
          <hr style="border: none; border-top: 1px solid #eee;">
          <p><strong>Title:</strong> ${incident.title}</p>
          <p><strong>Service:</strong> ${incident.service_name}</p>
          <p><strong>Anomaly:</strong> ${incident.anomaly_type}</p>
          <p><strong>Root Cause:</strong> ${incident.root_cause || 'Analysis in progress...'}</p>
          <hr style="border: none; border-top: 1px solid #eee;">
          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/incidents" 
               style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
               Manage Incident on Dashboard
            </a>
          </p>
        </div>
        <div style="background-color: #f9fafb; padding: 10px; text-align: center; font-size: 12px; color: #999;">
          &copy; 2026 SOLIFE Monitoring
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[EMAIL] Alert sent:', info.messageId);
  } catch (err) {
    console.error('[EMAIL] Send error:', err.message);
  }
}

module.exports = { sendAlertEmail };
