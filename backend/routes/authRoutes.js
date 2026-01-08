const express = require('express');
const router = express.Router();
const { register, login, linkWallet, getCurrentUser } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/register', register);

router.post('/login', login);

router.put('/wallet', authenticateToken, linkWallet);

router.get('/me', authenticateToken, getCurrentUser);

module.exports = router;
