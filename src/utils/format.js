export const brl = (n) =>
  "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const short = (a) => a.slice(0, 6) + "…" + a.slice(-4);
