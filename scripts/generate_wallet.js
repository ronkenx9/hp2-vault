const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
    const wallet = ethers.Wallet.createRandom();
    console.log("--- NEW DEPLOYER WALLET GENERATED ---");
    console.log("Address:    ", wallet.address);
    console.log("Private Key:", wallet.privateKey);
    console.log("-------------------------------------");

    const envPath = path.join(process.cwd(), ".env");
    const envContent = `PRIVATE_KEY=${wallet.privateKey}\n`;

    fs.writeFileSync(envPath, envContent, { flag: 'a' });
    console.log(`\n✅ Private key saved to: ${envPath}`);
    console.log("⚠️  Keep this file secret. Do not commit it.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
