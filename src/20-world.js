
/* ================= WORLD ================= */
const mannequinSpots = [];
const parkedSpots = [];   /* two-wheelers and cars parked along the kerb (built by the vehicles module) */
const rideSpots = [];     /* the Faro Rides stand at the entrance */
let lighthouseLantern = null;
const signMeshes = [];

const placeLocal = (obj, base, rot, x, y, z) => { obj.position.set(x, y, z).applyMatrix4(base); obj.rotation.y = rot; };
const sideRot = (side) => (side > 0 ? -Math.PI / 2 : Math.PI / 2);
const frontBase = (side, z, x = FRONT) => new THREE.Matrix4().makeRotationY(sideRot(side)).setPosition(side * x, 0, z);

/* ---------- printed and backlit signs ---------- */
function signTexture(name, gu, colors, font, { w = 1600, h = 200, mark = null } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  const [bg, fg] = colors;
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const sheen = g.createLinearGradient(0, 0, 0, h); sheen.addColorStop(0, 'rgba(255,255,255,.08)'); sheen.addColorStop(0.5, 'rgba(255,255,255,0)'); sheen.addColorStop(1, 'rgba(0,0,0,.14)');
  g.fillStyle = sheen; g.fillRect(0, 0, w, h);
  g.strokeStyle = fg; g.globalAlpha = 0.25; g.lineWidth = 3; g.strokeRect(12, 12, w - 24, h - 24); g.globalAlpha = 1;
  let x0 = 30;
  if (mark === '+') {
    const s = h * 0.5, cx = 40 + s / 2, cy = h / 2; g.fillStyle = fg;
    g.fillRect(cx - s / 6, cy - s / 2, s / 3, s); g.fillRect(cx - s / 2, cy - s / 6, s, s / 3); x0 = 40 + s + 20;
  }
  const guW = gu ? Math.min(w * 0.34, 560) : 0;
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (font === 'serif') {
    fitFont(g, name, (s) => FONT.serif(s, 600), h * 0.64, w - guW - x0 - 70);
    g.fillText(name, x0 + (w - guW - x0) / 2, h * 0.53);
  } else {
    const t = name.toUpperCase();
    if ('letterSpacing' in g) g.letterSpacing = `${Math.round(h * 0.03)}px`;
    fitFont(g, t, (s) => FONT.sans(s, 800), h * 0.48, w - guW - x0 - 70);
    g.fillText(t, x0 + (w - guW - x0) / 2, h * 0.54);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
  }
  if (gu) {
    g.globalAlpha = 0.3; g.fillRect(w - guW, h * 0.22, 2, h * 0.56); g.globalAlpha = 1;
    fitFont(g, gu, (s) => FONT.gu(s, 600), h * 0.42, guW - 60);
    g.fillText(gu, w - guW / 2, h * 0.56);
  }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(70,60,50,${rnd() * 0.07})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3); }
  const dirt = g.createLinearGradient(0, h * 0.6, 0, h); dirt.addColorStop(0, 'rgba(60,50,40,0)'); dirt.addColorStop(1, 'rgba(60,50,40,.18)');
  g.fillStyle = dirt; g.fillRect(0, 0, w, h);
  return canvasTex(c);
}
function addSign(base, rot, tex, x, y, z, w, h, glow = 0.12) {
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.05, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: glow });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  placeLocal(mesh, base, rot, x, y, z); mesh.receiveShadow = true; scene.add(mesh); signMeshes.push(mesh);
  return mat;
}
const awningCache = new Map();
function awningTexture([a, b]) {
  const key = a + b; if (awningCache.has(key)) return awningCache.get(key);
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  const n = 10, sw = 512 / n, cut = 220;
  for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * sw, 0, sw, 256); }
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(40,30,20,${rnd() * 0.06})`; g.fillRect(rnd() * 512, rnd() * 256, 2, 2); }
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, cut - 14, 512, 14);
  g.globalCompositeOperation = 'destination-in'; g.fillRect(0, 0, 512, cut);
  const t = canvasTex(c); awningCache.set(key, t); return t;
}
function leafTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  for (let i = 0; i < 260; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 112, x = 128 + Math.cos(a) * r, y = 128 + Math.sin(a) * r;
    g.save(); g.translate(x, y); g.rotate(rnd() * Math.PI * 2);
    g.fillStyle = `hsl(${88 + rnd() * 26}, ${30 + rnd() * 18}%, ${20 + rnd() * 16}%)`;
    g.beginPath(); g.ellipse(0, 0, 9 + rnd() * 7, 3 + rnd() * 2.5, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  const t = canvasTex(c); t.anisotropy = 4; return t;
}
function cityTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#b8ab99'; g.fillRect(0, 0, 128, 256);
  for (let y = 14; y < 250; y += 30) for (let x = 10; x < 120; x += 28) { g.fillStyle = pick(['#4b5258', '#5a6168', '#3f4549', '#6b6f70']); g.fillRect(x, y, 16, 18); }
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(60,50,40,${rnd() * 0.08})`; g.fillRect(rnd() * 128, rnd() * 256, 2, 4); }
  return canvasTex(c);
}

