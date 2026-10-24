/* ================= SHOP TOGETHER ================= */
/* Friends' phones connect to each other directly (WebRTC). Public relays only help them find each other;
   the room code doubles as the password, so the relays never see what is said. */
const TRYSTERO_URL = 'https://cdn.jsdelivr.net/npm/@trystero-p2p/nostr@0.26.0/+esm';
const APP_ID = 'faro-ahmedabad-gurukul-v2';
const MAX_FRIENDS = 7;
const SITE_URL = location.origin + location.pathname;
const REACTIONS = [
  { t: '❤️', emo: true, label: 'Love it' },
  { t: '👀', emo: true, label: 'Look at this' },
  { t: 'This one?' },
  { t: 'Let’s go inside' },
  { t: 'Over here!' },
];
const group = { room: null, code: null, peers: new Map(), follow: null, joining: false, joinedAt: 0, invited: false, teleported: false, actions: null, sendT: 0, idleT: 0, lastSent: '', slowWarned: false, whereT: 0 };
const shortlist = new Map(); /* shop id → who added it ('' means you) */
const selfBubble = { bubble: null, bubbleT: 0 };
let pendingCode = null, announceT = 0, sheetShop = null;
const noop = () => {};

const genCode = () => { const a = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; const r = crypto.getRandomValues(new Uint8Array(6)); for (const b of r) s += a[b % a.length]; return s; };
const parseCode = (h) => { const m = /^#together-([a-z2-9]{6})$/.exec(h || ''); return m ? m[1] : null; };
const groupLink = () => `${SITE_URL}#together-${group.code}`;
const displayName = () => name.trim().slice(0, 16) || 'Friend';
const cleanName = (n) => String(n ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 16) || 'Friend';
function cleanCfg(c) {
  c = c && typeof c === 'object' ? c : {};
  const ok = (v, list) => (list.includes(v) ? v : list[0]);
  return { outfit: ok(c.outfit, OUTFITS.map((o) => o.id)), primary: ok(c.primary, PRIMARY.map((p) => p[1])), accent: ok(c.accent, ACCENT.map((p) => p[1])), skin: ok(c.skin, SKIN), hair: ok(c.hair, HAIR.map((h) => h[0])) };
}
const friends = () => [...group.peers.values()].filter((p) => p.av);

/* ---------- invite links ---------- */
function checkInvite() {
  pendingCode = parseCode(location.hash);
  if (pendingCode) { ui.inviteNote.hidden = false; $('startBtn').textContent = 'Make your avatar and join'; }
}
function onEnteredStreet() {
  if (pendingCode && !group.room && !group.joining) { const c = pendingCode; pendingCode = null; ui.inviteNote.hidden = true; joinGroup(c, true); }
}
addEventListener('hashchange', () => {
  const c = parseCode(location.hash);
  if (!c || c === group.code) return;
  if (state === 'play') joinGroup(c, true); else checkInvite();
});
addEventListener('pagehide', () => { try { group.room?.leave(); } catch { /* closing anyway */ } });

/* ---------- joining and leaving ---------- */
function startGroup() { joinGroup(genCode(), false); }
async function joinGroup(code, invited) {
  if (group.room || group.joining) await leaveGroup(true);
  Object.assign(group, { code, invited, teleported: false, joining: true, joinedAt: clock, slowWarned: false });
  history.replaceState(null, '', '#together-' + code);
  setStatus(); renderGroupIfOpen();
  let lib;
  try { lib = await import(TRYSTERO_URL); }
  catch { if (group.code === code) { group.joining = false; group.code = null; history.replaceState(null, '', SITE_URL); setStatus(); renderGroupIfOpen(); } toast("Couldn't load group shopping. Check your internet and try again."); return; }
  if (group.code !== code) return;
  let room;
  try {
    room = lib.joinRoom({ appId: APP_ID, password: code }, code, { onJoinError: () => toast("Couldn't connect to that group. Ask your friend for a fresh link.") });
  } catch {
    group.joining = false; group.code = null; setStatus(); renderGroupIfOpen();
    toast("This browser can't do group shopping. Try a recent Chrome or Safari."); return;
  }
  group.room = room; group.joining = false; group.joinedAt = clock;
  const act = (ns, fn) => { const a = room.makeAction(ns); a.onMessage = (d, ctx) => { try { fn(d, ctx.peerId); } catch { /* ignore malformed messages */ } }; return a; };
  group.actions = { hello: act('hello', onHello), pos: act('pos', onPos), react: act('react', onReact), pin: act('pin', onPin) };
  room.onPeerJoin = (id) => { sendHello(id); sendPins(id); sendPos(id); };
  room.onPeerLeave = (id) => removePeer(id, true);
  ui.react.hidden = false;
  setStatus(); renderGroupIfOpen();
  if (invited) toast('Joining your friend’s group…');
}
async function leaveGroup(silent) {
  const room = group.room;
  Object.assign(group, { room: null, code: null, actions: null, follow: null, joining: false });
  for (const id of [...group.peers.keys()]) removePeer(id, false);
  if (room) { try { await room.leave(); } catch { /* already gone */ } }
  history.replaceState(null, '', SITE_URL);
  ui.react.hidden = true; toggleTray(false); setStatus();
  if (!silent) { toast('You left the group'); renderGroupIfOpen(); }
}
function setStatus() {
  const on = !!(group.room || group.joining), n = friends().length;
  ui.groupDot.hidden = !on; ui.groupDot.classList.toggle('wait', on && n === 0);
  $('groupBtn').setAttribute('aria-label', !on ? 'Shop together' : n ? `Shop together: ${n} friend${n > 1 ? 's' : ''} here` : 'Shop together: waiting for friends');
}

/* ---------- messages ---------- */
const send = (ns, data, target) => { if (group.actions) group.actions[ns].send(data, target ? { target } : undefined).catch(noop); };
const sendHello = (target) => send('hello', { v: 1, name: displayName(), cfg }, target);
const sendPins = (target) => { if (shortlist.size) send('pin', { all: [...shortlist.keys()] }, target); };
const posMsg = () => { const v = player.ride; return [+player.pos.x.toFixed(2), +player.pos.z.toFixed(2), +player.y.toFixed(2), +(((player.heading % 6.2832) + 6.2832) % 6.2832).toFixed(3), +(state === 'play' ? player.speed : 0).toFixed(2), v ? (v.type === 'bike' ? 2 : 1) : 0, v ? v.paintIdx : 0, v ? +v.lean.toFixed(3) : 0, v ? +v.steer.toFixed(2) : 0]; };
const sendPos = (target) => send('pos', posMsg(), target);
function groupAnnounce() { if (!group.room) return; clearTimeout(announceT); announceT = setTimeout(() => sendHello(), 300); }

function onHello(d, id) {
  if (!d || typeof d !== 'object') return;
  let p = group.peers.get(id);
  const nc = cleanCfg(d.cfg), nm = cleanName(d.name);
  if (!p) {
    if (group.peers.size >= MAX_FRIENDS) return;
    p = { id, x: 0, z: 0, y: 0, heading: 0, tx: 0, tz: 0, ty: 0, th: 0, ts: 0, seen: false, cfg: null, name: '', av: null, rig: null, tag: null, bubble: null, bubbleT: 0, lastReact: -9, mode: 0, paint: 0, veh: null, lean: 0, tlean: 0, steer: 0, tsteer: 0 };
    group.peers.set(id, p);
    toast(`${nm} joined the group`);
  }
  if (!p.av || JSON.stringify(nc) !== JSON.stringify(p.cfg)) {
    disposePeerAvatar(p);
    p.av = bakeRig(buildAvatar(nc)); p.rig = new Rig(p.av); p.av.root.visible = p.seen; scene.add(p.av.root);
    if (p.seen) p.av.root.position.set(p.x, p.y, p.z);
    if (p.veh) seatPeer(p);
  }
  if (nm !== p.name || !p.tag || p.tag.parent !== p.av.root) {
    if (p.tag) { p.tag.material.map.dispose(); p.tag.material.dispose(); p.tag.removeFromParent(); }
    p.tag = makeTag(nm, nc.primary); p.av.root.add(p.tag);
  }
  p.cfg = nc; p.name = nm;
  setStatus(); renderGroupIfOpen();
}
function onPos(d, id) {
  const p = group.peers.get(id);
  if (!p || !p.av || !Array.isArray(d) || d.length !== 9 || !d.every(Number.isFinite)) return;
  const [x, z, y, h, s, mode, paint, lean, steer] = d;
  setPeerRide(p, clamp(Math.round(mode), 0, 2), clamp(Math.round(paint), 0, PAINTS.length - 1));
  p.tlean = clamp(lean, -0.6, 0.6); p.tsteer = clamp(steer, -1, 1);
  p.tx = clamp(x, -25, 25); p.tz = clamp(z, -115, 30); p.ty = clamp(y, 0, 1); p.th = h; p.ts = clamp(s, 0, 8);
  if (!p.seen || Math.hypot(p.tx - p.x, p.tz - p.z) > 8) { p.x = p.tx; p.z = p.tz; p.y = p.ty; p.heading = p.th; }
  if (!p.seen) {
    p.seen = true; p.av.root.visible = true; setStatus(); renderGroupIfOpen();
    if (group.invited && !group.teleported && state === 'play') { group.teleported = true; goToFriend(p); toast(`You're with ${p.name} now`); }
  }
}
function onReact(d, id) {
  const p = group.peers.get(id), i = d && Number.isInteger(d.i) ? d.i : -1;
  if (!p || !p.av || !REACTIONS[i] || clock - p.lastReact < 0.4) return;
  p.lastReact = clock; showBubble(p, i);
  if (Math.hypot(p.x - player.pos.x, p.z - player.pos.z) > 14) toast(`${p.name}: ${REACTIONS[i].label || REACTIONS[i].t}`);
}
function onPin(d, id) {
  const p = group.peers.get(id); if (!p || !d || typeof d !== 'object') return;
  const valid = (sid) => typeof sid === 'string' && SHOPS.some((s) => s.id === sid);
  if (Array.isArray(d.all)) { let added = 0; for (const sid of d.all.slice(0, SHOPS.length)) if (valid(sid) && !shortlist.has(sid)) { shortlist.set(sid, p.name); added++; } if (!added) return; }
  else {
    if (!valid(d.id)) return;
    const shop = SHOPS.find((s) => s.id === d.id);
    if (d.on === true) { shortlist.set(d.id, p.name); toast(`${p.name} shortlisted ${shop.name}`); }
    else if (d.on === false) { shortlist.delete(d.id); toast(`${p.name} removed ${shop.name} from the shortlist`); }
    else return;
  }
  saveShortlist(); refreshShortlistViews();
}
function removePeer(id, announce) {
  const p = group.peers.get(id); if (!p) return;
  disposePeerAvatar(p); group.peers.delete(id);
  if (group.follow === id) group.follow = null;
  if (announce && p.name) toast(`${p.name} left the group`);
  setStatus(); renderGroupIfOpen();
}
function seatPeer(p) {
  p.veh.root.add(p.av.root);
  p.av.root.position.set(0, p.veh.spec.seat.y + 0.07 - p.av.hipY, p.veh.spec.seat.z); p.av.root.rotation.set(0, 0, 0);
}
function setPeerRide(p, mode, paint) {
  const type = mode === 2 ? 'bike' : 'scooter';
  if (mode && (!p.veh || p.veh.type !== type)) {
    if (p.veh) disposePeerVehicle(p);
    p.veh = assemble(SPEC[type], PAINTS[paint][1], { ownPaint: true }); p.veh.paintIdx = paint; scene.add(p.veh.root); seatPeer(p);
  } else if (!mode && p.veh) { disposePeerVehicle(p); scene.add(p.av.root); p.av.root.rotation.set(0, p.heading, 0); }
  if (p.veh && p.veh.paintIdx !== paint) { p.veh.paintIdx = paint; p.veh.paint.color.set(PAINTS[paint][1]); }
  p.mode = mode;
}
function disposePeerVehicle(p) {
  if (!p.veh) return;
  if (p.av && p.av.root.parent === p.veh.root) scene.add(p.av.root);
  p.veh.meshes.forEach((m) => m.geometry.dispose()); p.veh.paint.dispose(); p.veh.root.removeFromParent(); p.veh = null;
}
function disposePeerAvatar(p) {
  disposePeerVehicle(p);
  if (!p.av) return;
  p.av.root.traverse((o) => { if (o.isMesh) o.geometry.dispose(); if (o.isSprite) { o.material.map?.dispose(); o.material.dispose(); } });
  p.av.root.removeFromParent(); p.av = null; p.tag = null; p.bubble = null;
}

/* ---------- following and meeting up ---------- */
function followTarget() { if (!group.follow) return null; const p = group.peers.get(group.follow); return p && p.seen ? p : null; }
function startFollow(id) { const p = group.peers.get(id); if (!p) return; group.follow = id; closeSheets(); toast(`Following ${p.name}. Move yourself to stop.`); }
function stopFollow() { if (!group.follow) return; group.follow = null; renderGroupIfOpen(); }
function goToFriend(p) {
  if (traveling || !p.seen) return;
  if (player.ride) dismount(true);
  traveling = true; ui.fade.classList.add('on');
  setTimeout(() => {
    const h = p.heading;
    player.pos.set(p.x - Math.sin(h) * 1.4 - Math.cos(h) * 0.9, 0, p.z - Math.cos(h) * 1.4 + Math.sin(h) * 0.9);
    collide(player.pos, 0.34);
    player.vel.set(0, 0); player.turnTo = null; player.heading = h; player.y = groundAt(player.pos.x, player.pos.z);
    cam.yaw = cam.yawT = h + Math.PI; cam.pitch = cam.pitchT = 0.3; cam.cur = 4;
    cam.target.set(player.pos.x, player.y + 1.45, player.pos.z); camTween = null;
    updateNear(true);
    setTimeout(() => { ui.fade.classList.remove('on'); traveling = false; }, 140);
  }, 320);
}
function whereIs(x, z) {
  const r = shopAt(x, z);
  if (r.shop) return (r.inside ? 'Inside ' : 'Outside ') + r.shop.name;
  if (z > 7) return 'At the entrance arch';
  if (z < STREET_END) return 'By the lighthouse';
  return 'On the street';
}

/* ---------- reactions ---------- */
const bubbleTex = new Map();
function bubbleTexture(i) {
  if (bubbleTex.has(i)) return bubbleTex.get(i);
  const r = REACTIONS[i], c = document.createElement('canvas'); c.width = 512; c.height = 160; const g = c.getContext('2d');
  g.font = r.emo ? '92px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif' : '700 60px "Hind Vadodara", system-ui, sans-serif';
  const w = Math.min(500, g.measureText(r.t).width + (r.emo ? 70 : 84)), h = 128, x = (512 - w) / 2, y = 6;
  g.fillStyle = '#fbf1e2'; g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, 64); else g.rect(x, y, w, h); g.fill();
  g.beginPath(); g.moveTo(240, y + h - 2); g.lineTo(256, y + h + 22); g.lineTo(272, y + h - 2); g.fill();
  g.fillStyle = '#16112a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(r.t, 256, y + h / 2 + (r.emo ? 8 : 4));
  const t = canvasTex(c); bubbleTex.set(i, t); return t;
}
function showBubble(p, i) {
  const holder = p || selfBubble, root = p ? p.av?.root : player.av?.root; if (!root) return;
  if (holder.bubble) { holder.bubble.removeFromParent(); holder.bubble.material.dispose(); }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTexture(i), transparent: true, depthWrite: false }));
  s.position.y = 2.7; s.renderOrder = 11; s.scale.set(0.01, 0.01, 1); root.add(s);
  holder.bubble = s; holder.bubbleT = 3.2;
}
function tickBubble(holder, dt) {
  if (!holder.bubble) return;
  holder.bubbleT -= dt;
  if (holder.bubbleT <= 0) { holder.bubble.removeFromParent(); holder.bubble.material.dispose(); holder.bubble = null; return; }
  const k = Math.min(1, (3.2 - holder.bubbleT) / 0.18), pop = k < 1 ? k * (1.15 - 0.15 * k) : 1;
  holder.bubble.scale.set(1.5 * pop, 0.47 * pop, 1);
  holder.bubble.material.opacity = Math.min(1, holder.bubbleT / 0.4);
}
function sendReaction(i) {
  if (!group.room || !REACTIONS[i]) return;
  showBubble(null, i); send('react', { i }); toggleTray(false);
}
function toggleTray(force) {
  const open = force ?? ui.reactTray.hidden;
  if (open && !ui.reactTray.childElementCount) {
    ui.reactTray.innerHTML = REACTIONS.map((r, i) => `<button data-i="${i}" class="${r.emo ? 'emo' : ''}" aria-label="${esc(r.label || r.t)}">${r.t}${isTouch ? '' : `<kbd>${i + 1}</kbd>`}</button>`).join('');
  }
  ui.reactTray.hidden = !open; ui.reactBtn.setAttribute('aria-expanded', String(open));
}
ui.reactBtn.addEventListener('click', () => toggleTray());
ui.reactTray.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) sendReaction(Number(b.dataset.i)); });

