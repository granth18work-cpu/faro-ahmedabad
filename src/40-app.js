/* ================= APP ================= */
const ui = {
  loader: $('loader'), intro: $('intro'), scrim: $('scrim'), creator: $('creator'), hud: $('hud'), prompt: $('prompt'),
  promptName: $('promptName'), promptSub: $('promptSub'), hint: $('hint'), joy: $('joy'), knob: $('joyKnob'),
  shopSheet: $('shopSheet'), dirSheet: $('dirSheet'), toast: $('toast'), fade: $('fade'), map: $('map'),
  groupSheet: $('groupSheet'), groupDot: $('groupDot'), react: $('react'), reactTray: $('reactTray'), reactBtn: $('reactBtn'), inviteNote: $('inviteNote'),
  rideHud: $('rideHud'), rideSpeed: $('rideSpeed'), rideBtn: $('rideBtn'), rideSheet: $('rideSheet'),
};
const STORE_KEY = 'faro-gurukul-avatar-v2';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const WALK = 3.0, RUN = 6.4;

let state = 'loading', clock = 0, last = 0, camTween = null, traveling = false, mapTick = 0;
let cfg = { outfit: 'casual', primary: '#3a3a3d', accent: '#a8884e', skin: SKIN[2], hair: 'short' };
let name = '';
const player = { pos: SPAWN.clone(), vel: new THREE.Vector2(), heading: 0, turnTo: null, speed: 0, y: 0, av: null, rig: null, tag: null, ride: null };
const cam = { yaw: 0, pitch: 0.32, dist: 5.2, yawT: 0, pitchT: 0.32, distT: 5.2, cur: 5.2, target: new THREE.Vector3(), lastDrag: -10 };
const near = { shop: null, inside: false };
const spin = { a: 0 };
const currentLook = new THREE.Vector3(0, 3, -30);
const npcs = [];
let keeper = null, keeperShop = null;

/* ---------- storage (per viewer, optional) ---------- */
const loadSaved = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { return null; } };
const saveAvatar = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify({ cfg, name })); } catch { /* storage blocked */ } };

/* ---------- toast ---------- */
let toastT;
function toast(msg) { ui.toast.textContent = msg; ui.toast.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => ui.toast.classList.remove('show'), 2800); }

/* ---------- player avatar and name tag ---------- */
function makeTag(text, ring) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 112; const g = c.getContext('2d');
  g.font = '600 50px "Hind Vadodara", system-ui, sans-serif';
  const w = Math.min(496, g.measureText(text).width + 64);
  g.fillStyle = 'rgba(20,20,22,.78)'; g.beginPath();
  if (g.roundRect) g.roundRect((512 - w) / 2, 12, w, 88, 44); else g.rect((512 - w) / 2, 12, w, 88);
  g.fill(); if (ring) { g.strokeStyle = ring; g.lineWidth = 6; g.stroke(); } g.fillStyle = '#f2efe8'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 60);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(c), transparent: true, depthWrite: false }));
  s.scale.set(1.0, 0.22, 1); s.position.y = 2.22; s.renderOrder = 10; return s;
}
function updateTag() {
  if (player.tag) { player.tag.material.map.dispose(); player.tag.material.dispose(); player.tag.removeFromParent(); }
  player.tag = makeTag(name.trim() || 'You'); player.av.root.add(player.tag); player.tag.visible = state === 'play';
  groupAnnounce();
}
function setPlayerAvatar() {
  if (player.av) disposeAvatar(player.av);
  player.av = buildAvatar(cfg); player.rig = new Rig(player.av);
  scene.add(player.av.root); updateTag();
}
function randomCfg() {
  const outfit = pick(['casual', 'casual', 'kurti', 'kurti', 'kurta', 'saree', 'casual', 'chaniya', 'kurti', 'sherwani']);
  const fem = outfit === 'chaniya' || outfit === 'saree' || outfit === 'kurti';
  return { outfit, primary: pick(PRIMARY)[1], accent: pick(ACCENT)[1], skin: pick(SKIN), hair: fem ? pick(['long', 'bun', 'braid', 'braid']) : pick(['short', 'short', 'curly', outfit === 'sherwani' ? 'safo' : 'short']) };
}

