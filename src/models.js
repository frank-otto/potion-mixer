// 3D ingredient and creature models (procedural, PBR)
import * as THREE from 'three';
const S = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .5, ...o });
function shadow(g) { g.traverse(o => { if (o.isMesh) { o.castShadow = true; } }); return g; }
function eyeTexture(iris) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#f4efe6'; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = 'rgba(200,30,40,.55)'; for (let i = 0; i < 26; i++) { g.lineWidth = .6 + Math.random() * 1.2; g.beginPath(); let x = Math.random() * 256, y = Math.random() < .5 ? 2 : 126; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (Math.random() - .5) * 30; y += (y < 64 ? 1 : -1) * 8; g.lineTo(x, y); } g.stroke(); }
  const cx = 192, cy = 64; let gr = g.createRadialGradient(cx, cy, 4, cx, cy, 30); gr.addColorStop(0, iris); gr.addColorStop(.8, iris); gr.addColorStop(1, '#2a1a10');
  g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, 24, 46, 0, 0, 7); g.fill();
  g.fillStyle = '#050505'; g.beginPath(); g.ellipse(cx, cy, 10, 20, 0, 0, 7); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function ribbed(radius, ribs = 10, amp = .08, col = '#ff7a1a') {
  const geo = new THREE.SphereGeometry(radius, 48, 32); const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const a = Math.atan2(v.z, v.x); const k = 1 - amp * Math.pow(Math.abs(Math.cos(a * ribs / 2)), .6); v.x *= k; v.z *= k; v.y *= .78; p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals(); return new THREE.Mesh(geo, S(col, { roughness: .45 }));
}
export function frogModel(scale = 1, crown = false) {
  const g = new THREE.Group(), skin = S('#3fae3a', { roughness: .35 }), belly = S('#b8e07a', { roughness: .5 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.5, 32, 24), skin); body.scale.set(1.1, .72, 1); g.add(body);
  const bel = new THREE.Mesh(new THREE.SphereGeometry(.42, 24, 16), belly); bel.scale.set(.9, .55, .7); bel.position.set(0, -.08, .2); g.add(bel);
  for (const s of [-1, 1]) {
    const eb = new THREE.Mesh(new THREE.SphereGeometry(.17, 20, 16), skin); eb.position.set(s * .25, .3, .22); g.add(eb);
    const ew = new THREE.Mesh(new THREE.SphereGeometry(.13, 20, 16), S('#f6f0d0', { roughness: .2 })); ew.position.set(s * .27, .34, .3); g.add(ew);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(.07, 16, 12), S('#0a0a0a', { roughness: .1 })); pu.position.set(s * .28, .36, .41); g.add(pu);
    const leg = new THREE.Mesh(new THREE.SphereGeometry(.2, 16, 12), skin); leg.scale.set(1, .5, 1.4); leg.position.set(s * .45, -.25, .05); g.add(leg);
    const arm = new THREE.Mesh(new THREE.SphereGeometry(.09, 12, 10), skin); arm.scale.set(1, .6, 1.6); arm.position.set(s * .3, -.3, .38); g.add(arm);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(.2, .018, 8, 24, Math.PI), S('#1a3a10')); mouth.position.set(0, .05, .44); mouth.rotation.z = Math.PI; g.add(mouth);
  if (crown) g.add(crownModel(.3, .55));
  g.scale.setScalar(scale); return shadow(g);
}
export function crownModel(r, y) {
  const g = new THREE.Group(), gold = S('#ffcc33', { metalness: 1, roughness: .25, emissive: '#5a3a00', emissiveIntensity: .4 });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.02, r * .35, 24, 1, true), gold); band.material.side = THREE.DoubleSide; g.add(band);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, sp = new THREE.Mesh(new THREE.ConeGeometry(r * .18, r * .5, 8), gold); sp.position.set(Math.cos(a) * r, r * .38, Math.sin(a) * r); g.add(sp);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(r * .08), S(['#ff3355', '#33aaff', '#44ff88'][i % 3], { emissive: ['#ff3355', '#33aaff', '#44ff88'][i % 3], emissiveIntensity: 1.5 })); gem.position.set(Math.cos(a) * r * 1.03, 0, Math.sin(a) * r * 1.03); g.add(gem); }
  g.position.y = y; return g;
}
export const INGREDIENTS = ['eye', 'frog', 'mushroom', 'wing', 'moonflower', 'pumpkin', 'crystal'];
export const EMOJI = { eye: '👁️', frog: '🐸', mushroom: '🍄', wing: '🦇', moonflower: '🌸', pumpkin: '🎃', crystal: '🔷' };
// one unique silhouette + one unique, widely spaced hue per ingredient (hue in degrees)
export const SHAPE = { eye: 'sphere-eyeball', frog: 'frog-figure', mushroom: 'dome-cap-on-stem', wing: 'spread-bat-wings', moonflower: 'flat-star-petals', pumpkin: 'ribbed-gourd', crystal: 'hex-prism-spire' };
export const GLOW = { eye: '#fff200', frog: '#2fff3a', mushroom: '#ff1a3a', wing: '#9a3cff', moonflower: '#ff4fd8', pumpkin: '#ff8000', crystal: '#00c8ff' };
export const HUE = Object.fromEntries(Object.entries(GLOW).map(([k, c]) => { const h = new THREE.Color(c).getHSL({}, THREE.SRGBColorSpace).h; return [k, Math.round(h * 360)]; }));
// inverted-hull glow rim around every mesh, in the ingredient's signature colour
export function addRim(g, col, w = .06) {
  const rimM = new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(1.6), side: THREE.BackSide, transparent: true, opacity: .85, depthWrite: false });
  const meshes = []; g.traverse(o => { if (o.isMesh && !o.userData.rim) meshes.push(o); });
  for (const m of meshes) { m.geometry.computeBoundingSphere(); const r = m.geometry.boundingSphere.radius || .1; const c = m.geometry.boundingSphere.center; if (r < .12) continue;
    const h = new THREE.Mesh(m.geometry, rimM); h.userData.rim = true; h.castShadow = false; const k = 1 + w / Math.max(r, .05);
    h.scale.setScalar(k); h.position.copy(c).multiplyScalar(1 - k); m.add(h); }
  return g;
}
export function ingredientModel(kind, rim = true) {
  const g = new THREE.Group();
  if (kind === 'eye') {
    const m = new THREE.Mesh(new THREE.SphereGeometry(.32, 40, 28), S('#ffffff', { map: eyeTexture('#ffc400'), roughness: .12 })); m.rotation.y = -Math.PI / 2; g.add(m);
    const cor = new THREE.Mesh(new THREE.SphereGeometry(.335, 32, 20), new THREE.MeshStandardMaterial({ color: '#fff', transparent: true, opacity: .12, roughness: 0, metalness: .2 })); g.add(cor);
  } else if (kind === 'frog') g.add(frogModel(.62));
  else if (kind === 'mushroom') {
    const stem = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.12, 0], [.1, .2], [.09, .38], [0, .4]].map(([x, y]) => new THREE.Vector2(x, y)), 20), S('#efe4cc', { roughness: .7 })); stem.position.y = -.25; g.add(stem);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.32, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), S('#d81e28', { roughness: .35 })); cap.scale.y = .7; cap.position.y = .1; g.add(cap);
    const under = new THREE.Mesh(new THREE.CircleGeometry(.32, 32), S('#d9c9a8', { side: THREE.DoubleSide })); under.rotation.x = Math.PI / 2; under.position.y = .1; g.add(under);
    for (let i = 0; i < 9; i++) { const a = i * 2.4, el = .25 + (i % 3) * .3; const sp = new THREE.Mesh(new THREE.SphereGeometry(.04 + (i % 2) * .015, 10, 8), S('#fff8ee')); sp.position.set(Math.cos(a) * Math.sin(el + .3) * .32, .1 + Math.cos(el + .3) * .22, Math.sin(a) * Math.sin(el + .3) * .32); sp.scale.y = .5; g.add(sp); }
  } else if (kind === 'wing') {
    const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(.62, .26); sh.quadraticCurveTo(.5, .05, .55, -.08); sh.quadraticCurveTo(.4, .02, .36, -.16); sh.quadraticCurveTo(.25, -.04, .16, -.18); sh.quadraticCurveTo(.1, -.05, 0, 0);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: .02, bevelEnabled: true, bevelSize: .01, bevelThickness: .01, bevelSegments: 1 }); geo.translate(0, -.02, 0);
    const m = new THREE.Mesh(geo, S('#7a3aa0', { roughness: .45, emissive: '#5a1a8a', emissiveIntensity: .8, side: THREE.DoubleSide })); m.scale.setScalar(1.25); g.add(m);
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .65, 6), S('#1a0e20')); bone.rotation.z = Math.atan2(.26, .62) - Math.PI / 2; bone.position.set(.01, .13, .03); g.add(bone);
    const m2 = m.clone(); m2.scale.x = -1.25; m2.position.x = 0; g.add(m2); m.position.x = 0;
    g.rotation.x = -1.15;
  } else if (kind === 'moonflower') {
    const pet = S('#ff7ae0', { emissive: '#ff2ac0', emissiveIntensity: .7, roughness: .4, side: THREE.DoubleSide });
    for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(.2, 16, 10), pet); p.scale.set(.55, .12, 1); const a = i / 5 * Math.PI * 2; p.position.set(Math.cos(a) * .2, .05, Math.sin(a) * .2); p.rotation.y = -a + Math.PI / 2; p.rotation.x = .25; g.add(p); }
    const c = new THREE.Mesh(new THREE.SphereGeometry(.08, 16, 12), S('#ffe27a', { emissive: '#ffcc33', emissiveIntensity: 1.2 })); c.position.y = .09; g.add(c);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.02, .025, .35, 6), S('#3f7a3a')); stem.position.y = -.14; g.add(stem);
    g.rotation.x = .5;
  } else if (kind === 'pumpkin') {
    const p = ribbed(.3, 10, .1); g.add(p);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(.035, .05, .14, 8), S('#4a6a2a')); st.position.y = .27; st.rotation.z = .2; g.add(st);
  } else if (kind === 'crystal') {
    // hexagonal prism spire with pointed tip (quartz point) — tall & angular, no gem/diamond shape
    const geo = new THREE.LatheGeometry([[0, -.3], [.13, -.3], [.13, .16], [0, .38]].map(([x, y]) => new THREE.Vector2(x, y)), 6);
    const mat = new THREE.MeshStandardMaterial({ color: '#30d8ff', emissive: '#0090ff', emissiveIntensity: .9, roughness: .1, metalness: .2, flatShading: true });
    const m = new THREE.Mesh(geo, mat); g.add(m);
    for (let i = 0; i < 2; i++) { const s = new THREE.Mesh(geo, mat); s.scale.setScalar(.55); const a = i * Math.PI + .4; s.position.set(Math.cos(a) * .15, -.13, Math.sin(a) * .15); s.rotation.z = (i ? 1 : -1) * .5; g.add(s); }
  }
  shadow(g);
  // gentle self-illumination so each signature colour reads even in the dark corners of the table
  g.traverse(o => { if (o.isMesh && o.material && o.material.isMeshStandardMaterial && o.material.emissive.getHex() === 0) { o.material = o.material.clone(); o.material.emissive.copy(o.material.color).multiplyScalar(.22); } });
  if (rim) addRim(g, GLOW[kind]); return g;
}
// ---------- creatures ----------
export function ghostModel() {
  const g = new THREE.Group(); const geo = new THREE.SphereGeometry(.8, 48, 32, 0, Math.PI * 2, 0, Math.PI * .62);
  const p = geo.attributes.position, v = new THREE.Vector3();
  const body = new THREE.Group();
  const top = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#d8e2f4', emissive: '#6a98d8', emissiveIntensity: .16, roughness: .5, transparent: true, opacity: .9 }));
  body.add(top);
  const skirtG = new THREE.CylinderGeometry(.73, .95, 1.1, 48, 8, true); const sp = skirtG.attributes.position;
  for (let i = 0; i < sp.count; i++) { v.fromBufferAttribute(sp, i); if (v.y < -.5) { const a = Math.atan2(v.z, v.x); v.y += Math.sin(a * 7) * .15; } sp.setXYZ(i, v.x, v.y, v.z); } skirtG.computeVertexNormals();
  const skirt = new THREE.Mesh(skirtG, top.material); skirt.material.side = THREE.DoubleSide; skirt.position.y = -.42; body.add(skirt); g.add(body); g.userData.skirt = skirtG; g.userData.skirt0 = Float32Array.from(sp.array);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 12), S('#0a0614', { roughness: .1 })); e.scale.set(.8, 1.3, .5); e.position.set(s * .27, .25, .72); g.add(e); }
  const m = new THREE.Mesh(new THREE.SphereGeometry(.13, 16, 12), S('#0a0614')); m.scale.set(1, 1.3, .4); m.position.set(0, -.05, .76); g.add(m);
  for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.SphereGeometry(.22, 16, 12), top.material); arm.scale.set(.5, 1.2, .5); arm.position.set(s * .85, -.15, .1); arm.rotation.z = s * .7; g.add(arm); g.userData['arm' + s] = arm; }
  const L = new THREE.PointLight('#a8d0ff', 12, 6, 2); L.position.y = .2; g.add(L);
  return g;
}
export function batModel() {
  const g = new THREE.Group(), mat = S('#3a1a4a', { roughness: .5, emissive: '#6a2a9a', emissiveIntensity: .7 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(.16, 16, 12), mat); body.scale.set(.8, 1, .8); g.add(body);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(.05, .12, 6), mat); ear.position.set(s * .07, .17, 0); g.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.025, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff4040' })); eye.position.set(s * .05, .06, .13); g.add(eye); }
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(.55, .18); sh.quadraticCurveTo(.45, 0, .5, -.1); sh.quadraticCurveTo(.35, -.02, .3, -.14); sh.quadraticCurveTo(.2, -.04, .12, -.14); sh.quadraticCurveTo(.08, -.04, 0, -.05);
  const wg = new THREE.ShapeGeometry(sh); const wm = mat.clone(); wm.side = THREE.DoubleSide;
  for (const s of [-1, 1]) { const piv = new THREE.Group(); const w = new THREE.Mesh(wg, wm); w.scale.x = s; piv.add(w); piv.position.x = s * .08; g.add(piv); g.userData['w' + s] = piv; }
  return shadow(g);
}
export function pumpkinKingModel() {
  const g = new THREE.Group(); const p = ribbed(.85, 12, .09, '#e0640e'); p.material.emissive = new THREE.Color('#ff4a00'); p.material.emissiveIntensity = .1; g.add(p);
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd060').multiplyScalar(1.5) });
  const tri = (pts, z = .64) => { const sh = new THREE.Shape(); sh.moveTo(...pts[0]); for (const q of pts.slice(1)) sh.lineTo(...q); const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), glow); m.position.z = z; return m; };
  g.add(tri([[-.42, .2], [-.12, .2], [-.27, .42]])); g.add(tri([[.12, .2], [.42, .2], [.27, .42]]));
  const mouth = new THREE.Shape(); mouth.moveTo(-.48, -.08); for (let i = 0; i <= 8; i++) { const x = -.48 + i * .12; mouth.lineTo(x, (i % 2 ? -.18 : -.1) - Math.sin(i / 8 * Math.PI) * .15); } mouth.lineTo(.48, -.08); mouth.quadraticCurveTo(0, -.6, -.48, -.08);
  const mm = new THREE.Mesh(new THREE.ShapeGeometry(mouth), glow); mm.position.z = .62; g.add(mm);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(.07, .1, .25, 8), S('#4a6a2a')); st.position.y = .72; g.add(st);
  const crown = crownModel(.42, .82); crown.scale.setScalar(1.15); g.add(crown);
  const cape = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.1, 32, 1, true, Math.PI * .15, Math.PI * 1.7), S('#5a0a2a', { side: THREE.DoubleSide, roughness: .6 })); cape.position.y = -.9; cape.rotation.y = Math.PI; g.add(cape);
  const L = new THREE.PointLight('#ffb040', 5, 5, 2); L.position.set(0, .3, 1.6); g.add(L);
  return shadow(g);
}
export function creatureModel(kind) {
  if (kind === 'ghost') return ghostModel();
  if (kind === 'king') return pumpkinKingModel();
  if (kind === 'frog') { const f = frogModel(1.5, true); const L = new THREE.PointLight('#fff0c0', 5, 5, 2); L.position.set(0, .6, 1.2); f.add(L); return f; }
  const g = new THREE.Group(); g.userData.bats = [];
  for (let i = 0; i < 9; i++) { const b = batModel(); b.userData.ph = i * .7; b.userData.a = i / 9 * Math.PI * 2; b.userData.r = .5 + (i % 3) * .35; g.add(b); g.userData.bats.push(b); }
  return g;
}
