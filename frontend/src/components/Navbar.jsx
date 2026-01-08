import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { Zap, LogOut, Wallet, Trophy, FileText } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
    const { user, isAuthenticated, isAdmin, logout } = useAuth();
    const { account, isConnected, isConnecting, connectWallet, disconnectWallet, formatAddress } = useWallet();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        disconnectWallet();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <Link to="/">
                    <Zap size={20} />
                    Sistem Lelang Web3
                </Link>
            </div>

            <div className="navbar-menu">
                <Link to="/auctions" className="navbar-link">Daftar Lelang</Link>

                {isAuthenticated && !isAdmin && (
                    <>
                        <Link to="/auctions/create" className="navbar-link">Buat Lelang</Link>
                        <Link to="/my-wins" className="navbar-link">
                            <Trophy size={16} /> Kemenangan
                        </Link>
                        <Link to="/my-reports" className="navbar-link">
                            <FileText size={16} /> Laporan
                        </Link>
                    </>
                )}

                {isAdmin && (
                    <>
                        <Link to="/admin" className="navbar-link">Dashboard Admin</Link>
                        <Link to="/admin/reports" className="navbar-link">
                            <FileText size={16} /> Laporan
                        </Link>
                    </>
                )}
            </div>

            <div className="navbar-actions">
                {isAuthenticated ? (
                    <>
                        {isConnected ? (
                            <div className="wallet-info">
                                <Wallet size={16} />
                                <span className="wallet-address">{formatAddress(account)}</span>
                                <button
                                    className="btn btn-outline btn-sm"
                                    onClick={disconnectWallet}
                                >
                                    Putuskan
                                </button>
                            </div>
                        ) : (
                            <button
                                className="btn btn-primary"
                                onClick={connectWallet}
                                disabled={isConnecting}
                            >
                                <Wallet size={16} />
                                {isConnecting ? 'Menghubungkan...' : 'Hubungkan Wallet'}
                            </button>
                        )}

                        <div className="user-info">
                            <span className="username">{user?.username}</span>
                            {isAdmin && <span className="admin-badge">Admin</span>}
                        </div>

                        <button className="btn btn-outline" onClick={handleLogout}>
                            <LogOut size={16} />
                            Keluar
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/login" className="btn btn-outline">Masuk</Link>
                        <Link to="/register" className="btn btn-primary">Daftar</Link>
                    </>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