/* ---------- people on the street ---------- */
function spawnNPCs() {
  const n = isTouch ? 8 : 14;
  for (let i = 0; i < n; i++) {
    const av = bakeRig(buildAvatar(randomCfg())), side = i % 2 ? 1 : -1;
    const npc = { av, rig: new Rig(av), side, x: side * rr(8.6, 9.7), z: rr(-212, -6), dir: rnd() < 0.5 ? -1 : 1, speed: rr(1.1, 1.6), pause: 0, heading: 0 };
    npc.heading = npc.dir > 0 ? 0 : Math.PI;
    scene.add(av.root); npcs.push(npc);
  }
}
function updateNPCs(dt) {
  for (const n of npcs) {
    let v = 0, target;
    if (n.pause > 0) { n.pause -= dt; target = n.side > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else {
      const dx = player.pos.x - n.x, dz = player.pos.z - n.z;
      const blocked = state === 'play' && dx * dx + dz * dz < 1.4 && Math.sign(dz) === n.dir;
      v = blocked ? 0 : n.speed;
      n.z += n.dir * v * dt;
      if (n.z < -214) n.dir = 1; if (n.z > -4) n.dir = -1;
      if (rnd() < dt * 0.05) n.pause = rr(2.5, 5);
      target = n.dir > 0 ? 0 : Math.PI;
    }
    n.heading += angleDiff(n.heading, target) * (1 - Math.exp(-6 * dt));
    n.av.root.position.set(n.x, 0.16, n.z); n.av.root.rotation.y = n.heading;
    n.rig.update(dt, v);
  }
}
function initKeeper() {
  const av = bakeRig(buildAvatar({ outfit: 'kurta', primary: '#efe6d2', accent: '#6e1b2c', skin: SKIN[3], hair: 'short' }));
  keeper = { av, rig: new Rig(av) }; scene.add(av.root);
}
function moveKeeper(shop) {
  keeperShop = shop;
  keeper.av.root.position.copy(shop.keeper); keeper.av.root.rotation.y = shop.rot;
  shopLight.position.set(0, 3.6, -4.6).applyMatrix4(shop.base);
}

/* ---------- where am I ---------- */
const _l = new THREE.Vector3();
function shopAt(x, z) {
  let best = null, bestD = 1e9, inside = false;
  for (const s of SHOPS) {
    _l.set(x, 0, z).applyMatrix4(s.inv);
    if (Math.abs(_l.x) < W / 2 - 0.2 && _l.z > -D && _l.z < 4.0) { const d = Math.max(0, _l.z); if (d < bestD) { bestD = d; best = s; inside = _l.z < 0; } }
  }
  return { shop: best, inside };
}
function insideShop(p) { for (const s of SHOPS) { _l.copy(p).applyMatrix4(s.inv); if (Math.abs(_l.x) < W / 2 && _l.z > -D && _l.z < 0.1) return true; } return false; }
function groundAt(x, z) {
  if (Math.hypot(x - LIGHTHOUSE.x, z - LIGHTHOUSE.z) < 4.6 || Math.hypot(x - ENTRY_RB.x, z - ENTRY_RB.z) < 5) return 0.32;
  if (z > STREET_END && z < 26 && Math.abs(x) > 6.1) return Math.abs(x) > 10.4 ? 0.2 : 0.16;
  return 0;
}
function updateNear(force) {
  const r = shopAt(player.pos.x, player.pos.z);
  if (!force && r.shop === near.shop && r.inside === near.inside) return;
  const entered = r.shop && r.inside && !(near.inside && near.shop === r.shop);
  near.shop = r.shop; near.inside = r.inside;
  if (r.shop && r.shop !== keeperShop) moveKeeper(r.shop);
  if (entered) keeper.rig.hello();
  renderPrompt();
}
let promptMode = 'shop';
function renderPrompt() {
  const s = near.shop, rv = nearRide;
  const blocked = state !== 'play' || !!player.ride || [ui.shopSheet, ui.dirSheet, ui.groupSheet, ui.rideSheet].some((el) => el.classList.contains('open'));
  if (blocked || (!s && !rv)) { ui.prompt.hidden = true; return; }
  ui.prompt.hidden = false;
  if (rv && !(s && near.inside)) {
    promptMode = 'ride';
    ui.promptName.textContent = `${rv.type === 'bike' ? 'Motorbike' : 'Scooter'} · ${PAINTS[rv.paintIdx][0]}`;
    ui.promptSub.textContent = 'Faro Rides · free to ride on Gurukul';
    $('promptBtn').innerHTML = 'Ride <kbd class="wide">R</kbd>';
  } else {
    promptMode = 'shop';
    ui.promptName.textContent = s.name;
    ui.promptSub.textContent = (near.inside ? 'You are inside · ' : '') + CATS[s.cat].label + ' · ' + rupee(s.price[0]) + ' to ' + rupee(s.price[1]);
    $('promptBtn').innerHTML = 'View shop <kbd class="wide">E</kbd>';
  }
}

/* ---------- collisions ---------- */
function collide(p, r, veh = false, dyn = true) {
  for (let it = 0; it < 2; it++) for (const c of colliders) {
    if (!(c.solid || (veh && c.vehicle)) || p.x < c.x0 - r || p.x > c.x1 + r || p.z < c.z0 - r || p.z > c.z1 + r) continue;
    const cx = clamp(p.x, c.x0, c.x1), cz = clamp(p.z, c.z0, c.z1), dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-9) { const d = Math.sqrt(d2), k = (r - d) / d; p.x += dx * k; p.z += dz * k; }
    else {
      const l = p.x - c.x0, rg = c.x1 - p.x, b = p.z - c.z0, f = c.z1 - p.z, mn = Math.min(l, rg, b, f);
      if (mn === l) p.x = c.x0 - r; else if (mn === rg) p.x = c.x1 + r; else if (mn === b) p.z = c.z0 - r; else p.z = c.z1 + r;
    }
  }
  if (dyn) collideDynamic(p, r);
  p.z = clamp(p.z, ROAD_Z1 + 0.6, ROAD_Z0 - 0.6); p.x = clamp(p.x, -21, 21);
}
/* people and moving vehicles nudge you aside rather than stopping you dead */
function collideDynamic(p, r) {
  for (const n of npcs) {
    const dx = p.x - n.x, dz = p.z - n.z, d2 = dx * dx + dz * dz, R = r + 0.3;
    if (d2 < R * R && d2 > 1e-6) { const d = Math.sqrt(d2); p.x += dx / d * (R - d); p.z += dz / d * (R - d); }
  }
  for (const v of traffic) {
    const dx = p.x - v.pos.x, dz = p.z - v.pos.z, d2 = dx * dx + dz * dz, R = r + v.radius;
    if (d2 < R * R && d2 > 1e-6) { const d = Math.sqrt(d2); p.x += dx / d * (R - d); p.z += dz / d * (R - d); }
  }
  for (const v of rideables) {
    if (v === player.ride) continue;
    const dx = p.x - v.pos.x, dz = p.z - v.pos.z, d2 = dx * dx + dz * dz, R = r + 0.42;
    if (d2 < R * R && d2 > 1e-6) { const d = Math.sqrt(d2); p.x += dx / d * (R - d); p.z += dz / d * (R - d); }
  }
}
const _obs = [];
function obstacles() {
  _obs.length = 0;
  if (state === 'play') _obs.push({ x: player.pos.x, z: player.pos.z, r: player.ride ? 0.7 : 0.4 });
  for (const p of group.peers.values()) if (p.seen) _obs.push({ x: p.x, z: p.z, r: 0.5 });
  for (const v of rideables) if (!v.rider && Math.abs(v.pos.x) < 6) _obs.push({ x: v.pos.x, z: v.pos.z, r: 0.5 });
  return _obs;
}
function rayHit(ax, ay, az, bx2, by, bz) {
  let tMin = 1; const dx = bx2 - ax, dz = bz - az;
  for (const c of colliders) {
    if (!c.cam) continue;
    let t0 = 0, t1 = 1;
    if (Math.abs(dx) < 1e-9) { if (ax < c.x0 || ax > c.x1) continue; } else { let ta = (c.x0 - ax) / dx, tb = (c.x1 - ax) / dx; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); }
    if (Math.abs(dz) < 1e-9) { if (az < c.z0 || az > c.z1) continue; } else { let ta = (c.z0 - az) / dz, tb = (c.z1 - az) / dz; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); }
    if (t0 > t1 || t0 <= 0 || t0 >= tMin) continue;
    const y0 = ay + (by - ay) * t0, y1 = ay + (by - ay) * t1;
    if (Math.max(y0, y1) < c.y0 || Math.min(y0, y1) > c.y1) continue;
    tMin = t0;
  }
  return tMin;
}

