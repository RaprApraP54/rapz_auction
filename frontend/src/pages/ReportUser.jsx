import { useState, useEffect } from 'react';
import { reportAPI } from '../services/api';
import { FileText, Download, Calendar, Trophy, Gavel, TrendingUp } from 'lucide-react';
import './Report.css';

const ReportUser = () => {
    const [month, setMonth] = useState('');
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchReport = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await reportAPI.getUserActivity(month);
            setReport(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    const handleDownloadPDF = () => {
        reportAPI.downloadUserPDF(month);
    };

    return (
        <div className="report-container">
            <div className="report-header">
                <div className="report-title">
                    <FileText size={32} />
                    <h1>Laporan Aktivitas Saya</h1>
                </div>
                <p className="report-subtitle">Riwayat lelang yang diikuti dan dimenangkan</p>
            </div>

            <div className="report-controls">
                <div className="month-picker">
                    <Calendar size={20} />
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        placeholder="Semua waktu"
                    />
                    {month && (
                        <button className="btn-clear" onClick={() => setMonth('')}>
                            Semua Waktu
                        </button>
                    )}
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
                                <span className="stat-value">{report.summary?.totalParticipated || 0}</span>
                                <span className="stat-label">Lelang Diikuti</span>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon gold">
                                <Trophy size={24} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-value">{report.summary?.totalWon || 0}</span>
                                <span className="stat-label">Lelang Dimenangkan</span>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon green">
                                <TrendingUp size={24} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-value">{report.summary?.totalBids || 0}</span>
                                <span className="stat-label">Total Bid</span>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon purple">
                                <TrendingUp size={24} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-value">{report.summary?.totalBidAmount || '0'} ETH</span>
                                <span className="stat-label">Total Nilai Bid</span>
                            </div>
                        </div>
                    </div>

                    {report.won && report.won.length > 0 && (
                        <div className="report-section won-section">
                            <h2><Trophy size={24} /> Lelang yang Dimenangkan</h2>
                            <div className="won-grid">
                                {report.won.map((item) => (
                                    <div key={item.id} className="won-card">
                                        <h3>{item.title}</h3>
                                        <div className="won-details">
                                            <span className="won-bid">{item.highest_bid} ETH</span>
                                            <span className="won-date">
                                                {new Date(item.finalized_at).toLocaleDateString('id-ID')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {report.participated && report.participated.length > 0 && (
                        <div className="report-section">
                            <h2>Lelang yang Diikuti</h2>
                            <div className="table-wrapper">
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Judul</th>
                                            <th>Status</th>
                                            <th>Bid Tertinggi</th>
                                            <th>Hasil</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.participated.map((item) => (
                                            <tr key={item.id}>
                                                <td>{item.id}</td>
                                                <td>{item.title}</td>
                                                <td>
                                                    <span className={`status-badge ${item.status}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td>{item.highest_bid ? `${item.highest_bid} ETH` : '-'}</td>
                                                <td>
                                                    <span className={`result-badge ${item.user_result?.toLowerCase() || 'pending'}`}>
                                                        {item.user_result || 'Pending'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {report.recentBids && report.recentBids.length > 0 && (
                        <div className="report-section">
                            <h2>Riwayat Bid Terbaru</h2>
                            <div className="table-wrapper">
                                <table className="report-table">
                                    <thead>
                                        <tr>
                                            <th>Lelang</th>
                                            <th>Jumlah Bid</th>
                                            <th>TX Hash</th>
                                            <th>Waktu</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.recentBids.slice(0, 10).map((bid, idx) => (
                                            <tr key={idx}>
                                                <td>{bid.title}</td>
                                                <td>{bid.bid_amount} ETH</td>
                                                <td className="tx-hash">
                                                    {bid.tx_hash?.substring(0, 10)}...
                                                </td>
                                                <td>{new Date(bid.created_at).toLocaleString('id-ID')}</td>
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
                    <p>Klik "Lihat Laporan" untuk melihat aktivitas Anda</p>
                </div>
            )}
        </div>
    );
};

export default ReportUser;
