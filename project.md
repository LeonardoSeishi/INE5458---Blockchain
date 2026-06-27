# TudoCerto Pass — Project Context

> Context document for development (keep as a fixed reference in VS Code / your coding assistant).
> Product: a fraud-resistant, blockchain-backed ticketing ecosystem with abstracted web3, built for Brazil's live events market.
> Institution: Federal University of Santa Catarina (UFSC) · Authors: Fábio Coelho, Gisele Sejanes, Isabella Aquino, Leonardo Seishi.

---

## 1. Problem

The Brazilian live events market suffers from three structural failures:

1. **Scalping and bots (Sybil draining):** bots drain primary inventory in seconds during high-demand drops and resell on informal channels (WhatsApp, Telegram, Instagram) at inflated prices.
2. **Counterfeiting and duplication:** tickets are static PDFs/QR codes, trivial to clone. Legacy turnstiles validate only the first scan — the legitimate owner discovers the fraud at the gate.
3. **Organizer revenue leakage:** producers and artists carry all the risk and cost but receive **0%** of secondary-market revenue. There is no audit trail or provenance after the primary sale.

Add to this the **concurrency bottleneck**: legacy systems (monolithic RDBMS) hit deadlocks/timeouts precisely during the peak revenue window.

## 2. Solution (summary)

Treat the ticket as a **programmable digital asset** on an EVM ledger (Layer-2), not as a database row or a static file. Rules (resale cap, royalty) are enforced **at the protocol level** by smart contracts. Web3 complexity is **fully abstracted**: the user just logs in socially and pays with Pix.

Pillars:
- **Programmable tickets** (hybrid ERC-721/1155 standard) with states: `MINTED · ACTIVE · TRANSFERRED · USED · INVALIDATED`.
- **Resale cap + automatic royalty** enforced on-chain.
- **Account abstraction (ERC-4337)** with keys managed by MPC + HSM — no seed phrase for the user.
- **Pix settlement** (SPI / Central Bank of Brazil) that triggers on-chain minting.
- **Ephemeral QR** (ECDSA secp256k1) that regenerates every 15s — a screenshot loses validity.
- **Gate verification** done locally, <5ms, with an offline fallback.

## 3. Non-negotiable requirements

- **Concurrency:** sustain flash-crowd spikes without exposing the ledger to prohibitive cost or front-running/MEV.
- **Usability (mass adoption):** zero gas for the user, zero private-key management, native sub-second Pix integration.
- **Compliance:** CDC (7-day right of withdrawal → token burn + Pix reversal) and LGPD (no PII on-chain; only anonymous addresses, token IDs, and hashes).

## 4. Architecture (hybrid Web2/Web3 topology)

| Layer | Technologies | Responsibility |
|---|---|---|
| **Cloud Engine (Web2)** | Node.js/Go, Redis Cluster, AWS ECS/Fargate, PostgreSQL (Aurora Serverless v2) | High-concurrency routing, API, ephemeral cache, authentication |
| **Consensus (Web3)** | EVM Layer-2 Rollup (**Arbitrum**), Solidity contracts | Immutable ownership, price ceiling, royalty split |
| **Settlement (Pix)** | SPI API (Central Bank), Webhooks, Message Queues (Kafka/RabbitMQ) | Instant fiat settlement → triggers on-chain state change |

**Why Layer-2:** transaction cost < US$ 0.01 and finality < 1s; inherits L1 security while processing in off-chain batches. Deploying directly on L1 (Ethereum) is unviable due to gas/throughput.

### Primary purchase pipeline (high concurrency)
1. App requests a ticket → Pix charge generated (copy-and-paste + QR, ~120s TTL) via PSP over TLS 1.3.
2. **Redis Cluster**: inventory mapped as atomic integers; sub-ms `DECRBY` (avoids race conditions).
3. SPI webhook confirms payment → event published to the **Kafka broker** (partitioned by `eventId`).
4. **Go relayer (worker pool)** consumes the queue, batches, signs the `UserOperation` with the **HSM** key, and submits to L2 via RPC.
5. `TicketMinted` emitted → ticket appears in the wallet.

> **Gas-war / front-running mitigation:** only whitelisted relayers have write access to the contract; ordering is deterministic at the broker layer, not in the mempool.

