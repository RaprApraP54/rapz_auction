import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { Package, Truck, CheckCircle, Clock, Search, MapPin, Phone, User } from 'lucide-react';
import './AdminDeliveries.css';

const AdminDeliveries = () => {
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('ALL');
    const [selectedDelivery, setSelectedDelivery] = useState(null);
    const [updateForm, setUpdateForm] = useState({
        status: '',
        tracking_number: '',
        courier: ''
    });
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchDeliveries();
    }, []);

    const fetchDeliveries = async () => {
        try {
            const response = await adminAPI.getDeliveries();
            setDeliveries(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            PENDING: { label: 'Menunggu', class: 'badge-warning', icon: Clock },
            PROCESSING: { label: 'Diproses', class: 'badge-info', icon: Package },
            SENT: { label: 'Dikirim', class: 'badge-primary', icon: Truck },
            RECEIVED: { label: 'Diterima', class: 'badge-success', icon: CheckCircle },
            CANCELLED: { label: 'Dibatalkan', class: 'badge-danger', icon: null }
        };
        return badges[status] || { label: status, class: '', icon: null };
    };

    const filteredDeliveries = filter === 'ALL'
        ? deliveries
        : deliveries.filter(d => d.status === filter);

    const handleUpdateClick = (delivery) => {
        setSelectedDelivery(delivery);
        setUpdateForm({
            status: delivery.status,
            tracking_number: delivery.tracking_number || '',
            courier: delivery.courier || ''
        });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!selectedDelivery) return;

        setUpdating(true);
        try {
            await adminAPI.updateDelivery(selectedDelivery.id, updateForm);
            setSelectedDelivery(null);
            fetchDeliveries();
        } catch (err) {
            setError(err.message);
        } finally {
            setUpdating(false);
        }
    };

    const statusOptions = ['PENDING', 'PROCESSING', 'SENT', 'RECEIVED', 'CANCELLED'];
    const courierOptions = ['JNE', 'J&T Express', 'SiCepat', 'AnterAja', 'Pos Indonesia', 'Ninja Express', 'Gojek', 'Grab'];

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Memuat data pengiriman...</p>
            </div>
        );
    }

    return (
        <div className="admin-deliveries-page">
            <div className="page-header">
                <div>
                    <h1><Truck size={28} /> Manajemen Pengiriman</h1>
                    <p>Kelola pengiriman untuk lelang yang sudah selesai</p>
                </div>
                <div className="stats-row">
                    <div className="stat-mini">
                        <span className="stat-number">{deliveries.length}</span>
                        <span className="stat-label">Total</span>
                    </div>
                    <div className="stat-mini">
                        <span className="stat-number">{deliveries.filter(d => d.status === 'PENDING').length}</span>
                        <span className="stat-label">Pending</span>
                    </div>
                    <div className="stat-mini">
                        <span className="stat-number">{deliveries.filter(d => d.status === 'SENT').length}</span>
                        <span className="stat-label">Dikirim</span>
                    </div>
                </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="filter-bar">
                <button
                    className={`filter-btn ${filter === 'ALL' ? 'active' : ''}`}
                    onClick={() => setFilter('ALL')}
                >
                    Semua
                </button>
                {statusOptions.slice(0, 4).map(status => {
                    const badge = getStatusBadge(status);
                    return (
                        <button
                            key={status}
                            className={`filter-btn ${filter === status ? 'active' : ''}`}
                            onClick={() => setFilter(status)}
                        >
                            {badge.label}
                        </button>
                    );
                })}
            </div>

            {filteredDeliveries.length === 0 ? (
                <div className="empty-state">
                    <Package size={48} />
                    <p>Tidak ada pengiriman {filter !== 'ALL' ? `dengan status ${getStatusBadge(filter).label}` : ''}</p>
                </div>
            ) : (
                <div className="deliveries-table-container">
                    <table className="deliveries-table">
                        <thead>
                            <tr>
                                <th>Lelang</th>
                                <th>Pemenang</th>
                                <th>Penerima</th>
                                <th>Status</th>
                                <th>Tracking</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDeliveries.map(delivery => {
                                const badge = getStatusBadge(delivery.status);
                                const BadgeIcon = badge.icon;
                                return (
                                    <tr key={delivery.id}>
                                        <td>
                                            <div className="auction-cell">
                                                <strong>{delivery.auction_title}</strong>
                                                <span className="bid-amount">{delivery.highest_bid} ETH</span>
                                            </div>
                                        </td>
                                        <td>
                                            <code className="wallet-address">
                                                {delivery.winner_wallet?.slice(0, 6)}...{delivery.winner_wallet?.slice(-4)}
                                            </code>
                                        </td>
                                        <td>
                                            <div className="recipient-cell">
                                                <div className="recipient-name">
                                                    <User size={14} /> {delivery.recipient_name}
                                                </div>
                                                <div className="recipient-phone">
                                                    <Phone size={14} /> {delivery.recipient_phone}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${badge.class}`}>
                                                {BadgeIcon && <BadgeIcon size={14} />}
                                                {badge.label}
                                            </span>
                                        </td>
                                        <td>
                                            {delivery.tracking_number ? (
                                                <div className="tracking-cell">
                                                    <span className="courier">{delivery.courier}</span>
                                                    <code>{delivery.tracking_number}</code>
                                                </div>
                                            ) : (
                                                <span className="no-tracking">-</span>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                className="btn btn-outline btn-sm"
                                                onClick={() => handleUpdateClick(delivery)}
                                            >
                                                Update
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Update Modal */}
            {selectedDelivery && (
                <div className="modal-overlay" onClick={() => setSelectedDelivery(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>Update Pengiriman</h2>
                        <p className="modal-subtitle">
                            <strong>{selectedDelivery.auction_title}</strong>
                        </p>

                        <div className="recipient-info">
                            <h4><MapPin size={16} /> Alamat Pengiriman</h4>
                            <p><strong>{selectedDelivery.recipient_name}</strong></p>
                            <p>{selectedDelivery.recipient_address}</p>
                            <p><Phone size={14} /> {selectedDelivery.recipient_phone}</p>
                            {selectedDelivery.notes && (
                                <p className="notes">Catatan: {selectedDelivery.notes}</p>
                            )}
                        </div>

                        <form onSubmit={handleUpdate}>
                            <div className="form-group">
                                <label>Status</label>
                                <select
                                    value={updateForm.status}
                                    onChange={e => setUpdateForm({ ...updateForm, status: e.target.value })}
                                >
                                    {statusOptions.map(status => (
                                        <option key={status} value={status}>
                                            {getStatusBadge(status).label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Kurir</label>
                                <select
                                    value={updateForm.courier}
                                    onChange={e => setUpdateForm({ ...updateForm, courier: e.target.value })}
                                >
                                    <option value="">Pilih Kurir</option>
                                    {courierOptions.map(courier => (
                                        <option key={courier} value={courier}>{courier}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Nomor Resi</label>
                                <input
                                    type="text"
                                    value={updateForm.tracking_number}
                                    onChange={e => setUpdateForm({ ...updateForm, tracking_number: e.target.value })}
                                    placeholder="Masukkan nomor resi"
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={() => setSelectedDelivery(null)}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={updating}
                                >
                                    {updating ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDeliveries;
