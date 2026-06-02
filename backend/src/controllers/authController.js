const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { log } = require('../services/activityService');

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, companyId: user.company_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// POST /api/auth/signup
const signup = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role, companyName, phone } = req.body;

    if (!firstName || !lastName || !email || !password || !companyName) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (!['admin', 'employee'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Check email uniqueness
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Create company (or find existing by name for employees)
    let companyId;
    if (role === 'admin') {
      const compRes = await query(
        `INSERT INTO companies (name, email) VALUES ($1, $2) RETURNING id`,
        [companyName, email.toLowerCase()]
      );
      companyId = compRes.rows[0].id;
    } else {
      // Employee tries to join — find company by name
      const compRes = await query('SELECT id FROM companies WHERE name ILIKE $1 LIMIT 1', [companyName]);
      if (!compRes.rows.length) {
        return res.status(404).json({ success: false, message: 'Company not found. Contact your admin.' });
      }
      companyId = compRes.rows[0].id;
    }

    const hash = await bcrypt.hash(password, 12);
    const name = `${firstName} ${lastName}`;

    const userRes = await query(
      `INSERT INTO users (company_id, name, email, password_hash, role, phone)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, company_id, name, email, role`,
      [companyId, name, email.toLowerCase(), hash, role, phone || null]
    );

    const user = userRes.rows[0];
    const token = signToken(user);

    await log({
      companyId,
      userId: user.id,
      action: 'user_registered',
      description: `${name} registered as ${role}`,
      entityType: 'user',
      entityId: user.id,
    });

    res.status(201).json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, companyId: user.company_id },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const result = await query(
      `SELECT u.id, u.company_id, u.name, u.email, u.password_hash, u.role, u.is_active,
              c.name as company_name
       FROM users u
       JOIN companies c ON c.id = u.company_id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (!result.rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact admin.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Update last login
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const token = signToken(user);

    await log({
      companyId: user.company_id,
      userId: user.id,
      action: 'user_login',
      description: `${user.name} logged in`,
      entityType: 'user',
      entityId: user.id,
      ip: req.ip,
    });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.company_id,
        companyName: user.company_name,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const me = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.department, u.last_login_at,
              c.id as company_id, c.name as company_name, c.gstin, c.logo_url
       FROM users u
       JOIN companies c ON c.id = u.company_id
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!valid) return res.status(400).json({ success: false, message: 'Current password incorrect' });

    const hash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ success: true, message: 'Password changed' });
  } catch (err) {
    next(err);
  }
};

module.exports = { signup, login, me, changePassword };