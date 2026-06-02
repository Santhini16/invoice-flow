const express = require('express');
const router  = express.Router();

const auth                    = require('../middleware/auth');
const { validate, rules }     = require('../middleware/validate');
const {
  signup,
  login,
  me,
  changePassword,
} = require('../controllers/authController');

// POST /api/auth/signup
router.post('/signup', signup);

// POST /api/auth/login
router.post('/login', rules.login, validate, login);

// GET /api/auth/me
router.get('/me', auth, me);

// PUT /api/auth/change-password
router.put('/change-password', auth, changePassword);

module.exports = router;