import './Leaderboard.css';

const Leaderboard = ({ leaderboard }) => {
    const formatAddress = (address) => {
        if (!address || address === '0x0000000000000000000000000000000000000000') {
            return '-';
        }
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    if (!leaderboard || leaderboard.totalBidders === 0) {
        return (
            <div className="leaderboard">
                <h3 className="leaderboard-title">Papan Peringkat</h3>
                <p className="leaderboard-empty">Belum ada penawaran</p>
            </div>
        );
    }

    return (
        <div className="leaderboard">
            <h3 className="leaderboard-title">Papan Peringkat</h3>

            <div className="leaderboard-stats">
                <div className="stat-item total">
                    <span className="stat-label">Total Peserta</span>
                    <span className="stat-value">{leaderboard.totalBidders}</span>
                </div>
            </div>

            <div className="leaderboard-items">
                <div className="leaderboard-item highest">
                    <div className="rank-badge">1</div>
                    <div className="bidder-info">
                        <span className="bidder-label">Penawar Tertinggi</span>
                        <span className="bidder-address">{formatAddress(leaderboard.highestBidder)}</span>
                    </div>
                    <div className="bid-amount">
                        <span className="amount">{leaderboard.highestBid}</span>
                        <span className="currency">ETH</span>
                    </div>
                </div>

                {leaderboard.totalBidders > 1 && leaderboard.lowestBidder !== leaderboard.highestBidder && (
                    <div className="leaderboard-item lowest">
                        <div className="rank-badge">{leaderboard.totalBidders}</div>
                        <div className="bidder-info">
                            <span className="bidder-label">Penawar Terendah</span>
                            <span className="bidder-address">{formatAddress(leaderboard.lowestBidder)}</span>
                        </div>
                        <div className="bid-amount">
                            <span className="amount">{leaderboard.lowestBid}</span>
                            <span className="currency">ETH</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;
