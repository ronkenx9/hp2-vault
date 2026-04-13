import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { HP2_VAULT_ABI, HP2_ARBITRATOR_ABI } from "@/lib/contracts";

const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS || "";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc-testnet.hsk.xyz";

export function useVaults(merchantAddress: string) {
    const [vaults, setVaults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [yieldRate, setYieldRate] = useState(0);

    useEffect(() => {
        if (!merchantAddress) return;

        const fetchVaults = async () => {
            try {
                const provider = new ethers.JsonRpcProvider(RPC_URL);
                const contract = new ethers.Contract(VAULT_ADDRESS, HP2_VAULT_ABI, provider);

                // 1. Fetch yield rate
                const rate = await contract.baseYieldRate();
                setYieldRate(Number(rate));

                // 2. Fetch events (initial load)
                // In a production app, we would use a subgraph or indexer.
                // For this demo, we'll query events from the last 10,000 blocks.
                const filter = contract.filters.VaultInitialized(null, merchantAddress);
                const events = await contract.queryFilter(filter, -10000);

                const vaultData = await Promise.all(events.map(async (event: any) => {
                    const cartId = event.args.cartId;
                    const details = await contract.getVault(cartId);
                    const accrued = await contract.getAccruedYield(cartId);

                    return {
                        id: cartId,
                        paymentRef: details.paymentRef,
                        amount: ethers.formatUnits(details.principal, 6),
                        coin: "USDC", // Mapping based on token address in production
                        yieldAccrued: ethers.formatUnits(accrued, 6),
                        status: details.exists ? "locked" : "released", // Simple mapping for now
                        expiry: details.expiryBlock.toString(),
                        txHash: event.transactionHash
                    };
                }));

                setVaults(vaultData);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching vaults:", error);
                setLoading(false);
            }
        };

        fetchVaults();
    }, [merchantAddress]);

    return { vaults, loading, yieldRate };
}
