import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { reportAPI } from '../services/api';
import { FileText, Download, Calendar, TrendingUp, Users, Gavel, XCircle } from 'lucide-react';
import './Report.css';

const ReportAdmin = () => {
    const { isAdmin } = useAuth();
    const [month, setMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchReport = async () => {
        if (!month) return;

        setLoading(true);
        setError(null);
        try {
            const response = await reportAPI.getAdminMonthly(month);
            setReport(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            fetchReport();
        }
    }, [isAdmin]);

    const handleDownloadPDF = () => {
        reportAPI.downloadAdminPDF(month);
    };

    if (!isAdmin) {
        return (
            <div className="report-container">
                <div className="error-message">
                    <XCircle size={48} />
                    <p>Halaman ini hanya untuk Admin</p>
                </div>
            </div>
        );
    }

    return (
        <div className="report-container">
            <div className="report-header">
                <div className="report-title">
                    <FileText size={32} />
                    <h1>Laporan Lelang Bulanan</h1>
                </div>
                <p className="report-subtitle">Statistik dan ringkasan lelang per bulan</p>
            </div>

            <div className="report-controls">
                <div className="month-picker">
                    <Calendar size={20} />
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                    />
                </div>
                <button className="btn-fetch" onClick={fetchReport} disabled={loading}>
                    {loading ? 'Memuat...' : 'Lihat Laporan'}
                </button>
                {report && (
                    <button className="btn-download" onClick={handleDownloadPDF}>
                        <Download size={18} />
                        Download PDF
                    </button>
                )}
            </div>

            {error && <div className="error-message">{error}</div>}

            {report && (
                <>
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon blue">
                                <Gavel size={24} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-value">{report.auctions?.total_auctions || 0}</span>
                                <span className="stat-label">Total Lelang</span>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon green">
                                <TrendingUp size={24} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-value">{report.auctions?.ended_count || 0}</span>
                                <span className="stat-label">Lelang Berakhir</span>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon red">
                                <XCircle size={24} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-value">{report.auctions?.stopped_count || 0}</span>
                                <span className="stat-label">Lelang Dihentikan</span>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon purple">
                                <Users size={24} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-value">{report.participants?.total_participants || 0}</span>
                                <span className="stat-label">Total Partisipan</span>
                            </div>
                        </div>
                    </div>

                    <div className="report-section">
                        <h2>Statistik Bid</h2>
                        <div className="stats-row">
                            <div className="stat-item">
                                <span className="stat-number">{report.bids?.total_bids || 0}</span>
                                <span className="stat-text">Total Bid</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">
                                    {parseFloat(report.bids?.total_bid_amount || 0).toFixed(4)} ETH
                                </span>
                                <span className="stat-text">Total Nilai Bid</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">
                                    {parseFloat(report.bids?.avg_bid_amount || 0).toFixed(4)} ETH
                                </span>
                                <span className="stat-text">Rata-rata Bid</span>
                            </div>
                        </div>
                    </div>

                    {report.topAuctions && report.topAuctions.length > 0 && (
                        <div className="report-section">
                            <h2>Top 5 Lelang Tertinggi</h2>
                            <div className="table-wrapper">
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Judul</th>
                                            <th>Status</th>
                                            <th>Bid Tertinggi</th>
                                            <th>Partisipan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.topAuctions.map((auction) => (
                                            <tr key={auction.id}>
                                                <td>{auction.id}</td>
                                                <td>{auction.title}</td>
                                                <td>
                                                    <span className={`status-badge ${auction.status}`}>
                                                        {auction.status}
                                                    </span>
                                                </td>
                                                <td>{auction.highest_bid ? `${auction.highest_bid} ETH` : '-'}</td>
                                                <td>{auction.total_participants || 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {report.auctionList && report.auctionList.length > 0 && (
                        <div className="report-section">
                            <h2>Daftar Semua Lelang</h2>
                            <div className="table-wrapper">
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Judul</th>
                                            <th>Pemilik</th>
                                            <th>Status</th>
                                            <th>Bid Awal</th>
                                            <th>Bid Tertinggi</th>
                                            <th>Hasil</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.auctionList.map((auction) => (
                                            <tr key={auction.id}>
                                                <td>{auction.id}</td>
                                                <td>{auction.title}</td>
                                                <td>{auction.owner_username}</td>
                                                <td>
                                                    <span className={`status-badge ${auction.status}`}>
                                                        {auction.status}
                                                    </span>
                                                </td>
                                                <td>{auction.starting_bid} ETH</td>
                                                <td>{auction.highest_bid ? `${auction.highest_bid} ETH` : '-'}</td>
                                                <td>{auction.result_type || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {!loading && !report && !error && (
                <div className="empty-state">
                    <FileText size={64} />
                    <p>Pilih bulan dan klik "Lihat Laporan" untuk melihat statistik</p>
                </div>
            )}
        </div>
    );
};

export default ReportAdmin;
