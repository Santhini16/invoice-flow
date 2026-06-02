const express = require('express');
const path    = require('path');
const router  = express.Router();

const auth     = require('../middleware/auth');
const rbac     = require('../middleware/rbac');
const upload   = require('../middleware/upload');
const { validate, rules } = require('../middleware/validate');

const authCtrl         = require('../controllers/authController');
const dashCtrl         = require('../controllers/dashboardController');
const invCtrl          = require('../controllers/invoiceController');
const clientCtrl       = require('../controllers/clientController');
const empCtrl          = require('../controllers/employeeController');
const payCtrl          = require('../controllers/paymentController');
const reportCtrl       = require('../controllers/reportController');
const activityCtrl     = require('../controllers/activityController');
const companyCtrl      = require('../controllers/companyController');
const notifCtrl        = require('../controllers/notificationController');
const { generatePDF }  = require('../services/pdfService');
const { query }        = require('../config/db');

// ── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/signup',          authCtrl.signup);
router.post('/auth/login',           rules.login, validate, authCtrl.login);
router.get ('/auth/me',              auth, authCtrl.me);
router.put ('/auth/change-password', auth, authCtrl.changePassword);

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard/admin',    auth, rbac('admin'),            dashCtrl.adminStats);
router.get('/dashboard/employee', auth, rbac('admin','employee'), dashCtrl.employeeStats);

// ── Invoices ──────────────────────────────────────────────────────────────────
router.get   ('/invoices/public/:token', invCtrl.getPublic);
router.get   ('/invoices',              auth, invCtrl.list);
router.get   ('/invoices/:id',          auth, invCtrl.getOne);
router.post  ('/invoices',              auth, rules.createInvoice, validate, invCtrl.create);
router.put   ('/invoices/:id',          auth, invCtrl.update);
router.patch ('/invoices/:id/status',   auth, invCtrl.updateStatus);
router.post  ('/invoices/:id/send',     auth, invCtrl.send);
router.delete('/invoices/:id',          auth, invCtrl.remove);

// Invoice PDF
router.get('/invoices/:id/pdf', auth, async (req, res, next) => {
  try {
    const invRes = await query(
      `SELECT i.*,
        c.name as client_name, c.email as client_email, c.phone as client_phone,
        c.address as client_address, c.gstin as client_gstin,
        co.name as company_name, co.address as company_address, co.gstin as company_gstin,
        co.bank_name, co.account_number, co.ifsc
       FROM invoices i
       LEFT JOIN clients c  ON c.id  = i.client_id
       LEFT JOIN companies co ON co.id = i.company_id
       WHERE i.id = $1 AND i.company_id = $2`,
      [req.params.id, req.companyId]
    );
    if (!invRes.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    const row   = invRes.rows[0];
    const items = await query('SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY sort_order', [req.params.id]);
    const invoice = {
      invoiceNumber: row.invoice_number, status: row.status,
      issueDate: row.issue_date, dueDate: row.due_date,
      subtotal: parseFloat(row.subtotal), discount: parseFloat(row.discount),
      discountAmount: parseFloat(row.discount_amount),
      gstRate: parseFloat(row.gst_rate), gstType: row.gst_type,
      gstAmount: parseFloat(row.gst_amount), cgstAmount: parseFloat(row.cgst_amount),
      sgstAmount: parseFloat(row.sgst_amount), igstAmount: parseFloat(row.igst_amount),
      total: parseFloat(row.total), notes: row.notes,
      company: { name: row.company_name, address: row.company_address, gstin: row.company_gstin },
      client:  { name: row.client_name,  email: row.client_email, phone: row.client_phone, address: row.client_address, gstin: row.client_gstin },
      bankDetails: row.bank_name ? { bankName: row.bank_name, accountNumber: row.account_number, ifsc: row.ifsc } : null,
      items: items.rows.map(i => ({ description: i.description, hsn: i.hsn, unit: i.unit, quantity: parseFloat(i.quantity), price: parseFloat(i.price) })),
    };
    const { pdf, html } = await generatePDF(invoice);
    if (pdf) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${row.invoice_number}.pdf"`);
      return res.send(pdf);
    }
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) { next(err); }
});

// ── Clients ───────────────────────────────────────────────────────────────────
router.get   ('/clients',               auth, clientCtrl.list);
router.get   ('/clients/:id',           auth, clientCtrl.getOne);
router.get   ('/clients/:id/statement', auth, clientCtrl.statement);
router.post  ('/clients',               auth, rules.createClient, validate, clientCtrl.create);
router.put   ('/clients/:id',           auth, clientCtrl.update);
router.delete('/clients/:id',           auth, rbac('admin'), clientCtrl.remove);

// ── Employees ─────────────────────────────────────────────────────────────────
router.get   ('/employees',     auth, rbac('admin'), empCtrl.list);
router.get   ('/employees/:id', auth, rbac('admin'), empCtrl.getOne);
router.post  ('/employees',     auth, rbac('admin'), empCtrl.create);
router.put   ('/employees/:id', auth, rbac('admin'), empCtrl.update);
router.delete('/employees/:id', auth, rbac('admin'), empCtrl.remove);

// ── Payments ──────────────────────────────────────────────────────────────────
router.post('/payments/create-order',     payCtrl.createOrder);
router.post('/payments/verify',           payCtrl.verify);
router.post('/payments/webhook/razorpay', payCtrl.webhook);
router.get ('/payments', auth, rbac('admin'), payCtrl.list);

// ── Reports ───────────────────────────────────────────────────────────────────
router.get('/reports/revenue',     auth, rbac('admin'), reportCtrl.revenue);
router.get('/reports/gst',         auth, rbac('admin'), reportCtrl.gst);
router.get('/reports/profit-loss', auth, rbac('admin'), reportCtrl.profitLoss);

// ── Activities ────────────────────────────────────────────────────────────────
router.get('/activities', auth, activityCtrl.list);

// ── Company ───────────────────────────────────────────────────────────────────
router.get ('/company',      auth, rbac('admin'), companyCtrl.get);
router.put ('/company',      auth, rbac('admin'), companyCtrl.update);
router.post('/company/logo', auth, rbac('admin'), upload.single('logo'), companyCtrl.uploadLogo);
router.use ('/uploads', express.static(path.join(__dirname, '../../uploads')));

// ── Notifications ─────────────────────────────────────────────────────────────
router.get   ('/notifications',          auth, notifCtrl.list);
router.patch ('/notifications/read-all', auth, notifCtrl.markAllRead);
router.patch ('/notifications/:id/read', auth, notifCtrl.markRead);
router.delete('/notifications/:id',      auth, notifCtrl.remove);

module.exports = router;