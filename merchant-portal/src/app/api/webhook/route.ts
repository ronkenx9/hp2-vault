import { NextRequest, NextResponse } from 'next/server';

/**
 * HashKey HSP Payment Webhook Handler
 * HashKey will POST to this endpoint with payment result events.
 * 
 * Expected payload shape (per HSP docs):
 * {
 *   merchant_order_id: string,
 *   payment_id: string,
 *   status: "SUCCESS" | "FAILED" | "PENDING",
 *   amount: string,
 *   currency: string,
 *   timestamp: number,
 *   signature: string   // ES256K JWT – verify in production!
 * }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Log the event (in production, write to DB or queue)
        console.log('[HSP Webhook] Received event:', JSON.stringify(body, null, 2));

        const { merchant_order_id, payment_id, status } = body;

        // --- Signature verification goes here in production ---
        // import { createVerify } from 'crypto';
        // verify signature using the HSP public key

        switch (status) {
            case 'SUCCESS':
                console.log(`[HSP Webhook] Payment SUCCESS for order ${merchant_order_id} (txId: ${payment_id})`);
                // TODO: release escrow / mark order as paid
                break;

            case 'FAILED':
                console.log(`[HSP Webhook] Payment FAILED for order ${merchant_order_id}`);
                // TODO: refund buyer, notify merchant
                break;

            case 'PENDING':
                console.log(`[HSP Webhook] Payment PENDING for order ${merchant_order_id}`);
                break;

            default:
                console.warn(`[HSP Webhook] Unknown status "${status}" for order ${merchant_order_id}`);
        }

        // Must return 200 so HashKey doesn't retry
        return NextResponse.json({ received: true }, { status: 200 });

    } catch (err: any) {
        console.error('[HSP Webhook] Error:', err.message);
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
}

// Health-check — HashKey may GET the URL to verify it's live
export async function GET() {
    return NextResponse.json({ status: 'HP2-Vault webhook active' }, { status: 200 });
}