/* ---------- ground: road, footpaths, kerbs, markings ---------- */
function buildGround() {
  const roadLen = ROAD_Z0 - ROAD_Z1;
  const road = new THREE.Mesh(new THREE.PlaneGeometry(32, roadLen), SURF.road);
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0, (ROAD_Z0 + ROAD_Z1) / 2); road.receiveShadow = true; scene.add(road);
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ color: '#8d7f6b', roughness: 1 }));
  outer.rotation.x = -Math.PI / 2; outer.position.y = -0.03; scene.add(outer);
  for (const s of [-1, 1]) {
    const len = 26 - STREET_END;
    const fp = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.16, len), SURF.pavers);
    fp.position.set(s * 8.25, 0.08, (26 + STREET_END) / 2); fp.receiveShadow = true; scene.add(fp);
    for (let z = 25.5, k = 0; z > STREET_END; z -= 1, k++) B.concrete.add(null, s * 6.0, 0.1, z, 0.22, 0.2, 0.98, k % 2 ? '#4a4846' : '#b9a65e');
  }
  for (let z = ROAD_Z0 - 4; z > ROAD_Z1 + 6; z -= 6) {
    if (Math.abs(z - ENTRY_RB.z) < 9 || Math.abs(z - LIGHTHOUSE.z) < 9) continue;
    B.small.add(null, 0, 0.006, z, 0.14, 0.01, 3, '#c4beb0');
  }
  const zebra = (zc, len) => { for (let x = -5.3; x <= 5.4; x += 1.1) B.small.add(null, x, 0.006, zc, 0.5, 0.01, len, '#cfc9bb'); };
  zebra(2.5, 3); zebra(STREET_END + 2.5, 2.6); zebra(-118, 2.6);
  for (let i = 0; i < 46; i++) {
    const x = rr(-5.4, 5.4), z = rr(ROAD_Z1 + 10, ROAD_Z0 - 10);
    B.small.add(null, x, 0.003, z, rr(0.4, 1.4), 0.004, rr(0.3, 1.1), pick(['#6a6660', '#625e58', '#706b64']), 0, rnd() * 3, 0);
  }
  for (let i = 0; i < 9; i++) B.cylMetal.add(null, rr(-4.5, 4.5), 0.012, rr(-210, 20), 0.75, 0.02, 0.75, '#5a5650');
  addCollider(null, -16.5, ROAD_Z0, 16.5, ROAD_Z0 + 1.5);
  addCollider(null, -16.5, ROAD_Z1 - 1.5, 16.5, ROAD_Z1);
  /* compound walls between the arch and the entrance plaza */
  for (const s of [-1, 1]) {
    bx(B.plaster, null, s * 10.5, 0, 7, s * 11, 1.8, 26, '#d4c7b2');
    bx(B.concrete, null, s * 10.4, 1.8, 7, s * 11.1, 1.9, 26, '#a59c8e');
    addCollider(null, s * 10.5, 7, s * 11.2, 26);
  }
}

/* ---------- facades above the shops ---------- */
const OFFICES = ['Shah & Associates · Chartered Accountants', 'Bright Future Classes', 'Dr. Mehta Dental Clinic', 'Aarav Interiors', 'Safal Insurance Advisors', 'Sunrise Yoga Studio', 'Kavya Travels', 'Pathology Laboratory'];
const FACADE_TINTS = ['#ddd3c1', '#d4cab7', '#cfc6b8', '#e2dccf', '#c9c1b3', '#d8cbb2', '#c6c8c1', '#d9d0bf'];
function upperFloors(base, rot, width, depth, floors, tint, trim, style) {
  const hw = width / 2, top = H1 + FH * floors;
  if (style === 'commercial') {
    bx(B.plaster, base, -hw, H1, -depth, hw, top, -0.25, tint);
    for (let f = 0; f < floors; f++) {
      const y0 = H1 + f * FH;
      bx(B.paint, base, -hw, y0, -0.25, hw, y0 + 0.95, 0.1, trim);
      bx(B.glass, base, -hw + 0.15, y0 + 0.95, -0.2, hw - 0.15, y0 + FH - 0.12, -0.14, '#ffffff');
      for (let x = -hw + 0.15; x <= hw - 0.1; x += width / 7) bx(B.metal, base, x - 0.03, y0 + 0.95, -0.15, x + 0.03, y0 + FH - 0.12, -0.08, '#6a6c6e');
      bx(B.paint, base, -hw, y0 + FH - 0.12, -0.25, hw, y0 + FH, 0.1, trim);
    }
    if (rnd() < 0.7) {
      const tx = signTexture(pick(OFFICES), '', [pick(['#f0ece2', '#1f2a36', '#2b2b2b']), pick(['#22313f', '#e8e2d2', '#c9b07a'])], 'sans', { w: 1200, h: 220 });
      addSign(base, rot, tx, rr(-1.5, 1.5), H1 + FH * (floors - 1) + 0.47, 0.13, 4.2, 0.77, 0.05);
    }
  } else {
    bx(B.plaster, base, -hw, H1, -depth, hw, top, 0, tint);
    for (let f = 0; f < floors; f++) {
      const y0 = H1 + f * FH;
      bx(B.concrete, base, -hw - 0.04, y0 - 0.06, -0.05, hw + 0.04, y0 + 0.1, 0.16, '#c9c0b2');
      const bays = Math.max(1, Math.floor(width / 3.6));
      for (let b = 0; b < bays; b++) {
        const wx = -hw + (b + 0.5) * (width / bays), wy = y0 + 0.95;
        const balcony = b === Math.floor(bays / 2) && rnd() < 0.55;
        if (balcony) {
          bx(B.concrete, base, wx - 1.4, y0 + 0.1, 0, wx + 1.4, y0 + 0.24, 1.0, '#c4bbac');
          for (let px = wx - 1.35; px <= wx + 1.36; px += 0.15) bx(B.metal, base, px - 0.012, y0 + 0.24, 0.93, px + 0.012, y0 + 1.15, 0.96, '#3a3a3a');
          bx(B.metal, base, wx - 1.4, y0 + 1.12, 0.9, wx + 1.4, y0 + 1.18, 1.0, '#3a3a3a');
          bx(B.glass, base, wx - 0.9, y0 + 0.24, -0.04, wx + 0.9, y0 + 2.4, 0.0, '#ffffff');
          bx(B.paint, base, wx - 0.98, y0 + 0.24, -0.02, wx + 0.98, y0 + 2.48, 0.01, '#e7e0d3');
          if (rnd() < 0.6) {
            bx(B.metal, base, wx - 1.2, y0 + 2.1, 0.7, wx + 1.2, y0 + 2.12, 0.72, '#2a2a2a');
            for (let k = 0; k < 4; k++) { const cx = wx - 1 + k * 0.6 + rr(-0.1, 0.1); bx(B.small, base, cx - 0.22, y0 + 1.45 + rr(0, 0.2), 0.7, cx + 0.22, y0 + 2.08, 0.715, pick(['#7a2a2a', '#2e4a6a', '#d8d2c2', '#b8892f', '#3f5a3a', '#6b4a6b'])); }
          }
        } else {
          bx(B.paint, base, wx - 0.85, wy - 0.08, -0.02, wx + 0.85, wy + 1.48, 0.05, '#e7e0d3');
          bx(B.glass, base, wx - 0.75, wy, 0.0, wx + 0.75, wy + 1.4, 0.06, '#ffffff');
          for (const gx of [-0.5, -0.25, 0, 0.25, 0.5]) bx(B.metal, base, wx + gx - 0.012, wy, 0.1, wx + gx + 0.012, wy + 1.4, 0.13, '#2e2e2e');
          bx(B.metal, base, wx - 0.75, wy + 0.68, 0.1, wx + 0.75, wy + 0.71, 0.13, '#2e2e2e');
          bx(B.concrete, base, wx - 1.0, wy + 1.52, -0.05, wx + 1.0, wy + 1.6, 0.6, '#c2b9aa');
          if (rnd() < 0.35) { bx(B.paint, base, wx + 0.2, wy - 0.85, 0, wx + 1.0, wy - 0.25, 0.42, '#dcd8ce'); B.cylMetal.add(base, wx + 0.6, wy - 0.55, 0.43, 0.42, 0.02, 0.42, '#8f8c86', Math.PI / 2); }
        }
      }
    }
  }
  bx(B.plaster, base, -hw, top, -0.25, hw, top + 0.9, 0, tint);
  bx(B.plaster, base, -hw, top, -depth, -hw + 0.25, top + 0.9, 0, tint);
  bx(B.plaster, base, hw - 0.25, top, -depth, hw, top + 0.9, 0, tint);
  bx(B.plaster, base, -hw, top, -depth, hw, top + 0.9, -depth + 0.25, tint);
  bx(B.concrete, base, -hw - 0.05, top + 0.9, -0.3, hw + 0.05, top + 0.98, 0.05, '#bdb3a4');
  const tx = rr(-hw + 1.5, hw - 1.5);
  B.cyl.add(base, tx, top + 0.75, -depth + 3, 1.3, 1.5, 1.3, '#1d1d1f');
  if (rnd() < 0.5) bx(B.plaster, base, -hw + 1, top, -depth + 4, -hw + 3.6, top + 2.6, -depth + 6.6, tint);
  return top;
}

