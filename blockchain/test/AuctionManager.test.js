const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AuctionManager", function () {
    let auctionManager;
    let owner;
    let admin;
    let user1;
    let user2;
    let user3;

    const STARTING_BID = ethers.parseEther("0.1");
    const MIN_BID_INCREMENT = ethers.parseEther("0.01");
    const DURATION_MINUTES = 60;

    beforeEach(async function () {
        [owner, admin, user1, user2, user3] = await ethers.getSigners();

        const AuctionManager = await ethers.getContractFactory("AuctionManager");
        auctionManager = await AuctionManager.deploy();
        await auctionManager.waitForDeployment();

        await auctionManager.addAdmin(admin.address);
    });

    describe("Deployment", function () {
        it("Harus set owner dengan benar", async function () {
            expect(await auctionManager.owner()).to.equal(owner.address);
        });

        it("Owner harus menjadi admin", async function () {
            expect(await auctionManager.admins(owner.address)).to.be.true;
        });
    });

    describe("Create Auction", function () {
        it("User bisa membuat lelang", async function () {
            await expect(
                auctionManager.connect(user1).createAuction(
                    STARTING_BID,
                    MIN_BID_INCREMENT,
                    DURATION_MINUTES
                )
            ).to.emit(auctionManager, "AuctionCreated");
        });

        it("Tidak bisa membuat lelang dengan starting bid 0", async function () {
            await expect(
                auctionManager.connect(user1).createAuction(
                    0,
                    MIN_BID_INCREMENT,
                    DURATION_MINUTES
                )
            ).to.be.revertedWith("Bid awal harus lebih dari 0");
        });

        it("Tidak bisa membuat lelang dengan min increment 0", async function () {
            await expect(
                auctionManager.connect(user1).createAuction(
                    STARTING_BID,
                    0,
                    DURATION_MINUTES
                )
            ).to.be.revertedWith("Minimal increment harus lebih dari 0");
        });
    });

    describe("Place Bid", function () {
        beforeEach(async function () {
            await auctionManager.connect(user1).createAuction(
                STARTING_BID,
                MIN_BID_INCREMENT,
                DURATION_MINUTES
            );
        });

        it("User bisa menempatkan bid", async function () {
            await expect(
                auctionManager.connect(user2).placeBid(0, { value: STARTING_BID })
            ).to.emit(auctionManager, "BidPlaced");
        });

        it("Bid harus >= starting bid untuk bid pertama", async function () {
            const lowBid = ethers.parseEther("0.05");
            await expect(
                auctionManager.connect(user2).placeBid(0, { value: lowBid })
            ).to.be.revertedWith("Bid harus >= bid awal");
        });

        it("Bid harus >= highest bid + min increment", async function () {
            await auctionManager.connect(user2).placeBid(0, { value: STARTING_BID });

            const lowBid = STARTING_BID + ethers.parseEther("0.005");
            await expect(
                auctionManager.connect(user3).placeBid(0, { value: lowBid })
            ).to.be.revertedWith("Bid harus >= bid tertinggi + minimal increment");
        });

        it("Owner tidak bisa bid di lelangnya sendiri", async function () {
            await expect(
                auctionManager.connect(user1).placeBid(0, { value: STARTING_BID })
            ).to.be.revertedWith("Pemilik tidak bisa bid");
        });

        it("Admin tidak bisa bid", async function () {
            await expect(
                auctionManager.connect(admin).placeBid(0, { value: STARTING_BID })
            ).to.be.revertedWith("Admin tidak bisa bid");
        });
    });

    describe("Finalize Auction", function () {
        beforeEach(async function () {
            await auctionManager.connect(user1).createAuction(
                STARTING_BID,
                MIN_BID_INCREMENT,
                1
            );

            await auctionManager.connect(user2).placeBid(0, { value: STARTING_BID });

            const higherBid = STARTING_BID + MIN_BID_INCREMENT;
            await auctionManager.connect(user3).placeBid(0, { value: higherBid });
        });

        it("Lelang bisa difinalisasi setelah waktu berakhir", async function () {
            await ethers.provider.send("evm_increaseTime", [120]);
            await ethers.provider.send("evm_mine");

            const user1BalanceBefore = await ethers.provider.getBalance(user1.address);
            const user2BalanceBefore = await ethers.provider.getBalance(user2.address);

            await expect(auctionManager.finalizeAuction(0))
                .to.emit(auctionManager, "AuctionFinalized");

            const user1BalanceAfter = await ethers.provider.getBalance(user1.address);
            const user2BalanceAfter = await ethers.provider.getBalance(user2.address);

            expect(user1BalanceAfter).to.be.gt(user1BalanceBefore);
            expect(user2BalanceAfter).to.be.gt(user2BalanceBefore);
        });

        it("Tidak bisa finalisasi sebelum waktu berakhir", async function () {
            await expect(auctionManager.finalizeAuction(0))
                .to.be.revertedWith("Lelang belum berakhir");
        });
    });

    describe("Admin Stop Auction", function () {
        beforeEach(async function () {
            await auctionManager.connect(user1).createAuction(
                STARTING_BID,
                MIN_BID_INCREMENT,
                DURATION_MINUTES
            );

            await auctionManager.connect(user2).placeBid(0, { value: STARTING_BID });

            const higherBid = STARTING_BID + MIN_BID_INCREMENT;
            await auctionManager.connect(user3).placeBid(0, { value: higherBid });
        });

        it("Admin bisa menghentikan lelang", async function () {
            const user2BalanceBefore = await ethers.provider.getBalance(user2.address);
            const user3BalanceBefore = await ethers.provider.getBalance(user3.address);

            await expect(auctionManager.connect(admin).adminStopAuction(0))
                .to.emit(auctionManager, "AuctionStopped");

            const user2BalanceAfter = await ethers.provider.getBalance(user2.address);
            const user3BalanceAfter = await ethers.provider.getBalance(user3.address);

            expect(user2BalanceAfter).to.be.gt(user2BalanceBefore);
            expect(user3BalanceAfter).to.be.gt(user3BalanceBefore);
        });

        it("Non-admin tidak bisa menghentikan lelang", async function () {
            await expect(
                auctionManager.connect(user1).adminStopAuction(0)
            ).to.be.revertedWith("Bukan admin");
        });
    });

    describe("Leaderboard", function () {
        beforeEach(async function () {
            await auctionManager.connect(user1).createAuction(
                STARTING_BID,
                MIN_BID_INCREMENT,
                DURATION_MINUTES
            );

            await auctionManager.connect(user2).placeBid(0, { value: STARTING_BID });

            const higherBid = STARTING_BID + MIN_BID_INCREMENT;
            await auctionManager.connect(user3).placeBid(0, { value: higherBid });
        });

        it("Leaderboard menampilkan data dengan benar", async function () {
            const leaderboard = await auctionManager.getLeaderboard(0);

            expect(leaderboard.highestBidder).to.equal(user3.address);
            expect(leaderboard.lowestBidder).to.equal(user2.address);
            expect(leaderboard.totalBidders).to.equal(2);
        });
    });
});