## 5. Contract interface (reference)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITudoCertoTicket {
    struct TicketMetadata {
        uint256 eventId;
        uint256 originalFaceValueBRL;
        uint256 maximumResalePriceBRL;
        uint16  royaltyPercentageBasisPoints; // 500 = 5.0%
        address payable organizerWallet;
        bool    isUsed;
    }

    event TicketMinted(uint256 indexed ticketId, uint256 indexed eventId, address indexed owner);
    event TicketResold(uint256 indexed ticketId, address indexed seller, address indexed buyer, uint256 clearancePrice);
    event TicketValidated(uint256 indexed ticketId, address indexed scannerId, uint256 timestamp);

    function mintPrimaryTicket(address to, uint256 eventId, uint256 faceValue, uint256 maxResalePrice, uint16 royaltyBP) external returns (uint256);
    function executeSecondaryTransferWithRoyalty(uint256 ticketId, address from, address to, uint256 salePriceBRL) external payable;
    function markTicketAsUsed(uint256 ticketId, bytes calldata operationalSignature) external;
    function getTicketDetails(uint256 ticketId) external view returns (TicketMetadata memory);
}
```

**Key rule (`executeSecondaryTransferWithRoyalty`):** if `salePriceBRL > maximumResalePriceBRL`, the transaction **reverts in the EVM**. When valid, capital is split: seller receives `price − royalty − fee`, `organizerWallet` receives the royalty, the platform receives the fee.

**Protocol invariants (always true):**
- minted supply per event ≤ declared venue capacity;
- a transfer requires the owner's cryptographic signature;
- resale price never exceeds the ceiling.

## 6. Gate verification (ephemeral QR)

- Every **15s** the app assembles a binary payload: `ticketId | publicWallet | monotonicNonce | unixMsTimestamp`.
- Signs it with **ECDSA secp256k1** → packs it into a high-density QR.
- The scanner runs an **on-device verification (<5ms)**: checks the signature, the timestamp skew, and the ID's presence in a local **bloom filter** — no server round-trip per person.
- **Anti-screenshot:** a captured screenshot becomes invalid within seconds (timestamp outside the skew window).
- **Offline:** scanners pre-cache public keys + bloom filter; validate locally; log consumption to an encrypted SQLite store and batch-sync `markTicketAsUsed` once the network returns.

## 7. Revenue model

| Stream | Mechanics |
|---|---|
| Primary commission | Flat fee per ticket issued |
| Secondary resale fee | % of resale value (shared with the organizer) |
| Minting & service fees | Fixed platform fee (covers on-chain resources and maintenance) |

## 8. Current MVP (demonstration prototype)

Artifact: **`TudoCertoPass.jsx`** — a single-file React app with on-chain state **simulated in memory** (no real backend/network). It validates the flow and UX; it is not production.

Implemented flows:
- Onboarding with a simulated abstracted account (social login → generated wallet).
- Primary purchase via a Pix modal (TTL) → minting → wallet.
- Wallet with a QR that regenerates every 15s (nonce + signature + countdown ring).
- Resale: rejection above the ceiling + visible royalty/fee split.
- Gate: "live" (green), "screenshot" (rejected on skew), "double-spend" (already USED) scenarios, plus an offline toggle.
- Organizer dashboard: primary revenue, captured royalties, state counts.
- "Behind the scenes" log showing the Pix → Kafka → Redis → HSM relayer → L2 pipeline.

**Known MVP limitations (state these in the presentation):**
- Blockchain, ECDSA, and Pix are **simulated client-side**.
- State **resets on refresh** (in memory).
- No authentication, persistence, or real contracts.

## 9. Target production stack (suggested)

- **Frontend:** React/Next.js, mobile-first.
- **Backend:** Node.js/Go, REST/gRPC, Redis, PostgreSQL (Aurora), Kafka/RabbitMQ.
- **Blockchain:** Solidity on Arbitrum (L2), ERC-4337 bundler/relayer, MPC + HSM (FIPS 140-2 L3).
- **Payments:** Pix integration via a certified PSP (SPI API).
- **Infra:** AWS (Route 53, CloudFront, ECS Fargate), observability and auto-scaling by CPU/RPS.

## 10. Risks / points to verify (off-chain)

1. **Off-platform collusion:** a buyer pays the seller extra on the side to bypass the ceiling. Mitigation: restrict transfers to the verified marketplace.
2. **Single L2 sequencer:** a point of failure. Mitigation: cache states in the Web2 queue until it resumes.
3. **Account takeover:** a compromised social login grants wallet access. Mitigation: MFA for high-value transactions/transfers.
4. **Adoption:** validate Brazilian consumer willingness and venue acceptance of migration.
5. **Legal enforceability** of the resale cap in Brazil must be confirmed.

## 11. Glossary

- **ERC-4337 (Account Abstraction):** smart wallet with no seed phrase; actions become signed `UserOperation`s.
- **MPC / HSM:** multi-party computation and hardware security module that custody the key material.
- **Layer-2 Rollup:** network that batches transactions off the L1, with low cost and fast finality.
- **Sybil draining:** bots with multiple identities/IPs draining primary inventory.
- **Bloom filter:** compact structure to test the presence of valid IDs locally on the scanner.
- **SPI:** the Central Bank of Brazil's Instant Payment System (the Pix rail).
- **CDC / LGPD:** Consumer Defense Code / General Data Protection Law.

## 12. References (from the white paper)

- Buterin, V. *Rollups-now: The ultimate guide to Ethereum scaling.* Ethereum Foundation Research, 2021.
- EIP-4337: *Account Abstraction Using Alt-Mempool*, 2022.
- Central Bank of Brazil. *Manual de Padrões para Iniciação do Pix*, v4.2, 2023.
- Law 8.078/1990 (CDC) · Law 13.709/2018 (LGPD).
- EIP-721: *Non-Fungible Token Standard*, 2018.
