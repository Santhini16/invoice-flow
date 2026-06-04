/**
 * emailService.js
 *
 * Supports 3 providers — auto-detected from env vars:
 *
 *  1. RESEND (recommended for Render/Vercel — free 3000 emails/mo)
 *     Set:  EMAIL_PROVIDER=resend   RESEND_API_KEY=re_xxxx
 *
 *  2. SENDGRID (free 100/day)
 *     Set:  EMAIL_PROVIDER=sendgrid  SENDGRID_API_KEY=SG.xxxx
 *
 *  3. GMAIL via nodemailer (works if Gmail App Password set correctly)
 *     Set:  EMAIL_PROVIDER=gmail (or leave blank)
 *           SMTP_USER=you@gmail.com
 *           SMTP_PASS=xxxx-xxxx-xxxx-xxxx   ← 16-char App Password (NOT your Gmail password)
 *
 * Quick setup for Gmail App Password:
 *   1. myaccount.google.com → Security → 2-Step Verification → ON
 *   2. myaccount.google.com/apppasswords → Select "Mail" → Generate
 *   3. Copy the 16-char code → paste as SMTP_PASS in Render env vars
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

// ── Provider detection ───────────────────────────────────────────────────────
const PROVIDER = (process.env.EMAIL_PROVIDER || '').toLowerCase();
const USE_RESEND   = PROVIDER === 'resend'   || !!process.env.RESEND_API_KEY;
const USE_SENDGRID = PROVIDER === 'sendgrid' || !!process.env.SENDGRID_API_KEY;

// ── Nodemailer transporter (Gmail / SMTP) ────────────────────────────────────
let transporter = null;
const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },

    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,

    tls: {
      rejectUnauthorized: false,
    },
  });
};

// ── Verify SMTP connection (call once at startup) ────────────────────────────
const verifyConnection = async () => {
  try {
    const transporter = getTransporter();

    console.log("SMTP_USER:", process.env.SMTP_USER);
    console.log("SMTP_HOST:", process.env.SMTP_HOST);
    console.log("SMTP_PORT:", process.env.SMTP_PORT);

    await transporter.verify();

    console.log("[email] SMTP connected successfully");
  } catch (err) {
    console.error("[email] SMTP verify failed:", err);
    throw err;
  }
};

// ── Resend sender ─────────────────────────────────────────────────────────────
const sendViaResend = async ({ to, subject, html, fromName, fromEmail }) => {
  const { Resend } = require('resend');
  const resend     = new Resend(process.env.RESEND_API_KEY);
  const data       = await resend.emails.send({
    from:    `${fromName} <${fromEmail || 'onboarding@resend.dev'}>`,
    to:      [to],
    subject,
    html,
  });
  if (data.error) throw new Error(data.error.message);
  return data;
};

// ── SendGrid sender ───────────────────────────────────────────────────────────
const sendViaSendGrid = async ({ to, subject, html, fromName, fromEmail }) => {
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  await sgMail.send({
    to, subject, html,
    from: { name: fromName, email: fromEmail || process.env.FROM_EMAIL },
  });
};

// ── Core send function ────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html, companyName }) => {
  const fromName  = process.env.FROM_NAME  || companyName || 'InvoiceFlow';
  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || '';

  // 1. Resend
  if (USE_RESEND) {
    try {
      await sendViaResend({ to, subject, html, fromName, fromEmail });
      console.log(`[email] Sent via Resend → ${to}`);
      return { success: true, provider: 'resend' };
    } catch (err) {
      console.error('[email] Resend error:', err.message);
      return { success: false, error: err.message };
    }
  }

  // 2. SendGrid
  if (USE_SENDGRID) {
    try {
      await sendViaSendGrid({ to, subject, html, fromName, fromEmail });
      console.log(`[email] Sent via SendGrid → ${to}`);
      return { success: true, provider: 'sendgrid' };
    } catch (err) {
      console.error('[email] SendGrid error:', err.message);
      return { success: false, error: err.message };
    }
  }

  // 3. Gmail / SMTP
  const transporter = getTransporter();
  if (!transporter) {
    // Dev fallback — log to console so you can see content during dev
    console.log('\n========== EMAIL (no SMTP configured) ==========');
    console.log(`TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log('================================================\n');
    return { success: true, provider: 'console' };
  }

  try {
    const info = await transporter.sendMail({
      from:    `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
    });
    console.log(`[email] Sent via Gmail/SMTP → ${to} | MessageId: ${info.messageId}`);
    return { success: true, provider: 'smtp', messageId: info.messageId };
  } catch (err) {
    console.error('[email] SMTP send error:', err.message);
    // Reset transporter so next attempt retries auth
    _transporter = null;
    return { success: false, error: err.message };
  }
};

// ── Invoice email ─────────────────────────────────────────────────────────────
const sendInvoiceEmail = async ({
  to, clientName, invoiceNumber, amount, dueDate, publicLink, companyName, logoUrl,
}) => {
  if (!to) {
    console.warn('[email] sendInvoiceEmail: no recipient email address');
    return { success: false, error: 'No recipient email' };
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice from ${companyName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Segoe UI', Arial, sans-serif; background: #f1f5f9; color: #1e293b; }
  .wrapper { max-width: 600px; margin: 32px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #0ea5e9 100%); padding: 36px 40px; }
  .header-inner { display: flex; align-items: center; gap: 16px; }
  .logo-box { width: 52px; height: 52px; background: rgba(255,255,255,0.2); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 900; color: white; overflow: hidden; flex-shrink: 0; }
  .logo-box img { width: 100%; height: 100%; object-fit: contain; padding: 4px; }
  .company-info h1 { color: white; font-size: 20px; font-weight: 800; line-height: 1.2; }
  .company-info p { color: rgba(255,255,255,0.7); font-size: 13px; margin-top: 3px; }
  .badge { display: inline-block; background: rgba(255,255,255,0.2); color: white; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; margin-top: 20px; letter-spacing: 0.5px; }
  .body { padding: 36px 40px; }
  .greeting { font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 24px; }
  .invoice-card { background: #f8faff; border: 1.5px solid #dbeafe; border-radius: 16px; padding: 24px; margin-bottom: 28px; }
  .invoice-card-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e0edff; padding-bottom: 14px; margin-bottom: 14px; }
  .inv-num { font-size: 13px; font-weight: 700; color: #2563eb; font-family: monospace; }
  .inv-label { font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
  .inv-value { font-size: 14px; font-weight: 600; color: #1e293b; }
  .row { display: flex; justify-content: space-between; padding: 7px 0; }
  .row:not(:last-child) { border-bottom: 1px solid #e9f0ff; }
  .total-row { background: #2563eb; border-radius: 10px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
  .total-label { color: rgba(255,255,255,0.85); font-size: 14px; font-weight: 600; }
  .total-amount { color: white; font-size: 22px; font-weight: 900; }
  .cta-wrapper { text-align: center; margin: 28px 0; }
  .cta-btn { display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 15px 42px; border-radius: 12px; font-size: 16px; font-weight: 700; letter-spacing: 0.2px; }
  .cta-sub { color: #94a3b8; font-size: 12px; margin-top: 10px; }
  .cta-link { color: #2563eb; word-break: break-all; font-size: 12px; }
  .info-row { display: flex; align-items: center; gap: 8px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px; }
  .info-icon { font-size: 16px; }
  .footer { background: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #f1f5f9; }
  .footer p { color: #94a3b8; font-size: 12px; line-height: 1.7; }
  .secure-badge { display: inline-flex; align-items: center; gap: 5px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 20px; padding: 5px 12px; font-size: 11px; font-weight: 600; color: #16a34a; margin-top: 10px; }
</style>
</head>
<body>
<div class="wrapper">
  <!-- Header -->
  <div class="header">
    <div class="header-inner">
      <div class="logo-box">
        ${logoUrl
          ? `<img src="${logoUrl}" alt="${companyName}" />`
          : companyName?.[0]?.toUpperCase() || '?'
        }
      </div>
      <div class="company-info">
        <h1>${companyName}</h1>
        <p>Invoice Notification</p>
      </div>
    </div>
    <div class="badge">📄 NEW INVOICE</div>
  </div>

  <!-- Body -->
  <div class="body">
    <p class="greeting">
      Dear <strong>${clientName}</strong>,<br><br>
      You have a new invoice from <strong>${companyName}</strong>. 
      Please review the details below and complete your payment before the due date.
    </p>

    <!-- Invoice card -->
    <div class="invoice-card">
      <div class="invoice-card-header">
        <div>
          <div class="inv-label">Invoice Number</div>
          <div class="inv-num">${invoiceNumber}</div>
        </div>
        <div style="text-align:right">
          <div class="inv-label">Due Date</div>
          <div class="inv-value" style="color:#dc2626">${dueDate}</div>
        </div>
      </div>
      <div class="total-row">
        <span class="total-label">Amount Due</span>
        <span class="total-amount">${amount}</span>
      </div>
    </div>

    <!-- CTA button -->
    <div class="cta-wrapper">
      <a href="${publicLink}" class="cta-btn">View &amp; Pay Invoice →</a>
      <p class="cta-sub">Secure online payment via UPI, Credit/Debit Card, or Net Banking</p>
      <p class="cta-sub">Or open this link in your browser:</p>
      <a href="${publicLink}" class="cta-link">${publicLink}</a>
    </div>

    <!-- What to expect -->
    <div>
      <div class="info-row"><span class="info-icon">💳</span><span>Pay online using <strong>UPI, Card, or Net Banking</strong> via Razorpay</span></div>
      <div class="info-row"><span class="info-icon">📥</span><span>Download your invoice PDF directly from the payment page</span></div>
      <div class="info-row"><span class="info-icon">✅</span><span>You'll receive a payment confirmation email automatically</span></div>
      <div class="info-row" style="border:none"><span class="info-icon">❓</span><span>Questions? Reply to this email or contact <strong>${companyName}</strong> directly</span></div>
    </div>

    <div style="text-align:center; margin-top:20px;">
      <div class="secure-badge">🔒 Secured by Razorpay · Bank-grade encryption</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>This invoice was sent by <strong>${companyName}</strong> using InvoiceFlow.</p>
    <p>If you weren't expecting this, please ignore this email or contact the sender.</p>
    <p style="margin-top:8px; color:#cbd5e1;">© ${new Date().getFullYear()} InvoiceFlow · GST-Ready Invoice Platform</p>
  </div>
</div>
</body>
</html>`;

  return sendEmail({
    to,
    subject:     `Invoice ${invoiceNumber} from ${companyName} — ${amount} due ${dueDate}`,
    html,
    companyName,
  });
};

// ── Payment receipt email ─────────────────────────────────────────────────────
const sendPaymentReceipt = async ({
  to, clientName, invoiceNumber, amount, companyName, paidAt, logoUrl,
}) => {
  if (!to) return { success: false, error: 'No recipient email' };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Payment Receipt</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Segoe UI', Arial, sans-serif; background: #f0fdf4; color: #1e293b; }
  .wrapper { max-width: 520px; margin: 32px auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #059669, #10b981); padding: 40px; text-align: center; }
  .checkmark { width: 72px; height: 72px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; margin: 0 auto 16px; }
  .header h1 { color: white; font-size: 26px; font-weight: 800; }
  .header p { color: rgba(255,255,255,0.8); font-size: 14px; margin-top: 6px; }
  .body { padding: 36px 40px; text-align: center; }
  .amount-box { background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 16px; padding: 28px; margin: 24px 0; }
  .amount-label { font-size: 12px; font-weight: 700; color: #16a34a; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .amount { font-size: 42px; font-weight: 900; color: #059669; }
  .detail-row { display: flex; justify-content: space-between; padding: 10px 16px; background: #f8fafc; border-radius: 8px; margin: 6px 0; font-size: 13px; }
  .detail-label { color: #64748b; }
  .detail-value { font-weight: 600; color: #1e293b; }
  .message { font-size: 15px; color: #374151; line-height: 1.7; margin: 24px 0; }
  .footer { background: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #f1f5f9; }
  .footer p { color: #94a3b8; font-size: 12px; line-height: 1.7; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <div class="checkmark">✅</div>
    <h1>Payment Received!</h1>
    <p>Transaction completed successfully</p>
  </div>
  <div class="body">
    <p class="message">Dear <strong>${clientName}</strong>,<br>Your payment has been received. This is your official receipt.</p>
    <div class="amount-box">
      <div class="amount-label">Amount Paid</div>
      <div class="amount">${amount}</div>
    </div>
    <div class="detail-row"><span class="detail-label">Invoice Number</span><span class="detail-value" style="font-family:monospace">${invoiceNumber}</span></div>
    <div class="detail-row"><span class="detail-label">Paid On</span><span class="detail-value">${paidAt}</span></div>
    <div class="detail-row"><span class="detail-label">Received By</span><span class="detail-value">${companyName}</span></div>
    <p class="message" style="font-size:13px;color:#64748b;margin-top:20px;">
      Thank you for your prompt payment. Please keep this email as your payment record.
    </p>
  </div>
  <div class="footer">
    <p><strong>${companyName}</strong> · Powered by InvoiceFlow</p>
    <p>© ${new Date().getFullYear()} · GST-Ready Invoice Platform</p>
  </div>
</div>
</body>
</html>`;

  return sendEmail({
    to,
    subject:     `Payment Receipt — ${invoiceNumber} · ${amount}`,
    html,
    companyName,
  });
};

module.exports = { sendInvoiceEmail, sendPaymentReceipt, verifyConnection };