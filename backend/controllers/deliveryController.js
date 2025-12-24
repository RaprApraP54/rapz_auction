const { pool } = require('../config/db');

// Get delivery status for a specific auction (for winner)
const getDeliveryByAuction = async (req, res) => {
    try {
        const { auctionId } = req.params;
        const userId = req.user.id;

        // Check if user is the winner
        const [results] = await pool.query(`
            SELECT ar.*, a.title as auction_title
            FROM auction_results ar
            JOIN auctions a ON ar.auction_id = a.id
            WHERE ar.auction_id = ?
        `, [auctionId]);

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Hasil lelang tidak ditemukan'
            });
        }

        const result = results[0];

        // Get delivery info if exists
        const [deliveries] = await pool.query(`
            SELECT * FROM deliveries WHERE auction_result_id = ?
        `, [result.id]);

        res.json({
            success: true,
            data: {
                auctionResult: result,
                delivery: deliveries.length > 0 ? deliveries[0] : null
            }
        });
    } catch (error) {
        console.error('Get delivery error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Submit delivery address (for winner)
const submitDeliveryAddress = async (req, res) => {
    try {
        const { auctionId } = req.params;
        const { recipient_name, recipient_address, recipient_phone, notes } = req.body;
        const userId = req.user.id;

        // Validate required fields
        if (!recipient_name || !recipient_address || !recipient_phone) {
            return res.status(400).json({
                success: false,
                message: 'Nama, alamat, dan nomor telepon harus diisi'
            });
        }

        // Get auction result
        const [results] = await pool.query(`
            SELECT ar.* FROM auction_results ar
            WHERE ar.auction_id = ?
        `, [auctionId]);

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Hasil lelang tidak ditemukan'
            });
        }

        const auctionResult = results[0];

        // Check if delivery already exists
        const [existing] = await pool.query(`
            SELECT id FROM deliveries WHERE auction_result_id = ?
        `, [auctionResult.id]);

        if (existing.length > 0) {
            // Update existing
            await pool.query(`
                UPDATE deliveries 
                SET recipient_name = ?, recipient_address = ?, recipient_phone = ?, notes = ?
                WHERE auction_result_id = ?
            `, [recipient_name, recipient_address, recipient_phone, notes || null, auctionResult.id]);
        } else {
            // Create new
            await pool.query(`
                INSERT INTO deliveries (auction_result_id, recipient_name, recipient_address, recipient_phone, notes, status)
                VALUES (?, ?, ?, ?, ?, 'PENDING')
            `, [auctionResult.id, recipient_name, recipient_address, recipient_phone, notes || null]);
        }

        res.json({
            success: true,
            message: 'Alamat pengiriman berhasil disimpan'
        });
    } catch (error) {
        console.error('Submit delivery address error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Get all deliveries (for admin)
const getAllDeliveries = async (req, res) => {
    try {
        const [deliveries] = await pool.query(`
            SELECT 
                d.*,
                ar.auction_id,
                ar.winner_wallet,
                ar.highest_bid,
                ar.result_type,
                a.title as auction_title,
                a.owner_id
            FROM deliveries d
            JOIN auction_results ar ON d.auction_result_id = ar.id
            JOIN auctions a ON ar.auction_id = a.id
            ORDER BY d.created_at DESC
        `);

        res.json({
            success: true,
            data: deliveries
        });
    } catch (error) {
        console.error('Get all deliveries error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Update delivery status (for admin)
const updateDeliveryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, tracking_number, courier } = req.body;

        const validStatuses = ['PENDING', 'PROCESSING', 'SENT', 'RECEIVED', 'CANCELLED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status tidak valid'
            });
        }

        const updateFields = ['status = ?'];
        const updateValues = [status];

        if (tracking_number !== undefined) {
            updateFields.push('tracking_number = ?');
            updateValues.push(tracking_number);
        }

        if (courier !== undefined) {
            updateFields.push('courier = ?');
            updateValues.push(courier);
        }

        if (status === 'SENT') {
            updateFields.push('sent_at = NOW()');
        }

        if (status === 'RECEIVED') {
            updateFields.push('received_at = NOW()');
        }

        updateValues.push(id);

        await pool.query(`
            UPDATE deliveries SET ${updateFields.join(', ')} WHERE id = ?
        `, updateValues);

        res.json({
            success: true,
            message: 'Status pengiriman berhasil diupdate'
        });
    } catch (error) {
        console.error('Update delivery status error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Get user's won auctions with delivery status
const getMyWonAuctions = async (req, res) => {
    try {
        const userId = req.user.id;
        const userWallet = req.user.wallet_address;

        if (!userWallet) {
            return res.json({
                success: true,
                data: []
            });
        }

        const [wonAuctions] = await pool.query(`
            SELECT 
                ar.*,
                a.title as auction_title,
                a.description as auction_description,
                a.image_url,
                d.id as delivery_id,
                d.status as delivery_status,
                d.tracking_number,
                d.courier
            FROM auction_results ar
            JOIN auctions a ON ar.auction_id = a.id
            LEFT JOIN deliveries d ON ar.id = d.auction_result_id
            WHERE LOWER(ar.winner_wallet) = LOWER(?)
            ORDER BY ar.finalized_at DESC
        `, [userWallet]);

        res.json({
            success: true,
            data: wonAuctions
        });
    } catch (error) {
        console.error('Get my won auctions error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

module.exports = {
    getDeliveryByAuction,
    submitDeliveryAddress,
    getAllDeliveries,
    updateDeliveryStatus,
    getMyWonAuctions
};
