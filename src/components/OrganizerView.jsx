import React from "react";
import { brl } from "../utils/format";

export default function OrganizerView({ events, minted, tickets, royalties, platform }) {
  const totalRoyalty  = Object.values(royalties).reduce((a, b) => a + b, 0);
  const totalPrimary  = events.reduce((a, e) => a + (minted[e.id] || 0) * e.faceValue, 0);
  const totalMinted   = Object.values(minted).reduce((a, b) => a + b, 0);

  const statuses = ["MINTED", "ACTIVE", "LISTED", "USED", "INVALIDATED"];
  const counts   = statuses.reduce((o, s) => {
    o[s] = tickets.filter((t) => t.status === s).length;
    return o;
  }, {});

  const tagClass = (s) => {
    if (s === "USED")        return "mut";
    if (s === "LISTED")      return "g";
    if (s === "INVALIDATED") return "c";
    return "v";
  };

  return (
    <>
      <h2 className="sec dsp">Painel do organizador</h2>
      <p className="sub">
        Visibilidade total sobre o ciclo de vida do ingresso — inclusive a receita secundária que,
        no modelo legado, vazava 100% para o mercado paralelo.
      </p>

      <div className="grid c2" style={{ marginBottom: 14 }}>
        <div className="stat">
          <div className="n" style={{ color: "var(--pix)" }}>{brl(totalPrimary)}</div>
          <div className="l">Receita primária (face value)</div>
        </div>
        <div className="stat">
          <div className="n" style={{ color: "var(--gold)" }}>{brl(totalRoyalty)}</div>
          <div className="l">Royalties de revenda capturados</div>
        </div>
        <div className="stat">
          <div className="n">{brl(platform.primary + platform.secondary)}</div>
          <div className="l">Receita da plataforma</div>
        </div>
        <div className="stat">
          <div className="n" style={{ color: "var(--violet-soft)" }}>{totalMinted}</div>
          <div className="l">Ingressos cunhados</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="k" style={{ marginBottom: 12 }}>Estado dos tokens (invariantes do contrato)</div>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          {statuses.map((s) => (
            <span key={s} className={"tag " + tagClass(s)}>{s} · {counts[s]}</span>
          ))}
        </div>
        <hr className="div" />
        <p className="muted2" style={{ fontSize: 12 }}>
          Invariante garantida em protocolo: supply cunhado nunca excede a capacidade do venue;
          revenda nunca ultrapassa o teto; transferência exige assinatura do dono.
        </p>
      </div>

      <div className="card">
        <div className="k" style={{ marginBottom: 12 }}>Eventos</div>
        {events.map((e) => (
          <div key={e.id} className="between" style={{ padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
            <div>
              <b>{e.name}</b>
              <div className="muted2" style={{ fontSize: 12 }}>
                {e.org} · royalty {e.royaltyBP / 100}% · teto {brl(e.maxResale)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="v">{minted[e.id] || 0}/{e.cap}</div>
              <div className="muted2" style={{ fontSize: 11 }}>royalty {brl(royalties[e.id] || 0)}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