/* ---------- input ---------- */
const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') { if (e.key === 'Escape') e.target.blur(); return; }
  const k = e.key.toLowerCase();
  if (state === 'play' && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  keys.add(k);
  if (state !== 'play' || e.repeat) return;
  if ((k === 'e' || k === 'enter') && near.shop && !player.ride && document.activeElement?.tagName !== 'BUTTON') openShop(near.shop);
  if (k === 'r') { if (player.ride) dismount(); else if (nearRide) mount(nearRide); else openRideSheet(); }
  if (k === 'h' && player.ride) honk();
  if (k === 'f') openDirectory();
  if (k === 'g') openGroup();
  if (group.room && /^[1-5]$/.test(k)) sendReaction(Number(k) - 1);
  if (k === 'escape') { closeSheets(); toggleTray(false); }
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
document.addEventListener('visibilitychange', () => keys.clear());

const pointers = new Map(); let pinch0 = 0, dist0 = 0;
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch' && joy.id === e.pointerId) return;
  canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); canvas.classList.add('dragging');
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); dist0 = cam.distT; }
});
canvas.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (pointers.size === 2) { const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0 && d) cam.distT = clamp(dist0 * pinch0 / d, 2.4, 9); return; }
  if (state === 'creator') { spin.a += dx * 0.012; return; }
  cam.yawT -= dx * 0.0055; cam.pitchT = clamp(cam.pitchT + dy * 0.0045, 0.06, 1.15); cam.lastDrag = clock;
});
const endPointer = (e) => { pointers.delete(e.pointerId); pinch0 = 0; if (!pointers.size) canvas.classList.remove('dragging'); };
canvas.addEventListener('pointerup', endPointer); canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('wheel', (e) => { e.preventDefault(); if (state === 'play') cam.distT = clamp(cam.distT * (1 + Math.sign(e.deltaY) * 0.1), 2.4, 9); }, { passive: false });

const joy = { x: 0, y: 0, id: null, cx: 0, cy: 0 };
function moveJoy(e) {
  let dx = e.clientX - joy.cx, dy = e.clientY - joy.cy; const R = 46, d = Math.hypot(dx, dy);
  if (d > R) { dx *= R / d; dy *= R / d; }
  joy.x = dx / R; joy.y = dy / R; ui.knob.style.transform = `translate(${dx}px, ${dy}px)`;
}
ui.joy.addEventListener('pointerdown', (e) => {
  e.preventDefault(); const r = ui.joy.getBoundingClientRect();
  joy.id = e.pointerId; joy.cx = r.left + r.width / 2; joy.cy = r.top + r.height / 2; ui.joy.setPointerCapture(e.pointerId); moveJoy(e);
});
ui.joy.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) moveJoy(e); });
const endJoy = (e) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; ui.knob.style.transform = ''; };
ui.joy.addEventListener('pointerup', endJoy); ui.joy.addEventListener('pointercancel', endJoy);

/* ---------- movement ---------- */
let hintAt = 0;
function updatePlayer(dt) {
  if (player.ride) { updateRide(dt); return; }
  let ix = 0, iz = 0;
  if (keys.has('w') || keys.has('arrowup')) iz += 1;
  if (keys.has('s') || keys.has('arrowdown')) iz -= 1;
  if (keys.has('a') || keys.has('arrowleft')) ix -= 1;
  if (keys.has('d') || keys.has('arrowright')) ix += 1;
  let mag = Math.hypot(ix, iz); if (mag > 1) { ix /= mag; iz /= mag; mag = 1; }
  let run = keys.has('shift');
  if (joy.id !== null) { ix = joy.x; iz = -joy.y; mag = Math.min(1, Math.hypot(ix, iz)); run = mag > 0.92; }
  let sp = (run ? RUN : WALK) * mag, fwd = iz;
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  let mx = fx * iz + rx * ix, mz = fz * iz + rz * ix; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
  /* following a friend: walk after them until you are beside them; any manual input stops it */
  if (sp > 0.1) { if (group.follow) stopFollow(); }
  else {
    const f = followTarget();
    if (f) { const dx = f.x - player.pos.x, dz = f.z - player.pos.z, d = Math.hypot(dx, dz); if (d > 1.9) { mx = dx / d; mz = dz / d; sp = d > 7 ? RUN : WALK; fwd = 1; } }
  }
  player.vel.x = damp(player.vel.x, mx * sp, 9, dt); player.vel.y = damp(player.vel.y, mz * sp, 9, dt);
  player.pos.x += player.vel.x * dt; player.pos.z += player.vel.y * dt;
  collide(player.pos, 0.34);
  player.speed = Math.hypot(player.vel.x, player.vel.y);
  if (sp > 0.1) { player.turnTo = null; player.heading += angleDiff(player.heading, Math.atan2(mx, mz)) * (1 - Math.exp(-12 * dt)); }
  else if (player.turnTo !== null) { const d = angleDiff(player.heading, player.turnTo); player.heading += d * (1 - Math.exp(-5 * dt)); if (Math.abs(d) < 0.01) player.turnTo = null; }
  player.y = damp(player.y, groundAt(player.pos.x, player.pos.z), 18, dt);
  if (sp > 0.1 && clock - hintAt > 2.5) dismissHint();
  if (clock - cam.lastDrag > 1.2 && sp > 0.1 && fwd > 0.2) cam.yawT += angleDiff(cam.yawT, player.heading + Math.PI) * (1 - Math.exp(-1.1 * dt * fwd));
}

