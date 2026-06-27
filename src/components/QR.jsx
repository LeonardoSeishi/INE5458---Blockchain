import React from "react";
import { fnv, rng } from "../utils/crypto";

export default function QR({ payload, size = 21 }) {
  const r = rng(fnv(payload));
  const cells = [];

  const isFinder = (x, y) => {
    const f = (cx, cy) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7;
    return f(0, 0) || f(size - 7, 0) || f(0, size - 7);
  };

  const finderOn = (x, y) => {
    const local = (cx, cy) => {
      const lx = x - cx, ly = y - cy;
      const b = lx === 0 || lx === 6 || ly === 0 || ly === 6;
      const c = lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4;
      return b || c;
    };
    if (x < 7 && y < 7)               return local(0, 0);
    if (x >= size - 7 && y < 7)       return local(size - 7, 0);
    if (x < 7 && y >= size - 7)       return local(0, size - 7);
    return false;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const on = isFinder(x, y) ? finderOn(x, y) : r() > 0.52;
      if (on) {
        cells.push(
          <rect key={x + "-" + y} x={x} y={y} width="1" height="1" rx="0.18" fill="#150E2E" />
        );
      }
    }
  }

  return (
    <svg viewBox={`-1 -1 ${size + 2} ${size + 2}`} shapeRendering="crispEdges">
      {cells}
    </svg>
  );
}
