const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Starting deployment process...\n");

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deploying contracts with account:", deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // Deploy AuctionManager
    console.log("⏳ Deploying AuctionManager...");
    const AuctionManager = await ethers.getContractFactory("AuctionManager");
    const auctionManager = await AuctionManager.deploy();
    await auctionManager.waitForDeployment();

    const contractAddress = await auctionManager.getAddress();
    console.log("✅ AuctionManager deployed to:", contractAddress);
    console.log("👤 Owner address:", deployer.address);
    console.log("");

    // Verify contract is working
    console.log("🔍 Verifying contract...");
    const owner = await auctionManager.owner();
    const isAdmin = await auctionManager.admins(deployer.address);
    console.log("   Owner:", owner);
    console.log("   Is Admin:", isAdmin);
    console.log("");

    // Update backend .env
    console.log("📝 Updating backend configuration...");
    const backendEnvPath = path.join(__dirname, "../../backend/.env");

    if (fs.existsSync(backendEnvPath)) {
        let envContent = fs.readFileSync(backendEnvPath, "utf8");

        // Update CONTRACT_ADDRESS
        envContent = envContent.replace(
            /CONTRACT_ADDRESS=.*/,
            `CONTRACT_ADDRESS=${contractAddress}`
        );

        fs.writeFileSync(backendEnvPath, envContent);
        console.log("   ✅ Updated backend/.env");
    }

    // Update frontend contract address
    console.log("📝 Updating frontend configuration...");
    const frontendContractPath = path.join(__dirname, "../../frontend/src/contracts");

    if (!fs.existsSync(frontendContractPath)) {
        fs.mkdirSync(frontendContractPath, { recursive: true });
    }

    const contractAddressData = {
        address: contractAddress,
        deployer: deployer.address,
        network: "localhost",
        chainId: 31337,
        deployedAt: new Date().toISOString()
    };

    fs.writeFileSync(
        path.join(frontendContractPath, "contract-address.json"),
        JSON.stringify(contractAddressData, null, 2)
    );
    console.log("   ✅ Updated frontend/src/contracts/contract-address.json");

    // Copy ABI to backend
    console.log("📝 Copying contract ABI...");
    const artifactPath = path.join(__dirname, "../artifacts/contracts/AuctionManager.sol/AuctionManager.json");

    if (fs.existsSync(artifactPath)) {
        const backendContractPath = path.join(__dirname, "../../backend/contracts");
        const frontendContractsPath = path.join(__dirname, "../../frontend/src/contracts");

        if (!fs.existsSync(backendContractPath)) {
            fs.mkdirSync(backendContractPath, { recursive: true });
        }

        if (!fs.existsSync(frontendContractsPath)) {
            fs.mkdirSync(frontendContractsPath, { recursive: true });
        }

        fs.copyFileSync(artifactPath, path.join(backendContractPath, "AuctionManager.json"));
        fs.copyFileSync(artifactPath, path.join(frontendContractsPath, "AuctionManager.json"));

        console.log("   ✅ Copied to backend/contracts/");
        console.log("   ✅ Copied to frontend/src/contracts/");
    }

    console.log("");
    console.log("=" .repeat(50));
    console.log("✨ DEPLOYMENT COMPLETED SUCCESSFULLY!");
    console.log("=" .repeat(50));
    console.log("");
    console.log("📋 Contract Details:");
    console.log("   Address:", contractAddress);
    console.log("   Network: Hardhat Local (Chain ID: 31337)");
    console.log("   Owner:", deployer.address);
    console.log("");
    console.log("🎯 Next Steps:");
    console.log("   1. Restart backend server (Ctrl+C and npm start)");
    console.log("   2. Refresh frontend browser");
    console.log("   3. Connect MetaMask to Hardhat Local network");
    console.log("   4. Start creating auctions!");
    console.log("");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Deployment failed:");
        console.error(error);
        process.exit(1);
    });
