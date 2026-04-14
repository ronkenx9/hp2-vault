import { VerdictDecision, Evidence, JurorResponse } from './types';

export class AIJuror {
    private apiKey: string;
    private jurorId: number;
    private model: string;

    constructor(jurorId: number, apiKey: string, model: string = "llama-3.1-70b-versatile") {
        this.jurorId = jurorId;
        this.apiKey = apiKey;
        this.model = model;
    }

    public async deliberate(evidence: Evidence): Promise<JurorResponse> {
        console.log(`[Juror ${this.jurorId}] Starting deliberation for Cart ${evidence.cartId}...`);

        const prompt = `
            You are AI Juror #${this.jurorId} in the HP2-Vault PayFi Escrow Protocol.
            Your task is to reach a verdict on a merchant-buyer dispute.

            --- EVIDENCE ---
            Merchant: ${evidence.merchant}
            Buyer: ${evidence.buyer}
            Amount: ${evidence.amount}
            Buyer Claim: ${evidence.claim}
            Delivery Proof (Onchain/Metadata): ${evidence.deliveryProof || "NOT PROVIDED"}
            ---

            RULES:
            1. If "Delivery Proof" confirms the merchant delivered the service/asset, you MUST vote RESOLVED_STANDARD (2).
            2. If there is NO proof of delivery and the claim is reasonable, you MUST vote RESOLVED_SLASHED (3).
            3. Provide a concise reasoning.

            OUTPUT FORMAT (JSON ONLY):
            {
                "decision": 2 | 3,
                "reasoning": "string"
            }
        `;

        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{ role: "user", content: prompt }],
                    response_format: { type: "json_object" },
                    temperature: 0.2
                })
            });

            const data = await response.json();

            // NM-1 FIX: Validate LLM response before parsing
            const raw = data?.choices?.[0]?.message?.content;
            if (!raw) throw new Error(`Juror ${this.jurorId}: Empty response from LLM`);

            let result;
            try { result = JSON.parse(raw); }
            catch { throw new Error(`Juror ${this.jurorId}: Invalid JSON from LLM: ${raw.slice(0, 100)}`); }

            if (result.decision !== 2 && result.decision !== 3) {
                throw new Error(`Juror ${this.jurorId}: Invalid decision value: ${result.decision}`);
            }

            return {
                jurorId: this.jurorId,
                decision: result.decision as VerdictDecision,
                reasoning: result.reasoning || "No reasoning provided"
            };
        } catch (error: any) {
            console.error(`[Juror ${this.jurorId}] Error:`, error.message);
            throw error;
        }
    }
}
