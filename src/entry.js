import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createWorld, updateWorld, QUALITY } from './world.js';
import { INGREDIENTS, GLOW, SHAPE, HUE, ingredientModel, creatureModel } from './models.js';
import { createFX, sparks, goo, puff, updateFX } from './fx.js';
import * as A from './audio.js';
import { T, RECIPES } from './i18n.js';

const ROUND = 60, URL_TXT = '@Frank_AI_Lab';
const $ = id => document.getElementById(id);
const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
let seed = (window.__pmSeed || (Date.now() & 0xffffff)) >>> 0;
function rng() { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const lerp = (a, b, k) => a + (b - a) * k, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOutBack = x => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

const S = {
  state: 'menu', lang: ls.get('pm-lang', 'en'), diff: ls.get('pm-diff', 'medium'), miss: 0, kids: ls.get('pm-kids', '0') === '1', q: ls.get('pm-q', ''), qUser: !!ls.get('pm-q', ''),
  score: 0, time: ROUND, el: 0, combo: 0, maxCombo: 0, brewed: 0, gt: 0, recipe: null, idx: 0, tLimit: 10, tLeft: 10, gap: 0, mix: [], found: new Set(), newBest: false,
  best: +ls.get('pm-best', '0') || 0, name: ls.get('pm-name', 'Player') || 'Player', shake: 0, flash: 0, lastRecipe: -1
};
if (!QUALITY[S.q]) { S.q = 'high'; S.qUser = false; }
A.setClock(() => S.gt);
const DIFF = { easy: { len: 2, hint: 1, t0: 18, t1: 9, mult: 1 }, medium: { len: 3, hint: 3, t0: 13, t1: 5.5, mult: 1 }, hard: { len: 4, hint: 5, t0: 11, t1: 5, mult: 1.5 } };
if (!DIFF[S.diff]) S.diff = 'medium';
const t = k => T[S.lang][k] || T.en[k] || k;

// ---------------- renderer / scene ----------------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .98;
renderer.shadowMap.type = THREE.PCFShadowMap;
const W = createWorld(renderer, QUALITY[S.q]); const scene = W.scene;
const camera = new THREE.PerspectiveCamera(42, 1, .1, 60);
const F = createFX(scene, W.soft, W.smokeTex);
let composer, bloom, bokeh;
function buildComposer() {
  const q = QUALITY[S.q]; if (composer) composer.dispose();
  composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .55 * q.bloom, .5, .82); composer.addPass(bloom);
  bokeh = null; if (q.bokeh) { bokeh = new BokehPass(scene, camera, { focus: 9, aperture: .0009, maxblur: .006 }); composer.addPass(bokeh); }
  composer.addPass(new OutputPass());
}
function applyQuality(qn, user) {
  S.q = qn; if (user) { S.qUser = true; ls.set('pm-q', qn); }
  const q = QUALITY[qn]; renderer.shadowMap.enabled = q.shadows; W.fire.castShadow = q.shadows; if (q.shadows) { W.fire.shadow.mapSize.set(q.shadowSize, q.shadowSize); if (W.fire.shadow.map) { W.fire.shadow.map.dispose(); W.fire.shadow.map = null; } }
  W.candleLights.forEach((c, i) => c.L.visible = i < q.lights);
  scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); });
  buildComposer(); resize(); $('btnQ').textContent = '⚙ ' + t('q_' + qn);
}
let VW = 1, VH = 1;
function resize() {
  VW = window.innerWidth; VH = window.innerHeight; const dpr = Math.min(window.devicePixelRatio || 1, QUALITY[S.q].dpr);
  renderer.setPixelRatio(dpr); renderer.setSize(VW, VH, false); if (composer) { composer.setPixelRatio(dpr); composer.setSize(VW, VH); }
  camera.aspect = VW / VH; layout(); camera.updateProjectionMatrix();
}
// ---------------- camera framing + ingredient slots ----------------
const target = new THREE.Vector3(0, 2.05, .35); let camDist = 8, camY = 4.4;
const slots = [];
function layout() {
  const asp = camera.aspect, portrait = asp < 1;
  camera.fov = asp < .62 ? 58 : portrait ? 50 : 40;
  const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * asp;
  const pos = [];
  if (!portrait) { for (let i = 0; i < 7; i++) { const a = Math.PI / 2 + (i - 3) * .27; pos.push([Math.cos(a) * 3.15, Math.sin(a) * 3.15]); } }
  else { for (let i = 0; i < 4; i++) { const a = Math.PI / 2 + (i - 1.5) * .33; pos.push([Math.cos(a) * 2.85, Math.sin(a) * 2.85]); } for (let i = 0; i < 3; i++) { const a = Math.PI / 2 + (i - 1) * .3; pos.push([Math.cos(a) * 3.85, Math.sin(a) * 3.85]); } }
  const half = Math.max(...pos.map(p => Math.abs(p[0]))) + .45;
  camDist = 3.4 + half / (tanH * .9); camY = 3.4 + camDist * .52;
  slots.length || INGREDIENTS.forEach((k, i) => slots.push({ kind: k, i }));
  ISCALE = portrait ? 1.3 : 1; const LS = portrait ? 1.35 : 1;
  slots.forEach((s, i) => { if (s.label) { const up = portrait && i < 4; s.label.position.set(pos[i][0], W.tableY + (up ? 1.05 : .2), pos[i][1] + (up ? -.1 : .5 * ISCALE)); s.label.scale.set(.96 * LS, .24 * LS, 1); } if (s.pad) s.pad.scale.setScalar(ISCALE); if (s.hit) s.hit.scale.setScalar(ISCALE); s.home = new THREE.Vector3(pos[i][0], W.tableY + .38, pos[i][1]); if (s.obj && !s.busy) s.obj.position.copy(s.home); if (s.pad) s.pad.position.set(pos[i][0], W.tableY + .1, pos[i][1]); if (s.hit) s.hit.position.copy(s.home); });
}
function camUpdate(dt) {
  const sway = Math.sin(S.gt * .13) * .16, bob = Math.sin(S.gt * .21) * .12;
  const off = new THREE.Vector3(Math.sin(sway) * camDist, camY + bob, Math.cos(sway) * camDist);
  camera.position.copy(target).add(off).sub(new THREE.Vector3(0, target.y, 0)).add(new THREE.Vector3(0, 0, target.z * 0));
  camera.position.set(Math.sin(sway) * camDist + target.x, camY + bob, Math.cos(sway) * camDist + target.z * .3);
  if (S.shake > .01) camera.position.add(new THREE.Vector3((rng() - .5), (rng() - .5), (rng() - .5)).multiplyScalar(S.shake * .25));
  camera.lookAt(target); camera.updateMatrixWorld();
  if (bokeh) bokeh.uniforms.focus.value = camera.position.distanceTo(new THREE.Vector3(0, 1.6, 0));
}
// build ingredient objects
const padGeo = new THREE.CircleGeometry(.36, 32); padGeo.rotateX(-Math.PI / 2);
function makeSlotObj(s) { const o = ingredientModel(s.kind); o.userData.kind = s.kind; scene.add(o); return o; }
slots.length || INGREDIENTS.forEach((k, i) => slots.push({ kind: k, i }));
for (const s of slots) {
  s.pad = new THREE.Mesh(padGeo, new THREE.MeshBasicMaterial({ color: GLOW[s.kind], transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(s.pad);
  s.hit = new THREE.Mesh(new THREE.SphereGeometry(.5, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); s.hit.userData.slot = s; scene.add(s.hit);
  s.obj = makeSlotObj(s); s.grow = 1; s.ph = s.i * .9;
  s.label = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, toneMapped: false })); s.label.renderOrder = 5; s.label.scale.set(.96, .24, 1); scene.add(s.label);
}
let ISCALE = 1;
const flying = [];
// recipe-card icons are rendered from the very same 3D ingredient models (so card == table)
const ICON = {};
(function makeIcons() {
  let r; try { r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { return; }
  r.setSize(128, 128, false); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.setClearColor(0, 0);
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight('#ffffff', '#443355', 2.2)); const d = new THREE.DirectionalLight('#fff', 2.5); d.position.set(1, 2, 3); sc.add(d);
  const cam = new THREE.PerspectiveCamera(30, 1, .1, 20); cam.position.set(0, .9, 2.1); cam.lookAt(0, 0, 0);
  for (const k of INGREDIENTS) { const o = ingredientModel(k); o.rotation.y = k === 'eye' ? .5 : .35; sc.add(o); r.render(sc, cam); ICON[k] = r.domElement.toDataURL('image/png'); sc.remove(o); }
  r.dispose(); r.forceContextLoss();
})();
// readable 3D name label under each ingredient
function labelTex(k) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d'); const txt = t(k).toUpperCase();
  let fs = 64; g.font = `700 ${fs}px Fredoka, "Arial Rounded MT Bold", sans-serif`; while (g.measureText(txt).width > 470 && fs > 30) { fs -= 2; g.font = `700 ${fs}px Fredoka, "Arial Rounded MT Bold", sans-serif`; }
  const w = Math.min(500, g.measureText(txt).width + 44); g.fillStyle = 'rgba(10,6,22,.72)'; g.beginPath(); g.roundRect((512 - w) / 2, 18, w, 92, 46); g.fill();
  g.lineWidth = 6; g.strokeStyle = GLOW[k]; g.stroke(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 256, 66);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; return tx;
}
function updateLabels() { for (const s of slots) { if (s.label.material.map) s.label.material.map.dispose(); s.label.material.map = labelTex(s.kind); s.label.material.needsUpdate = true; } }
// ---------------- recipes / game flow ----------------
function newRecipe() {
  let i; do { i = Math.floor(rng() * RECIPES.length); } while (i === S.lastRecipe && RECIPES.length > 1);
  const D = DIFF[S.diff];
  if (!(S.keepMiss && S.recipe)) { const base = RECIPES[i]; let ing = base.ing.slice(0, Math.min(3, D.len)); if (D.len > 3) { const extra = INGREDIENTS.filter(k => !ing.includes(k)); ing = [...ing, extra[Math.floor(rng() * extra.length)]]; } S.lastRecipe = i; S.recipe = { ...base, ing }; S.miss = 0; }
  S.idx = 0; S.keepMiss = false;
  S.tLimit = lerp(D.t0, D.t1, clamp(S.el / ROUND, 0, 1)); S.tLeft = S.tLimit; renderCard(true);
}
const liq = W.liquid.material.uniforms; const baseA = new THREE.Color('#2bff7a'), baseB = new THREE.Color('#0a5a3a');
const tgtA = baseA.clone(), tgtB = baseB.clone();
function setBrew(a, b) { tgtA.set(a); tgtB.set(b); }
function start() {
  A.unlock().then(() => { if (S.state === 'play') A.startMusic(); });
  S.state = 'play'; S.score = 0; S.time = ROUND; S.el = 0; S.combo = 0; S.maxCombo = 0; S.brewed = 0; S.mix = []; S.found = new Set(); S.gap = 0; S.miss = 0; S.keepMiss = false; S.newBest = false;
  setBrew('#2bff7a', '#0a5a3a'); A.sfx.start(S.kids); A.startMusic(); show(null);
  if (!S.kids) newRecipe(); else { S.recipe = null; renderCard(true); }
  hud();
}
function end(reason) {
  if (S.state !== 'play') return; S.state = 'end'; A.stopMusic();
  const val = S.kids ? S.found.size : S.score;
  if (!S.kids && S.score > S.best) { S.best = S.score; S.newBest = S.score > 0; ls.set('pm-best', S.best); }
  A.sfx.end(S.newBest);
  $('eTitle').textContent = S.kids ? t('over') : t('timeUp');
  $('eScore').textContent = S.kids ? `${S.found.size}/8` : S.score;
  $('eBest').textContent = S.kids ? t('kidsCard') : S.newBest ? t('newBest') : t('best') + ': ' + S.best;
  $('eStats').textContent = S.kids ? [...S.found].map(id => RECIPES.find(r => r.id === id)[S.lang]).join(' · ') : `${S.brewed} ${t('brewed')} · ${t('maxCombo')} ${S.maxCombo}`;
  $('eName').value = S.name; show('end'); hud(); $('card').classList.remove('show');
}
function throwIngredient(s, from) {
  if (S.state !== 'play' && S.state !== 'menu') return;
  if (s.busy) return;
  const o = s.obj; s.obj = null; s.busy = true;
  flying.push({ o, kind: s.kind, p0: (from || o.position).clone(), t: 0, dur: from ? .35 : .58, spin: new THREE.Vector3(rng() * 8 - 4, rng() * 8 - 4, rng() * 8 - 4) });
  A.sfx.throw();
  setTimeout0(() => { s.obj = makeSlotObj(s); s.obj.position.copy(s.home); s.grow = 0; s.busy = false; }, .35);
}
const timers = []; function setTimeout0(f, d) { timers.push({ f, t: S.gt + d }); }
function popText(txt, col, big = 1, yOff = 0) {
  const v = new THREE.Vector3(0, 2.7 + yOff, 0).project(camera); const el = document.createElement('div'); el.className = 'pop'; el.textContent = txt;
  el.style.left = ((v.x * .5 + .5) * VW) + 'px'; el.style.top = ((-v.y * .5 + .5) * VH) + 'px'; el.style.color = col; el.style.fontSize = (34 * big) + 'px';
  $('pops').appendChild(el); setTimeout0(() => el.remove(), 1.2);
}
const SURF = new THREE.Vector3(0, 1.75, 0);
function arrive(kind) {
  sparks(F, SURF, 30, { colors: [GLOW[kind], GLOW[kind]], speed: 2.4, life: .7, grav: 6, size: .07 });
  puff(F, SURF, 2, '#cfe', .6);
  if (S.state === 'menu') { A.sfx.drop(false); return; }
  if (S.state !== 'play') return;
  if (S.kids) {
    A.sfx.drop(true); S.mix.push(kind); const lc = new THREE.Color(GLOW[kind]); tgtA.lerp(lc, .5);
    if (S.mix.length === 3) {
      const key = [...S.mix].sort().join(); const r = RECIPES.find(r => [...r.ing].sort().join() === key);
      if (r) { const isNew = !S.found.has(r.id); S.found.add(r.id); complete(r, isNew); }
      else wrong(true);
      S.mix = [];
    }
    renderCard(); return;
  }
  if (!S.recipe || S.gap > 0) { A.sfx.drop(false); return; }
  if (kind === S.recipe.ing[S.idx]) {
    S.idx++; S.score += 10; A.sfx.drop(true); const L = S.recipe.ing.length; tgtA.copy(baseA).lerp(new THREE.Color(S.recipe.a), S.idx / L); tgtB.copy(baseB).lerp(new THREE.Color(S.recipe.b), S.idx / L);
    popText('+10', '#fff', .8, -.2);
    if (S.idx >= S.recipe.ing.length) complete(S.recipe); else renderCard();
  } else wrong(false);
  hud();
}
let creature = null;
function complete(r, isNew = true) {
  const mult = S.kids ? 1 : Math.min(5, 1 + S.combo);
  if (!S.kids) { const pts = Math.round((100 * mult + Math.round(S.tLeft * 10)) * DIFF[S.diff].mult); S.score += pts; S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo); S.brewed++; popText(`${r[S.lang]}! +${pts}`, '#ffe08a', 1.15); if (S.combo > 1) popText(`COMBO ×${Math.min(5, 1 + S.combo)}`, '#d0a0ff', .9, .55); }
  else popText(isNew ? t('found') : r[S.lang], '#ffe08a', 1.1);
  setBrew(r.a, r.b); A.sfx.complete(r.creature, S.combo);
  S.flash = 1; S.shake = .9;
  sparks(F, SURF, Math.round(420 * QUALITY[S.q].parts + 100), { colors: [r.a, '#ffe08a', r.a], speed: 6.5, up: 1.6, cone: .3, life: 1.8, grav: 5, size: .11, spread: .5 });
  setTimeout0(() => sparks(F, SURF, 160, { colors: [r.a, '#fff'], speed: 4, up: 1.4, cone: .7, life: 1.4, grav: 3, size: .12 }), .25);
  if (creature) scene.remove(creature.g);
  const g = creatureModel(r.creature); g.position.set(0, 1.4, 0); g.scale.setScalar(.05); scene.add(g); creature = { g, kind: r.creature, t: 0 };
  if (!S.kids) { S.gap = 1.7; renderCard(false, r); setTimeout0(() => { if (S.state === 'play') newRecipe(); }, 1.7); }
  hud();
}
function wrong(kidsMode) {
  A.sfx.wrong(); S.shake = .5; S.flash = .25;
  goo(F, SURF, kidsMode ? 26 : 46, '#7aff3a'); puff(F, SURF.clone().add(new THREE.Vector3(0, .3, 0)), kidsMode ? 6 : 10, '#7a8a6a', 1.2);
  sparks(F, SURF, 40, { colors: ['#9aff6a', '#4a8a2a'], speed: 3, life: .7, grav: 7, size: .07 });
  setBrew('#7a9a2a', '#2a3a0a'); setTimeout0(() => setBrew('#2bff7a', '#0a5a3a'), 1.4);
  popText(t('wrong'), '#aaff6a', 1.2);
  if (!kidsMode) { S.miss = (S.miss || 0) + 1; S.keepMiss = true; S.combo = 0; S.gap = 1.0; $('card').classList.add('shake'); setTimeout0(() => $('card').classList.remove('shake'), .5); setTimeout0(() => { if (S.state === 'play') newRecipe(); }, 1.0); }
  hud();
}
function expire() { A.sfx.fizzle(); puff(F, SURF, 8, '#6a5a7a'); S.combo = 0; popText(t('tooSlow'), '#c0b0ff'); setBrew('#4a6a5a', '#0a1a1a'); setTimeout0(() => setBrew('#2bff7a', '#0a5a3a'), 1.2); S.gap = .8; setTimeout0(() => { if (S.state === 'play') newRecipe(); }, .8); hud(); }

