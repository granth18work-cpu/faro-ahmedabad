
/* ================= VEHICLES ================= */
const PAINTS = [['Pearl white', '#dedcd6'], ['Matte grey', '#5b5e62'], ['Wine red', '#5e1c24'], ['Midnight blue', '#1d2741'], ['Gloss black', '#161618'], ['Sage', '#6f7e6a']];
const VM = {
  dark: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.1 }),
  rubber: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93 }),
  chrome: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.2, metalness: 0.95 }),
  glass: new THREE.MeshStandardMaterial({ color: '#1e2429', roughness: 0.04, metalness: 0.3, transparent: true, opacity: 0.62, envMapIntensity: 1.6 }),
  light: new THREE.MeshBasicMaterial({ vertexColors: true }),
};
const paintCache = new Map();
const paintMat = (hex, shared = true) => {
  if (shared && paintCache.has(hex)) return paintCache.get(hex);
  const m = new THREE.MeshPhysicalMaterial({ vertexColors: true, color: hex, roughness: 0.3, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08 });
  if (shared) paintCache.set(hex, m); return m;
};

/* ---------- a tiny modelling kit: parts tagged by moving piece and material ---------- */
const _vq = new THREE.Quaternion(), _vu = new THREE.Vector3(0, 1, 0), _vd = new THREE.Vector3();
function newSpec(type) {
  const parts = [];
  const P = (part, m, geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1]) => {
    const mx = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scl));
    parts.push({ part, m, geo, color, mx });
  };
  const stick = (part, m, color, a, b, r) => {
    const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b); _vd.subVectors(Bv, A); const len = _vd.length();
    _vq.setFromUnitVectors(_vu, _vd.clone().normalize());
    const mx = new THREE.Matrix4().compose(A.add(Bv).multiplyScalar(0.5), _vq.clone(), new THREE.Vector3(1, len, 1));
    parts.push({ part, m, geo: cylG(r, r, 1, 10), color, mx });
  };
  return { type, parts, P, stick, pivots: null, seat: null };
}
const vgeo = new Map();
const vcache = (k, f) => { if (!vgeo.has(k)) vgeo.set(k, f()); return vgeo.get(k); };
const rbox = (x, y, z, s = 3, r = 0.04) => vcache(`rb${x}_${y}_${z}_${s}_${r}`, () => new RoundedBoxGeometry(x, y, z, s, r));
const boxG = (x, y, z) => vcache(`b${x}_${y}_${z}`, () => new THREE.BoxGeometry(x, y, z));
const cylG = (a, b, h, s = 16) => vcache(`c${a}_${b}_${h}_${s}`, () => new THREE.CylinderGeometry(a, b, h, s));
const torusG = (R, r, arc = Math.PI * 2) => vcache(`t${R}_${r}_${arc}`, () => new THREE.TorusGeometry(R, r, 10, 30, arc));
const sphereG = (r, w = 14, h = 10) => vcache(`s${r}_${w}`, () => new THREE.SphereGeometry(r, w, h));
const capsuleG = (r, l) => vcache(`cap${r}_${l}`, () => new THREE.CapsuleGeometry(r, l, 8, 18));

