require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
    console.log('🔧 Starting database setup...\n');

    let connection;

    try {
        // 1. Connect to MySQL (without database)
        console.log('📡 Connecting to MySQL server...');
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true
        });
        console.log('✅ Connected to MySQL server\n');

        // 2. Check if database exists
        console.log('🔍 Checking if database exists...');
        const [databases] = await connection.query(
            `SHOW DATABASES LIKE '${process.env.DB_NAME || 'auction_db'}'`
        );

        if (databases.length === 0) {
            console.log('❌ Database does not exist. Creating...\n');

            // 3. Read and execute SQL file
            const sqlFilePath = path.join(__dirname, '../database/auction_db.sql');

            if (!fs.existsSync(sqlFilePath)) {
                throw new Error(`SQL file not found at: ${sqlFilePath}`);
            }

            console.log('📄 Reading SQL file...');
            const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

            console.log('⚙️  Executing SQL statements...');
            await connection.query(sqlContent);

            console.log('✅ Database created successfully!\n');
        } else {
            console.log('✅ Database already exists\n');
        }

        // 4. Switch to the database
        await connection.query(`USE ${process.env.DB_NAME || 'auction_db'}`);

        // 5. Check tables
        console.log('📊 Checking tables...');
        const [tables] = await connection.query('SHOW TABLES');

        if (tables.length === 0) {
            console.log('❌ No tables found. Running migrations...\n');

            const sqlFilePath = path.join(__dirname, '../database/auction_db.sql');
            const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
            await connection.query(sqlContent);

            console.log('✅ Tables created successfully!\n');
        } else {
            console.log('✅ Tables found:');
            tables.forEach(table => {
                console.log(`   - ${Object.values(table)[0]}`);
            });
            console.log('');
        }

        // 6. Verify table structure
        console.log('🔍 Verifying table structures...');
        const requiredTables = ['users', 'auctions', 'auction_participants'];

        for (const tableName of requiredTables) {
            const [columns] = await connection.query(`DESCRIBE ${tableName}`);
            console.log(`\n📋 Table: ${tableName} (${columns.length} columns)`);
            columns.forEach(col => {
                console.log(`   - ${col.Field} (${col.Type}) ${col.Key === 'PRI' ? '[PRIMARY KEY]' : ''}`);
            });
        }

        console.log('\n✅ Database setup completed successfully!');
        console.log('\n📝 Summary:');
        console.log(`   Database: ${process.env.DB_NAME || 'auction_db'}`);
        console.log(`   Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
        console.log(`   User: ${process.env.DB_USER || 'root'}`);
        console.log(`   Tables: ${tables.length}`);

    } catch (error) {
        console.error('\n❌ Error during database setup:');
        console.error(error.message);

        if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 Tips:');
            console.error('   1. Make sure XAMPP MySQL is running');
            console.error('   2. Check if port 3306 is not blocked');
            console.error('   3. Verify MySQL service is started in XAMPP Control Panel');
        }

        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Database connection closed');
        }
    }
}

// Run setup
setupDatabase();
