export const fnv = (s) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

export const rng = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const hex = (s, n = 64) => {
  let out = "";
  let seed = fnv(s);
  while (out.length < n) {
    seed = fnv(out + seed);
    out += seed.toString(16).padStart(8, "0");
  }
  return out.slice(0, n);
};

export const addr = () => "0x" + hex(Math.random().toString() + Date.now(), 40);
