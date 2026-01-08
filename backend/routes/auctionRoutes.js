const express = require('express');
const router = express.Router();
const {
    getAllAuctions,
    getAuctionById,
    createAuction,
    updateContractAuctionId,
    joinAuction,
    getLeaderboard,
    finalizeAuctionStatus,
    logBid
} = require('../controllers/auctionController');
const { authenticateToken, requireWallet } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');

router.get('/', getAllAuctions);

router.get('/:id', getAuctionById);

router.post('/', authenticateToken, requireWallet, createAuction);

router.put('/:id/contract', authenticateToken, requireWallet, updateContractAuctionId);

router.post('/:id/join', authenticateToken, requireWallet, joinAuction);

router.get('/:id/leaderboard', getLeaderboard);

// Finalize auction status - update database when blockchain auction ends
router.post('/:id/finalize', authenticateToken, finalizeAuctionStatus);

// Log bid to database
router.post('/:id/bid-log', authenticateToken, requireWallet, logBid);

// Upload image for auction
router.post('/upload-image', authenticateToken, upload.single('image'), handleUploadError, (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'Tidak ada file yang diupload'
        });
    }

    const imageUrl = `http://localhost:${process.env.PORT || 5000}/uploads/${req.file.filename}`;

    res.json({
        success: true,
        message: 'Gambar berhasil diupload',
        data: {
            filename: req.file.filename,
            url: imageUrl
        }
    });
});

module.exports = router;
