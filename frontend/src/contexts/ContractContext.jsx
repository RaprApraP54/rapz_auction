import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from './WalletContext';
import AuctionManagerABI from '../contracts/AuctionManager.json';

const ContractContext = createContext(null);

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';

export const useContract = () => {
    const context = useContext(ContractContext);
    if (!context) {
        throw new Error('useContract must be used within ContractProvider');
    }
    return context;
};

export const ContractProvider = ({ children }) => {
    const { provider, signer, isConnected } = useWallet();
    const [contract, setContract] = useState(null);
    const [contractWithSigner, setContractWithSigner] = useState(null);

    useEffect(() => {
        if (provider && CONTRACT_ADDRESS) {
            const readContract = new ethers.Contract(
                CONTRACT_ADDRESS,
                AuctionManagerABI.abi,
                provider
            );
            setContract(readContract);
        }
    }, [provider]);

    useEffect(() => {
        if (signer && CONTRACT_ADDRESS) {
            const writeContract = new ethers.Contract(
                CONTRACT_ADDRESS,
                AuctionManagerABI.abi,
                signer
            );
            setContractWithSigner(writeContract);
        }
    }, [signer]);

    const createAuction = useCallback(async (startingBidEth, minBidIncrementEth, durationMinutes) => {
        if (!contractWithSigner) throw new Error('Contract not initialized');

        const startingBid = ethers.parseEther(startingBidEth.toString());
        const minBidIncrement = ethers.parseEther(minBidIncrementEth.toString());

        const tx = await contractWithSigner.createAuction(
            startingBid,
            minBidIncrement,
            durationMinutes
        );

        const receipt = await tx.wait();
        const event = receipt.logs.find(log => {
            try {
                const parsed = contractWithSigner.interface.parseLog(log);
                return parsed.name === 'AuctionCreated';
            } catch {
                return false;
            }
        });

        if (event) {
            const parsed = contractWithSigner.interface.parseLog(event);
            return {
                txHash: receipt.hash,
                auctionId: Number(parsed.args[0])
            };
        }

        return { txHash: receipt.hash, auctionId: null };
    }, [contractWithSigner]);

    const placeBid = useCallback(async (auctionId, bidAmountEth) => {
        if (!contractWithSigner) throw new Error('Contract not initialized');

        const bidAmount = ethers.parseEther(bidAmountEth.toString());

        const tx = await contractWithSigner.placeBid(auctionId, {
            value: bidAmount
        });

        const receipt = await tx.wait();
        return { txHash: receipt.hash };
    }, [contractWithSigner]);

    const finalizeAuction = useCallback(async (auctionId) => {
        if (!contractWithSigner) throw new Error('Contract not initialized');

        const tx = await contractWithSigner.finalizeAuction(auctionId);
        const receipt = await tx.wait();
        return { txHash: receipt.hash };
    }, [contractWithSigner]);

    const adminStopAuction = useCallback(async (auctionId) => {
        if (!contractWithSigner) throw new Error('Contract not initialized');

        const tx = await contractWithSigner.adminStopAuction(auctionId);
        const receipt = await tx.wait();
        return { txHash: receipt.hash };
    }, [contractWithSigner]);

    const getAuction = useCallback(async (auctionId) => {
        if (!contract) return null;

        const auction = await contract.getAuction(auctionId);
        return {
            id: Number(auction[0]),
            owner: auction[1],
            startingBid: ethers.formatEther(auction[2]),
            minBidIncrement: ethers.formatEther(auction[3]),
            endTime: Number(auction[4]),
            highestBidder: auction[5],
            highestBid: ethers.formatEther(auction[6]),
            isActive: auction[7],
            isFinalized: auction[8]
        };
    }, [contract]);

    const getLeaderboard = useCallback(async (auctionId) => {
        if (!contract) return null;

        const leaderboard = await contract.getLeaderboard(auctionId);
        return {
            highestBidder: leaderboard[0],
            highestBid: ethers.formatEther(leaderboard[1]),
            lowestBidder: leaderboard[2],
            lowestBid: ethers.formatEther(leaderboard[3]),
            totalBidders: Number(leaderboard[4])
        };
    }, [contract]);

    const getRemainingTime = useCallback(async (auctionId) => {
        if (!contract) return 0;

        const remaining = await contract.getRemainingTime(auctionId);
        return Number(remaining);
    }, [contract]);

    // Check if user has an active auction they're bidding in
    const getUserActiveAuction = useCallback(async (userAddress) => {
        if (!contract || !userAddress) return { hasActive: false, auctionId: 0, isFinished: true };

        try {
            const result = await contract.getUserActiveAuction(userAddress);
            return {
                hasActive: result[0],
                auctionId: Number(result[1]),
                isFinished: result[2]
            };
        } catch (error) {
            console.error('Error getting user active auction:', error);
            return { hasActive: false, auctionId: 0, isFinished: true };
        }
    }, [contract]);

    // ============================================
    // EMERGENCY FUNCTIONS FOR ADMIN
    // ============================================

    // Get all bidders with their deposits for an auction
    const getAuctionBiddersWithDeposits = useCallback(async (auctionId) => {
        if (!contract) return { bidders: [], deposits: [] };

        try {
            const result = await contract.getAuctionBiddersWithDeposits(auctionId);
            return {
                bidders: result[0],
                deposits: result[1].map(d => ethers.formatEther(d))
            };
        } catch (error) {
            console.error('Error getting bidders with deposits:', error);
            return { bidders: [], deposits: [] };
        }
    }, [contract]);

    // Admin: Emergency refund single bidder
    const adminEmergencyRefundSingle = useCallback(async (auctionId, bidderAddress) => {
        if (!contractWithSigner) throw new Error('Contract not initialized');

        const tx = await contractWithSigner.adminEmergencyRefundSingle(auctionId, bidderAddress);
        const receipt = await tx.wait();
        return { txHash: receipt.hash };
    }, [contractWithSigner]);

    // Admin: Emergency refund all bidders (except winner)
    const adminEmergencyRefundAll = useCallback(async (auctionId) => {
        if (!contractWithSigner) throw new Error('Contract not initialized');

        const tx = await contractWithSigner.adminEmergencyRefundAll(auctionId);
        const receipt = await tx.wait();
        return { txHash: receipt.hash };
    }, [contractWithSigner]);

    // Admin: Force transfer winner's ETH to owner
    const adminForceTransferToOwner = useCallback(async (auctionId) => {
        if (!contractWithSigner) throw new Error('Contract not initialized');

        const tx = await contractWithSigner.adminForceTransferToOwner(auctionId);
        const receipt = await tx.wait();
        return { txHash: receipt.hash };
    }, [contractWithSigner]);

    // Get contract balance
    const getContractBalance = useCallback(async () => {
        if (!contract) return '0';

        try {
            const balance = await contract.getContractBalance();
            return ethers.formatEther(balance);
        } catch (error) {
            console.error('Error getting contract balance:', error);
            return '0';
        }
    }, [contract]);

    const value = {
        contract,
        contractWithSigner,
        isContractReady: !!contract && !!CONTRACT_ADDRESS,
        createAuction,
        placeBid,
        finalizeAuction,
        adminStopAuction,
        getAuction,
        getLeaderboard,
        getRemainingTime,
        getUserActiveAuction,
        // Emergency functions
        getAuctionBiddersWithDeposits,
        adminEmergencyRefundSingle,
        adminEmergencyRefundAll,
        adminForceTransferToOwner,
        getContractBalance
    };

    return (
        <ContractContext.Provider value={value}>
            {children}
        </ContractContext.Provider>
    );
};
