"""Potion Mixer headless test (Chrome + SwiftShader WebGL): load w/o console errors, tap + drag ingredients, right order -> creature,
wrong order -> goo, recipe timeout, combo, end screen + PNG card, DE toggle, kids mode (no timer, secret potions), mobile tap, all quality levels."""
import asyncio, os, struct, sys
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = 'file://' + ROOT + '/index.html'
OUT = ROOT + '/test/shots/'; os.makedirs(OUT, exist_ok=True)
ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required']
R = []
def check(n, ok, info=''): R.append(bool(ok)); print(('PASS ' if ok else 'FAIL ') + n + (f' — {info}' if info != '' else ''), flush=True)

async def page(b, q='high', **kw):
    ctx = await b.new_context(accept_downloads=True, **kw)
    await ctx.add_init_script(f"window.__pmSeed = 4242; window.__pmNoAutoQ = true; try{{localStorage.clear(); localStorage.setItem('pm-q','{q}')}}catch(e){{}}")
    pg = await ctx.new_page(); logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append(f'PAGEERROR {e}'))
    await pg.goto(URL); await pg.wait_for_function('document.body.classList.contains("ready")', timeout=60000)
    await pg.evaluate('window.__pmManual = true; __pm.step(1/30, 5)')
    return ctx, pg, logs

