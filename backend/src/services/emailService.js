const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

const sendInvoiceEmail = async ({ to, clientName, invoiceNumber, amount, dueDate, publicLink, companyName }) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .header { background: #2563eb; padding: 32px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 800; }
        .header p { color: #bfdbfe; margin: 8px 0 0; font-size: 14px; }
        .body { padding: 32px; }
        .body p { color: #374151; line-height: 1.6; font-size: 15px; }
        .invoice-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 24px; margin: 24px 0; }
        .invoice-box .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e0f2fe; }
        .invoice-box .row:last-child { border-bottom: none; font-weight: bold; font-size: 18px; color: #2563eb; }
        .invoice-box .label { color: #64748b; font-size: 14px; }
        .invoice-box .value { color: #1e293b; font-weight: 600; font-size: 14px; }
        .btn { display: block; width: fit-content; margin: 24px auto; padding: 14px 40px; background: #2563eb; color: white; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; text-align: center; }
        .footer { background: #f8fafc; padding: 24px; text-align: center; color: #94a3b8; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📄 Invoice from ${companyName}</h1>
          <p>You have a new invoice waiting for you</p>
        </div>
        <div class="body">
          <p>Dear <strong>${clientName}</strong>,</p>
          <p>Please find your invoice details below. You can view and pay it securely online.</p>
          <div class="invoice-box">
            <div class="row"><span class="label">Invoice Number</span><span class="value">${invoiceNumber}</span></div>
            <div class="row"><span class="label">Due Date</span><span class="value">${dueDate}</span></div>
            <div class="row"><span class="label">Amount Due</span><span class="value">${amount}</span></div>
          </div>
          <a href="${publicLink}" class="btn">View & Pay Invoice →</a>
          <p style="color:#94a3b8;font-size:13px;text-align:center;">Or copy this link: <a href="${publicLink}" style="color:#2563eb;">${publicLink}</a></p>
        </div>
        <div class="footer">
          <p>This email was sent by ${companyName} via InvoiceFlow</p>
          <p>If you have questions, please contact us directly.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await getTransporter().sendMail({
      from: `"${process.env.FROM_NAME || companyName}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject: `Invoice ${invoiceNumber} from ${companyName} — ₹${amount}`,
      html,
    });
    return { success: true };
  } catch (err) {
    console.error('Email send error:', err.message);
    return { success: false, error: err.message };
  }
};

const sendPaymentReceipt = async ({ to, clientName, invoiceNumber, amount, companyName, paidAt }) => {
  const html = `
    <!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0fdf4; margin: 0; }
      .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
      .header { background: #10b981; padding: 32px; text-align: center; }
      .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 800; }
      .body { padding: 32px; }
      .check { font-size: 60px; text-align: center; margin: 16px 0; }
      .amount { text-align:center; font-size: 36px; font-weight: 900; color: #10b981; margin: 16px 0; }
      .footer { background: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 13px; }
    </style></head>
    <body>
      <div class="container">
        <div class="header"><h1>✅ Payment Received!</h1></div>
        <div class="body">
          <div class="check">🎉</div>
          <p style="text-align:center;color:#374151;">Dear <strong>${clientName}</strong>, your payment has been received.</p>
          <div class="amount">${amount}</div>
          <p style="text-align:center;color:#64748b;font-size:14px;">Invoice ${invoiceNumber} · Paid on ${paidAt}</p>
          <p style="text-align:center;color:#64748b;">Thank you for your prompt payment. This serves as your official receipt.</p>
        </div>
        <div class="footer"><p>${companyName} · Powered by InvoiceFlow</p></div>
      </div>
    </body></html>
  `;

  try {
    await getTransporter().sendMail({
      from: `"${companyName}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject: `Payment Receipt — ${invoiceNumber}`,
      html,
    });
    return { success: true };
  } catch (err) {
    console.error('Receipt email error:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { sendInvoiceEmail, sendPaymentReceipt };