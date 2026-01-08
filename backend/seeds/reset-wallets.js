/**
 * Script untuk reset wallet address semua user
 * Jalankan: node seeds/reset-wallets.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetWallets() {
    console.log('[INFO] Resetting all wallet addresses...\n');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'auction_db'
    });

    try {
        await connection.query('UPDATE users SET wallet_address = NULL');
        console.log('[OK] All wallet addresses have been reset to NULL');
        console.log('\nSekarang user bisa connect wallet lagi tanpa konflik.');
    } catch (error) {
        console.error('[ERROR]', error.message);
    } finally {
        await connection.end();
    }
}

resetWallets();
