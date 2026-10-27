
/* ================= REAL PEOPLE: Microsoft Rocketbox avatars (MIT licence) ================= */
const PEOPLE = [
  { id: 'm014', sex: 'm', label: 'Office shirt' },
  { id: 'm012', sex: 'm', label: 'Shirt and khakis' },
  { id: 'm204', sex: 'm', label: 'Kurta pyjama' },
  { id: 'm022', sex: 'm', label: 'Zip jacket' },
  { id: 'f202', sex: 'f', label: 'Salwar suit' },
  { id: 'f002', sex: 'f', label: 'Top and skirt' },
  { id: 'f009', sex: 'f', label: 'Cardigan and trousers' },
  { id: 'f017', sex: 'f', label: 'Long cardigan' },
];
const PERSON_IDS = PEOPLE.map((p) => p.id);
const CROWD = isTouch ? ['m014', 'f202', 'm204'] : ['m014', 'f202', 'm012', 'f009', 'm204'];   /* loaded at start for passers-by (fewer on phones) */
const ANIM_NAMES = {
  m: { idle: 'm_idle_neutral_01', walk: 'm_walk_neutral_01', run: 'm_run_neutral_01', sit: 'm_sit_chair_breathe_01', wave: 'm_wave_01' },
  f: { idle: 'f_idle_neutral_01', walk: 'f_walk_neutral_01', run: 'f_run_neutral_01', sit: 'f_sit_chair_breathe_01', wave: 'f_wave_01' },
};
const fbxLoader = new FBXLoader(manager);
const jsonLoader = new THREE.FileLoader(manager).setResponseType('json');
const personCache = new Map(), clipCache = new Map(), personMatCache = new Map();
const personTex = (file, srgb = true) => { const t = texLoader.load(`assets/people/${file}`); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(4, maxAniso); return t; };
function personMaterial(id, name) {
  const key = id + '|' + name;
  if (personMatCache.has(key)) return personMatCache.get(key);
  let m;
  if (/opacity/i.test(name)) m = new THREE.MeshStandardMaterial({ map: personTex(`${id}_hair.png`), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.55 });
  else if (/head/i.test(name)) m = new THREE.MeshStandardMaterial({ map: personTex(`${id}_head.jpg`), roughness: 0.6 });
  else m = new THREE.MeshStandardMaterial({ map: personTex(`${id}_body.jpg`), roughness: 0.82 });
  personMatCache.set(key, m); return m;
}
function loadClip(name) {
  if (!clipCache.has(name)) clipCache.set(name, jsonLoader.loadAsync(`assets/anim/${name}.json`).then((j) => THREE.AnimationClip.parse(j)));
  return clipCache.get(name);
}
function loadPerson(id) {
  if (!PERSON_IDS.includes(id)) id = PEOPLE[0].id;
  if (personCache.has(id)) return personCache.get(id);
  const meta = PEOPLE.find((p) => p.id === id);
  const names = ANIM_NAMES[meta.sex];
  const pr = Promise.all([fbxLoader.loadAsync(`assets/people/${id}.fbx`), ...Object.values(names).map(loadClip)]).then(([obj, ...clips]) => {
    obj.animations = [];
    obj.traverse((o) => {
      if (!o.isSkinnedMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      o.material = mats.map((mm) => personMaterial(id, mm.name));
      o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
    });
    obj.scale.setScalar(0.01);
    const anims = {}; Object.keys(names).forEach((k, i) => { anims[k] = clips[i]; });
    const p = { id, sex: meta.sex, template: obj, anims, sit: null };
    p.ready = true; personReady.set(id, p);
    return p;
  });
  personCache.set(id, pr); return pr;
}
const personReady = new Map();

/* one person on the street: a cloned skinned model plus its animation rig */
function makeHuman(id) {
  const P = personReady.get(id) || personReady.get(CROWD[0]);
  const model = SkeletonUtils.clone(P.template);
  const root = new THREE.Group(); root.add(model);
  const h = { root, model, person: P, id: P.id, hipY: 0, mats: [], texs: [] };
  h.rig = new HumanRig(h);
  return h;
}
function disposeHuman(h) { if (!h) return; h.rig?.mixer.stopAllAction(); h.root.removeFromParent(); }

const _ikS = new THREE.Vector3(), _ikE = new THREE.Vector3(), _ikH = new THREE.Vector3(), _ikT = new THREE.Vector3(), _ikP = new THREE.Vector3();
const _ikD = new THREE.Vector3(), _ikN = new THREE.Vector3(), _ikQ = new THREE.Quaternion(), _ikW = new THREE.Quaternion(), _ikPQ = new THREE.Quaternion(), _ikE2 = new THREE.Vector3();
/* rotate a bone in world space so that its child moves from direction `from` to direction `to` */
function rotateBoneWorld(bone, from, to, weight) {
  _ikQ.setFromUnitVectors(from, to);
  if (weight < 1) _ikQ.slerp(_ikW.identity(), 1 - weight);
  bone.getWorldQuaternion(_ikW); bone.parent.getWorldQuaternion(_ikPQ);
  bone.quaternion.copy(_ikPQ.invert().multiply(_ikQ.multiply(_ikW)));
  bone.updateMatrixWorld(true);
}
/* two-bone reach: shoulder, elbow, hand toward a target, elbow bent toward a pole */
function reach(up, fore, hand, target, pole, weight) {
  up.getWorldPosition(_ikS); fore.getWorldPosition(_ikE); hand.getWorldPosition(_ikH);
  const a = _ikS.distanceTo(_ikE), b = _ikE.distanceTo(_ikH);
  _ikD.subVectors(target, _ikS); const d = clamp(_ikD.length(), 0.05, (a + b) * 0.995); _ikD.normalize();
  const cosA = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  _ikN.subVectors(pole, _ikS); _ikN.addScaledVector(_ikD, -_ikN.dot(_ikD)).normalize();
  _ikE2.copy(_ikS).addScaledVector(_ikD, a * cosA).addScaledVector(_ikN, a * sinA);
  rotateBoneWorld(up, _ikT.subVectors(_ikE, _ikS).normalize(), _ikP.subVectors(_ikE2, _ikS).normalize(), weight);
  fore.getWorldPosition(_ikE); hand.getWorldPosition(_ikH);
  rotateBoneWorld(fore, _ikT.subVectors(_ikH, _ikE).normalize(), _ikP.subVectors(target, _ikE).normalize(), weight);
}
const GRIPS = { scooter: [0.31, 1.07, 0.43], bike: [0.34, 1.11, 0.45] };
const _grip = new THREE.Vector3(), _pole = new THREE.Vector3();
function gripWorld(v, side, out) {
  const [gx, gy, gz] = GRIPS[v.type] || GRIPS.scooter, pv = v.spec.pivots?.front;
  if (v.front && pv) return v.front.localToWorld(out.set(side * gx, gy - pv.y, gz - pv.z));
  return v.root.localToWorld(out.set(side * gx, gy, gz));
}

class HumanRig {
  constructor(h) {
    this.h = h; const P = h.person; this.mixer = new THREE.AnimationMixer(h.model);
    this.a = {}; this.w = { idle: 1, walk: 0, run: 0, sit: 0 };
    for (const k of ['idle', 'walk', 'run', 'sit']) {
      const act = this.mixer.clipAction(P.anims[k]); act.play(); act.setEffectiveWeight(k === 'idle' ? 1 : 0);
      if (k === 'idle' || k === 'sit') act.setLoop(THREE.LoopPingPong, Infinity);
      act.time = Math.random() * P.anims[k].duration; this.a[k] = act;
    }
    this.a.wave = this.mixer.clipAction(P.anims.wave); this.a.wave.setLoop(THREE.LoopOnce, 1); this.a.wave.clampWhenFinished = false;
    this.waveT = 0; this.spd = 0; this.ride = 0; this.vehicle = null;
    const m = h.model, g = (n) => m.getObjectByName(n);
    this.b = { lUp: g('Bip01_L_UpperArm'), lFore: g('Bip01_L_Forearm'), lHand: g('Bip01_L_Hand'), rUp: g('Bip01_R_UpperArm'), rFore: g('Bip01_R_Forearm'), rHand: g('Bip01_R_Hand'), pelvis: g('Bip01_Pelvis') };
    if (!P.sit) P.sit = this.measureSit();
  }
  /* where the pelvis sits in the seated pose, so the person can be placed on a seat */
  measureSit() {
    for (const k of ['idle', 'walk', 'run']) this.a[k].setEffectiveWeight(0);
    this.a.sit.setEffectiveWeight(1); this.a.sit.time = 0; this.mixer.update(0);
    this.h.root.updateMatrixWorld(true);
    const p = this.b.pelvis.getWorldPosition(new THREE.Vector3()), r = this.h.root.getWorldPosition(new THREE.Vector3());
    this.a.sit.setEffectiveWeight(0); this.a.idle.setEffectiveWeight(1);
    return { y: p.y - r.y, z: p.z - r.z };
  }
  seatOffset(v) { const S = v.spec.seat, P = this.h.person.sit; return [0, S.y + 0.1 - P.y, S.z - P.z - 0.05]; }
  hello() { const w = this.a.wave; w.reset(); w.setEffectiveWeight(1); w.fadeIn(0.25); w.play(); this.waveT = w.getClip().duration; }
  update(dt, speed, riding = 0, type = 'scooter', steer = 0, vehicle = null) {
    this.vehicle = vehicle;
    this.ride = damp(this.ride, riding ? 1 : 0, 9, dt);
    this.spd = damp(this.spd, riding ? 0 : speed, 9, dt);
    const s = this.spd, run = clamp((s - 2.6) / 1.4, 0, 1), walk = clamp(s / 0.5, 0, 1) * (1 - run), idle = 1 - Math.max(walk, run), stand = 1 - this.ride;
    this.a.idle.setEffectiveWeight(idle * stand); this.a.walk.setEffectiveWeight(walk * stand); this.a.run.setEffectiveWeight(run * stand); this.a.sit.setEffectiveWeight(this.ride);
    this.a.walk.timeScale = clamp(s / 1.35, 0.5, 1.9); this.a.run.timeScale = clamp(s / 3.8, 0.6, 1.5);
    if (this.waveT > 0) { this.waveT -= dt; if (this.waveT < 0.35 && this.waveT + dt >= 0.35) this.a.wave.fadeOut(0.35); }
    this.mixer.update(dt);
    if (this.ride > 0.02 && vehicle && this.b.lUp) {
      this.h.root.updateMatrixWorld(true);
      for (const side of [1, -1]) {
        const up = side > 0 ? this.b.lUp : this.b.rUp, fore = side > 0 ? this.b.lFore : this.b.rFore, hand = side > 0 ? this.b.lHand : this.b.rHand;
        gripWorld(vehicle, side, _grip);
        vehicle.root.localToWorld(_pole.set(side * 0.75, 0.75, -0.35));
        reach(up, fore, hand, _grip, _pole, this.ride);
      }
    }
  }
}
