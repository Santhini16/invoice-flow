const express = require('express');
const router  = express.Router();

const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const { revenue, gst, profitLoss } = require('../controllers/reportController');

// All report routes are admin-only
router.use(auth, rbac('admin'));

// GET /api/reports/revenue
// Query params: year (default: current year)
// Returns: monthly revenue, top clients, yearly summary, by-employee breakdown
router.get('/revenue', revenue);

// GET /api/reports/gst
// Query params: year
// Returns: monthly GST (IGST/CGST/SGST), annual summary, breakdown by rate slab
router.get('/gst', gst);

// GET /api/reports/profit-loss
// Query params: year
// Returns: monthly revenue, estimated expenses, gross profit, margin %
router.get('/profit-loss', profitLoss);

module.exports = router;