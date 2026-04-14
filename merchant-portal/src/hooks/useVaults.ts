import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { HP2_VAULT_ABI } from "@/lib/contracts";

const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS || "";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc-testnet.hsk.xyz";

// --- High-Fidelity Mock Data for Demos ---
const MOCK_VAULTS = [
    {
        id: "TRX-88219-HSK",
        paymentRef: "INV-2024-001",
        amount: 45000.00,
        coin: "USDC",
        yieldAccrued: 12.4582,
        status: "locked",
        expiry: "Block #10,442",
        txHash: "0x7a...f2e1"
    },
    {
        id: "TRX-88220-HSK",
        paymentRef: "INV-2024-002",
        amount: 12500.00,
        coin: "USDC",
        yieldAccrued: 3.1245,
        status: "disputed",
        expiry: "Block #10,480",
        txHash: "0x3c...a9b2"
    },
    {
        id: "TRX-88221-HSK",
        paymentRef: "INV-2024-003",
        amount: 8200.00,
        coin: "USDC",
        yieldAccrued: 0.8421,
        status: "released",
        expiry: "Block #10,210",
        txHash: "0x9d...e5c4"
    }
];

export function useVaults(merchantAddress: string) {
    const [vaults, setVaults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [yieldRate, setYieldRate] = useState(8.5); // Default 8.5%
    const [stats, setStats] = useState({ totalProtected: 2450192, ecosystemYield: 12450.21 });

    // Simulation Timer
    useEffect(() => {
        if (!merchantAddress) return;

        const isMockMode = !VAULT_ADDRESS || VAULT_ADDRESS === "";

        if (isMockMode) {
            // --- Mock Mode Logic ---
            setVaults(MOCK_VAULTS);
            setLoading(false);

            // Simulate real-time yield accrual
            const interval = setInterval(() => {
                setVaults(prev => prev.map(vault => {
                    if (vault.status === 'locked' || vault.status === 'disputed') {
                        return { ...vault, yieldAccrued: vault.yieldAccrued + (Math.random() * 0.0001) };
                    }
                    return vault;
                }));

                setStats(prev => ({
                    ...prev,
                    ecosystemYield: prev.ecosystemYield + (Math.random() * 0.01)
                }));
            }, 3000);

            return () => clearInterval(interval);
        } else {
            // --- Live Mode Logic ---
            const fetchVaults = async () => {
                try {
                    const provider = new ethers.JsonRpcProvider(RPC_URL);
                    const contract = new ethers.Contract(VAULT_ADDRESS, HP2_VAULT_ABI, provider);

                    const rate = await contract.baseYieldRate();
                    setYieldRate(Number(rate) / 100); // Assuming bps

                    const filter = contract.filters.VaultInitialized(null, merchantAddress);
                    const events = await contract.queryFilter(filter, -10000);

                    const vaultData = await Promise.all(events.map(async (event: any) => {
                        const cartId = event.args.cartId;
                        const details = await contract.getVault(cartId);
                        const accrued = await contract.getAccruedYield(cartId);

                        return {
                            id: cartId,
                            paymentRef: details.paymentRef,
                            amount: Number(ethers.formatUnits(details.principal, 6)),
                            coin: "USDC",
                            yieldAccrued: Number(ethers.formatUnits(accrued, 6)),
                            status: details.exists ? "locked" : "released",
                            expiry: `Block #${details.expiryBlock.toString()}`,
                            txHash: event.transactionHash
                        };
                    }));

                    setVaults(vaultData);
                    setLoading(false);
                } catch (error) {
                    console.error("Error fetching live vaults, falling back to mock:", error);
                    setVaults(MOCK_VAULTS);
                    setLoading(false);
                }
            };
            fetchVaults();
        }
    }, [merchantAddress]);

    return { vaults, loading, yieldRate, stats };
}