/* ---------- ground floor shell shared by every shop ---------- */
function shopShell(base, facade, trim, interior) {
  const hw = W / 2;
  bx(B.concrete, base, -hw, 0, -D, hw, 0.18, 0.3, '#b9b2a6');
  bx(B.tiles, base, -hw + 0.3, 0.18, -D + 0.3, hw - 0.3, 0.2, -0.02, '#ece7dc');
  bx(B.plaster, base, -hw, 0.18, -D, -hw + 0.3, H1, -0.3, facade);
  bx(B.plaster, base, hw - 0.3, 0.18, -D, hw, H1, -0.3, facade);
  bx(B.plaster, base, -hw, 0.18, -D, hw, H1, -D + 0.3, facade);
  bx(B.plasterIn, base, -hw + 0.3, 0.2, -D + 0.3, -hw + 0.34, H1 - 0.15, -0.3, interior);
  bx(B.plasterIn, base, hw - 0.34, 0.2, -D + 0.3, hw - 0.3, H1 - 0.15, -0.3, interior);
  bx(B.plasterIn, base, -hw + 0.3, 0.2, -D + 0.3, hw - 0.3, H1 - 0.15, -D + 0.34, interior);
  bx(B.plasterIn, base, -hw + 0.3, H1 - 0.22, -D + 0.3, hw - 0.3, H1 - 0.14, -0.25, '#f2eee6');
  for (const z of [-2, -4.6, -7.2]) for (const x of [-3, -1, 1, 3]) bx(B.lit, base, x - 0.11, H1 - 0.235, z - 0.11, x + 0.11, H1 - 0.22, z + 0.11, bright('#fff3e2', 1.3));
  bx(B.paint, base, -hw, 0.18, -0.35, -hw + PILLAR, H1, 0.08, trim);
  bx(B.paint, base, hw - PILLAR, 0.18, -0.35, hw, H1, 0.08, trim);
  bx(B.paint, base, -hw, 3.25, -0.35, hw, H1 + 0.06, 0.1, trim);
  addCollider(base, -hw, -D, -hw + 0.35, 0.1); addCollider(base, -hw, -0.35, -hw + PILLAR, 0.1);
  addCollider(base, hw - 0.35, -D, hw, 0.1); addCollider(base, hw - PILLAR, -0.35, hw, 0.1);
  addCollider(base, -hw, -D, hw, -D + 0.4);
  addCollider(base, -hw + PILLAR, -0.4, hw - PILLAR, 0.1, { y0: 3.2, solid: false });
}
function glassFront(base, rot, enterable) {
  const hw = W / 2, x0 = -hw + PILLAR, x1 = hw - PILLAR, door = 1.45;
  const panels = enterable ? [[x0, -door], [door, x1]] : [[x0, x1]];
  for (const [a, b] of panels) {
    bx(B.glass, base, a, 0.2, -0.06, b, 3.2, -0.04, '#ffffff');
    bx(B.metal, base, a, 0.2, -0.09, b, 0.32, -0.01, '#2f3133');
    for (let x = a; x <= b + 0.01; x += (b - a) / Math.max(1, Math.round((b - a) / 1.6))) bx(B.metal, base, x - 0.03, 0.2, -0.09, x + 0.03, 3.25, -0.01, '#2f3133');
    addCollider(base, a, -0.12, b, 0.02, { cam: false });
  }
  bx(B.metal, base, x0, 3.18, -0.09, x1, 3.26, -0.01, '#2f3133');
  if (enterable) {
    for (const s of [-1, 1]) {
      const leaf = new THREE.Mesh(unitBox, matGlass); leaf.scale.set(1.35, 2.9, 0.03);
      const hinge = new THREE.Vector3(s * door, 0, -0.05).applyMatrix4(base);
      const g = new THREE.Group(); g.position.copy(hinge).setY(0.2 + 1.45); g.rotation.y = rot + s * 1.35; leaf.position.x = -s * 0.68; g.add(leaf); scene.add(g);
    }
    addCollider(base, -door, -0.3, door, 0.3, { solid: false, cam: false, vehicle: true });
    bx(B.small, base, -1.2, 0.2, 0.05, 1.2, 0.215, 0.95, '#3a302a');
  }
}
function openFront(base, rot, { awning = null } = {}) {
  const hw = W / 2, x0 = -hw + PILLAR, x1 = hw - PILLAR;
  bx(B.shutter, base, x0, 3.0, -0.42, x1, 3.25, -0.12, '#9a9a96');
  for (const x of [x0, x1]) bx(B.metal, base, x - 0.05, 0.2, -0.3, x + 0.05, 3.0, -0.2, '#6f6f6c');
  bx(B.concrete, base, x0, 0.18, -0.2, x1, 0.21, 0.3, '#a9a196');
  addCollider(base, x0, -0.3, x1, 0.3, { solid: false, cam: false, vehicle: true });
  if (awning) {
    const aw = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 - 0.1, 1.6), new THREE.MeshStandardMaterial({ map: awningTexture(awning), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95 }));
    aw.rotation.x = -1.32; aw.castShadow = true; aw.receiveShadow = true;
    const g = new THREE.Group(); placeLocal(g, base, rot, 0, 3.0, 0.8); g.add(aw); scene.add(g);
  }
}
function closedFront(base, rot, letTex) {
  const hw = W / 2, x0 = -hw + PILLAR, x1 = hw - PILLAR;
  bx(B.shutter, base, x0, 0.2, -0.22, x1, 3.25, -0.12, '#8e8c86');
  bx(B.metal, base, x0, 0.2, -0.15, x1, 0.32, -0.08, '#4a4a48');
  addCollider(base, x0, -0.3, x1, 0.05);
  if (letTex) addSign(base, rot, letTex, 0, 1.9, -0.1, 1.6, 0.6, 0);
}
function stockShelves(base, colors) {
  const hw = W / 2, z0 = -D + 0.4, z1 = -D + 1.0, sx0 = -hw + 0.6, sx1 = hw - 0.6;
  for (const x of [sx0, -1.9, 1.9, sx1]) bx(B.wood, base, x - 0.05, 0.2, z0, x + 0.05, 3.6, z1, '#8a6a52');
  for (const y of [0.2, 0.9, 1.6, 2.3, 3.0, 3.56]) bx(B.wood, base, sx0, y, z0, sx1, y + 0.05, z1, '#8a6a52');
  for (const y of [0.25, 0.95, 1.65, 2.35, 3.05]) for (let x = sx0 + 0.38; x < sx1 - 0.3; x += 0.55) {
    const h = 2 + Math.floor(rnd() * 3);
    for (let j = 0; j < h; j++) B.small.add(base, x + rr(-0.03, 0.03), y + 0.06 + j * 0.105, (z0 + z1) / 2 + 0.03, 0.45, 0.095, 0.5, pick(colors));
  }
  addCollider(base, -hw, -D, hw, -D + 1.1);
}

