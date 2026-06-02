const express = require('express');
const router  = express.Router();

const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const {
  createOrder,
  verify,
  webhook,
  list,
} = require('../controllers/paymentController');

// ─── Public (no auth) — called from client payment portal ────────────────────

// POST /api/payments/create-order
// Body: { invoiceId }
// Returns: Razorpay order object { orderId, amount, currency, ... }
router.post('/create-order', createOrder);

// POST /api/payments/verify
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceId }
// Verifies HMAC signature and marks invoice as paid
router.post('/verify', verify);

// POST /api/payments/webhook/razorpay
// Razorpay sends payment events here — configure in Razorpay Dashboard
// URL: https://yourdomain.com/api/payments/webhook/razorpay
router.post('/webhook/razorpay', webhook);

// ─── Protected — admin only ───────────────────────────────────────────────────

// GET /api/payments
// Query params: page, limit, status
router.get('/', auth, rbac('admin'), list);

module.exports = router;