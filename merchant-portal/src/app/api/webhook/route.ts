import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * HashKey HSP Payment Webhook Handler
 * 
 * Uses HMAC-SHA256 with HSP_APP_SECRET for signature verification.
 * HashKey signs the raw JSON body and sends the hex digest in X-HSP-Signature.
 */

const APP_KEY = process.env.HSP_APP_KEY;
const APP_SECRET = process.env.HSP_APP_SECRET;

function verifyHSPSignature(rawBody: string, signature: string): boolean {
    if (!APP_SECRET) return false;

    const hmac = createHmac('sha256', APP_SECRET);
    hmac.update(rawBody, 'utf8');
    const expected = hmac.digest('hex');

    try {
        // Constant-time comparison to prevent timing attacks
        return timingSafeEqual(
            Buffer.from(expected, 'hex'),
            Buffer.from(signature, 'hex')
        );
    } catch {
        // Buffers had different lengths → invalid signature
        return false;
    }
}

export async function POST(req: NextRequest) {
    try {
        // Raw body MUST be read before JSON parsing (signature is over raw bytes)
        const rawBody = await req.text();
        const signature = req.headers.get('x-hsp-signature') || '';

        console.log('[HSP Webhook] Received event. AppKey:', APP_KEY);

        // ── Signature Verification ──────────────────────────────────────────────
        if (!APP_SECRET) {
            console.warn('[HSP Webhook] HSP_APP_SECRET not set. Skipping verification.');
        } else {
            if (!signature) {
                console.error('[HSP Webhook] Missing X-HSP-Signature header.');
                return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
            }

            const isValid = verifyHSPSignature(rawBody, signature);
            if (!isValid) {
                console.error('[HSP Webhook] INVALID SIGNATURE. Dropping request.');
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            console.log('[HSP Webhook] Signature verified ✓');
        }

        const body = JSON.parse(rawBody);
        console.log('[HSP Webhook] Payload:', JSON.stringify(body, null, 2));

        const { merchant_order_id, status } = body;

        // ── Event Routing ────────────────────────────────────────────────────────
        switch (status) {
            case 'SUCCESS':
                console.log(`[HSP Webhook] ✅ Payment SUCCESS for order ${merchant_order_id}`);
                // TODO: Call HP2Vault.release() on-chain for the matching cartId
                break;

            case 'FAILED':
                console.log(`[HSP Webhook] ❌ Payment FAILED for order ${merchant_order_id}`);
                // TODO: Trigger refund flow / notify merchant
                break;

            case 'PENDING':
                console.log(`[HSP Webhook] ⏳ Payment PENDING for order ${merchant_order_id}`);
                break;

            default:
                console.warn(`[HSP Webhook] Unknown status "${status}" for order ${merchant_order_id}`);
        }

        // HashKey requires a 200 response to stop retries
        return NextResponse.json({ received: true }, { status: 200 });

    } catch (err: any) {
        console.error('[HSP Webhook] Error:', err.message);
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
}

// Health-check — HashKey GETs this URL to verify the endpoint is live
export async function GET() {
    return NextResponse.json({
        status: 'HP2-Vault webhook active',
        merchant: process.env.HSP_MERCHANT_ID,
        version: '2.0.0'
    }, { status: 200 });
}
