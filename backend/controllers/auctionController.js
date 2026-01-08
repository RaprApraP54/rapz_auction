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

            // Auto-finalize: if blockchain says finalized but DB still shows active/pending
            if (blockchainData && (blockchainData.isFinalized || !blockchainData.isActive)) {
                if (auction.status === 'active' || auction.status === 'pending') {
                    // Update auction status to ended
                    await pool.query('UPDATE auctions SET status = ? WHERE id = ?', ['ended', id]);
                    auction.status = 'ended';

                    // Save to auction_results if not already saved
                    try {
                        const [existingResult] = await pool.query(
                            'SELECT id FROM auction_results WHERE auction_id = ?',
                            [id]
                        );

                        if (existingResult.length === 0) {
                            if (leaderboard && leaderboard.totalBidders > 0) {
                                // Lookup winner user_id from wallet address
                                let winnerUserId = null;
                                try {
                                    const [winnerUsers] = await pool.query(
                                        'SELECT id FROM users WHERE LOWER(wallet_address) = LOWER(?)',
                                        [leaderboard.highestBidder]
                                    );
                                    if (winnerUsers.length > 0) {
                                        winnerUserId = winnerUsers[0].id;
                                    }
                                } catch (lookupErr) {
                                    console.log('[AUTO-FINALIZE] Could not lookup winner user:', lookupErr.message);
                                }

                                await pool.query(`
                                    INSERT INTO auction_results (auction_id, winner_user_id, winner_wallet, highest_bid, total_participants, result_type, finalized_at)
                                    VALUES (?, ?, ?, ?, ?, 'WON', NOW())
                                `, [id, winnerUserId, leaderboard.highestBidder, leaderboard.highestBid, leaderboard.totalBidders]);
                                console.log('[AUTO-FINALIZE] Saved winner for auction', id);
                            } else {
                                await pool.query(`
                                    INSERT INTO auction_results (auction_id, result_type, finalized_at)
                                    VALUES (?, 'NO_BIDS', NOW())
                                `, [id]);
                                console.log('[AUTO-FINALIZE] No bids for auction', id);
                            }
                        }
                    } catch (resultError) {
                        console.log('[AUTO-FINALIZE] Error saving result:', resultError.message);
                    }
                }
            }
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
        console.log(`[FINALIZE] Starting finalization for auction ID: ${id}`);

        const [auctions] = await pool.query(
            'SELECT * FROM auctions WHERE id = ?',
            [id]
        );

        if (auctions.length === 0) {
            console.log(`[FINALIZE] Auction ${id} not found in database`);
            return res.status(404).json({
                success: false,
                message: 'Lelang tidak ditemukan'
            });
        }

        const auction = auctions[0];
        console.log(`[FINALIZE] Auction found: contract_auction_id=${auction.contract_auction_id}, status=${auction.status}`);

        // Get blockchain data to verify finalization
        if (auction.contract_auction_id !== null) {
            const blockchainData = await getAuctionFromContract(auction.contract_auction_id);
            console.log(`[FINALIZE] Blockchain data:`, blockchainData);

            // Update status if finalized or time has ended
            if (blockchainData && (blockchainData.isFinalized || !blockchainData.isActive)) {
                console.log(`[FINALIZE] Auction is finalized/inactive, updating status to ended`);

                await pool.query(
                    'UPDATE auctions SET status = ? WHERE id = ?',
                    ['ended', id]
                );

                // Store auction result in auction_results table if exists
                try {
                    const leaderboard = await getLeaderboardFromContract(auction.contract_auction_id);
                    console.log(`[FINALIZE] Leaderboard data:`, leaderboard);

                    if (leaderboard && leaderboard.totalBidders > 0) {
                        console.log(`[FINALIZE] Has bidders, saving winner: ${leaderboard.highestBidder}`);

                        // Find winner user_id
                        let winnerUserId = null;
                        try {
                            const [winnerUsers] = await pool.query(
                                'SELECT id FROM users WHERE LOWER(wallet_address) = LOWER(?)',
                                [leaderboard.highestBidder]
                            );
                            if (winnerUsers.length > 0) {
                                winnerUserId = winnerUsers[0].id;
                            }
                            console.log(`[FINALIZE] Winner user_id: ${winnerUserId}`);
                        } catch (e) {
                            console.log(`[FINALIZE] Error finding winner user:`, e.message);
                        }

                        await pool.query(`
                            INSERT INTO auction_results (auction_id, winner_user_id, winner_wallet, highest_bid, total_participants, result_type, finalized_at)
                            VALUES (?, ?, ?, ?, ?, 'WON', NOW())
                            ON DUPLICATE KEY UPDATE 
                                winner_user_id = VALUES(winner_user_id),
                                winner_wallet = VALUES(winner_wallet),
                                highest_bid = VALUES(highest_bid),
                                total_participants = VALUES(total_participants),
                                result_type = VALUES(result_type),
                                finalized_at = NOW()
                        `, [id, winnerUserId, leaderboard.highestBidder, leaderboard.highestBid, leaderboard.totalBidders]);
                        console.log(`[FINALIZE] auction_results saved successfully!`);
                    } else {
                        console.log(`[FINALIZE] No bidders, saving NO_BIDS result`);
                        await pool.query(`
                            INSERT INTO auction_results (auction_id, result_type, finalized_at)
                            VALUES (?, 'NO_BIDS', NOW())
                            ON DUPLICATE KEY UPDATE 
                                result_type = VALUES(result_type),
                                finalized_at = NOW()
                        `, [id]);
                        console.log(`[FINALIZE] NO_BIDS result saved`);
                    }
                } catch (resultError) {
                    console.log('[FINALIZE] Error saving auction result:', resultError.message);
                }

                return res.json({
                    success: true,
                    message: 'Status lelang berhasil diperbarui ke ended',
                    data: { status: 'ended' }
                });
            } else {
                console.log(`[FINALIZE] Auction not finalized yet on blockchain`);
            }
        } else {
            console.log(`[FINALIZE] No contract_auction_id, skipping blockchain check`);
        }

        res.json({
            success: true,
            message: 'Lelang belum berakhir atau belum difinalisasi',
            data: { status: auction.status }
        });
    } catch (error) {
        console.error('[FINALIZE] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Log bid to database
const logBid = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, tx_hash } = req.body;
        const userId = req.user.id;

        if (!amount || !tx_hash) {
            return res.status(400).json({
                success: false,
                message: 'Amount dan tx_hash harus diisi'
            });
        }

        // Check auction exists
        const [auctions] = await pool.query('SELECT * FROM auctions WHERE id = ?', [id]);
        if (auctions.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lelang tidak ditemukan'
            });
        }

        // Insert to bidding_logs
        await pool.query(`
            INSERT INTO bidding_logs (auction_id, user_id, bid_amount, tx_hash)
            VALUES (?, ?, ?, ?)
        `, [id, userId, amount, tx_hash]);

        res.json({
            success: true,
            message: 'Bid berhasil dicatat'
        });
    } catch (error) {
        console.error('Log bid error:', error);
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
    finalizeAuctionStatus,
    logBid
};