/* ---------- riding a scooter or motorbike ---------- */
let nearRide = null, rideChoice = { type: 'scooter', paint: 0 };
const _up = new THREE.Vector3(0, 1, 0), _nose = new THREE.Vector3();
function updateNearRide() {
  const n = player.ride || state !== 'play' ? null : nearestRideable(player.pos);
  if (n !== nearRide) { nearRide = n; renderPrompt(); }
}
function mount(v) {
  if (!v || v.rider || traveling) return;
  closeSheets();
  player.ride = v; v.rider = 'me'; v.speed = 0; v.steer = 0; v.lean = 0;
  player.pos.set(v.pos.x, 0, v.pos.z); player.heading = v.heading; player.vel.set(0, 0); player.turnTo = null;
  v.root.add(player.av.root);
  player.av.root.position.set(0, v.spec.seat.y + 0.07 - player.av.hipY, v.spec.seat.z); player.av.root.rotation.set(0, 0, 0);
  cam.yawT = v.heading + Math.PI; cam.lastDrag = -10;
  Sound.start(v.type);
  ui.rideHud.hidden = false; ui.rideBtn.hidden = true; nearRide = null; renderPrompt(); dismissHint();
  toast(isTouch ? 'Push the joystick up to go, down to brake, sideways to steer.' : 'W to go · S to brake · A and D to steer · H to honk');
}
function dismount(silent) {
  const v = player.ride; if (!v) return;
  player.ride = null; v.rider = null; v.speed = 0; v.steer = 0;
  scene.add(player.av.root);
  const off = new THREE.Vector3(0.85, 0, -0.1).applyAxisAngle(_up, v.heading);
  player.pos.set(v.pos.x + off.x, 0, v.pos.z + off.z); collide(player.pos, 0.34);
  player.heading = v.heading; player.y = groundAt(player.pos.x, player.pos.z); player.speed = 0;
  v.pos.y = groundAt(v.pos.x, v.pos.z); v.root.position.copy(v.pos); v.root.rotation.set(0, v.heading, -0.12);
  if (v.front) v.front.rotation.y = 0.35;
  Sound.stop(); ui.rideHud.hidden = true; ui.rideBtn.hidden = false;
  if (!silent) toast('Parked. Walk back to it and press R to ride again.');
  renderPrompt();
}
function honk() { if (player.ride) Sound.horn(null, player.ride.type === 'bike' ? 380 : 470); }
function pushPoint(cx, cz, ox, oz, r) {
  _nose.set(cx + ox, 0, cz + oz); const x0 = _nose.x, z0 = _nose.z;
  collide(_nose, r, true, false); return [_nose.x - x0, _nose.z - z0];
}
function updateRide(dt) {
  const v = player.ride, S = v.spec;
  let thr = 0, steer = 0;
  if (keys.has('w') || keys.has('arrowup')) thr += 1;
  if (keys.has('s') || keys.has('arrowdown')) thr -= 1;
  if (keys.has('a') || keys.has('arrowleft')) steer += 1;
  if (keys.has('d') || keys.has('arrowright')) steer -= 1;
  if (joy.id !== null) { thr = clamp(-joy.y * 1.25, -1, 1); steer = clamp(-joy.x * 1.2, -1, 1); }
  v.steer = damp(v.steer, steer, 6, dt);
  if (thr > 0) v.speed += thr * S.acc * (1 - Math.max(0, v.speed) / S.maxV) * dt;
  else if (thr < 0) { if (v.speed > 0.3) v.speed -= 9 * -thr * dt; else v.speed = Math.max(-2, v.speed - 2.5 * -thr * dt); }
  else v.speed -= Math.sign(v.speed) * Math.min(Math.abs(v.speed), (0.9 + Math.abs(v.speed) * 0.08) * dt);
  const sp = v.speed, grip = clamp(Math.abs(sp) / 1.5, 0, 1);
  const yawRate = v.steer * grip * 1.9 / (1 + Math.abs(sp) * 0.09) * (sp < 0 ? -1 : 1);
  v.heading += yawRate * dt;
  v.lean = damp(v.lean, clamp(-yawRate * sp * 0.075, -0.55, 0.55), 5, dt);
  const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
  player.pos.x += fx * sp * dt; player.pos.z += fz * sp * dt;
  const x0 = player.pos.x, z0 = player.pos.z;
  collide(player.pos, S.half + 0.1, true, false);
  for (const k of [S.len * 0.8, -S.len * 0.8]) { const [dx, dz] = pushPoint(player.pos.x, player.pos.z, fx * k, fz * k, 0.3); player.pos.x += dx; player.pos.z += dz; }
  const pushed = Math.hypot(player.pos.x - x0, player.pos.z - z0);
  if (pushed > 0.015 && Math.abs(v.speed) > 1.5) v.speed *= 0.3;
  collideDynamic(player.pos, S.half);
  player.heading = v.heading; player.speed = Math.abs(sp);
  player.y = damp(player.y, groundAt(player.pos.x, player.pos.z), 14, dt);
  v.pos.set(player.pos.x, player.y, player.pos.z);
  v.root.position.copy(v.pos); v.root.rotation.set(0, v.heading, v.lean);
  if (v.wheelF) { const w = (sp / S.R) * dt; v.wheelF.rotation.x += w; v.wheelR.rotation.x += w; v.front.rotation.y = v.steer * 0.38 * (1 - clamp(Math.abs(sp) / 16, 0, 0.7)); }
  Sound.update(Math.abs(sp), Math.max(0, thr));
  ui.rideSpeed.textContent = Math.round(Math.abs(sp) * 3.6);
  if (Math.abs(sp) > 0.5 && clock - hintAt > 2.5) dismissHint();
}
/* the Ride panel: pick a scooter or motorbike and a colour, and it comes to you */
function openRideSheet() {
  ui.shopSheet.classList.remove('open'); ui.dirSheet.classList.remove('open'); ui.groupSheet.classList.remove('open');
  renderRideSheet(); ui.rideSheet.classList.add('open'); renderPrompt();
}
function renderRideSheet() {
  const types = [['scooter', 'Scooter', 'Easy, up to 45 km/h'], ['bike', 'Motorbike', 'Quicker, up to 57 km/h']];
  ui.rideSheet.innerHTML = `<header class="sheet-head"><p class="eyebrow">Faro Rides</p><h2>Take a ride</h2><button class="btn icon close" data-act="close" aria-label="Close">✕</button></header>
  <div class="sheet-body">
    <p style="margin:0;color:var(--chalk-2)">Ride up and down Gurukul and round both roundabouts. Traffic keeps left, like the real road.</p>
    <div class="group"><div class="group-label">Vehicle</div><div class="opts">${types.map(([id, l, sub]) => `<button class="opt" data-type="${id}" aria-pressed="${rideChoice.type === id}">${l}<small>${sub}</small></button>`).join('')}</div></div>
    <div class="group"><div class="group-label">Colour <output>${PAINTS[rideChoice.paint][0]}</output></div><div class="swatches">${PAINTS.map(([n, c], i) => `<button class="sw" data-paint="${i}" style="--c:${c}" aria-label="${n}" title="${n}" aria-pressed="${rideChoice.paint === i}"></button>`).join('')}</div></div>
    <p class="note">${isTouch ? 'Joystick up to go, down to brake, sideways to steer.' : 'W to go · S to brake · A and D to steer · H to honk · R to get off.'}</p>
  </div>
  <footer class="sheet-foot"><button class="btn primary" data-act="go">Bring it here</button></footer>`;
}
ui.rideSheet.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.type) { rideChoice.type = b.dataset.type; renderRideSheet(); }
  if (b.dataset.paint) { rideChoice.paint = +b.dataset.paint; renderRideSheet(); }
  if (b.dataset.act === 'close') closeSheets();
  if (b.dataset.act === 'go') summonRide();
});
function summonRide() {
  const pool = rideables.filter((v) => !v.rider && v.type === rideChoice.type);
  const v = pool.sort((a, c) => Math.hypot(a.pos.x - player.pos.x, a.pos.z - player.pos.z) - Math.hypot(c.pos.x - player.pos.x, c.pos.z - player.pos.z))[0];
  if (!v || traveling) return;
  closeSheets(); traveling = true; ui.fade.classList.add('on');
  setTimeout(() => {
    repaint(v, rideChoice.paint);
    const h = player.heading, side = new THREE.Vector3(-0.85, 0, 0.1).applyAxisAngle(_up, h);
    v.pos.set(player.pos.x + side.x, 0, player.pos.z + side.z); collide(v.pos, 0.5, true); v.pos.y = groundAt(v.pos.x, v.pos.z);
    v.heading = h; v.root.position.copy(v.pos); v.root.rotation.set(0, h, 0);
    traveling = false; mount(v);
    setTimeout(() => ui.fade.classList.remove('on'), 120);
  }, 300);
}
ui.rideBtn.addEventListener('click', () => { if (nearRide) mount(nearRide); else openRideSheet(); });
$('offBtn').addEventListener('click', () => dismount());
$('hornBtn').addEventListener('click', honk);
$('muteBtn').addEventListener('click', (e) => { const m = Sound.toggleMute(); e.currentTarget.textContent = m ? 'Sound off' : 'Sound on'; e.currentTarget.setAttribute('aria-pressed', String(!m)); });

