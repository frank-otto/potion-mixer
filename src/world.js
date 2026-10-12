// The witch's vault: stone room, shelves with glowing bottles, candles, cobwebs, cauldron with shader liquid, fire, steam, fog.
import * as THREE from 'three';

export const QUALITY = {
  low: { dpr: 1, shadows: false, bloom: .7, bokeh: false, parts: .45, lights: 1 },
  mid: { dpr: 1.25, shadows: false, bloom: 1, bokeh: false, parts: .7, lights: 2 },
  high: { dpr: 1.6, shadows: true, shadowSize: 1024, bloom: 1, bokeh: false, parts: 1, lights: 3 },
  ultra: { dpr: 2, shadows: true, shadowSize: 2048, bloom: 1, bokeh: true, parts: 1.3, lights: 3 }
};

function rnd(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- procedural textures ----------
function stoneTextures(kind, seed) {
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'); const r = rnd(seed);
  const h = document.createElement('canvas'); h.width = h.height = N; const hg = h.getContext('2d');
  g.fillStyle = '#2a2530'; g.fillRect(0, 0, N, N); hg.fillStyle = '#000'; hg.fillRect(0, 0, N, N);
  const rows = kind === 'floor' ? 4 : 8, bh = N / rows;
  for (let y = 0; y < rows; y++) {
    const cols = kind === 'floor' ? 4 : 4 + (y % 2), bw = N / cols, off = kind === 'floor' ? (y % 2) * bw * .5 : (y % 2) * bw * .5;
    for (let x = -1; x < cols + 1; x++) {
      const x0 = x * bw + off + 3, y0 = y * bh + 3, w = bw - 6, hh = bh - 6;
      const l = 30 + r() * 22, hue = 250 + r() * 30;
      g.fillStyle = `hsl(${hue},${8 + r() * 8}%,${l}%)`; g.beginPath(); g.roundRect(x0, y0, w, hh, 8); g.fill();
      const gr = hg.createLinearGradient(0, y0, 0, y0 + hh); gr.addColorStop(0, '#d8d8d8'); gr.addColorStop(.5, '#ffffff'); gr.addColorStop(1, '#b0b0b0');
      hg.fillStyle = gr; hg.beginPath(); hg.roundRect(x0, y0, w, hh, 10); hg.fill();
    }
  }
  const id = g.getImageData(0, 0, N, N), hd = hg.getImageData(0, 0, N, N);
  for (let i = 0; i < N * N; i++) { const n = (r() - .5) * 26; for (let k = 0; k < 3; k++) id.data[i * 4 + k] = Math.max(0, Math.min(255, id.data[i * 4 + k] + n)); hd.data[i * 4] = Math.max(0, Math.min(255, hd.data[i * 4] + n * .8)); }
  for (let i = 0; i < 60; i++) { const x = r() * N, y = r() * N, s = 10 + r() * 40; const gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, 'rgba(40,60,30,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); }
  g.putImageData(id, 0, 0);
  // moss / grime blotches
  for (let i = 0; i < 40; i++) { const x = r() * N, y = r() * N, s = 10 + r() * 50; const gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, `rgba(${20 + r() * 20},${30 + r() * 25},${20},.35)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - s, y - s, 2 * s, 2 * s); }
  // normal map from height
  const nm = document.createElement('canvas'); nm.width = nm.height = N; const ng = nm.getContext('2d'); const nd = ng.createImageData(N, N);
  const H = (x, y) => hd.data[(((y + N) % N) * N + ((x + N) % N)) * 4] / 255;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = (H(x + 1, y) - H(x - 1, y)) * 3, dy = (H(x, y + 1) - H(x, y - 1)) * 3; const l = Math.hypot(dx, dy, 1); const i = (y * N + x) * 4; nd.data[i] = (-dx / l * .5 + .5) * 255; nd.data[i + 1] = (dy / l * .5 + .5) * 255; nd.data[i + 2] = (1 / l * .5 + .5) * 255; nd.data[i + 3] = 255; }
  ng.putImageData(nd, 0, 0);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; const nmap = new THREE.CanvasTexture(nm);
  for (const t of [map, nmap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; }
  return { map, nmap };
}
function woodTexture(seed) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'); const r = rnd(seed);
  g.fillStyle = '#4a2c18'; g.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(${20 + r() * 40},${10 + r() * 20},${5},${.25 + r() * .3})`; g.lineWidth = 1 + r() * 2; g.beginPath(); const y = r() * 64; g.moveTo(0, y); for (let x = 0; x <= 256; x += 16) g.lineTo(x, y + Math.sin(x * .03 + i) * 2); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
export function softTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
function smokeTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const r = rnd(5);
  for (let i = 0; i < 26; i++) { const x = 128 + (r() - .5) * 110, y = 128 + (r() - .5) * 110, s = 30 + r() * 60; const gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
  return new THREE.CanvasTexture(c);
}
function flameTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 84, 2, 32, 72, 50); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(.25, 'rgba(255,200,90,.95)'); gr.addColorStop(.6, 'rgba(255,110,20,.45)'); gr.addColorStop(1, 'rgba(255,60,0,0)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(32, 4); g.quadraticCurveTo(62, 70, 32, 124); g.quadraticCurveTo(2, 70, 32, 4); g.fill(); return new THREE.CanvasTexture(c);
}

// ---------- liquid shader ----------
const NOISE = `
vec3 hash3(vec2 p){ vec3 q = vec3(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)), dot(p,vec2(419.2,371.9))); return fract(sin(q)*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  float a=fract(sin(dot(i,vec2(12.9898,78.233)))*43758.5453), b=fract(sin(dot(i+vec2(1,0),vec2(12.9898,78.233)))*43758.5453),
        c=fract(sin(dot(i+vec2(0,1),vec2(12.9898,78.233)))*43758.5453), d=fract(sin(dot(i+vec2(1,1),vec2(12.9898,78.233)))*43758.5453);
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return v; }`;
export function makeLiquid() {
  const geo = new THREE.CircleGeometry(1.18, 96, 0, Math.PI * 2); geo.rotateX(-Math.PI / 2);
  // add rings for displacement resolution
  const g2 = new THREE.RingGeometry(0.001, 1.18, 96, 24); g2.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColA: { value: new THREE.Color('#2bff7a') }, uColB: { value: new THREE.Color('#0a5a3a') }, uGlow: { value: 1 }, uAgit: { value: .3 }, uFlash: { value: 0 } },
    vertexShader: `uniform float uTime; uniform float uAgit; varying vec2 vUv; varying float vH; ${NOISE}
      void main(){ vec3 p = position; vec2 q = p.xz; float r = length(q);
        float h = (fbm(q*2.2 + vec2(uTime*.35, -uTime*.27)) - .5) * .09 * (.6 + uAgit);
        h += sin(r*16. - uTime*(3.+uAgit*6.)) * .012 * uAgit * (1.-r);
        p.y += h * smoothstep(1.18, .9, r); vH = h; vUv = q; gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.); }`,
    fragmentShader: `uniform float uTime; uniform vec3 uColA; uniform vec3 uColB; uniform float uGlow; uniform float uAgit; uniform float uFlash; varying vec2 vUv; varying float vH; ${NOISE}
      void main(){ vec2 q = vUv; float r = length(q); float a = atan(q.y,q.x);
        vec2 sw = vec2(cos(a + r*3. - uTime*.6), sin(a + r*3. - uTime*.6)) * r;
        float n = fbm(sw*3. + uTime*.2); float n2 = fbm(q*6. - uTime*.5);
        vec3 col = mix(uColB, uColA, smoothstep(.25,.85,n));
        float foam = smoothstep(.62,.9,n2) * .6 + smoothstep(1.02,1.16,r) * .9;
        col += foam * uColA * .8;
        col += vec3(1.,.95,.8) * min(pow(max(0., vH*12.+.4), 4.), 2.) * .15;
        col *= (.7 + uGlow*.55) * (1. + uFlash*1.3);
        gl_FragColor = vec4(col, 1.);
        #include <colorspace_fragment>
      }`
  });
  const m = new THREE.Mesh(g2, mat); return m;
}

