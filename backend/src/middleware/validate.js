const { validationResult } = require('express-validator');

// Run after express-validator chains — returns 400 if any errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// Common validator chains (import { body } from express-validator alongside these)
const rules = {
  login: [
    require('express-validator').body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
    require('express-validator').body('password').notEmpty().withMessage('Password required'),
  ],
  createInvoice: [
    require('express-validator').body('invoiceNumber').notEmpty().withMessage('Invoice number required'),
    require('express-validator').body('clientId').isUUID().withMessage('Valid client ID required'),
    require('express-validator').body('issueDate').isDate().withMessage('Valid issue date required'),
    require('express-validator').body('dueDate').isDate().withMessage('Valid due date required'),
    require('express-validator').body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  ],
  createClient: [
    require('express-validator').body('name').notEmpty().withMessage('Client name required'),
    require('express-validator').body('email').isEmail().withMessage('Valid email required'),
  ],
};

module.exports = { validate, rules };