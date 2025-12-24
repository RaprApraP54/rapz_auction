import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { Flame, ArrowRight, Wallet, Link2, Coins, Zap, Shield, UserPlus, Gavel, Trophy } from 'lucide-react';
import './Home.css';

const Home = () => {
    const { isAuthenticated } = useAuth();
    const { isConnected, connectWallet, isConnecting } = useWallet();

    return (
        <div className="home">
            <section className="hero">
                <div className="hero-container">
                    <div className="hero-left">
                        <div className="hero-badge">
                            <Flame size={16} />
                            <span>Platform Lelang Terdesentralisasi</span>
                        </div>

                        <h1>
                            Lelang <span className="highlight">Digital</span> dengan
                            Teknologi <span className="highlight">Blockchain</span>
                        </h1>

                        <p className="hero-desc">
                            Transaksi aman, transparan, dan tidak dapat dimanipulasi.
                            Semua bid tercatat permanen di Ethereum blockchain.
                        </p>

                        <div className="hero-actions">
                            {!isAuthenticated ? (
                                <>
                                    <Link to="/register" className="btn btn-primary btn-lg">
                                        Mulai Gratis <ArrowRight size={18} />
                                    </Link>
                                    <Link to="/auctions" className="btn btn-outline btn-lg">
                                        Lihat Lelang
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link to="/auctions" className="btn btn-primary btn-lg">
                                        Jelajahi Lelang <ArrowRight size={18} />
                                    </Link>
                                    {!isConnected && (
                                        <button
                                            className="btn btn-outline btn-lg"
                                            onClick={connectWallet}
                                            disabled={isConnecting}
                                        >
                                            <Wallet size={18} />
                                            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="hero-stats">
                            <div className="stat">
                                <span className="stat-value">100%</span>
                                <span className="stat-label">Transparan</span>
                            </div>
                            <div className="stat">
                                <span className="stat-value">0%</span>
                                <span className="stat-label">Fee Platform</span>
                            </div>
                            <div className="stat">
                                <span className="stat-value">
                                    <Shield size={28} style={{ display: 'inline-block', verticalAlign: 'middle' }} />
                                </span>
                                <span className="stat-label">Keamanan</span>
                            </div>
                        </div>
                    </div>

                    <div className="hero-right">
                        <div className="hero-cards">
                            <div className="hero-card card-1">
                                <div className="card-icon">
                                    <Link2 size={32} color="#818cf8" />
                                </div>
                                <h3>Blockchain</h3>
                                <p>Semua bid dicatat di Ethereum</p>
                            </div>
                            <div className="hero-card card-2">
                                <div className="card-icon">
                                    <Wallet size={32} color="#ec4899" />
                                </div>
                                <h3>Metamask</h3>
                                <p>Transaksi via wallet</p>
                            </div>
                            <div className="hero-card card-3">
                                <div className="card-icon">
                                    <Coins size={32} color="#22c55e" />
                                </div>
                                <h3>Refund Otomatis</h3>
                                <p>Kalah bid? ETH dikembalikan</p>
                            </div>
                            <div className="hero-card card-4">
                                <div className="card-icon">
                                    <Zap size={32} color="#eab308" />
                                </div>
                                <h3>Realtime</h3>
                                <p>Update langsung dari chain</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="features">
                <div className="section-container">
                    <div className="section-header">
                        <span className="section-tag">Panduan</span>
                        <h2>Cara Menggunakan</h2>
                    </div>

                    <div className="steps">
                        <div className="step">
                            <div className="step-icon">
                                <UserPlus size={28} />
                            </div>
                            <h3>Buat Akun</h3>
                            <p>Daftar dengan email dan password. Gratis tanpa biaya apapun.</p>
                        </div>

                        <div className="step">
                            <div className="step-icon">
                                <Wallet size={28} />
                            </div>
                            <h3>Connect Wallet</h3>
                            <p>Hubungkan Metamask untuk melakukan transaksi blockchain.</p>
                        </div>

                        <div className="step">
                            <div className="step-icon">
                                <Gavel size={28} />
                            </div>
                            <h3>Join & Bid</h3>
                            <p>Pilih lelang yang diinginkan, join, dan tempatkan bid Anda.</p>
                        </div>

                        <div className="step">
                            <div className="step-icon">
                                <Trophy size={28} />
                            </div>
                            <h3>Menang!</h3>
                            <p>Bid tertinggi saat waktu habis adalah pemenang lelang.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="cta">
                <div className="section-container">
                    <div className="cta-card">
                        <div className="cta-content">
                            <h2>Siap Memulai Lelang?</h2>
                            <p>Bergabung sekarang dan mulai pengalaman lelang blockchain pertama Anda.</p>
                        </div>
                        <Link to="/register" className="btn btn-primary btn-lg">
                            Daftar Sekarang <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
