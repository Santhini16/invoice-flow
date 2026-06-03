const { query, getClient } = require('../config/db');
const { log } = require('../services/activityService');
const { sendInvoiceEmail } = require('../services/emailService');
const { sendWhatsAppMessage } = require('../services/whatsappService');
const { v4: uuidv4 } = require('uuid');

const formatInvoice = (row, items = []) => ({
  id: row.id,
  invoiceNumber: row.invoice_number,
  status: row.status,
  issueDate: row.issue_date,
  dueDate: row.due_date,
  gstRate: parseFloat(row.gst_rate),
  gstType: row.gst_type,
  discount: parseFloat(row.discount),
  subtotal: parseFloat(row.subtotal),
  discountAmount: parseFloat(row.discount_amount),
  taxableAmount: parseFloat(row.taxable_amount),
  gstAmount: parseFloat(row.gst_amount),
  cgstAmount: parseFloat(row.cgst_amount),
  sgstAmount: parseFloat(row.sgst_amount),
  igstAmount: parseFloat(row.igst_amount),
  total: parseFloat(row.total),
  notes: row.notes,
  publicToken: row.public_token,
  isRecurring: row.is_recurring,
  recurrenceType: row.recurrence_type,
  sentAt: row.sent_at,
  viewedAt: row.viewed_at,
  paidAt: row.paid_at,
  createdAt: row.created_at,
  clientId: row.client_id,
  client: row.client_name ? {
    id: row.client_id,
    name: row.client_name,
    email: row.client_email,
    phone: row.client_phone,
    address: row.client_address,
    gstin: row.client_gstin,
  } : undefined,
  createdBy: row.creator_name ? { id: row.created_by, name: row.creator_name } : undefined,
  company: row.company_name ? {
    name: row.company_name,
    address: row.company_address,
    gstin: row.company_gstin,
  } : undefined,
  items: items.map(i => ({
    id: i.id,
    description: i.description,
    hsn: i.hsn,
    unit: i.unit,
    quantity: parseFloat(i.quantity),
    price: parseFloat(i.price),
    amount: parseFloat(i.amount),
  })),
  activities: row.activities || [],
});

const INVOICE_SELECT = `
  SELECT i.*,
    c.name as client_name, c.email as client_email, c.phone as client_phone,
    c.address as client_address, c.gstin as client_gstin,
    u.name as creator_name,
    co.name as company_name, co.address as company_address, co.gstin as company_gstin
  FROM invoices i
  LEFT JOIN clients c ON c.id = i.client_id
  LEFT JOIN users u ON u.id = i.created_by
  LEFT JOIN companies co ON co.id = i.company_id
`;

