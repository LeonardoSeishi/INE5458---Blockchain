# TudoCerto Pass

> Fraud-resistant, blockchain-backed ticketing for Brazil's live events market.  
> Academic project — INE5458 Blockchain · UFSC · 2026

**Authors:** Fábio Coelho · Gisele Sejanes · Isabella Aquino · Leonardo Seishi

---

## The Problem

Brazil's live events industry faces three structural failures:

1. **Scalping & bots** — automated accounts drain primary inventory in seconds and resell on informal channels (WhatsApp, Telegram) at inflated prices.
2. **Counterfeiting** — tickets are static QR codes, trivial to screenshot and share. Legacy turnstiles only catch fraud on the second scan — the legitimate buyer discovers the problem at the gate.
3. **Organizer revenue leakage** — producers carry all risk and cost yet receive **0%** of secondary-market revenue, with no audit trail after the primary sale.

## The Solution

Treat the ticket as a **programmable digital asset** on an EVM Layer-2, not a database row.  
Resale price caps and royalty splits are enforced **at the protocol level** by smart contracts.  
All blockchain complexity is fully abstracted — the user logs in socially and pays with Pix.

| Pillar | How |
|---|---|
| Programmable ticket | Hybrid ERC-721/1155 with states `MINTED · ACTIVE · TRANSFERRED · USED · INVALIDATED` |
| Resale cap + royalty | Enforced on-chain — `executeSecondaryTransferWithRoyalty` reverts if `price > ceiling` |
| Account abstraction | ERC-4337 smart wallet; keys managed by MPC + HSM — no seed phrase |
| Pix settlement | SPI / Central Bank of Brazil webhook triggers on-chain minting |
| Ephemeral QR | ECDSA secp256k1 payload regenerates every 15 s — screenshots expire |
| Gate verification | On-device `< 5 ms`, bloom filter, offline fallback |

---

## Demo

The MVP (`src/App.jsx`) is a single-page React app with all on-chain state simulated in memory — no real backend or network required.

**Flows implemented:**
- Social login → ERC-4337 wallet instantiation (simulated MPC + HSM)
- Primary purchase via Pix modal (TTL countdown) → token minting → wallet
- Wallet view with live QR regenerating every 15 s + countdown ring
- Resale listing: price ceiling enforced, contract revert shown on violation
- Resale market: visible royalty + platform fee split on purchase
- Gate: three scenarios — live scan ✓, screenshot (timestamp skew) ✗, double-spend ✗
- Organizer dashboard: primary revenue, captured royalties, token state counts
- Real-time pipeline log: Pix → Kafka → Redis → HSM relayer → Arbitrum L2

**Known MVP limitations:**
- Blockchain, ECDSA and Pix are client-side simulations.
- State resets on page refresh.
- No real authentication, persistence, or deployed contracts.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Cloud Engine (Web2)                    │
│   Node.js / Go  ·  Redis Cluster  ·  PostgreSQL  ·  Kafka  │
│   High-concurrency routing, API, ephemeral inventory cache  │
└──────────────────────────┬──────────────────────────────────┘
                           │ UserOperation (batched)
┌──────────────────────────▼──────────────────────────────────┐
│                   Consensus Layer (Web3)                    │
│          Arbitrum L2 · Solidity · ERC-4337 bundler          │
│       Immutable ownership · price ceiling · royalty split   │
└──────────────────────────┬──────────────────────────────────┘
                           │ Pix webhook (SPI)
┌──────────────────────────▼──────────────────────────────────┐
│                  Settlement Layer (Pix)                     │
│              SPI API · Kafka · PSP over TLS 1.3             │
│          Instant BRL settlement → triggers on-chain mint    │
└─────────────────────────────────────────────────────────────┘
```

**Why Arbitrum L2:** transaction cost < US$ 0.01 and finality < 1 s, inheriting L1 security while processing off-chain batches. Direct L1 deployment is unviable due to gas cost and throughput.

### Primary purchase pipeline

```
App → Pix charge (TTL 120 s)
    → SPI webhook confirms payment
    → Redis DECRBY (atomic inventory reservation)
    → Kafka broker (partitioned by eventId)
    → Go relayer worker pool
    → HSM signs UserOperation
    → Arbitrum L2 RPC
    → event TicketMinted(ticketId, eventId, owner)
```

### Smart contract interface (reference)

```solidity
interface ITudoCertoTicket {
    function mintPrimaryTicket(address to, uint256 eventId, uint256 faceValue,
        uint256 maxResalePrice, uint16 royaltyBP) external returns (uint256);

    function executeSecondaryTransferWithRoyalty(uint256 ticketId,
        address from, address to, uint256 salePriceBRL) external payable;
        // reverts if salePriceBRL > maximumResalePriceBRL

    function markTicketAsUsed(uint256 ticketId,
        bytes calldata operationalSignature) external;
}
```

---

## Running Locally

**Requirements:** Node.js 18+

```bash
# clone
git clone https://github.com/LeonardoSeishi/INE5458---Blockchain.git
cd INE5458---Blockchain

# install & run
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Online (no install)

Open directly in StackBlitz:

```
https://stackblitz.com/github/LeonardoSeishi/INE5458---Blockchain
```

---

## Project Structure

```
├── src/
│   ├── App.jsx                  # Global state + smart contract simulation
│   ├── main.jsx                 # React entry point
│   ├── styles/
│   │   └── main.css             # All styles (light theme, emerald palette)
│   ├── utils/
│   │   ├── crypto.js            # FNV hash, PRNG, deterministic hex, address gen
│   │   └── format.js            # BRL formatter, address shortener
│   ├── data/
│   │   └── events.js            # Seed event data + ticket ID counter
│   └── components/
│       ├── QR.jsx               # Deterministic QR code renderer (SVG)
│       ├── CountRing.jsx        # 15-second countdown ring
│       ├── TicketRow.jsx        # Ticket stub with live QR + resale controls
│       ├── PixModal.jsx         # Pix payment modal (TTL, copy-paste code)
│       ├── GateView.jsx         # Gate scanner with three verification scenarios
│       └── OrganizerView.jsx    # Revenue dashboard + token state ledger
├── index.html
├── vite.config.js
└── project.md                   # Full technical white paper context
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, CSS custom properties |
| Fonts | Sora · Inter · JetBrains Mono (Google Fonts) |
| Blockchain (simulated) | ERC-4337, ERC-721/1155, Arbitrum L2, Solidity |
| Payments (simulated) | Pix / SPI (Central Bank of Brazil) |
| Crypto primitives (simulated) | ECDSA secp256k1, FNV-1a, bloom filter |
| Target infra | AWS ECS Fargate, Redis Cluster, Kafka, PostgreSQL Aurora, HSM FIPS 140-2 L3 |

---

## References

- Buterin, V. *Rollups-now: The ultimate guide to Ethereum scaling.* Ethereum Foundation Research, 2021.
- EIP-4337: *Account Abstraction Using Alt-Mempool*, 2022.
- EIP-721: *Non-Fungible Token Standard*, 2018.
- Central Bank of Brazil. *Manual de Padrões para Iniciação do Pix*, v4.2, 2023.
- Law 8.078/1990 (CDC — Consumer Defense Code)
- Law 13.709/2018 (LGPD — General Data Protection Law)

---

*UFSC · INE5458 Blockchain · 2026*
