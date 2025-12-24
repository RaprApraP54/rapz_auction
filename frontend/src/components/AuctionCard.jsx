import { Link } from 'react-router-dom';
import { ImageOff } from 'lucide-react';
import './AuctionCard.css';

// Fallback placeholder images from Unsplash
const placeholderImages = [
    'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=300&fit=crop'
];

const AuctionCard = ({ auction }) => {
    // Calculate real status based on blockchain time
    const getRealStatus = () => {
        // If already marked as ended or stopped in DB, use that
        if (auction.status === 'ended' || auction.status === 'stopped') {
            return auction.status;
        }

        // Check blockchain endTime for active auctions
        if (auction.status === 'active' && auction.blockchain?.endTime) {
            const now = Math.floor(Date.now() / 1000);
            if (now >= auction.blockchain.endTime) {
                return 'ended';
            }
        }

        // Check if finalized on blockchain
        if (auction.blockchain?.isFinalized || !auction.blockchain?.isActive) {
            return 'ended';
        }

        return auction.status;
    };

    const realStatus = getRealStatus();

    const getStatusLabel = (status) => {
        const labels = {
            pending: 'Menunggu',
            active: 'Aktif',
            ended: 'Berakhir',
            stopped: 'Dihentikan'
        };
        return labels[status] || status;
    };

    const getStatusClass = (status) => {
        const classes = {
            pending: 'status-pending',
            active: 'status-active',
            ended: 'status-ended',
            stopped: 'status-stopped'
        };
        return classes[status] || '';
    };

    // Get a consistent placeholder based on auction id
    const getPlaceholder = () => {
        const index = auction.id % placeholderImages.length;
        return placeholderImages[index];
    };

    return (
        <div className="auction-card">
            <div className="auction-card-image">
                {auction.image_url ? (
                    <img src={auction.image_url} alt={auction.title} />
                ) : (
                    <img src={getPlaceholder()} alt={auction.title} />
                )}
                <span className={`auction-status ${getStatusClass(realStatus)}`}>
                    {getStatusLabel(realStatus)}
                </span>
            </div>

            <div className="auction-card-content">
                <h3 className="auction-card-title">{auction.title}</h3>

                <p className="auction-card-description">
                    {auction.description?.substring(0, 100) || 'Tidak ada deskripsi'}
                    {auction.description?.length > 100 ? '...' : ''}
                </p>

                <div className="auction-card-info">
                    <div className="info-item">
                        <span className="info-label">Bid Awal</span>
                        <span className="info-value">{auction.starting_bid} ETH</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Bid Tertinggi</span>
                        <span className="info-value highlight">
                            {auction.blockchain?.highestBid || '0'} ETH
                        </span>
                    </div>
                </div>

                <div className="auction-card-owner">
                    <span>Oleh: {auction.owner_username}</span>
                </div>

                <Link to={`/auctions/${auction.id}`} className="btn btn-primary auction-card-btn">
                    Lihat Detail
                </Link>
            </div>
        </div>
    );
};

export default AuctionCard;
