const { pool } = require('../config/db');
const {
    getAuctionFromContract,
    getLeaderboardFromContract,
    finalizeAuctionFromBackend
} = require('../config/contract');

let isRunning = false;

const checkAndFinalizeAuctions = async () => {
    if (isRunning) {
        console.log('[AUTO-FINALIZE] Previous check still running, skipping...');
        return;
    }

    isRunning = true;

    try {
        // Get active auctions from database
        const [activeAuctions] = await pool.query(`
            SELECT id, contract_auction_id, title 
            FROM auctions 
            WHERE status = 'active' AND contract_auction_id IS NOT NULL
        `);

        if (activeAuctions.length === 0) {
            isRunning = false;
            return;
        }

        console.log(`[AUTO-FINALIZE] Checking ${activeAuctions.length} active auctions...`);

        for (const auction of activeAuctions) {
            try {
                // Get blockchain data
                const blockchainData = await getAuctionFromContract(auction.contract_auction_id);

                if (!blockchainData) continue;

                // Check if auction has ended
                const currentTime = Math.floor(Date.now() / 1000);
                const hasEnded = currentTime >= blockchainData.endTime;
                const needsFinalization = hasEnded && !blockchainData.isFinalized && blockchainData.isActive;

                if (needsFinalization) {
                    console.log(`[AUTO-FINALIZE] Auction "${auction.title}" (ID: ${auction.id}) has ended. Finalizing...`);

                    // Call finalizeAuction on blockchain
                    const result = await finalizeAuctionFromBackend(auction.contract_auction_id);

                    if (result && result.success) {
                        // Update database status
                        await pool.query('UPDATE auctions SET status = ? WHERE id = ?', ['ended', auction.id]);

                        // Save auction result
                        const leaderboard = await getLeaderboardFromContract(auction.contract_auction_id);
                        if (leaderboard && leaderboard.totalBidders > 0) {
                            // Lookup winner user_id
                            let winnerUserId = null;
                            try {
                                const [winnerUsers] = await pool.query(
                                    'SELECT id FROM users WHERE LOWER(wallet_address) = LOWER(?)',
                                    [leaderboard.highestBidder]
                                );
                                if (winnerUsers.length > 0) {
                                    winnerUserId = winnerUsers[0].id;
                                }
                            } catch (e) { }

                            await pool.query(`
                                INSERT INTO auction_results (auction_id, winner_user_id, winner_wallet, highest_bid, total_participants, result_type, finalized_tx_hash, finalized_at)
                                VALUES (?, ?, ?, ?, ?, 'WON', ?, NOW())
                                ON DUPLICATE KEY UPDATE 
                                    winner_user_id = VALUES(winner_user_id),
                                    winner_wallet = VALUES(winner_wallet),
                                    highest_bid = VALUES(highest_bid),
                                    total_participants = VALUES(total_participants),
                                    finalized_tx_hash = VALUES(finalized_tx_hash)
                            `, [auction.id, winnerUserId, leaderboard.highestBidder, leaderboard.highestBid, leaderboard.totalBidders, result.txHash]);
                        } else {
                            await pool.query(`
                                INSERT INTO auction_results (auction_id, result_type, finalized_tx_hash, finalized_at)
                                VALUES (?, 'NO_BIDS', ?, NOW())
                                ON DUPLICATE KEY UPDATE 
                                    result_type = VALUES(result_type),
                                    finalized_tx_hash = VALUES(finalized_tx_hash)
                            `, [auction.id, result.txHash]);
                        }

                        console.log(`[AUTO-FINALIZE] Auction "${auction.title}" finalized successfully!`);
                    }
                } else if (blockchainData.isFinalized && !blockchainData.isActive) {
                    // Already finalized on blockchain, just update DB
                    await pool.query('UPDATE auctions SET status = ? WHERE id = ?', ['ended', auction.id]);
                }
            } catch (auctionError) {
                console.error(`[AUTO-FINALIZE] Error processing auction ${auction.id}:`, auctionError.message);
            }
        }
    } catch (error) {
        console.error('[AUTO-FINALIZE] Error in checkAndFinalizeAuctions:', error.message);
    } finally {
        isRunning = false;
    }
};

// Start the auto-finalize scheduler
const startAutoFinalize = (intervalSeconds = 30) => {
    console.log(`[AUTO-FINALIZE] Starting auto-finalize service (interval: ${intervalSeconds}s)`);

    // Run immediately once
    setTimeout(() => {
        checkAndFinalizeAuctions();
    }, 5000);

    // Then run at interval
    setInterval(() => {
        checkAndFinalizeAuctions();
    }, intervalSeconds * 1000);
};

module.exports = {
    checkAndFinalizeAuctions,
    startAutoFinalize
};
