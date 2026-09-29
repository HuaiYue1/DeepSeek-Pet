// Where she can walk. She walks along the floor she is standing on; at the
// edge of her screen she turns round or, if allowed, walks on to the screen
// next to it (onto its floor, if she was standing on the bottom of hers).
// Plain maths on rectangles ({ x, y, width, height }) so it can be tested
// without real screens. `win` is her window's bounds; `pet` is { w, h,
// floor }: her body's size, centred in the window, with her feet `floor` px
// above the window's bottom; displays are Electron's { id, bounds, workArea }.

const bottom = (r) => r.y + r.height;
const right = (r) => r.x + r.width;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const feetOf = (win, pet) => bottom(win) - pet.floor;

// The display under a point, or else the nearest one.
export function displayAt(displays, x, y) {
  let best = null;
  let bestDistance = Infinity;
  for (const d of displays) {
    const b = d.bounds;
    const dx = Math.max(b.x - x, 0, x - right(b));
    const dy = Math.max(b.y - y, 0, y - bottom(b));
    const distance = Math.hypot(dx, dy);
    if (distance < bestDistance) [best, bestDistance] = [d, distance];
  }
  return best;
}

// The screen touching `here` on the left (dir -1) or right (dir 1), the one
// sharing the most height with it if there are several.
export function neighbour(displays, here, dir) {
  const h = here.bounds;
  const edge = dir > 0 ? right(h) : h.x;
  let best = null;
  let bestOverlap = 0;
  for (const d of displays) {
    if (d.id === here.id) continue;
    const b = d.bounds;
    const touching = Math.abs((dir > 0 ? b.x : right(b)) - edge) <= 2;
    const overlap = Math.min(bottom(b), bottom(h)) - Math.max(b.y, h.y);
    if (touching && overlap > bestOverlap) [best, bestOverlap] = [d, overlap];
  }
  return best;
}

// Her screen; whether she is standing on its bottom edge (above the taskbar
// or Dock, if there is one there: `taskbar` is its height); and which ways
// she could walk on to another screen.
export function surroundings(win, pet, displays, cross) {
  const feet = feetOf(win, pet);
  const display = displayAt(displays, win.x + win.width / 2, feet - 1);
  const wa = display.workArea;
  const grounded = Math.abs(feet - bottom(wa)) <= 4;
  return {
    display,
    grounded,
    taskbar: grounded ? Math.max(0, bottom(display.bounds) - bottom(wa)) : 0,
    left: cross && !!neighbour(displays, display, -1),
    right: cross && !!neighbour(displays, display, 1),
  };
}

// Where her window goes for a step of dx px: { x, y, hop }. hop is set when
// she changes floor on to another screen, and { x, y } is where she lands.
// Without room that way, she stays at the edge of her screen (or where she
// is, if she was already past it).
export function walkStep(win, dx, pet, displays, cross) {
  const margin = (win.width - pet.w) / 2;
  const feet = feetOf(win, pet);
  const here = displayAt(displays, win.x + win.width / 2, feet - 1);
  const wa = here.workArea;
  const x = win.x + dx;
  const lead = dx > 0 ? x + margin + pet.w : x + margin; // her leading edge after the step
  if (lead >= wa.x && lead <= right(wa)) return { x, y: win.y, hop: false };
  const next = cross ? neighbour(displays, here, Math.sign(dx)) : null;
  if (next) {
    const nwa = next.workArea;
    const grounded = Math.abs(feet - bottom(wa)) <= 4;
    const nextFeet = grounded ? bottom(nwa) : clamp(feet, nwa.y + pet.h, bottom(nwa));
    const y = win.y + (nextFeet - feet);
    return { x, y, hop: Math.abs(y - win.y) > 2 };
  }
  const edge = dx > 0 ? right(wa) - margin - pet.w : wa.x - margin;
  return { x: dx > 0 ? Math.max(win.x, Math.min(x, edge)) : Math.min(win.x, Math.max(x, edge)), y: win.y, hop: false };
}
