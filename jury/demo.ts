import { AIJuryOrchestrator } from './orchestrator';
import { Evidence, VerdictDecision } from './types';
import { Wallet } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

async function runDemo() {
    console.log("--- AI JURY CONVENED ---");

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
        console.error("Please set GROQ_API_KEY in .env");
        process.exit(1);
    }

    // 1. Setup 5 Juror Wallets
    const jurorWallets = [1, 2, 3, 4, 5].map(() => Wallet.createRandom());
    const jurorKeys = jurorWallets.map(w => w.privateKey);
    const arbitratorAddress = "0x" + "1".repeat(40); // Mock
    const chainId = 133; // HashKey Testnet

    const orchestrator = new AIJuryOrchestrator(
        GROQ_API_KEY,
        jurorKeys,
        arbitratorAddress,
        chainId
    );

    // 2. Scenario 1: Delivery Confirmed
    const evidence1: Evidence = {
        cartId: "CART-DEMO-001",
        merchant: "HashKey Store",
        buyer: "MachineAgent_42",
        amount: "500.0 USDC",
        claim: "Service not delivered.",
        deliveryProof: "Transaction Hash 0xabc... confirmed delivery of 디지털 자산 to buyer's wallet at block 5020."
    };

    console.log("\n[Scenario 1] Merchant provided proof of delivery.");
    try {
        const verdict1 = await orchestrator.resolveDispute(1, evidence1);
        console.log("Verdict:", verdict1.summary);
        console.log("Signatures Collected:", verdict1.signatures.length);
    } catch (error: any) {
        console.error("Scenario 1 failed:", error.message);
    }

    // 3. Scenario 2: No Proof / Malicious Merchant
    const evidence2: Evidence = {
        cartId: "CART-DEMO-002",
        merchant: "ScammyShop",
        buyer: "CarefulAgent_01",
        amount: "1000.0 USDC",
        claim: "Paid for item, merchant went offline. No delivery.",
        deliveryProof: "" // Empty
    };

    console.log("\n[Scenario 2] No proof provided by merchant.");
    try {
        const verdict2 = await orchestrator.resolveDispute(2, evidence2);
        console.log("Verdict:", verdict2.summary);
        console.log("Signatures Collected:", verdict2.signatures.length);
    } catch (error: any) {
        console.error("Scenario 2 failed:", error.message);
    }
}

runDemo().catch(console.error);
