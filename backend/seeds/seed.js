/**
 * Database Seeder - Seperti Laravel Seeder
 * Jalankan: node seeds/seed.js
 */

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const seedUsers = [
    {
        username: 'admin',
        email: 'admin@auction.com',
        password: 'admin123',
        role: 'admin'
    },
    {
        username: 'user1',
        email: 'user1@test.com',
        password: 'user123',
        role: 'user'
    },
    {
        username: 'user2',
        email: 'user2@test.com',
        password: 'user123',
        role: 'user'
    }
];

async function seed() {
    console.log('[INFO] Starting database seeder...\n');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'auction_db'
    });

    try {
        // Clear existing users (optional - comment out if you want to keep existing)
        console.log('[INFO] Clearing existing users...');
        await connection.query('DELETE FROM users');

        // Seed users
        console.log('[INFO] Seeding users...\n');

        for (const user of seedUsers) {
            const hashedPassword = await bcrypt.hash(user.password, 10);

            await connection.query(
                'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                [user.username, user.email, hashedPassword, user.role]
            );

            console.log(`   [OK] Created ${user.role}: ${user.email} (password: ${user.password})`);
        }

        console.log('\n========================================');
        console.log('[SUCCESS] Seeding completed successfully!');
        console.log('========================================\n');
        console.log('Admin Login:');
        console.log('  Email: admin@auction.com');
        console.log('  Password: admin123\n');
        console.log('User Login:');
        console.log('  Email: user1@test.com');
        console.log('  Password: user123\n');

    } catch (error) {
        console.error('[ERROR] Seeding failed:', error.message);
    } finally {
        await connection.end();
    }
}

seed();
