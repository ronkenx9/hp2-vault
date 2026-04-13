export enum VerdictDecision {
    PENDING = 0,
    IN_DISPUTE = 1,
    RESOLVED_STANDARD = 2,
    RESOLVED_SLASHED = 3
}

export interface Evidence {
    cartId: string;
    merchant: string;
    buyer: string;
    amount: string;
    claim: string;
    deliveryProof?: string;
}

export interface JurorResponse {
    jurorId: number;
    decision: VerdictDecision;
    reasoning: string;
    signature?: string;
}
