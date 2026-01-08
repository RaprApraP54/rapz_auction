import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auctionAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { useContract } from '../contexts/ContractContext';
import CountdownTimer from '../components/CountdownTimer';
import Leaderboard from '../components/Leaderboard';
import BidForm from '../components/BidForm';
import WalletRequired from '../components/WalletRequired';
import { Trophy, XCircle, Clock, CheckCircle } from 'lucide-react';
import './AuctionDetail.css';

const AuctionDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, isAuthenticated, isAdmin } = useAuth();
    const { isConnected, account } = useWallet();
    const { finalizeAuction, getAuction, getUserActiveAuction } = useContract();

    const [auction, setAuction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isJoining, setIsJoining] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [auctionResult, setAuctionResult] = useState(null);
    const [userActiveAuctionInfo, setUserActiveAuctionInfo] = useState(null);

    const fetchAuction = useCallback(async () => {
        try {
            const response = await auctionAPI.getById(id);
            setAuction(response.data);

            // Check auction result from blockchain
            if (response.data.contract_auction_id && response.data.blockchain) {
                const blockchain = response.data.blockchain;
                if (blockchain.isFinalized || !blockchain.isActive) {
                    // Determine result for current user
                    const userWallet = account?.toLowerCase();
                    const highestBidder = blockchain.highestBidder?.toLowerCase();
                    const isWinner = userWallet && highestBidder && userWallet === highestBidder;

                    setAuctionResult({
                        isFinalized: blockchain.isFinalized,
                        winner: blockchain.highestBidder,
                        winningBid: blockchain.highestBid,
                        isCurrentUserWinner: isWinner,
                        isCurrentUserParticipant: response.data.participants?.some(
                            p => p.wallet_address?.toLowerCase() === userWallet
                        )
                    });
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [id, account]);

    useEffect(() => {
        fetchAuction();
    }, [fetchAuction]);

    // Check if user has active bid in another auction
    useEffect(() => {
        const checkUserActiveAuction = async () => {
            if (account && auction?.contract_auction_id !== undefined) {
                const activeInfo = await getUserActiveAuction(account);
                if (activeInfo.hasActive && !activeInfo.isFinished && activeInfo.auctionId !== auction.contract_auction_id) {
                    setUserActiveAuctionInfo(activeInfo);
                } else {
                    setUserActiveAuctionInfo(null);
                }
            }
        };
        checkUserActiveAuction();
    }, [account, auction?.contract_auction_id, getUserActiveAuction]);

    const handleJoin = async () => {
        setIsJoining(true);
        try {
            await auctionAPI.join(id);
            fetchAuction();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsJoining(false);
        }
    };

    const handleFinalize = async () => {
        if (!auction.contract_auction_id) return;

        setIsFinalizing(true);
        setError(null);

        try {
            // Check if already finalized on blockchain
            const currentData = await getAuction(auction.contract_auction_id);

            if (currentData && (currentData.isFinalized || !currentData.isActive)) {
                // Already finalized - just sync database
                console.log('Auction already finalized, syncing database...');
                try {
                    await auctionAPI.finalize(id);
                } catch (apiErr) {
                    console.log('Could not update database status:', apiErr.message);
                }
                fetchAuction();
                return;
            }

            // Not yet finalized - do it now
            await finalizeAuction(auction.contract_auction_id);

            // Update status in database
            try {
                await auctionAPI.finalize(id);
            } catch (apiErr) {
                console.log('Could not update database status:', apiErr.message);
            }
            fetchAuction();
        } catch (err) {
            // If error contains "already finalized" or similar, treat as success
            const errMsg = err.message?.toLowerCase() || '';
            if (errMsg.includes('finalisasi') || errMsg.includes('finalized') || errMsg.includes('tidak aktif')) {
                // Still sync database
                try {
                    await auctionAPI.finalize(id);
                } catch (apiErr) {
                    console.log('Could not update database status:', apiErr.message);
                }
                fetchAuction();
            } else {
                setError(err.message);
            }
        } finally {
            setIsFinalizing(false);
        }
    };

    const handleCountdownEnd = async () => {
        // Auto-finalize when countdown ends
        if (auction?.contract_auction_id && !auction?.blockchain?.isFinalized) {
            try {
                setIsFinalizing(true);
                await finalizeAuction(auction.contract_auction_id);
                // Update database status
                try {
                    await auctionAPI.finalize(id);
                } catch (apiErr) {
                    console.log('Could not update database status:', apiErr.message);
                }
                fetchAuction();
            } catch (err) {
                console.error('Auto-finalize failed:', err);
                // Still try to update database and refresh UI
                try {
                    await auctionAPI.finalize(id);
                } catch (apiErr) {
                    console.log('Could not update database status:', apiErr.message);
                }
                fetchAuction();
            } finally {
                setIsFinalizing(false);
            }
        } else {
            // Just sync database status even if already finalized
            try {
                await auctionAPI.finalize(id);
            } catch (apiErr) {
                console.log('Could not update database status:', apiErr.message);
            }
            fetchAuction();
        }
    };

    const isOwner = user && auction && user.id === auction.owner_id;
    const hasJoined = auction?.participants?.some(p => p.user_id === user?.id);
    const hasActiveAuctionElsewhere = userActiveAuctionInfo !== null;
    const canBid = isAuthenticated && isConnected && hasJoined && !isOwner && !isAdmin && auction?.status === 'active' && !hasActiveAuctionElsewhere;

    // Can finalize if: time has ended AND not yet finalized on blockchain
    const timeHasEnded = auction?.blockchain?.endTime && auction.blockchain.endTime <= Math.floor(Date.now() / 1000);
    const needsFinalization = auction?.blockchain && !auction.blockchain.isFinalized && timeHasEnded;
    const canFinalize = needsFinalization && isConnected;

    const isEnded = auction?.status === 'ended' || auction?.blockchain?.isFinalized || timeHasEnded;

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Memuat detail lelang...</p>
            </div>
        );
    }

    if (error || !auction) {
        return (
            <div className="error-container">
                <p>Error: {error || 'Lelang tidak ditemukan'}</p>
                <button className="btn btn-primary" onClick={() => navigate('/auctions')}>
                    Kembali ke Daftar Lelang
                </button>
            </div>
        );
    }

    return (
        <div className="auction-detail-page">
            <div className="auction-detail-header">
                <button className="back-btn" onClick={() => navigate('/auctions')}>
                    ← Kembali
                </button>
            </div>

            <div className="auction-detail-content">
                <div className="auction-main">
                    <div className="auction-image-container">
                        {auction.image_url ? (
                            <img src={auction.image_url} alt={auction.title} />
                        ) : (
                            <div className="image-placeholder">
                                <span>Tidak Ada Gambar</span>
                            </div>
                        )}
                    </div>

                    <div className="auction-info-card">
                        <h1>{auction.title}</h1>
                        <p className="auction-description">{auction.description || 'Tidak ada deskripsi'}</p>

                        <div className="auction-meta">
                            <div className="meta-item">
                                <span className="meta-label">Status</span>
                                <span className={`meta-value status-${auction.status}`}>
                                    {auction.status === 'active' ? 'Aktif' :
                                        auction.status === 'pending' ? 'Menunggu' :
                                            auction.status === 'ended' ? 'Berakhir' : 'Dihentikan'}
                                </span>
                            </div>
                            <div className="meta-item">
                                <span className="meta-label">Pemilik</span>
                                <span className="meta-value">{auction.owner_username}</span>
                            </div>
                            <div className="meta-item">
                                <span className="meta-label">Bid Awal</span>
                                <span className="meta-value">{auction.starting_bid} ETH</span>
                            </div>
                            <div className="meta-item">
                                <span className="meta-label">Min. Kenaikan</span>
                                <span className="meta-value">{auction.min_bid_increment} ETH</span>
                            </div>
                        </div>

                        {auction.status === 'active' && auction.blockchain?.endTime && !isEnded && (
                            <CountdownTimer
                                endTime={auction.blockchain.endTime}
                                onEnd={handleCountdownEnd}
                            />
                        )}

                        {/* Auction Result Display */}
                        {isEnded && (
                            <div className="auction-result">
                                <div className="result-header">
                                    <Clock size={24} />
                                    <h3>LELANG BERAKHIR</h3>
                                </div>

                                {auction.leaderboard?.totalBidders > 0 ? (
                                    <div className="result-content">
                                        <div className="winner-info">
                                            <Trophy size={32} className="trophy-icon" />
                                            <div className="winner-details">
                                                <span className="winner-label">Pemenang</span>
                                                <span className="winner-address">
                                                    {auction.blockchain?.highestBidder
                                                        ? `${auction.blockchain.highestBidder.slice(0, 6)}...${auction.blockchain.highestBidder.slice(-4)}`
                                                        : 'N/A'}
                                                </span>
                                                <span className="winning-bid">
                                                    {auction.blockchain?.highestBid || '0'} ETH
                                                </span>
                                            </div>
                                        </div>

                                        {/* User-specific notification */}
                                        {auctionResult?.isCurrentUserWinner && (
                                            <div className="user-result winner">
                                                <CheckCircle size={20} />
                                                <span>Selamat! Anda memenangkan lelang ini!</span>
                                            </div>
                                        )}
                                        {auctionResult?.isCurrentUserParticipant && !auctionResult?.isCurrentUserWinner && (
                                            <div className="user-result loser">
                                                <XCircle size={20} />
                                                <span>Anda tidak memenangkan lelang ini. ETH Anda telah dikembalikan.</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="result-content no-bids">
                                        <p>Tidak ada penawaran pada lelang ini.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Finalize Section - Show when auction needs finalization */}
                        {canFinalize && (
                            <div className="finalize-section">
                                <div className="finalize-notice">
                                    <h4>Lelang Perlu Diselesaikan</h4>
                                    <p>Klik tombol di bawah untuk menyelesaikan lelang dan memproses pembayaran:</p>
                                    <ul>
                                        <li>ETH pemenang akan dikirim ke pemilik lelang</li>
                                        <li>ETH peserta yang kalah akan dikembalikan</li>
                                    </ul>
                                </div>
                                <button
                                    className="btn btn-primary finalize-btn"
                                    onClick={handleFinalize}
                                    disabled={isFinalizing}
                                >
                                    {isFinalizing ? 'Memproses Transaksi...' : 'Selesaikan Lelang & Proses Pembayaran'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="auction-sidebar">
                    {auction.leaderboard && (
                        <Leaderboard leaderboard={auction.leaderboard} />
                    )}

                    {isAuthenticated && !isAdmin && auction.status === 'active' && !isEnded && (
                        <div className="participation-section">
                            {!hasJoined ? (
                                <div className="join-prompt">
                                    <h3>Bergabung ke Lelang</h3>
                                    <p>Anda harus bergabung terlebih dahulu untuk bisa menempatkan bid.</p>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleJoin}
                                        disabled={isJoining || !isConnected || isOwner}
                                    >
                                        {isJoining ? 'Memproses...' :
                                            isOwner ? 'Anda Pemilik Lelang' :
                                                !isConnected ? 'Hubungkan Wallet Dulu' : 'Bergabung'}
                                    </button>
                                </div>
                            ) : canBid ? (
                                <WalletRequired>
                                    <BidForm
                                        auctionId={auction.id}
                                        contractAuctionId={auction.contract_auction_id}
                                        minBid={auction.min_bid_increment}
                                        currentHighest={auction.blockchain?.highestBid || 0}
                                        onBidPlaced={fetchAuction}
                                    />
                                </WalletRequired>
                            ) : hasActiveAuctionElsewhere ? (
                                <div className="active-elsewhere-warning">
                                    <XCircle size={24} />
                                    <div>
                                        <h4>Tidak Bisa Bid di Lelang Ini</h4>
                                        <p>Anda masih aktif di lelang lain. Selesaikan atau tunggu lelang tersebut berakhir sebelum bid di sini.</p>
                                        <button
                                            className="btn btn-outline btn-sm"
                                            onClick={() => navigate(`/auctions`)}
                                        >
                                            Lihat Lelang Aktif Anda
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="already-joined">
                                    <p>Anda sudah bergabung ke lelang ini</p>
                                </div>
                            )}
                        </div>
                    )}

                    {!isAuthenticated && (
                        <div className="login-prompt">
                            <h3>Ingin Ikut Lelang?</h3>
                            <p>Silakan login atau daftar terlebih dahulu.</p>
                            <button
                                className="btn btn-primary"
                                onClick={() => navigate('/login')}
                            >
                                Login
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuctionDetail;
