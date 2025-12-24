const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username, email, dan password harus diisi'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password minimal 6 karakter'
            });
        }

        const [existingUsers] = await pool.query(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existingUsers.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Username atau email sudah terdaftar'
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const [result] = await pool.query(
            'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, 'user']
        );

        const token = jwt.sign(
            { userId: result.insertId },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Registrasi berhasil',
            data: {
                id: result.insertId,
                username,
                email,
                role: 'user',
                token
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email dan password harus diisi'
            });
        }

        const [users] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Email atau password salah'
            });
        }

        const user = users[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Email atau password salah'
            });
        }

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            message: 'Login berhasil',
            data: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                wallet_address: user.wallet_address,
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

const linkWallet = async (req, res) => {
    try {
        const { wallet_address } = req.body;
        const userId = req.user.id;

        if (!wallet_address) {
            return res.status(400).json({
                success: false,
                message: 'Wallet address harus diisi'
            });
        }

        const walletRegex = /^0x[a-fA-F0-9]{40}$/;
        if (!walletRegex.test(wallet_address)) {
            return res.status(400).json({
                success: false,
                message: 'Format wallet address tidak valid'
            });
        }

        const [existingWallet] = await pool.query(
            'SELECT id FROM users WHERE wallet_address = ? AND id != ?',
            [wallet_address.toLowerCase(), userId]
        );

        if (existingWallet.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Wallet address sudah digunakan user lain'
            });
        }

        await pool.query(
            'UPDATE users SET wallet_address = ? WHERE id = ?',
            [wallet_address.toLowerCase(), userId]
        );

        res.json({
            success: true,
            message: 'Wallet berhasil dihubungkan',
            data: {
                wallet_address: wallet_address.toLowerCase()
            }
        });
    } catch (error) {
        console.error('Link wallet error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

const getCurrentUser = async (req, res) => {
    try {
        res.json({
            success: true,
            data: req.user
        });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
};

module.exports = { register, login, linkWallet, getCurrentUser };
