import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auctionAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import AuctionCard from '../components/AuctionCard';
import { Package, Search, Gavel, TrendingUp, Users, Plus, Sparkles } from 'lucide-react';
import './AuctionList.css';

const AuctionList = () => {
    const { isAuthenticated, isAdmin } = useAuth();
    const [auctions, setAuctions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchAuctions();
    }, []);

    const fetchAuctions = async () => {
        try {
            const response = await auctionAPI.getAll();
            setAuctions(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Calculate real status based on blockchain time
    const getRealStatus = (auction) => {
        if (auction.status === 'ended' || auction.status === 'stopped') {
            return auction.status;
        }
        if (auction.status === 'active' && auction.blockchain?.endTime) {
            const now = Math.floor(Date.now() / 1000);
            if (now >= auction.blockchain.endTime) {
                return 'ended';
            }
        }
        if (auction.blockchain?.isFinalized || auction.blockchain?.isActive === false) {
            return 'ended';
        }
        return auction.status;
    };

    const filteredAuctions = auctions.filter(auction => {
        const realStatus = getRealStatus(auction);
        const matchesFilter = filter === 'all' || realStatus === filter;
        const matchesSearch = auction.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            auction.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const stats = {
        total: auctions.length,
        active: auctions.filter(a => getRealStatus(a) === 'active').length,
        totalBids: auctions.reduce((sum, a) => sum + (a.participants?.length || 0), 0)
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Memuat daftar lelang...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <p>Error: {error}</p>
                <button className="btn btn-primary" onClick={fetchAuctions}>Coba Lagi</button>
            </div>
        );
    }

    return (
        <div className="auction-list-page">
            {/* Hero Section */}
            <div className="list-hero">
                <div className="hero-content">
                    <h1>
                        <Sparkles size={32} className="hero-icon" />
                        Jelajahi Lelang
                    </h1>
                    <p>Temukan barang unik dan langka dari seluruh pengguna platform</p>
                </div>

                {/* Stats */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">
                            <Package size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.total}</span>
                            <span className="stat-label">Total Lelang</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon active">
                            <Gavel size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.active}</span>
                            <span className="stat-label">Sedang Aktif</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon participants">
                            <Users size={24} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.totalBids}</span>
                            <span className="stat-label">Total Peserta</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="controls-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Cari lelang..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="filter-bar">
                    <button
                        className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        Semua
                    </button>
                    <button
                        className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
                        onClick={() => setFilter('active')}
                    >
                        Aktif
                    </button>
                    <button
                        className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
                        onClick={() => setFilter('pending')}
                    >
                        Menunggu
                    </button>
                    <button
                        className={`filter-btn ${filter === 'ended' ? 'active' : ''}`}
                        onClick={() => setFilter('ended')}
                    >
                        Berakhir
                    </button>
                </div>

                {isAuthenticated && !isAdmin && (
                    <Link to="/auctions/create" className="btn btn-primary create-btn">
                        <Plus size={18} /> Buat Lelang
                    </Link>
                )}
            </div>

            {/* Results */}
            {filteredAuctions.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-illustration">
                        <div className="empty-circle">
                            <Package size={48} />
                        </div>
                        <div className="empty-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                    <h3>Tidak Ada Lelang</h3>
                    <p>
                        {searchQuery
                            ? `Tidak ditemukan lelang dengan kata kunci "${searchQuery}"`
                            : 'Belum ada lelang yang tersedia saat ini'}
                    </p>
                    {isAuthenticated && !isAdmin && (
                        <Link to="/auctions/create" className="btn btn-primary">
                            <Plus size={18} /> Buat Lelang Pertama
                        </Link>
                    )}
                </div>
            ) : (
                <>
                    <div className="results-info">
                        <span>{filteredAuctions.length} lelang ditemukan</span>
                    </div>
                    <div className="auction-grid">
                        {filteredAuctions.map(auction => (
                            <AuctionCard key={auction.id} auction={auction} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default AuctionList;