// ---------------- UI ----------------
function show(id) { for (const s of ['menu', 'end']) $(s).classList.toggle('show', s === id); document.body.dataset.state = S.state; document.body.classList.toggle('kids', S.kids); }
function hud() {
  $('hScore').textContent = S.kids ? `${S.found.size}/8` : S.score; $('hScoreL').textContent = S.kids ? t('secrets') : t('score');
  $('hTime').textContent = Math.ceil(S.time); $('hTimeBox').classList.toggle('warn', S.state === 'play' && S.time <= 10 && !S.kids);
  $('hCombo').textContent = S.combo > 0 ? `×${Math.min(5, 1 + S.combo)}` : '—';
}
function chip(k, state) { return `<span class="ing ${state}" data-k="${k}" style="--c:${GLOW[k]}"><b>${ICON[k] ? `<img src="${ICON[k]}" alt="">` : ''}</b><i>${t(k)}</i></span>`; }
function renderCard(fresh, done) {
  const c = $('card'); c.classList.add('show');
  if (S.kids) {
    const m = S.mix; c.innerHTML = `<div class="ttl">${t('discover')} <em>${S.found.size}/8</em></div><div class="row">${[0, 1, 2].map(i => m[i] ? chip(m[i], 'done') : '<span class="ing empty"><b>?</b><i>&nbsp;</i></span>').join('<span class="plus">+</span>')}</div>`;
    return;
  }
  const r = done || S.recipe; if (!r) return;
  c.innerHTML = `<div class="ttl">${done ? '✨ ' : ''}${r[S.lang]}</div><div class="row">${r.ing.map((k, i) => chip(k, done || i < S.idx ? 'done' : i === S.idx ? 'next' : '')).join('<span class="plus">+</span>')}</div><div class="bar"><div id="bar"></div></div>`;
  if (fresh) { c.classList.remove('in'); void c.offsetWidth; c.classList.add('in'); }
}
function applyLang() {
  document.documentElement.lang = S.lang; document.querySelectorAll('[data-t]').forEach(el => el.textContent = t(el.dataset.t));
  $('h3').textContent = S.kids ? t('h3k') : t('h3'); $('btnLang').textContent = S.lang === 'en' ? 'DE' : 'EN';
  $('btnKids').classList.toggle('on', S.kids); document.querySelectorAll('#diff button').forEach(b => b.classList.toggle('on', b.dataset.d === S.diff)); $('diff').style.display = S.kids ? 'none' : ''; $('btnSound').classList.toggle('on', !A.isMuted()); $('btnQ').textContent = '⚙ ' + t('q_' + S.q); updateLabels();
  if (S.state === 'play') renderCard(); hud();
}
// ---------------- input: tap or drag ----------------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let press = null;
function pick(x, y) { ndc.set(x / VW * 2 - 1, -(y / VH) * 2 + 1); ray.setFromCamera(ndc, camera); const hits = ray.intersectObjects(slots.map(s => s.hit)); return hits.length ? hits[0].object.userData.slot : null; }
function planePoint(x, y, h) { ndc.set(x / VW * 2 - 1, -(y / VH) * 2 + 1); ray.setFromCamera(ndc, camera); const p = new THREE.Vector3(); ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -h), p); return p; }
canvas.addEventListener('pointerdown', e => { A.unlock(); const s = pick(e.clientX, e.clientY); if (s && s.obj && !s.busy) { press = { s, x: e.clientX, y: e.clientY, drag: false }; canvas.setPointerCapture(e.pointerId); } });
canvas.addEventListener('pointermove', e => {
  const s = pick(e.clientX, e.clientY); canvas.style.cursor = s ? 'grab' : 'default'; slots.forEach(q => q.hover = q === s);
  if (!press) return; if (!press.drag && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) press.drag = true;
  if (press.drag && press.s.obj) { const p = planePoint(e.clientX, e.clientY, 2.2); p.x = clamp(p.x, -4, 4); p.z = clamp(p.z, -1.5, 4); press.s.obj.position.lerp(p, .6); press.s.dragging = true; }
});
canvas.addEventListener('pointerup', e => {
  if (!press) return; const s = press.s; s.dragging = false;
  if (!press.drag) throwIngredient(s);
  else if (s.obj) { const p = s.obj.position; if (Math.hypot(p.x, p.z) < 2.0) throwIngredient(s, p.clone()); else s.returning = true; }
  press = null;
});
window.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && S.state === 'menu') { e.preventDefault(); start(); } const n = +e.key; if (n >= 1 && n <= 7 && S.state === 'play') throwIngredient(slots[n - 1]); });
$('btnPlay').onclick = () => start(); $('btnAgain').onclick = () => start();
$('btnMenu').onclick = () => { S.state = 'menu'; A.sfx.ui(); A.stopMusic(); show('menu'); $('card').classList.remove('show'); };
$('btnFinish').onclick = () => end('kids');
$('btnCard').onclick = () => saveCard(false); $('btnShare').onclick = () => saveCard(true);
$('btnLang').onclick = () => { S.lang = S.lang === 'en' ? 'de' : 'en'; ls.set('pm-lang', S.lang); applyLang(); A.sfx.ui(); };
document.querySelectorAll('#diff button').forEach(b => b.onclick = () => { S.diff = b.dataset.d; ls.set('pm-diff', S.diff); applyLang(); A.sfx.ui(); });
$('btnKids').onclick = () => { S.kids = !S.kids; ls.set('pm-kids', S.kids ? '1' : '0'); applyLang(); show('menu'); A.unlock(); A.sfx.ui(); };
$('btnSound').onclick = () => { A.setMuted(!A.isMuted()); applyLang(); };
$('btnQ').onclick = () => { const o = ['low', 'mid', 'high', 'ultra']; applyQuality(o[(o.indexOf(S.q) + 1) % 4], true); };
$('eName').addEventListener('keydown', e => e.stopPropagation());
window.addEventListener('resize', resize);

