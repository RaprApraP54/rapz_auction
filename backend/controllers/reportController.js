const { pool } = require('../config/db');
const PDFDocument = require('pdfkit');

// ============================================
// ADMIN REPORTS
// ============================================

// Get admin monthly report data
const getAdminMonthlyReport = async (req, res) => {
    try {
        const { month } = req.query; // Format: 2026-01

        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({
                success: false,
                message: 'Format bulan harus YYYY-MM (contoh: 2026-01)'
            });
        }

        const startDate = `${month}-01`;
        const endDate = new Date(month + '-01');
        endDate.setMonth(endDate.getMonth() + 1);
        const endDateStr = endDate.toISOString().split('T')[0];

        // Get auction statistics
        const [auctionStats] = await pool.query(`
            SELECT 
                COUNT(*) as total_auctions,
                SUM(CASE WHEN status = 'ended' THEN 1 ELSE 0 END) as ended_count,
                SUM(CASE WHEN status = 'stopped' THEN 1 ELSE 0 END) as stopped_count,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count
            FROM auctions
            WHERE created_at >= ? AND created_at < ?
        `, [startDate, endDateStr]);

        // Get participant statistics
        const [participantStats] = await pool.query(`
            SELECT 
                COUNT(DISTINCT ap.user_id) as total_participants,
                COUNT(*) as total_participations
            FROM auction_participants ap
            JOIN auctions a ON ap.auction_id = a.id
            WHERE a.created_at >= ? AND a.created_at < ?
        `, [startDate, endDateStr]);

        // Get bid statistics
        const [bidStats] = await pool.query(`
            SELECT 
                COUNT(*) as total_bids,
                COALESCE(SUM(bid_amount), 0) as total_bid_amount,
                COALESCE(AVG(bid_amount), 0) as avg_bid_amount
            FROM bidding_logs bl
            JOIN auctions a ON bl.auction_id = a.id
            WHERE a.created_at >= ? AND a.created_at < ?
        `, [startDate, endDateStr]);

        // Get auction results
        const [resultStats] = await pool.query(`
            SELECT 
                COUNT(*) as total_results,
                SUM(CASE WHEN result_type = 'WON' THEN 1 ELSE 0 END) as won_count,
                SUM(CASE WHEN result_type = 'NO_BIDS' THEN 1 ELSE 0 END) as no_bids_count,
                SUM(CASE WHEN result_type = 'STOPPED' THEN 1 ELSE 0 END) as stopped_results,
                COALESCE(SUM(highest_bid), 0) as total_winning_bids
            FROM auction_results ar
            JOIN auctions a ON ar.auction_id = a.id
            WHERE a.created_at >= ? AND a.created_at < ?
        `, [startDate, endDateStr]);

        // Get top 5 auctions by highest bid
        const [topAuctions] = await pool.query(`
            SELECT 
                a.id,
                a.title,
                a.status,
                ar.highest_bid,
                ar.winner_wallet,
                ar.total_participants
            FROM auctions a
            LEFT JOIN auction_results ar ON a.id = ar.auction_id
            WHERE a.created_at >= ? AND a.created_at < ?
            ORDER BY ar.highest_bid DESC
            LIMIT 5
        `, [startDate, endDateStr]);

        // Get list of all auctions in the month
        const [auctionList] = await pool.query(`
            SELECT 
                a.id,
                a.title,
                a.status,
                a.starting_bid,
                a.created_at,
                u.username as owner_username,
                ar.highest_bid,
                ar.winner_wallet,
                ar.result_type
            FROM auctions a
            JOIN users u ON a.owner_id = u.id
            LEFT JOIN auction_results ar ON a.id = ar.auction_id
            WHERE a.created_at >= ? AND a.created_at < ?
            ORDER BY a.created_at DESC
        `, [startDate, endDateStr]);

        res.json({
            success: true,
            data: {
                month,
                auctions: auctionStats[0],
                participants: participantStats[0],
                bids: bidStats[0],
                results: resultStats[0],
                topAuctions,
                auctionList
            }
        });
    } catch (error) {
        console.error('Admin monthly report error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Download admin monthly report as PDF
const downloadAdminMonthlyPDF = async (req, res) => {
    try {
        const { month } = req.query;

        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({
                success: false,
                message: 'Format bulan harus YYYY-MM'
            });
        }

        const startDate = `${month}-01`;
        const endDate = new Date(month + '-01');
        endDate.setMonth(endDate.getMonth() + 1);
        const endDateStr = endDate.toISOString().split('T')[0];

        // Fetch all data
        const [auctionStats] = await pool.query(`
            SELECT 
                COUNT(*) as total_auctions,
                SUM(CASE WHEN status = 'ended' THEN 1 ELSE 0 END) as ended_count,
                SUM(CASE WHEN status = 'stopped' THEN 1 ELSE 0 END) as stopped_count
            FROM auctions
            WHERE created_at >= ? AND created_at < ?
        `, [startDate, endDateStr]);

        const [auctionList] = await pool.query(`
            SELECT 
                a.id,
                a.title,
                a.status,
                a.starting_bid,
                u.username as owner_username,
                ar.highest_bid,
                ar.result_type
            FROM auctions a
            JOIN users u ON a.owner_id = u.id
            LEFT JOIN auction_results ar ON a.id = ar.auction_id
            WHERE a.created_at >= ? AND a.created_at < ?
            ORDER BY a.created_at DESC
        `, [startDate, endDateStr]);

        // Create PDF
        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=laporan-admin-${month}.pdf`);

        doc.pipe(res);

        // Title
        doc.fontSize(20).font('Helvetica-Bold').text('LAPORAN LELANG BULANAN', { align: 'center' });
        doc.fontSize(14).font('Helvetica').text(`Periode: ${month}`, { align: 'center' });
        doc.moveDown(2);

        // Statistics
        doc.fontSize(14).font('Helvetica-Bold').text('Ringkasan Statistik');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica');
        doc.text(`Total Lelang: ${auctionStats[0].total_auctions}`);
        doc.text(`Lelang Berakhir: ${auctionStats[0].ended_count}`);
        doc.text(`Lelang Dihentikan: ${auctionStats[0].stopped_count}`);
        doc.moveDown(2);

        // Auction list table
        doc.fontSize(14).font('Helvetica-Bold').text('Daftar Lelang');
        doc.moveDown(0.5);

        // Table header
        const tableTop = doc.y;
        const col1 = 50, col2 = 100, col3 = 280, col4 = 350, col5 = 420;

        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('ID', col1, tableTop);
        doc.text('Judul', col2, tableTop);
        doc.text('Status', col3, tableTop);
        doc.text('Bid Awal', col4, tableTop);
        doc.text('Bid Tertinggi', col5, tableTop);

        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

        // Table rows
        let y = tableTop + 25;
        doc.font('Helvetica').fontSize(9);

        for (const auction of auctionList.slice(0, 20)) { // Limit to 20 rows
            if (y > 700) {
                doc.addPage();
                y = 50;
            }
            doc.text(auction.id.toString(), col1, y);
            doc.text(auction.title.substring(0, 25), col2, y);
            doc.text(auction.status, col3, y);
            doc.text(`${auction.starting_bid} ETH`, col4, y);
            doc.text(auction.highest_bid ? `${auction.highest_bid} ETH` : '-', col5, y);
            y += 20;
        }

        // Footer
        doc.fontSize(8).text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 50, 750, { align: 'center' });

        doc.end();
    } catch (error) {
        console.error('Download admin PDF error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal membuat PDF'
        });
    }
};

// ============================================
// USER REPORTS
// ============================================

// Get user activity report
const getUserActivityReport = async (req, res) => {
    try {
        const userId = req.user.id;
        const { month } = req.query;

        let dateFilter = '';
        let dateParams = [userId];

        if (month && /^\d{4}-\d{2}$/.test(month)) {
            const startDate = `${month}-01`;
            const endDate = new Date(month + '-01');
            endDate.setMonth(endDate.getMonth() + 1);
            dateFilter = 'AND a.created_at >= ? AND a.created_at < ?';
            dateParams.push(startDate, endDate.toISOString().split('T')[0]);
        }

        // Auctions participated - with user_result showing if THIS user won or lost
        const [participated] = await pool.query(`
            SELECT 
                a.id,
                a.title,
                a.status,
                a.starting_bid,
                ap.joined_at,
                ar.highest_bid,
                ar.winner_wallet,
                ar.winner_user_id,
                ar.result_type,
                CASE 
                    WHEN ar.result_type IS NULL THEN 'PENDING'
                    WHEN ar.result_type = 'NO_BIDS' THEN 'NO_BIDS'
                    WHEN ar.winner_user_id = ? THEN 'WON'
                    ELSE 'LOSE'
                END as user_result
            FROM auction_participants ap
            JOIN auctions a ON ap.auction_id = a.id
            LEFT JOIN auction_results ar ON a.id = ar.auction_id
            WHERE ap.user_id = ? ${dateFilter}
            ORDER BY ap.joined_at DESC
        `, [userId, ...dateParams]);

        // Auctions won
        const [won] = await pool.query(`
            SELECT 
                a.id,
                a.title,
                ar.highest_bid,
                ar.finalized_at
            FROM auction_results ar
            JOIN auctions a ON ar.auction_id = a.id
            WHERE ar.winner_user_id = ? ${dateFilter.replace('a.created_at', 'ar.finalized_at')}
            ORDER BY ar.finalized_at DESC
        `, dateParams);

        // Bid history
        const [bids] = await pool.query(`
            SELECT 
                a.id as auction_id,
                a.title,
                bl.bid_amount,
                bl.tx_hash,
                bl.created_at
            FROM bidding_logs bl
            JOIN auctions a ON bl.auction_id = a.id
            WHERE bl.user_id = ? ${dateFilter}
            ORDER BY bl.created_at DESC
            LIMIT 50
        `, dateParams);

        // Calculate totals
        const totalParticipated = participated.length;
        const totalWon = won.length;
        const totalBidAmount = bids.reduce((sum, b) => sum + parseFloat(b.bid_amount || 0), 0);

        res.json({
            success: true,
            data: {
                month: month || 'all',
                summary: {
                    totalParticipated,
                    totalWon,
                    totalBids: bids.length,
                    totalBidAmount: totalBidAmount.toFixed(8)
                },
                participated,
                won,
                recentBids: bids
            }
        });
    } catch (error) {
        console.error('User activity report error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

// Download user activity report as PDF
const downloadUserActivityPDF = async (req, res) => {
    try {
        const userId = req.user.id;
        const { month } = req.query;

        // Get user info
        const [users] = await pool.query('SELECT username FROM users WHERE id = ?', [userId]);
        const username = users[0]?.username || 'User';

        let dateFilter = '';
        let dateParams = [userId];
        let periodText = 'Semua Waktu';

        if (month && /^\d{4}-\d{2}$/.test(month)) {
            const startDate = `${month}-01`;
            const endDate = new Date(month + '-01');
            endDate.setMonth(endDate.getMonth() + 1);
            dateFilter = 'AND a.created_at >= ? AND a.created_at < ?';
            dateParams.push(startDate, endDate.toISOString().split('T')[0]);
            periodText = month;
        }

        // Fetch data - with user_result showing if THIS user won or lost
        const [participated] = await pool.query(`
            SELECT a.id, a.title, a.status, ar.highest_bid, ar.result_type, ar.winner_user_id,
                CASE 
                    WHEN ar.result_type IS NULL THEN 'PENDING'
                    WHEN ar.result_type = 'NO_BIDS' THEN 'NO_BIDS'
                    WHEN ar.winner_user_id = ? THEN 'WON'
                    ELSE 'LOSE'
                END as user_result
            FROM auction_participants ap
            JOIN auctions a ON ap.auction_id = a.id
            LEFT JOIN auction_results ar ON a.id = ar.auction_id
            WHERE ap.user_id = ? ${dateFilter}
            ORDER BY ap.joined_at DESC
        `, [userId, ...dateParams]);

        const [won] = await pool.query(`
            SELECT a.id, a.title, ar.highest_bid, ar.finalized_at
            FROM auction_results ar
            JOIN auctions a ON ar.auction_id = a.id
            WHERE ar.winner_user_id = ? ${dateFilter.replace('a.created_at', 'ar.finalized_at')}
        `, dateParams);

        // Create PDF
        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=laporan-aktivitas-${username}-${month || 'all'}.pdf`);

        doc.pipe(res);

        // Title
        doc.fontSize(20).font('Helvetica-Bold').text('LAPORAN AKTIVITAS LELANG', { align: 'center' });
        doc.fontSize(12).font('Helvetica').text(`User: ${username}`, { align: 'center' });
        doc.text(`Periode: ${periodText}`, { align: 'center' });
        doc.moveDown(2);

        // Summary
        doc.fontSize(14).font('Helvetica-Bold').text('Ringkasan');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica');
        doc.text(`Lelang Diikuti: ${participated.length}`);
        doc.text(`Lelang Dimenangkan: ${won.length}`);
        doc.moveDown(2);

        // Won auctions
        if (won.length > 0) {
            doc.fontSize(14).font('Helvetica-Bold').text('Lelang yang Dimenangkan');
            doc.moveDown(0.5);

            for (const w of won) {
                doc.fontSize(10).font('Helvetica');
                doc.text(`• ${w.title} - ${w.highest_bid} ETH`);
            }
            doc.moveDown(2);
        }

        // Participated auctions
        doc.fontSize(14).font('Helvetica-Bold').text('Lelang yang Diikuti');
        doc.moveDown(0.5);

        const tableTop = doc.y;
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('ID', 50, tableTop);
        doc.text('Judul', 80, tableTop);
        doc.text('Status', 280, tableTop);
        doc.text('Hasil', 350, tableTop);
        doc.text('Bid Tertinggi', 450, tableTop);

        doc.moveTo(50, tableTop + 12).lineTo(550, tableTop + 12).stroke();

        let y = tableTop + 20;
        doc.font('Helvetica');

        for (const p of participated.slice(0, 25)) {
            if (y > 700) {
                doc.addPage();
                y = 50;
            }
            doc.text(p.id.toString(), 50, y);
            doc.text(p.title.substring(0, 30), 80, y);
            doc.text(p.status, 280, y);
            doc.text(p.user_result || '-', 350, y);
            doc.text(p.highest_bid ? `${p.highest_bid} ETH` : '-', 450, y);
            y += 18;
        }

        // Footer
        doc.fontSize(8).text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 50, 750, { align: 'center' });

        doc.end();
    } catch (error) {
        console.error('Download user PDF error:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal membuat PDF'
        });
    }
};

module.exports = {
    getAdminMonthlyReport,
    downloadAdminMonthlyPDF,
    getUserActivityReport,
    downloadUserActivityPDF
};
