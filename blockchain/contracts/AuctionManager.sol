// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AuctionManager is ReentrancyGuard, Ownable {
    
    struct Auction {
        uint256 id;
        address payable owner;
        uint256 startingBid;
        uint256 minBidIncrement;
        uint256 endTime;
        address highestBidder;
        uint256 highestBid;
        bool isActive;
        bool isFinalized;
    }

    struct Bid {
        address bidder;
        uint256 amount;
        uint256 timestamp;
    }

    uint256 private _auctionIdCounter;
    
    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => Bid[]) public auctionBids;
    mapping(uint256 => mapping(address => uint256)) public bidderDeposits;
    mapping(uint256 => address[]) public auctionBidders;
    mapping(address => bool) public admins;
    
    // Track user's active auction (0 means no active auction, actual ID + 1 to handle auction ID 0)
    mapping(address => uint256) public userActiveAuction;

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed owner,
        uint256 startingBid,
        uint256 minBidIncrement,
        uint256 endTime
    );
    
    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount
    );
    
    event AuctionFinalized(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 amount
    );
    
    event AuctionStopped(
        uint256 indexed auctionId,
        address indexed stoppedBy
    );
    
    event RefundIssued(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount
    );

    modifier onlyAdmin() {
        require(admins[msg.sender] || owner() == msg.sender, "Bukan admin");
        _;
    }

    modifier auctionExists(uint256 auctionId) {
        require(auctionId < _auctionIdCounter, "Lelang tidak ditemukan");
        _;
    }

    modifier auctionActive(uint256 auctionId) {
        require(auctions[auctionId].isActive, "Lelang tidak aktif");
        require(!auctions[auctionId].isFinalized, "Lelang sudah selesai");
        require(block.timestamp < auctions[auctionId].endTime, "Lelang sudah berakhir");
        _;
    }

    constructor() Ownable(msg.sender) {
        admins[msg.sender] = true;
    }

    function addAdmin(address _admin) external onlyOwner {
        admins[_admin] = true;
    }

    function removeAdmin(address _admin) external onlyOwner {
        admins[_admin] = false;
    }

    function createAuction(
        uint256 _startingBid,
        uint256 _minBidIncrement,
        uint256 _durationMinutes
    ) external returns (uint256) {
        require(_startingBid > 0, "Bid awal harus lebih dari 0");
        require(_minBidIncrement > 0, "Minimal increment harus lebih dari 0");
        require(_durationMinutes > 0, "Durasi harus lebih dari 0");

        uint256 auctionId = _auctionIdCounter;
        _auctionIdCounter++;

        uint256 endTime = block.timestamp + (_durationMinutes * 1 minutes);

        auctions[auctionId] = Auction({
            id: auctionId,
            owner: payable(msg.sender),
            startingBid: _startingBid,
            minBidIncrement: _minBidIncrement,
            endTime: endTime,
            highestBidder: address(0),
            highestBid: 0,
            isActive: true,
            isFinalized: false
        });

        emit AuctionCreated(
            auctionId,
            msg.sender,
            _startingBid,
            _minBidIncrement,
            endTime
        );

        return auctionId;
    }

    function placeBid(uint256 auctionId) 
        external 
        payable 
        nonReentrant 
        auctionExists(auctionId) 
        auctionActive(auctionId) 
    {
        Auction storage auction = auctions[auctionId];
        
        require(msg.sender != auction.owner, "Pemilik tidak bisa bid");
        require(!admins[msg.sender], "Admin tidak bisa bid");
        
        // Check if user is already bidding in another auction
        uint256 activeAuction = userActiveAuction[msg.sender];
        if (activeAuction > 0) {
            // User has an active auction, must be this one or the old one must be finished
            uint256 previousAuctionId = activeAuction - 1;
            if (previousAuctionId != auctionId) {
                // Check if previous auction is finished
                Auction memory prevAuction = auctions[previousAuctionId];
                require(
                    prevAuction.isFinalized || !prevAuction.isActive || block.timestamp >= prevAuction.endTime,
                    "Anda masih aktif di lelang lain. Selesaikan dulu sebelum bid di lelang ini."
                );
                // Clear previous auction since it's finished
                userActiveAuction[msg.sender] = 0;
            }
        }
        
        uint256 currentDeposit = bidderDeposits[auctionId][msg.sender];
        uint256 totalBid = currentDeposit + msg.value;
        
        if (auction.highestBid == 0) {
            require(totalBid >= auction.startingBid, "Bid harus >= bid awal");
        } else {
            require(
                totalBid >= auction.highestBid + auction.minBidIncrement,
                "Bid harus >= bid tertinggi + minimal increment"
            );
        }

        if (currentDeposit == 0) {
            auctionBidders[auctionId].push(msg.sender);
            // Set this as user's active auction (store auctionId + 1 to handle ID 0)
            userActiveAuction[msg.sender] = auctionId + 1;
        }

        bidderDeposits[auctionId][msg.sender] = totalBid;
        auction.highestBidder = msg.sender;
        auction.highestBid = totalBid;

        auctionBids[auctionId].push(Bid({
            bidder: msg.sender,
            amount: totalBid,
            timestamp: block.timestamp
        }));

        emit BidPlaced(auctionId, msg.sender, totalBid);
    }

    function finalizeAuction(uint256 auctionId) 
        external 
        nonReentrant 
        auctionExists(auctionId) 
    {
        Auction storage auction = auctions[auctionId];
        
        require(auction.isActive, "Lelang tidak aktif");
        require(!auction.isFinalized, "Lelang sudah difinalisasi");
        require(block.timestamp >= auction.endTime, "Lelang belum berakhir");

        auction.isActive = false;
        auction.isFinalized = true;

        address[] memory bidders = auctionBidders[auctionId];

        // Clear all users' active auction status first
        for (uint256 i = 0; i < bidders.length; i++) {
            if (userActiveAuction[bidders[i]] == auctionId + 1) {
                userActiveAuction[bidders[i]] = 0;
            }
        }

        if (auction.highestBidder != address(0)) {
            // Get winner's actual deposit
            uint256 winnerDeposit = bidderDeposits[auctionId][auction.highestBidder];
            
            // Clear winner's deposit BEFORE transfer
            bidderDeposits[auctionId][auction.highestBidder] = 0;
            
            // Transfer winner's deposit to auction owner using call
            if (winnerDeposit > 0) {
                (bool ownerSuccess, ) = auction.owner.call{value: winnerDeposit}("");
                require(ownerSuccess, "Transfer ke owner gagal");
            }

            // Refund losing bidders
            for (uint256 i = 0; i < bidders.length; i++) {
                address bidder = bidders[i];
                if (bidder != auction.highestBidder) {
                    uint256 refundAmount = bidderDeposits[auctionId][bidder];
                    if (refundAmount > 0) {
                        bidderDeposits[auctionId][bidder] = 0;
                        (bool success, ) = payable(bidder).call{value: refundAmount}("");
                        if (success) {
                            emit RefundIssued(auctionId, bidder, refundAmount);
                        } else {
                            // Restore deposit jika transfer gagal, agar bisa retry
                            bidderDeposits[auctionId][bidder] = refundAmount;
                        }
                    }
                }
            }

            emit AuctionFinalized(auctionId, auction.highestBidder, winnerDeposit);
        } else {
            emit AuctionFinalized(auctionId, address(0), 0);
        }
    }

    function adminStopAuction(uint256 auctionId) 
        external 
        nonReentrant 
        onlyAdmin 
        auctionExists(auctionId) 
    {
        Auction storage auction = auctions[auctionId];
        
        require(auction.isActive, "Lelang sudah tidak aktif");
        require(!auction.isFinalized, "Lelang sudah difinalisasi");

        auction.isActive = false;
        auction.isFinalized = true;

        address[] memory bidders = auctionBidders[auctionId];

        // Clear all users' active auction status first
        for (uint256 i = 0; i < bidders.length; i++) {
            if (userActiveAuction[bidders[i]] == auctionId + 1) {
                userActiveAuction[bidders[i]] = 0;
            }
        }

        // If there's a winner, transfer their deposit to owner and refund losers
        if (auction.highestBidder != address(0)) {
            // Get winner's actual deposit (not highestBid which may differ)
            uint256 winnerDeposit = bidderDeposits[auctionId][auction.highestBidder];
            
            // Clear winner's deposit BEFORE transfer
            bidderDeposits[auctionId][auction.highestBidder] = 0;
            
            // Transfer winner's deposit to auction owner using call
            if (winnerDeposit > 0) {
                (bool ownerSuccess, ) = auction.owner.call{value: winnerDeposit}("");
                require(ownerSuccess, "Transfer ke owner gagal");
            }

            // Refund losing bidders
            for (uint256 i = 0; i < bidders.length; i++) {
                address bidder = bidders[i];
                if (bidder != auction.highestBidder) {
                    uint256 refundAmount = bidderDeposits[auctionId][bidder];
                    if (refundAmount > 0) {
                        bidderDeposits[auctionId][bidder] = 0;
                        (bool success, ) = payable(bidder).call{value: refundAmount}("");
                        if (success) {
                            emit RefundIssued(auctionId, bidder, refundAmount);
                        } else {
                            // Restore deposit jika transfer gagal, agar bisa retry
                            bidderDeposits[auctionId][bidder] = refundAmount;
                        }
                    }
                }
            }

            emit AuctionFinalized(auctionId, auction.highestBidder, winnerDeposit);
        } else {
            // No winner, refund all bidders
            for (uint256 i = 0; i < bidders.length; i++) {
                address bidder = bidders[i];
                uint256 refundAmount = bidderDeposits[auctionId][bidder];
                if (refundAmount > 0) {
                    bidderDeposits[auctionId][bidder] = 0;
                    (bool success, ) = payable(bidder).call{value: refundAmount}("");
                    if (success) {
                        emit RefundIssued(auctionId, bidder, refundAmount);
                    } else {
                        // Restore deposit jika transfer gagal, agar bisa retry
                        bidderDeposits[auctionId][bidder] = refundAmount;
                    }
                }
            }
            
            emit AuctionFinalized(auctionId, address(0), 0);
        }

        emit AuctionStopped(auctionId, msg.sender);

    }

    function getAuction(uint256 auctionId) 
        external 
        view 
        auctionExists(auctionId) 
        returns (
            uint256 id,
            address owner,
            uint256 startingBid,
            uint256 minBidIncrement,
            uint256 endTime,
            address highestBidder,
            uint256 highestBid,
            bool isActive,
            bool isFinalized
        ) 
    {
        Auction memory auction = auctions[auctionId];
        return (
            auction.id,
            auction.owner,
            auction.startingBid,
            auction.minBidIncrement,
            auction.endTime,
            auction.highestBidder,
            auction.highestBid,
            auction.isActive,
            auction.isFinalized
        );
    }

    function getAuctionBids(uint256 auctionId) 
        external 
        view 
        auctionExists(auctionId) 
        returns (Bid[] memory) 
    {
        return auctionBids[auctionId];
    }

    function getLeaderboard(uint256 auctionId) 
        external 
        view 
        auctionExists(auctionId) 
        returns (
            address highestBidder,
            uint256 highestBid,
            address lowestBidder,
            uint256 lowestBid,
            uint256 totalBidders
        ) 
    {
        Auction storage auction = auctions[auctionId];
        address[] memory bidders = auctionBidders[auctionId];
        
        if (bidders.length == 0) {
            return (address(0), 0, address(0), 0, 0);
        }

        // Always use stored values for highest bidder (persists after finalization)
        // For lowest bidder: if finalized, return same as highest; if active, find from deposits
        if (auction.isFinalized || !auction.isActive) {
            return (auction.highestBidder, auction.highestBid, auction.highestBidder, auction.highestBid, bidders.length);
        }

        // Active auction - find lowest from deposits
        address low = bidders[0];
        uint256 lowBid = bidderDeposits[auctionId][bidders[0]];
        
        for (uint256 i = 1; i < bidders.length; i++) {
            uint256 dep = bidderDeposits[auctionId][bidders[i]];
            if (dep > 0 && dep < lowBid) {
                lowBid = dep;
                low = bidders[i];
            }
        }

        return (auction.highestBidder, auction.highestBid, low, lowBid, bidders.length);
    }

    function getBidderDeposit(uint256 auctionId, address bidder) 
        external 
        view 
        returns (uint256) 
    {
        return bidderDeposits[auctionId][bidder];
    }

    function getAuctionCount() external view returns (uint256) {
        return _auctionIdCounter;
    }

    function isAuctionEnded(uint256 auctionId) 
        external 
        view 
        auctionExists(auctionId) 
        returns (bool) 
    {
        return block.timestamp >= auctions[auctionId].endTime;
    }

    function getRemainingTime(uint256 auctionId) 
        external 
        view 
        auctionExists(auctionId) 
        returns (uint256) 
    {
        if (block.timestamp >= auctions[auctionId].endTime) {
            return 0;
        }
        return auctions[auctionId].endTime - block.timestamp;
    }

    // Get user's active auction info
    // Returns: (hasActiveAuction, activeAuctionId, isAuctionFinished)
    function getUserActiveAuction(address user) 
        external 
        view 
        returns (bool hasActive, uint256 auctionId, bool isFinished) 
    {
        uint256 stored = userActiveAuction[user];
        if (stored == 0) {
            return (false, 0, true);
        }
        
        uint256 activeId = stored - 1;
        Auction memory auction = auctions[activeId];
        bool finished = auction.isFinalized || !auction.isActive || block.timestamp >= auction.endTime;
        
        return (true, activeId, finished);
    }

    // ============================================
    // EMERGENCY FUNCTIONS FOR ADMIN
    // ============================================

    // Event for emergency refund
    event EmergencyRefund(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event EmergencyTransferToOwner(uint256 indexed auctionId, address indexed owner, uint256 amount);

    // Check how much ETH a specific bidder still has stuck in an auction
    function getStuckDeposit(uint256 auctionId, address bidder) 
        external 
        view 
        auctionExists(auctionId) 
        returns (uint256) 
    {
        return bidderDeposits[auctionId][bidder];
    }

    // Get all bidders and their stuck deposits for an auction
    function getAuctionBiddersWithDeposits(uint256 auctionId) 
        external 
        view 
        auctionExists(auctionId) 
        returns (address[] memory bidders, uint256[] memory deposits) 
    {
        address[] memory allBidders = auctionBidders[auctionId];
        uint256[] memory allDeposits = new uint256[](allBidders.length);
        
        for (uint256 i = 0; i < allBidders.length; i++) {
            allDeposits[i] = bidderDeposits[auctionId][allBidders[i]];
        }
        
        return (allBidders, allDeposits);
    }

    // Admin: Force refund a single bidder (emergency use)
    function adminEmergencyRefundSingle(uint256 auctionId, address bidder)
        external
        nonReentrant
        onlyAdmin
        auctionExists(auctionId)
    {
        uint256 refundAmount = bidderDeposits[auctionId][bidder];
        require(refundAmount > 0, "Tidak ada deposit untuk dikembalikan");

        // Clear deposit before transfer
        bidderDeposits[auctionId][bidder] = 0;
        
        // Clear user's active auction
        if (userActiveAuction[bidder] == auctionId + 1) {
            userActiveAuction[bidder] = 0;
        }

        // Transfer with call instead of transfer for better error handling
        (bool success, ) = payable(bidder).call{value: refundAmount}("");
        require(success, "Transfer gagal");

        emit EmergencyRefund(auctionId, bidder, refundAmount);
    }

    // Admin: Force refund ALL bidders except winner (emergency use)
    function adminEmergencyRefundAll(uint256 auctionId)
        external
        nonReentrant
        onlyAdmin
        auctionExists(auctionId)
    {
        Auction storage auction = auctions[auctionId];
        address[] memory bidders = auctionBidders[auctionId];

        for (uint256 i = 0; i < bidders.length; i++) {
            address bidder = bidders[i];
            
            // Skip winner - their ETH goes to owner
            if (bidder == auction.highestBidder) {
                continue;
            }

            uint256 refundAmount = bidderDeposits[auctionId][bidder];
            if (refundAmount > 0) {
                bidderDeposits[auctionId][bidder] = 0;
                
                if (userActiveAuction[bidder] == auctionId + 1) {
                    userActiveAuction[bidder] = 0;
                }

                (bool success, ) = payable(bidder).call{value: refundAmount}("");
                if (success) {
                    emit EmergencyRefund(auctionId, bidder, refundAmount);
                }
                // If fails, deposit is already 0 but we continue with others
            }
        }
    }

    // Admin: Force transfer winner's ETH to auction owner
    function adminForceTransferToOwner(uint256 auctionId)
        external
        nonReentrant
        onlyAdmin
        auctionExists(auctionId)
    {
        Auction storage auction = auctions[auctionId];
        require(auction.highestBidder != address(0), "Tidak ada pemenang");

        uint256 winnerDeposit = bidderDeposits[auctionId][auction.highestBidder];
        require(winnerDeposit > 0, "Deposit pemenang sudah ditransfer");

        // Clear winner's deposit
        bidderDeposits[auctionId][auction.highestBidder] = 0;
        
        // Clear winner's active auction
        if (userActiveAuction[auction.highestBidder] == auctionId + 1) {
            userActiveAuction[auction.highestBidder] = 0;
        }

        // Transfer to owner
        (bool success, ) = auction.owner.call{value: winnerDeposit}("");
        require(success, "Transfer ke owner gagal");

        emit EmergencyTransferToOwner(auctionId, auction.owner, winnerDeposit);
    }

    // Get contract balance (for debugging)
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