export function createWorld(renderer, q) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#07050c'); scene.fog = new THREE.FogExp2('#0c0816', .045);
  const W = {};
  const stone = stoneTextures('wall', 3), floorT = stoneTextures('floor', 9);
  stone.map.repeat.set(14, 3.4); stone.nmap.repeat.set(14, 3.4); floorT.map.repeat.set(7, 7); floorT.nmap.repeat.set(7, 7);
  const wallMat = new THREE.MeshStandardMaterial({ map: stone.map, normalMap: stone.nmap, normalScale: new THREE.Vector2(1.2, 1.2), roughness: .92, metalness: 0 });
  const floorMat = new THREE.MeshStandardMaterial({ map: floorT.map, normalMap: floorT.nmap, roughness: .8, metalness: .05, color: '#a9a0b8' });
  const walls = new THREE.Mesh(new THREE.CylinderGeometry(12.5, 12.5, 10, 64, 1, true), wallMat); walls.material.side = THREE.BackSide; walls.position.y = 4.9; walls.receiveShadow = true; scene.add(walls);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(12.5, 64), floorMat); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const ceil = new THREE.Mesh(new THREE.CircleGeometry(12.5, 32), new THREE.MeshStandardMaterial({ color: '#0c0a10', roughness: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = 9.8; scene.add(ceil);
  // pillars + arches
  const pilMat = wallMat.clone(); pilMat.map = stone.map.clone(); pilMat.map.repeat.set(2, 4); pilMat.map.needsUpdate = true;
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; const p = new THREE.Mesh(new THREE.CylinderGeometry(.6, .7, 10, 16), pilMat); p.position.set(Math.cos(a) * 11.6, 5, Math.sin(a) * 11.6); p.castShadow = false; p.receiveShadow = true; scene.add(p); }
  // ---- shelves with bottles & books on the back wall ----
  const wood = woodTexture(4), woodMat = new THREE.MeshStandardMaterial({ map: wood, roughness: .75, color: '#b08a6a' });
  W.bottles = []; const r = rnd(21);
  const bottleColors = ['#59ff9a', '#b46bff', '#ff5ab4', '#4fd8ff', '#ffb347', '#ff4a4a'];
  const lathe = (pts) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 20);
  const bottleShapes = [lathe([[0, 0], [.16, 0], [.18, .05], [.18, .28], [.08, .38], [.05, .5], [.06, .52], [0, .52]]), lathe([[0, 0], [.2, 0], [.22, .12], [.16, .24], [.05, .3], [.05, .42], [.06, .44], [0, .44]]), lathe([[0, 0], [.1, 0], [.12, .4], [.05, .48], [.05, .58], [0, .58]])];
  const glassMat = new THREE.MeshStandardMaterial({ color: '#cfe7ff', roughness: .08, metalness: .1, transparent: true, opacity: .28, depthWrite: false });
  for (const side of [-1, 0, 1]) {
    const ang = Math.PI * 1.5 + side * .5, R = 9.2, cx = Math.cos(ang) * R, cz = Math.sin(ang) * R;
    const unit = new THREE.Group(); unit.position.set(cx, 0, cz); unit.lookAt(0, 0, 0); scene.add(unit);
    for (const sx of [-1.25, 1.25]) { const post = new THREE.Mesh(new THREE.BoxGeometry(.14, 4.6, .5), woodMat); post.position.set(sx, 2.3, 0); post.castShadow = true; unit.add(post); }
    for (let k = 0; k < 4; k++) {
      const y = .9 + k * 1.05; const plank = new THREE.Mesh(new THREE.BoxGeometry(2.7, .08, .55), woodMat); plank.position.set(0, y, 0); plank.receiveShadow = true; plank.castShadow = true; unit.add(plank);
      let x = -1.1;
      while (x < 1.05) {
        if (r() < .3) { // books
          const n = 2 + Math.floor(r() * 4); for (let b = 0; b < n && x < 1.1; b++) { const bw = .07 + r() * .05, bh = .45 + r() * .3; const book = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, .32), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(r(), .45, .18 + r() * .12), roughness: .8 })); book.position.set(x + bw / 2, y + .04 + bh / 2, .02); book.rotation.z = (r() - .5) * .08; unit.add(book); x += bw + .01; } x += .08;
        } else {
          const shape = bottleShapes[Math.floor(r() * 3)], col = new THREE.Color(bottleColors[Math.floor(r() * bottleColors.length)]);
          const sc = .75 + r() * .55, bg = new THREE.Group(); bg.position.set(x + .15 * sc, y + .04, (r() - .5) * .15); bg.scale.setScalar(sc);
          const liquid = new THREE.Mesh(shape, new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: .65 + r() * .6, roughness: .3 })); liquid.scale.set(.82, .62, .82); bg.add(liquid);
          const glass = new THREE.Mesh(shape, glassMat); bg.add(glass);
          const cork = new THREE.Mesh(new THREE.CylinderGeometry(.045, .04, .07, 8), woodMat); cork.position.y = shape === bottleShapes[1] ? .47 : shape === bottleShapes[2] ? .61 : .55; bg.add(cork);
          unit.add(bg); W.bottles.push({ m: liquid.material, base: liquid.material.emissiveIntensity, ph: r() * 6 }); x += .32 * sc + .05;
        }
      }
    }
  }
  // ---- cobwebs in the corners between pillars and ceiling ----
  const webMat = new THREE.LineBasicMaterial({ color: '#d8d8ff', transparent: true, opacity: .22 });
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + Math.PI / 8, pts = []; const S = 1.6 + r() * .8;
    const spokes = 7; const tips = []; for (let s = 0; s < spokes; s++) { const u = s / (spokes - 1); tips.push(new THREE.Vector3(Math.cos(u * Math.PI / 2) * S, -Math.sin(u * Math.PI / 2) * S, 0)); }
    for (const t of tips) pts.push(new THREE.Vector3(), t);
    for (let k = 1; k <= 5; k++) for (let s = 0; s < spokes - 1; s++) { const a1 = tips[s].clone().multiplyScalar(k / 5.5), a2 = tips[s + 1].clone().multiplyScalar(k / 5.5); const mid = a1.clone().add(a2).multiplyScalar(.5).multiplyScalar(.93); pts.push(a1, mid, mid, a2); }
    const web = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), webMat);
    web.position.set(Math.cos(a) * 11, 9.4, Math.sin(a) * 11); web.lookAt(0, 9.4, 0); web.rotateY(Math.PI / 2 * (i % 2 ? 1 : -1) * .0); scene.add(web);
  }
  // ---- candles ----
  const flameTex = flameTexture(); W.candles = [];
  const candleSpots = [[-3.2, 0, -2.6, 1], [3.4, 0, -2.2, 1.2], [-4.6, 0, 1.2, .9], [4.8, 0, 1.6, 1.1], [-1.2, 2.95, -9.1, .5], [1.4, 1.9, -9.0, .5], [-5.0, 3.0, -7.6, .5], [4.9, 2.0, -7.7, .5]];
  candleSpots.forEach(([x, y, z, s], i) => {
    const grp = new THREE.Group(); grp.position.set(x, y, z); scene.add(grp);
    const n = s > .8 ? 3 : 1;
    for (let k = 0; k < n; k++) {
      const h = (s > .8 ? .7 + r() * .6 : .35) * s, cx = (k - (n - 1) / 2) * .22 * s, cz = (k % 2) * .12;
      const wax = new THREE.Mesh(new THREE.CylinderGeometry(.07 * s + .03, .08 * s + .03, h, 14), new THREE.MeshStandardMaterial({ color: '#efe2c4', roughness: .55, emissive: '#ff9a40', emissiveIntensity: .08 })); wax.position.set(cx, h / 2, cz); wax.castShadow = true; grp.add(wax);
      const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, color: '#ffd9a0', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      fl.scale.set(.12 * (s + .4), .26 * (s + .4), 1); fl.position.set(cx, h + .1 * (s + .4), cz); grp.add(fl);
      W.candles.push({ fl, base: fl.scale.clone(), ph: r() * 10 });
    }
  });
  // ---- lights ----
  scene.add(new THREE.HemisphereLight('#4a3d78', '#120a10', .55));
  const moon = new THREE.DirectionalLight('#8fa0ff', .35); moon.position.set(-4, 9, 6); scene.add(moon);
  W.candleLights = [];
  const cl = [[-3.2, 1.6, -2.6], [3.4, 1.8, -2.2], [0, 3.6, -7.8]];
  for (let i = 0; i < 3; i++) { const L = new THREE.PointLight('#ffa850', 14, 9, 2); L.position.set(...cl[i]); scene.add(L); W.candleLights.push({ L, base: 14, ph: i * 2.3 }); }
  // cauldron fire light (casts shadows)
  const fire = new THREE.PointLight('#ff7a2a', 40, 12, 2); fire.position.set(0, .45, 0); fire.castShadow = true; fire.shadow.bias = -.002; scene.add(fire); W.fire = fire;
  // brew light: colored light from the liquid
  const brew = new THREE.PointLight('#2bff7a', 18, 10, 2); brew.position.set(0, 2.2, 0); scene.add(brew); W.brew = brew;
  const flash = new THREE.PointLight('#ffffff', 0, 20, 1.6); flash.position.set(0, 3, 0); scene.add(flash); W.flash = flash;

  // ---- cauldron ----
  const cauldron = new THREE.Group(); scene.add(cauldron); W.cauldron = cauldron;
  const prof = []; for (let i = 0; i <= 24; i++) { const t = i / 24, a = -Math.PI * .5 + t * Math.PI * .86; prof.push(new THREE.Vector2(Math.cos(a) * 1.35 + .01, Math.sin(a) * 1.0 + 1.0)); }
  prof.push(new THREE.Vector2(1.36, 1.62), new THREE.Vector2(1.46, 1.66), new THREE.Vector2(1.48, 1.74), new THREE.Vector2(1.36, 1.76), new THREE.Vector2(1.25, 1.66));
  const iron = new THREE.MeshStandardMaterial({ color: '#232026', roughness: .42, metalness: .85 });
  const pot = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), iron); pot.material.side = THREE.DoubleSide; pot.castShadow = true; pot.receiveShadow = true; pot.position.y = .15; cauldron.add(pot);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + .3, leg = new THREE.Mesh(new THREE.CylinderGeometry(.09, .05, .7, 8), iron); leg.position.set(Math.cos(a) * .9, .35, Math.sin(a) * .9); leg.rotation.z = Math.cos(a) * .25; leg.rotation.x = -Math.sin(a) * .25; leg.castShadow = true; cauldron.add(leg); }
  for (const s of [-1, 1]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(.2, .035, 8, 20), iron); ring.position.set(s * 1.42, 1.45, 0); ring.rotation.y = Math.PI / 2; cauldron.add(ring); }
  const liquid = makeLiquid(); liquid.position.y = 1.66; cauldron.add(liquid); W.liquid = liquid;
  // logs + embers
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, log = new THREE.Mesh(new THREE.CylinderGeometry(.09, .1, 1.2, 8), new THREE.MeshStandardMaterial({ color: '#2a170c', roughness: .9, emissive: '#ff3a00', emissiveIntensity: .35 })); log.position.set(Math.cos(a) * .3, .1, Math.sin(a) * .3); log.rotation.z = Math.PI / 2; log.rotation.y = a; cauldron.add(log); }
  W.flames = []; for (let i = 0; i < 9; i++) { const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, color: '#ffb070', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); const a = i / 9 * Math.PI * 2; f.position.set(Math.cos(a) * .45, .3, Math.sin(a) * .45); f.scale.set(.45, .8, 1); scene.add(f); W.flames.push({ f, a, ph: r() * 10 }); }
  // ---- worktable (front arc) where ingredients rest ----
  const tableMat = woodMat.clone(); tableMat.map = wood.clone(); tableMat.map.repeat.set(4, 1); tableMat.map.needsUpdate = true;
  const ringShape = new THREE.Shape(); const a0 = Math.PI * .5 - .95, a1 = Math.PI * .5 + .95, R0 = 2.55, R1 = 4.2;
  ringShape.absarc(0, 0, R1, a0, a1, false); ringShape.absarc(0, 0, R0, a1, a0, true);
  const tgeo = new THREE.ExtrudeGeometry(ringShape, { depth: .12, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 2, curveSegments: 48 }); tgeo.rotateX(Math.PI / 2);
  const tmesh = new THREE.Mesh(tgeo, tableMat); tmesh.position.y = .95; tmesh.castShadow = true; tmesh.receiveShadow = true; scene.add(tmesh); W.tableY = 1.0;
  for (const a of [a0 + .15, (a0 + a1) / 2, a1 - .15]) for (const R of [R0 + .15, R1 - .15]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(.12, .95, .12), woodMat); leg.position.set(Math.cos(a) * R, .47, Math.sin(a) * R); scene.add(leg); }
  // ---- steam, fog, embers (particles) ----
  const soft = softTexture(), smoke = smokeTexture(); W.soft = soft; W.smokeTex = smoke;
  const nSteam = Math.round(46 * q.parts); W.steam = [];
  for (let i = 0; i < nSteam; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smoke, color: '#bfffe0', transparent: true, opacity: 0, depthWrite: false })); scene.add(s); W.steam.push({ s, t: r() * 4, life: 3.2 + r() * 1.5, x: 0, z: 0, rot: r() * 6 }); }
  const nFog = Math.round(22 * q.parts); W.fog = [];
  for (let i = 0; i < nFog; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smoke, color: '#5d4a8a', transparent: true, opacity: .16 + r() * .1, depthWrite: false })); const a = r() * Math.PI * 2, R = 2 + r() * 7; s.position.set(Math.cos(a) * R, .35 + r() * .5, Math.sin(a) * R); s.scale.setScalar(3 + r() * 3); scene.add(s); W.fog.push({ s, a, R, sp: (.02 + r() * .04) * (r() < .5 ? -1 : 1), y: s.position.y }); }
  const nEmb = Math.round(60 * q.parts); const eg = new THREE.BufferGeometry(); const ep = new Float32Array(nEmb * 3); W.emb = { n: nEmb, p: ep, v: [], g: eg };
  for (let i = 0; i < nEmb; i++) { ep[i * 3] = (r() - .5) * 1.2; ep[i * 3 + 1] = r() * 4; ep[i * 3 + 2] = (r() - .5) * 1.2; W.emb.v.push(.3 + r() * .6); }
  eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  const embers = new THREE.Points(eg, new THREE.PointsMaterial({ map: soft, color: '#ffb060', size: .07, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(embers);
  W.scene = scene; W.rng = r;
  return W;
}

export function updateWorld(W, t, dt, brewState) {
  const L = W.liquid.material.uniforms; L.uTime.value = t;
  for (const c of W.candles) { const f = .85 + .15 * Math.sin(t * 13 + c.ph) * Math.sin(t * 7.3 + c.ph * 2); c.fl.scale.set(c.base.x * (.9 + .1 * f), c.base.y * f, 1); }
  for (const c of W.candleLights) c.L.intensity = c.base * (.82 + .18 * Math.sin(t * 11 + c.ph) * Math.sin(t * 5.7 + c.ph));
  W.fire.intensity = 34 + 10 * Math.sin(t * 9) * Math.sin(t * 13.7);
  for (const fl of W.flames) { const k = .75 + .25 * Math.sin(t * 10 + fl.ph); fl.f.scale.set(.42 * (.8 + .2 * k), .85 * k, 1); fl.f.position.y = .28 + .08 * k; }
  for (const b of W.bottles) b.m.emissiveIntensity = b.base * (.8 + .2 * Math.sin(t * 1.3 + b.ph));
  const col = L.uColA.value;
  for (const s of W.steam) { s.t += dt * (1 + brewState.agit * .8); if (s.t > s.life) { s.t = 0; const a = W.rng() * Math.PI * 2, R = W.rng() * .9; s.x = Math.cos(a) * R; s.z = Math.sin(a) * R; }
    const k = s.t / s.life; s.s.position.set(s.x * (1 + k * .6) + Math.sin(t * .6 + s.rot) * .2 * k, 1.75 + k * 3.2, s.z * (1 + k * .6)); s.s.scale.setScalar(.5 + k * 2.4);
    s.s.material.opacity = Math.sin(Math.PI * k) * .085; s.s.material.rotation = s.rot + k; s.s.material.color.copy(col).lerp(new THREE.Color('#c8c0e0'), .55); }
  for (const f of W.fog) { f.a += f.sp * dt; f.s.position.x = Math.cos(f.a) * f.R; f.s.position.z = Math.sin(f.a) * f.R; f.s.position.y = f.y + Math.sin(t * .3 + f.R) * .1; }
  const e = W.emb; for (let i = 0; i < e.n; i++) { e.p[i * 3 + 1] += e.v[i] * dt; e.p[i * 3] += Math.sin(t * 2 + i) * dt * .1; if (e.p[i * 3 + 1] > 4.5) { e.p[i * 3 + 1] = .2; e.p[i * 3] = (W.rng() - .5) * 1.2; e.p[i * 3 + 2] = (W.rng() - .5) * 1.2; } } e.g.attributes.position.needsUpdate = true;
}
