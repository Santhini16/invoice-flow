const express = require('express');
const router  = express.Router();

const auth                    = require('../middleware/auth');
const { validate, rules }     = require('../middleware/validate');
const { generatePDF }         = require('../services/pdfService');
const { query }               = require('../config/db');
const {
  list,
  getOne,
  getPublic,
  create,
  update,
  updateStatus,
  send,
  remove,
} = require('../controllers/invoiceController');

// ─── Public (no auth) — client portal ────────────────────────────────────────
// GET /api/invoices/public/:token
router.get('/public/:token', getPublic);

// ─── Protected ───────────────────────────────────────────────────────────────

// GET /api/invoices
// Query params: status, search, page, limit, clientId
router.get('/', auth, list);

// GET /api/invoices/:id
router.get('/:id', auth, getOne);

// POST /api/invoices
router.post('/', auth, rules.createInvoice, validate, create);

// PUT /api/invoices/:id
router.put('/:id', auth, update);

// PATCH /api/invoices/:id/status
// Body: { status: 'draft'|'sent'|'viewed'|'paid'|'overdue'|'cancelled' }
router.patch('/:id/status', auth, updateStatus);

// POST /api/invoices/:id/send
// Body: { method: 'email'|'whatsapp' }
router.post('/:id/send', auth, send);

// DELETE /api/invoices/:id
router.delete('/:id', auth, remove);

// GET /api/invoices/:id/pdf
// Returns PDF file (if puppeteer installed) or HTML page for browser print
router.get('/:id/pdf', auth, async (req, res, next) => {
  try {
    // Fetch full invoice with joins
    const invRes = await query(
      `SELECT
         i.*,
         c.name    AS client_name,
         c.email   AS client_email,
         c.phone   AS client_phone,
         c.address AS client_address,
         c.gstin   AS client_gstin,
         co.name    AS company_name,
         co.address AS company_address,
         co.gstin   AS company_gstin,
         co.email   AS company_email,
         co.phone   AS company_phone,
         co.bank_name,
         co.account_number,
         co.ifsc
       FROM invoices i
       LEFT JOIN clients   c  ON c.id  = i.client_id
       LEFT JOIN companies co ON co.id = i.company_id
       WHERE i.id = $1 AND i.company_id = $2`,
      [req.params.id, req.companyId]
    );

    if (!invRes.rows.length) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const row   = invRes.rows[0];
    const items = await query(
      'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY sort_order',
      [req.params.id]
    );

    // Shape invoice object for PDF service
    const invoice = {
      invoiceNumber:  row.invoice_number,
      status:         row.status,
      issueDate:      row.issue_date,
      dueDate:        row.due_date,
      subtotal:       parseFloat(row.subtotal),
      discount:       parseFloat(row.discount),
      discountAmount: parseFloat(row.discount_amount),
      taxableAmount:  parseFloat(row.taxable_amount),
      gstRate:        parseFloat(row.gst_rate),
      gstType:        row.gst_type,
      gstAmount:      parseFloat(row.gst_amount),
      cgstAmount:     parseFloat(row.cgst_amount),
      sgstAmount:     parseFloat(row.sgst_amount),
      igstAmount:     parseFloat(row.igst_amount),
      total:          parseFloat(row.total),
      notes:          row.notes,
      company: {
        name:    row.company_name,
        address: row.company_address,
        gstin:   row.company_gstin,
        email:   row.company_email,
        phone:   row.company_phone,
      },
      client: {
        name:    row.client_name,
        email:   row.client_email,
        phone:   row.client_phone,
        address: row.client_address,
        gstin:   row.client_gstin,
      },
      bankDetails: row.bank_name ? {
        bankName:      row.bank_name,
        accountNumber: row.account_number,
        ifsc:          row.ifsc,
      } : null,
      items: items.rows.map(i => ({
        description: i.description,
        hsn:         i.hsn,
        unit:        i.unit,
        quantity:    parseFloat(i.quantity),
        price:       parseFloat(i.price),
      })),
    };

    const { pdf, html } = await generatePDF(invoice);

    if (pdf) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${row.invoice_number}.pdf"`
      );
      return res.send(pdf);
    }

    // Fallback — return HTML (open in browser, Ctrl+P to save as PDF)
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    next(err);
  }
});

module.exports = router;