// ---------------- highscore card ----------------
async function saveCard(share) {
  S.name = ($('eName').value || '').trim() || 'Player'; ls.set('pm-name', S.name);
  try { await document.fonts.load('700 40px Fredoka'); } catch (e) {}
  composer.render(); const src = renderer.domElement;
  const CW = 1080, CH = 1350, c = document.createElement('canvas'); c.width = CW; c.height = CH; const k = c.getContext('2d');
  const sw = src.width, sh = src.height, sc = Math.max(CW / sw, CH / sh); k.drawImage(src, (CW - sw * sc) / 2, (CH - sh * sc) / 2, sw * sc, sh * sc);
  let gr = k.createLinearGradient(0, 0, 0, CH); gr.addColorStop(0, 'rgba(8,4,18,.86)'); gr.addColorStop(.42, 'rgba(8,4,18,.35)'); gr.addColorStop(.7, 'rgba(8,4,18,.2)'); gr.addColorStop(1, 'rgba(8,4,18,.92)'); k.fillStyle = gr; k.fillRect(0, 0, CW, CH);
  const Fo = (w, s) => `${w} ${s}px Fredoka, "Arial Rounded MT Bold", sans-serif`; k.textAlign = 'center';
  k.fillStyle = '#ffd27a'; k.font = Fo(700, 100); k.shadowColor = 'rgba(255,150,40,.7)'; k.shadowBlur = 30; k.fillText('Potion Mixer', CW / 2, 150); k.shadowBlur = 0;
  k.fillStyle = 'rgba(255,255,255,.9)'; k.font = Fo(500, 44); k.fillText(S.name.slice(0, 18), CW / 2, 240);
  k.fillStyle = '#fff'; k.font = Fo(700, 200); k.shadowColor = 'rgba(140,255,180,.8)'; k.shadowBlur = 40; k.fillText(S.kids ? `${S.found.size}/8` : String(S.score), CW / 2, 440); k.shadowBlur = 0;
  k.fillStyle = '#c9f7d8'; k.font = Fo(500, 40); k.fillText(S.kids ? t('kidsCard') : (t('score').toUpperCase() + (S.newBest ? ' · ' + t('newBest') : '')), CW / 2, 505);
  k.fillStyle = 'rgba(255,255,255,.85)'; k.font = Fo(400, 36); k.fillText(S.kids ? '' : `${S.brewed} ${t('brewed')} · ${t('maxCombo')} ${S.maxCombo}`, CW / 2, 565);
  k.fillStyle = '#ffd27a'; k.font = Fo(600, 48); k.fillText(t('cardLine'), CW / 2, 1235);
  k.fillStyle = 'rgba(255,255,255,.8)'; k.font = Fo(400, 34); k.fillText(t('cardCta') + ' · ' + URL_TXT, CW / 2, 1295);
  const blob = await new Promise(r => c.toBlob(r, 'image/png')); window.__pmCard = { w: c.width, h: c.height };
  const file = new File([blob], 'potion-mixer-highscore.png', { type: 'image/png' });
  if (share && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], text: `Potion Mixer: ${S.kids ? S.found.size + '/8' : S.score} — ${t('cardLine')} ${URL_TXT}` }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'potion-mixer-highscore.png'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

