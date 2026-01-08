import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auctionAPI } from '../services/api';
import { useContract } from '../contexts/ContractContext';
import { AlertTriangle, ArrowLeft, RefreshCw, Send, Users, Wallet, CheckCircle } from 'lucide-react';
import './EmergencyRefund.css';

const EmergencyRefund = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const {
        getAuctionBiddersWithDeposits,
        adminEmergencyRefundSingle,
        adminEmergencyRefundAll,
        adminForceTransferToOwner,
        getContractBalance
    } = useContract();

    const [auction, setAuction] = useState(null);
    const [bidders, setBidders] = useState([]);
    const [deposits, setDeposits] = useState([]);
    const [contractBalance, setContractBalance] = useState('0');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            const response = await auctionAPI.getById(id);
            setAuction(response.data);

            const balance = await getContractBalance();
            setContractBalance(balance);

            if (response.data.contract_auction_id !== null) {
                const data = await getAuctionBiddersWithDeposits(response.data.contract_auction_id);
                setBidders(data.bidders);
                setDeposits(data.deposits);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [id, getAuctionBiddersWithDeposits, getContractBalance]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRefundSingle = async (bidderAddress) => {
        if (!confirm(`Refund ETH ke ${bidderAddress}?`)) return;

        setActionLoading(bidderAddress);
        setError(null);
        setSuccess(null);

        try {
            await adminEmergencyRefundSingle(auction.contract_auction_id, bidderAddress);
            setSuccess(`Berhasil refund ke ${bidderAddress.slice(0, 6)}...${bidderAddress.slice(-4)}`);
            fetchData();
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRefundAll = async () => {
        if (!confirm('Refund semua bidder yang kalah?')) return;

        setActionLoading('all');
        setError(null);
        setSuccess(null);

        try {
            await adminEmergencyRefundAll(auction.contract_auction_id);
            setSuccess('Berhasil refund semua bidder yang kalah');
            fetchData();
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleTransferToOwner = async () => {
        if (!confirm('Transfer ETH pemenang ke pemilik lelang?')) return;

        setActionLoading('owner');
        setError(null);
        setSuccess(null);

        try {
            await adminForceTransferToOwner(auction.contract_auction_id);
            setSuccess('Berhasil transfer ETH ke pemilik lelang');
            fetchData();
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Memuat data...</p>
            </div>
        );
    }

    if (!auction) {
        return (
            <div className="error-container">
                <p>Lelang tidak ditemukan</p>
                <button className="btn btn-primary" onClick={() => navigate('/admin')}>
                    Kembali ke Dashboard
                </button>
            </div>
        );
    }

    const winner = auction.blockchain?.highestBidder;
    const hasStuckDeposits = deposits.some((d) => parseFloat(d) > 0);
    const totalDeposits = deposits.reduce((sum, d) => sum + parseFloat(d || 0), 0);
    const allProcessed = bidders.length > 0 && totalDeposits === 0;

    return (
        <div className="emergency-refund-page">
            <div className="page-header">
                <button className="back-btn" onClick={() => navigate('/admin')}>
                    <ArrowLeft size={18} /> Kembali
                </button>
                <h1>
                    <AlertTriangle size={24} />
                    Emergency Refund
                </h1>
            </div>

            <div className="auction-summary">
                <h2>{auction.title}</h2>
                <div className="summary-grid">
                    <div className="summary-item">
                        <span className="label">Status</span>
                        <span className={`value status-${auction.status}`}>{auction.status}</span>
                    </div>
                    <div className="summary-item">
                        <span className="label">Contract ID</span>
                        <span className="value">{auction.contract_auction_id ?? 'N/A'}</span>
                    </div>
                    <div className="summary-item">
                        <span className="label">Pemenang</span>
                        <span className="value">
                            {winner ? `${winner.slice(0, 6)}...${winner.slice(-4)}` : 'Belum ada'}
                        </span>
                    </div>
                    <div className="summary-item">
                        <span className="label">Saldo Contract</span>
                        <span className="value highlight">{contractBalance} ETH</span>
                    </div>
                </div>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {allProcessed && (
                <div className="alert alert-info">
                    <CheckCircle size={20} />
                    <div>
                        <strong>Semua ETH Sudah Diproses</strong>
                        <p>ETH pemenang sudah ditransfer ke pemilik lelang dan ETH peserta yang kalah sudah dikembalikan. Tidak ada aksi yang diperlukan.</p>
                    </div>
                </div>
            )}

            {!allProcessed && (
                <div className="action-buttons">
                    {hasStuckDeposits && (
                        <button
                            className="btn btn-warning"
                            onClick={handleRefundAll}
                            disabled={actionLoading}
                        >
                            <Users size={18} />
                            {actionLoading === 'all' ? 'Memproses...' : 'Refund Semua yang Kalah'}
                        </button>
                    )}
                    {winner && hasStuckDeposits && (
                        <button
                            className="btn btn-primary"
                            onClick={handleTransferToOwner}
                            disabled={actionLoading}
                        >
                            <Send size={18} />
                            {actionLoading === 'owner' ? 'Memproses...' : 'Transfer ke Pemilik Lelang'}
                        </button>
                    )}
                    <button
                        className="btn btn-outline"
                        onClick={fetchData}
                        disabled={actionLoading}
                    >
                        <RefreshCw size={18} />
                        Refresh Data
                    </button>
                </div>
            )}

            {allProcessed && (
                <div className="action-buttons">
                    <button
                        className="btn btn-outline"
                        onClick={fetchData}
                        disabled={actionLoading}
                    >
                        <RefreshCw size={18} />
                        Refresh Data
                    </button>
                </div>
            )}

            <div className="bidders-section">
                <h3><Wallet size={20} /> Daftar Bidder dan Deposit</h3>

                {bidders.length === 0 ? (
                    <p className="no-bidders">Tidak ada bidder pada lelang ini</p>
                ) : (
                    <table className="bidders-table">
                        <thead>
                            <tr>
                                <th>No</th>
                                <th>Wallet Address</th>
                                <th>Deposit (ETH)</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bidders.map((bidder, index) => {
                                const deposit = parseFloat(deposits[index] || 0);
                                const isWinner = winner && bidder.toLowerCase() === winner.toLowerCase();
                                return (
                                    <tr key={bidder} className={isWinner ? 'winner-row' : ''}>
                                        <td>{index + 1}</td>
                                        <td className="wallet-cell">
                                            {bidder.slice(0, 10)}...{bidder.slice(-8)}
                                            {isWinner && <span className="winner-badge">PEMENANG</span>}
                                        </td>
                                        <td className={deposit > 0 ? 'has-deposit' : ''}>
                                            {deposit.toFixed(4)} ETH
                                        </td>
                                        <td>
                                            {deposit > 0 ? (
                                                <span className="status-stuck">Tersimpan</span>
                                            ) : (
                                                <span className="status-cleared">Sudah Diproses</span>
                                            )}
                                        </td>
                                        <td>
                                            {deposit > 0 && !isWinner && (
                                                <button
                                                    className="btn btn-sm btn-warning"
                                                    onClick={() => handleRefundSingle(bidder)}
                                                    disabled={actionLoading}
                                                >
                                                    {actionLoading === bidder ? '...' : 'Refund'}
                                                </button>
                                            )}
                                            {deposit > 0 && isWinner && (
                                                <span className="info-text">Gunakan Transfer ke Owner</span>
                                            )}
                                            {deposit === 0 && (
                                                <span className="info-text">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default EmergencyRefund;
