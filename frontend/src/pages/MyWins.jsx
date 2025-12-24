import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { deliveryAPI } from '../services/api';
import { Trophy, Package, Truck, CheckCircle, Clock, MapPin } from 'lucide-react';
import './MyWins.css';

const MyWins = () => {
    const [wonAuctions, setWonAuctions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedAuction, setSelectedAuction] = useState(null);
    const [addressForm, setAddressForm] = useState({
        recipient_name: '',
        recipient_address: '',
        recipient_phone: '',
        notes: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchWonAuctions();
    }, []);

    const fetchWonAuctions = async () => {
        try {
            const response = await deliveryAPI.getMyWins();
            setWonAuctions(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            PENDING: { label: 'Menunggu Alamat', class: 'badge-warning', icon: Clock },
            PROCESSING: { label: 'Diproses', class: 'badge-info', icon: Package },
            SENT: { label: 'Dikirim', class: 'badge-primary', icon: Truck },
            RECEIVED: { label: 'Diterima', class: 'badge-success', icon: CheckCircle },
            CANCELLED: { label: 'Dibatalkan', class: 'badge-danger', icon: null }
        };
        return badges[status] || { label: status || 'Belum Diisi', class: 'badge-warning', icon: Clock };
    };

    const handleSubmitAddress = async (e) => {
        e.preventDefault();
        if (!selectedAuction) return;

        setSubmitting(true);
        try {
            await deliveryAPI.submitAddress(selectedAuction.auction_id, addressForm);
            setSelectedAuction(null);
            setAddressForm({
                recipient_name: '',
                recipient_address: '',
                recipient_phone: '',
                notes: ''
            });
            fetchWonAuctions();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
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

    return (
        <div className="my-wins-page">
            <div className="page-header">
                <h1><Trophy size={28} /> Lelang yang Dimenangkan</h1>
                <p>Kelola pengiriman untuk lelang yang Anda menangkan</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            {wonAuctions.length === 0 ? (
                <div className="empty-state">
                    <Trophy size={64} />
                    <h3>Belum Ada Kemenangan</h3>
                    <p>Anda belum memenangkan lelang apapun.</p>
                    <Link to="/auctions" className="btn btn-primary">
                        Jelajahi Lelang
                    </Link>
                </div>
            ) : (
                <div className="wins-grid">
                    {wonAuctions.map((auction) => {
                        const badge = getStatusBadge(auction.delivery_status);
                        const BadgeIcon = badge.icon;
                        return (
                            <div key={auction.id} className="win-card">
                                <div className="win-card-header">
                                    {auction.image_url ? (
                                        <img src={auction.image_url} alt={auction.auction_title} />
                                    ) : (
                                        <div className="placeholder-image">
                                            <Package size={32} />
                                        </div>
                                    )}
                                </div>
                                <div className="win-card-body">
                                    <h3>{auction.auction_title}</h3>
                                    <div className="win-info">
                                        <span className="win-bid">{auction.highest_bid} ETH</span>
                                        <span className={`badge ${badge.class}`}>
                                            {BadgeIcon && <BadgeIcon size={14} />}
                                            {badge.label}
                                        </span>
                                    </div>

                                    {auction.tracking_number && (
                                        <div className="tracking-info">
                                            <Truck size={16} />
                                            <span>{auction.courier}: {auction.tracking_number}</span>
                                        </div>
                                    )}

                                    {!auction.delivery_id ? (
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => setSelectedAuction(auction)}
                                        >
                                            <MapPin size={16} /> Isi Alamat Pengiriman
                                        </button>
                                    ) : auction.delivery_status === 'PENDING' ? (
                                        <button
                                            className="btn btn-outline btn-sm"
                                            onClick={() => setSelectedAuction(auction)}
                                        >
                                            Ubah Alamat
                                        </button>
                                    ) : (
                                        <Link
                                            to={`/auctions/${auction.auction_id}`}
                                            className="btn btn-outline btn-sm"
                                        >
                                            Lihat Detail
                                        </Link>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Address Form Modal */}
            {selectedAuction && (
                <div className="modal-overlay" onClick={() => setSelectedAuction(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>Alamat Pengiriman</h2>
                        <p className="modal-subtitle">
                            Untuk: <strong>{selectedAuction.auction_title}</strong>
                        </p>

                        <form onSubmit={handleSubmitAddress}>
                            <div className="form-group">
                                <label>Nama Penerima *</label>
                                <input
                                    type="text"
                                    value={addressForm.recipient_name}
                                    onChange={e => setAddressForm({ ...addressForm, recipient_name: e.target.value })}
                                    placeholder="Nama lengkap penerima"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Alamat Lengkap *</label>
                                <textarea
                                    value={addressForm.recipient_address}
                                    onChange={e => setAddressForm({ ...addressForm, recipient_address: e.target.value })}
                                    placeholder="Alamat lengkap termasuk kode pos"
                                    rows="3"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Nomor Telepon *</label>
                                <input
                                    type="tel"
                                    value={addressForm.recipient_phone}
                                    onChange={e => setAddressForm({ ...addressForm, recipient_phone: e.target.value })}
                                    placeholder="08xx-xxxx-xxxx"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Catatan (Opsional)</label>
                                <input
                                    type="text"
                                    value={addressForm.notes}
                                    onChange={e => setAddressForm({ ...addressForm, notes: e.target.value })}
                                    placeholder="Catatan tambahan untuk pengiriman"
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={() => setSelectedAuction(null)}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={submitting}
                                >
                                    {submitting ? 'Menyimpan...' : 'Simpan Alamat'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyWins;