/* ---------- cameras ---------- */
const camPos = new THREE.Vector3(), lookPos = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
function updateCamera(dt) {
  if (state === 'intro' || state === 'loading') {
    const t = clock * (reduceMotion ? 0.015 : 0.05);
    camera.position.set(Math.sin(t * 1.3) * 2.2, 5.2 + Math.sin(t) * 0.6, 22 - (1 - Math.cos(t)) * 26);
    currentLook.set(0, 3.2, camera.position.z - 40); camera.lookAt(currentLook); return;
  }
  if (state === 'creator') {
    const narrow = innerWidth <= 720, h = player.heading, fx = Math.sin(h), fz = Math.cos(h);
    const dist = narrow ? 5.3 : 3.0, side = narrow ? 0 : 0.62, p = player.pos;
    _a.set(p.x + fx * dist, player.y + (narrow ? 1.95 : 1.32), p.z + fz * dist);
    _b.set(p.x + fz * side, player.y + (narrow ? -1.1 : 1.08), p.z - fx * side);
    const k = 1 - Math.exp(-4.5 * dt);
    camera.position.lerp(_a, k); currentLook.lerp(_b, k); camera.lookAt(currentLook); return;
  }
  const rv = player.ride;
  if (rv && clock - cam.lastDrag > 1.4) cam.yawT += angleDiff(cam.yawT, rv.heading + Math.PI) * (1 - Math.exp(-3.2 * dt));
  cam.yaw += angleDiff(cam.yaw, cam.yawT) * (1 - Math.exp(-14 * dt));
  cam.pitch = damp(cam.pitch, rv ? Math.min(cam.pitchT, 0.3) : cam.pitchT, 14, dt);
  const tgt = cam.target;
  tgt.x = damp(tgt.x, player.pos.x, rv ? 20 : 14, dt); tgt.y = damp(tgt.y, player.y + (rv ? 1.55 : 1.45), 10, dt); tgt.z = damp(tgt.z, player.pos.z, rv ? 20 : 14, dt);
  const wantFov = (camera.aspect < 0.8 ? 66 : 55) + (rv ? Math.min(9, Math.abs(rv.speed) * 0.6) : 0);
  if (Math.abs(camera.fov - wantFov) > 0.05) { camera.fov = damp(camera.fov, wantFov, 3, dt); camera.updateProjectionMatrix(); }
  const maxD = near.inside && !rv ? Math.min(cam.distT, 3.4) : rv ? Math.max(cam.distT, 6.2) : cam.distT, pitch = near.inside && !rv ? Math.min(cam.pitch, 0.42) : cam.pitch;
  const cp = Math.cos(pitch), ox = Math.sin(cam.yaw) * cp, oy = Math.sin(pitch), oz = Math.cos(cam.yaw) * cp;
  const t = rayHit(tgt.x, tgt.y, tgt.z, tgt.x + ox * maxD, tgt.y + oy * maxD, tgt.z + oz * maxD);
  const want = Math.max(0.8, t * maxD - 0.3);
  cam.cur = want < cam.cur ? want : damp(cam.cur, want, 4, dt);
  camPos.set(tgt.x + ox * cam.cur, tgt.y + oy * cam.cur, tgt.z + oz * cam.cur);
  if (insideShop(camPos)) camPos.y = Math.min(camPos.y, H1 - 0.35);
  camPos.y = Math.max(camPos.y, groundAt(camPos.x, camPos.z) + 0.3);
  lookPos.set(tgt.x, tgt.y + 0.1, tgt.z);
  if (camTween) {
    camTween.t += dt; const e = ease(Math.min(1, camTween.t / camTween.dur));
    camera.position.lerpVectors(camTween.from, camPos, e); currentLook.lerpVectors(camTween.look, lookPos, e);
    if (e >= 1) camTween = null;
  } else { camera.position.copy(camPos); currentLook.copy(lookPos); }
  camera.lookAt(currentLook);
}