async def tap(pg, kind, touch=False):
    p = await pg.evaluate(f'__pm.slotScreen("{kind}")')
    if touch: await pg.touchscreen.tap(p['x'], p['y'])
    else: await pg.mouse.click(p['x'], p['y'])
    await pg.evaluate('__pm.step(1/30, 22)')

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=ARGS)
        ctx, pg, logs = await page(b, viewport={'width': 1280, 'height': 800})
        check('menu visible, EN default', await pg.is_visible('#menu.show') and (await pg.text_content('#btnPlay')) == 'Play')
        await pg.screenshot(path=OUT + 'shot-menu.png')
        await pg.click('#btnLang'); de = await pg.text_content('#btnPlay'); await pg.evaluate('__pm.step(1/30, 2)'); await pg.screenshot(path=OUT + 'shot-menu-de.png')
        check('DE toggle', de == 'Spielen', de); await pg.click('#btnLang')
        await pg.click('#btnPlay'); await pg.evaluate('__pm.step(1/30, 10)')
        check('round starts with recipe card, 60 s', await pg.evaluate('__pm.S.state') == 'play' and await pg.is_visible('#card.show') and await pg.evaluate('__pm.S.time') > 59)
        n = await pg.evaluate('new Promise(r => { const f = () => window.__pmAudioReady ? r(window.__pmAudioReady) : setTimeout(f, 100); f(); })')
        check('CC0 sounds decoded', n == 23, n)
        rec = await pg.evaluate('__pm.S.recipe.ing'); s0 = await pg.evaluate('__pm.S.score')
        await tap(pg, rec[0]); check('tap correct 1st ingredient advances recipe', await pg.evaluate('__pm.S.idx') == 1)
        # drag the 2nd ingredient into the cauldron
        a = await pg.evaluate(f'__pm.slotScreen("{rec[1]}")'); c = await pg.evaluate('__pm.cauldronScreen()')
        await pg.mouse.move(a['x'], a['y']); await pg.mouse.down()
        for i in range(1, 11):
            await pg.mouse.move(a['x'] + (c['x'] - a['x']) * i / 10, a['y'] + (c['y'] - a['y']) * i / 10); await pg.evaluate('__pm.step(1/30)')
        await pg.mouse.up(); await pg.evaluate('__pm.step(1/30, 20)')
        check('drag 2nd ingredient into cauldron', await pg.evaluate('__pm.S.idx') == 2)
        await tap(pg, rec[2]); await pg.evaluate('__pm.step(1/30, 8)')
        cr = await pg.evaluate('__pm.creature()'); s1 = await pg.evaluate('__pm.S.score')
        check('right order -> creature rises + score', cr is not None and s1 - s0 >= 100 and await pg.evaluate('__pm.S.combo') == 1, (cr, s1 - s0))
        await pg.evaluate('__pm.step(1/30, 14)'); await pg.screenshot(path=OUT + 'shot-creature.png')
        await pg.evaluate('__pm.step(1/30, 40)')
        rec = await pg.evaluate('__pm.S.recipe.ing'); wrongk = [k for k in ['eye', 'frog', 'mushroom', 'wing', 'moonflower', 'pumpkin', 'crystal'] if k != rec[0]][0]
        await tap(pg, wrongk); await pg.evaluate('__pm.step(1/30, 4)')
        check('wrong ingredient -> goo, combo reset', await pg.evaluate('__pm.S.combo') == 0 and await pg.evaluate('__pm.S.gap') > 0)
        await pg.screenshot(path=OUT + 'shot-wrong.png')
        await pg.evaluate('__pm.step(1/30, 40)'); tl = await pg.evaluate('__pm.S.tLimit'); r0 = await pg.evaluate('__pm.S.recipe.id')
        await pg.evaluate(f'__pm.step(1/30, {int(tl * 30) + 4})')
        check('recipe times out (too slow) and a new one comes', await pg.evaluate('__pm.S.idx') == 0 and await pg.evaluate('__pm.S.combo') == 0, (round(tl, 1), r0))
        t1 = await pg.evaluate('(__pm.S.el = 50, __pm.step(1/30, 30), __pm.S.tLimit)')
        check('recipes get faster', t1 < tl, (round(tl, 1), round(t1, 1)))
        await pg.evaluate('__pm.step(1/30, 340)')
        check('end screen after 60 s', await pg.is_visible('#end.show') and await pg.evaluate('__pm.S.state') == 'end', await pg.text_content('#eScore'))
        check('default name Player', await pg.input_value('#eName') == 'Player')
        await pg.screenshot(path=OUT + 'shot-end.png')
        async with pg.expect_download() as dl: await pg.click('#btnCard')
        d = await dl.value; path = OUT + 'card.png'; await d.save_as(path)
        w, h = struct.unpack('>II', open(path, 'rb').read()[16:24]); check('highscore card PNG 1080x1350', (w, h) == (1080, 1350), (w, h, d.suggested_filename))
        check('no console errors (desktop)', not logs, logs[:5]); await ctx.close()
        # kids mode
        ctx, pg, logs = await page(b, viewport={'width': 1280, 'height': 800})
        await pg.click('#btnKids'); check('kids text', 'secret' in (await pg.text_content('#h3')))
        await pg.evaluate('__pm.step(1/30, 2)'); await pg.screenshot(path=OUT + 'shot-kids-menu.png')
        await pg.click('#btnPlay'); await pg.evaluate('__pm.step(1/30, 5)')
        for k in ['crystal', 'eye', 'moonflower']: await tap(pg, k)
        await pg.evaluate('__pm.step(1/30, 6)')
        check('kids: any-order secret potion discovered', await pg.evaluate('__pm.S.found.size') == 1 and await pg.evaluate('__pm.creature()') == 'ghost')
        await pg.evaluate('__pm.step(1/30, 20)'); await pg.screenshot(path=OUT + 'shot-kids-play.png')
        for k in ['eye', 'eye', 'eye']: await tap(pg, k); await pg.evaluate('__pm.step(1/30, 6)')
        await pg.evaluate('__pm.step(1/30, 1900)')
        check('kids: no timer (still playing after 60 s)', await pg.evaluate('__pm.S.state') == 'play' and not await pg.is_visible('#hTimeBox'))
        await pg.click('#btnFinish'); await pg.evaluate('__pm.step(1/30, 5)')
        check('kids: finish shows end screen with discoveries', await pg.is_visible('#end.show') and '1/8' in await pg.text_content('#eScore'))
        check('no console errors (kids)', not logs, logs[:5]); await ctx.close()
        # mobile tap
        ctx, pg, logs = await page(b, viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
        await pg.evaluate('__pm.step(1/30, 2)'); await pg.screenshot(path=OUT + 'shot-mobile-menu.png')
        await pg.tap('#btnPlay'); await pg.evaluate('__pm.step(1/30, 10)')
        check('mobile: tap starts game', await pg.evaluate('__pm.S.state') == 'play')
        rec = await pg.evaluate('__pm.S.recipe.ing'); await tap(pg, rec[0], True)
        check('mobile: tap throws ingredient', await pg.evaluate('__pm.S.idx') == 1)
        await tap(pg, rec[1], True); await pg.screenshot(path=OUT + 'shot-mobile-play.png')
        check('no console errors (mobile)', not logs, logs[:5]); await ctx.close()
        # quality levels
        for q in ['low', 'mid', 'high', 'ultra']:
            ctx, pg, logs = await page(b, q=q, viewport={'width': 960, 'height': 600})
            await pg.evaluate('__pm.start(); __pm.step(1/30, 30)'); px = await pg.evaluate('(() => { const g = __pm.renderer.getContext(); const a = new Uint8Array(4); g.readPixels(480, 300, 1, 1, g.RGBA, g.UNSIGNED_BYTE, a); return __pm.quality(); })()')
            await pg.screenshot(path=OUT + f'shot-quality-{q}.png')
            check(f'quality {q} renders without errors', px == q and not logs, logs[:3]); await ctx.close()
        await b.close()
    print(f'{sum(R)}/{len(R)} passed'); sys.exit(0 if all(R) else 1)
asyncio.run(main())
