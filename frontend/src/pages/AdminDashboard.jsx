import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../services/api';
import { useContract } from '../contexts/ContractContext';
import { Truck } from 'lucide-react';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const { adminStopAuction, getLeaderboard } = useContract();
    const [auctions, setAuctions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        fetchAuctions();
    }, []);

    const fetchAuctions = async () => {
        try {
            const response = await adminAPI.getAllAuctions();
            setAuctions(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Yakin ingin menghapus lelang ini?')) return;

        setActionLoading(id);
        try {
            await adminAPI.deleteAuction(id);
            setAuctions(auctions.filter(a => a.id !== id));
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleStop = async (auction) => {
        if (!confirm('Yakin ingin menghentikan lelang ini? Semua ETH akan dikembalikan ke bidder.')) return;

        setActionLoading(auction.id);
        try {
            const response = await adminAPI.stopAuction(auction.id);

            if (response.data.require_blockchain_stop && auction.contract_auction_id !== null) {
                // Get leaderboard BEFORE stopping to capture winner data
                let winnerData = {};
                try {
                    const leaderboard = await getLeaderboard(auction.contract_auction_id);
                    if (leaderboard && leaderboard.totalBidders > 0) {
                        winnerData = {
                            winnerWallet: leaderboard.highestBidder,
                            highestBid: leaderboard.highestBid,
                            totalParticipants: leaderboard.totalBidders
                        };
                    }
                } catch (e) {
                    console.log('Could not get leaderboard:', e.message);
                }

                const result = await adminStopAuction(auction.contract_auction_id);
                await adminAPI.confirmStop(auction.id, result.txHash, winnerData);
            }

            fetchAuctions();
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { label: 'Menunggu', class: 'badge-pending' },
            active: { label: 'Aktif', class: 'badge-active' },
            ended: { label: 'Berakhir', class: 'badge-ended' },
            stopped: { label: 'Dihentikan', class: 'badge-stopped' }
        };
        return badges[status] || { label: status, class: '' };
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Memuat data...</p>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            <div className="dashboard-header">
                <div>
                    <h1>Dashboard Admin</h1>
                    <p>Kelola semua lelang dalam sistem</p>
                </div>
                <Link to="/admin/deliveries" className="btn btn-primary">
                    <Truck size={18} /> Kelola Pengiriman
                </Link>
            </div>

            {error && <div className="dashboard-error">{error}</div>}

            <div className="dashboard-stats">
                <div className="stat-card">
                    <span className="stat-value">{auctions.length}</span>
                    <span className="stat-label">Total Lelang</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{auctions.filter(a => a.status === 'active').length}</span>
                    <span className="stat-label">Lelang Aktif</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{auctions.filter(a => a.status === 'ended').length}</span>
                    <span className="stat-label">Lelang Selesai</span>
                </div>
            </div>

            <div className="auctions-table-container">
                <table className="auctions-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Judul</th>
                            <th>Pemilik</th>
                            <th>Bid Awal</th>
                            <th>Peserta</th>
                            <th>Status</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {auctions.map(auction => {
                            const badge = getStatusBadge(auction.status);
                            return (
                                <tr key={auction.id}>
                                    <td>{auction.id}</td>
                                    <td className="title-cell">{auction.title}</td>
                                    <td>{auction.owner_username}</td>
                                    <td>{auction.starting_bid} ETH</td>
                                    <td>{auction.participant_count || 0}</td>
                                    <td>
                                        <span className={`badge ${badge.class}`}>
                                            {badge.label}
                                        </span>
                                    </td>
                                    <td className="actions-cell">
                                        {auction.status === 'active' && (
                                            <button
                                                className="btn btn-danger btn-sm"
                                                onClick={() => handleStop(auction)}
                                                disabled={actionLoading === auction.id}
                                            >
                                                {actionLoading === auction.id ? '...' : 'Stop'}
                                            </button>
                                        )}
                                        {(auction.status === 'pending' || auction.status === 'stopped') && (
                                            <button
                                                className="btn btn-outline btn-sm"
                                                onClick={() => handleDelete(auction.id)}
                                                disabled={actionLoading === auction.id}
                                            >
                                                {actionLoading === auction.id ? '...' : 'Hapus'}
                                            </button>
                                        )}
                                        {(auction.status === 'ended' || auction.status === 'stopped') && auction.contract_auction_id !== null && (
                                            <Link
                                                to={`/admin/emergency-refund/${auction.id}`}
                                                className="btn btn-warning btn-sm"
                                            >
                                                Refund
                                            </Link>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {auctions.length === 0 && (
                    <div className="empty-table">
                        <p>Belum ada lelang</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
