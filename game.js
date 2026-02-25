/* game.js - rendering + interactions */
const Game = { canvas:null, ctx:null, world:null, turn:1, activeFactionIndex:0, selectedTerritoryId:null };

window.addEventListener("DOMContentLoaded", () => {
  Game.canvas = document.getElementById("gameCanvas");
  Game.ctx = Game.canvas.getContext("2d");
  wireUI();
  newWorld();
  requestAnimationFrame(loop);
});

function wireUI() {
  document.getElementById("endTurnBtn").addEventListener("click", endTurn);
  document.getElementById("newWorldBtn").addEventListener("click", newWorld);

  Game.canvas.addEventListener("click", (e) => {
    const { x, y } = canvasPointFromEvent(Game.canvas, e);
    const t = territoryAtPoint(Game.world, x, y);
    if (!t) return;
    selectTerritory(t.id);
  });
}

function newWorld() {
  Game.world = makeWorld(Date.now());
  Game.turn = 1;
  Game.activeFactionIndex = 0;
  Game.selectedTerritoryId = null;
  rebuildFactionPanel();
  logLine(`New world generated (seed: ${Game.world.seed}).`);
  syncHUD();
}

function loop() { render(); requestAnimationFrame(loop); }

function render() {
  const ctx = Game.ctx, w = Game.canvas.width, h = Game.canvas.height;
  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, w, h);
  drawTerritories(ctx, Game.world);
  drawUnits(ctx, Game.world);
  drawSelection(ctx, Game.world);
}

function drawBackground(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(20,34,60,0.95)");
  g.addColorStop(1, "rgba(8,12,20,0.95)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawTerritories(ctx, world) {
  for (const t of world.territories) {
    const r = t.rect;
    const owner = getFaction(world, t.owner);

    ctx.fillStyle = owner ? withAlpha(owner.color, 0.18) : "rgba(255,255,255,0.04)";
    roundRect(ctx, r.x, r.y, r.w, r.h, 14, true, false);

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    roundRect(ctx, r.x, r.y, r.w, r.h, 14, false, true);

    ctx.fillStyle = "rgba(231,238,252,0.75)";
    ctx.font = "12px system-ui";
    ctx.fillText(shortName(t.name), r.x + 10, r.y + 18);

    ctx.fillStyle = "rgba(231,238,252,0.55)";
    ctx.font = "11px system-ui";
    ctx.fillText(`P${t.population} I${t.industry} R${t.resources}`, r.x + 10, r.y + r.h - 10);
  }
}

function drawUnits(ctx, world) {
  for (const u of world.units) {
    const t = getTerritory(world, u.territoryId);
    if (!t) continue;
    const f = getFaction(world, u.factionId);
    const r = t.rect;

    const cx = r.x + r.w - 18, cy = r.y + 18;
    ctx.fillStyle = f ? f.color : "#ffffff";
    ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.font = "10px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(u.factionId, cx, cy + 0.5);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }
}

function drawSelection(ctx, world) {
  const t = getTerritory(world, Game.selectedTerritoryId);
  if (!t) return;
  const r = t.rect;
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  roundRect(ctx, r.x - 2, r.y - 2, r.w + 4, r.h + 4, 16, false, true);
}

function selectTerritory(id) {
  Game.selectedTerritoryId = id;
  const t = getTerritory(Game.world, id);
  if (!t) return;

  const owner = t.owner ? getFaction(Game.world, t.owner)?.name : "Unclaimed";
  const unit = t.unitId ? getUnit(Game.world, t.unitId) : null;
  const unitInfo = unit ? ` Unit: ${unit.type} (${unit.factionId})` : " Unit: none";
  document.getElementById("selectedLabel").textContent = `${t.name} — ${owner}.${unitInfo}`;
}

function endTurn() {
  Game.activeFactionIndex = (Game.activeFactionIndex + 1) % Game.world.factions.length;
  if (Game.activeFactionIndex === 0) Game.turn += 1;
  syncHUD();
  const active = Game.world.factions[Game.activeFactionIndex];
  logLine(`Turn ${Game.turn}: Active faction is ${active.id} (${active.name}).`);
}

function syncHUD() {
  document.getElementById("turnLabel").textContent = String(Game.turn);
  const active = Game.world.factions[Game.activeFactionIndex];
  document.getElementById("activeFactionLabel").textContent = `${active.id} — ${active.name}`;
  if (!Game.selectedTerritoryId) document.getElementById("selectedLabel").textContent = "—";
}

function rebuildFactionPanel() {
  const host = document.getElementById("factionList");
  host.innerHTML = "";
  for (const f of Game.world.factions) {
    const row = document.createElement("div");
    row.className = "factionRow";

    const sw = document.createElement("div");
    sw.className = "swatch";
    sw.style.background = f.color;

    const meta = document.createElement("div");
    meta.className = "factionMeta";
    meta.innerHTML = `<div><strong>${f.id}</strong> — ${escapeHtml(f.name)}</div>
                      <div class="small">Rule hook: ${escapeHtml(f.rule)}</div>`;

    row.appendChild(sw);
    row.appendChild(meta);
    host.appendChild(row);
  }
}

function logLine(text) {
  const log = document.getElementById("log");
  const div = document.createElement("div");
  div.className = "logLine";
  div.textContent = text;
  log.prepend(div);
}

function getTerritory(world, id) { return id ? (world.territories.find(t => t.id === id) || null) : null; }
function getFaction(world, id) { return id ? (world.factions.find(f => f.id === id) || null) : null; }
function getUnit(world, id) { return id ? (world.units.find(u => u.id === id) || null) : null; }

function canvasPointFromEvent(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}

function shortName(name) { return name.replace("Territory ", "T"); }

function withAlpha(hex, a) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function escapeHtml(s) {
  return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