/* ---------- the 12 clothing shops (enterable) ---------- */
function buildShop(shop) {
  const rot = sideRot(shop.side), base = frontBase(shop.side, shopZ(shop.slot));
  Object.assign(shop, { rot, base, inv: base.clone().invert() });
  const hw = W / 2;
  shopShell(base, shop.facade, shop.trim, shop.interior);
  if (shop.style === 'glass') glassFront(base, rot, true); else openFront(base, rot, { awning: shop.awning });
  upperFloors(base, rot, W, D, shop.floors, shop.facade, shop.trim, shop.style === 'glass' ? 'commercial' : 'residential');
  shop.signMat = addSign(base, rot, signTexture(shop.name, shop.gu, shop.sign, shop.font), 0, 3.78, 0.13, W - 1.4, 0.9, 0.14);
  shop.glow = 0;
  for (const lx of [-3.2, 0, 3.2]) { bx(B.metal, base, lx - 0.02, 4.4, 0.1, lx + 0.02, 4.44, 0.42, '#2a2a2a'); bx(B.metal, base, lx - 0.1, 4.36, 0.36, lx + 0.1, 4.42, 0.5, '#2a2a2a'); }
  if (shop.toran) {
    const xs = -hw + PILLAR + 0.15, xe = hw - PILLAR - 0.15;
    for (let i = 0; i <= 52; i++) { const t = i / 52; B.flower.add(base, xs + (xe - xs) * t, 3.12 - 0.2 * (1 - (2 * t - 1) ** 2), 0.18, 0.1, 0.1, 0.1, i % 2 ? '#c8732a' : '#d39a35'); }
  }
  /* interior */
  stockShelves(base, shop.garments);
  for (const s of [-1, 1]) {
    const x = s * (hw - 0.95), r0 = -D + 1.5, r1 = -2.4;
    if (shop.seat === 'jewel') {
      bx(B.wood, base, x - 0.45, 0.2, r0, x + 0.45, 1.0, r1, '#5a4434');
      bx(B.glass, base, x - 0.43, 1.0, r0 + 0.04, x + 0.43, 1.32, r1 - 0.04, '#ffffff');
      bx(B.lit, base, x - 0.4, 1.0, r0 + 0.05, x + 0.4, 1.02, r1 - 0.05, bright('#f4ecdc', 0.7));
      for (let z = r0 + 0.3; z < r1 - 0.2; z += 0.34) B.sph.add(base, x + rr(-0.2, 0.2), 1.08, z, 0.12, 0.08, 0.12, pick(['#a8a49c', '#8d8980', '#b8a06a']));
    } else {
      const k = shop.kidsDisplay ? 0.72 : 1;
      B.cylMetal.add(base, x, 2.1 * k + 0.1, (r0 + r1) / 2, 0.04, r1 - r0, 0.04, '#b5b3ae', Math.PI / 2);
      for (const z of [r0, r1]) B.cylMetal.add(base, x, (2.1 * k + 0.1) / 2 + 0.1, z, 0.04, 2.1 * k, 0.04, '#b5b3ae');
      for (let z = r0 + 0.2; z < r1 - 0.1; z += 0.28) B.garment.add(base, x, 2.1 * k + 0.1 - 0.68 * k, z, k, k, k, pick(shop.garments));
    }
    addCollider(base, x - 0.55, r0 - 0.1, x + 0.55, r1 + 0.1, { y1: 2.2 });
  }
  if (shop.seat === 'gaddi') {
    bx(B.box, base, -3.3, 0.2, -D + 1.8, 3.3, 0.55, -D + 4.0, '#ece8df');
    for (const x of [-2.3, 0, 2.3]) B.cyl.add(base, x, 0.72, -D + 1.98, 0.34, 1.2, 0.34, '#f1eee6', 0, 0, Math.PI / 2);
    B.small.add(base, rr(-1, 1), 0.565, -D + 3.0, 1.3, 0.02, 1.0, pick(shop.garments), 0, rr(-0.4, 0.4), 0);
    addCollider(base, -3.3, -D + 1.75, 3.3, -D + 4.0, { y1: 0.8 });
  } else {
    bx(B.wood, base, -2.6, 0.2, -D + 2.0, 2.6, 1.05, -D + 2.8, '#6b4f3c');
    bx(B.box, base, -2.7, 1.05, -D + 1.95, 2.7, 1.1, -D + 2.85, '#2c2826');
    for (let i = 0; i < 3; i++) B.small.add(base, rr(-2, 2), 1.15, -D + 2.4, 0.5, 0.09, 0.4, pick(shop.garments), 0, rr(-0.3, 0.3), 0);
    addCollider(base, -2.7, -D + 1.9, 2.7, -D + 2.9, { y1: 1.2 });
  }
  shop.keeper = new THREE.Vector3(0, 0.2, -D + 1.42).applyMatrix4(base);
  bx(B.small, base, -1.8, 0.2, -6.6, 1.8, 0.21, -3.6, shop.trim);
  shop.display.forEach(([outfit, primary, accent], i) => {
    const mx = (i ? 1 : -1) * (hw - 2.35), mz = shop.style === 'glass' ? -0.9 : -1.25;
    B.cyl.add(base, mx, 0.3, mz, 0.8, 0.2, 0.8, '#d9d4ca');
    const p = new THREE.Vector3(mx, 0.4, mz).applyMatrix4(base);
    mannequinSpots.push({ p, rot: rot + (i ? -0.25 : 0.25), cfg: { outfit, primary, accent, skin: '#e9e4dc', hair: 'none' }, scale: shop.kidsDisplay ? 0.7 : 1 });
    addCollider(base, mx - 0.45, mz - 0.45, mx + 0.45, mz + 0.45, { y1: 2 });
  });
}