/* ---------- flow: intro → creator → street ---------- */
function showIntro() { state = 'intro'; ui.intro.hidden = false; ui.scrim.classList.remove('off'); ui.hud.hidden = true; }
function openCreator() {
  const first = state === 'intro';
  if (player.ride) dismount(true);
  state = 'creator'; closeSheets();
  ui.intro.hidden = true; ui.scrim.classList.add('off'); ui.hud.hidden = true; ui.creator.hidden = false;
  if (first) { player.pos.copy(SPAWN); player.heading = 0; player.y = 0; }
  player.vel.set(0, 0); player.turnTo = null; spin.a = 0; if (player.tag) player.tag.visible = false;
  syncCreator();
}
function enterStreet(instant = false) {
  const first = player.pos.distanceTo(SPAWN) < 0.5;
  player.heading += spin.a; spin.a = 0;
  state = 'play'; ui.creator.hidden = true; ui.intro.hidden = true; ui.scrim.classList.add('off'); ui.hud.hidden = false;
  saveAvatar();
  if (first) player.turnTo = Math.PI;
  const face = first ? Math.PI : player.heading;
  cam.yaw = cam.yawT = face + Math.PI; cam.pitch = cam.pitchT = 0.32; cam.distT = cam.cur = 5.2;
  cam.target.set(player.pos.x, player.y + 1.45, player.pos.z);
  camTween = instant ? null : { from: camera.position.clone(), look: currentLook.clone(), t: 0, dur: 1.5 };
  player.tag.visible = true; if (!instant) player.rig.hello();
  updateNear(true); showHint(); canvas.focus({ preventScroll: true });
  onEnteredStreet();
}
function showHint() {
  ui.hint.innerHTML = isTouch ? 'Use the <b>joystick</b> to walk · <b>drag</b> to look · tap <b>Ride</b> for a scooter' : '<b>W A S D</b> to walk · <b>Shift</b> to run · <b>drag</b> to look · <b>E</b> at a shop · <b>R</b> to ride';
  ui.hint.classList.remove('off'); ui.hint.hidden = false; hintAt = clock;
  setTimeout(dismissHint, 9000);
}
function dismissHint() { ui.hint.classList.add('off'); }

/* ---------- creator panel ---------- */
const CREATOR_GROUPS = [['optOutfit', 'outfit'], ['optPrimary', 'primary'], ['optAccent', 'accent'], ['optSkin', 'skin'], ['optHair', 'hair']];
function buildCreatorUI() {
  $('optOutfit').innerHTML = OUTFITS.map((o) => `<button class="opt" data-v="${o.id}" aria-pressed="false">${o.label}<small>${o.sub}</small></button>`).join('');
  $('optPrimary').innerHTML = PRIMARY.map(([n, c]) => `<button class="sw" data-v="${c}" style="--c:${c}" title="${n}" aria-label="${n}" aria-pressed="false"></button>`).join('');
  $('optAccent').innerHTML = ACCENT.map(([n, c]) => `<button class="sw" data-v="${c}" style="--c:${c}" title="${n}" aria-label="${n}" aria-pressed="false"></button>`).join('');
  $('optSkin').innerHTML = SKIN.map((c, i) => `<button class="sw" data-v="${c}" style="--c:${c}" aria-label="Skin tone ${i + 1}" aria-pressed="false"></button>`).join('');
  $('optHair').innerHTML = HAIR.map(([v, n]) => `<button class="opt" data-v="${v}" aria-pressed="false">${n}</button>`).join('');
  for (const [id, key] of CREATOR_GROUPS) $(id).addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || cfg[key] === b.dataset.v) return;
    cfg[key] = b.dataset.v; syncCreator(); setPlayerAvatar();
  });
  $('nameInput').addEventListener('input', (e) => { name = e.target.value; updateTag(); });
  $('shuffleBtn').addEventListener('click', () => { cfg = randomCfg(); syncCreator(); setPlayerAvatar(); player.rig.hello(); });
  $('enterBtn').addEventListener('click', () => enterStreet());
}
function syncCreator() {
  for (const [id, key] of CREATOR_GROUPS) $(id).querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === cfg[key])));
  $('outfitOut').textContent = OUTFITS.find((o) => o.id === cfg.outfit)?.label ?? '';
  $('primaryOut').textContent = PRIMARY.find((p) => p[1] === cfg.primary)?.[0] ?? '';
  $('accentOut').textContent = ACCENT.find((p) => p[1] === cfg.accent)?.[0] ?? '';
  $('hairOut').textContent = HAIR.find((h) => h[0] === cfg.hair)?.[1] ?? '';
}

/* ---------- shop details ---------- */
function closeSheets() { ui.shopSheet.classList.remove('open'); ui.dirSheet.classList.remove('open'); ui.groupSheet.classList.remove('open'); ui.rideSheet.classList.remove('open'); renderPrompt(); }
function openShop(shop) {
  sheetShop = shop;
  const cat = CATS[shop.cat];
  const priceLabel = shop.cat === 'rental' ? 'Rent per night' : shop.cat === 'tailor' ? 'Stitching charges' : 'Price range';
  const here = near.shop === shop, goLabel = here && near.inside ? 'Step back outside' : here ? 'Walk inside' : 'Take me there';
  ui.shopSheet.innerHTML = `
  <header class="sheet-head">
    <p class="eyebrow" style="color:${cat.color}">${cat.label}</p>
    <h2>${esc(shop.name)}</h2>
    <p class="gu" lang="gu">${shop.gu}</p>
    <button class="btn icon close" id="shopClose" aria-label="Close">✕</button>
  </header>
  <div class="sheet-body">
    <dl class="facts">
      <div><dt>${priceLabel}</dt><dd>${rupee(shop.price[0])} to ${rupee(shop.price[1])}</dd></div>
      <div><dt>Timings</dt><dd>${shop.timing}</dd></div>
      <div><dt>On rent</dt><dd class="${shop.rent ? 'yes' : 'no'}">${shop.rent ? 'Available' : 'Not offered'}</dd></div>
      <div><dt>Alterations</dt><dd>${shop.alter}</dd></div>
    </dl>
    <p class="demo-note">${shop.days}</p>
    <section class="sec"><h3>Known for</h3><ul class="tags">${shop.specs.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></section>
    <section class="code-card" aria-label="Faro code">
      <div class="code-row"><span class="code" id="codeText">${shop.code}</span><button class="btn sm" id="copyBtn">Copy</button></div>
      <p>Show this code at the counter: ${esc(shop.offer)}.</p>
    </section>
    <p class="demo-note">Sample shop with demo details. Real Gurukul shops will appear here with their own names and information.</p>
  </div>
  <footer class="sheet-foot">
    <button class="btn star${shortlist.has(shop.id) ? ' on' : ''}" id="starBtn" aria-pressed="${shortlist.has(shop.id)}">${shortlistLabel(shop.id)}</button>
    <button class="btn" id="waBtn">Chat on WhatsApp</button>
    <button class="btn primary" id="goBtn">${goLabel}</button>
  </footer>`;
  ui.dirSheet.classList.remove('open'); ui.groupSheet.classList.remove('open'); ui.shopSheet.classList.add('open'); renderPrompt();
  $('shopClose').addEventListener('click', closeSheets);
  $('starBtn').addEventListener('click', () => {
    toggleShortlist(shop.id);
    const b = $('starBtn'), on = shortlist.has(shop.id);
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); b.textContent = shortlistLabel(shop.id);
  });
  $('copyBtn').addEventListener('click', () => {
    const done = () => toast(`Copied ${shop.code}`);
    const fallback = () => { const r = document.createRange(); r.selectNodeContents($('codeText')); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast('Code selected. Copy it from here.'); };
    try { navigator.clipboard.writeText(shop.code).then(done, fallback); } catch { fallback(); }
  });
  $('waBtn').addEventListener('click', () => toast('Demo: once real shops join, this opens a WhatsApp chat with the shop.'));
  $('goBtn').addEventListener('click', () => {
    if (here && near.inside) travelTo(shop, false); else if (here) travelTo(shop, true); else travelTo(shop, false);
    closeSheets();
  });
  $('shopClose').focus({ preventScroll: true });
}
function travelTo(shop, inside, then) {
  if (traveling) return; traveling = true;
  if (player.ride) dismount(true);
  ui.fade.classList.add('on');
  setTimeout(() => {
    const lp = new THREE.Vector3(0, 0, inside ? -4.6 : 2.6).applyMatrix4(shop.base);
    player.pos.set(lp.x, 0, lp.z); player.vel.set(0, 0); player.turnTo = null;
    player.heading = shop.rot + Math.PI; player.y = groundAt(lp.x, lp.z);
    cam.yaw = cam.yawT = shop.rot; cam.pitch = cam.pitchT = inside ? 0.26 : 0.2; cam.cur = 4;
    cam.target.set(player.pos.x, player.y + 1.45, player.pos.z); camTween = null;
    updateNear(true);
    setTimeout(() => { ui.fade.classList.remove('on'); traveling = false; then?.(); }, 140);
  }, 320);
}