/* ---------- shortlist (shared while in a group, saved on this device) ---------- */
const SL_KEY = 'faro-gurukul-shortlist-v1';
function loadShortlist() {
  try { const a = JSON.parse(localStorage.getItem(SL_KEY) || '[]'); if (Array.isArray(a)) for (const id of a) if (SHOPS.some((s) => s.id === id)) shortlist.set(id, ''); } catch { /* storage blocked */ }
}
function saveShortlist() { try { localStorage.setItem(SL_KEY, JSON.stringify([...shortlist.keys()])); } catch { /* storage blocked */ } }
const shortlistLabel = (id) => (shortlist.has(id) ? '★ Shortlisted' : '☆ Shortlist');
function toggleShortlist(id) {
  const on = !shortlist.has(id);
  if (on) shortlist.set(id, ''); else shortlist.delete(id);
  saveShortlist(); send('pin', { id, on });
  if (on && friends().length) toast('Added to your group’s shortlist');
  refreshShortlistViews();
}
function refreshShortlistViews() {
  if (ui.dirSheet.classList.contains('open')) renderDirectory();
  renderGroupIfOpen();
  const b = $('starBtn');
  if (b && sheetShop && ui.shopSheet.classList.contains('open')) {
    const on = shortlist.has(sheetShop.id); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); b.textContent = shortlistLabel(sheetShop.id);
  }
}

