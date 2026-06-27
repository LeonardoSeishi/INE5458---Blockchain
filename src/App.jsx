import React, { useState, useEffect, useRef } from "react";
import "./styles/main.css";
import { addr, hex, fnv } from "./utils/crypto";
import { brl, short } from "./utils/format";
import { EVENTS, nextId } from "./data/events";
import TicketRow from "./components/TicketRow";
import PixModal from "./components/PixModal";
import GateView from "./components/GateView";
import OrganizerView from "./components/OrganizerView";

const TABS = [
  { k: "discover",  l: "Discover" },
  { k: "wallet",    l: "Wallet" },
  { k: "resale",    l: "Resale" },
  { k: "gate",      l: "Gate" },
  { k: "organizer", l: "Organizer" },
];

export default function App() {
  const [acct, setAcct]         = useState(null);
  const [view, setView]         = useState("discover");
  const [events]                = useState(EVENTS);
  const [minted, setMinted]     = useState({ 101: 18, 102: 41, 103: 7 });
  const [tickets, setTickets]   = useState([]);
  const [platform, setPlatform] = useState({ primary: 0, secondary: 0 });
  const [royalties, setRoyalties] = useState({});
  const [log, setLog]           = useState([]);
  const [pix, setPix]           = useState(null);
  const [now, setNow]           = useState(Date.now());
  const logRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const addLog = (text, cls = "") =>
    setLog((L) => [...L, { t: new Date().toLocaleTimeString("pt-BR"), text, cls, k: Math.random() }].slice(-80));

  /* ---- marketplace seed listings (called once on sign-in) ---- */
  const seedMarket = () => {
    const marina = "0x9F2c…a21b";
    const diego  = "0x3C7e…7b04";
    setTickets((T) => [
      ...T,
      { id: nextId(), eventId: 102, owner: marina, ownerName: "Marina (resale)", faceValue: 250, maxResale: 300, royaltyBP: 1000, status: "LISTED", price: 290 },
      { id: nextId(), eventId: 101, owner: diego,  ownerName: "Diego (resale)",  faceValue: 320, maxResale: 480, royaltyBP: 800,  status: "LISTED", price: 455 },
    ]);
  };

  /* ======================== smart contract simulation ======================== */

  const signIn = (provider) => {
    const a = addr();
    setAcct({ address: a, bankBRL: 2400 });
    addLog(`OAuth ${provider} verified → instantiating ERC-4337 wallet`, "vio");
    addLog(`MPC + HSM (FIPS 140-2 L3): key pair generated · no seed phrase exposed`, "vio");
    addLog(`Smart wallet ready: ${short(a)}`, "ok");
    seedMarket();
  };

  const startPix = (ev) => {
    const code = "00020126" + hex(ev.id + ":" + Date.now(), 58).toUpperCase() + "5204000053039865802BR";
    setPix({ ev, code, ttl: 120, ts: Date.now() });
    addLog(`POST /charges → TLS 1.3 to PSP · generating Pix charge (SPI/BCB)`, "pix");
    addLog(`Pix copy-paste code issued · TTL 120s`, "pix");
  };

  const confirmPix = () => {
    const ev = pix.ev;
    if (acct.bankBRL < ev.faceValue) { addLog(`Insufficient bank balance`, "err"); return; }

    addLog(`SPI webhook: settlement confirmed (${brl(ev.faceValue)})`, "pix");
    addLog(`Redis DECRBY inventory:${ev.id} → atomic reservation`, "");
    addLog(`Event published to Kafka broker (partition eventId=${ev.id})`, "");
    addLog(`Go relayer signs UserOperation via HSM → Arbitrum L2 RPC`, "vio");

    const commission = 2.9;
    const tid = nextId();
    setTickets((T) => [
      ...T,
      {
        id: tid,
        eventId: ev.id,
        owner: acct.address,
        ownerName: "You",
        faceValue: ev.faceValue,
        maxResale: ev.maxResale,
        royaltyBP: ev.royaltyBP,
        status: "ACTIVE",
        price: null,
        nonceBase: fnv("t" + tid),
      },
    ]);
    setMinted((m) => ({ ...m, [ev.id]: (m[ev.id] || 0) + 1 }));
    setAcct((a) => ({ ...a, bankBRL: a.bankBRL - ev.faceValue }));
    setPlatform((p) => ({ ...p, primary: p.primary + commission }));
    addLog(`event TicketMinted(#${tid}, event ${ev.id}, ${short(acct.address)}) ✓`, "ok");
    setPix(null);
    setView("wallet");
  };

  const listForResale = (ticket, price) => {
    if (price > ticket.maxResale) {
      addLog(`revert: salePriceBRL ${brl(price)} > maximumResalePriceBRL ${brl(ticket.maxResale)}`, "err");
      return false;
    }
    setTickets((T) => T.map((t) => t.id === ticket.id ? { ...t, status: "LISTED", price } : t));
    addLog(`Ticket #${ticket.id} listed for ${brl(price)} (ceiling ${brl(ticket.maxResale)})`, "vio");
    return true;
  };

  const unlist = (ticket) => {
    setTickets((T) => T.map((t) => t.id === ticket.id ? { ...t, status: "ACTIVE", price: null } : t));
    addLog(`Listing #${ticket.id} cancelled`, "");
  };

  const buyResale = (ticket) => {
    if (acct.bankBRL < ticket.price) { addLog(`Insufficient balance`, "err"); return; }

    addLog(`executeSecondaryTransferWithRoyalty(#${ticket.id}, ${brl(ticket.price)})`, "vio");
    const royalty    = +(ticket.price * ticket.royaltyBP / 10000).toFixed(2);
    const fee        = +(ticket.price * 0.04).toFixed(2);
    const sellerGets = +(ticket.price - royalty - fee).toFixed(2);
    addLog(`On-chain split → seller ${brl(sellerGets)} · organizer ${brl(royalty)} · platform ${brl(fee)}`, "gold");

    setTickets((T) =>
      T.map((t) =>
        t.id === ticket.id
          ? { ...t, owner: acct.address, ownerName: "You", status: "ACTIVE", price: null, nonceBase: fnv("t" + ticket.id + Date.now()) }
          : t
      )
    );
    setAcct((a) => ({ ...a, bankBRL: a.bankBRL - ticket.price }));
    setPlatform((p) => ({ ...p, secondary: p.secondary + fee }));
    setRoyalties((r) => ({ ...r, [ticket.eventId]: (r[ticket.eventId] || 0) + royalty }));
    addLog(`event TicketResold(#${ticket.id}) ✓ · royalty routed to organizer`, "ok");
    setView("wallet");
  };

  const markUsed = (ticket) => {
    setTickets((T) => T.map((t) => t.id === ticket.id ? { ...t, status: "USED" } : t));
    addLog(`markTicketAsUsed(#${ticket.id}) synced on-chain`, "ok");
  };

  /* ---- derived ---- */
  const myTickets = tickets.filter((t) => t.owner === acct?.address);
  const market    = tickets.filter((t) => t.status === "LISTED" && t.owner !== acct?.address);
  const evById    = (id) => events.find((e) => e.id === id);
  const window15  = Math.floor(now / 15000);
  const secsLeft  = 15 - (Math.floor(now / 1000) % 15);

  /* ========================== onboarding screen ========================== */
  if (!acct) {
    return (
      <div className="tc-root">
        <div className="wrap" style={{ maxWidth: 440, paddingTop: 70 }}>
          <div className="brand" style={{ fontSize: 26, justifyContent: "center", marginBottom: 8 }}>
            <span className="dot" style={{ width: 36, height: 36, fontSize: 20 }}>✓</span>
            TudoCerto Pass
          </div>
          <p className="sub" style={{ textAlign: "center", margin: "0 auto 28px" }}>
            Tickets nobody can clone, scalp, or counterfeit. Sign in within seconds — no crypto wallet, no seed phrase.
          </p>
          <div className="card" style={{ textAlign: "center" }}>
            <div className="tag p" style={{ margin: "0 auto 14px" }}>● ERC-4337 abstract account</div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 18 }}>
              Your wallet is created and secured by MPC + HSM behind the scenes. You just log in.
            </p>
            <button className="btn"       style={{ width: "100%", marginBottom: 10 }} onClick={() => signIn("Google")}>Continue with Google</button>
            <button className="btn ghost" style={{ width: "100%" }}                   onClick={() => signIn("Apple")}>Continue with Apple</button>
          </div>
          <p className="muted2" style={{ fontSize: 11.5, textAlign: "center", marginTop: 16 }}>
            MVP / demo · UFSC · on-chain state simulated in memory
          </p>
        </div>
      </div>
    );
  }

  /* ========================== main app ========================== */
  const tabsWithCounts = TABS.map((t) => ({
    ...t,
    n: t.k === "wallet" ? myTickets.length || null : t.k === "resale" ? market.length || null : null,
  }));

  return (
    <div className="tc-root">
      {/* header */}
      <div className="hdr">
        <div className="hdr-in">
          <div className="brand">
            <span className="dot">✓</span>
            <div>TudoCerto Pass<br /><small>MVP · Brazil Live Events</small></div>
          </div>
          <div className="wallet-chip">
            <span className="av" />
            <div>
              <b className="mono">{short(acct.address)}</b>
              <div className="bal">{brl(acct.bankBRL)} <span className="muted2" style={{ fontWeight: 400 }}>in bank</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap">
        {/* tabs */}
        <div className="tabs">
          {tabsWithCounts.map((t) => (
            <button key={t.k} className={"tab" + (view === t.k ? " on" : "")} onClick={() => setView(t.k)}>
              {t.l}{t.n ? <span className="pill">{t.n}</span> : null}
            </button>
          ))}
        </div>

        {/* DISCOVER */}
        {view === "discover" && (
          <>
            <h2 className="sec dsp">Live Events</h2>
            <p className="sub">
              Purchase settled by Pix in seconds. The ticket is minted as a programmable token on Arbitrum L2 —
              with resale ceiling and royalty embedded by the organizer.
            </p>
            <div className="grid c2">
              {events.map((e) => {
                const left = e.cap - (minted[e.id] || 0);
                const pct  = (minted[e.id] || 0) / e.cap * 100;
                const sold = left <= 0;
                return (
                  <div key={e.id} className="card ev">
                    <div className="top" style={{ background: e.grad }}><span>{e.name}</span></div>
                    <div className="meta">
                      <div className="muted" style={{ fontSize: 13 }}>{e.venue}</div>
                      <div className="row" style={{ fontSize: 13 }}>
                        <span className="muted2">{e.date}</span>
                        <span className="tag g">royalty {e.royaltyBP / 100}%</span>
                      </div>
                    </div>
                    <div className="between">
                      <span className="dsp" style={{ fontWeight: 800, fontSize: 20 }}>{brl(e.faceValue)}</span>
                      <span className="tag v">resale ceiling {brl(e.maxResale)}</span>
                    </div>
                    <div className="barwrap"><div className="bar" style={{ width: pct + "%" }} /></div>
                    <div className="between">
                      <span className="k">{sold ? "Sold out" : `${left} of ${e.cap} available`}</span>
                      <button className="btn pix sm" disabled={sold} onClick={() => startPix(e)}>
                        {sold ? "Sold out" : "Pay with Pix"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* WALLET */}
        {view === "wallet" && (
          <>
            <h2 className="sec dsp">My Wallet</h2>
            <p className="sub">
              Each ticket displays a cryptographic QR that <b>regenerates every 15 seconds</b> (ECDSA secp256k1).
              A screenshot loses validity immediately — cloning is mathematically impossible.
            </p>
            {myTickets.length === 0 ? (
              <div className="note">You have no tickets yet. Go to <b>Discover</b> and buy with Pix.</div>
            ) : (
              <div className="grid">
                {myTickets.map((t) => (
                  <TicketRow
                    key={t.id}
                    t={t}
                    ev={evById(t.eventId)}
                    window15={window15}
                    secsLeft={secsLeft}
                    now={now}
                    onList={listForResale}
                    onUnlist={unlist}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* RESALE */}
        {view === "resale" && (
          <>
            <h2 className="sec dsp">Resale Market</h2>
            <p className="sub">
              Every resale goes through the contract: price above the ceiling is <b>reverted in the EVM</b>;
              royalty flows automatically to the organizer. Scalpers lose the game.
            </p>
            {market.length === 0 ? (
              <div className="note">No active listings at the moment.</div>
            ) : (
              <div className="grid c2">
                {market.map((t) => {
                  const e       = evById(t.eventId);
                  const royalty = +(t.price * t.royaltyBP / 10000).toFixed(2);
                  const fee     = +(t.price * 0.04).toFixed(2);
                  return (
                    <div key={t.id} className="card ev">
                      <div className="between">
                        <span className="dsp" style={{ fontWeight: 700 }}>{e.name}</span>
                        <span className="tag mut">{t.ownerName}</span>
                      </div>
                      <div className="muted" style={{ fontSize: 13 }}>{e.venue} · {e.date}</div>
                      <hr className="div" />
                      <div className="between">
                        <span className="k">Price</span>
                        <span className="dsp" style={{ fontWeight: 800, fontSize: 20 }}>{brl(t.price)}</span>
                      </div>
                      <div className="between">
                        <span className="k">Allowed ceiling</span>
                        <span className="v">{brl(t.maxResale)}</span>
                      </div>
                      <div className="between">
                        <span className="k">Organizer royalty ({t.royaltyBP / 100}%)</span>
                        <span className="v" style={{ color: "var(--gold)" }}>{brl(royalty)}</span>
                      </div>
                      <div className="between">
                        <span className="k">Platform fee (4%)</span>
                        <span className="v" style={{ color: "var(--pix)" }}>{brl(fee)}</span>
                      </div>
                      <button className="btn pix" onClick={() => buyResale(t)}>
                        Buy resale · {brl(t.price)}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* GATE */}
        {view === "gate" && (
          <GateView
            tickets={tickets}
            evById={evById}
            window15={window15}
            onUsed={markUsed}
            addLog={addLog}
          />
        )}

        {/* ORGANIZER */}
        {view === "organizer" && (
          <OrganizerView
            events={events}
            minted={minted}
            tickets={tickets}
            royalties={royalties}
            platform={platform}
          />
        )}

        {/* pipeline log */}
        <h2 className="sec dsp" style={{ fontSize: 16, marginTop: 30 }}>Behind the scenes · real-time pipeline</h2>
        <p className="sub" style={{ marginBottom: 10 }}>
          What the user never sees: Pix → Kafka → Redis → HSM relayer → Arbitrum L2.
        </p>
        <div className="log" ref={logRef}>
          {log.length === 0 ? (
            <div className="muted2">Waiting for actions…</div>
          ) : (
            log.map((l) => (
              <div className="ln" key={l.k}>
                <span className="t">{l.t}</span>
                <span className={l.cls}>{l.text}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* pix modal */}
      {pix && (
        <PixModal
          pix={pix}
          now={now}
          onCancel={() => { setPix(null); addLog("Pix charge expired/cancelled", ""); }}
          onConfirm={confirmPix}
        />
      )}
    </div>
  );
}
