const express = require('express');
const router = express.Router();
const {
    getAllAuctionsAdmin,
    updateAuction,
    deleteAuction,
    stopAuction,
    confirmStopAuction,
    getAllUsers
} = require('../controllers/adminController');
const {
    getAllDeliveries,
    updateDeliveryStatus
} = require('../controllers/deliveryController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

router.use(authenticateToken);
router.use(requireAdmin);

router.get('/auctions', getAllAuctionsAdmin);

router.put('/auctions/:id', updateAuction);

router.delete('/auctions/:id', deleteAuction);

router.post('/auctions/:id/stop', stopAuction);

router.post('/auctions/:id/confirm-stop', confirmStopAuction);

router.get('/users', getAllUsers);

// Delivery management
router.get('/deliveries', getAllDeliveries);
router.put('/deliveries/:id', updateDeliveryStatus);

module.exports = router;