function wheel(S, part, z, R, spoked) {
  const tireR = R - 0.07;
  S.P(part, 'rubber', torusG(tireR, 0.07), '#191919', [0, R, z], [0, Math.PI / 2, 0]);
  S.P(part, 'dark', cylG(0.045, 0.045, 0.15, 10), '#2a2a2a', [0, R, z], [0, 0, Math.PI / 2]);
  if (spoked) {
    S.P(part, 'chrome', torusG(tireR - 0.045, 0.014), '#a5a7a9', [0, R, z], [0, Math.PI / 2, 0]);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, rr2 = (tireR - 0.05) / 2; S.P(part, 'chrome', cylG(0.004, 0.004, tireR - 0.05, 4), '#b5b7b9', [0, R + Math.cos(a) * rr2, z + Math.sin(a) * rr2], [a, 0, 0]); }
  } else {
    S.P(part, 'chrome', cylG(tireR - 0.04, tireR - 0.04, 0.09, 22), '#8e9194', [0, R, z], [0, 0, Math.PI / 2]);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; S.P(part, 'dark', boxG(0.1, 0.03, tireR - 0.09), '#3a3b3d', [0, R + Math.cos(a) * 0.06, z + Math.sin(a) * 0.06], [a + Math.PI / 2, 0, 0]); }
  }
}
/* side-profile bodies: a 2D silhouette (z forward, y up) extruded to the vehicle's width with rounded edges */
function profileGeo(key, pts, width, bevel = 0.04) {
  return vcache(`prof_${key}_${width}_${bevel}`, () => {
    const sh = new THREE.Shape();
    pts.forEach((p, i) => {
      if (i === 0) sh.moveTo(p[0], p[1]);
      else if (p.length === 4) sh.quadraticCurveTo(p[2], p[3], p[0], p[1]);
      else sh.lineTo(p[0], p[1]);
    });
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.001, width - bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 14, steps: 1 });
    g.translate(0, 0, -(width - bevel * 2) / 2);
    g.rotateY(-Math.PI / 2);
    g.computeVertexNormals();
    return g;
  });
}
function specScooter() {
  const S = newSpec('scooter'), R = 0.27, P = S.P;
  wheel(S, 'wheelR', -0.62, R, false); wheel(S, 'wheelF', 0.6, R, false);
  /* rear body: an egg-shaped shell, wider at the hips, tapering to the tail */
  P('body', 'paint', sphereG(0.5, 32, 22), '#ffffff', [0, 0.6, -0.4], [0.06, 0, 0], [0.42, 0.42, 1.0]);
  P('body', 'paint', sphereG(0.5, 24, 16), '#ffffff', [0, 0.52, -0.08], [0, 0, 0], [0.36, 0.3, 0.42]);
  P('body', 'dark', profileGeo('scooterFloor', [[0.0, 0.29], [0.4, 0.29], [0.43, 0.35], [-0.02, 0.37]], 0.36, 0.02), '#262626', [0, 0, 0]);
  /* leg shield: a curved shell that narrows into the steering column */
  P('body', 'paint', sphereG(0.5, 30, 20), '#ffffff', [0, 0.6, 0.48], [-0.24, 0, 0], [0.5, 0.74, 0.2]);
  P('body', 'paint', cylG(0.09, 0.15, 0.36, 22), '#ffffff', [0, 0.92, 0.5], [-0.3, 0, 0], [1, 1, 0.7]);
  P('body', 'dark', sphereG(0.5, 26, 18), '#2a2a2b', [0, 0.6, 0.44], [-0.24, 0, 0], [0.46, 0.7, 0.16]);
  P('body', 'light', sphereG(0.05), '#ece6d6', [0, 0.84, 0.6], [0, 0, 0], [1.3, 0.5, 0.35]);
  /* seat, grab rail, tail lamp, plate, exhaust */
  P('body', 'dark', profileGeo('scooterSeat', [[-0.66, 0.8], [-0.1, 0.8], [-0.04, 0.85, -0.04, 0.82], [-0.12, 0.92, -0.04, 0.91], [-0.6, 0.92], [-0.72, 0.86, -0.72, 0.92]], 0.32, 0.045), '#1c1b1b', [0, 0, 0]);
  P('body', 'dark', profileGeo('scooterGrab', [[-0.86, 0.82], [-0.7, 0.82], [-0.7, 0.86], [-0.88, 0.86]], 0.3, 0.015), '#1c1b1b', [0, 0, 0]);
  P('body', 'light', sphereG(0.06), '#a8251d', [0, 0.66, -0.88], [0, 0, 0], [1.6, 0.6, 0.4]);
  P('body', 'dark', boxG(0.17, 0.1, 0.01), '#e6e3da', [0, 0.5, -0.86], [0.35, 0, 0]);
  P('body', 'chrome', cylG(0.04, 0.048, 0.4, 14), '#7d8083', [0.17, 0.3, -0.56], [Math.PI / 2, 0, 0]);
  P('body', 'chrome', cylG(0.01, 0.01, 0.3, 6), '#777', [0.15, 0.2, -0.05], [0.9, 0, 0]);
  /* steering: compact rounded handlebar housing with the headlamp, fork and mudguard */
  P('front', 'paint', capsuleG(0.07, 0.36), '#ffffff', [0, 1.07, 0.47], [0, 0, Math.PI / 2], [1, 1, 1.25]);
  P('front', 'paint', sphereG(0.1, 20, 14), '#ffffff', [0, 1.06, 0.53], [0, 0, 0], [1.2, 0.8, 0.9]);
  P('front', 'light', sphereG(0.06), '#f2efe6', [0, 1.07, 0.62], [0, 0, 0], [1.3, 0.75, 0.45]);
  P('front', 'dark', cylG(0.017, 0.017, 0.74, 8), '#1d1d1d', [0, 1.07, 0.43], [0, 0, Math.PI / 2]);
  for (const s of [-1, 1]) {
    P('front', 'dark', cylG(0.021, 0.021, 0.12, 10), '#101010', [s * 0.33, 1.07, 0.43], [0, 0, Math.PI / 2]);
    P('front', 'chrome', cylG(0.007, 0.007, 0.24, 6), '#777', [s * 0.22, 1.18, 0.43], [0, 0, s * 0.35]);
    P('front', 'chrome', sphereG(0.042), '#c9cdd0', [s * 0.27, 1.29, 0.43], [0, 0, 0], [1.4, 0.9, 0.35]);
    P('front', 'light', sphereG(0.022), '#d99a3a', [s * 0.2, 1.06, 0.55], [0, 0, 0], [1.4, 0.8, 0.6]);
  }
  P('front', 'chrome', cylG(0.024, 0.024, 0.55, 10), '#9a9c9e', [0, 0.66, 0.6], [-0.25, 0, 0]);
  P('front', 'paint', profileGeo('scooterFender', [[0.38, 0.46], [0.82, 0.46, 0.6, 0.62], [0.84, 0.5], [0.6, 0.66, 0.84, 0.62], [0.36, 0.5, 0.42, 0.6]], 0.15, 0.025), '#ffffff', [0, 0, 0]);
  S.pivots = { front: new THREE.Vector3(0, 0.6, 0.55), wheelF: new THREE.Vector3(0, R, 0.6), wheelR: new THREE.Vector3(0, R, -0.62) };
  Object.assign(S, { seat: { y: 0.92, z: -0.32 }, R, half: 0.36, len: 0.95, maxV: 12.5, acc: 3.6 });
  return S;
}
function specBike() {
  const S = newSpec('bike'), R = 0.31, P = S.P, st = S.stick;
  wheel(S, 'wheelR', -0.66, R, true); wheel(S, 'wheelF', 0.7, R, true);
  st('body', 'dark', '#1b1b1c', [0, 0.97, 0.5], [0, 0.48, 0.12], 0.03);
  st('body', 'dark', '#1b1b1c', [0, 0.95, 0.42], [0, 0.82, -0.32], 0.026);
  st('body', 'dark', '#1b1b1c', [0, 0.48, 0.12], [0, 0.42, -0.18], 0.03);
  /* fuel tank with knee recesses, side panel and tail */
  P('body', 'paint', profileGeo('bikeTank', [[-0.06, 0.84], [0.42, 0.88], [0.5, 0.98, 0.5, 0.9], [0.3, 1.1, 0.46, 1.08], [0.02, 1.06, 0.12, 1.12], [-0.1, 0.92, -0.08, 1.0]], 0.34, 0.09), '#ffffff', [0, 0, 0]);
  P('body', 'chrome', cylG(0.045, 0.045, 0.02, 14), '#b8bbbe', [0, 1.105, 0.2], [-0.12, 0, 0]);
  P('body', 'paint', profileGeo('bikeSide', [[-0.42, 0.6], [-0.08, 0.6], [-0.06, 0.84], [-0.44, 0.84, -0.3, 0.86]], 0.3, 0.06), '#ffffff', [0, 0, 0]);
  P('body', 'dark', profileGeo('bikeSeat', [[-0.7, 0.82], [-0.06, 0.84], [0.0, 0.88, 0.0, 0.85], [-0.12, 0.93, -0.02, 0.93], [-0.66, 0.92], [-0.76, 0.86, -0.76, 0.92]], 0.28, 0.035), '#1a1919', [0, 0, 0]);
  P('body', 'paint', profileGeo('bikeTail', [[-0.6, 0.74], [-1.0, 0.82, -0.86, 0.72], [-0.98, 0.86], [-0.62, 0.82, -0.82, 0.86]], 0.17, 0.02), '#ffffff', [0, 0, 0]);
  P('body', 'light', rbox(0.14, 0.06, 0.05, 2, 0.015), '#a3231b', [0, 0.84, -0.96]);
  P('body', 'dark', boxG(0.17, 0.1, 0.01), '#e6e3da', [0, 0.7, -1.0], [0.25, 0, 0]);
  P('body', 'chrome', rbox(0.28, 0.3, 0.38, 3, 0.05), '#55585b', [0, 0.42, 0.06]);
  for (let i = 0; i < 4; i++) P('body', 'chrome', boxG(0.3, 0.012, 0.16), '#6b6e71', [0, 0.6 + i * 0.03, 0.15], [-0.3, 0, 0]);
  st('body', 'chrome', '#9fa2a5', [0.12, 0.33, 0.18], [0.2, 0.34, -0.5], 0.028);
  P('body', 'chrome', cylG(0.052, 0.046, 0.36, 14), '#8f9295', [0.2, 0.37, -0.68], [Math.PI / 2 + 0.06, 0, 0]);
  for (const s of [-1, 1]) {
    st('body', 'dark', '#232324', [s * 0.1, 0.42, -0.12], [s * 0.1, R, -0.66], 0.022);
    st('body', 'chrome', '#a7aaad', [s * 0.12, R + 0.08, -0.6], [s * 0.12, 0.8, -0.42], 0.02);
    st('body', 'dark', '#1d1d1d', [s * 0.2, 0.3, -0.05], [s * 0.3, 0.3, -0.05], 0.015);
  }
  P('body', 'dark', rbox(0.06, 0.12, 0.5, 2, 0.02), '#202020', [-0.13, 0.36, -0.36]);
  st('front', 'chrome', '#b0b3b6', [0.09, R, 0.7], [0.09, 1.0, 0.5], 0.024);
  st('front', 'chrome', '#b0b3b6', [-0.09, R, 0.7], [-0.09, 1.0, 0.5], 0.024);
  P('front', 'dark', cylG(0.11, 0.1, 0.13, 20), '#1c1c1c', [0, 0.98, 0.62], [Math.PI / 2, 0, 0]);
  P('front', 'light', cylG(0.094, 0.094, 0.012, 20), '#f1ede2', [0, 0.98, 0.69], [Math.PI / 2, 0, 0]);
  st('front', 'dark', '#161616', [-0.37, 1.11, 0.45], [0.37, 1.11, 0.45], 0.014);
  for (const s of [-1, 1]) {
    P('front', 'dark', cylG(0.02, 0.02, 0.12, 8), '#0f0f0f', [s * 0.36, 1.11, 0.45], [0, 0, Math.PI / 2]);
    st('front', 'chrome', '#777', [s * 0.22, 1.12, 0.45], [s * 0.3, 1.32, 0.44], 0.006);
    P('front', 'chrome', sphereG(0.042), '#c9cdd0', [s * 0.31, 1.34, 0.44], [0, 0, 0], [1.3, 1.0, 0.35]);
  }
  P('front', 'dark', cylG(0.06, 0.06, 0.05, 14), '#151515', [0, 1.1, 0.55], [0.6, 0, 0]);
  P('front', 'paint', profileGeo('bikeFender', [[0.46, 0.6], [0.96, 0.52, 0.74, 0.7], [0.98, 0.56], [0.74, 0.74, 0.98, 0.72], [0.44, 0.64, 0.5, 0.7]], 0.12, 0.02), '#ffffff', [0, 0, 0]);
  S.pivots = { front: new THREE.Vector3(0, 0.95, 0.5), wheelF: new THREE.Vector3(0, R, 0.7), wheelR: new THREE.Vector3(0, R, -0.66) };
  Object.assign(S, { seat: { y: 0.92, z: -0.3 }, R, half: 0.38, len: 1.0, maxV: 16, acc: 4.4 });
  return S;
}
function specCar() {
  const S = newSpec('car'), P = S.P;
  /* hatchback silhouette with wheel arches cut into the sill */
  const arch = (zc) => [[zc - 0.42, 0.3], [zc, 0.7, zc - 0.42, 0.7], [zc + 0.42, 0.3, zc + 0.42, 0.7]];
  P('body', 'paint', profileGeo('carBody', [[-1.9, 0.28], ...arch(-1.22), [0.8, 0.28], ...arch(1.22), [1.9, 0.28], [1.95, 0.55, 1.97, 0.36], [1.75, 0.86, 1.95, 0.8], [0.75, 1.0], [-1.6, 1.02], [-1.92, 0.9, -1.88, 1.0], [-1.95, 0.4, -1.98, 0.6]], 1.7, 0.1), '#ffffff', [0, 0, 0]);
  P('body', 'glass', profileGeo('carGlass', [[0.72, 0.98], [-1.55, 1.0], [-1.66, 1.12], [-1.45, 1.38, -1.6, 1.36], [0.05, 1.42], [0.72, 0.98, 0.5, 1.3]], 1.5, 0.06), '#ffffff', [0, 0, 0]);
  P('body', 'paint', profileGeo('carRoof', [[-1.4, 1.38], [0.05, 1.42], [0.12, 1.44], [-1.42, 1.44]], 1.42, 0.03), '#ffffff', [0, 0.01, 0]);
  for (const z of [1.9, -1.9]) P('body', 'dark', rbox(1.74, 0.2, 0.18, 3, 0.06), '#1f1f21', [0, 0.38, z * 0.995]);
  P('body', 'dark', boxG(0.9, 0.14, 0.03), '#18181a', [0, 0.64, 1.93]);
  for (const s of [-1, 1]) {
    P('body', 'light', rbox(0.34, 0.11, 0.06, 2, 0.02), '#e7e3d8', [s * 0.58, 0.74, 1.88], [0, s * 0.15, 0]);
    P('body', 'light', rbox(0.28, 0.13, 0.06, 2, 0.02), '#7a1a18', [s * 0.62, 0.86, -1.9]);
    P('body', 'dark', rbox(0.1, 0.07, 0.16, 2, 0.02), '#1d1d1f', [s * 0.9, 1.0, 0.58]);
    P('body', 'dark', boxG(0.012, 0.02, 0.22), '#2a2a2c', [s * 0.86, 0.78, -0.2]);
    for (const z of [1.22, -1.22]) {
      P('body', 'rubber', torusG(0.22, 0.09), '#171717', [s * 0.74, 0.31, z], [0, Math.PI / 2, 0]);
      P('body', 'chrome', cylG(0.16, 0.16, 0.14, 22), '#8b8e91', [s * 0.75, 0.31, z], [0, 0, Math.PI / 2]);
      P('body', 'dark', cylG(0.06, 0.06, 0.15, 10), '#3a3b3d', [s * 0.76, 0.31, z], [0, 0, Math.PI / 2]);
    }
  }
  for (const z of [1.94, -1.94]) P('body', 'dark', boxG(0.5, 0.12, 0.02), '#e6e3da', [0, 0.42, z]);
  S.pivots = null; Object.assign(S, { half: 0.9, len: 1.95 });
  return S;
}
function specAuto() {
  const S = newSpec('auto'), P = S.P;
  P('body', 'paint', profileGeo('autoBody', [[-1.2, 0.32], [0.6, 0.32], [1.0, 0.6, 0.95, 0.34], [1.35, 0.7, 1.3, 0.6], [1.4, 1.3, 1.45, 0.9], [1.15, 1.32], [0.85, 0.95, 0.95, 1.0], [-0.9, 0.95], [-1.25, 0.8, -1.2, 0.95]], 1.34, 0.08), '#ffffff', [0, 0, 0]);
  P('body', 'dark', profileGeo('autoCanopy', [[-1.3, 1.0], [-1.3, 1.95, -1.4, 1.5], [0.9, 2.05, -0.3, 2.12], [1.18, 1.85, 1.15, 2.02], [1.0, 1.84], [0.8, 1.94, 0.95, 1.95], [-1.1, 1.88, -0.2, 2.0], [-1.18, 1.0, -1.25, 1.4]], 1.46, 0.05), '#b99634', [0, 0, 0]);
  P('body', 'glass', boxG(1.2, 0.62, 0.04), '#ffffff', [0, 1.55, 1.12], [-0.12, 0, 0]);
  for (const px of [-0.68, 0.68]) P('body', 'dark', cylG(0.03, 0.03, 0.9, 6), '#1c1b20', [px, 1.42, 1.08]);
  P('body', 'dark', boxG(1.2, 0.2, 0.6), '#2a272c', [0, 1.05, -0.55]);
  P('body', 'dark', boxG(1.2, 0.55, 0.1), '#2a272c', [0, 1.32, -0.88]);
  for (const [px, pz] of [[-0.66, -0.75], [0.66, -0.75], [0, 1.25]]) {
    P('body', 'rubber', torusG(0.21, 0.08), '#18171b', [px, 0.29, pz], [0, Math.PI / 2, 0]);
    P('body', 'chrome', cylG(0.13, 0.13, 0.12, 14), '#8f8b96', [px, 0.29, pz], [0, 0, Math.PI / 2]);
  }
  P('body', 'light', sphereG(0.08), '#efe8d4', [0, 1.1, 1.44], [0, 0, 0], [1, 1, 0.6]);
  P('body', 'dark', boxG(0.9, 0.05, 0.05), '#1c1b20', [0, 1.36, 1.0]);
  P('body', 'dark', boxG(0.4, 0.14, 0.02), '#e6e3da', [0, 0.55, -1.27]);
  S.pivots = null; Object.assign(S, { half: 0.78, len: 1.5 });
  return S;
}

