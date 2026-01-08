const { pool } = require('./config/db');
const bcrypt = require('bcryptjs');

const resetDatabase = async () => {
    console.log('[INFO] Memulai reset database...\n');

    try {
        // Disable foreign key checks
        await pool.query('SET FOREIGN_KEY_CHECKS = 0');

        // Truncate all tables in correct order
        const tables = [
            'deliveries',
            'auction_results',
            'bidding_logs',
            'admin_actions',
            'auction_participants',
            'auctions',
            'users'
        ];

        for (const table of tables) {
            try {
                await pool.query(`TRUNCATE TABLE ${table}`);
                console.log(`[OK] Tabel ${table} berhasil dikosongkan`);
            } catch (err) {
                console.log(`[WARN] Tabel ${table} tidak ada atau error: ${err.message}`);
            }
        }

        // Re-enable foreign key checks
        await pool.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('\n[INFO] Membuat akun admin...');

        // Create admin account
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await pool.query(
            `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`,
            ['admin', 'admin@auction.com', hashedPassword, 'admin']
        );
        console.log('[OK] Admin account created');
        console.log('  Email: admin@auction.com');
        console.log('  Password: admin123');

        // Create 3 test users
        const userPassword = await bcrypt.hash('user123', 10);

        await pool.query(
            `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`,
            ['user1', 'user1@test.com', userPassword, 'user']
        );
        console.log('\n[OK] User 1 created: user1@test.com / user123');

        await pool.query(
            `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`,
            ['user2', 'user2@test.com', userPassword, 'user']
        );
        console.log('[OK] User 2 created: user2@test.com / user123');

        await pool.query(
            `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`,
            ['user3', 'user3@test.com', userPassword, 'user']
        );
        console.log('[OK] User 3 created: user3@test.com / user123');

        console.log('\n[SUCCESS] Database berhasil di-reset!');
        console.log('\n[INFO] Langkah selanjutnya:');
        console.log('1. Restart Hardhat node: npx hardhat node');
        console.log('2. Redeploy contract: npx hardhat run scripts/deploy.js --network localhost');
        console.log('3. Update VITE_CONTRACT_ADDRESS di frontend/.env');
        console.log('4. Start backend & frontend');

    } catch (error) {
        console.error('[ERROR] Error resetting database:', error.message);
    } finally {
        process.exit(0);
    }
};

resetDatabase();
