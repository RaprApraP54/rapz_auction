require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { testConnection } = require('./config/db');
const { initializeContract } = require('./config/contract');
const { startAutoFinalize } = require('./services/autoFinalize');

const authRoutes = require('./routes/authRoutes');
const auctionRoutes = require('./routes/auctionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc)
        if (!origin) return callback(null, true);

        // Allow localhost on any port for development
        if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
            return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

app.use('/api/auth', authRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/reports', reportRoutes);

// Root endpoint - API info
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Sistem Lelang Web3 API',
        version: '1.0.0',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                wallet: 'PUT /api/auth/wallet',
                me: 'GET /api/auth/me'
            },
            auctions: {
                list: 'GET /api/auctions',
                detail: 'GET /api/auctions/:id',
                create: 'POST /api/auctions',
                join: 'POST /api/auctions/:id/join',
                leaderboard: 'GET /api/auctions/:id/leaderboard'
            },
            admin: {
                list: 'GET /api/admin/auctions',
                update: 'PUT /api/admin/auctions/:id',
                delete: 'DELETE /api/admin/auctions/:id',
                stop: 'POST /api/admin/auctions/:id/stop',
                deliveries: 'GET /api/admin/deliveries',
                updateDelivery: 'PUT /api/admin/deliveries/:id'
            },
            delivery: {
                myWins: 'GET /api/delivery/my-wins',
                getByAuction: 'GET /api/delivery/auction/:auctionId',
                submitAddress: 'POST /api/delivery/auction/:auctionId'
            }
        }
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server berjalan dengan baik',
        timestamp: new Date().toISOString()
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint tidak ditemukan'
    });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan internal server'
    });
});

const startServer = async () => {
    console.log('Memulai server...');

    const dbConnected = await testConnection();
    if (!dbConnected) {
        console.error('Gagal terhubung ke database. Pastikan XAMPP MySQL sudah berjalan.');
        process.exit(1);
    }

    initializeContract();

    app.listen(PORT, () => {
        console.log(`Server berjalan di http://localhost:${PORT}`);
        console.log('Endpoints tersedia:');
        console.log('  - POST   /api/auth/register');
        console.log('  - POST   /api/auth/login');
        console.log('  - PUT    /api/auth/wallet');
        console.log('  - GET    /api/auth/me');
        console.log('  - GET    /api/auctions');
        console.log('  - GET    /api/auctions/:id');
        console.log('  - POST   /api/auctions');
        console.log('  - POST   /api/auctions/:id/join');
        console.log('  - GET    /api/auctions/:id/leaderboard');
        console.log('  - GET    /api/admin/auctions');
        console.log('  - PUT    /api/admin/auctions/:id');
        console.log('  - DELETE /api/admin/auctions/:id');
        console.log('  - POST   /api/admin/auctions/:id/stop');

        // Start auto-finalize service (check every 30 seconds)
        startAutoFinalize(30);
    });
};

startServer();

