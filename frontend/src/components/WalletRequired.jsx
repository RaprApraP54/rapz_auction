import { useWallet } from '../contexts/WalletContext';
import { Wallet, Link2 } from 'lucide-react';
import './WalletRequired.css';

const WalletRequired = ({ children }) => {
    const { isConnected, isConnecting, connectWallet, isMetamaskInstalled, error } = useWallet();

    if (!isMetamaskInstalled) {
        return (
            <div className="wallet-required">
                <div className="wallet-required-content">
                    <div className="wallet-icon">
                        <Wallet size={48} />
                    </div>
                    <h2>Metamask Diperlukan</h2>
                    <p>Anda perlu menginstall Metamask untuk menggunakan fitur ini.</p>
                    <a
                        href="https://metamask.io/download/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                    >
                        Install Metamask
                    </a>
                </div>
            </div>
        );
    }

    if (!isConnected) {
        return (
            <div className="wallet-required">
                <div className="wallet-required-content">
                    <div className="wallet-icon">
                        <Link2 size={48} />
                    </div>
                    <h2>Hubungkan Wallet</h2>
                    <p>Anda perlu menghubungkan wallet Metamask untuk mengakses fitur ini.</p>
                    {error && <p className="error-message">{error}</p>}
                    <button
                        className="btn btn-primary"
                        onClick={connectWallet}
                        disabled={isConnecting}
                    >
                        {isConnecting ? 'Menghubungkan...' : 'Hubungkan Wallet'}
                    </button>
                </div>
            </div>
        );
    }

    return children;
};

export default WalletRequired;
