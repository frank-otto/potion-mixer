// Sparks (GPU points), goo blobs (instanced), smoke puffs, splash droplets
import * as THREE from 'three';
const MAXP = 2400;
export function createFX(scene, soft, smokeTex) {
  const F = { scene };
  const geo = new THREE.BufferGeometry();
  F.pos = new Float32Array(MAXP * 3); F.col = new Float32Array(MAXP * 3); F.size = new Float32Array(MAXP); F.alpha = new Float32Array(MAXP);
  F.vel = new Float32Array(MAXP * 3); F.life = new Float32Array(MAXP); F.max = new Float32Array(MAXP); F.grav = new Float32Array(MAXP); F.s0 = new Float32Array(MAXP); F.n = 0; F.cursor = 0;
  geo.setAttribute('position', new THREE.BufferAttribute(F.pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(F.col, 3)); geo.setAttribute('size', new THREE.BufferAttribute(F.size, 1)); geo.setAttribute('alpha', new THREE.BufferAttribute(F.alpha, 1));
  const mat = new THREE.ShaderMaterial({ uniforms: { map: { value: soft }, scale: { value: 800 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
    vertexShader: `attribute float size; attribute float alpha; varying vec3 vC; varying float vA; uniform float scale; void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = size * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D map; varying vec3 vC; varying float vA; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC * 1.5, t.a * vA); }` });
  F.points = new THREE.Points(geo, mat); F.points.frustumCulled = false; scene.add(F.points); F.geo = geo; F.mat = mat;
  // goo blobs
  const NG = 80; F.goo = new THREE.InstancedMesh(new THREE.SphereGeometry(.1, 14, 10), new THREE.MeshStandardMaterial({ color: '#6aff3a', emissive: '#2a8a10', emissiveIntensity: .6, roughness: .15, metalness: .1 }), NG);
  F.goo.instanceMatrix.setUsage(THREE.DynamicDrawUsage); F.goo.castShadow = true; F.goo.frustumCulled = false; scene.add(F.goo); F.gooS = []; for (let i = 0; i < NG; i++) F.gooS.push({ on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 1, life: 0, stuck: false });
  F.dummy = new THREE.Object3D(); for (let i = 0; i < NG; i++) { F.dummy.scale.setScalar(0); F.dummy.updateMatrix(); F.goo.setMatrixAt(i, F.dummy.matrix); }
  // smoke puffs
  F.puffs = []; for (let i = 0; i < 40; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: '#8a7a9a', transparent: true, opacity: 0, depthWrite: false })); s.visible = false; scene.add(s); F.puffs.push({ s, life: 0, max: 1, v: new THREE.Vector3(), g: 1 }); }
  return F;
}
export function sparks(F, at, n, opt = {}) {
  const c = new THREE.Color(); const cols = (opt.colors || ['#ffffff']).map(x => new THREE.Color(x));
  for (let k = 0; k < n; k++) {
    const i = F.cursor; F.cursor = (F.cursor + 1) % MAXP; F.n = Math.max(F.n, F.cursor === 0 ? MAXP : F.cursor);
    const a = Math.random() * Math.PI * 2, sp = (opt.speed || 3) * (.35 + Math.random() * .8), up = opt.up ?? 1, cone = opt.cone ?? .6;
    F.pos[i * 3] = at.x + (Math.random() - .5) * (opt.spread || .3); F.pos[i * 3 + 1] = at.y; F.pos[i * 3 + 2] = at.z + (Math.random() - .5) * (opt.spread || .3);
    F.vel[i * 3] = Math.cos(a) * sp * cone; F.vel[i * 3 + 1] = sp * up * (.6 + Math.random() * .8); F.vel[i * 3 + 2] = Math.sin(a) * sp * cone;
    c.copy(cols[k % cols.length]); F.col[i * 3] = c.r; F.col[i * 3 + 1] = c.g; F.col[i * 3 + 2] = c.b;
    F.max[i] = F.life[i] = (opt.life || 1.2) * (.6 + Math.random() * .8); F.grav[i] = opt.grav ?? 4; F.s0[i] = (opt.size || .12) * (.5 + Math.random());
  }
}
export function goo(F, at, n, color) {
  F.goo.material.color.set(color || '#6aff3a'); F.goo.material.emissive.set(color || '#6aff3a').multiplyScalar(.35);
  let k = 0; for (const b of F.gooS) { if (b.on) continue; if (k++ >= n) break;
    const a = Math.random() * Math.PI * 2, sp = 2.5 + Math.random() * 4.5; b.on = true; b.stuck = false; b.p.copy(at); b.v.set(Math.cos(a) * sp * .55, 3 + Math.random() * 4.5, Math.sin(a) * sp * .55 + 1.2); b.s = .6 + Math.random() * 1.6; b.life = 2.4 + Math.random(); }
}
export function puff(F, at, n, color, big = 1) {
  let k = 0; for (const p of F.puffs) { if (p.life > 0) continue; if (k++ >= n) break;
    p.life = p.max = 1.3 + Math.random() * .8; p.s.visible = true; p.s.material.color.set(color || '#8a7a9a'); p.s.position.copy(at).add(new THREE.Vector3((Math.random() - .5) * .8, Math.random() * .4, (Math.random() - .5) * .8));
    p.v.set((Math.random() - .5) * 1.6, 1 + Math.random() * 1.6, (Math.random() - .5) * 1.6); p.g = big * (1.2 + Math.random()); p.s.material.rotation = Math.random() * 6; }
}
export function updateFX(F, dt, scale) {
  F.mat.uniforms.scale.value = scale;
  for (let i = 0; i < F.n; i++) {
    if (F.life[i] <= 0) { F.alpha[i] = 0; continue; }
    F.life[i] -= dt; const k = Math.max(0, F.life[i] / F.max[i]);
    F.vel[i * 3 + 1] -= F.grav[i] * dt; F.vel[i * 3] *= (1 - dt * .8); F.vel[i * 3 + 2] *= (1 - dt * .8);
    F.pos[i * 3] += F.vel[i * 3] * dt; F.pos[i * 3 + 1] += F.vel[i * 3 + 1] * dt; F.pos[i * 3 + 2] += F.vel[i * 3 + 2] * dt;
    if (F.pos[i * 3 + 1] < .02) { F.pos[i * 3 + 1] = .02; F.vel[i * 3 + 1] *= -.3; }
    F.alpha[i] = Math.min(1, k * 2.5); F.size[i] = F.s0[i] * (.4 + k * .6);
  }
  F.geo.attributes.position.needsUpdate = true; F.geo.attributes.color.needsUpdate = true; F.geo.attributes.size.needsUpdate = true; F.geo.attributes.alpha.needsUpdate = true;
  F.gooS.forEach((b, i) => {
    if (b.on) { b.life -= dt; if (!b.stuck) { b.v.y -= 9.8 * dt; b.p.addScaledVector(b.v, dt); if (b.p.y < .05) { b.p.y = .05; b.stuck = true; } }
      const sc = b.s * (b.stuck ? Math.min(1, b.life) : 1); F.dummy.position.copy(b.p); F.dummy.scale.set(sc * (b.stuck ? 1.6 : 1), sc * (b.stuck ? .35 : 1), sc * (b.stuck ? 1.6 : 1)); if (b.life <= 0) b.on = false; }
    else F.dummy.scale.setScalar(0);
    F.dummy.updateMatrix(); F.goo.setMatrixAt(i, F.dummy.matrix);
  });
  F.goo.instanceMatrix.needsUpdate = true;
  for (const p of F.puffs) { if (p.life <= 0) continue; p.life -= dt; const k = 1 - p.life / p.max; p.s.position.addScaledVector(p.v, dt); p.v.multiplyScalar(1 - dt * 1.2);
    p.s.scale.setScalar(p.g * (.6 + k * 2.2)); p.s.material.opacity = Math.sin(Math.PI * Math.min(1, k * 1.3)) * .55; if (p.life <= 0) p.s.visible = false; }
}