const SPEC = { scooter: specScooter(), bike: specBike(), car: specCar(), auto: specAuto() };

/* merge a spec into a few meshes: one per material, per moving part */
function partGeometry(p, origin) {
  const src = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', src.getAttribute('position').clone()); g.setAttribute('normal', src.getAttribute('normal').clone());
  g.applyMatrix4(p.mx); if (origin) g.translate(-origin.x, -origin.y, -origin.z);
  const c = new THREE.Color(p.color), n = g.getAttribute('position').count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}
function assemble(S, paintHex, { single = false, ownPaint = false } = {}) {
  const root = new THREE.Group(); root.rotation.order = 'YXZ';
  const groups = { body: new THREE.Group() }; root.add(groups.body);
  let front = null, wheelF = null, wheelR = null;
  const piv = S.pivots && !single ? S.pivots : null;
  if (piv) {
    front = new THREE.Group(); front.position.copy(piv.front); root.add(front);
    wheelR = new THREE.Group(); wheelR.position.copy(piv.wheelR); root.add(wheelR);
    wheelF = new THREE.Group(); wheelF.position.copy(piv.wheelF).sub(piv.front); front.add(wheelF);
    Object.assign(groups, { front, wheelR, wheelF });
  }
  const origin = { body: null, front: piv?.front, wheelR: piv?.wheelR, wheelF: piv?.wheelF };
  const paint = paintMat(paintHex, !ownPaint);
  const buckets = new Map();
  for (const p of S.parts) {
    const part = piv ? p.part : 'body', key = part + '|' + p.m;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(partGeometry(p, origin[part]));
  }
  const meshes = [];
  for (const [key, list] of buckets) {
    const [part, m] = key.split('|');
    const mesh = new THREE.Mesh(mergeGeometries(list), m === 'paint' ? paint : VM[m]);
    mesh.castShadow = m !== 'glass' && m !== 'light'; mesh.receiveShadow = true;
    groups[part].add(mesh); meshes.push(mesh);
  }
  return { root, front, wheelF, wheelR, paint, meshes, type: S.type, spec: S, speed: 0, steer: 0, lean: 0, spin: 0 };
}