// ---------------- simulation ----------------
const _v = new THREE.Vector3();
// solution hints: kids mode always; normal mode only after 3 wrong tries on the same recipe
function hintKinds() {
  const h = new Set(); if (S.state !== 'play' || S.gap > 0) return h;
  if (S.kids) { for (const r of RECIPES) { if (S.found.has(r.id)) continue; const rest = [...r.ing]; let ok = true; for (const m of S.mix) { const j = rest.indexOf(m); if (j < 0) { ok = false; break; } rest.splice(j, 1); } if (ok) { rest.forEach(k => h.add(k)); } } return h; }
  if (S.recipe && S.miss >= DIFF[S.diff].hint) h.add(S.recipe.ing[S.idx]); return h;
}
function step(dt) {
  dt = Math.min(dt, 1 / 20); S.gt += dt;
  for (let i = timers.length - 1; i >= 0; i--) if (timers[i].t <= S.gt) { const f = timers[i].f; timers.splice(i, 1); f(); }
  if (S.state === 'play' && !S.kids) {
    S.el += dt; S.time = Math.max(0, ROUND - S.el);
    if (S.gap > 0) S.gap -= dt; else if (S.recipe) { S.tLeft -= dt; if (S.tLeft <= 0) { S.tLeft = 0; expire(); } }
    const b = $('bar'); if (b) { const k = S.gap > 0 && S.recipe && S.idx >= S.recipe.ing.length ? 1 : S.tLeft / S.tLimit; b.style.transform = `scaleX(${k})`; b.style.background = k < .3 ? '#ff6a5a' : 'linear-gradient(90deg,#7aff9a,#ffe07a)'; }
    if (Math.ceil(S.time) !== lastSec) { lastSec = Math.ceil(S.time); hud(); }
    if (S.time <= 0) end('time');
  }
  // slots
  for (const s of slots) {
    if (!s.obj) continue; s.grow = Math.min(1, s.grow + dt * 3.5);
    if (s.returning) { s.obj.position.lerp(s.home, 1 - Math.exp(-dt * 10)); if (s.obj.position.distanceTo(s.home) < .02) s.returning = false; }
    else if (!s.dragging) { s.obj.position.set(s.home.x, s.home.y + Math.sin(S.gt * 2 + s.ph) * .06 + (s.hover ? .12 : 0), s.home.z); }
    s.obj.rotation.y = S.gt * .6 + s.ph; s.obj.scale.setScalar(easeOutBack(s.grow) * (s.hover ? 1.15 : 1) * ISCALE);
    const next = hintKinds().has(s.kind);
    s.pad.material.opacity = (next ? .55 + .35 * Math.sin(S.gt * 8) : .22) * (s.hover ? 1.6 : 1); s.pad.scale.setScalar((next ? 1.25 : 1) * ISCALE);
  }
  // flying ingredients
  for (let i = flying.length - 1; i >= 0; i--) {
    const f = flying[i]; f.t += dt / f.dur; const k = Math.min(1, f.t);
    _v.copy(f.p0).lerp(SURF, k); _v.y += Math.sin(Math.PI * k) * (f.dur > .4 ? 1.7 : .6); f.o.position.copy(_v);
    f.o.rotation.x += f.spin.x * dt; f.o.rotation.z += f.spin.z * dt; f.o.scale.setScalar(1 - k * .35);
    if (k >= 1) { scene.remove(f.o); flying.splice(i, 1); arrive(f.kind); }
  }
  // creature
  if (creature) {
    const c = creature, g = c.g; c.t += dt; const tt = c.t;
    const rise = Math.min(1, tt / 1.0), s = easeOutBack(rise);
    if (c.kind === 'bats') {
      g.scale.setScalar(Math.max(.05, Math.min(1, tt * 2))); g.position.y = 1.6 + rise * 1.4;
      for (const b of g.userData.bats) { const a = b.userData.a + tt * 2.2, R = b.userData.r * (1 + Math.max(0, tt - 1.6) * 3); b.position.set(Math.cos(a) * R, Math.sin(tt * 3 + b.userData.ph) * .3 + Math.max(0, tt - 1.6) * 2, Math.sin(a) * R); b.rotation.y = -a; const fl = Math.sin(tt * 26 + b.userData.ph) * .9; b.userData.w1.rotation.z = fl; b.userData['w-1'].rotation.z = -fl; }
    } else {
      g.scale.setScalar(Math.max(.05, s * (c.kind === 'ghost' ? .78 : c.kind === 'king' ? 1.15 : 1.05))); g.position.y = 1.4 + s * (c.kind === 'king' ? 1.75 : c.kind === 'frog' ? 1.35 : 1.95) + Math.sin(tt * 2.5) * .08;
      g.rotation.y = Math.sin(tt * 1.6) * .35;
      if (c.kind === 'ghost') { g.userData.arm1.rotation.z = .7 + Math.sin(tt * 6) * .5; g.userData['arm-1'].rotation.z = -.7 - Math.sin(tt * 6) * .5; const sk = g.userData.skirt.attributes.position, s0 = g.userData.skirt0; for (let i = 0; i < sk.count; i++) { const y = s0[i * 3 + 1]; if (y < -.3) { const x = s0[i * 3], z = s0[i * 3 + 2]; sk.setXYZ(i, x * (1 + Math.sin(tt * 5 + Math.atan2(z, x) * 5) * .06), y, z); } } sk.needsUpdate = true; }
      if (c.kind === 'frog') g.position.y += Math.abs(Math.sin(tt * 5)) * .15;
    }
    if (tt > 2.3) { const k = Math.min(1, (tt - 2.3) / .7);
      if (c.kind === 'ghost') { g.position.y += k * 3; g.traverse(o => { if (o.material && o.material.transparent) o.material.opacity = .93 * (1 - k); }); }
      else if (c.kind !== 'bats') g.scale.setScalar(Math.max(.001, 1 - k)); }
    if (tt > 3.1) { scene.remove(c.g); creature = null; }
  }
  // liquid colors, agitation, flashes
  liq.uColA.value.lerp(tgtA, 1 - Math.exp(-dt * 3)); liq.uColB.value.lerp(tgtB, 1 - Math.exp(-dt * 3));
  W.brew.color.copy(liq.uColA.value); liq.uAgit.value = .35 + S.flash * 1.6 + (flying.length ? .2 : 0); liq.uFlash.value = S.flash * .25;
  W.flash.intensity = S.flash * 70; W.flash.color.copy(liq.uColA.value).lerp(new THREE.Color('#fff'), .5);
  if (bloom) bloom.strength = .5 * QUALITY[S.q].bloom + S.flash * .25;
  S.flash *= Math.exp(-dt * 3.2); S.shake *= Math.exp(-dt * 5);
  if (S.state === 'menu' && !window.__pmManual && rng() < dt * .45) throwIngredient(slots[Math.floor(rng() * 7)]);
  updateWorld(W, S.gt, dt, { agit: liq.uAgit.value });
  camUpdate(dt);
  updateFX(F, dt, VH * renderer.getPixelRatio() * .5 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
}
let lastSec = -1;
function render() { composer.render(); }

// ---------------- fps → auto quality ----------------
const fps = { ema: 60, n: 0, acc: 0, frames: 0, checked: 0 };
function fpsTick(dt) { fps.acc += dt; fps.frames++; if (fps.acc >= 1) { const f = fps.frames / fps.acc; fps.ema = fps.n ? fps.ema * .6 + f * .4 : f; fps.n++; fps.acc = 0; fps.frames = 0;
  if (!S.qUser && !window.__pmNoAutoQ && fps.n >= 3 && fps.ema < 42 && S.q !== 'low' && S.gt - fps.checked > 3) { fps.checked = S.gt; const o = ['low', 'mid', 'high', 'ultra']; const nq = o[o.indexOf(S.q) - 1]; applyQuality(nq); toast(`${t('autoQ')} ${t('q_' + nq)} (${Math.round(fps.ema)} fps)`); fps.n = 0; } } }
function toast(s) { const el = $('toast'); el.textContent = s; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2500); }

