const { pool } = require('../config/db');
const {
    getAuctionFromContract,
    getLeaderboardFromContract,
    getRemainingTime
} = require('../config/contract');

const getAllAuctions = async (req, res) => {
    try {
        const [auctions] = await pool.query(`
            SELECT 
                a.*,
                u.username as owner_username,
                u.wallet_address as owner_wallet
            FROM auctions a
            JOIN users u ON a.owner_id = u.id
            ORDER BY a.created_at DESC
        `);

        const auctionsWithBlockchainData = await Promise.all(
            auctions.map(async (auction) => {
                let blockchainData = null;
                let remainingTime = null;

                if (auction.contract_auction_id !== null) {
                    blockchainData = await getAuctionFromContract(auction.contract_auction_id);
                    remainingTime = await getRemainingTime(auction.contract_auction_id);
                }

                return {
                    ...auction,
                    blockchain: blockchainData,
                    remaining_time: remainingTime
                };
            })
        );

        res.json({
            success: true,
            data: auctionsWithBlockchainData
        });
    } catch (error) {
        console.error('Get all auctions error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

const getAuctionById = async (req, res) => {
    try {
        const { id } = req.params;

        const [auctions] = await pool.query(`
            SELECT 
                a.*,
                u.username as owner_username,
                u.wallet_address as owner_wallet
            FROM auctions a
            JOIN users u ON a.owner_id = u.id
            WHERE a.id = ?
        `, [id]);

        if (auctions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lelang tidak ditemukan'
            });
        }

        const auction = auctions[0];
        let blockchainData = null;
        let leaderboard = null;
        let remainingTime = null;

        if (auction.contract_auction_id !== null) {
            blockchainData = await getAuctionFromContract(auction.contract_auction_id);
            leaderboard = await getLeaderboardFromContract(auction.contract_auction_id);
            remainingTime = await getRemainingTime(auction.contract_auction_id);
        }

        const [participants] = await pool.query(`
            SELECT 
                ap.*,
                u.username,
                u.wallet_address
            FROM auction_participants ap
            JOIN users u ON ap.user_id = u.id
            WHERE ap.auction_id = ?
        `, [id]);

        res.json({
            success: true,
            data: {
                ...auction,
                blockchain: blockchainData,
                leaderboard,
                remaining_time: remainingTime,
                participants
            }
        });
    } catch (error) {
        console.error('Get auction by id error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

const createAuction = async (req, res) => {
    try {
        const { title, description, image_url, starting_bid, min_bid_increment, duration_minutes } = req.body;
        const ownerId = req.user.id;

        if (!title || !starting_bid || !min_bid_increment || !duration_minutes) {
            return res.status(400).json({
                success: false,
                message: 'Title, starting bid, min bid increment, dan duration harus diisi'
            });
        }

        if (starting_bid <= 0 || min_bid_increment <= 0 || duration_minutes <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Nilai bid dan duration harus lebih dari 0'
            });
        }

        const [result] = await pool.query(`
            INSERT INTO auctions 
            (title, description, image_url, owner_id, starting_bid, min_bid_increment, duration_minutes, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        `, [title, description || null, image_url || null, ownerId, starting_bid, min_bid_increment, duration_minutes]);

        const [newAuction] = await pool.query('SELECT * FROM auctions WHERE id = ?', [result.insertId]);

        res.status(201).json({
            success: true,
            message: 'Lelang berhasil dibuat. Silakan deploy ke blockchain melalui Metamask.',
            data: newAuction[0]
        });
    } catch (error) {
        console.error('Create auction error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

const updateContractAuctionId = async (req, res) => {
    try {
        const { id } = req.params;
        const { contract_auction_id } = req.body;
        const userId = req.user.id;

        const [auctions] = await pool.query(
            'SELECT * FROM auctions WHERE id = ? AND owner_id = ?',
            [id, userId]
        );

        if (auctions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lelang tidak ditemukan atau bukan milik Anda'
            });
        }

        await pool.query(
            'UPDATE auctions SET contract_auction_id = ?, status = ? WHERE id = ?',
            [contract_auction_id, 'active', id]
        );

        res.json({
            success: true,
            message: 'Contract auction ID berhasil diupdate',
            data: { contract_auction_id }
        });
    } catch (error) {
        console.error('Update contract auction id error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

const joinAuction = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        if (req.user.role === 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin tidak dapat bergabung ke lelang'
            });
        }

        const [auctions] = await pool.query(
            'SELECT * FROM auctions WHERE id = ?',
            [id]
        );

        if (auctions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lelang tidak ditemukan'
            });
        }

        const auction = auctions[0];

        if (auction.owner_id === userId) {
            return res.status(403).json({
                success: false,
                message: 'Anda tidak dapat bergabung ke lelang milik sendiri'
            });
        }

        if (auction.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: 'Lelang tidak aktif'
            });
        }

        const [existing] = await pool.query(
            'SELECT * FROM auction_participants WHERE auction_id = ? AND user_id = ?',
            [id, userId]
        );

        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Anda sudah bergabung ke lelang ini'
            });
        }

        await pool.query(
            'INSERT INTO auction_participants (auction_id, user_id) VALUES (?, ?)',
            [id, userId]
        );

        res.json({
            success: true,
            message: 'Berhasil bergabung ke lelang'
        });
    } catch (error) {
        console.error('Join auction error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

const getLeaderboard = async (req, res) => {
    try {
        const { id } = req.params;

        const [auctions] = await pool.query(
            'SELECT contract_auction_id FROM auctions WHERE id = ?',
            [id]
        );

        if (auctions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lelang tidak ditemukan'
            });
        }

        const contractAuctionId = auctions[0].contract_auction_id;

        if (contractAuctionId === null) {
            return res.status(400).json({
                success: false,
                message: 'Lelang belum aktif di blockchain'
            });
        }

        const leaderboard = await getLeaderboardFromContract(contractAuctionId);

        if (!leaderboard) {
            return res.status(500).json({
                success: false,
                message: 'Gagal mengambil data leaderboard dari blockchain'
            });
        }

        res.json({
            success: true,
            data: leaderboard
        });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Finalize auction - update status to ended in database
const finalizeAuctionStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const [auctions] = await pool.query(
            'SELECT * FROM auctions WHERE id = ?',
            [id]
        );

        if (auctions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lelang tidak ditemukan'
            });
        }

        const auction = auctions[0];

        // Get blockchain data to verify finalization
        if (auction.contract_auction_id !== null) {
            const blockchainData = await getAuctionFromContract(auction.contract_auction_id);

            // Update status if finalized or time has ended
            if (blockchainData && (blockchainData.isFinalized || !blockchainData.isActive)) {
                await pool.query(
                    'UPDATE auctions SET status = ? WHERE id = ?',
                    ['ended', id]
                );

                // Store auction result in auction_results table if exists
                try {
                    const leaderboard = await getLeaderboardFromContract(auction.contract_auction_id);
                    if (leaderboard && leaderboard.totalBidders > 0) {
                        await pool.query(`
                            INSERT INTO auction_results (auction_id, winner_wallet, highest_bid, total_participants, result_type, finalized_at)
                            VALUES (?, ?, ?, ?, 'WON', NOW())
                            ON DUPLICATE KEY UPDATE 
                                winner_wallet = VALUES(winner_wallet),
                                highest_bid = VALUES(highest_bid),
                                total_participants = VALUES(total_participants),
                                result_type = VALUES(result_type),
                                finalized_at = NOW()
                        `, [id, leaderboard.highestBidder, leaderboard.highestBid, leaderboard.totalBidders]);
                    } else {
                        // No bids - save with NO_BIDS result
                        await pool.query(`
                            INSERT INTO auction_results (auction_id, result_type, finalized_at)
                            VALUES (?, 'NO_BIDS', NOW())
                            ON DUPLICATE KEY UPDATE 
                                result_type = VALUES(result_type),
                                finalized_at = NOW()
                        `, [id]);
                    }
                } catch (resultError) {
                    console.log('Could not save auction result:', resultError.message);
                }

                return res.json({
                    success: true,
                    message: 'Status lelang berhasil diperbarui ke ended',
                    data: { status: 'ended' }
                });
            }
        }

        res.json({
            success: true,
            message: 'Lelang belum berakhir atau belum difinalisasi',
            data: { status: auction.status }
        });
    } catch (error) {
        console.error('Finalize auction status error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

module.exports = {
    getAllAuctions,
    getAuctionById,
    createAuction,
    updateContractAuctionId,
    joinAuction,
    getLeaderboard,
    finalizeAuctionStatus
};

