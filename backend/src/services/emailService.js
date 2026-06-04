require('dotenv').config();
const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: false, // Brevo port 587

    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },

    tls: {
      rejectUnauthorized: false,
    },

    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
  });

  return transporter;
};

const verifyConnection = async () => {
  try {
    const transporter = getTransporter();

    await transporter.verify();

    console.log('✅ SMTP Connected Successfully');
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_PORT:', process.env.SMTP_PORT);
    console.log('SMTP_USER:', process.env.SMTP_USER);

    return true;
  } catch (err) {
    console.error('❌ SMTP Verify Error:', err.message);
    return false;
  }
};

const sendEmail = async ({
  to,
  subject,
  html,
  companyName = 'InvoiceFlow'
}) => {
  try {
    const transporter = getTransporter();

    console.log('Sending email to:', to);

    const info = await transporter.sendMail({
      from: `"${companyName}" <${process.env.FROM_EMAIL}>`,
      to,
      subject,
      html,
    });

    console.log('✅ Email sent');
    console.log('Message ID:', info.messageId);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err) {
    console.error('❌ Email send error:', err.message);

    return {
      success: false,
      error: err.message,
    };
  }
};

const sendInvoiceEmail = async ({
  to,
  clientName,
  invoiceNumber,
  amount,
  dueDate,
  publicLink,
  companyName,
}) => {
  const html = `
  <h2>Invoice from ${companyName}</h2>

  <p>Hello ${clientName},</p>

  <p>Your invoice is ready.</p>

  <ul>
    <li><strong>Invoice:</strong> ${invoiceNumber}</li>
    <li><strong>Amount:</strong> ${amount}</li>
    <li><strong>Due Date:</strong> ${dueDate}</li>
  </ul>

  <p>
    <a href="${publicLink}">
      View Invoice
    </a>
  </p>

  <p>Thank you.</p>
  `;

  return sendEmail({
    to,
    subject: `Invoice ${invoiceNumber} from ${companyName}`,
    html,
    companyName,
  });
};

const sendPaymentReceipt = async ({
  to,
  clientName,
  invoiceNumber,
  amount,
  companyName,
  paidAt,
}) => {
  const html = `
  <h2>Payment Received</h2>

  <p>Hello ${clientName},</p>

  <p>We received your payment.</p>

  <ul>
    <li><strong>Invoice:</strong> ${invoiceNumber}</li>
    <li><strong>Amount:</strong> ${amount}</li>
    <li><strong>Paid At:</strong> ${paidAt}</li>
  </ul>

  <p>Thank you for your payment.</p>
  `;

  return sendEmail({
    to,
    subject: `Payment Receipt - ${invoiceNumber}`,
    html,
    companyName,
  });
};

module.exports = {
  sendInvoiceEmail,
  sendPaymentReceipt,
  verifyConnection,
};