/* ---------- everyday businesses (not enterable) ---------- */
function buildGeneric(side, slot, biz) {
  const rot = sideRot(side), base = frontBase(side, shopZ(slot)), hw = W / 2;
  const facade = pick(FACADE_TINTS), trim = pick(['#2e2f31', '#4a4743', '#6b625a', '#8c8579', '#3a3f45']);
  shopShell(base, facade, trim, '#efe9de');
  if (biz.front === 'glass') glassFront(base, rot, false);
  else if (biz.front === 'open') { openFront(base, rot); addCollider(base, -hw + PILLAR, -0.6, hw - PILLAR, 0.05); }
  else closedFront(base, rot, biz.name === 'TO LET' ? signTexture('TO LET', 'ભાડે આપવાનું છે', biz.sign, 'sans', { w: 800, h: 300 }) : null);
  if (biz.front !== 'closed') {
    stockShelves(base, pick([['#c9b79a', '#8a7a62', '#d8d0c2', '#6a5a4a'], ['#3a4a5a', '#c9c2b5', '#8a2a2a', '#d9d2c4'], ['#d8b26a', '#8a5a2a', '#e8dcc4', '#b85a3a']]));
    bx(B.wood, base, -2.4, 0.2, -2.4, 2.4, 1.0, -1.8, '#6b4f3c');
    bx(B.glass, base, -2.4, 1.0, -2.4, 2.4, 1.3, -1.8, '#ffffff');
  }
  if (biz.sign && biz.name !== 'TO LET') addSign(base, rot, signTexture(biz.name, biz.gu, biz.sign, biz.font, { mark: biz.mark }), 0, 3.78, 0.13, biz.small ? 4.2 : W - 1.4, 0.9, 0.12);
  upperFloors(base, rot, W, D, 2 + Math.floor(rnd() * 3), facade, trim, rnd() < 0.4 ? 'commercial' : 'residential');
}

