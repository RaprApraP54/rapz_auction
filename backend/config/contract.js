const { ethers } = require('ethers');
const AuctionManagerABI = require('../contracts/AuctionManager.json');

let provider = null;
let contract = null;
let contractWithSigner = null;

const initializeContract = () => {
    try {
        const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
        const contractAddress = process.env.CONTRACT_ADDRESS;
        const privateKey = process.env.ADMIN_PRIVATE_KEY;

        if (!contractAddress) {
            console.warn('CONTRACT_ADDRESS not set in environment variables');
            return null;
        }

        provider = new ethers.JsonRpcProvider(rpcUrl);
        contract = new ethers.Contract(contractAddress, AuctionManagerABI.abi, provider);

        // Create signer for write operations (auto-finalize)
        if (privateKey) {
            const wallet = new ethers.Wallet(privateKey, provider);
            contractWithSigner = new ethers.Contract(contractAddress, AuctionManagerABI.abi, wallet);
            console.log('Contract signer initialized for auto-finalize');
        }

        console.log('Smart contract initialized at:', contractAddress);
        return contract;
    } catch (error) {
        console.error('Failed to initialize contract:', error.message);
        return null;
    }
};

const getProvider = () => provider;

const getContract = () => contract;

const getContractWithSigner = () => contractWithSigner;

const getAuctionFromContract = async (auctionId) => {
    if (!contract) return null;

    try {
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
    } catch (error) {
        console.error('Error getting auction from contract:', error.message);
        return null;
    }
};

const getLeaderboardFromContract = async (auctionId) => {
    if (!contract) return null;

    try {
        const leaderboard = await contract.getLeaderboard(auctionId);
        return {
            highestBidder: leaderboard[0],
            highestBid: ethers.formatEther(leaderboard[1]),
            lowestBidder: leaderboard[2],
            lowestBid: ethers.formatEther(leaderboard[3]),
            totalBidders: Number(leaderboard[4])
        };
    } catch (error) {
        console.error('Error getting leaderboard from contract:', error.message);
        return null;
    }
};

const getRemainingTime = async (auctionId) => {
    if (!contract) return null;

    try {
        const remainingTime = await contract.getRemainingTime(auctionId);
        return Number(remainingTime);
    } catch (error) {
        console.error('Error getting remaining time:', error.message);
        return null;
    }
};

// Auto-finalize auction from backend
const finalizeAuctionFromBackend = async (auctionId) => {
    if (!contractWithSigner) {
        console.error('Contract signer not initialized. Set ADMIN_PRIVATE_KEY in .env');
        return null;
    }

    try {
        console.log(`[AUTO-FINALIZE] Finalizing auction ${auctionId}...`);
        const tx = await contractWithSigner.finalizeAuction(auctionId);
        const receipt = await tx.wait();
        console.log(`[AUTO-FINALIZE] Auction ${auctionId} finalized. TX: ${receipt.hash}`);
        return { success: true, txHash: receipt.hash };
    } catch (error) {
        console.error(`[AUTO-FINALIZE] Error finalizing auction ${auctionId}:`, error.message);
        return { success: false, error: error.message };
    }
};

module.exports = {
    initializeContract,
    getProvider,
    getContract,
    getContractWithSigner,
    getAuctionFromContract,
    getLeaderboardFromContract,
    getRemainingTime,
    finalizeAuctionFromBackend
};

