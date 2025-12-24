import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useAuth } from './AuthContext';
import { authAPI } from '../services/api';

const WalletContext = createContext(null);

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWallet must be used within WalletProvider');
    }
    return context;
};

export const WalletProvider = ({ children }) => {
    const { user, updateWalletAddress, isAuthenticated } = useAuth();
    const [account, setAccount] = useState(null);
    const [chainId, setChainId] = useState(null);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);

    const isMetamaskInstalled = typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';

    const connectWallet = useCallback(async () => {
        if (!isMetamaskInstalled) {
            setError('Metamask tidak terinstall. Silakan install Metamask terlebih dahulu.');
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            const browserProvider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await browserProvider.send('eth_requestAccounts', []);
            const network = await browserProvider.getNetwork();
            const walletSigner = await browserProvider.getSigner();

            setProvider(browserProvider);
            setSigner(walletSigner);
            setAccount(accounts[0]);
            setChainId(Number(network.chainId));

            if (isAuthenticated && user && !user.wallet_address) {
                try {
                    await authAPI.linkWallet(accounts[0]);
                    updateWalletAddress(accounts[0]);
                } catch (err) {
                    console.error('Failed to link wallet:', err);
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsConnecting(false);
        }
    }, [isMetamaskInstalled, isAuthenticated, user, updateWalletAddress]);

    const disconnectWallet = useCallback(async () => {
        setAccount(null);
        setChainId(null);
        setProvider(null);
        setSigner(null);

        // Clear any cached permissions in localStorage
        localStorage.removeItem('walletConnected');

        // Try to revoke permissions (not all wallets support this)
        if (window.ethereum && window.ethereum.request) {
            try {
                await window.ethereum.request({
                    method: 'wallet_revokePermissions',
                    params: [{ eth_accounts: {} }]
                });
            } catch (err) {
                // Fallback: some wallets don't support wallet_revokePermissions
                console.log('wallet_revokePermissions not supported, cleared state only');
            }
        }
    }, []);

    useEffect(() => {
        if (!isMetamaskInstalled) return;

        const handleAccountsChanged = (accounts) => {
            if (accounts.length === 0) {
                disconnectWallet();
            } else {
                setAccount(accounts[0]);
            }
        };

        const handleChainChanged = (chainIdHex) => {
            setChainId(parseInt(chainIdHex, 16));
        };

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        return () => {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            window.ethereum.removeListener('chainChanged', handleChainChanged);
        };
    }, [isMetamaskInstalled, disconnectWallet]);

    useEffect(() => {
        if (isMetamaskInstalled) {
            window.ethereum.request({ method: 'eth_accounts' })
                .then(accounts => {
                    if (accounts.length > 0) {
                        connectWallet();
                    }
                })
                .catch(console.error);
        }
    }, [isMetamaskInstalled, connectWallet]);

    const formatAddress = (address) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const value = {
        account,
        chainId,
        provider,
        signer,
        isConnected: !!account,
        isConnecting,
        isMetamaskInstalled,
        error,
        connectWallet,
        disconnectWallet,
        formatAddress
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
};
