const express = require('express');
const router  = express.Router();

const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const { adminStats, employeeStats } = require('../controllers/dashboardController');

// GET /api/dashboard/admin     — Admin only
router.get('/admin',    auth, rbac('admin'),            adminStats);

// GET /api/dashboard/employee  — Admin + Employee
router.get('/employee', auth, rbac('admin', 'employee'), employeeStats);

module.exports = router;