// GET /api/invoices
const list = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 50, clientId } = req.query;
    const isAdmin = req.user.role === 'admin';
    const companyId = req.companyId;

    let where = [`i.company_id = $1`];
    let params = [companyId];
    let idx = 2;

    // Employees only see their own invoices
    if (!isAdmin) {
      where.push(`i.created_by = $${idx++}`);
      params.push(req.user.id);
    }
    if (status) { where.push(`i.status = $${idx++}`); params.push(status); }
    if (clientId) { where.push(`i.client_id = $${idx++}`); params.push(clientId); }
    if (search) {
      where.push(`(i.invoice_number ILIKE $${idx} OR c.name ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }

    const whereClause = 'WHERE ' + where.join(' AND ');
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const [invoicesRes, countRes] = await Promise.all([
      query(`${INVOICE_SELECT} ${whereClause} ORDER BY i.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]),
      query(`SELECT COUNT(*) FROM invoices i LEFT JOIN clients c ON c.id = i.client_id ${whereClause}`, params),
    ]);

    res.json({
      success: true,
      invoices: invoicesRes.rows.map(r => formatInvoice(r)),
      total: parseInt(countRes.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) { next(err); }
};

// GET /api/invoices/:id
const getOne = async (req, res, next) => {
  try {
    const result = await query(`${INVOICE_SELECT} WHERE i.id = $1 AND i.company_id = $2`, [req.params.id, req.companyId]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const items = await query('SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY sort_order', [req.params.id]);
    const activities = await query(
      `SELECT a.action, a.description, a.created_at, u.name as user_name
       FROM activities a LEFT JOIN users u ON u.id = a.user_id
       WHERE a.entity_id = $1 ORDER BY a.created_at DESC LIMIT 20`,
      [result.rows[0].invoice_number]
    );

    const inv = formatInvoice(result.rows[0], items.rows);
    inv.activities = activities.rows.map(a => ({ action: a.action, user: a.user_name, at: a.created_at }));

    res.json({ success: true, ...inv });
  } catch (err) { next(err); }
};

// GET /api/invoices/public/:token  (no auth needed)
const getPublic = async (req, res, next) => {
  try {
    const result = await query(`${INVOICE_SELECT} WHERE i.public_token = $1`, [req.params.token]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const inv = result.rows[0];

    // Mark as viewed
    if (inv.status === 'sent') {
      await query(`UPDATE invoices SET status = 'viewed', viewed_at = NOW() WHERE id = $1`, [inv.id]);
      await log({ companyId: inv.company_id, action: 'invoice_viewed', description: `Invoice ${inv.invoice_number} viewed by client`, entityType: 'invoice', entityId: inv.invoice_number });
    }

    const items = await query('SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY sort_order', [inv.id]);

    // Also fetch bank details
    const bankRes = await query('SELECT bank_name, account_number, ifsc FROM companies WHERE id = $1', [inv.company_id]);

    const formatted = formatInvoice({ ...inv, status: inv.status === 'sent' ? 'viewed' : inv.status }, items.rows);
    formatted.bankDetails = bankRes.rows[0] ? {
      bankName: bankRes.rows[0].bank_name,
      accountNumber: bankRes.rows[0].account_number,
      ifsc: bankRes.rows[0].ifsc,
    } : null;

    res.json({ success: true, ...formatted });
  } catch (err) { next(err); }
};

// POST /api/invoices
const create = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const {
      invoiceNumber, clientId, issueDate, dueDate, gstRate = 18, gstType = 'IGST',
      discount = 0, subtotal = 0, discountAmount = 0, taxableAmount = 0,
      gstAmount = 0, total = 0, notes, status = 'draft', items = [],
      isRecurring = false, recurrenceType,
    } = req.body;

    const cgst = gstType === 'CGST+SGST' ? gstAmount / 2 : 0;
    const sgst = gstType === 'CGST+SGST' ? gstAmount / 2 : 0;
    const igst = gstType === 'IGST' ? gstAmount : 0;
    const nextRec = isRecurring && recurrenceType ? new Date() : null;

    const invRes = await client.query(`
      INSERT INTO invoices (
        company_id, client_id, created_by, invoice_number, status,
        issue_date, due_date, gst_rate, gst_type, discount,
        subtotal, discount_amount, taxable_amount, gst_amount,
        cgst_amount, sgst_amount, igst_amount, total, notes,
        is_recurring, recurrence_type, next_recurrence
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      RETURNING *`,
      [req.companyId, clientId, req.user.id, invoiceNumber, status,
       issueDate, dueDate, gstRate, gstType, discount,
       subtotal, discountAmount, taxableAmount, gstAmount,
       cgst, sgst, igst, total, notes,
       isRecurring, recurrenceType || null, nextRec]
    );

    const inv = invRes.rows[0];

    // Insert items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await client.query(
        `INSERT INTO invoice_items (invoice_id, description, hsn, unit, quantity, price, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [inv.id, item.description, item.hsn || null, item.unit || 'Nos', item.quantity, item.price, i]
      );
    }

    // If sent immediately
    if (status === 'sent') {
      await client.query(`UPDATE invoices SET sent_at = NOW() WHERE id = $1`, [inv.id]);
    }

    await client.query('COMMIT');

    await log({
      companyId: req.companyId, userId: req.user.id,
      action: 'invoice_created',
      description: `Invoice ${invoiceNumber} created for client`,
      entityType: 'invoice', entityId: invoiceNumber,
    });

    res.status(201).json({ success: true, message: 'Invoice created', id: inv.id, invoiceNumber });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// PUT /api/invoices/:id
const update = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const invCheck = await client.query('SELECT * FROM invoices WHERE id = $1 AND company_id = $2', [req.params.id, req.companyId]);
    if (!invCheck.rows.length) return res.status(404).json({ success: false, message: 'Invoice not found' });

    // Employees can only edit their own draft invoices
    const inv = invCheck.rows[0];
    if (req.user.role !== 'admin' && inv.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Cannot edit another employee\'s invoice' });
    }

    const {
      clientId, issueDate, dueDate, gstRate, gstType, discount,
      subtotal, discountAmount, taxableAmount, gstAmount, total,
      notes, status, items = [],
    } = req.body;

    const cgst = gstType === 'CGST+SGST' ? gstAmount / 2 : 0;
    const sgst = gstType === 'CGST+SGST' ? gstAmount / 2 : 0;
    const igst = gstType === 'IGST' ? gstAmount : 0;

    await client.query(`
      UPDATE invoices SET
        client_id=$1, issue_date=$2, due_date=$3, gst_rate=$4, gst_type=$5, discount=$6,
        subtotal=$7, discount_amount=$8, taxable_amount=$9, gst_amount=$10,
        cgst_amount=$11, sgst_amount=$12, igst_amount=$13, total=$14, notes=$15,
        status=$16, updated_at=NOW()
      WHERE id=$17`,
      [clientId, issueDate, dueDate, gstRate, gstType, discount,
       subtotal, discountAmount, taxableAmount, gstAmount,
       cgst, sgst, igst, total, notes, status || inv.status, req.params.id]
    );

    // Replace items
    await client.query('DELETE FROM invoice_items WHERE invoice_id = $1', [req.params.id]);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await client.query(
        `INSERT INTO invoice_items (invoice_id, description, hsn, unit, quantity, price, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [req.params.id, item.description, item.hsn || null, item.unit || 'Nos', item.quantity, item.price, i]
      );
    }

    await client.query('COMMIT');

    await log({
      companyId: req.companyId, userId: req.user.id,
      action: 'invoice_edited',
      description: `Invoice ${inv.invoice_number} updated`,
      entityType: 'invoice', entityId: inv.invoice_number,
    });

    res.json({ success: true, message: 'Invoice updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// PATCH /api/invoices/:id/status
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const valid = ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

    const invRes = await query('SELECT * FROM invoices WHERE id = $1 AND company_id = $2', [req.params.id, req.companyId]);
    if (!invRes.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    const inv = invRes.rows[0];

    const extras = {};
    if (status === 'sent') extras.sent_at = 'NOW()';
    if (status === 'paid') extras.paid_at = 'NOW()';

    await query(
      `UPDATE invoices SET status = $1, updated_at = NOW()
       ${status === 'sent' ? ', sent_at = NOW()' : ''}
       ${status === 'paid' ? ', paid_at = NOW()' : ''}
       WHERE id = $2`,
      [status, req.params.id]
    );

    await log({
      companyId: req.companyId, userId: req.user.id,
      action: `invoice_${status}`,
      description: `Invoice ${inv.invoice_number} marked as ${status}`,
      entityType: 'invoice', entityId: inv.invoice_number,
    });

    res.json({ success: true, message: `Invoice marked as ${status}` });
  } catch (err) { next(err); }
};

// POST /api/invoices/:id/send
const send = async (req, res, next) => {
  try {
    const { method = 'email' } = req.body;
    const invRes = await query(`${INVOICE_SELECT} WHERE i.id = $1 AND i.company_id = $2`, [req.params.id, req.companyId]);
    if (!invRes.rows.length) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const inv = invRes.rows[0];
    const publicLink = `${process.env.FRONTEND_URL}/invoice/${inv.public_token}`;
    const amountFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(inv.total);
    const dueDateFormatted = new Date(inv.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    let result;
    if (method === 'email') {
      result = await sendInvoiceEmail({
        to: inv.client_email,
        clientName: inv.client_name,
        invoiceNumber: inv.invoice_number,
        amount: amountFormatted,
        dueDate: dueDateFormatted,
        publicLink,
        companyName: inv.company_name,
      });
      console.log("EMAIL RESULT:", result);

  if (!result.success) {
    return res.status(500).json({
      success: false,
      message: "Email sending failed",
      error: result.error,
    });
  }
    } 
    else if (method === 'whatsapp') {
      result = await sendWhatsAppMessage({
        phone: inv.client_phone,
        invoiceNumber: inv.invoice_number,
        amount: amountFormatted,
        dueDate: dueDateFormatted,
        publicLink,
        companyName: inv.company_name,
      });
    }

    // Update status to sent
    await query(`UPDATE invoices SET status = 'sent', sent_at = NOW() WHERE id = $1 AND status = 'draft'`, [req.params.id]);

    await log({
      companyId: req.companyId, userId: req.user.id,
      action: 'invoice_sent',
      description: `Invoice ${inv.invoice_number} sent via ${method} to ${inv.client_name}`,
      entityType: 'invoice', entityId: inv.invoice_number,
    });

    res.json({ success: true, message: `Invoice sent via ${method}`, publicLink, ...result });
  } catch (err) {
  console.error("FULL EMAIL ERROR:", err);
  return {
    success: false,
    error: err.message,
  };
}
};

// DELETE /api/invoices/:id
const remove = async (req, res, next) => {
  try {
    const invRes = await query('SELECT * FROM invoices WHERE id = $1 AND company_id = $2', [req.params.id, req.companyId]);
    if (!invRes.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    const inv = invRes.rows[0];

    if (req.user.role !== 'admin' && inv.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Cannot delete another employee\'s invoice' });
    }
    if (inv.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Cannot delete a paid invoice' });
    }

    await query('DELETE FROM invoice_items WHERE invoice_id = $1', [req.params.id]);
    await query('DELETE FROM invoices WHERE id = $1', [req.params.id]);

    await log({
      companyId: req.companyId, userId: req.user.id,
      action: 'invoice_deleted',
      description: `Invoice ${inv.invoice_number} deleted`,
      entityType: 'invoice', entityId: inv.invoice_number,
    });

    res.json({ success: true, message: 'Invoice deleted' });
  } catch (err) { next(err); }
};

module.exports = { list, getOne, getPublic, create, update, updateStatus, send, remove };