const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        // Support token from header OR query string (for PDF downloads)
        let token = authHeader && authHeader.split(' ')[1];

        if (!token && req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Token tidak ditemukan'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const [rows] = await pool.query(
            'SELECT id, username, email, wallet_address, role FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User tidak ditemukan'
            });
        }

        req.user = rows[0];
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token sudah expired'
            });
        }
        return res.status(403).json({
            success: false,
            message: 'Token tidak valid'
        });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Akses ditolak. Hanya admin yang diizinkan.'
        });
    }
    next();
};

const requireWallet = (req, res, next) => {
    if (!req.user.wallet_address) {
        return res.status(403).json({
            success: false,
            message: 'Wallet belum terhubung. Silakan hubungkan wallet terlebih dahulu.'
        });
    }
    next();
};

module.exports = { authenticateToken, requireAdmin, requireWallet };