/* ---------- plain blocks around the two plazas ---------- */
function buildBlock(base, rot, width, depth, floors) {
  const hw = width / 2, tint = pick(FACADE_TINTS), trim = pick(['#4a4743', '#6b625a', '#3a3f45']);
  bx(B.plaster, base, -hw, 0, -depth, hw, H1, -0.3, tint);
  const bays = Math.max(1, Math.floor(width / 3.6));
  for (let b = 0; b < bays; b++) {
    const a = -hw + b * (width / bays) + 0.3, c = -hw + (b + 1) * (width / bays) - 0.3;
    bx(B.shutter, base, a, 0.15, -0.32, c, 3.0, -0.22, '#8e8c86');
    bx(B.paint, base, a - 0.3, 3.0, -0.34, c + 0.3, H1, -0.2, trim);
  }
  upperFloors(base, rot, width, depth, floors, tint, trim, 'residential');
  addCollider(base, -hw, -depth, hw, 0.1);
}
function buildFillers() {
  for (const s of [-1, 1]) {
    const rot = sideRot(s);
    buildBlock(frontBase(s, 1.25), rot, 11.5, 10, 2);
    buildBlock(frontBase(s, STREET_END + 2), rot, 4, 10, 3);
    buildBlock(frontBase(s, (STREET_END + ROAD_Z1) / 2, 16), rot, -(ROAD_Z1 - STREET_END), 10, 3);
    buildBlock(frontBase(s, (26 + ROAD_Z0) / 2, 16), rot, ROAD_Z0 - 26, 10, 2);
    for (let i = 0; i < N_SLOTS - 1; i++) {
      const zc = shopZ(i) - PITCH / 2, x = s * FRONT;
      bx(B.plaster, null, x - 0.2, 0, zc - 1.25, x + 0.2, 2.2, zc + 1.25, '#cfc5b4');
      bx(B.concrete, null, x - 0.25, 2.2, zc - 1.3, x + 0.25, 2.3, zc + 1.3, '#a9a092');
      if (i % 3 === 0) bx(B.metal, null, x - 0.24, 0.1, zc - 0.9, x - 0.2, 2.0, zc + 0.9, '#3d3a37');
      bx(B.concrete, null, s * (FRONT + 0.3), 0, zc - 1.25, s * (FRONT + 10), 0.05, zc + 1.25, '#6d665c');
      addCollider(null, x - 0.3, zc - 1.4, x + 0.3, zc + 1.4);
    }
    /* entrance plaza side walls */
    addCollider(null, s * 10.5, 26, s * 16.5, 27);
  }
  buildBlock(new THREE.Matrix4().setPosition(0, 0, ROAD_Z1), 0, 32, 10, 4);
  buildBlock(new THREE.Matrix4().makeRotationY(Math.PI).setPosition(0, 0, ROAD_Z0), Math.PI, 32, 10, 3);
}
const cityBatch = new Batch(unitBox, null, { cast: false, receive: false });
function buildBackdrop() {
  const tex = cityTexture();
  cityBatch.m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
  for (const s of [-1, 1]) for (let z = 70; z > -280; z -= rr(9, 13)) { const h = rr(10, 30); cityBatch.add(null, s * rr(28, 44), h / 2, z, rr(8, 12), h, rr(8, 12), pick(['#ffffff', '#efe6da', '#e3e0da'])); }
  for (let x = -44; x < 44; x += rr(9, 13)) { const h = rr(12, 32); cityBatch.add(null, x, h / 2, rr(-275, -285), rr(8, 12), h, 9, '#ffffff'); cityBatch.add(null, x, h / 2, rr(75, 85), rr(8, 12), h * 0.8, 9, '#f0ebe2'); }
}

