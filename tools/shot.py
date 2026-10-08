import sys
from playwright.sync_api import sync_playwright
url='file:///home/claude/hsk13/dist/hsk1-3-grammar.html'
js=sys.argv[1] if len(sys.argv)>1 else ''
out=sys.argv[2] if len(sys.argv)>2 else '/tmp/claude-0/s13/a.png'
w=int(sys.argv[3]) if len(sys.argv)>3 else 1280
full=(sys.argv[4]=='full') if len(sys.argv)>4 else True
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={'width':w,'height':900})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'net::' not in m.text else None)
    pg.route('**/fonts.g*/**',lambda r:r.abort())
    pg.goto(url); pg.wait_for_timeout(300)
    if js: pg.evaluate(js); pg.wait_for_timeout(300)
    pg.screenshot(path=out, full_page=full); print('errors',errs)
    b.close()
