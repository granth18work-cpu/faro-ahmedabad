/* ---------- boot ---------- */
async function boot() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('600 80px "Cormorant Garamond"'), document.fonts.load('800 40px Archivo'), document.fonts.load('600 40px "Hind Vadodara"', 'ગુરુકુળ'), document.fonts.load('700 40px "Hind Vadodara"')]),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
  } catch { /* fonts are optional */ }
  performance.mark('faro-fonts');
  const saved = loadSaved();
  if (saved && saved.cfg) { cfg = cleanCfg({ ...cfg, ...saved.cfg }); name = saved.name || ''; }
  $('nameInput').value = name;
  /* people download while the street is being built */
  const peopleReady = Promise.all([...new Set([...CROWD, 'm204', cfg.person])].map(loadPerson));
  buildWorld();
  performance.mark('faro-world');
  try { await peopleReady; } catch (e) { $('loaderText').textContent = "Couldn't load the people on the street. Check your connection and reload."; throw e; }
  buildVehicles();
  performance.mark('faro-vehicles');
  spawnNPCs(); initKeeper(); moveKeeper(SHOPS[0]);
  ui.joy.hidden = !isTouch;
  loadShortlist(); checkInvite();
  setPlayerAvatar(); buildCreatorUI(); applySize();
  /* wait for the photo textures and sky lighting so the first view looks finished */
  performance.mark('faro-setup');
  await Promise.race([assetsReady, new Promise((r) => setTimeout(r, 25000))]);
  performance.mark('faro-assets');
  $('loaderText').textContent = 'Almost there…';
  await new Promise((r) => setTimeout(r, 30));
  try { await renderer.compileAsync(scene, camera); } catch { renderer.compile(scene, camera); }
  performance.mark('faro-compiled');
  /* one full frame behind the loader compiles the shadow and post-processing shaders too */
  updateCamera(0.016);
  sun.target.position.set(camera.position.x, 0, camera.position.z); sun.position.copy(sun.target.position).add(SUN_OFFSET); sky.position.copy(camera.position);
  composer.render();
  renderer.getContext().finish();
  performance.mark('faro-rendered');
  await new Promise((r) => { requestAnimationFrame(() => r()); setTimeout(r, 400); });
  performance.mark('faro-warm');
  last = performance.now(); requestAnimationFrame(frame);
  showIntro();
  setTimeout(() => ui.loader.classList.add('done'), 160);
}
boot();
