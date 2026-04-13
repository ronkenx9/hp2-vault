import { Wallet, ethers } from "ethers";
import { VerdictDecision } from "./types";

export class JurySigner {
    /**
     * Generates a chain-bound signature for the Verdict.
     * Match logic in VerdictCore.sol (C-4 fix)
     */
    static async signVerdict(
        privateKey: string,
        slaId: number,
        decision: VerdictDecision,
        arbitratorAddress: string,
        chainId: number
    ): Promise<string> {
        const wallet = new Wallet(privateKey);

        // C-4 FIX: block.chainid included in hash
        const messageHash = ethers.solidityPackedKeccak256(
            ["uint256", "address", "uint256", "uint8"],
            [chainId, arbitratorAddress, slaId, decision]
        );

        return await wallet.signMessage(ethers.getBytes(messageHash));
    }
}