/* ---------- parked vehicles: instanced, a dozen draw calls for the whole street ---------- */
function buildParkedVehicles() {
  const variants = [['scooter', 0], ['scooter', 1], ['scooter', 2], ['scooter', 3], ['bike', 4], ['bike', 2], ['bike', 1]];
  const carColors = ['#c9c7c1', '#4b4f55', '#5a1e22', '#1f2a3d'];
  const groups = new Map();
  for (const sp of parkedSpots) {
    const key = sp.kind === 'car' ? `car|${Math.floor(rnd() * carColors.length)}` : (() => { const [t, pi] = pick(variants); return `${t}|${pi}`; })();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(sp);
    const half = sp.kind === 'car' ? [0.9, 1.95] : [0.35, 0.95];
    addCollider(new THREE.Matrix4().makeRotationY(sp.ry).setPosition(sp.x, 0, sp.z), -half[0], -half[1], half[0], half[1], { cam: false });
  }
  const mx = new THREE.Matrix4();
  for (const [key, spots] of groups) {
    const [t, i] = key.split('|');
    const v = assemble(SPEC[t], t === 'car' ? carColors[+i] : PAINTS[+i][1], { single: true });
    for (const mesh of v.meshes) {
      const inst = new THREE.InstancedMesh(mesh.geometry, mesh.material, spots.length);
      spots.forEach((sp, k) => { mx.makeRotationFromEuler(new THREE.Euler(0, sp.ry, t === 'car' ? 0 : -0.12, 'YXZ')).setPosition(sp.x, groundAt(sp.x, sp.z) + (t === 'car' ? 0 : 0.02), sp.z); inst.setMatrixAt(k, mx); });
      inst.castShadow = mesh.castShadow; inst.receiveShadow = true; inst.computeBoundingSphere(); scene.add(inst);
    }
  }
}

