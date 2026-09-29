"""Echte admin-opnames Publish Check (lokale EmDash 1.0.1-testsite). Draait onder agentbox-test-browser."""
import base64, json, os, time, urllib.request, websocket
cdp = os.environ["AGENTBOX_TEST_CDP"].rstrip("/"); cdp = cdp if cdp.startswith("http") else "http://" + cdp
OUT = os.path.dirname(os.path.abspath(__file__)); S = "http://localhost:4330"
A = "01M3PG13J73A048QMQXQHF83E8"; B = "01M3PG14PZRJAHFRE8C4RFE57V"
t = json.load(urllib.request.urlopen(urllib.request.Request(cdp + "/json/new?about:blank", method="PUT")))
ws = websocket.create_connection(t["webSocketDebuggerUrl"], suppress_origin=True, timeout=60)
n = [0]; clip = {"name": None, "frames": []}
def handle(m):
    if m.get("method") == "Page.screencastFrame":
        p = m["params"]
        if clip["name"]:
            d = os.path.join(OUT, clip["name"]); os.makedirs(d, exist_ok=True)
            fn = os.path.join(d, "%05d.jpg" % len(clip["frames"])); open(fn, "wb").write(base64.b64decode(p["data"]))
            clip["frames"].append((fn, time.time()))
        n[0] += 1; ws.send(json.dumps({"id": n[0], "method": "Page.screencastFrameAck", "params": {"sessionId": p["sessionId"]}}))
def call(m, p={}):
    n[0] += 1; my = n[0]; ws.send(json.dumps({"id": my, "method": m, "params": p}))
    while True:
        r = json.loads(ws.recv())
        if r.get("id") == my: return r.get("result", {})
        handle(r)
def pump(sec):
    end = time.time() + sec; ws.settimeout(0.2)
    while time.time() < end:
        try: handle(json.loads(ws.recv()))
        except websocket.WebSocketTimeoutException: pass
    ws.settimeout(60)
def js(e): return call("Runtime.evaluate", {"expression": e, "returnByValue": True, "awaitPromise": True}).get("result", {}).get("value")
def go(url, wait=4): call("Page.navigate", {"url": url}); pump(wait)
def start(name): 
    clip["name"] = name; clip["frames"] = []
    call("Page.startScreencast", {"format": "jpeg", "quality": 90, "maxWidth": 1600, "maxHeight": 1000, "everyNthFrame": 1})
def stop():
    call("Page.stopScreencast"); pump(0.3)
    json.dump(clip["frames"], open(os.path.join(OUT, clip["name"] + ".json"), "w")); print(clip["name"], len(clip["frames"])); clip["name"] = None
CLICK_PUBLISH = "(()=>{const b=[...document.querySelectorAll('button')].find(x=>/Publish now/i.test(x.textContent));if(!b)return 'geen knop';b.scrollIntoView({block:'center'});return b.getBoundingClientRect().toJSON()})()"
CONFIRM = "(()=>{const d=document.querySelector('[role=alertdialog],[role=dialog]');if(!d)return 'geen dialoog';const b=[...d.querySelectorAll('button')].find(x=>/Publish now/i.test(x.textContent));return b?b.getBoundingClientRect().toJSON():'geen knop'})()"
def click_rect(r):
    x = r["x"] + r["width"] / 2; y = r["y"] + r["height"] / 2
    for typ in ("mouseMoved", "mousePressed", "mouseReleased"):
        call("Input.dispatchMouseEvent", {"type": typ, "x": x, "y": y, "button": "left", "clickCount": 1}); pump(0.08)
call("Page.enable"); call("Runtime.enable")
call("Emulation.setDeviceMetricsOverride", {"width": 1600, "height": 1000, "deviceScaleFactor": 1, "mobile": False})
go(S + "/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin", 6)
js("localStorage.setItem('emdash-welcome-dismissed','1')")
# clip 1: fout concept → weigering
go(S + f"/_emdash/admin/content/posts/{A}?locale=en", 5)
js("document.querySelectorAll('[role=dialog] button[aria-label=Close], [role=dialog] button').forEach(b=>{if(/Get Started|Close/i.test(b.textContent||b.getAttribute('aria-label')||''))b.click()})"); pump(1)
start("01-weigering"); pump(1.5)
r = js(CLICK_PUBLISH); print("knop A", r)
if isinstance(r, dict): click_rect(r)
pump(1.2); r2 = js(CONFIRM); print("bevestig A", r2)
if isinstance(r2, dict): click_rect(r2)
pump(6); stop()
print("toast", js("document.body.innerText.match(/Failed to publish[\\s\\S]{0,400}/)?.[0]"))
# clip 2: goed concept → gepubliceerd
go(S + f"/_emdash/admin/content/posts/{B}?locale=en", 5)
start("02-gepubliceerd"); pump(1.5)
r = js(CLICK_PUBLISH); print("knop B", r)
if isinstance(r, dict): click_rect(r)
pump(1.2); r2 = js(CONFIRM); print("bevestig B", r2)
if isinstance(r2, dict): click_rect(r2)
pump(6); stop()
print("status B", js("document.body.innerText.match(/(Published|Live|published)[^\\n]{0,80}/)?.[0]"))
# clip 3: rapportenpagina
go(S + "/_emdash/admin/plugins/publish-check/reports", 3)
start("03-rapporten"); pump(4); stop()
# clip 4: pluginbeheer met rechten
go(S + "/_emdash/admin/plugins-manager", 3)
rr = js("(()=>{const e=[...document.querySelectorAll('a,button,[role=button]')].filter(x=>/publish-check/i.test(x.textContent)||x.querySelector('svg.lucide-chevron-right'));const t=[...document.querySelectorAll('*')].find(x=>x.children.length<3&&/^publish-check$/i.test((x.textContent||'').trim()));const row=t&&t.closest('div[class*=border],li,article');const c=row&&[...row.querySelectorAll('button,a')].pop();return c?c.getBoundingClientRect().toJSON():'geen'})()"); print("rij", rr)
if isinstance(rr, dict): click_rect(rr)
pump(2)
start("04-rechten"); pump(4); stop()
call("Page.navigate", {"url": "about:blank"})
