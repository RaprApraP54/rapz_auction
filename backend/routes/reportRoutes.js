const express = require('express');
const router = express.Router();
const {
    getAdminMonthlyReport,
    downloadAdminMonthlyPDF,
    getUserActivityReport,
    downloadUserActivityPDF
} = require('../controllers/reportController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Admin routes
router.get('/admin/monthly', authenticateToken, requireAdmin, getAdminMonthlyReport);
router.get('/admin/monthly/pdf', authenticateToken, requireAdmin, downloadAdminMonthlyPDF);

// User routes
router.get('/user/activity', authenticateToken, getUserActivityReport);
router.get('/user/activity/pdf', authenticateToken, downloadUserActivityPDF);

module.exports = router;
