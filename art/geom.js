// Geometry helpers for the character art: smooth splines, tapered strokes
// (hair locks, sleeves, line art) and ruffles.

const r1 = (n) => Math.round(n * 10) / 10;
const pt = ([x, y]) => `${r1(x)} ${r1(y)}`;

// Uniform Catmull-Rom spline through pts, sampled `per` times per segment.
export function sampleSpline(pts, per = 12) {
  const out = [];
  const n = pts.length;
  const get = (i) => pts[Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, p2, p3] = [get(i - 1), get(i), get(i + 1), get(i + 2)];
    for (let s = 0; s < per; s++) {
      const t = s / per, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[n - 1]);
  return out;
}

// Path of cubic Béziers through pts. With cont = true the leading 'M' is left out.
export function smooth(pts, { closed = false, cont = false } = {}) {
  const n = pts.length;
  const get = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = cont ? '' : `M${pt(pts[0])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return closed ? d + ' Z' : d;
}

// Value of a [[t, v], ...] profile at t, eased between keys.
function interp(profile, t) {
  if (t <= profile[0][0]) return profile[0][1];
  for (let i = 1; i < profile.length; i++) {
    const [t0, v0] = profile[i - 1];
    const [t1, v1] = profile[i];
    if (t <= t1) {
      const u = (t - t0) / (t1 - t0);
      return v0 + (v1 - v0) * u * u * (3 - 2 * u);
    }
  }
  return profile[profile.length - 1][1];
}

// A tapered band along a spline through `points`. `width` is a number or a
// [[t, w], ...] profile over the band's length. Used for hair locks, sleeves,
// legs and brush-like line art. Returns { d, left, right, center }.
export function lock(points, width, { per = 10 } = {}) {
  const c = sampleSpline(points, per);
  const n = c.length;
  const len = [0];
  for (let i = 1; i < n; i++) len.push(len[i - 1] + Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]));
  const L = len[n - 1] || 1;
  const prof = typeof width === 'number' ? [[0, width], [0.3, width], [1, 0]] : width;
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const a = c[Math.max(0, i - 1)], b = c[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const m = Math.hypot(tx, ty) || 1;
    tx /= m; ty /= m;
    const w = interp(prof, len[i] / L) / 2;
    left.push([c[i][0] - ty * w, c[i][1] + tx * w]);
    right.push([c[i][0] + ty * w, c[i][1] - tx * w]);
  }
  const back = right.slice().reverse();
  const d = `${smooth(left)} L${pt(back[0])}${smooth(back, { cont: true })} Z`;
  return { d, left, right, center: c };
}

export function mirrorPts(pts, cx = 300) {
  return pts.map(([x, y]) => [2 * cx - x, y]);
}

// Tapered outline round the lower part of a lock (from t0 down one edge,
// round the tip and back up the other), so lock lines fade in like ink.
export function lockLine(lk, t0 = 0.45, w = 2.6) {
  const n = lk.left.length;
  const k = Math.round(t0 * (n - 1));
  const pts = [...lk.left.slice(k), ...lk.right.slice(k).reverse().slice(1)];
  return lock(pts, [[0, 0], [0.18, w], [0.5, w * 1.1], [0.82, w], [1, 0]], { per: 1 }).d;
}

// Arc-length walker along a spline: at(s) -> { p, n } with n the left-hand normal.
export function pathOf(points, per = 12) {
  const c = sampleSpline(points, per);
  const len = [0];
  for (let i = 1; i < c.length; i++) len.push(len[i - 1] + Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]));
  const L = len[len.length - 1];
  function at(s) {
    s = Math.max(0, Math.min(L, s));
    let i = 1;
    while (i < len.length - 1 && len[i] < s) i++;
    const u = (s - len[i - 1]) / (len[i] - len[i - 1] || 1);
    const p = [c[i - 1][0] + (c[i][0] - c[i - 1][0]) * u, c[i - 1][1] + (c[i][1] - c[i - 1][1]) * u];
    let tx = c[i][0] - c[i - 1][0], ty = c[i][1] - c[i - 1][1];
    const m = Math.hypot(tx, ty) || 1;
    tx /= m; ty /= m;
    return { p, n: [ty, -tx] };
  }
  return { at, L, pts: c };
}

// A ruffle along `points`: the attached edge follows the line and the free edge
// is scalloped. side = 1 puts it on the left-hand side of the direction of travel.
// Returns the outline `d` and the little fold lines `folds`.
export function frill(points, { w = 14, size = 12, side = 1 } = {}) {
  const P = pathOf(points);
  const k = Math.max(2, Math.round(P.L / size));
  const off = (s, dist) => {
    const { p, n } = P.at(s);
    return [p[0] + n[0] * dist * side, p[1] + n[1] * dist * side];
  };
  const V = (i) => off((P.L * i) / k, w * 0.72);
  let d = smooth(P.pts.filter((_, i) => i % 3 === 0 || i === P.pts.length - 1));
  d += ` L${pt(V(k))}`;
  for (let i = k; i > 0; i--) d += ` Q${pt(off((P.L * (i - 0.5)) / k, w * 1.32))} ${pt(V(i - 1))}`;
  d += ' Z';
  let folds = '';
  for (let i = 1; i < k; i++) folds += `M${pt(off((P.L * i) / k, w * 0.12))} L${pt(V(i))} `;
  for (let i = 0; i < k; i++) {
    const s = (P.L * (i + 0.5)) / k;
    folds += `M${pt(off(s, w * 0.35))} L${pt(off(s, w * 0.95))} `;
  }
  return { d, folds };
}
