// src/utils/shiftFormat.js
const mins = (t) => {
  const [h, m] = String(t || "00:00")
    .split(":")
    .map(Number);
  return h * 60 + m;
};

export const isOvernight = (start, end) => mins(end) <= mins(start);

export const lengthMinutes = (start, end) => {
  let d = mins(end) - mins(start);
  if (d <= 0) d += 1440;
  return d;
};

export const hm = (m) => {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
};
