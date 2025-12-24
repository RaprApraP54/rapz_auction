const express = require('express');
const router = express.Router();
const {
    getAllAuctions,
    getAuctionById,
    createAuction,
    updateContractAuctionId,
    joinAuction,
    getLeaderboard,
    finalizeAuctionStatus
} = require('../controllers/auctionController');
const { authenticateToken, requireWallet } = require('../middleware/auth');

router.get('/', getAllAuctions);

router.get('/:id', getAuctionById);

router.post('/', authenticateToken, requireWallet, createAuction);

router.put('/:id/contract', authenticateToken, requireWallet, updateContractAuctionId);

router.post('/:id/join', authenticateToken, requireWallet, joinAuction);

router.get('/:id/leaderboard', getLeaderboard);

// Finalize auction status - update database when blockchain auction ends
router.post('/:id/finalize', authenticateToken, finalizeAuctionStatus);

module.exports = router;

