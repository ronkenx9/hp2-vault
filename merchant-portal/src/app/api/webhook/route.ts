import { NextRequest, NextResponse } from 'next/server';
import { createVerify } from 'crypto';

/**
 * HashKey HSP Payment Webhook Handler
 * HashKey will POST to this endpoint with payment result events.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const signature = req.headers.get('x-hsp-signature'); // HSP specific signature header

        // Log the event
        console.log('[HSP Webhook] Received event:', JSON.stringify(body, null, 2));

        // --- M-3 FIX: Signature verification ---
        const PUBLIC_KEY = process.env.HSP_PUBLIC_KEY;

        if (PUBLIC_KEY) {
            const verifier = createVerify('sha256');
            verifier.update(JSON.stringify(body));
            const isValid = verifier.verify(PUBLIC_KEY, signature || '', 'base64');

            if (!isValid) {
                console.error('[HSP Webhook] INVALID SIGNATURE. Dropping request.');
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        } else {
            console.warn('[HSP Webhook] Running without HSP_PUBLIC_KEY. Skipping verification.');
        }

        const { merchant_order_id, status } = body;

        switch (status) {
            case 'SUCCESS':
                console.log(`[HSP Webhook] Payment SUCCESS for order ${merchant_order_id}`);
                // TODO: release escrow / mark order as paid
                break;

            case 'FAILED':
                console.log(`[HSP Webhook] Payment FAILED for order ${merchant_order_id}`);
                // TODO: notify merchant / manage cleanup
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
