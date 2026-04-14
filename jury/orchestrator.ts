import { AIJuror } from './juror';
import { JurySigner } from './signer';
import { Evidence, VerdictDecision, JurorResponse } from './types';

export interface FinalVerdict {
    slaId: number;
    decision: VerdictDecision;
    signatures: string[];
    summary: string;
}

export class AIJuryOrchestrator {
    private jurors: AIJuror[];
    private jurorKeys: string[];
    private arbitratorAddress: string;
    private chainId: number;

    constructor(
        groqApiKey: string,
        jurorKeys: string[],
        arbitratorAddress: string,
        chainId: number
    ) {
        this.jurors = [1, 2, 3, 4, 5].map(id => new AIJuror(id, groqApiKey));
        this.jurorKeys = jurorKeys;
        this.arbitratorAddress = arbitratorAddress;
        this.chainId = chainId;
    }

    public async resolveDispute(slaId: number, evidence: Evidence): Promise<FinalVerdict> {
        console.log(`[Orchestrator] Resolving SLA #${slaId} for Cart ${evidence.cartId}`);

        // 1. Parallel Deliberation
        const deliberations = await Promise.all(
            this.jurors.map(juror => juror.deliberate(evidence))
        );

        // 2. Count Votes
        const votes: Record<number, number> = {};
        deliberations.forEach(d => {
            votes[d.decision] = (votes[d.decision] || 0) + 1;
        });

        // 3. Find Majority (Need at least 3)
        let majorityDecision: VerdictDecision = VerdictDecision.PENDING;
        for (const [decision, count] of Object.entries(votes)) {
            if (count >= 3) {
                majorityDecision = Number(decision) as VerdictDecision;
                break;
            }
        }

        if (majorityDecision === VerdictDecision.PENDING) {
            throw new Error("AI Jury failed to reach consensus (Quorum not met)");
        }

        // 4. Collect Signatures from Jurors who voted with majority
        const signatures: string[] = [];
        const signersIndices: number[] = [];

        for (let i = 0; i < deliberations.length; i++) {
            if (i >= this.jurorKeys.length) continue; // M-2 FIX: bounds check
            if (deliberations[i].decision === majorityDecision) {
                const sig = await JurySigner.signVerdict(
                    this.jurorKeys[i],
                    slaId,
                    majorityDecision,
                    this.arbitratorAddress,
                    this.chainId
                );
                signatures.push(sig);
                signersIndices.push(i + 1);
            }
        }

        const decisionText = majorityDecision === VerdictDecision.RESOLVED_STANDARD ? "RELEASE" : "SLASH";
        const summary = `Consensus Reached: ${decisionText} (${signatures.length}/5 AI Jurors signed)`;

        return {
            slaId,
            decision: majorityDecision,
            signatures,
            summary
        };
    }
}
