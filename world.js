/* world.js - data + world generation */
function makeFactions() {
  return [
    { id: "A", name: "Atlantic Union", color: "#4fa3ff", rule: "trade_bonus" },
    { id: "B", name: "Iron Directorate", color: "#ff5c5c", rule: "industry_bonus" },
    { id: "C", name: "Verdant League",  color: "#52f2a3", rule: "growth_bonus" },
  ];
}
function makeWorld(seed = Date.now()) {
  const rng = mulberry32(hash32(String(seed)));
  const width = 1000;
  const height = 650;
  const cols = 8;
  const rows = 5;
  const territories = [];
  let idCounter = 1;
  const baseW = width / cols;
  const baseH = height / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const jitterX = Math.floor((rng() - 0.5) * 18);
      const jitterY = Math.floor((rng() - 0.5) * 18);
      const pad = 6;
      const x = Math.floor(c * baseW + pad + jitterX);
      const y = Math.floor(r * baseH + pad + jitterY);
      const w = Math.floor(baseW - pad * 2);
      const h = Math.floor(baseH - pad * 2);
      territories.push({
        id: `T${idCounter++}`,
        name: `Territory ${idCounter - 1}`,
        rect: { x, y, w, h },
        owner: null,
        population: randInt(rng, 1, 5),
        industry: randInt(rng, 0, 3),
        resources: randInt(rng, 0, 3),
        unitId: null,
      });
    }
  }
  const factions = makeFactions();
  const units = spawnStartingUnits(rng, factions, territories);
  return { seed, size: { width, height }, factions, territories, units };
}
function spawnStartingUnits(rng, factions, territories) {
  const units = [];
  const taken = new Set();
  for (const f of factions) {
    let t = null;
    for (let tries = 0; tries < 200; tries++) {
      const pick = territories[randInt(rng, 0, territories.length - 1)];
      if (!taken.has(pick.id)) { t = pick; break; }
    }
    if (!t) t = territories[0];
    taken.add(t.id);
    t.owner = f.id;
    const unit = {
      id: `U_${f.id}`,
      factionId: f.id,
      territoryId: t.id,
      type: "infantry",
      strength: 1,
      movesLeft: 1,
    };
    t.unitId = unit.id;
    units.push(unit);
  }
  return units;
}
function territoryAtPoint(world, x, y) {
  for (const t of world.territories) {
    const r = t.rect;
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return t;
  }
  return null;
}
function randInt(rng, min, max) { return Math.floor(rng() * (max - min + 1)) + min; }
function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
