const { query } = require('../config/db');
const { log } = require('../services/activityService');

const formatClient = (r) => ({
  id: r.id,
  name: r.name,
  email: r.email,
  phone: r.phone,
  address: r.address,
  city: r.city,
  state: r.state,
  pincode: r.pincode,
  gstin: r.gstin,
  pan: r.pan,
  isActive: r.is_active,
  createdAt: r.created_at,
  totalBilled: parseFloat(r.total_billed || 0),
  totalPaid: parseFloat(r.total_paid || 0),
  outstanding: parseFloat(r.outstanding || 0),
  invoiceCount: parseInt(r.invoice_count || 0),
});

const CLIENT_SELECT = `
  SELECT c.*,
    COALESCE(SUM(i.total), 0) as total_billed,
    COALESCE(SUM(i.total) FILTER (WHERE i.status = 'paid'), 0) as total_paid,
    COALESCE(SUM(i.total) FILTER (WHERE i.status IN ('sent','viewed','overdue')), 0) as outstanding,
    COUNT(i.id) as invoice_count
  FROM clients c
  LEFT JOIN invoices i ON i.client_id = c.id
`;

// GET /api/clients
const list = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const companyId = req.companyId;
    let params = [companyId];
    let where = 'c.company_id = $1';
    if (search) { where += ` AND (c.name ILIKE $2 OR c.email ILIKE $2 OR c.city ILIKE $2)`; params.push(`%${search}%`); }

    const result = await query(
      `${CLIENT_SELECT} WHERE ${where} GROUP BY c.id ORDER BY c.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, (parseInt(page) - 1) * parseInt(limit)]
    );
    const countRes = await query(`SELECT COUNT(*) FROM clients c WHERE ${where}`, params);

    res.json({ success: true, clients: result.rows.map(formatClient), total: parseInt(countRes.rows[0].count) });
  } catch (err) { next(err); }
};

// GET /api/clients/:id
const getOne = async (req, res, next) => {
  try {
    const result = await query(`${CLIENT_SELECT} WHERE c.id = $1 AND c.company_id = $2 GROUP BY c.id`, [req.params.id, req.companyId]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, client: formatClient(result.rows[0]) });
  } catch (err) { next(err); }
};

// GET /api/clients/:id/statement
const statement = async (req, res, next) => {
  try {
    const clientRes = await query('SELECT * FROM clients WHERE id = $1 AND company_id = $2', [req.params.id, req.companyId]);
    if (!clientRes.rows.length) return res.status(404).json({ success: false, message: 'Client not found' });

    const invoices = await query(
      `SELECT id, invoice_number, status, total, issue_date, due_date, paid_at
       FROM invoices WHERE client_id = $1 ORDER BY issue_date DESC`,
      [req.params.id]
    );

    const totals = invoices.rows.reduce((acc, inv) => {
      acc.totalBilled += parseFloat(inv.total);
      if (inv.status === 'paid') acc.totalPaid += parseFloat(inv.total);
      if (['sent','viewed','overdue'].includes(inv.status)) acc.outstanding += parseFloat(inv.total);
      return acc;
    }, { totalBilled: 0, totalPaid: 0, outstanding: 0 });

    res.json({
      success: true,
      client: clientRes.rows[0],
      invoices: invoices.rows,
      ...totals,
    });
  } catch (err) { next(err); }
};

// POST /api/clients
const create = async (req, res, next) => {
  try {
    const { name, email, phone, address, city, state, pincode, gstin, pan } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, message: 'Name and email required' });

    const result = await query(
      `INSERT INTO clients (company_id, created_by, name, email, phone, address, city, state, pincode, gstin, pan)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.companyId, req.user.id, name, email.toLowerCase(), phone, address, city, state, pincode, gstin, pan]
    );

    await log({ companyId: req.companyId, userId: req.user.id, action: 'client_created', description: `Client ${name} added`, entityType: 'client', entityId: result.rows[0].id });
    res.status(201).json({ success: true, message: 'Client created', client: formatClient(result.rows[0]) });
  } catch (err) { next(err); }
};

// PUT /api/clients/:id
const update = async (req, res, next) => {
  try {
    const { name, email, phone, address, city, state, pincode, gstin, pan } = req.body;
    const result = await query(
      `UPDATE clients SET name=$1,email=$2,phone=$3,address=$4,city=$5,state=$6,pincode=$7,gstin=$8,pan=$9,updated_at=NOW()
       WHERE id=$10 AND company_id=$11 RETURNING *`,
      [name, email, phone, address, city, state, pincode, gstin, pan, req.params.id, req.companyId]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Client not found' });

    await log({ companyId: req.companyId, userId: req.user.id, action: 'client_edited', description: `Client ${name} updated`, entityType: 'client', entityId: req.params.id });
    res.json({ success: true, message: 'Client updated', client: formatClient(result.rows[0]) });
  } catch (err) { next(err); }
};

// DELETE /api/clients/:id
const remove = async (req, res, next) => {
  try {
    const invCount = await query('SELECT COUNT(*) FROM invoices WHERE client_id = $1', [req.params.id]);
    if (parseInt(invCount.rows[0].count) > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete client with existing invoices' });
    }
    const result = await query('DELETE FROM clients WHERE id = $1 AND company_id = $2 RETURNING name', [req.params.id, req.companyId]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Client not found' });

    await log({ companyId: req.companyId, userId: req.user.id, action: 'client_deleted', description: `Client ${result.rows[0].name} deleted`, entityType: 'client', entityId: req.params.id });
    res.json({ success: true, message: 'Client deleted' });
  } catch (err) { next(err); }
};

module.exports = { list, getOne, statement, create, update, remove };