/* ---------- entrance arch and the two roundabouts ---------- */
function buildArch() {
  const stone = '#c8b08c', stoneD = '#a8916f';
  for (const s of [-1, 1]) {
    bx(B.concrete, null, s * 8.4, 0, 7.1, s * 10.4, 1.0, 9.1, stoneD);
    bx(B.concrete, null, s * 8.7, 1.0, 7.4, s * 10.1, 7.2, 8.8, stone);
    for (let r = 0; r < 6; r++) bx(B.concrete, null, s * 8.66, 1.6 + r * 0.95, 7.38, s * 8.7, 1.62 + r * 0.95, 8.82, stoneD);
    bx(B.concrete, null, s * 8.45, 7.2, 7.15, s * 10.35, 7.45, 9.05, stoneD);
    addCollider(null, s * 8.4, 7.1, s * 10.4, 9.1);
  }
  bx(B.concrete, null, -10.4, 7.45, 7.3, 10.4, 8.9, 8.9, stone);
  bx(B.concrete, null, -10.6, 8.9, 7.15, 10.6, 9.1, 9.05, stoneD);
  const front = signTexture('Gurukul Road', 'ગુરુકુળ રોડ', ['#2b2622', '#cfb27a'], 'serif', { w: 2048, h: 180 });
  const back = signTexture('Faro Ahmedabad', 'આવજો', ['#2b2622', '#cfb27a'], 'serif', { w: 2048, h: 180 });
  for (const [tex, z, ry] of [[front, 8.92, 0], [back, 7.28, Math.PI]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(15.5, 1.15), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, metalness: 0.2 }));
    m.position.set(0, 8.17, z); m.rotation.y = ry; scene.add(m);
  }
}
function roundabout(c, r, grassy = true) {
  const island = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.15, 0.32, 48), new THREE.MeshStandardMaterial({ color: grassy ? '#6f7a4a' : '#a69c8c', roughness: 1 }));
  island.position.set(c.x, 0.16, c.z); island.receiveShadow = true; scene.add(island);
  const n = Math.round(r * 8);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; B.concrete.add(null, c.x + Math.cos(a) * (r + 0.1), 0.18, c.z + Math.sin(a) * (r + 0.1), 0.25, 0.36, (Math.PI * 2 * r) / n * 0.98, i % 2 ? '#4a4846' : '#b9a65e', 0, -a, 0); }
}
function buildLighthouse() {
  const { x, z } = LIGHTHOUSE;
  roundabout(LIGHTHOUSE, 4.6);
  for (let i = 0; i < 8; i++) B.cylConcrete.add(null, x, 0.35 + 0.69 + i * 1.375, z, 2.5 - i * 0.07, 1.375, 2.5 - i * 0.07, i % 2 ? '#a4534a' : '#e4ddd0');
  const dark = new THREE.MeshStandardMaterial({ color: '#2c2c2e', roughness: 0.5, metalness: 0.6 });
  const gal = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.2, 32), dark); gal.position.set(x, 11.45, z); gal.castShadow = true; scene.add(gal);
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; B.cylMetal.add(null, x + Math.cos(a) * 1.38, 11.85, z + Math.sin(a) * 1.38, 0.04, 0.6, 0.04, '#2c2c2e'); }
  const rail = new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.03, 6, 48), dark); rail.rotation.x = Math.PI / 2; rail.position.set(x, 12.15, z); scene.add(rail);
  lighthouseLantern = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.2, 24), new THREE.MeshStandardMaterial({ color: '#3a4046', roughness: 0.05, metalness: 0.3, emissive: '#ffd9a0', emissiveIntensity: 0.25 }));
  lighthouseLantern.position.set(x, 12.15, z); scene.add(lighthouseLantern);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.0, 24), new THREE.MeshStandardMaterial({ color: '#5a2a26', roughness: 0.6 })); roof.position.set(x, 13.25, z); roof.castShadow = true; scene.add(roof);
  addCollider(null, x - 1.3, z - 1.3, x + 1.3, z + 1.3);
  roundabout(ENTRY_RB, 5);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; tree(ENTRY_RB.x + Math.cos(a) * 2.6, ENTRY_RB.z + Math.sin(a) * 2.6, 0.55, true); }
}

/* ---------- electric poles, cables and street lights ---------- */
function catenary(out, a, b, sag, n = 14) {
  let px = a.x, py = a.y, pz = a.z;
  for (let i = 1; i <= n; i++) {
    const t = i / n, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, y = a.y + (b.y - a.y) * t - sag * 4 * t * (1 - t);
    out.push(px, py, pz, x, y, z); px = x; py = y; pz = z;
  }
}
function buildPoles() {
  const wires = [], V = (x, y, z) => new THREE.Vector3(x, y, z);
  for (const s of [-1, 1]) {
    const tops = [];
    for (let z = 22 - (s > 0 ? 0 : 13.5), k = 0; z > STREET_END + 4; z -= 27, k++) {
      const x = s * 6.45;
      B.cylConcrete.add(null, x, 4.6, z, 0.26, 9.2, 0.26, '#b4ada1');
      bx(B.metal, null, x - 0.85, 8.35, z - 0.05, x + 0.85, 8.45, z + 0.05, '#4a4a48');
      for (const ox of [-0.7, 0, 0.7]) B.cyl.add(null, x + ox, 8.55, z, 0.09, 0.18, 0.09, '#d8d4ca');
      if (k % 3 === 1) { bx(B.metal, null, x - 0.5, 5.4, z + 0.25, x + 0.5, 6.4, z + 0.95, '#7d817c'); for (let f = 0; f < 5; f++) bx(B.metal, null, x - 0.52, 5.5 + f * 0.18, z + 0.95, x + 0.52, 5.56 + f * 0.18, z + 1.02, '#6d716c'); }
      bx(B.metal, null, x, 7.55, z - 0.04, x - s * 1.7, 7.63, z + 0.04, '#5c5c5a');
      bx(B.box, null, x - s * 1.35, 7.42, z - 0.17, x - s * 2.05, 7.56, z + 0.17, '#3b3b3b');
      bx(B.lit, null, x - s * 1.4, 7.405, z - 0.12, x - s * 2.0, 7.42, z + 0.12, bright('#e9e3d6', 0.55));
      addCollider(null, x - 0.2, z - 0.2, x + 0.2, z + 0.2, { y1: 9, cam: false });
      tops.push(V(x, 8.58, z));
      for (let d = 0; d < 2; d++) catenary(wires, V(x + rr(-0.6, 0.6), 8.4, z), V(s * (FRONT + 0.05), rr(5.3, 7.2), z + rr(-6, 6)), rr(0.25, 0.5), 8);
    }
    for (let i = 0; i < tops.length - 1; i++) for (const ox of [-0.7, 0, 0.7]) catenary(wires, tops[i].clone().setX(tops[i].x + ox), tops[i + 1].clone().setX(tops[i + 1].x + ox), rr(0.55, 0.9));
    for (let i = 0; i < tops.length; i += 2) catenary(wires, tops[i], V(-s * FRONT, rr(6, 7.5), tops[i].z + rr(-5, 5)), rr(0.8, 1.4), 18);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3));
  scene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#1c1b1a', transparent: true, opacity: 0.85 })));
}