/* ---------- directory ---------- */
let dirFilter = 'all';
function openDirectory() {
  ui.shopSheet.classList.remove('open'); ui.groupSheet.classList.remove('open'); ui.dirSheet.classList.add('open'); renderDirectory(); renderPrompt();
  if (!isTouch) $('dirSearch').focus({ preventScroll: true });
}
function renderDirectory() {
  const used = new Set(SHOPS.map((s) => s.cat));
  $('dirChips').innerHTML = [['all', { label: 'All shops' }], ...Object.entries(CATS).filter(([k]) => used.has(k))]
    .map(([k, c]) => `<button class="chip" data-cat="${k}" aria-pressed="${dirFilter === k}">${c.color ? `<span class="dot" style="--c:${c.color}"></span>` : ''}${c.label}</button>`).join('');
  const q = $('dirSearch').value.trim().toLowerCase();
  const list = SHOPS.filter((s) => (dirFilter === 'all' || s.cat === dirFilter) && (!q || `${s.name} ${s.gu} ${CATS[s.cat].label} ${s.specs.join(' ')} ${s.rent ? 'rent rental' : ''}`.toLowerCase().includes(q)));
  $('dirList').innerHTML = list.length
    ? list.map((s) => `<li><button class="dir-item" data-id="${s.id}"><span class="dir-name">${esc(s.name)}${shortlist.has(s.id) ? '<span class="dir-star" aria-label="Shortlisted"> ★</span>' : ''}</span><span class="dir-go">Go there</span><span class="dir-meta"><span class="dot" style="--c:${CATS[s.cat].color}"></span>${CATS[s.cat].label} · ${rupee(s.price[0])} to ${rupee(s.price[1])}</span></button></li>`).join('')
    : `<li class="empty">No shops match “${esc(q)}”. Try “rent”, “saree” or “kids”.</li>`;
}
$('dirChips').addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; dirFilter = b.dataset.cat; renderDirectory(); });
$('dirSearch').addEventListener('input', renderDirectory);
$('dirList').addEventListener('click', (e) => {
  const b = e.target.closest('.dir-item'); if (!b) return;
  const shop = SHOPS.find((s) => s.id === b.dataset.id);
  closeSheets(); travelTo(shop, false, () => openShop(shop));
});
$('dirClose').addEventListener('click', closeSheets);
$('shopsBtn').addEventListener('click', openDirectory);
$('avatarBtn').addEventListener('click', openCreator);
$('promptBtn').addEventListener('click', () => { if (promptMode === 'ride' && nearRide) mount(nearRide); else if (near.shop) openShop(near.shop); });
$('startBtn').addEventListener('click', openCreator);

