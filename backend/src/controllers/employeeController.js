// ─── employeeController.js ───────────────────────────────────────────────────
const { query } = require('../config/db');
const bcrypt = require('bcryptjs');
const { log } = require('../services/activityService');

const fmt = r => ({
  id: r.id, name: r.name, email: r.email, phone: r.phone,
  role: r.role, department: r.department, isActive: r.is_active,
  joinedAt: r.created_at, lastActive: r.last_login_at,
  invoicesCreated: parseInt(r.invoices_created || 0),
});

const list = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT u.*, COUNT(i.id) as invoices_created
      FROM users u
      LEFT JOIN invoices i ON i.created_by = u.id
      WHERE u.company_id = $1
      GROUP BY u.id ORDER BY u.created_at DESC`, [req.companyId]);
    res.json({ success: true, employees: result.rows.map(fmt) });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT u.*, COUNT(i.id) as invoices_created FROM users u
      LEFT JOIN invoices i ON i.created_by = u.id
      WHERE u.id = $1 AND u.company_id = $2 GROUP BY u.id`, [req.params.id, req.companyId]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Employee not found' });
    res.json({ success: true, employee: fmt(result.rows[0]) });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { name, email, password, phone, department, role = 'employee' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Name, email, password required' });
    const hash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (company_id, name, email, password_hash, role, phone, department)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.companyId, name, email.toLowerCase(), hash, role, phone, department]
    );
    await log({ companyId: req.companyId, userId: req.user.id, action: 'employee_added', description: `${name} added as ${role}`, entityType: 'employee', entityId: result.rows[0].id });
    res.status(201).json({ success: true, message: 'Employee created', employee: fmt(result.rows[0]) });
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { name, email, phone, department, isActive } = req.body;
    const result = await query(
      `UPDATE users SET name=$1,email=$2,phone=$3,department=$4,is_active=$5,updated_at=NOW()
       WHERE id=$6 AND company_id=$7 RETURNING *`,
      [name, email, phone, department, isActive !== undefined ? isActive : true, req.params.id, req.companyId]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Employee not found' });
    await log({ companyId: req.companyId, userId: req.user.id, action: 'employee_updated', description: `${name} updated`, entityType: 'employee', entityId: req.params.id });
    res.json({ success: true, message: 'Employee updated', employee: fmt(result.rows[0]) });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    const result = await query('UPDATE users SET is_active = false WHERE id = $1 AND company_id = $2 RETURNING name', [req.params.id, req.companyId]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Employee not found' });
    await log({ companyId: req.companyId, userId: req.user.id, action: 'employee_removed', description: `${result.rows[0].name} deactivated`, entityType: 'employee', entityId: req.params.id });
    res.json({ success: true, message: 'Employee deactivated' });
  } catch (err) { next(err); }
};

module.exports = { list, getOne, create, update, remove };