/* ---------- trees: bark trunks and leaf clusters that cast dappled shade ---------- */
function tree(x, z, s = 1, noCollider = false) {
  const h = 3.4 * s, bark = '#9a8a7a';
  B.bark.add(null, x, h / 2, z, 0.45 * s, h, 0.45 * s, bark);
  const n = 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd(), tilt = rr(0.5, 0.8);
    B.bark.add(null, x + Math.cos(a) * 0.55 * s, h + 0.55 * s, z + Math.sin(a) * 0.55 * s, 0.18 * s, 1.7 * s, 0.18 * s, bark, Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
  }
  const cy = h + 1.9 * s;
  for (let i = 0; i < 46; i++) {
    const u = rnd() * Math.PI * 2, v = Math.acos(rr(-0.6, 1)), r = Math.cbrt(rnd());
    const px = x + Math.sin(v) * Math.cos(u) * 3.1 * s * r, py = cy + Math.cos(v) * 1.6 * s * r, pz = z + Math.sin(v) * Math.sin(u) * 3.1 * s * r;
    const k = rr(1.5, 2.3) * s;
    B.leaf.add(null, px, py, pz, k, k, k, pick(['#ffffff', '#e9f0dc', '#dfe6cf', '#f2f2e6']), rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI);
  }
  if (!noCollider) addCollider(null, x - 0.3, z - 0.3, x + 0.3, z + 0.3, { cam: false });
}
function buildTrees() {
  for (const s of [-1, 1]) {
    for (let z = 8 - (s > 0 ? 6.75 : 20.25), i = 0; z > STREET_END + 6; z -= 27, i++) tree(s * 7.35, z, rr(0.85, 1.1));
    for (const z of [12, 18, 24]) tree(s * 13.2, z, rr(0.9, 1.15));
    tree(s * 13, STREET_END - 6, 1.05); tree(s * 12.5, ROAD_Z1 + 6, 0.95);
  }
}

/* ---------- parking, ride stand, and a few cars ---------- */
function planParking() {
  for (const s of [-1, 1]) for (let slot = 0; slot < N_SLOTS; slot++) {
    const zc = shopZ(slot), car = (slot + (s > 0 ? 0 : 1)) % 5 === 3;
    if (car) { parkedSpots.push({ kind: 'car', x: s * 4.75, z: zc + rr(-2, 2), ry: s > 0 ? Math.PI : 0 }); continue; }
    const n = Math.floor(rr(1, 4.2));
    for (let i = 0; i < n; i++) parkedSpots.push({ kind: 'two', x: s * 5.0, z: zc - 4 + i * 1.05 + rr(-0.1, 0.1), ry: (s > 0 ? -Math.PI / 2 : Math.PI / 2) + s * 0.55 });
  }
  /* Faro Rides stand just inside the arch */
  bx(B.paint, null, 9.9, 0.16, 11.2, 10.05, 2.6, 11.35, '#2e2f31');
  bx(B.paint, null, 9.9, 0.16, 20.6, 10.05, 2.6, 20.75, '#2e2f31');
  bx(B.metal, null, 8.4, 2.6, 11, 10.3, 2.68, 21, '#55595c');
  addSign(new THREE.Matrix4().makeRotationY(-Math.PI / 2).setPosition(10.1, 0, 15.9), -Math.PI / 2, signTexture('Faro Rides', 'સ્કૂટર લો', ['#202326', '#d8c08a'], 'serif', { w: 1400, h: 220 }), 0, 2.15, 0, 4.2, 0.66, 0.1);
  for (let i = 0; i < 5; i++) B.small.add(null, 8.1, 0.165, 11.8 + i * 2.1, 3.2, 0.005, 0.06, '#d9d4c6');
  for (let i = 0; i < 4; i++) rideSpots.push({ x: 8.2, z: 12.85 + i * 2.1, ry: -Math.PI / 2 + 0.35, type: i % 2 ? 'bike' : 'scooter', paint: i });
  addCollider(null, 9.85, 11.1, 10.1, 11.4, { cam: false }); addCollider(null, 9.85, 20.5, 10.1, 20.8, { cam: false });
}

/* ---------- merging helpers: many small parts become one mesh ---------- */
function geoParts(root, pre) {
  root.updateMatrixWorld(true);
  const parts = [], m = new THREE.Matrix4();
  root.traverse((o) => {
    if (!o.isMesh || o.userData.skipMerge) return;
    const src = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', src.getAttribute('position').clone());
    g.setAttribute('normal', src.getAttribute('normal').clone());
    g.applyMatrix4(pre ? m.multiplyMatrices(pre, o.matrixWorld) : o.matrixWorld);
    const col = o.userData.c ? new THREE.Color(o.userData.c) : o.material.color;
    const n = g.getAttribute('position').count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    parts.push(g);
  });
  return parts;
}
function mergeGroup(group, material = matVC) {
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const mesh = new THREE.Mesh(mergeGeometries(geoParts(group, inv)), material);
  mesh.castShadow = mesh.receiveShadow = true; return mesh;
}
function kit(g) {
  return (geo, color, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color })); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
}
function buildMannequins() {
  const parts = [];
  for (const m of mannequinSpots) {
    const av = buildAvatar(m.cfg, { mannequin: true });
    new Rig(av).pose(m.p, m.rot, m.scale);
    parts.push(...geoParts(av.root, null));
    av.mats.forEach((mm) => mm.dispose());
  }
  const mesh = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }));
  mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh);
}

function buildWorld() {
  seed = 11;
  B.leaf = new Batch(leafGeo, new THREE.MeshStandardMaterial({ map: leafTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 }));
  buildGround();
  SHOPS.forEach(buildShop);
  let gi = 0;
  for (const s of [-1, 1]) for (let slot = 0; slot < N_SLOTS; slot++) {
    if (SHOPS.some((sh) => sh.side === s && sh.slot === slot)) continue;
    buildGeneric(s, slot, GENERIC[gi++ % GENERIC.length]);
  }
  buildFillers();
  buildBackdrop();
  buildArch();
  buildPoles();
  buildTrees();
  buildLighthouse();
  planParking();
  buildMannequins();
  for (const b of Object.values(B)) b?.build();
  cityBatch.build();
}
