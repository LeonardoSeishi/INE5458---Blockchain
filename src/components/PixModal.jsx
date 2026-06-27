import React from "react";
import { brl } from "../utils/format";
import QR from "./QR";

export default function PixModal({ pix, now, onCancel, onConfirm }) {
  const left = Math.max(0, pix.ttl - Math.floor((now - pix.ts) / 1000));

  return (
    <div className="scrim" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 14 }}>
          <span className="tag p">Pix · SPI Banco Central</span>
          <span className="mono muted" style={{ marginLeft: "auto" }}>expira em {left}s</span>
        </div>

        <div className="ttl">{pix.ev.name}</div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>{pix.ev.venue}</div>

        <div className="qrbox" style={{ width: 168, height: 168, margin: "0 auto 14px" }}>
          <QR payload={pix.code} />
        </div>

        <div className="between" style={{ marginBottom: 10 }}>
          <span className="k">Valor</span>
          <span className="dsp" style={{ fontWeight: 800, fontSize: 22 }}>{brl(pix.ev.faceValue)}</span>
        </div>

        <div className="pixcode" style={{ marginBottom: 16 }}>{pix.code}</div>

        {left === 0 ? (
          <button className="btn coral" style={{ width: "100%" }} onClick={onCancel}>
            Cobrança expirada — fechar
          </button>
        ) : (
          <button className="btn pix" style={{ width: "100%" }} onClick={onConfirm}>
            Simular pagamento Pix recebido
          </button>
        )}

        <p className="muted2" style={{ fontSize: 11, textAlign: "center", marginTop: 12 }}>
          Ao confirmar, o webhook do PSP dispara a cunhagem on-chain.
        </p>
      </div>
    </div>
  );
}
