const hre = require("hardhat");

async function main() {
    console.log("Memulai deployment AuctionManager...");

    const AuctionManager = await hre.ethers.getContractFactory("AuctionManager");
    const auctionManager = await AuctionManager.deploy();

    await auctionManager.waitForDeployment();

    const address = await auctionManager.getAddress();

    console.log("AuctionManager berhasil di-deploy ke:", address);
    console.log("Network:", hre.network.name);

    const fs = require("fs");
    const path = require("path");

    // === AUTO SYNC ABI ===
    const artifactPath = path.join(__dirname, "../artifacts/contracts/AuctionManager.sol/AuctionManager.json");
    const frontendAbiPath = path.join(__dirname, "../../frontend/src/contracts/AuctionManager.json");
    const backendAbiPath = path.join(__dirname, "../../backend/contracts/AuctionManager.json");

    if (fs.existsSync(artifactPath)) {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

        const frontendDir = path.dirname(frontendAbiPath);
        const backendDir = path.dirname(backendAbiPath);

        if (!fs.existsSync(frontendDir)) fs.mkdirSync(frontendDir, { recursive: true });
        if (!fs.existsSync(backendDir)) fs.mkdirSync(backendDir, { recursive: true });

        fs.writeFileSync(frontendAbiPath, JSON.stringify(artifact, null, 2));
        fs.writeFileSync(backendAbiPath, JSON.stringify(artifact, null, 2));

        console.log("[OK] ABI copied to frontend & backend");
    }

    // === AUTO UPDATE CONTRACT ADDRESS IN FRONTEND .ENV ===
    const frontendEnvPath = path.join(__dirname, "../../frontend/.env");

    try {
        let envContent = "";

        if (fs.existsSync(frontendEnvPath)) {
            envContent = fs.readFileSync(frontendEnvPath, "utf8");
        }

        // Replace or add VITE_CONTRACT_ADDRESS
        if (envContent.includes("VITE_CONTRACT_ADDRESS=")) {
            envContent = envContent.replace(
                /VITE_CONTRACT_ADDRESS=.*/,
                `VITE_CONTRACT_ADDRESS=${address}`
            );
        } else {
            envContent += `\nVITE_CONTRACT_ADDRESS=${address}\n`;
        }

        fs.writeFileSync(frontendEnvPath, envContent.trim() + "\n");
        console.log("[OK] Contract address updated in frontend/.env");
    } catch (err) {
        console.log("[WARN] Could not update frontend/.env:", err.message);
    }

    // === AUTO UPDATE CONTRACT ADDRESS IN BACKEND .ENV ===
    const backendEnvPath = path.join(__dirname, "../../backend/.env");

    try {
        let envContent = "";

        if (fs.existsSync(backendEnvPath)) {
            envContent = fs.readFileSync(backendEnvPath, "utf8");
        }

        // Replace or add CONTRACT_ADDRESS
        if (envContent.includes("CONTRACT_ADDRESS=")) {
            envContent = envContent.replace(
                /CONTRACT_ADDRESS=.*/,
                `CONTRACT_ADDRESS=${address}`
            );
        } else {
            envContent += `\nCONTRACT_ADDRESS=${address}\n`;
        }

        // Also add ADMIN_PRIVATE_KEY if not exists (Hardhat default account #0)
        if (!envContent.includes("ADMIN_PRIVATE_KEY=")) {
            envContent += `\nADMIN_PRIVATE_KEY=ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80\n`;
        }

        fs.writeFileSync(backendEnvPath, envContent.trim() + "\n");
        console.log("[OK] Contract address updated in backend/.env");
    } catch (err) {
        console.log("[WARN] Could not update backend/.env:", err.message);
    }

    if (hre.network.name === "sepolia") {
        console.log("Tunggu konfirmasi block...");
        await new Promise(resolve => setTimeout(resolve, 30000));

        console.log("Memverifikasi contract di Etherscan...");
        try {
            await hre.run("verify:verify", {
                address: address,
                constructorArguments: []
            });
            console.log("Contract berhasil diverifikasi!");
        } catch (error) {
            console.log("Verifikasi gagal:", error.message);
        }
    }

    return address;
}

main()
    .then((address) => {
        console.log("\n========================================");
        console.log("Deployment selesai!");
        console.log("Contract Address:", address);
        console.log("========================================");
        console.log("\nRestart frontend untuk load address baru.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Deployment gagal:", error);
        process.exit(1);
    });