/* ---------- rideable vehicles at the Faro Rides stand ---------- */
const rideables = [];
function buildRideStand() {
  for (const sp of rideSpots) {
    const v = assemble(SPEC[sp.type], PAINTS[sp.paint % PAINTS.length][1], { ownPaint: true });
    v.paintIdx = sp.paint % PAINTS.length;
    v.pos = new THREE.Vector3(sp.x, groundAt(sp.x, sp.z), sp.z); v.heading = sp.ry; v.parkedLean = -0.12;
    v.root.position.copy(v.pos); v.root.rotation.set(0, v.heading, v.parkedLean);
    scene.add(v.root); rideables.push(v);
  }
}
function repaint(v, idx) { v.paintIdx = idx; v.paint.color.set(PAINTS[idx][1]); }
function nearestRideable(p, maxD = 2.2) {
  let best = null, bd = maxD;
  for (const v of rideables) { if (v.rider) continue; const d = Math.hypot(v.pos.x - p.x, v.pos.z - p.z); if (d < bd) { bd = d; best = v; } }
  return best;
}

/* ---------- traffic: drives on the left and loops round both roundabouts ---------- */
const trafficPath = (() => {
  const L = 2.8, F = LIGHTHOUSE.z, E = ENTRY_RB.z;
  const pts = [[-L, E - 12], [-L, F + 18], [-6.0, F + 8], [-7.8, F], [-5.6, F - 6.6], [0, F - 8.6], [5.6, F - 6.6], [7.8, F], [6.0, F + 8], [L, F + 18],
    [L, E - 12], [6.0, E - 6], [7.8, E], [5.6, E + 6.6], [0, E + 8.6], [-5.6, E + 6.6], [-7.8, E], [-6.0, E - 6]].map(([x, z]) => new THREE.Vector3(x, 0, z));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const N = 2400, table = curve.getSpacedPoints(N), len = curve.getLength();
  return { len, at(s, out) { const u = (((s % len) + len) % len) / len * N, i = Math.floor(u), f = u - i; return out.lerpVectors(table[i], table[(i + 1) % N], f); } };
})();
const traffic = [];
function buildTraffic() {
  const kinds = ['scooter', 'bike', 'auto', 'car', 'scooter', 'auto', 'bike', 'car', 'scooter', 'auto', 'car', 'bike', 'scooter', 'car'];
  const carColors = ['#c9c7c1', '#3e4247', '#5a1e22', '#2b3a4a', '#d8d6d0', '#4a3a2a'];
  kinds.forEach((k, i) => {
    const two = k === 'scooter' || k === 'bike';
    const v = assemble(SPEC[k], k === 'auto' ? '#2e5638' : k === 'car' ? pick(carColors) : pick(PAINTS)[1], { single: !two });
    v.s = (i / kinds.length) * trafficPath.len + rr(-6, 6); v.v = 0; v.cruise = k === 'car' ? rr(7, 8.5) : k === 'auto' ? rr(5.5, 7) : rr(7, 9.5);
    v.kind = k; v.radius = two ? 0.6 : k === 'auto' ? 1.0 : 1.3; v.blockedT = 0; v.pos = new THREE.Vector3(); v.heading = 0;
    if (two) {
      const h = makeHuman(CROWD[i % CROWD.length]); v.rig = h.rig; v.rig.ride = 1;
      h.root.position.set(...h.rig.seatOffset(v)); v.root.add(h.root);
    }
    scene.add(v.root); traffic.push(v);
  });
}
function randomRiderCfg() {
  const outfit = pick(['casual', 'casual', 'kurti', 'kurta', 'casual', 'saree']);
  return { outfit, primary: pick(PRIMARY)[1], accent: pick(ACCENT)[1], skin: pick(SKIN), hair: outfit === 'kurti' || outfit === 'saree' ? pick(['bun', 'braid', 'long']) : pick(['short', 'short', 'curly']) };
}
const _tp = new THREE.Vector3(), _tq = new THREE.Vector3();
function obstacleAhead(v, others, obs) {
  let gap = Infinity;
  for (const o of others) { if (o === v) continue; let d = o.s - v.s; if (d < 0) d += trafficPath.len; if (d > 0 && d < gap) gap = d - (o.radius + v.radius); }
  for (const look of [2, 3.5, 5, 6.5, 8]) {
    trafficPath.at(v.s + look, _tp);
    for (const q of obs) if (Math.hypot(q.x - _tp.x, q.z - _tp.z) < q.r + v.radius * 0.7) { gap = Math.min(gap, look - 1.6); break; }
  }
  return gap;
}
let horns = 0;
function updateTraffic(dt, live) {
  const obs = obstacles();
  for (const v of traffic) {
    const gap = obstacleAhead(v, traffic, obs);
    const target = gap < 1.2 ? 0 : gap < 9 ? v.cruise * clamp((gap - 1.2) / 8, 0, 1) : v.cruise;
    v.v = damp(v.v, target, target < v.v ? 5 : 1.4, dt);
    v.s += v.v * dt;
    trafficPath.at(v.s, v.pos); trafficPath.at(v.s + 1.5, _tq);
    const h = Math.atan2(_tq.x - v.pos.x, _tq.z - v.pos.z), yawRate = angleDiff(v.heading, h) / Math.max(dt, 1e-3);
    v.heading = h;
    const two = !!v.rig;
    v.lean = damp(v.lean, two ? clamp(-yawRate * v.v * 0.05, -0.45, 0.45) : 0, 6, dt);
    v.root.position.set(v.pos.x, groundAt(v.pos.x, v.pos.z), v.pos.z); v.root.rotation.set(0, h, v.lean);
    if (v.wheelF) { v.wheelF.rotation.x += (v.v / SPEC[v.kind].R) * dt; v.wheelR.rotation.x = v.wheelF.rotation.x; v.front.rotation.y = clamp(yawRate * 0.15, -0.4, 0.4); }
    if (v.rig) v.rig.update(dt, 0, 1, v.kind, clamp(yawRate * 0.3, -1, 1), v);
    v.blockedT = gap < 3 && v.v < 0.5 ? v.blockedT + dt : 0;
    if (v.blockedT > 1.6 && live) { v.blockedT = -2.5; horns++; Sound.horn(v.pos, v.kind === 'car' ? 330 : v.kind === 'auto' ? 470 : 520); }
  }
}

