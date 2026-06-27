import React, { useState } from "react";
import { hex } from "../utils/crypto";
import { brl } from "../utils/format";
import QR from "./QR";
import CountRing from "./CountRing";

export default function TicketRow({ t, ev, window15, secsLeft, onList, onUnlist }) {
  const [listing, setListing] = useState(false);
  const [price, setPrice] = useState(ev.maxResale);
  const [err, setErr] = useState("");

  const nonce   = (t.nonceBase || 0) + window15;
  const ts      = window15 * 15000;
  const payload = `${t.id}|${t.owner}|${nonce}|${ts}`;
  const sig     = hex(payload, 64);

  const used   = t.status === "USED";
  const listed = t.status === "LISTED";

  const handleList = () => {
    const ok = onList(t, price);
    if (!ok) {
      setErr(`Acima do teto ${brl(t.maxResale)} — revertido pelo contrato`);
    } else {
      setListing(false);
      setErr("");
    }
  };

  return (
    <div className="ticket">
      <div className="head">
        <div>
          <div className="dsp" style={{ fontWeight: 800, fontSize: 16 }}>{ev.name}</div>
          <div className="muted" style={{ fontSize: 12.5 }}>{ev.venue} · {ev.date}</div>
        </div>
        <span className={"tag " + (used ? "mut" : listed ? "g" : "p")}>
          {used ? "USADO" : listed ? "À VENDA" : "ATIVO"}
        </span>
      </div>

      <div className="perf" />
      <div className="notch l" />
      <div className="notch r" />

      <div className="body">
        {used ? (
          <div className="qrbox" style={{ display: "grid", placeItems: "center", color: "var(--on-paper)", fontFamily: "Sora", fontWeight: 800 }}>
            ✓ usado
          </div>
        ) : (
          <div className="qrbox">
            <QR payload={payload} />
            <CountRing secsLeft={secsLeft} />
          </div>
        )}

        <div className="fld">
          <div>
            <div className="lab">Ingresso #</div>
            <div className="val mono">{t.id}</div>
          </div>
          <div>
            <div className="lab">Nonce monotônico</div>
            <div className="val mono">{nonce}</div>
          </div>
          <div>
            <div className="lab">Assinatura ECDSA (secp256k1)</div>
            <div className="val mono" style={{ fontSize: 11, color: "var(--violet-soft)" }}>
              {sig.slice(0, 34)}…
            </div>
          </div>
        </div>
      </div>

      {!used && (
        <div style={{ padding: "0 18px 16px" }}>
          {!listing && !listed && (
            <button className="btn ghost sm" onClick={() => setListing(true)}>Revender</button>
          )}

          {listed && (
            <div className="between">
              <span className="tag g">Listado por {brl(t.price)}</span>
              <button className="btn ghost sm" onClick={() => onUnlist(t)}>Cancelar listagem</button>
            </div>
          )}

          {listing && (
            <div className="row" style={{ flexWrap: "wrap" }}>
              <input
                className="field"
                style={{ maxWidth: 130 }}
                type="number"
                value={price}
                onChange={(e) => setPrice(+e.target.value)}
              />
              <button className="btn pix sm" onClick={handleList}>Listar</button>
              <button className="btn ghost sm" onClick={() => { setListing(false); setErr(""); }}>Cancelar</button>
              <span className="muted2" style={{ fontSize: 11, width: "100%" }}>
                Teto: {brl(t.maxResale)}
                {err && <b style={{ color: "var(--coral)", display: "block", marginTop: 4 }}>{err}</b>}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