/* ---------- the group sheet ---------- */
function openGroup() {
  ui.shopSheet.classList.remove('open'); ui.dirSheet.classList.remove('open');
  renderGroup(); ui.groupSheet.classList.add('open'); renderPrompt();
  ui.groupSheet.querySelector('.close')?.focus({ preventScroll: true });
}
function renderGroupIfOpen() { if (ui.groupSheet.classList.contains('open')) renderGroup(); }
function memberRow(p, you) {
  const c = you ? cfg : p.cfg, nm = you ? `${displayName()} (you)` : p.name;
  const where = you ? whereIs(player.pos.x, player.pos.z) : p.seen ? whereIs(p.x, p.z) : 'Connecting…';
  const actions = you ? '' : `<div class="member-actions">
      <button class="btn" data-act="goto" data-id="${esc(p.id)}" ${p.seen ? '' : 'disabled'}>Go to</button>
      <button class="btn${group.follow === p.id ? ' on' : ''}" data-act="follow" data-id="${esc(p.id)}" aria-pressed="${group.follow === p.id}" ${p.seen ? '' : 'disabled'}>${group.follow === p.id ? 'Following' : 'Follow'}</button>
    </div>`;
  return `<li class="member"><span class="member-av" style="--c:${c.primary};--c2:${c.accent}" aria-hidden="true"></span>
    <div style="min-width:0"><p class="member-name">${esc(nm)}</p><p class="member-sub" data-where="${you ? 'me' : esc(p.id)}">${esc(where)}</p></div>${actions}</li>`;
}
function renderGroup() {
  const head = (eyebrow, title) => `<header class="sheet-head"><p class="eyebrow">${eyebrow}</p><h2>${title}</h2><button class="btn icon close" data-act="close" aria-label="Close">✕</button></header>`;
  if (!group.room && !group.joining) {
    ui.groupSheet.innerHTML = `${head('Shop together', 'Bring your friends')}
    <div class="sheet-body">
      <p style="margin:0;color:var(--chalk-2)">Start a group and share the link. Friends who open it walk the street with you, can follow you into shops, react to outfits and build one shortlist together.</p>
      <ol class="steps"><li>Start a group</li><li>Send the link on WhatsApp</li><li>Shop together, wherever everyone is</li></ol>
      <p class="note">Groups are private: only people with your link can join, up to 8 people. Nobody needs an account.</p>
    </div>
    <footer class="sheet-foot"><button class="btn primary" data-act="start">Start a group</button></footer>`;
    return;
  }
  if (group.joining) {
    ui.groupSheet.innerHTML = `${head('Shop together', 'Connecting…')}<div class="sheet-body"><p class="note">Setting up your group. This takes a few seconds.</p></div>`;
    return;
  }
  const fs = friends(), link = groupLink(), slow = !fs.length && clock - group.joinedAt > 25;
  const wa = 'https://wa.me/?text=' + encodeURIComponent(`Come shop with me on Gurukul Street 🛍️ ${link}`);
  const sl = SHOPS.filter((s) => shortlist.has(s.id));
  ui.groupSheet.innerHTML = `${head(`Your group · ${group.code}`, 'Shop together')}
  <div class="sheet-body">
    <section class="link-box" aria-label="Invite link">
      <span class="link-text" id="groupLinkText">${esc(link)}</span>
      <div class="link-actions">
        <a class="btn primary" href="${esc(wa)}" target="_blank" rel="noopener">Send on WhatsApp</a>
        <button class="btn" data-act="copy">Copy link</button>
        ${navigator.share ? '<button class="btn" data-act="share">Share…</button>' : ''}
      </div>
    </section>
    <section class="sec"><h3>In this group · ${fs.length + 1}</h3>
      <ul class="members">${memberRow(null, true)}${fs.map((p) => memberRow(p, false)).join('')}</ul>
      ${fs.length ? '' : `<p class="note${slow ? ' warn' : ''}" style="margin-top:10px">${slow
        ? 'Taking a while? Phones connect to each other directly, and some mobile networks block that. Try with one phone on Wi-Fi, then open the link again.'
        : 'Waiting for friends to open your link…'}</p>`}
    </section>
    <section class="sec"><h3>Group shortlist · ${sl.length}</h3>
      ${sl.length ? `<ul class="members">${sl.map((s) => `<li class="member"><span class="member-av" style="--c:${CATS[s.cat].color};--c2:${CATS[s.cat].color}" aria-hidden="true"></span>
        <div style="min-width:0"><p class="member-name">${esc(s.name)}</p><p class="member-sub">${esc(CATS[s.cat].label)} · added by ${shortlist.get(s.id) ? esc(shortlist.get(s.id)) : 'you'}</p></div>
        <div class="member-actions"><button class="btn" data-act="shop" data-id="${s.id}">Go</button></div></li>`).join('')}</ul>`
      : '<p class="note">Tap ☆ Shortlist on any shop and it shows up here for everyone in the group.</p>'}
    </section>
    <p class="note">Send reactions with the 😊 button${isTouch ? '' : ', or keys 1 to 5'}. They pop up above your avatar for everyone.</p>
  </div>
  <footer class="sheet-foot"><button class="btn" data-act="leave">Leave group</button></footer>`;
}
ui.groupSheet.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act, p = b.dataset.id ? group.peers.get(b.dataset.id) : null;
  if (act === 'close') closeSheets();
  if (act === 'start') startGroup();
  if (act === 'leave') leaveGroup(false);
  if (act === 'goto' && p) { closeSheets(); goToFriend(p); }
  if (act === 'follow' && p) { if (group.follow === p.id) stopFollow(); else startFollow(p.id); }
  if (act === 'shop') { const shop = SHOPS.find((s) => s.id === b.dataset.id); if (shop) { closeSheets(); travelTo(shop, false, () => openShop(shop)); } }
  if (act === 'copy') {
    const link = groupLink();
    const fallback = () => { const r = document.createRange(); r.selectNodeContents($('groupLinkText')); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast('Link selected. Copy it from here.'); };
    try { navigator.clipboard.writeText(link).then(() => toast('Link copied. Send it to your friends.'), fallback); } catch { fallback(); }
  }
  if (act === 'share') navigator.share({ title: 'Shop with me on Gurukul Street', text: 'Come shop with me on Gurukul Street 🛍️', url: groupLink() }).catch(noop);
});
$('groupBtn').addEventListener('click', openGroup);

