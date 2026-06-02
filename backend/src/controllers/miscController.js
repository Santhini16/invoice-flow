// ─── reportController.js ─────────────────────────────────────────────────────
const { query } = require('../config/db');

const revenue = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const [monthly, topClients, summary] = await Promise.all([
      query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', issue_date), 'Mon') as month,
          DATE_TRUNC('month', issue_date) as month_date,
          COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0) as collected,
          COALESCE(SUM(total), 0) as invoiced,
          COUNT(*) as invoice_count
        FROM invoices
        WHERE company_id = $1 AND EXTRACT(YEAR FROM issue_date) = $2
        GROUP BY DATE_TRUNC('month', issue_date)
        ORDER BY month_date`, [req.companyId, year]),
      query(`
        SELECT c.name, COALESCE(SUM(i.total) FILTER (WHERE i.status = 'paid'), 0) as revenue,
               COUNT(i.id) as invoice_count
        FROM clients c LEFT JOIN invoices i ON i.client_id = c.id
        WHERE c.company_id = $1 AND (i.id IS NULL OR EXTRACT(YEAR FROM i.issue_date) = $2)
        GROUP BY c.id, c.name ORDER BY revenue DESC LIMIT 10`, [req.companyId, year]),
      query(`
        SELECT
          COALESCE(SUM(total), 0) as total_invoiced,
          COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0) as total_collected,
          COALESCE(SUM(gst_amount), 0) as total_gst,
          COUNT(*) as total_invoices,
          COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
          COUNT(*) FILTER (WHERE status = 'overdue') as overdue_count
        FROM invoices WHERE company_id = $1 AND EXTRACT(YEAR FROM issue_date) = $2`,
        [req.companyId, year]),
    ]);
    res.json({ success: true, monthly: monthly.rows, topClients: topClients.rows, summary: summary.rows[0] });
  } catch (err) { next(err); }
};

const gst = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const result = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', issue_date), 'Mon') as month,
        DATE_TRUNC('month', issue_date) as month_date,
        COALESCE(SUM(taxable_amount), 0) as taxable,
        COALESCE(SUM(igst_amount), 0) as igst,
        COALESCE(SUM(cgst_amount), 0) as cgst,
        COALESCE(SUM(sgst_amount), 0) as sgst,
        COALESCE(SUM(gst_amount), 0) as total_gst
      FROM invoices
      WHERE company_id = $1 AND EXTRACT(YEAR FROM issue_date) = $2
      GROUP BY DATE_TRUNC('month', issue_date)
      ORDER BY month_date`, [req.companyId, year]);
    res.json({ success: true, monthly: result.rows });
  } catch (err) { next(err); }
};

const profitLoss = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const result = await query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', issue_date), 'Mon') as month,
        COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0) as revenue,
        COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0) * 0.22 as estimated_expenses
      FROM invoices
      WHERE company_id = $1 AND EXTRACT(YEAR FROM issue_date) = $2
      GROUP BY DATE_TRUNC('month', issue_date)
      ORDER BY DATE_TRUNC('month', issue_date)`, [req.companyId, year]);

    const rows = result.rows.map(r => ({
      ...r,
      revenue: parseFloat(r.revenue),
      expenses: parseFloat(r.estimated_expenses),
      profit: parseFloat(r.revenue) - parseFloat(r.estimated_expenses),
    }));
    res.json({ success: true, monthly: rows });
  } catch (err) { next(err); }
};

const reportController = { revenue, gst, profitLoss };


// ─── activityController.js ───────────────────────────────────────────────────
const listActivities = async (req, res, next) => {
  try {
    const { entity, page = 1, limit = 50, userId } = req.query;
    let where = ['a.company_id = $1'];
    let params = [req.companyId];
    let idx = 2;

    if (entity) { where.push(`a.entity_type = $${idx++}`); params.push(entity); }
    if (userId) { where.push(`a.user_id = $${idx++}`); params.push(userId); }
    if (req.user.role === 'employee') {
      where.push(`a.user_id = $${idx++}`);
      params.push(req.user.id);
    }

    const result = await query(
      `SELECT a.*, u.name as user_name FROM activities a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE ${where.join(' AND ')}
       ORDER BY a.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, (parseInt(page) - 1) * parseInt(limit)]
    );
    res.json({
      success: true,
      activities: result.rows.map(r => ({
        id: r.id, action: r.action, description: r.description,
        entityType: r.entity_type, entityId: r.entity_id,
        createdAt: r.created_at,
        user: { id: r.user_id, name: r.user_name || 'System' },
      })),
    });
  } catch (err) { next(err); }
};

const activityController = { list: listActivities };


// ─── companyController.js ────────────────────────────────────────────────────
const getCompany = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM companies WHERE id = $1', [req.companyId]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Company not found' });
    const c = result.rows[0];
    res.json({
      success: true,
      company: {
        id: c.id, name: c.name, address: c.address, city: c.city, state: c.state,
        pincode: c.pincode, gstin: c.gstin, pan: c.pan, email: c.email,
        phone: c.phone, website: c.website, logoUrl: c.logo_url,
        bankName: c.bank_name, accountNumber: c.account_number, ifsc: c.ifsc,
        invoicePrefix: c.invoice_prefix, paymentTerms: c.payment_terms,
        defaultNotes: c.default_notes, cgstRate: c.cgst_rate,
        sgstRate: c.sgst_rate, igstRate: c.igst_rate,
      },
    });
  } catch (err) { next(err); }
};

const updateCompany = async (req, res, next) => {
  try {
    const {
      companyName, address, city, state, pincode, gstin, pan, email, phone, website,
      bankName, accountNumber, ifsc, invoicePrefix, paymentTerms, defaultNotes,
      cgstRate, sgstRate, igstRate,
    } = req.body;

    await query(`
      UPDATE companies SET
        name=$1, address=$2, city=$3, state=$4, pincode=$5, gstin=$6, pan=$7,
        email=$8, phone=$9, website=$10, bank_name=$11, account_number=$12, ifsc=$13,
        invoice_prefix=$14, payment_terms=$15, default_notes=$16,
        cgst_rate=$17, sgst_rate=$18, igst_rate=$19, updated_at=NOW()
      WHERE id=$20`,
      [companyName, address, city, state, pincode, gstin, pan, email, phone, website,
       bankName, accountNumber, ifsc, invoicePrefix, paymentTerms, defaultNotes,
       cgstRate, sgstRate, igstRate, req.companyId]
    );
    res.json({ success: true, message: 'Company updated' });
  } catch (err) { next(err); }
};

const companyController = { get: getCompany, update: updateCompany };

module.exports = { reportController, activityController, companyController };