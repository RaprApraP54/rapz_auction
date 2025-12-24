import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auctionAPI } from '../services/api';
import { useContract } from '../contexts/ContractContext';
import WalletRequired from '../components/WalletRequired';
import { CheckCircle, ArrowRight, FileText, Rocket, PartyPopper } from 'lucide-react';
import './CreateAuction.css';

const CreateAuction = () => {
    const navigate = useNavigate();
    const { createAuction, isContractReady } = useContract();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        image_url: '',
        starting_bid: '',
        min_bid_increment: '',
        duration_minutes: ''
    });
    const [step, setStep] = useState(1);
    const [auctionId, setAuctionId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmitStep1 = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const response = await auctionAPI.create({
                title: formData.title,
                description: formData.description,
                image_url: formData.image_url || null,
                starting_bid: parseFloat(formData.starting_bid),
                min_bid_increment: parseFloat(formData.min_bid_increment),
                duration_minutes: parseInt(formData.duration_minutes)
            });
            setAuctionId(response.data.id);
            setStep(2);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeployToBlockchain = async () => {
        if (!isContractReady) {
            setError('Smart contract belum dikonfigurasi');
            return;
        }

        setError(null);
        setIsLoading(true);

        try {
            const result = await createAuction(
                formData.starting_bid,
                formData.min_bid_increment,
                formData.duration_minutes
            );

            await auctionAPI.updateContractId(auctionId, result.auctionId);
            setStep(3);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <WalletRequired>
            <div className="create-auction-page">
                <div className="create-auction-card">
                    <div className="stepper">
                        <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                            <span className="step-number">1</span>
                            <span className="step-label">Data Lelang</span>
                        </div>
                        <div className="step-line"></div>
                        <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                            <span className="step-number">2</span>
                            <span className="step-label">Deploy Blockchain</span>
                        </div>
                        <div className="step-line"></div>
                        <div className={`step ${step >= 3 ? 'active' : ''}`}>
                            <span className="step-number">3</span>
                            <span className="step-label">Selesai</span>
                        </div>
                    </div>

                    {step === 1 && (
                        <>
                            <h1>Buat Lelang Baru</h1>
                            <p className="subtitle">Isi detail lelang Anda</p>

                            <form onSubmit={handleSubmitStep1} className="auction-form">
                                <div className="form-group">
                                    <label htmlFor="title">Judul Lelang *</label>
                                    <input
                                        type="text"
                                        id="title"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        placeholder="Contoh: iPhone 15 Pro Max"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="description">Deskripsi</label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Deskripsi barang yang dilelang..."
                                        rows="4"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="image_url">URL Gambar</label>
                                    <input
                                        type="url"
                                        id="image_url"
                                        name="image_url"
                                        value={formData.image_url}
                                        onChange={handleChange}
                                        placeholder="https://example.com/image.jpg"
                                    />
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="starting_bid">Bid Awal (ETH) *</label>
                                        <input
                                            type="number"
                                            step="0.0001"
                                            id="starting_bid"
                                            name="starting_bid"
                                            value={formData.starting_bid}
                                            onChange={handleChange}
                                            placeholder="0.1"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="min_bid_increment">Min. Kenaikan (ETH) *</label>
                                        <input
                                            type="number"
                                            step="0.0001"
                                            id="min_bid_increment"
                                            name="min_bid_increment"
                                            value={formData.min_bid_increment}
                                            onChange={handleChange}
                                            placeholder="0.01"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="duration_minutes">Durasi (Menit) *</label>
                                    <input
                                        type="number"
                                        id="duration_minutes"
                                        name="duration_minutes"
                                        value={formData.duration_minutes}
                                        onChange={handleChange}
                                        placeholder="60"
                                        min="1"
                                        required
                                    />
                                </div>

                                {error && <div className="form-error">{error}</div>}

                                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                                    {isLoading ? 'Memproses...' : 'Lanjut ke Deploy'}
                                </button>
                            </form>
                        </>
                    )}

                    {step === 2 && (
                        <div className="deploy-step">
                            <h1>Deploy ke Blockchain</h1>
                            <p className="subtitle">Lelang sudah tersimpan. Sekarang deploy ke smart contract.</p>

                            <div className="deploy-info">
                                <div className="info-item">
                                    <span className="info-label">Judul</span>
                                    <span className="info-value">{formData.title}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Bid Awal</span>
                                    <span className="info-value">{formData.starting_bid} ETH</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Min. Kenaikan</span>
                                    <span className="info-value">{formData.min_bid_increment} ETH</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Durasi</span>
                                    <span className="info-value">{formData.duration_minutes} menit</span>
                                </div>
                            </div>

                            {error && <div className="form-error">{error}</div>}

                            <button
                                className="btn btn-primary deploy-btn"
                                onClick={handleDeployToBlockchain}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Memproses Transaksi...' : 'Deploy dengan Metamask'}
                            </button>

                            <p className="deploy-note">
                                Metamask akan terbuka untuk mengonfirmasi transaksi.
                                Anda tidak perlu membayar ETH, hanya gas fee.
                            </p>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="success-step">
                            <div className="success-icon">
                                <CheckCircle size={64} strokeWidth={1.5} />
                            </div>
                            <h1>Lelang Berhasil Dibuat!</h1>
                            <p>Lelang Anda sudah aktif di blockchain.</p>

                            <div className="success-actions">
                                <button
                                    className="btn btn-primary"
                                    onClick={() => navigate(`/auctions/${auctionId}`)}
                                >
                                    Lihat Lelang
                                </button>
                                <button
                                    className="btn btn-outline"
                                    onClick={() => navigate('/auctions')}
                                >
                                    Ke Daftar Lelang
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </WalletRequired>
    );
};

export default CreateAuction;
