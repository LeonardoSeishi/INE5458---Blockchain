import React, { useState } from "react";

export default function GateView({ tickets, evById, window15, onUsed, addLog }) {
  const [offline, setOffline] = useState(false);
  const [result, setResult]   = useState(null);

  const valid   = tickets.filter((t) => t.status === "ACTIVE" || t.status === "LISTED");
  const [pick, setPick] = useState(valid[0]?.id || "");
  const current = tickets.find((t) => String(t.id) === String(pick));

  const scan = (mode) => {
    if (!current) {
      setResult({ ok: false, title: "Nenhum ingresso", detail: "Compre um ingresso primeiro." });
      return;
    }

    const ms = (Math.random() * 3 + 1.4).toFixed(1);

    if (current.status === "USED") {
      setResult({
        ok: false,
        title: "JÁ UTILIZADO",
        detail: `Ingresso #${current.id} consta como USED no bloom filter. Entrada negada.`,
      });
      addLog(`Portão: #${current.id} rejeitado — double-spend (já USED)`, "err");
      return;
    }

    if (mode === "print") {
      setResult({
        ok: false,
        title: "QR EXPIRADO",
        detail: `Print capturado há ~45s. Timestamp fora do skew (janela ${window15 - 3} vs ${window15}). Verificação ECDSA local OK, porém a assinatura é antiga. Negado.`,
      });
      addLog(`Portão: print rejeitado — timestamp skew excedido (${ms}ms on-device)`, "err");
      return;
    }

    setResult({
      ok: true,
      title: "ENTRADA LIBERADA",
      detail: `${offline ? "Modo offline · " : ""}ECDSA verificado on-device em ${ms}ms · nonce e timestamp dentro do skew · ID presente no bloom filter.`,
    });
    addLog(`Portão${offline ? " (offline)" : ""}: #${current.id} verde em ${ms}ms${offline ? " · log em SQLite p/ sync" : ""}`, "ok");
    onUsed(current);
    setTimeout(() => setResult(null), 4200);
  };

  return (
    <>
      <h2 className="sec dsp">Portão de verificação</h2>
      <p className="sub">
        Validação criptográfica <b>local, &lt;5ms</b>, sem ida ao servidor por pessoa.
        Funciona offline com chaves pré-cacheadas e bloom filter. Teste os três cenários abaixo.
      </p>

      <div className="grid c2">
        <div className="card">
          <div className="k" style={{ marginBottom: 8 }}>Ingresso no leitor</div>
          <select
            className="field"
            value={pick}
            onChange={(e) => { setPick(e.target.value); setResult(null); }}
            style={{ marginBottom: 14 }}
          >
            <option value="">— selecione —</option>
            {tickets.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.id} · {evById(t.eventId).name} · {t.status}
              </option>
            ))}
          </select>

          <label className="switch" onClick={() => setOffline((o) => !o)} style={{ marginBottom: 16 }}>
            <span className={"tr" + (offline ? " on" : "")}><span className="kb" /></span>
            {offline ? "Rede caiu — modo offline" : "Rede online"}
          </label>

          <div className="grid" style={{ gap: 9 }}>
            <button className="btn pix"   onClick={() => scan("live")}>Escanear QR ao vivo</button>
            <button className="btn coral" onClick={() => scan("print")}>Tentar com print da tela (capturado há 45s)</button>
            <button className="btn ghost" onClick={() => scan("live")}>Escanear de novo (testar double-spend)</button>
          </div>
        </div>

        <div className={"gate " + (result ? (result.ok ? "ok" : "bad") : "idle")}>
          {!result && (
            <>
              <div className="big" style={{ color: "var(--muted2)" }}>◳</div>
              <div className="muted">Aguardando leitura…</div>
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
