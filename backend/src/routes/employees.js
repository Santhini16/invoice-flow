const express = require('express');
const router  = express.Router();

const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const {
  list,
  getOne,
  create,
  update,
  remove,
} = require('../controllers/employeeController');

// All employee routes are admin-only
router.use(auth, rbac('admin'));

// GET /api/employees
router.get('/', list);

// GET /api/employees/:id
router.get('/:id', getOne);

// POST /api/employees
router.post('/', create);

// PUT /api/employees/:id
router.put('/:id', update);

// DELETE /api/employees/:id  (soft-delete: sets is_active = false)
router.delete('/:id', remove);

module.exports = router;