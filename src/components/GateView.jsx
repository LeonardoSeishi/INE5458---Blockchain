import React, { useState } from "react";

export default function GateView({ tickets, evById, window15, onUsed, addLog }) {
  const [offline, setOffline] = useState(false);
  const [result, setResult]   = useState(null);

  const valid   = tickets.filter((t) => t.status === "ACTIVE" || t.status === "LISTED");
  const [pick, setPick] = useState(valid[0]?.id || "");
  const current = tickets.find((t) => String(t.id) === String(pick));

  const scan = (mode) => {
    if (!current) {
      setResult({ ok: false, title: "No ticket", detail: "Buy a ticket first." });
      return;
    }

    const ms = (Math.random() * 3 + 1.4).toFixed(1);

    if (current.status === "USED") {
      setResult({
        ok: false,
        title: "ALREADY USED",
        detail: `Ticket #${current.id} is marked USED in the bloom filter. Entry denied.`,
      });
      addLog(`Gate: #${current.id} rejected — double-spend (already USED)`, "err");
      return;
    }

    if (mode === "print") {
      setResult({
        ok: false,
        title: "EXPIRED QR",
        detail: `Screenshot captured ~45s ago. Timestamp outside skew window (${window15 - 3} vs ${window15}). ECDSA signature valid but stale. Denied.`,
      });
      addLog(`Gate: screenshot rejected — timestamp skew exceeded (${ms}ms on-device)`, "err");
      return;
    }

    setResult({
      ok: true,
      title: "ENTRY GRANTED",
      detail: `${offline ? "Offline mode · " : ""}ECDSA verified on-device in ${ms}ms · nonce and timestamp within skew · ID present in bloom filter.`,
    });
    addLog(`Gate${offline ? " (offline)" : ""}: #${current.id} approved in ${ms}ms${offline ? " · logged to SQLite for sync" : ""}`, "ok");
    onUsed(current);
    setTimeout(() => setResult(null), 4200);
  };

  return (
    <>
      <h2 className="sec dsp">Verification Gate</h2>
      <p className="sub">
        Cryptographic validation <b>local, &lt;5ms</b>, no server round-trip per person.
        Works offline with pre-cached keys and bloom filter. Test the three scenarios below.
      </p>

      <div className="grid c2">
        <div className="card">
          <div className="k" style={{ marginBottom: 8 }}>Ticket at reader</div>
          <select
            className="field"
            value={pick}
            onChange={(e) => { setPick(e.target.value); setResult(null); }}
            style={{ marginBottom: 14 }}
          >
            <option value="">— select —</option>
            {tickets.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.id} · {evById(t.eventId).name} · {t.status}
              </option>
            ))}
          </select>

          <label className="switch" onClick={() => setOffline((o) => !o)} style={{ marginBottom: 16 }}>
            <span className={"tr" + (offline ? " on" : "")}><span className="kb" /></span>
            {offline ? "Network down — offline mode" : "Network online"}
          </label>

          <div className="grid" style={{ gap: 9 }}>
            <button className="btn pix"   onClick={() => scan("live")}>Scan live QR</button>
            <button className="btn coral" onClick={() => scan("print")}>Try with screenshot (captured 45s ago)</button>
            <button className="btn ghost" onClick={() => scan("live")}>Scan again (test double-spend)</button>
          </div>
        </div>

        <div className={"gate " + (result ? (result.ok ? "ok" : "bad") : "idle")}>
          {!result && (
            <>
              <div className="big" style={{ color: "var(--muted2)" }}>◳</div>
              <div className="muted">Awaiting scan…</div>
            </>
          )}
          {result && (
            <>
              <div className="big" style={{ color: result.ok ? "var(--pix)" : "var(--coral)" }}>
                {result.ok ? "✓" : "✕"}
              </div>
              <div className="dsp" style={{ fontWeight: 800, fontSize: 18, color: result.ok ? "var(--pix)" : "var(--coral)" }}>
                {result.title}
              </div>
              <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>{result.detail}</p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
