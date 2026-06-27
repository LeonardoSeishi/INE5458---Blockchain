import React from "react";

export default function CountRing({ secsLeft, total = 15 }) {
  const R = 11;
  const C = 2 * Math.PI * R;
  const frac = secsLeft / total;

  return (
    <svg className="ring" viewBox="0 0 30 30">
      <circle
        cx="15" cy="15" r={R}
        fill="#0A1A14"
        stroke="rgba(255,255,255,.12)"
        strokeWidth="3"
      />
      <circle
        cx="15" cy="15" r={R}
        fill="none"
        stroke="var(--pix)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - frac)}
        transform="rotate(-90 15 15)"
        style={{ transition: "stroke-dashoffset .9s linear" }}
      />
      <text
        x="15" y="19"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="#A7F3D0"
        fontFamily="JetBrains Mono"
      >
        {secsLeft}
      </text>
    </svg>
  );
}
