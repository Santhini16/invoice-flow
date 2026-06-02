const { query }               = require('../config/db');
const { log }                 = require('../services/activityService');
const { sendPaymentReceipt }  = require('../services/emailService');
const crypto                  = require('crypto');

let razorpay;
const getRazorpay = () => {
  if (!razorpay) {
    const Razorpay = require('razorpay');
    razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  }
  return razorpay;
};

// POST /api/payments/create-order
const createOrder = async (req, res, next) => {
  try {
    const { invoiceId } = req.body;
    if (!invoiceId) return res.status(400).json({ success: false, message: 'invoiceId required' });

    const invRes = await query(
      `SELECT i.*, c.name AS client_name, c.email AS client_email, co.name AS company_name
       FROM invoices i
       JOIN clients c ON c.id = i.client_id
       JOIN companies co ON co.id = i.company_id
       WHERE i.id = $1`, [invoiceId]
    );
    if (!invRes.rows.length) return res.status(404).json({ success: false, message: 'Invoice not found' });
    const inv = invRes.rows[0];
    if (inv.status === 'paid') return res.status(400).json({ success: false, message: 'Already paid' });

    const amountPaise = Math.round(parseFloat(inv.total) * 100);
    const isRealKey = process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.includes('xxxx');
    let orderId;

    if (isRealKey) {
      const order = await getRazorpay().orders.create({ amount: amountPaise, currency: 'INR', receipt: inv.invoice_number });
      orderId = order.id;
      await query('UPDATE invoices SET razorpay_order_id = $1 WHERE id = $2', [orderId, invoiceId]);
    } else {
      orderId = `order_demo_${Date.now()}`;
    }

    res.json({ success: true, orderId, amount: amountPaise, currency: 'INR', invoiceNumber: inv.invoice_number, companyName: inv.company_name, clientName: inv.client_name, clientEmail: inv.client_email });
  } catch (err) { next(err); }
};

// POST /api/payments/verify
const verify = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceId } = req.body;
    if (!invoiceId) return res.status(400).json({ success: false, message: 'invoiceId required' });

    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const isDemo = !secret || secret.includes('xxxx');
    if (!isDemo) {
      const expected = crypto.createHmac('sha256', secret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
      if (expected !== razorpay_signature) return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const invRes = await query(
      `SELECT i.*, c.name AS client_name, c.email AS client_email, co.name AS company_name, co.id AS company_id
       FROM invoices i JOIN clients c ON c.id=i.client_id JOIN companies co ON co.id=i.company_id WHERE i.id=$1`, [invoiceId]
    );
    if (!invRes.rows.length) return res.status(404).json({ success: false, message: 'Invoice not found' });
    const inv = invRes.rows[0];
    if (inv.status === 'paid') return res.json({ success: true, message: 'Already paid', invoiceNumber: inv.invoice_number });

    await query(
      `INSERT INTO payments (invoice_id,company_id,amount,method,status,razorpay_order_id,razorpay_payment_id,razorpay_signature)
       VALUES ($1,$2,$3,'razorpay','completed',$4,$5,$6) ON CONFLICT (razorpay_payment_id) DO NOTHING`,
      [invoiceId, inv.company_id, inv.total, razorpay_order_id, razorpay_payment_id, razorpay_signature || '']
    );
    await query(`UPDATE invoices SET status='paid',paid_at=NOW(),razorpay_payment_id=$1,updated_at=NOW() WHERE id=$2`, [razorpay_payment_id, invoiceId]);

    if (inv.client_email) {
      sendPaymentReceipt({ to: inv.client_email, clientName: inv.client_name, invoiceNumber: inv.invoice_number,
        amount: new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(inv.total),
        companyName: inv.company_name, paidAt: new Date().toLocaleDateString('en-IN') }).catch(e => console.error(e.message));
    }

    await log({ companyId: inv.company_id, action: 'invoice_paid', description: `Invoice ${inv.invoice_number} paid via Razorpay`, entityType: 'invoice', entityId: inv.invoice_number });
    res.json({ success: true, message: 'Payment successful', invoiceNumber: inv.invoice_number });
  } catch (err) { next(err); }
};

// POST /api/payments/webhook/razorpay
const webhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const sig = req.headers['x-razorpay-signature'];
      const expected = crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(req.body)).digest('hex');
      if (sig !== expected) return res.status(400).json({ success: false, message: 'Invalid signature' });
    }
    const { event, payload } = req.body;
    if (event === 'payment.captured') {
      const payment = payload.payment?.entity;
      const invRes  = await query('SELECT * FROM invoices WHERE razorpay_order_id = $1', [payment?.order_id]);
      if (invRes.rows.length && invRes.rows[0].status !== 'paid') {
        const inv = invRes.rows[0];
        await query(`UPDATE invoices SET status='paid',paid_at=NOW(),razorpay_payment_id=$1 WHERE id=$2`, [payment.id, inv.id]);
        await query(
          `INSERT INTO payments (invoice_id,company_id,amount,method,status,razorpay_order_id,razorpay_payment_id)
           VALUES ($1,$2,$3,'razorpay','completed',$4,$5) ON CONFLICT DO NOTHING`,
          [inv.id, inv.company_id, payment.amount/100, payment.order_id, payment.id]
        );
        await log({ companyId: inv.company_id, action: 'invoice_paid', description: `Webhook: ${inv.invoice_number} paid`, entityType: 'invoice', entityId: inv.invoice_number });
      }
    }
    res.json({ success: true });
  } catch (err) { next(err); }
};

// GET /api/payments
const list = async (req, res, next) => {
  try {
    const { page=1, limit=20 } = req.query;
    const offset = (parseInt(page)-1) * parseInt(limit);
    const result = await query(
      `SELECT p.id,p.amount,p.method,p.status,p.razorpay_payment_id,p.created_at,i.invoice_number,c.name AS client_name
       FROM payments p JOIN invoices i ON i.id=p.invoice_id JOIN clients c ON c.id=i.client_id
       WHERE p.company_id=$1 ORDER BY p.created_at DESC LIMIT $2 OFFSET $3`,
      [req.companyId, parseInt(limit), offset]
    );
    const countRes = await query(`SELECT COUNT(*), COALESCE(SUM(amount),0) AS total FROM payments WHERE company_id=$1`, [req.companyId]);
    res.json({ success: true, payments: result.rows, total: parseInt(countRes.rows[0].count), totalAmount: parseFloat(countRes.rows[0].total) });
  } catch (err) { next(err); }
};

module.exports = { createOrder, verify, webhook, list };