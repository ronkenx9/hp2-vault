const hre = require("hardhat");

async function main() {
    console.log("🚀 Starting HP2-Vault Deployment on HashKey Testnet...");

    const [deployer] = await hre.ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log("Deployer address:", deployerAddress);

    // 1. Deploy MockUSDC (Test settlement token)
    console.log("Step 1: Deploying MockUSDC...");
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    const usdcAddress = await usdc.getAddress();
    console.log("✅ MockUSDC deployed to:", usdcAddress);

    // 2. Deploy HP2Arbitrator (The purely stateless resolution oracle)
    console.log("Step 2: Deploying HP2Arbitrator...");
    // Initializing with 5 jurors (using deployer for simplicity in demo)
    const initialJurors = [
        deployerAddress,
        deployerAddress,
        deployerAddress,
        deployerAddress,
        deployerAddress
    ];
    const HP2Arbitrator = await hre.ethers.getContractFactory("HP2Arbitrator");
    const arbitrator = await HP2Arbitrator.deploy(usdcAddress, initialJurors);
    await arbitrator.waitForDeployment();
    const arbitratorAddress = await arbitrator.getAddress();
    console.log("✅ HP2Arbitrator deployed to:", arbitratorAddress);

    // 3. Deploy HP2Vault (The yield-bearing escrow engine)
    console.log("Step 3: Deploying HP2Vault...");
    const initialYieldRate = 500; // 5% base yield
    const HP2Vault = await hre.ethers.getContractFactory("HP2Vault");
    const vault = await HP2Vault.deploy(arbitratorAddress, initialYieldRate);
    await vault.waitForDeployment();
    const vaultAddress = await vault.getAddress();
    console.log("✅ HP2Vault deployed to:", vaultAddress);

    console.log("\n--- Deployment Summary ---");
    console.log(`MockUSDC:   ${usdcAddress}`);
    console.log(`Arbitrator: ${arbitratorAddress}`);
    console.log(`Vault:      ${vaultAddress}`);
    console.log("--------------------------");
    console.log("\nNext Steps:");
    console.log(`1. Update merchant-portal/src/app/dashboard/page.tsx with NEXT_PUBLIC_VAULT_ADDRESS=${vaultAddress}`);
    console.log(`2. Update merchant-portal/src/app/dashboard/page.tsx with NEXT_PUBLIC_TOKEN_ADDRESS=${usdcAddress}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
