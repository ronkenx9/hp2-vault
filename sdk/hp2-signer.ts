import crypto from 'crypto';

/**
 * HP2 Merchant Integration Utility
 * Implements dual-layer HashKey Merchant authentication:
 * 1. HMAC-SHA256 request signing
 * 2. ES256K JWT (secp256k1) merchant_authorization
 */

export interface CartMandateContents {
    id: string;
    user_cart_confirmation_required: boolean;
    payment_request: {
        method_data: Array<{
            supported_methods: string;
            data: {
                x402Version: number;
                network: string;
                chain_id: number;
                contract_address: string;
                pay_to: string;
                coin: string;
            };
        }>;
        details: {
            id: string;
            display_items?: Array<{
                label: string;
                amount: { currency: string; value: string };
            }>;
            total: {
                label: string;
                amount: { currency: string; value: string };
            };
        };
    };
    cart_expiry: string;
    merchant_name: string;
}

export class HP2Signer {
    private appKey: string;
    private appSecret: string;
    private merchantPrivateKey: string; // PEM format

    constructor(appKey: string, appSecret: string, merchantPrivateKey: string) {
        this.appKey = appKey;
        this.appSecret = appSecret;
        this.merchantPrivateKey = merchantPrivateKey;
    }

    /**
     * Canonical JSON Hashing (RFC 8785)
     * Rules: Recursive key sort, no extra whitespace.
     */
    public static getCanonicalHash(obj: any): string {
        const sortedObj = HP2Signer.sortKeys(obj);
        const jsonStr = JSON.stringify(sortedObj);
        return crypto.createHash('sha256').update(jsonStr).digest('hex');
    }

    private static sortKeys(val: any): any {
        if (val === null || typeof val !== 'object') return val;
        if (Array.isArray(val)) return val.map(HP2Signer.sortKeys);

        const sorted: any = {};
        Object.keys(val).sort().forEach(key => {
            sorted[key] = HP2Signer.sortKeys(val[key]);
        });
        return sorted;
    }

    /**
     * Dual-Layer Auth Step 1: HMAC-SHA256 Request Signing
     */
    public generateHMACHeaders(
        method: 'POST' | 'GET',
        path: string,
        query: string,
        body: any = null
    ) {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const nonce = crypto.randomBytes(16).toString('hex');

        let bodyHash = '';
        if (body) {
            bodyHash = HP2Signer.getCanonicalHash(body);
        }

        const message = `${method}\n${path}\n${query}\n${bodyHash}\n${timestamp}\n${nonce}`;
        const signature = crypto
            .createHmac('sha256', this.appSecret)
            .update(message)
            .digest('hex');

        return {
            'X-App-Key': this.appKey,
            'X-Signature': signature,
            'X-Timestamp': timestamp,
            'X-Nonce': nonce,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Dual-Layer Auth Step 2: ES256K JWT (secp256k1)
     */
    public async generateMerchantJWT(contents: CartMandateContents): Promise<string> {
        const cartHash = HP2Signer.getCanonicalHash(contents);
        const now = Math.floor(Date.now() / 1000);

        const header = {
            alg: 'ES256K',
            typ: 'JWT'
        };

        const payload = {
            iss: contents.merchant_name,
            sub: contents.merchant_name,
            aud: 'HashkeyMerchant',
            iat: now,
            exp: now + 3600, // 1 hour
            jti: `JWT-${now}-${crypto.randomBytes(4).toString('hex')}`,
            cart_hash: cartHash
        };

        const base64UrlEncode = (obj: any) =>
            Buffer.from(JSON.stringify(obj))
                .toString('base64')
                .replace(/=/g, '')
                .replace(/\+/g, '-')
                .replace(/\//g, '_');

        const encodedHeader = base64UrlEncode(header);
        const encodedPayload = base64UrlEncode(payload);
        const message = `${encodedHeader}.${encodedPayload}`;

        // Sign using secp256k1 (ES256K)
        // crypto.sign requires a private key that matches the ES256K profile
        const signature = crypto.sign(
            'sha256',
            Buffer.from(message),
            {
                key: this.merchantPrivateKey,
                format: 'pem',
                type: 'pkcs8'
            }
        ).toString('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');

        return `${message}.${signature}`;
    }
}
