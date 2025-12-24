const hre = require("hardhat");

async function main() {
    console.log("Memulai deployment AuctionManager...");

    const AuctionManager = await hre.ethers.getContractFactory("AuctionManager");
    const auctionManager = await AuctionManager.deploy();

    await auctionManager.waitForDeployment();

    const address = await auctionManager.getAddress();

    console.log("AuctionManager berhasil di-deploy ke:", address);
    console.log("Network:", hre.network.name);

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
        console.log("\nDeployment selesai!");
        console.log("Contract Address:", address);
        process.exit(0);
    })
    .catch((error) => {
        console.error("Deployment gagal:", error);
        process.exit(1);
    });