applyQuality(S.q); applyLang(); show('menu');
let last = performance.now();
function loop(now) { const dt = (now - last) / 1000; last = now; if (!window.__pmManual) { step(dt); render(); fpsTick(dt); } requestAnimationFrame(loop); }
requestAnimationFrame(loop);
window.__pm = { S, start, end, step: (dt, n = 1) => { for (let i = 0; i < n; i++) step(dt); render(); }, log: A.log, quality: q => q ? applyQuality(q, true) : S.q, fps: () => fps.ema,
  throwKind: k => throwIngredient(slots.find(s => s.kind === k)), slotScreen: k => { const s = slots.find(s => s.kind === k); const v = s.home.clone().project(camera); return { x: (v.x * .5 + .5) * VW, y: (-v.y * .5 + .5) * VH, busy: !!s.busy }; },
  ingredientInfo: () => INGREDIENTS.map(k => ({ k, glow: GLOW[k], hue: HUE[k], shape: SHAPE[k], icon: !!ICON[k], label: t(k) })), labelVisible: () => slots.every(s => s.label.visible && s.label.material.map), iscale: () => ISCALE, diff: () => S.diff, hints: () => [...hintKinds()],
  cauldronScreen: () => { const v = SURF.clone().project(camera); return { x: (v.x * .5 + .5) * VW, y: (-v.y * .5 + .5) * VH }; }, recipes: RECIPES, flying: () => flying.length, creature: () => creature && creature.kind, renderer };
try { document.fonts.ready.then(() => updateLabels()); } catch (e) {}
document.body.classList.add('ready');
