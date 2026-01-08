import { useState } from 'react';
import { useContract } from '../contexts/ContractContext';
import { auctionAPI } from '../services/api';
import './BidForm.css';

const BidForm = ({ auctionId, contractAuctionId, minBid, currentHighest, onBidPlaced }) => {
    const { placeBid, isContractReady } = useContract();
    const [bidAmount, setBidAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const minimumBid = currentHighest > 0
        ? parseFloat(currentHighest) + parseFloat(minBid)
        : parseFloat(minBid);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        const amount = parseFloat(bidAmount);
        if (isNaN(amount) || amount <= 0) {
            setError('Masukkan jumlah bid yang valid');
            return;
        }

        if (amount < minimumBid) {
            setError(`Bid minimum adalah ${minimumBid.toFixed(4)} ETH`);
            return;
        }

        setIsLoading(true);

        try {
            const result = await placeBid(contractAuctionId, bidAmount);

            // Log bid to database
            try {
                await auctionAPI.logBid(auctionId, bidAmount, result.txHash);
            } catch (logErr) {
                console.log('Could not log bid to database:', logErr.message);
            }

            setSuccess(`Bid berhasil! TX: ${result.txHash.slice(0, 10)}...`);
            setBidAmount('');
            if (onBidPlaced) onBidPlaced();
        } catch (err) {
            setError(err.message || 'Gagal menempatkan bid');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isContractReady) {
        return (
            <div className="bid-form">
                <p className="bid-form-warning">Smart contract belum dikonfigurasi</p>
            </div>
        );
    }

    return (
        <div className="bid-form">
            <h3 className="bid-form-title">Tempatkan Penawaran</h3>

            <div className="bid-info">
                <div className="bid-info-item">
                    <span className="bid-info-label">Bid Minimum</span>
                    <span className="bid-info-value">{minimumBid.toFixed(4)} ETH</span>
                </div>
                {currentHighest > 0 && (
                    <div className="bid-info-item">
                        <span className="bid-info-label">Bid Tertinggi Saat Ini</span>
                        <span className="bid-info-value highlight">{currentHighest} ETH</span>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <input
                        type="number"
                        step="0.0001"
                        min={minimumBid}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder={`Min: ${minimumBid.toFixed(4)} ETH`}
                        className="bid-input"
                        disabled={isLoading}
                    />
                    <span className="input-suffix">ETH</span>
                </div>

                {error && <p className="bid-error">{error}</p>}
                {success && <p className="bid-success">{success}</p>}

                <button
                    type="submit"
                    className="btn btn-primary bid-submit"
                    disabled={isLoading || !bidAmount}
                >
                    {isLoading ? 'Memproses...' : 'Tempatkan Bid'}
                </button>
            </form>

            <p className="bid-disclaimer">
                Dengan menempatkan bid, Anda setuju bahwa ETH akan dikunci di smart contract
                hingga lelang berakhir atau Anda dikalahkan oleh penawar lain.
            </p>
        </div>
    );
};

export default BidForm;
