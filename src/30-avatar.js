
/* ================= AVATARS ================= */
const OUTFITS = [
  { id: 'casual', label: 'Shirt & jeans', sub: 'everyday' },
  { id: 'kurti', label: 'Kurti', sub: 'with palazzo' },
  { id: 'kurta', label: 'Kurta', sub: 'with churidar' },
  { id: 'saree', label: 'Saree', sub: 'with pallu' },
  { id: 'chaniya', label: 'Chaniya choli', sub: 'with dupatta' },
  { id: 'sherwani', label: 'Sherwani', sub: 'with stole' },
];
const PRIMARY = [['Charcoal', '#3a3a3d'], ['Navy', '#26324f'], ['Maroon', '#6b2430'], ['Bottle green', '#2f4a3a'], ['Mustard', '#a8823a'], ['Rust', '#8f4a2e'], ['Teal', '#2f5f60'], ['Dusty rose', '#a8777a'], ['Olive', '#62623a'], ['Ivory', '#e4dccb']];
const ACCENT = [['Antique gold', '#a8884e'], ['Silver', '#a6a9ad'], ['Copper', '#97603f'], ['Off-white', '#e4ddcf'], ['Black', '#1e1d20'], ['Deep red', '#6f2028']];
const SKIN = ['#e6c2a2', '#d6a886', '#c18e6a', '#a67455', '#87593e', '#684332'];
const HAIR = [['short', 'Short'], ['long', 'Long'], ['bun', 'Bun'], ['braid', 'Braid'], ['curly', 'Curly'], ['safo', 'Safo']];
const DENIM = '#3c4a62';