/* ---------- sound: engine and horn, made in the browser (no audio files) ---------- */
const Sound = (() => {
  let ctx = null, master = null, eng = null, muted = false;
  const ensure = () => {
    if (ctx) return ctx;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination);
    return ctx;
  };
  return {
    get muted() { return muted; },
    toggleMute() { muted = !muted; if (master) master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05); return muted; },
    start(type) {
      if (!ensure()) return; ctx.resume?.();
      this.stop();
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      o1.type = 'sawtooth'; o2.type = 'square'; lp.type = 'lowpass'; lp.frequency.value = type === 'bike' ? 520 : 700; lp.Q.value = 2;
      const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource(); noise.buffer = nb; noise.loop = true; const ng = ctx.createGain(); ng.gain.value = 0.18;
      o1.connect(lp); o2.connect(lp); noise.connect(ng); ng.connect(lp); lp.connect(g); g.connect(master); g.gain.value = 0;
      o1.start(); o2.start(); noise.start(); g.gain.setTargetAtTime(0.05, ctx.currentTime, 0.2);
      eng = { o1, o2, noise, g, lp, type };
    },
    update(speed, throttle) {
      if (!eng) return;
      const base = eng.type === 'bike' ? 30 : 42, f = base + speed * (eng.type === 'bike' ? 5.2 : 6.5) + throttle * 12, t = ctx.currentTime;
      eng.o1.frequency.setTargetAtTime(f, t, 0.08); eng.o2.frequency.setTargetAtTime(f * (eng.type === 'bike' ? 0.5 : 1.01), t, 0.08);
      eng.g.gain.setTargetAtTime(0.035 + Math.min(1, speed / 14) * 0.04 + throttle * 0.02, t, 0.1);
      eng.lp.frequency.setTargetAtTime((eng.type === 'bike' ? 420 : 600) + speed * 40, t, 0.1);
    },
    stop() { if (!eng) return; const e = eng; eng = null; e.g.gain.setTargetAtTime(0, ctx.currentTime, 0.12); setTimeout(() => { try { e.o1.stop(); e.o2.stop(); e.noise.stop(); } catch { /* already stopped */ } }, 600); },
    horn(at, pitch = 440) {
      if (!ctx || muted) return;
      const dist = at ? Math.hypot(at.x - player.pos.x, at.z - player.pos.z) : 0, vol = at ? clamp(1 - dist / 40, 0, 1) * 0.08 : 0.11;
      if (vol <= 0.002) return;
      const t = ctx.currentTime, g = ctx.createGain(), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = pitch * 1.6; bp.Q.value = 0.8;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.setValueAtTime(vol, t + 0.32); g.gain.linearRampToValueAtTime(0, t + 0.4);
      for (const f of [pitch, pitch * 1.26]) { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f; o.connect(bp); o.start(t); o.stop(t + 0.42); }
      bp.connect(g); g.connect(master);
    },
  };
})();

function buildVehicles() {
  buildParkedVehicles();
  buildRideStand();
  buildTraffic();
}
