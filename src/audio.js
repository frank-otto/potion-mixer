// WebAudio player for the embedded CC0 samples (window.PM_SOUNDS, base64 mp3) – works via file://
let ctx = null, master = null, musicGain = null, loopGain = null, music = null, bubbles = null, bufs = {}, ready = false, muted = false;
export const log = [];
let clock = () => 0;
export function setClock(f) { clock = f; }
function b64(s) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
export async function unlock() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; master.connect(comp); comp.connect(ctx.destination);
  musicGain = ctx.createGain(); musicGain.gain.value = 0.28; musicGain.connect(master);
  loopGain = ctx.createGain(); loopGain.gain.value = 0.5; loopGain.connect(master);
  const src = window.PM_SOUNDS || {};
  await Promise.all(Object.keys(src).map(k => new Promise(res => { try { ctx.decodeAudioData(b64(src[k]), b => { bufs[k] = b; res(); }, () => res()); } catch (e) { res(); } })));
  ready = true; window.__pmAudioReady = Object.keys(bufs).length; startBubbles();
}
export function play(n, vol = 1, rate = 1, delay = 0) {
  log.push({ n, t: clock() + delay, v: vol, r: rate });
  if (!ready || !bufs[n]) return;
  const s = ctx.createBufferSource(); s.buffer = bufs[n]; s.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = vol; s.connect(g); g.connect(master); s.start(ctx.currentTime + delay);
}
function startBubbles() { if (bubbles || !bufs.bubble_loop) return; bubbles = ctx.createBufferSource(); bubbles.buffer = bufs.bubble_loop; bubbles.loop = true; bubbles.connect(loopGain); bubbles.start(); }
export function startMusic() {
  log.push({ n: 'music_graveyard', t: clock(), v: 1, r: 1, loop: 1 });
  if (!ready || music) return;
  music = ctx.createBufferSource(); music.buffer = bufs.music_graveyard; music.loop = true; music.connect(musicGain); music.start();
}
export function stopMusic() { log.push({ n: '__stopmusic', t: clock() }); if (music) { try { music.stop(); } catch (e) {} music = null; } }
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.9; }
export function isMuted() { return muted; }
export const sfx = {
  throw() { play('whoosh', .45, 1.25 + Math.random() * .2); },
  drop(ok) { play('brew', .8, .9 + Math.random() * .2); play('splat', .45, 1.2); if (ok) play('harp', .45, 1.1); },
  wrong() { play('goo', .9, .9); play('splat', .9, .8); play('slime', .7, .9, .12); play('fwoosh', .6, 1, .18); },
  fizzle() { play('fwoosh', .6, .8); play('slime', .5, .7); },
  complete(creature, combo) { play('boom', .9); play('cauldron_magic', .7); play('sparkle', .6, 1, .1); play('choir', .55, 1, .2); play('epic', .55, 1, .35);
    if (creature === 'bats') play('bats', .8, 1, .5); if (creature === 'ghost') play('boo', .7, 1, .5); if (creature === 'king' || creature === 'frog') play('laugh', .5, creature === 'frog' ? 1.25 : .85, .6);
    if (combo > 1) play('magic', .5, 1 + Math.min(combo, 6) * .04, .3); },
  start(kids) { play('stinger', .7); if (kids) play('laugh_kids', .5, 1, .4); },
  end(best) { play('bell', .6, .9); play(best ? 'success' : 'choir', .6); },
  ui() { play('soft', .4, 1.5); }
};