/* geometry is shared between every avatar on the street */
const geoCache = new Map();
const cached = (key, make) => { let g = geoCache.get(key); if (!g) { g = make(); geoCache.set(key, g); } return g; };
const capsule = (r, len) => cached(`cap${r}_${len}`, () => new THREE.CapsuleGeometry(r, len, 6, 16));
const sphere = (r, w = 20, h = 14) => cached(`sph${r}_${w}`, () => new THREE.SphereGeometry(r, w, h));
const cyl = (rt, rb, h, s = 16) => cached(`cyl${rt}_${rb}_${h}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
const box = (x, y, z) => cached(`box${x}_${y}_${z}`, () => new THREE.BoxGeometry(x, y, z));
const torus = (R, r, arc = Math.PI * 2) => cached(`tor${R}_${r}_${arc.toFixed(2)}`, () => new THREE.TorusGeometry(R, r, 8, 36, arc));
const cone = (r, h) => cached(`cone${r}_${h}`, () => new THREE.ConeGeometry(r, h, 12));
const PROF = {
  torso: [[0.001, -0.1], [0.162, -0.1], [0.18, 0.0], [0.163, 0.14], [0.152, 0.24], [0.17, 0.37], [0.188, 0.47], [0.166, 0.555], [0.08, 0.6], [0.045, 0.625]],
  kurtaUp: [[0.196, -0.04], [0.178, 0.14], [0.168, 0.24], [0.186, 0.37], [0.2, 0.47], [0.18, 0.556], [0.09, 0.608], [0.055, 0.63]],
  choli: [[0.177, 0.29], [0.186, 0.37], [0.2, 0.47], [0.18, 0.556], [0.09, 0.608], [0.055, 0.63]],
  kurtaLow: [[0.265, -0.6], [0.242, -0.42], [0.218, -0.2], [0.198, 0.0], [0.188, 0.08]],
  kurtiLow: [[0.27, -0.52], [0.24, -0.34], [0.214, -0.15], [0.196, 0.0], [0.186, 0.08]],
  shirtLow: [[0.206, -0.15], [0.2, -0.04], [0.192, 0.08]],
  sherLow: [[0.28, -0.76], [0.255, -0.5], [0.222, -0.22], [0.198, 0.0], [0.188, 0.08]],
  chaniya: [[0.54, -0.92], [0.48, -0.7], [0.37, -0.38], [0.245, -0.12], [0.188, 0.02], [0.163, 0.14]],
  saree: [[0.33, -0.93], [0.29, -0.6], [0.255, -0.3], [0.212, -0.08], [0.183, 0.06], [0.166, 0.17]],
};
const lathe = (key, seg = 32) => cached(`lathe_${key}`, () => new THREE.LatheGeometry(PROF[key].map(([r, y]) => new THREE.Vector2(r, y)), seg));
const rAt = (key, y) => { const p = PROF[key]; for (let i = 1; i < p.length; i++) { const [r0, y0] = p[i - 1], [r1, y1] = p[i]; if (y >= y0 && y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0); } return p[p.length - 1][0]; };
const capGeo = new THREE.SphereGeometry(0.117, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.53);

/* woven fabric for the lower garment; canvas bottom is the hem */
function fabricTex(kind, primary, accent) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = primary; g.fillRect(0, 0, 256, 256);
  g.globalAlpha = 0.06; for (let y = 0; y < 256; y += 2) { g.fillStyle = (y / 2) % 2 ? '#000' : '#fff'; g.fillRect(0, y, 256, 1); } g.globalAlpha = 1;
  g.globalAlpha = 0.05; for (let x = 0; x < 256; x += 3) { g.fillStyle = (x / 3) % 2 ? '#000' : '#fff'; g.fillRect(x, 0, 1, 256); } g.globalAlpha = 1;
  if (kind === 'chaniya') {
    g.fillStyle = 'rgba(240,230,210,.32)';
    for (let y = 14; y < 190; y += 18) for (let x = ((y / 18) % 2) * 9; x < 256; x += 18) { g.beginPath(); g.arc(x, y, 1.8, 0, 7); g.fill(); }
    g.fillStyle = accent; g.fillRect(0, 112, 256, 4); g.fillRect(0, 198, 256, 58);
    g.fillStyle = primary; for (let x = 0; x < 256; x += 16) { g.beginPath(); g.moveTo(x, 214); g.lineTo(x + 8, 224); g.lineTo(x + 16, 214); g.lineTo(x + 8, 236); g.closePath(); g.fill(); }
    g.fillStyle = 'rgba(235,235,230,.7)'; for (let x = 8; x < 256; x += 16) { g.beginPath(); g.arc(x, 205, 2.4, 0, 7); g.fill(); g.beginPath(); g.arc(x, 247, 2.4, 0, 7); g.fill(); }
  } else if (kind === 'saree') {
    g.fillStyle = accent; g.globalAlpha = 0.55;
    for (let y = 20; y < 200; y += 26) for (let x = ((y / 26) % 2) * 13; x < 256; x += 26) { g.beginPath(); g.ellipse(x, y, 2, 3.4, 0, 0, 7); g.fill(); }
    g.globalAlpha = 1; g.fillRect(0, 214, 256, 42); g.fillStyle = primary; g.fillRect(0, 222, 256, 3); g.fillRect(0, 244, 256, 2);
  } else if (kind === 'sherwani') {
    g.strokeStyle = accent; g.globalAlpha = 0.28; g.lineWidth = 1.2;
    for (let y = 0; y < 256; y += 22) for (let x = ((y / 22) % 2) * 11; x < 256; x += 22) { g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 5, y); g.lineTo(x, y + 6); g.lineTo(x - 5, y); g.closePath(); g.stroke(); }
    g.globalAlpha = 1; g.fillStyle = accent; g.fillRect(0, 244, 256, 12);
  } else if (kind === 'kurta' || kind === 'kurti') {
    g.fillStyle = 'rgba(255,255,255,.05)'; for (let x = 0; x < 256; x += 10) g.fillRect(x, 0, 2, 256);
    g.fillStyle = accent; g.globalAlpha = 0.8; g.fillRect(0, 240, 256, 16); g.globalAlpha = 1;
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(kind === 'chaniya' ? 3 : 2, 1); t.anisotropy = 4; return t;
}

function buildAvatar(cfg, { mannequin = false } = {}) {
  const o = cfg.outfit, prim = cfg.primary, acc = cfg.accent;
  const skirtOutfit = o === 'chaniya' || o === 'saree';
  const mats = [], texs = [];
  const SHEEN = ['sheen', 'sheenRoughness', 'sheenColor'];
  const mat = (opts, physical = false) => {
    if (!(physical && !mannequin)) { opts = { ...opts }; SHEEN.forEach((k) => delete opts[k]); }
    const m = physical && !mannequin ? new THREE.MeshPhysicalMaterial(opts) : new THREE.MeshStandardMaterial(opts); mats.push(m); return m;
  };
  const skin = mat({ color: cfg.skin, roughness: mannequin ? 0.4 : 0.52, ...(mannequin ? {} : { sheen: 0.35, sheenRoughness: 0.7, sheenColor: new THREE.Color('#ffd8c0') }) }, true);
  const silky = o === 'saree' || o === 'sherwani' || o === 'chaniya';
  let fab;
  if (mannequin || o === 'casual') fab = mat({ color: prim, roughness: 0.85, side: THREE.DoubleSide });
  else { const t = fabricTex(o, prim, acc); texs.push(t); fab = mat({ map: t, roughness: silky ? 0.6 : 0.88, side: THREE.DoubleSide, ...(silky ? { sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color(acc) } : {}) }, silky); }
  const plain = mat({ color: prim, roughness: 0.85, ...(silky ? { sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color(acc) } : {}) }, silky);
  const zari = mat({ color: acc, roughness: 0.38, metalness: 0.55 });
  const blouse = mat({ color: acc, roughness: 0.7 });
  const ivory = mat({ color: '#e6dfd1', roughness: 0.88 });
  const denim = mat({ color: DENIM, roughness: 0.92 });
  const palazzo = mat({ color: acc === '#1e1d20' ? '#2a2a2c' : '#e2dccd', roughness: 0.9 });
  const hairM = mat({ color: '#17110e', roughness: 0.42, ...(mannequin ? {} : { sheen: 0.5, sheenRoughness: 0.4, sheenColor: new THREE.Color('#5a4a40') }) }, true);
  const dark = mat({ color: '#140f0d', roughness: 0.3 });
  const white = mat({ color: '#efe9e0', roughness: 0.4 });
  const shoe = mat({ color: o === 'casual' ? '#d6d2ca' : o === 'sherwani' ? acc : '#5a3a22', roughness: 0.6 });

  const root = new THREE.Group();
  const add = (parent, geo, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, c) => {
    const mesh = new THREE.Mesh(geo, m); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true; mesh.receiveShadow = true; if (c) mesh.userData.c = c; parent.add(mesh); return mesh;
  };
  const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

  const hips = grp(root, 0, 0.96, 0);
  const spine = grp(hips);
  add(spine, lathe('torso'), skin, 0, 0, 0, 1, 1, 0.7);

  /* upper garment */
  if (o === 'kurta' || o === 'sherwani' || o === 'kurti' || o === 'casual') {
    add(spine, lathe('kurtaUp'), o === 'casual' ? fab : plain, 0, 0, 0, 1, 1, 0.72, 0, 0, 0, prim);
    if (o === 'casual') {
      for (const s of [-1, 1]) add(spine, box(0.09, 0.012, 0.07), plain, s * 0.05, 0.6, 0.075, 1, 1, 1, 0.5, s * 0.5, s * 0.3);
      for (const y of [0.5, 0.4, 0.3, 0.2]) add(spine, sphere(0.007, 6, 4), white, 0, y, rAt('kurtaUp', y) * 0.72 + 0.004);
    } else {
      add(spine, cyl(0.06, 0.066, 0.07), o === 'kurta' ? zari : plain, 0, 0.6, 0, 1, 1, 0.85);
      if (o === 'sherwani') for (let i = 0; i < 6; i++) { const y = 0.55 - i * 0.1; add(spine, sphere(0.012, 8, 6), zari, 0, y, rAt('kurtaUp', y) * 0.72 + 0.006); }
      else for (const y of [0.53, 0.47, 0.41]) add(spine, sphere(0.009, 8, 6), zari, 0, y, rAt('kurtaUp', y) * 0.72 + 0.008);
    }
  } else {
    add(spine, lathe('choli'), blouse, 0, 0, 0, 1, 1, 0.72);
  }

  /* lower garment, on its own pivot so it can sway */
  const skirt = grp(hips);
  if (o === 'kurta') add(skirt, lathe('kurtaLow'), fab, 0, 0, 0, 1, 1, 0.78, 0, 0, 0, prim);
  else if (o === 'kurti') add(skirt, lathe('kurtiLow'), fab, 0, 0, 0, 1, 1, 0.78, 0, 0, 0, prim);
  else if (o === 'casual') { add(skirt, lathe('shirtLow'), plain, 0, 0, 0, 1, 1, 0.76); }
  else if (o === 'sherwani') { add(skirt, lathe('sherLow'), fab, 0, 0, 0, 1, 1, 0.78, 0, 0, 0, prim); for (const y of [-0.06, -0.18, -0.3]) add(skirt, sphere(0.012, 8, 6), zari, 0, y, rAt('sherLow', y) * 0.78 + 0.006); }
  else if (o === 'chaniya') { add(skirt, lathe('chaniya', 44), fab, 0, 0, 0, 1, 1, 0.82, 0, 0, 0, prim); add(hips, torus(0.166, 0.012), zari, 0, 0.13, 0, 1, 0.72, 1, Math.PI / 2); }
  else { add(skirt, lathe('saree', 40), fab, 0, 0, 0, 1, 1, 0.8, 0, 0, 0, prim); add(spine, box(0.26, 0.62, 0.02), plain, 0.1, 0.24, -0.15, 1, 1, 1, 0.08, 0, -0.12); }
  if (o === 'casual') add(hips, torus(0.19, 0.016), mat({ color: '#3a2a20', roughness: 0.5 }), 0, -0.04, 0, 1, 0.74, 1, Math.PI / 2);
  if (o === 'chaniya' || o === 'saree' || o === 'sherwani' || o === 'kurti') {
    const sash = grp(spine, 0, o === 'saree' ? 0.34 : 0.31, 0);
    sash.rotation.z = o === 'saree' ? -0.62 : 0.62;
    add(sash, torus(0.228, 0.02), o === 'sherwani' ? blouse : o === 'kurti' ? palazzo : plain, 0, 0, 0, 1, 0.74, 1, Math.PI / 2);
  }

  /* neck and head (adult proportions: the head is a little smaller than a cartoon's) */
  add(spine, cyl(0.045, 0.05, 0.14), skin, 0, 0.665, 0);
  const headP = grp(spine, 0, 0.715, 0); headP.scale.setScalar(0.92);
  add(headP, sphere(0.11, 32, 22), skin, 0, 0.11, 0, 0.96, 1.12, 1.03);
  add(headP, sphere(0.06, 16, 12), skin, 0, 0.045, 0.045, 1.25, 0.8, 1.0);
  if (!mannequin) {
    const lip = mat({ color: '#8a4a44', roughness: 0.45 });
    for (const s of [-1, 1]) {
      add(headP, sphere(0.016, 12, 10), white, s * 0.038, 0.126, 0.098, 1.1, 0.75, 0.55);
      add(headP, sphere(0.0095, 10, 8), dark, s * 0.038, 0.126, 0.104, 1, 1, 0.6);
      add(headP, box(0.036, 0.006, 0.01), hairM, s * 0.039, 0.149, 0.1, 1, 1, 1, 0, 0, -s * 0.1);
      add(headP, sphere(0.022, 10, 8), skin, s * 0.104, 0.1, -0.005, 0.5, 1, 0.8);
    }
    add(headP, sphere(0.017, 10, 8), skin, 0, 0.094, 0.11, 0.85, 1.25, 1.1);
    add(headP, sphere(0.012, 10, 8), lip, 0, 0.057, 0.1, 1.8, 0.42, 0.6);
    if (skirtOutfit) add(headP, sphere(0.007, 8, 6), mat({ color: '#9a1f30', roughness: 0.4 }), 0, 0.156, 0.106);
    const h = cfg.hair;
    const cap = (k = 1) => add(headP, capGeo, hairM, 0, 0.118, -0.006, k, 1.1 * k, 1.05 * k, -0.42);
    if (h === 'short') cap();
    if (h === 'long') { cap(); add(headP, sphere(0.12, 20, 14), hairM, 0, -0.02, -0.07, 1.0, 1.9, 0.48); }
    if (h === 'bun') { cap(); add(headP, sphere(0.058, 16, 12), hairM, 0, 0.165, -0.1); add(headP, torus(0.06, 0.011), mat({ color: '#efe9db', roughness: 0.7 }), 0, 0.165, -0.105, 1, 1, 1, 0.4); }
    if (h === 'braid') {
      cap();
      [0.046, 0.044, 0.041, 0.038, 0.034, 0.03, 0.026].forEach((r, i) => add(headP, sphere(r, 12, 10), hairM, 0, 0.05 - i * 0.072, -0.105 - i * 0.006));
      add(headP, sphere(0.02, 10, 8), zari, 0, -0.47, -0.15, 1, 1.6, 1);
    }
    if (h === 'curly') {
      cap(1.03);
      for (let i = 0; i < 16; i++) {
        const ring = i < 6 ? 0.35 : i < 12 ? 0.85 : 1.35, a = (i % 6) / 6 * Math.PI * 2 + ring;
        if (ring > 0.8 && Math.cos(a) > 0.45) continue;
        add(headP, sphere(0.037, 12, 10), hairM, Math.sin(ring) * Math.sin(a) * 0.12, 0.118 + Math.cos(ring) * 0.132, Math.sin(ring) * Math.cos(a) * 0.12 - 0.01);
      }
    }
    if (h === 'safo') {
      const tur = mat({ color: skirtOutfit ? prim : acc, roughness: 0.78 });
      add(headP, sphere(0.135, 24, 16), tur, 0, 0.17, -0.005, 1.06, 0.72, 1.1);
      add(headP, torus(0.118, 0.02), plain, 0, 0.13, 0, 1, 1, 1.05, Math.PI / 2);
      add(headP, box(0.09, 0.32, 0.02), tur, 0, 0.02, -0.13, 1, 1, 1, 0.15);
      add(headP, cone(0.014, 0.11), zari, 0.03, 0.29, 0.07, 1, 1, 1, 0.3);
    }
  }

  /* arms */
  const armUp = skirtOutfit ? blouse : o === 'casual' ? plain : plain, foreArm = skirtOutfit ? skin : o === 'casual' ? skin : plain;
  const mkArm = (s) => {
    const sh = grp(spine, s * 0.212, 0.5, 0);
    add(sh, capsule(0.05, 0.21), armUp, 0, -0.155, 0);
    const el = grp(sh, 0, -0.31, 0);
    add(el, capsule(0.042, 0.19), foreArm, 0, -0.135, 0);
    add(el, sphere(0.045, 14, 10), skin, 0, -0.3, 0.005, 0.82, 1.2, 0.62);
    if (skirtOutfit) { add(el, torus(0.045, 0.008), zari, 0, -0.22, 0, 1, 1, 1, Math.PI / 2); add(el, torus(0.044, 0.008), zari, 0, -0.245, 0, 1, 1, 1, Math.PI / 2); }
    else if (o === 'casual') { if (s < 0) add(el, torus(0.046, 0.01), dark, 0, -0.23, 0, 1, 1, 1, Math.PI / 2); }
    else add(el, torus(0.045, 0.009), zari, 0, -0.24, 0, 1, 1, 1, Math.PI / 2);
    return [sh, el];
  };
  const [shL, elL] = mkArm(1), [shR, elR] = mkArm(-1);

  /* legs */
  const legM = skirtOutfit ? skin : o === 'casual' ? denim : o === 'kurti' ? palazzo : ivory;
  const thighR = o === 'kurti' ? 0.088 : 0.074, shinR = o === 'kurti' ? 0.092 : o === 'casual' ? 0.066 : 0.06;
  const mkLeg = (s) => {
    const hp = grp(hips, s * 0.094, -0.02, 0);
    add(hp, capsule(thighR, 0.3), legM, 0, -0.228, 0);
    const kn = grp(hp, 0, -0.46, 0);
    add(kn, capsule(shinR, 0.33), legM, 0, -0.2, 0);
    add(kn, sphere(0.066, 14, 10), shoe, 0, -0.45, 0.05, 0.85, 0.55, 1.75);
    return [hp, kn];
  };
  const [hpL, knL] = mkLeg(1), [hpR, knR] = mkLeg(-1);

  return { root, hips, spine, headP, shL, elL, shR, elR, hpL, knL, hpR, knR, skirt, mats, texs, skirtOutfit, hipY: 0.96, cfg };
}
function disposeAvatar(av) { av.mats.forEach((m) => m.dispose()); av.texs.forEach((t) => t.dispose()); av.root.removeFromParent(); }

/* bake each bone's meshes into one vertex-coloured mesh: walkers on the street cost ~12 draw calls each */
function bakeRig(av) {
  const pivots = [av.hips, av.spine, av.headP, av.shL, av.elL, av.shR, av.elR, av.hpL, av.knL, av.hpR, av.knR, av.skirt];
  const set = new Set(pivots), m = new THREE.Matrix4();
  av.root.updateMatrixWorld(true);
  for (const pv of pivots) {
    const meshes = [], groups = [];
    const walk = (o) => { for (const ch of o.children) { if (set.has(ch)) continue; if (ch.isMesh) meshes.push(ch); else { groups.push(ch); walk(ch); } } };
    walk(pv);
    if (!meshes.length) continue;
    const inv = new THREE.Matrix4().copy(pv.matrixWorld).invert();
    const parts = meshes.map((o) => {
      const src = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', src.getAttribute('position').clone());
      g.setAttribute('normal', src.getAttribute('normal').clone());
      g.applyMatrix4(m.multiplyMatrices(inv, o.matrixWorld));
      const col = o.userData.c ? new THREE.Color(o.userData.c) : o.material.color, n = g.getAttribute('position').count, arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      return g;
    });
    meshes.forEach((o) => o.removeFromParent()); groups.forEach((g) => g.removeFromParent());
    const merged = new THREE.Mesh(mergeGeometries(parts), matVC); merged.castShadow = true; merged.receiveShadow = true;
    pv.add(merged);
  }
  av.mats.forEach((mm) => mm.dispose()); av.texs.forEach((t) => t.dispose());
  return av;
}

/* procedural walk, idle, wave and a seated riding pose */
const RIDE_POSE = {
  scooter: { thigh: -1.42, knee: 1.25, kneeOut: 0.1, sh: -0.95, shOut: 0.16, el: -0.45, lean: 0.06 },
  bike: { thigh: -1.2, knee: 1.75, kneeOut: 0.05, sh: -1.05, shOut: 0.2, el: -0.55, lean: 0.24 },
};
const mixA = (a, b, t) => a + (b - a) * t;
class Rig {
  constructor(av) { this.av = av; this.phase = rnd() * 6; this.spd = 0; this.t = rnd() * 10; this.wave = 0; this.long = av.skirtOutfit; this.ride = 0; this.rideType = 'scooter'; this.steer = 0; }
  pose(p, rot, scale = 1) {
    const a = this.av;
    a.root.position.copy(p); a.root.rotation.y = rot; a.root.scale.setScalar(scale);
    a.shL.rotation.set(0.05, 0, 0.16); a.shR.rotation.set(-0.2, 0, -0.12); a.elR.rotation.x = -0.5; a.elL.rotation.x = -0.1;
    a.headP.rotation.y = 0.1;
    a.root.updateMatrixWorld(true);
  }
  hello() { this.wave = 2.2; }
  /* riding: 0 = walking, 1 = seated; type picks scooter or motorbike posture */
  update(dt, speed, riding = 0, type = 'scooter', steer = 0) {
    const a = this.av; this.t += dt;
    this.ride = damp(this.ride, riding, 8, dt); this.rideType = type; this.steer = damp(this.steer, steer, 10, dt);
    const r0 = this.ride, walkSpeed = riding ? 0 : speed;
    this.spd = damp(this.spd, walkSpeed, 8, dt);
    const s = this.spd, w = clamp(s / 2.4, 0, 1), r = clamp((s - 3.6) / 2.6, 0, 1), idle = (1 - w) * (1 - r0);
    this.phase += dt * (s > 0.05 ? 3.0 + s * 1.5 : 0);
    const p = this.phase, sp = Math.sin(p), cp = Math.cos(p), k = this.long ? 0.65 : 1;
    const legA = (0.5 + 0.25 * r) * w * k, kA = (0.6 + 0.6 * r) * w * k;
    const armA = (0.38 + 0.4 * r) * w, breath = Math.sin(this.t * 1.8), out = 0.09 + idle * 0.03 + 0.05 * r;
    const R = RIDE_POSE[type] || RIDE_POSE.scooter, st = this.steer;
    a.hpL.rotation.set(mixA(-sp * legA, R.thigh, r0), 0, mixA(0, -R.kneeOut, r0));
    a.hpR.rotation.set(mixA(sp * legA, R.thigh, r0), 0, mixA(0, R.kneeOut, r0));
    a.knL.rotation.x = mixA(kA * Math.pow(Math.max(0, cp), 1.4) + 0.05 * w, R.knee, r0);
    a.knR.rotation.x = mixA(kA * Math.pow(Math.max(0, -cp), 1.4) + 0.05 * w, R.knee, r0);
    a.shL.rotation.set(mixA(sp * armA, R.sh + st * 0.18, r0), 0, mixA(out, R.shOut, r0));
    a.shR.rotation.set(mixA(-sp * armA, R.sh - st * 0.18, r0), 0, mixA(-out, -R.shOut, r0));
    a.elL.rotation.set(mixA(-(0.12 + 0.2 * w + 0.7 * r) - Math.max(0, -sp) * 0.25 * w, R.el, r0), 0, 0);
    a.elR.rotation.set(mixA(-(0.12 + 0.2 * w + 0.7 * r) - Math.max(0, sp) * 0.25 * w, R.el, r0), 0, 0);
    const bob = (Math.abs(cp) - 0.6) * (0.05 * w + 0.05 * r) * (1 - r0);
    a.hips.position.y = a.hipY + bob + breath * 0.003 * idle;
    a.hips.rotation.set(0, sp * 0.1 * w * (1 - r0), Math.sin(this.t * 0.8) * 0.015 * idle);
    a.spine.rotation.set(mixA(0.03 * w + 0.13 * r + breath * 0.012 * idle, R.lean, r0), mixA(-sp * 0.18 * w, -st * 0.1, r0), 0);
    a.headP.rotation.set(-a.spine.rotation.x * 0.7, mixA(Math.sin(this.t * 0.45) * 0.18 * idle + sp * 0.06 * w, st * 0.25, r0), Math.sin(this.t * 0.7) * 0.03 * idle);
    if (a.skirt) {
      a.skirt.rotation.set(mixA(-sp * 0.03 * w + 0.03 * r, -0.55, r0 * (this.long ? 1 : 0.6)), 0, cp * 0.025 * w * (1 - r0));
      const f = 1 + 0.04 * w + 0.06 * r; a.skirt.scale.set(mixA(f, 1.08, r0), mixA(1, this.long ? 0.62 : 0.8, r0), mixA(f, 1.25, r0));
    }
    if (this.wave > 0) {
      this.wave -= dt;
      const e = clamp(Math.min(this.wave * 2.5, (2.2 - this.wave) * 4), 0, 1), sm = e * e * (3 - 2 * e) * (1 - r0);
      a.shR.rotation.x *= 1 - sm; a.shR.rotation.z = THREE.MathUtils.lerp(a.shR.rotation.z, -2.7, sm);
      a.elR.rotation.x *= 1 - sm; a.elR.rotation.z = sm * (-0.45 + Math.sin(this.t * 11) * 0.4);
    }
  }
}