/* ---------- per frame ---------- */
function updateGroup(dt) {
  tickBubble(selfBubble, dt);
  if (!group.room) return;
  group.sendT -= dt; group.idleT -= dt;
  if (state === 'play' && group.sendT <= 0) {
    group.sendT = 0.1;
    const msg = posMsg(), key = msg.join(',');
    if (key !== group.lastSent || group.idleT <= 0) { send('pos', msg); group.lastSent = key; group.idleT = 1; }
  }
  const k = 1 - Math.exp(-10 * dt);
  for (const p of group.peers.values()) {
    if (!p.av || !p.seen) continue;
    p.x += (p.tx - p.x) * k; p.z += (p.tz - p.z) * k; p.y += (p.ty - p.y) * k; p.heading += angleDiff(p.heading, p.th) * k;
    p.lean += (p.tlean - p.lean) * k; p.steer += (p.tsteer - p.steer) * k;
    if (p.veh) {
      const v = p.veh; v.root.position.set(p.x, p.y, p.z); v.root.rotation.set(0, p.heading, p.lean);
      if (v.wheelF) { v.wheelF.rotation.x += (p.ts / v.spec.R) * dt; v.wheelR.rotation.x = v.wheelF.rotation.x; v.front.rotation.y = p.steer * 0.35; }
      p.rig.update(dt, 0, 1, v.type, p.steer);
    } else {
      p.av.root.position.set(p.x, p.y, p.z); p.av.root.rotation.y = p.heading;
      p.rig.update(dt, p.ts);
    }
    tickBubble(p, dt);
  }
  if (!friends().length && !group.slowWarned && clock - group.joinedAt > 25) {
    group.slowWarned = true;
    if (ui.groupSheet.classList.contains('open')) renderGroup();
    else if (group.invited) toast('Still connecting to your friend. Some mobile networks block this; try Wi-Fi on one phone.');
  }
  if ((group.whereT -= dt) <= 0 && ui.groupSheet.classList.contains('open')) {
    group.whereT = 1;
    const me = ui.groupSheet.querySelector('[data-where="me"]'); if (me) me.textContent = whereIs(player.pos.x, player.pos.z);
    for (const p of group.peers.values()) { const el = ui.groupSheet.querySelector(`[data-where="${CSS.escape(p.id)}"]`); if (el && p.seen) el.textContent = whereIs(p.x, p.z); }
  }
}

