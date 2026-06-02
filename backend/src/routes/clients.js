const express = require('express');
const router  = express.Router();

const auth                = require('../middleware/auth');
const rbac                = require('../middleware/rbac');
const { validate, rules } = require('../middleware/validate');
const {
  list,
  getOne,
  statement,
  create,
  update,
  remove,
} = require('../controllers/clientController');

// GET /api/clients
// Query params: search, page, limit
router.get('/', auth, list);

// GET /api/clients/:id
router.get('/:id', auth, getOne);

// GET /api/clients/:id/statement
// Full billing statement with all invoices for this client
router.get('/:id/statement', auth, statement);

// POST /api/clients
router.post('/', auth, rules.createClient, validate, create);

// PUT /api/clients/:id
router.put('/:id', auth, update);

// DELETE /api/clients/:id   — Admin only (client may have invoices)
router.delete('/:id', auth, rbac('admin'), remove);

module.exports = router;