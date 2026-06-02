const { query } = require('../config/db');
const { log }   = require('../services/activityService');
const path      = require('path');
const fs        = require('fs');

// GET /api/company
const get = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM companies WHERE id = $1', [req.companyId]);
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
    const c = result.rows[0];
    res.json({
      success: true,
      company: {
        id:             c.id,
        name:           c.name,
        address:        c.address,
        city:           c.city,
        state:          c.state,
        pincode:        c.pincode,
        gstin:          c.gstin,
        pan:            c.pan,
        email:          c.email,
        phone:          c.phone,
        website:        c.website,
        logoUrl:        c.logo_url,
        bankName:       c.bank_name,
        accountNumber:  c.account_number,
        ifsc:           c.ifsc,
        invoicePrefix:  c.invoice_prefix,
        paymentTerms:   c.payment_terms,
        defaultNotes:   c.default_notes,
        cgstRate:       parseFloat(c.cgst_rate),
        sgstRate:       parseFloat(c.sgst_rate),
        igstRate:       parseFloat(c.igst_rate),
        createdAt:      c.created_at,
        updatedAt:      c.updated_at,
      },
    });
  } catch (err) { next(err); }
};

// PUT /api/company
const update = async (req, res, next) => {
  try {
    const {
      companyName, address, city, state, pincode, gstin, pan,
      email, phone, website,
      bankName, accountNumber, ifsc,
      invoicePrefix, paymentTerms, defaultNotes,
      cgstRate, sgstRate, igstRate,
    } = req.body;

    if (!companyName) {
      return res.status(400).json({ success: false, message: 'Company name is required' });
    }

    await query(`
      UPDATE companies SET
        name            = $1,
        address         = $2,
        city            = $3,
        state           = $4,
        pincode         = $5,
        gstin           = $6,
        pan             = $7,
        email           = $8,
        phone           = $9,
        website         = $10,
        bank_name       = $11,
        account_number  = $12,
        ifsc            = $13,
        invoice_prefix  = $14,
        payment_terms   = $15,
        default_notes   = $16,
        cgst_rate       = $17,
        sgst_rate       = $18,
        igst_rate       = $19,
        updated_at      = NOW()
      WHERE id = $20`,
      [
        companyName, address, city, state, pincode, gstin, pan,
        email, phone, website,
        bankName, accountNumber, ifsc,
        invoicePrefix || 'INV', paymentTerms || 30, defaultNotes,
        cgstRate || 9, sgstRate || 9, igstRate || 18,
        req.companyId,
      ]
    );

    await log({
      companyId:   req.companyId,
      userId:      req.user.id,
      action:      'company_updated',
      description: 'Company settings updated',
      entityType:  'company',
      entityId:    req.companyId,
    });

    res.json({ success: true, message: 'Company settings saved' });
  } catch (err) { next(err); }
};

// POST /api/company/logo   (multipart/form-data, field name: logo)
const uploadLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const logoUrl = `/uploads/${req.file.filename}`;

    await query(
      'UPDATE companies SET logo_url = $1, updated_at = NOW() WHERE id = $2',
      [logoUrl, req.companyId]
    );

    res.json({ success: true, message: 'Logo uploaded', logoUrl });
  } catch (err) { next(err); }
};

module.exports = { get, update, uploadLogo };