import { loadFixture, mine } from "@nomicfoundation/hardhat-toolbox/network-helpers.js";
import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("HP2-Vault Security Suite", function () {
    async function deployFixture() {
        const [owner, merchant, buyer, juror1, juror2, juror3, juror4, juror5, attacker] = await ethers.getSigners();
        const jurors = [juror1.address, juror2.address, juror3.address, juror4.address, juror5.address];

        // 1. Deploy Mock USDC
        const MockToken = await ethers.getContractFactory("MockUSDC");
        const token = await MockToken.deploy();

        // 2. Deploy HP2Arbitrator (now needs Ownable)
        const Arbitrator = await ethers.getContractFactory("HP2Arbitrator");
        const arbitrator = await Arbitrator.deploy(await token.getAddress(), jurors);

        // 3. Deploy HP2Vault (hardened constructor with yield rate)
        const Vault = await ethers.getContractFactory("HP2Vault");
        const vault = await Vault.deploy(await arbitrator.getAddress(), 500); // 5% APY

        // 4. Whitelist the token (C-3 FIX)
        await (vault as any).setTokenAllowed(await token.getAddress(), true);

        // 5. Setup Merchant with tokens
        const amount = ethers.parseUnits("10000", 6);
        await (token as any).mint(merchant.address, amount);
        await (token as any).connect(merchant).approve(await vault.getAddress(), amount);

        return {
            vault: vault as any,
            arbitrator: arbitrator as any,
            token: token as any,
            owner, merchant, buyer, attacker,
            jurors: [juror1, juror2, juror3, juror4, juror5],
            amount
        };
    }

    // ─── Happy Path ──────────────────────────────────────────────

    it("Should initialize a vault and accrue yield", async function () {
        const { vault, merchant, buyer, token, amount } = await loadFixture(deployFixture);

        await vault.connect(merchant).initializeVault(
            "CART-001", "PAY-REQ-001", buyer.address,
            await token.getAddress(), amount, 1000
        );

        const vaultData = await vault.getVault("CART-001");
        expect(vaultData.exists).to.be.true;
        expect(vaultData.merchant).to.equal(merchant.address);

        await mine(500);
        const yieldAccrued = await vault.getAccruedYield("CART-001");
        expect(yieldAccrued).to.be.gt(0);
    });

    it("Should resolve via 3/5 AI Jury consensus", async function () {
        const { vault, arbitrator, merchant, buyer, token, amount, jurors } = await loadFixture(deployFixture);

        await vault.connect(merchant).initializeVault(
            "CART-999", "REF-999", buyer.address,
            await token.getAddress(), amount, 2000
        );

        // Buyer triggers dispute
        await arbitrator.connect(buyer).triggerDispute(1);

        // Collect 3 signatures with chain-bound hash (C-4 FIX)
        const decision = 2; // RESOLVED_STANDARD
        const chainId = (await ethers.provider.getNetwork()).chainId;
        const arbitratorAddress = await arbitrator.getAddress();

        const messageHash = ethers.solidityPackedKeccak256(
            ["uint256", "address", "uint256", "uint8"],
            [chainId, arbitratorAddress, 1, decision]
        );

        const signatures = [
            await jurors[0].signMessage(ethers.getBytes(messageHash)),
            await jurors[1].signMessage(ethers.getBytes(messageHash)),
            await jurors[2].signMessage(ethers.getBytes(messageHash))
        ];

        await expect(arbitrator.executeVerdict(1, decision, signatures))
            .to.emit(arbitrator, "VerdictExecuted");

        // Merchant releases
        await expect(vault.connect(merchant).release("CART-999"))
            .to.emit(vault, "SettlementTriggered");
    });

    // ─── Security Tests ──────────────────────────────────────────

    it("C-1: Should block non-merchant from calling release()", async function () {
        const { vault, merchant, buyer, token, amount, attacker } = await loadFixture(deployFixture);

        await vault.connect(merchant).initializeVault(
            "SEC-001", "REF-SEC", buyer.address,
            await token.getAddress(), amount, 100
        );

        await mine(101);

        // Attacker tries to release — should revert
        await expect(vault.connect(attacker).release("SEC-001"))
            .to.be.revertedWithCustomError(vault, "NotMerchant");
    });

    it("C-1: Should block non-buyer from calling refund()", async function () {
        const { vault, merchant, buyer, token, amount, attacker } = await loadFixture(deployFixture);

        await vault.connect(merchant).initializeVault(
            "SEC-002", "REF-SEC2", buyer.address,
            await token.getAddress(), amount, 2000
        );

        // Attacker tries to refund without slash — should revert
        await expect(vault.connect(attacker).refund("SEC-002"))
            .to.be.revertedWithCustomError(vault, "NotBuyer");
    });

    it("C-3: Should reject non-whitelisted tokens", async function () {
        const { vault, merchant, buyer } = await loadFixture(deployFixture);

        const FakeToken = await ethers.getContractFactory("MockUSDC");
        const fakeToken = await FakeToken.deploy();

        await expect(vault.connect(merchant).initializeVault(
            "FAKE-001", "REF-FAKE", buyer.address,
            await fakeToken.getAddress(), ethers.parseUnits("100", 6), 1000
        )).to.be.revertedWithCustomError(vault, "TokenNotWhitelisted");
    });

    it("M-1: Should reject zero-amount vaults", async function () {
        const { vault, merchant, buyer, token } = await loadFixture(deployFixture);

        await expect(vault.connect(merchant).initializeVault(
            "ZERO-001", "REF-ZERO", buyer.address,
            await token.getAddress(), 0, 1000
        )).to.be.revertedWithCustomError(vault, "AmountTooLow");
    });

    it("M-1: Should reject zero-address buyer", async function () {
        const { vault, merchant, token, amount } = await loadFixture(deployFixture);

        await expect(vault.connect(merchant).initializeVault(
            "ZERO-002", "REF-ZERO2", ethers.ZeroAddress,
            await token.getAddress(), amount, 1000
        )).to.be.revertedWithCustomError(vault, "ZeroAddress");
    });

    it("H-1: Should allow owner to pause/unpause", async function () {
        const { vault, merchant, buyer, token, amount, owner } = await loadFixture(deployFixture);

        await vault.connect(owner).pause();

        await expect(vault.connect(merchant).initializeVault(
            "PAUSE-001", "REF-PAUSE", buyer.address,
            await token.getAddress(), amount, 1000
        )).to.be.revertedWithCustomError(vault, "EnforcedPause");

        await vault.connect(owner).unpause();
    });

    it("H-2: Should reject yield rate above MAX", async function () {
        const { vault, owner } = await loadFixture(deployFixture);

        await expect(vault.connect(owner).setYieldRate(3000))
            .to.be.revertedWithCustomError(vault, "YieldRateTooHigh");
    });
});