/* ---------- mini map ---------- */
const mapCtx = ui.map.getContext('2d');
const MZ0 = ROAD_Z0, MZ1 = ROAD_Z1, MX = 22;
const mapXY = (x, z, w, h) => [(MZ0 - z) / (MZ0 - MZ1) * w, (x + MX) / (2 * MX) * h];
function sizeMap() { const r = ui.map.getBoundingClientRect(), k = Math.min(2, devicePixelRatio || 1); if (r.width) { ui.map.width = Math.round(r.width * k); ui.map.height = Math.round(r.height * k); } }
function drawMap() {
  const g = mapCtx, w = ui.map.width, h = ui.map.height; if (!w) return;
  g.clearRect(0, 0, w, h);
  const rect = (x0, z0, x1, z1) => { const [a, b] = mapXY(x0, z0, w, h), [c, d] = mapXY(x1, z1, w, h); return [Math.min(a, c), Math.min(b, d), Math.abs(c - a), Math.abs(d - b)]; };
  g.fillStyle = 'rgba(242,239,232,.10)'; g.fillRect(...rect(-10.5, 26, 10.5, STREET_END)); g.fillRect(...rect(-16, STREET_END, 16, ROAD_Z1)); g.fillRect(...rect(-16, ROAD_Z0, 16, 26));
  g.fillStyle = 'rgba(242,239,232,.16)';
  for (const sd of [-1, 1]) for (let sl = 0; sl < N_SLOTS; sl++) { const zc = shopZ(sl), x0 = sd > 0 ? 10.5 : -20.5, [x, y, rw, rh] = rect(x0, zc + 5.5, x0 + 10, zc - 5.5); g.fillRect(x + 1, y + 1, rw - 2, rh - 2); }
  for (const s of SHOPS) {
    const zc = shopZ(s.slot), x0 = s.side > 0 ? 10.5 : -20.5, [x, y, rw, rh] = rect(x0, zc + 5.5, x0 + 10, zc - 5.5);
    g.globalAlpha = s === near.shop ? 1 : 0.62; g.fillStyle = CATS[s.cat].color; g.fillRect(x + 1, y + 1, rw - 2, rh - 2); g.globalAlpha = 1;
    if (s === near.shop) { g.strokeStyle = '#fbf1e2'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, rw - 2, rh - 2); }
  }
  const [ax, ay] = mapXY(-10.5, 8, w, h), [, by] = mapXY(10.5, 8, w, h);
  g.strokeStyle = 'rgba(255,194,71,.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax, by); g.stroke();
  const [lx, ly] = mapXY(0, LIGHTHOUSE.z, w, h); g.fillStyle = '#ffc247'; g.beginPath(); g.arc(lx, ly, h * 0.09, 0, 7); g.fill();
  for (const s of SHOPS) if (shortlist.has(s.id)) {
    const [sx, sy] = mapXY(s.side * 15.5, shopZ(s.slot), w, h);
    g.fillStyle = '#fbf1e2'; g.font = `${Math.round(h * 0.2)}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('★', sx, sy);
  }
  for (const f of group.peers.values()) {
    if (!f.av || !f.seen) continue;
    const [fx, fy] = mapXY(f.x, f.z, w, h);
    g.fillStyle = f.cfg.primary; g.strokeStyle = '#fbf1e2'; g.lineWidth = 2; g.beginPath(); g.arc(fx, fy, h * 0.075, 0, 7); g.fill(); g.stroke();
  }
  const [px, py] = mapXY(player.pos.x, player.pos.z, w, h), s = h * 0.13;
  g.save(); g.translate(px, py); g.rotate(Math.atan2(Math.sin(player.heading), -Math.cos(player.heading)));
  g.fillStyle = '#fbf1e2'; g.strokeStyle = '#16112a'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(s, 0); g.lineTo(-s * 0.7, s * 0.62); g.lineTo(-s * 0.3, 0); g.lineTo(-s * 0.7, -s * 0.62); g.closePath(); g.stroke(); g.fill(); g.restore();
}
ui.map.addEventListener('click', (e) => {
  const r = ui.map.getBoundingClientRect(), u = (e.clientX - r.left) / r.width, v = (e.clientY - r.top) / r.height;
  const z = MZ0 - u * (MZ0 - MZ1), x = v * 2 * MX - MX;
  let best = null, bd = 1e9;
  for (const s of SHOPS) { const d = Math.hypot((x - s.side * 15.5) / 2.5, z - shopZ(s.slot)); if (d < bd) { bd = d; best = s; } }
  if (best && bd < 9) travelTo(best, false, () => openShop(best));
});

/* ---------- quality: step down gracefully on slower devices ---------- */
let perfAcc = 0, perfN = 0, warm = 0, shadowsOff = false;
function applySize() {
  renderer.setPixelRatio(pixelRatio); renderer.setSize(innerWidth, innerHeight, false);
  composer.setPixelRatio(pixelRatio); composer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 0.8 ? 66 : 55; camera.updateProjectionMatrix();
  sizeMap();
}
addEventListener('resize', applySize);
function perf(dt) {
  if ((warm += dt) < 4 || document.hidden || DBG) return;
  perfAcc += dt; perfN++;
  if (perfAcc < 2.5) return;
  const avg = perfAcc / perfN; perfAcc = 0; perfN = 0;
  if (avg < 1 / 42) return;
  if (gtao && gtao.enabled) gtao.enabled = false;
  else if (pixelRatio > 1.25) { pixelRatio = Math.max(1, pixelRatio - 0.25); applySize(); }
  else if (useComposer) useComposer = false;
  else if (pixelRatio > 1) { pixelRatio = 1; applySize(); }
  else if (!shadowsOff) { shadowsOff = true; sun.castShadow = false; }
}

/* ---------- the loop ---------- */
/* add ?debug to the address to measure true render cost per frame */
const DBG = /[?&]debug\b/.test(location.search) ? { ms: 0, n: 0, calls: 0, tris: 0, read() { const r = { avgRenderMs: +(this.ms / Math.max(1, this.n)).toFixed(2), frames: this.n, calls: this.calls, tris: this.tris, gtao: !!gtao?.enabled, pixelRatio, composer: useComposer }; this.ms = 0; this.n = 0; return r; } } : null;
if (DBG) {
  window.faroDebug = DBG;
  /* step the simulation at a true 60 fps, holding the given keys, without rendering */
  DBG.sim = (sec, hold = []) => {
    hold.forEach((k) => keys.add(k));
    let maxKmh = 0;
    for (let i = 0; i < Math.round(sec * 60); i++) { clock += 1 / 60; updatePlayer(1 / 60); updateTraffic(1 / 60, false); maxKmh = Math.max(maxKmh, Math.abs(player.ride?.speed || player.speed) * 3.6); }
    hold.forEach((k) => keys.delete(k));
    return { kmh: Math.round(Math.abs(player.ride?.speed || 0) * 3.6), maxKmh: Math.round(maxKmh), x: +player.pos.x.toFixed(2), z: +player.pos.z.toFixed(2), heading: +player.heading.toFixed(2), lean: +(player.ride?.lean || 0).toFixed(2), riding: player.ride?.type || null };
  };
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; clock += dt;
  if (state === 'play') { updatePlayer(dt); if (!player.ride) updateNear(); updateNearRide(); }
  if (player.av) {
    if (!player.ride) { const r = player.av.root; r.position.set(player.pos.x, player.y, player.pos.z); r.rotation.y = player.heading + (state === 'creator' ? spin.a : 0); }
    player.rig.update(dt, state === 'play' ? player.speed : 0, player.ride ? 1 : 0, player.ride?.type, player.ride?.steer || 0);
  }
  updateTraffic(dt, state === 'play');
  if (state === 'creator' && !pointers.size && !reduceMotion) spin.a += 0.28 * dt;
  updateNPCs(dt);
  updateGroup(dt);
  keeper.rig.update(dt, 0);
  for (const s of SHOPS) { s.glow = damp(s.glow, s === near.shop && state === 'play' && !player.ride ? 1 : 0, 6, dt); s.signMat.emissiveIntensity = 0.14 + 0.3 * s.glow; }
  updateCamera(dt);
  const f = state === 'play' || state === 'creator' ? player.pos : camera.position;
  sun.target.position.set(f.x, 0, f.z); sun.position.copy(sun.target.position).add(SUN_OFFSET);
  sky.position.copy(camera.position);
  const rt0 = DBG ? performance.now() : 0;
  if (useComposer) composer.render(); else renderer.render(scene, camera);
  if (DBG) { renderer.getContext().finish(); DBG.ms += performance.now() - rt0; DBG.n++; DBG.calls = renderer.info.render.calls; DBG.tris = renderer.info.render.triangles; }
  if (state === 'play' && ++mapTick % 3 === 0) drawMap();
  perf(dt);
}

