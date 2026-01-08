const { pool } = require('../config/db');

const getAllAuctionsAdmin = async (req, res) => {
    try {
        const [auctions] = await pool.query(`
            SELECT 
                a.*,
                u.username as owner_username,
                u.wallet_address as owner_wallet,
                (SELECT COUNT(*) FROM auction_participants WHERE auction_id = a.id) as participant_count
            FROM auctions a
            JOIN users u ON a.owner_id = u.id
            ORDER BY a.created_at DESC
        `);

        res.json({
            success: true,
            data: auctions
        });
    } catch (error) {
        console.error('Admin get all auctions error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

const updateAuction = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, image_url, status } = req.body;

        const [auctions] = await pool.query('SELECT * FROM auctions WHERE id = ?', [id]);

        if (auctions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lelang tidak ditemukan'
            });
        }

        const updates = [];
        const values = [];

        if (title) {
            updates.push('title = ?');
            values.push(title);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }
        if (image_url !== undefined) {
            updates.push('image_url = ?');
            values.push(image_url);
        }
        if (status) {
            updates.push('status = ?');
            values.push(status);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada data yang diupdate'
            });
        }

        values.push(id);
        await pool.query(
            `UPDATE auctions SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        const [updatedAuction] = await pool.query('SELECT * FROM auctions WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Lelang berhasil diupdate',
            data: updatedAuction[0]
        });
    } catch (error) {
        console.error('Admin update auction error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

const deleteAuction = async (req, res) => {
    try {
        const { id } = req.params;

        const [auctions] = await pool.query('SELECT * FROM auctions WHERE id = ?', [id]);

        if (auctions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lelang tidak ditemukan'
            });
        }

        const auction = auctions[0];

        if (auction.status === 'active' && auction.contract_auction_id !== null) {
            return res.status(400).json({
                success: false,
                message: 'Tidak dapat menghapus lelang aktif. Hentikan lelang terlebih dahulu.'
            });
        }

        await pool.query('DELETE FROM auctions WHERE id = ?', [id]);

        res.json({
            success: true,
            message: 'Lelang berhasil dihapus'
        });
    } catch (error) {
        console.error('Admin delete auction error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

const stopAuction = async (req, res) => {
    try {
        const { id } = req.params;

        const [auctions] = await pool.query('SELECT * FROM auctions WHERE id = ?', [id]);

        if (auctions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lelang tidak ditemukan'
            });
        }

        const auction = auctions[0];

        if (auction.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Lelang tidak dalam status aktif'
            });
        }

        if (auction.contract_auction_id === null) {
            await pool.query(
                'UPDATE auctions SET status = ? WHERE id = ?',
                ['stopped', id]
            );

            return res.json({
                success: true,
                message: 'Lelang berhasil dihentikan',
                data: {
                    require_blockchain_stop: false
                }
            });
        }

        res.json({
            success: true,
            message: 'Silakan hentikan lelang melalui smart contract untuk refund semua bidder',
            data: {
                require_blockchain_stop: true,
                contract_auction_id: auction.contract_auction_id
            }
        });
    } catch (error) {
        console.error('Admin stop auction error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

const confirmStopAuction = async (req, res) => {
    try {
        const { id } = req.params;
        const { tx_hash, winner_wallet, highest_bid, total_participants } = req.body;

        // Update auction status
        await pool.query(
            'UPDATE auctions SET status = ? WHERE id = ?',
            ['stopped', id]
        );

        // Save to auction_results
        try {
            // Check if already exists
            const [existing] = await pool.query(
                'SELECT id FROM auction_results WHERE auction_id = ?',
                [id]
            );

            if (existing.length === 0) {
                // Find winner user_id if winner_wallet provided
                let winnerUserId = null;
                if (winner_wallet && winner_wallet !== '0x0000000000000000000000000000000000000000') {
                    const [winnerUsers] = await pool.query(
                        'SELECT id FROM users WHERE LOWER(wallet_address) = LOWER(?)',
                        [winner_wallet]
                    );
                    if (winnerUsers.length > 0) {
                        winnerUserId = winnerUsers[0].id;
                    }
                }

                if (winner_wallet && winner_wallet !== '0x0000000000000000000000000000000000000000') {
                    await pool.query(`
                        INSERT INTO auction_results (auction_id, winner_user_id, winner_wallet, highest_bid, total_participants, result_type, finalized_tx_hash, finalized_at)
                        VALUES (?, ?, ?, ?, ?, 'STOPPED', ?, NOW())
                    `, [id, winnerUserId, winner_wallet, highest_bid || 0, total_participants || 0, tx_hash]);
                } else {
                    await pool.query(`
                        INSERT INTO auction_results (auction_id, total_participants, result_type, finalized_tx_hash, finalized_at)
                        VALUES (?, ?, 'STOPPED', ?, NOW())
                    `, [id, total_participants || 0, tx_hash]);
                }
            }
        } catch (resultErr) {
            console.error('Error saving auction_results:', resultErr.message);
        }

        res.json({
            success: true,
            message: 'Status lelang berhasil diupdate ke stopped',
            data: { tx_hash }
        });
    } catch (error) {
        console.error('Confirm stop auction error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};


const getAllUsers = async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT id, username, email, wallet_address, role, created_at
            FROM users
            ORDER BY created_at DESC
        `);

        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Admin get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

module.exports = {
    getAllAuctionsAdmin,
    updateAuction,
    deleteAuction,
    stopAuction,
    confirmStopAuction,
    getAllUsers
};
