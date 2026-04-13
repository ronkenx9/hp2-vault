const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const keysDir = path.join(__dirname, 'keys');
if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir);
}

// Generate secp256k1 key pair
const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'secp256k1',
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
    }
});

fs.writeFileSync(path.join(keysDir, 'es256k_private.pem'), privateKey);
fs.writeFileSync(path.join(keysDir, 'es256k_public.pem'), publicKey);

console.log('Keys generated successfully in ./keys directory');
console.log('Public Key (SPKI/PEM):');
console.log(publicKey);
