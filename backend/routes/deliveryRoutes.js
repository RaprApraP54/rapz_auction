const express = require('express');
const router = express.Router();
const {
    getDeliveryByAuction,
    submitDeliveryAddress,
    getMyWonAuctions
} = require('../controllers/deliveryController');
const { authenticateToken } = require('../middleware/auth');

// Get user's won auctions with delivery status
router.get('/my-wins', authenticateToken, getMyWonAuctions);

// Get delivery info for a specific auction
router.get('/auction/:auctionId', authenticateToken, getDeliveryByAuction);

// Submit delivery address (winner only)
router.post('/auction/:auctionId', authenticateToken, submitDeliveryAddress);

module.exports = router;
