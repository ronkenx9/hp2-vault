# HP2-Vault: AI-Guarded PayFi Escrow Protocol

**HashKey Horizon Hackathon | PayFi Track**

HP2-Vault is an institutional-grade, yield-bearing escrow protocol designed for the agentic economy. It secures merchant capital in liquidity-optimized vaults while utilizing an autonomous AI Jury to resolve cross-border payment disputes with cryptographic finality.

## 🚀 The PayFi Problem
Traditional web3 escrow protocols lock capital in "dead" contracts, creating immense opportunity costs for merchants. Disputes are either manual (slow) or rely on game-theoretic manual voting (flawed by collusion).

**HP2-Vault solves this by:**
1.  **Yield-Generated Escrow**: Locked funds aren't static; they accrue yield through local liquidity primitives on the HashKey Settlement Protocol (HSP).
2.  **Autonomous AI Jury**: A 5-node AI consensus engine (Llama-3-70B/Groq) scrapes transaction evidence, deliberates in a live terminal, and generates multi-sig ECDSA verdicts.
3.  **HSP Integration**: Built to interface with the HashKey Settlement Protocol for high-throughput institutional settlements.

## 🛠️ Architecture

### 1. Smart Contracts (`/contracts`)
- **`HP2Vault.sol`**: The core yield-bearing engine. Handles deposits, yield distribution, and secure releases.
- **`HP2Arbitrator.sol`**: The governing resolution layer. Implements a 3/5 multi-sig threshold where "signatures" are issued by the AI Jury nodes.

### 2. Verdict AI Engine (`/jury`)
- **Evidence Scraper**: Fetches off-chain payment data and merchant telemetry.
- **Consensus Orchestrator**: Manages the deliberation flow between 5 independent AI agents.
- **ECDSA Signer**: Nodes generate secp256k1 signatures (`ecrecover` compatible) to trigger on-chain contract releases.

### 3. Cyber-Merchant Console (`/merchant-portal`)
- **Institution-First Design**: Built with Next.js 14, Framer Motion, and Three.js.
- **Hyperspeed Visuals**: Interactive WebGL background representing the "speed of settlement."
- **Live Jury Terminal**: A real-time window into the AI consensus deliberations.

## 🚦 Getting Started

### Local Development
```bash
# 1. Install dependencies
npm install

# 2. Run Hardhat Node
npx hardhat node

# 3. Start the Portal
cd merchant-portal
npm run dev
```

### AI Engine Configuration
The Jury engine requires a `GROQ_API_KEY` to run deliberations:
```bash
# In /jury/.env
GROQ_API_KEY=your_key_here
```

## 🏆 Hackathon Context
- **Chain ID**: 133 (HashKey Testnet)
- **Track**: PayFi / Settlement
- **Core Innovation**: First-of-its-kind fusion of yield-generating capital and agentic arbitration.

---

Built for the **HashKey Horizon Hackathon 2026** by ronkenx9.
