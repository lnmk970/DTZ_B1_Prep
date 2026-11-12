# -*- coding: utf-8 -*-
"""Builds the DTZ B1 mock-test site into ./docs from content/mock_*.py (each defines MOCKS = [dict, ...]).
Usage: python build.py     (then: python gen_audio.py docs)
"""
import os, sys, json, html, glob, importlib.util, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(ROOT, "docs")
START = datetime.date(2026, 11, 13)
EXAM = datetime.date(2026, 12, 10)
WD = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
MON = ["", "Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
E = lambda s: html.escape(str(s), quote=True)
VOICE = {"F": "de-DE-KatjaNeural", "M": "de-DE-ConradNeural", "G": "de-DE-AmalaNeural", "N": "de-DE-KillianNeural", "A": "de-DE-KatjaNeural", "B": "de-DE-ConradNeural"}
LET = "abcdefghx"

import re as _re
_CNT = [0]


def rot(o, a):
    """Rotate 3-option a/b/c items so the correct answer is spread evenly (skip richtig/falsch and ordered numbers)."""
    parts = o.split("|")
    if len(parts) != 3 or parts[0] == "richtig" or _re.search(r"\d", o):
        return o, a
    tgt = _CNT[0] % 3
    _CNT[0] += 1
    k = (a - tgt) % 3
    parts = parts[k:] + parts[:k]
    return "|".join(parts), tgt



def load_mocks():
    out = []
    for p in sorted(glob.glob(os.path.join(ROOT, "content", "mock_*.py"))):
        spec = importlib.util.spec_from_file_location("m", p)
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        out += m.MOCKS
    return out


def folder(n):
    return f"mock-test-{n:02d}-day-{n:02d}"


def date_of(n):
    d = START + datetime.timedelta(days=n - 1)
    return d, f"{WD[d.weekday()]}, {d.day}. {MON[d.month]} {d.year}"


# ---------- audio script ----------
def seg(t, v="F", p=0.8, r="+0%"):
    return {"t": t, "v": VOICE[v], "p": p, "r": r}


def audio_hoeren(n, M):
    s = [seg(f"Deutsch-Test für Zuwanderer. Modelltest {n}. Hören. Sie hören jeden Text nur einmal. Lesen Sie zuerst die Aufgabe, hören Sie dann den Text dazu.", "F", 3)]
    s.append(seg("Aufgabe 1. Sie hören jetzt vier Ansagen am Telefon oder per Lautsprecher. Zu jedem Text gibt es eine Aufgabe. Bitte kreuzen Sie die richtige Antwort an.", "F", 8))
    for i, (t, q, o, a) in enumerate(M["h1"]):
        s.append(seg(f"Text {i+1}.", "F", 0.8)); s.append(seg(t, "AB"[i % 2], 12, "+5%"))
    s.append(seg("Aufgabe 2. Sie hören jetzt fünf Ansagen im Radio. Zu jedem Text gibt es eine Aufgabe. Bitte kreuzen Sie die richtige Antwort an.", "F", 8))
    for i, (t, q, o, a) in enumerate(M["h2"]):
        s.append(seg(f"Text {i+5}.", "F", 0.8)); s.append(seg(t, "AB"[i % 2], 12, "+5%"))
    s.append(seg("Aufgabe 3. Sie hören jetzt vier Gespräche. Zu jedem Gespräch lösen Sie zwei Aufgaben. Bitte kreuzen Sie die richtige Antwort an.", "F", 10))
    for i, (setting, turns, qs) in enumerate(M["h3"]):
        s.append(seg(f"Gespräch {i+1}. {setting}", "F", 12))
        for who, line in turns:
            s.append(seg(line, who, 0.4, "+5%"))
        s[-1]["p"] = 18
    s.append(seg("Aufgabe 4. Sie hören jetzt drei Personen. Sie sprechen über ein Thema. Ordnen Sie die Aussagen a bis f den Personen zu. Nicht jede Aussage passt. Sie haben eine Minute Zeit, die Aussagen zu lesen.", "F", 60))
    for i, t in enumerate(M["h4"][1]):
        s.append(seg(f"Person {i+1}.", "F", 0.8)); s.append(seg(t, "GNF"[i % 3] if i != 1 else "N", 10, "+5%"))
    s.append(seg("Das war der Prüfungsteil Hören. Bitte übertragen Sie Ihre Lösungen auf den Antwortbogen. Vielen Dank.", "F", 1))
    return s


def audio_sprechen(M):
    s = []
    p1 = M["p1"]; p2 = M["p2"]; p3 = M["p3"]
    s.append(seg("Sprechen, Teil 1. Beispielantwort.", "F", 1)); s.append(seg(p1[2], "M", 2, "-5%"))
    s.append(seg("Sprechen, Teil 2. Beispielantwort.", "F", 1)); s.append(seg(p2[2], "M", 2, "-5%"))
    s.append(seg("Sprechen, Teil 3. Beispielgespräch.", "F", 1))
    for who, line in p3[2]:
        s.append(seg(line, who, 0.6, "-5%"))
    return s


# ---------- page pieces ----------
def mc(name, opts, label=None):
    h = ""
    for i, o in enumerate(opts):
        h += f'<label class="opt"><input type="radio" name="{name}" value="{i}"><span class="k">{LET[i]}</span><span>{E(o)}</span></label>'
    return f'<div class="opts" data-q="{name}">{h}</div>'


def item(num, q, opts, name):
    return f'<div class="item" id="i-{name}"><div class="qn">{num}</div><div class="qb"><p class="q">{E(q)}</p>{mc(name, opts)}<p class="fb"></p></div></div>'


def build_page(n, M, total):
    d, ds = date_of(n)
    key = {}
    # ----- Hören -----
    H = ""
    c = 0
    H += '<h3>Aufgabe 1 · Ansagen am Telefon oder per Lautsprecher</h3><p class="hint">Sie hören jeden Text einmal. Zu jedem Text gibt es eine Aufgabe.</p>'
    for t, q, o, a in M["h1"]:
        o, a = rot(o, a)
        c += 1; nm = f"h{c}"; key[nm] = a
        H += item(c, q, o.split("|"), nm)
    H += '<h3>Aufgabe 2 · Ansagen im Radio</h3>'
    for t, q, o, a in M["h2"]:
        o, a = rot(o, a)
        c += 1; nm = f"h{c}"; key[nm] = a
        H += item(c, q, o.split("|"), nm)
    H += '<h3>Aufgabe 3 · Gespräche</h3><p class="hint">Zu jedem Gespräch lösen Sie zwei Aufgaben.</p>'
    for gi, (setting, turns, qs) in enumerate(M["h3"]):
        H += f'<div class="sub">Gespräch {gi+1} · {E(setting)}</div>'
        for q, o, a in qs:
            o, a = rot(o, a)
            c += 1; nm = f"h{c}"; key[nm] = a
            H += item(c, q, o.split("|"), nm)
    th, speakers, stm, ans = M["h4"]
    H += f'<h3>Aufgabe 4 · {E(th)}</h3><p class="hint">Ordnen Sie die Aussagen den drei Personen zu. Nicht jede Aussage passt. Sie haben eine Minute Zeit zum Lesen.</p><ul class="stm">'
    for i, x in enumerate(stm):
        H += f'<li><b>{LET[i]}</b> {E(x)}</li>'
    H += "</ul>"
    for i in range(3):
        c += 1; nm = f"h{c}"; key[nm] = ans[i]
        H += item(c, f"Person {i+1}", [f"{LET[j]}" for j in range(len(stm))], nm).replace('class="opts"', 'class="opts row"')
    assert c == 20, (n, c)
    # transcript
    TR = ""
    for i, (t, q, o, a) in enumerate(M["h1"] + M["h2"]):
        TR += f"<p><b>Text {i+1}:</b> {E(t)}</p>"
    for gi, (setting, turns, qs) in enumerate(M["h3"]):
        TR += f"<p><b>Gespräch {gi+1}</b> ({E(setting)})<br>" + "<br>".join(f"{'Frau' if w in 'FG' else 'Mann'}: {E(l)}" for w, l in turns) + "</p>"
    for i, t in enumerate(speakers):
        TR += f"<p><b>Person {i+1}:</b> {E(t)}</p>"
    # ----- Lesen -----
    L = ""
    c = 0
    L += '<h3>Aufgabe 1 · Rubriken</h3><p class="hint">Wo finden Sie das? Wählen Sie die richtige Rubrik.</p>'
    for t, q, o, a in M["l1"]:
        o, a = rot(o, a)
        c += 1; nm = f"l{c}"; key[nm] = a
        L += item(c, q, o.split("|"), nm)
    ads, sits, sans = M["l2"]
    L += '<h3>Aufgabe 2 · Anzeigen</h3><p class="hint">Welche Anzeige passt zu welcher Situation? Eine Situation hat keine passende Anzeige: Wählen Sie dann <b>x</b>.</p><div class="ads">'
    for i, x in enumerate(ads):
        L += f'<div class="ad"><b>{LET[i]}</b> {E(x)}</div>'
    L += "</div>"
    for i, sit in enumerate(sits):
        c += 1; nm = f"l{c}"
        key[nm] = (8 if sans[i] == "x" else LET.index(sans[i]))
        L += item(c, sit, list(LET[:len(ads)]) + ["x"], nm).replace('class="opts"', 'class="opts row"')
    L += '<h3>Aufgabe 3 · Texte</h3>'
    for text, qs in M["l3"]:
        L += f'<div class="text">{E(text).replace(chr(10), "<br>")}</div>'
        for q, o, a in qs:
            o, a = rot(o, a)
            c += 1; nm = f"l{c}"; key[nm] = a
            L += item(c, q, o.split("|"), nm)
    text, qs = M["l4"]
    L += f'<h3>Aufgabe 4 · Produktinformation / Hinweise</h3><div class="text">{E(text).replace(chr(10), "<br>")}</div>'
    for q, a in qs:
        c += 1; nm = f"l{c}"; key[nm] = a
        L += item(c, q, ["richtig", "falsch"], nm)
    text, gaps = M["l5"]
    body = E(text).replace(chr(10), "<br>")
    for i in range(len(gaps)):
        body = body.replace(f"[{i+1}]", f"<b class='gap'>({20+i})</b>")
    L += f'<h3>Aufgabe 5 · Lückentext</h3><p class="hint">Welches Wort passt? Lösen Sie die Aufgaben 20 bis 25.</p><div class="text">{body}</div>'
    for o, a in gaps:
        o, a = rot(o, a)
        c += 1; nm = f"l{c}"; key[nm] = a
        L += item(c, f"Lücke ({c})", o.split("|"), nm).replace('class="opts"', 'class="opts row"')
    assert c == 25, (n, c)
    # ----- Schreiben -----
    sit, lp, model = M["s"]
    S = f'<div class="text">{E(sit).replace(chr(10), "<br>")}</div><p><b>Schreiben Sie auf alle vier Punkte:</b></p><ol>' + "".join(f"<li>{E(x)}</li>" for x in lp) + "</ol>"
    # ----- Sprechen -----
    p1, p2, p3 = M["p1"], M["p2"], M["p3"]
    P = '<h3>Teil 1 · Sich vorstellen</h3><p class="hint">Sie stellen sich vor (ca. 1 Minute). Danach stellt die Prüferin oder der Prüfer ein bis zwei Fragen.</p><ul>' + "".join(f"<li>{E(x)}</li>" for x in p1[0]) + "</ul><p><b>Mögliche Nachfragen:</b> " + E(" · ".join(p1[1])) + "</p>"
    P += f'<h3>Teil 2 · Informationsaustausch</h3><div class="text"><b>Bildkarte (Foto):</b> {E(p2[0])}</div><ul>' + "".join(f"<li>{E(x)}</li>" for x in p2[1]) + "</ul>"
    P += f'<h3>Teil 3 · Gemeinsam etwas planen</h3><div class="text">{E(p3[0])}</div><ul>' + "".join(f"<li>{E(x)}</li>" for x in p3[1]) + "</ul>"
    P_model = f"<p><b>Teil 1:</b> {E(p1[2])}</p><p><b>Teil 2:</b> {E(p2[2])}</p><p><b>Teil 3:</b><br>" + "<br>".join(f"{'Person A' if w in 'FG' else 'Person B'}: {E(l)}" for w, l in p3[2]) + "</p>"

    prev = f'<a href="../{folder(n-1)}/">← Test {n-1}</a>' if n > 1 else "<span></span>"
    nxt = f'<a href="../{folder(n+1)}/">Test {n+1} →</a>' if n < total else "<span></span>"
    meta = json.dumps({"n": n, "key": key}, ensure_ascii=False)
    return f"""<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DTZ B1 · Modelltest {n} (Tag {n})</title><link rel="stylesheet" href="../assets/style.css"></head>
<body>
<header class="top"><a class="home" href="../">⌂ Übersicht</a>
<div><div class="eyebrow">Deutsch-Test für Zuwanderer · B1</div><h1>Modelltest {n} <small>· Tag {n} · {ds}</small></h1><div class="theme">Thema: {E(M['th'])}</div></div>
<div class="count" id="count"></div></header>
<nav class="tabs"><button data-t="hoeren" class="on">Hören<br><small>25 Min · 20</small></button><button data-t="lesen">Lesen<br><small>45 Min · 25</small></button><button data-t="schreiben">Schreiben<br><small>30 Min</small></button><button data-t="sprechen">Sprechen<br><small>ca. 15 Min</small></button><button data-t="ergebnis">Ergebnis</button></nav>
<main>
<section id="hoeren" class="on"><div class="card"><h2>Hören</h2><p>Sie hören jeden Text <b>nur einmal</b>. Lesen Sie zuerst die Aufgabe, hören Sie dann den Text. Starten Sie die Audiodatei erst, wenn Sie bereit sind – und spulen Sie nicht zurück, wie in der echten Prüfung.</p>
<audio controls preload="none" src="hoeren.mp3"></audio><div class="timer" data-min="25"><span>25:00</span><button>Zeit starten</button></div></div>
<div class="card">{H}</div>
<div class="card"><button class="btn" data-eval="h">Hören auswerten</button><div id="res-h" class="res"></div>
<details><summary>Hörtexte (erst nach dem Auswerten lesen)</summary>{TR}</details></div></section>
<section id="lesen"><div class="card"><h2>Lesen</h2><p>Lösen Sie die Aufgaben 1 bis 25. Sie haben 45 Minuten Zeit. Wenn Sie eine Aufgabe nicht lösen können, gehen Sie weiter.</p><div class="timer" data-min="45"><span>45:00</span><button>Zeit starten</button></div></div>
<div class="card">{L}</div>
<div class="card"><button class="btn" data-eval="l">Lesen auswerten</button><div id="res-l" class="res"></div></div></section>
<section id="schreiben"><div class="card"><h2>Schreiben</h2><p>Sie haben 30 Minuten Zeit. <b>Schreiben Sie möglichst viel</b> (ca. 80–100 Wörter) und behandeln Sie alle vier Punkte.</p>{S}
<div class="timer" data-min="30"><span>30:00</span><button>Zeit starten</button></div>
<textarea id="brief" rows="14" placeholder="Schreiben Sie hier Ihren Brief …"></textarea><div class="wc" id="wc">0 Wörter</div>
<div class="row2"><button class="btn" id="copy">Text kopieren</button></div>
<p class="hint">Bewertung: Fügen Sie den Text im Claude-Chat ein und schreiben Sie „Schreiben bewerten, Modelltest {n}“. Claude bewertet Inhaltliche Angemessenheit (0–5), Kommunikative Gestaltung, Korrektheit, Wortschatz und gibt eine korrigierte Version.</p>
<details><summary>Modellbrief (erst nach dem Schreiben)</summary><div class="text">{E(model).replace(chr(10), "<br>")}</div></details>
<div class="self"><b>Selbsteinschätzung:</b> <label><input type="radio" name="s" value="0"> A1</label> <label><input type="radio" name="s" value="1"> A2</label> <label><input type="radio" name="s" value="2"> B1</label></div></div></section>
<section id="sprechen"><div class="card"><h2>Sprechen</h2><p>Die mündliche Prüfung ist eine Paarprüfung. Üben Sie mit Ihrer Partnerin oder allein laut. Nehmen Sie sich mit dem Handy auf und hören Sie sich danach an.</p>{P}
<audio controls preload="none" src="sprechen_modell.mp3"></audio>
<p class="hint">Bewertung: Schicken Sie Ihre Antwort (getippt oder diktiert) in den Claude-Chat und schreiben Sie „Ich bin fertig, Modelltest {n}“. Kriterien wie im Prüferblatt: Aussprache und Intonation (nur beim lauten Üben), Flüssigkeit, Korrektheit, Wortschatz, Inhaltliche Angemessenheit – je A1 / A2 / B1.</p>
<details><summary>Beispielantworten (erst nach dem Sprechen)</summary>{P_model}</details>
<div class="self"><b>Selbsteinschätzung:</b> <label><input type="radio" name="p" value="0"> A1</label> <label><input type="radio" name="p" value="1"> A2</label> <label><input type="radio" name="p" value="2"> B1</label></div></div></section>
<section id="ergebnis"><div class="card"><h2>Ergebnis</h2><div id="final"></div><p class="hint">B1 insgesamt: B1 im Sprechen <b>und</b> B1 in Hören/Lesen <b>oder</b> in Schreiben. Hören + Lesen: ab 33 von 45 richtig = B1, ab 20 = A2.</p></div></section>
</main>
<footer class="nav">{prev}{nxt}</footer>
<script id="meta" type="application/json">{meta}</script><script src="../assets/app.js"></script>
</body></html>"""


def build_index(mocks):
    meta = json.dumps([{"n": i + 1, "f": folder(i + 1), "d": date_of(i + 1)[1], "th": M["th"]} for i, M in enumerate(mocks)], ensure_ascii=False)
    return f"""<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DTZ B1 · Modelltests</title><link rel="stylesheet" href="assets/style.css"></head>
<body><header class="top big"><div><div class="eyebrow">Deutsch-Test für Zuwanderer</div><h1>DTZ B1 · {len(mocks)} Modelltests</h1><div class="theme">Prüfung: Donnerstag, 10. Dezember 2026</div></div><div class="count" id="count"></div></header>
<main><div class="card"><div class="bar"><i id="bar"></i></div><p id="sum"></p><p class="hint">Jeder Tag ist eine komplette Prüfung: Hören (20) · Lesen (25) · Schreiben · Sprechen. Bestanden: B1 im Sprechen und in Hören/Lesen (ab 33 von 45) oder Schreiben. Dein Fortschritt wird nur in diesem Browser gespeichert.</p></div>
<div id="list"></div></main>
<script>const MOCKS={meta};</script><script src="assets/index.js"></script></body></html>"""


CSS = """
:root{--bg:#0f172a;--card:#fff;--ink:#0f172a;--mut:#64748b;--acc:#4f46e5;--ok:#16a34a;--bad:#dc2626;--line:#e2e8f0}
*{box-sizing:border-box}body{margin:0;font:16px/1.55 system-ui,Segoe UI,Roboto,sans-serif;background:#f1f5f9;color:var(--ink)}
.top{display:flex;gap:16px;align-items:center;flex-wrap:wrap;padding:18px 20px;background:linear-gradient(135deg,#1e1b4b,#4f46e5 60%,#0ea5e9);color:#fff}
.top h1{margin:0;font-size:1.5rem}.top small{font-weight:400;opacity:.8}.eyebrow{font-size:.75rem;letter-spacing:.12em;text-transform:uppercase;opacity:.8}.theme{opacity:.9}
.home{color:#fff;text-decoration:none;background:#ffffff22;padding:6px 10px;border-radius:8px}.count{margin-left:auto;background:#ffffff22;padding:8px 14px;border-radius:12px;font-weight:600}
.tabs{display:flex;gap:6px;padding:10px;position:sticky;top:0;background:#f1f5f9;z-index:5;overflow:auto}.tabs button{flex:1;min-width:84px;border:1px solid var(--line);background:#fff;border-radius:10px;padding:8px;font-weight:600;cursor:pointer}.tabs button small{font-weight:400;color:var(--mut)}.tabs button.on{background:var(--acc);color:#fff;border-color:var(--acc)}.tabs button.on small{color:#e0e7ff}
main{max-width:860px;margin:0 auto;padding:10px 12px 40px}section{display:none}section.on{display:block}.card{background:var(--card);border-radius:14px;padding:16px 18px;margin:12px 0;box-shadow:0 1px 3px #0001}
h2{margin:.2em 0 .4em}h3{margin:1.3em 0 .2em;color:var(--acc)}.hint{color:var(--mut);font-size:.92rem}.sub{margin:14px 0 4px;font-weight:700;background:#eef2ff;padding:6px 10px;border-radius:8px}
.item{display:flex;gap:10px;padding:10px 0;border-top:1px solid var(--line)}.qn{width:30px;height:30px;flex:none;border-radius:50%;background:var(--acc);color:#fff;display:grid;place-items:center;font-weight:700;font-size:.85rem}.qb{flex:1}.q{margin:.1em 0 .4em;font-weight:600}
.opt{display:flex;gap:8px;align-items:flex-start;padding:7px 10px;border:1px solid var(--line);border-radius:10px;margin:5px 0;cursor:pointer}.opt:hover{background:#f8fafc}.opt input{margin-top:5px}.k{font-weight:700;color:var(--acc);min-width:1.1em}
.opts.row{display:flex;flex-wrap:wrap;gap:6px}.opts.row .opt{margin:0;padding:6px 12px}
.opt.right{background:#dcfce7;border-color:var(--ok)}.opt.wrong{background:#fee2e2;border-color:var(--bad)}.fb{margin:.2em 0 0;font-size:.9rem;color:var(--mut)}
.text,.ad{background:#f8fafc;border-left:4px solid var(--acc);padding:10px 14px;border-radius:8px;margin:10px 0}.ads{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(250px,1fr))}.ad{margin:0;font-size:.93rem}
.stm{list-style:none;padding:0}.stm li{padding:4px 0}.gap{color:var(--acc)}
.btn{background:var(--acc);color:#fff;border:0;border-radius:10px;padding:10px 18px;font-weight:700;cursor:pointer}.res{margin-top:12px;font-weight:600}
.timer{display:flex;gap:10px;align-items:center;margin:10px 0}.timer span{font:700 1.4rem ui-monospace,monospace}.timer button{border:1px solid var(--line);background:#fff;border-radius:8px;padding:5px 10px;cursor:pointer}
audio{width:100%;margin:8px 0}textarea{width:100%;font:inherit;padding:10px;border:1px solid var(--line);border-radius:10px}.wc{color:var(--mut);margin:4px 0 8px}.self{margin-top:14px;padding:10px;background:#f8fafc;border-radius:10px}.self label{margin-right:12px}
details{margin-top:12px}summary{cursor:pointer;font-weight:600;color:var(--acc)}
footer.nav{display:flex;justify-content:space-between;max-width:860px;margin:0 auto;padding:0 16px 40px}footer.nav a{color:var(--acc);font-weight:600;text-decoration:none}
.bar{height:12px;background:#e2e8f0;border-radius:99px;overflow:hidden}.bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#22c55e,#4f46e5)}
.day{display:flex;gap:12px;align-items:center;background:#fff;border-radius:12px;padding:12px 14px;margin:8px 0;text-decoration:none;color:inherit;box-shadow:0 1px 3px #0001}.day .n{width:42px;height:42px;border-radius:12px;background:#eef2ff;color:var(--acc);display:grid;place-items:center;font-weight:800}.day.today{outline:2px solid var(--acc)}.day .t{flex:1}.day small{color:var(--mut)}.pill{padding:3px 10px;border-radius:99px;font-size:.8rem;font-weight:700;background:#e2e8f0}.pill.b1{background:#dcfce7;color:#166534}.pill.a2{background:#fef9c3;color:#854d0e}
"""

APP = r"""
(function(){
const meta=JSON.parse(document.getElementById('meta').textContent),N=meta.n,KEY=meta.key,SK='dtz:'+N;
let st={};try{st=JSON.parse(localStorage.getItem(SK)||'{}')}catch(e){}
const save=()=>{try{localStorage.setItem(SK,JSON.stringify(st))}catch(e){}};
st.sel=st.sel||{};
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button,section').forEach(x=>x.classList.remove('on'));b.classList.add('on');document.getElementById(b.dataset.t).classList.add('on');if(b.dataset.t==='ergebnis')fin();window.scrollTo(0,0)});
document.querySelectorAll('input[type=radio]').forEach(r=>{const n=r.name;if(st.sel[n]===r.value)r.checked=true;r.addEventListener('change',()=>{if(n==='s'||n==='p'){st[n]=r.value}else st.sel[n]=r.value;save()})});
['s','p'].forEach(n=>{if(st[n]!==undefined){const r=document.querySelector('input[name='+n+'][value="'+st[n]+'"]');if(r)r.checked=true}});
function ev(p){let ok=0,tot=0;Object.keys(KEY).filter(k=>k[0]===p).forEach(k=>{tot++;const box=document.querySelector('[data-q='+k+']');const s=st.sel[k];box.querySelectorAll('.opt').forEach((o,i)=>{o.classList.remove('right','wrong');if(i===KEY[k])o.classList.add('right');else if(String(i)===s)o.classList.add('wrong')});if(String(KEY[k])===s)ok++});st[p]=ok;save();
const lv=ok>=33?'B1':ok>=20?'A2':'unter A2';return ok}
function show(p){const ok=ev(p),tot=p==='h'?20:25;document.getElementById('res-'+p).textContent=ok+' von '+tot+' richtig ('+Math.round(ok/tot*100)+' %). Richtige Antworten sind grün, deine falschen rot.'}
document.querySelectorAll('[data-eval]').forEach(b=>b.onclick=()=>show(b.dataset.eval));
if(st.h!==undefined)document.getElementById('res-h').textContent='Zuletzt: '+st.h+' von 20 richtig.';
if(st.l!==undefined)document.getElementById('res-l').textContent='Zuletzt: '+st.l+' von 25 richtig.';
function fin(){const h=st.h,l=st.l;const hl=(h!==undefined&&l!==undefined)?h+l:null;const lv=['A1','A2','B1'];
let t='<p><b>Hören + Lesen:</b> '+(hl===null?'noch nicht ausgewertet':hl+' / 45 → '+(hl>=33?'B1':hl>=20?'A2':'unter A2'))+'</p><p><b>Schreiben (Selbsteinschätzung):</b> '+(st.s===undefined?'offen':lv[st.s])+'</p><p><b>Sprechen (Selbsteinschätzung):</b> '+(st.p===undefined?'offen':lv[st.p])+'</p>';
const hlB=hl!==null&&hl>=33,sB=st.s==='2',pB=st.p==='2';
if(hl!==null&&st.p!==undefined)t+='<h3>'+(pB&&(hlB||sB)?'✅ Gesamt: B1':'Noch nicht B1 – wiederhole die schwachen Teile')+'</h3>';
document.getElementById('final').innerHTML=t;st.done=(hl!==null&&st.p!==undefined);save()}
fin();
const ta=document.getElementById('brief');if(st.brief)ta.value=st.brief;const wc=()=>{const n=(ta.value.trim().match(/\S+/g)||[]).length;document.getElementById('wc').textContent=n+' Wörter';st.brief=ta.value;save()};ta.oninput=wc;wc();
document.getElementById('copy').onclick=()=>{ta.select();try{navigator.clipboard.writeText(ta.value)}catch(e){document.execCommand('copy')}};
document.querySelectorAll('.timer').forEach(t=>{let s=+t.dataset.min*60,iv=null;const sp=t.querySelector('span'),b=t.querySelector('button');const draw=()=>{sp.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};b.onclick=()=>{if(iv){clearInterval(iv);iv=null;b.textContent='Weiter'}else{b.textContent='Pause';iv=setInterval(()=>{s--;draw();if(s<=0){clearInterval(iv);sp.style.color='#dc2626'}},1000)}}});
const c=document.getElementById('count');const days=Math.ceil((new Date('2026-12-10T00:00:00')-new Date())/864e5);c.textContent=days>0?'Noch '+days+' Tage bis zur Prüfung':'Prüfungstag';
})();
"""

INDEX_JS = r"""
(function(){const L=document.getElementById('list');let done=0;const today=new Date();
MOCKS.forEach(m=>{let st={};try{st=JSON.parse(localStorage.getItem('dtz:'+m.n)||'{}')}catch(e){}
const hl=(st.h!==undefined&&st.l!==undefined)?st.h+st.l:null;if(st.done)done++;
const p=hl===null?'<span class="pill">offen</span>':'<span class="pill '+(hl>=33?'b1':'a2')+'">'+hl+'/45 '+(hl>=33?'B1':'A2')+'</span>';
const a=document.createElement('a');a.className='day';a.href=m.f+'/';a.innerHTML='<div class="n">'+m.n+'</div><div class="t"><b>Modelltest '+m.n+' · Tag '+m.n+'</b><br><small>'+m.d+' · '+m.th+'</small></div>'+p;L.appendChild(a)});
document.getElementById('bar').style.width=(done/MOCKS.length*100)+'%';document.getElementById('sum').textContent=done+' von '+MOCKS.length+' Modelltests abgeschlossen.';
const d=Math.ceil((new Date('2026-12-10T00:00:00')-today)/864e5);document.getElementById('count').textContent=d>0?'Noch '+d+' Tage':'Prüfungstag';})();
"""


def main():
    mocks = load_mocks()
    os.makedirs(os.path.join(DOCS, "assets"), exist_ok=True)
    for name, txt in (("style.css", CSS), ("app.js", APP), ("index.js", INDEX_JS)):
        open(os.path.join(DOCS, "assets", name), "w", encoding="utf-8").write(txt)
    open(os.path.join(DOCS, ".nojekyll"), "w").write("")
    open(os.path.join(DOCS, "index.html"), "w", encoding="utf-8").write(build_index(mocks))
    for i, M in enumerate(mocks):
        n = i + 1
        f = os.path.join(DOCS, folder(n))
        os.makedirs(f, exist_ok=True)
        open(os.path.join(f, "index.html"), "w", encoding="utf-8").write(build_page(n, M, len(mocks)))
        json.dump({"hoeren.mp3": audio_hoeren(n, M), "sprechen_modell.mp3": audio_sprechen(M)}, open(os.path.join(f, "audio.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print("built", len(mocks), "mock tests")


if __name__ == "__main__":
    main()
