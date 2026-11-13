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
import re
import explain as X


def mc(name, opts, label=None):
    h = ""
    for i, o in enumerate(opts):
        h += f'<label class="opt"><input type="radio" name="{name}" value="{i}"><span class="k">{LET[i]}</span><span>{E(o)}</span></label>'
    return f'<div class="opts" data-q="{name}">{h}</div>'


def item(num, q, opts, name):
    return f'<div class="item" id="i-{name}"><div class="qn">{num}</div><div class="qb"><p class="q">{E(q)}</p>{mc(name, opts)}</div></div>'


def gap_sentence(text, i, ans):
    for s in X.sents(text):
        if f"[{i}]" in s:
            s = re.sub(r"\[\d\]", "…", s.replace(f"[{i}]", "§§"))
            return s.replace("§§", ans)
    return ""


def build_page(n, M, total):
    d, ds = date_of(n)
    key, ex = {}, {}

    def reg(nm, kind, q, ot, a, src, ev=None, extra=None):
        e = {"k": kind, "q": q, "ot": ot, "a": a, "ev": ev if ev is not None else X.evidence(src, q, ot), "src": src}
        if extra:
            e.update(extra)
        ex[nm] = e

    # ----- Hören -----
    H, c = "", 0
    H += '<h3>Aufgabe 1 · Ansagen am Telefon oder per Lautsprecher</h3><p class="hint">Sie hören jeden Text einmal. Zu jedem Text gibt es eine Aufgabe.</p>'
    for t, q, o, a in M["h1"]:
        o, a = rot(o, a); c += 1; nm = f"h{c}"; key[nm] = a; ol = o.split("|")
        H += item(c, q, ol, nm); reg(nm, "h1", q, ol, a, t)
    H += '<h3>Aufgabe 2 · Ansagen im Radio</h3>'
    for t, q, o, a in M["h2"]:
        o, a = rot(o, a); c += 1; nm = f"h{c}"; key[nm] = a; ol = o.split("|")
        H += item(c, q, ol, nm); reg(nm, "h2", q, ol, a, t)
    H += '<h3>Aufgabe 3 · Gespräche</h3><p class="hint">Zu jedem Gespräch lösen Sie zwei Aufgaben.</p>'
    for gi, (setting, turns, qs) in enumerate(M["h3"]):
        H += f'<div class="sub">Gespräch {gi+1} · {E(setting)}</div>'
        src = " ".join(l for w, l in turns)
        for q, o, a in qs:
            o, a = rot(o, a); c += 1; nm = f"h{c}"; key[nm] = a; ol = o.split("|")
            H += item(c, q, ol, nm)
            if ol[0] == "richtig":
                s = X.best_sent(src, X.toks(q), [])
                reg(nm, "h3", q, ol, a, src, ev=[s, s])
            else:
                reg(nm, "h3", q, ol, a, src)
    th, speakers, stm, ans = M["h4"]
    H += f'<h3>Aufgabe 4 · {E(th)}</h3><p class="hint">Ordnen Sie die Aussagen den drei Personen zu. Nicht jede Aussage passt. Sie haben eine Minute Zeit zum Lesen.</p><ul class="stm">'
    for i, x in enumerate(stm):
        H += f'<li><b>{LET[i]}</b> {E(x)}</li>'
    H += "</ul>"
    for i in range(3):
        c += 1; nm = f"h{c}"; key[nm] = ans[i]
        H += item(c, f"Person {i+1}", [f"{LET[j]}" for j in range(len(stm))], nm).replace('class="opts"', 'class="opts row"')
        reg(nm, "h4", f"Person {i+1}", list(stm), ans[i], speakers[i], ev=[X.best_sent(speakers[i], X.toks(s), []) for s in stm])
    assert c == 20, (n, c)
    TR = ""
    for i, (t, q, o, a) in enumerate(M["h1"] + M["h2"]):
        TR += f"<p><b>Text {i+1}:</b> {E(t)}</p>"
    for gi, (setting, turns, qs) in enumerate(M["h3"]):
        TR += f"<p><b>Gespräch {gi+1}</b> ({E(setting)})<br>" + "<br>".join(f"{'Frau' if w in 'FG' else 'Mann'}: {E(l)}" for w, l in turns) + "</p>"
    for i, t in enumerate(speakers):
        TR += f"<p><b>Person {i+1}:</b> {E(t)}</p>"
    # ----- Lesen -----
    L, c = "", 0
    L += '<h3>Aufgabe 1 · Kataloge, Verzeichnisse, Rubriken</h3><p class="hint">Wo finden Sie das? Wählen Sie die richtige Rubrik.</p>'
    for t, q, o, a in M["l1"]:
        o, a = rot(o, a); c += 1; nm = f"l{c}"; key[nm] = a; ol = o.split("|")
        L += item(c, q, ol, nm); reg(nm, "l1", q, ol, a, "", ev=["" for _ in ol], extra={"why": X.l1_text(q, ol, a)})
    ads, sits, sans = M["l2"]
    L += '<h3>Aufgabe 2 · Anzeigen</h3><p class="hint">Welche Anzeige passt zu welcher Situation? Eine Situation hat keine passende Anzeige: Wählen Sie dann <b>x</b>.</p><div class="ads">'
    for i, x in enumerate(ads):
        L += f'<div class="ad"><b>{LET[i]}</b> {E(x)}</div>'
    L += "</div>"
    for i, sit in enumerate(sits):
        c += 1; nm = f"l{c}"
        a = 8 if sans[i] == "x" else LET.index(sans[i]); key[nm] = a
        L += item(c, sit, list(LET[:len(ads)]) + ["x"], nm).replace('class="opts"', 'class="opts row"')
        reg(nm, "l2", sit, list(ads) + ["Keine Anzeige passt (x)"], a, "", ev=list(ads) + [""])
    L += '<h3>Aufgabe 3 · Presse und formelle Mitteilungen</h3>'
    for text, qs in M["l3"]:
        L += f'<div class="text">{E(text).replace(chr(10), "<br>")}</div>'
        for q, o, a in qs:
            o, a = rot(o, a); c += 1; nm = f"l{c}"; key[nm] = a; ol = o.split("|")
            L += item(c, q, ol, nm)
            if ol[0] == "richtig":
                s = X.best_sent(text, X.toks(q), [])
                reg(nm, "l3", q, ol, a, text, ev=[s, s])
            else:
                reg(nm, "l3", q, ol, a, text)
    text, qs = M["l4"]
    L += f'<h3>Aufgabe 4 · Informationsbroschüre</h3><div class="text">{E(text).replace(chr(10), "<br>")}</div>'
    for q, a in qs:
        c += 1; nm = f"l{c}"; key[nm] = a
        L += item(c, q, ["richtig", "falsch"], nm)
        s = X.best_sent(text, X.toks(q), [])
        reg(nm, "l4", q, ["richtig", "falsch"], a, text, ev=[s, s])
    text, gaps = M["l5"]
    body = E(text).replace(chr(10), "<br>")
    for i in range(len(gaps)):
        body = body.replace(f"[{i+1}]", f"<b class='gap'>({20+i})</b>")
    L += f'<h3>Aufgabe 5 · Brief ergänzen (Sprachbausteine)</h3><p class="hint">Welches Wort passt? Lösen Sie die Aufgaben 20 bis 25.</p><div class="text">{body}</div>'
    for gi, (o, a) in enumerate(gaps):
        o, a = rot(o, a); c += 1; nm = f"l{c}"; key[nm] = a; ol = o.split("|")
        L += item(c, f"Lücke ({c})", ol, nm).replace('class="opts"', 'class="opts row"')
        gs = gap_sentence(text, gi + 1, ol[a])
        reg(nm, "l5", f"Lücke ({c})", ol, a, gs, ev=["" for _ in ol], extra={"gap": X.gap_rule(ol[a], ol, gs), "sent": gs})
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
    chk = "".join(f"<li>Leitpunkt: {E(x)}</li>" for x in lp)

    prev = f'<a href="../{folder(n-1)}/">← Test {n-1}</a>' if n > 1 else "<span></span>"
    nxt = f'<a href="../{folder(n+1)}/">Test {n+1} →</a>' if n < total else "<span></span>"
    meta = json.dumps({"n": n, "key": key, "ex": ex}, ensure_ascii=False).replace("</", "<\\/")
    save = '<button class="btn ghost" data-save>Speichern</button><span class="saved"></span>'
    return f"""<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DTZ B1 · Modelltest {n}</title>{FONTS}<link rel="stylesheet" href="../assets/style.css"></head>
<body class="exam">
<header class="top"><a class="home" href="../">Übersicht</a>
<div class="ttl"><div class="eyebrow">Deutsch-Test für Zuwanderer B1</div><h1>Modelltest {n} <small>Tag {n}, {ds}</small></h1></div>
<div class="clock" id="clock"><span id="clk-l">Hören</span><b id="clk-t">25:00</b><div class="meter"><i id="clk-m"></i></div></div></header>
<nav class="tabs"><button data-t="hoeren" class="on"><span>1</span>Hören<small>25 Min · 20 Aufgaben</small></button><button data-t="lesen"><span>2</span>Lesen<small>45 Min · 25 Aufgaben</small></button><button data-t="schreiben"><span>3</span>Schreiben<small>30 Min</small></button><button data-t="sprechen"><span>4</span>Sprechen<small>ca. 15 Min</small></button><button data-t="antworten" disabled><span>✓</span>Antworten<small>nach der Abgabe</small></button></nav>
<main>
<section id="hoeren" class="on"><div class="card"><h2>Hören</h2><p>Sie hören jeden Text <b>nur einmal</b>. Lesen Sie zuerst die Aufgabe, hören Sie dann den Text. Die Zeit läuft automatisch ab dem Öffnen dieses Teils. Spulen Sie nicht zurück, wie in der echten Prüfung.</p>
<div class="player"><audio controls preload="none" src="hoeren.mp3"></audio><div class="noaudio">Die Audiodatei fehlt noch. Auf dem PC <code>python gen_audio.py docs</code> ausführen und die MP3-Dateien hochladen.</div></div></div>
<div class="layout"><div class="card">{H}<div class="actions">{save}</div></div><aside class="qnav" data-p="h"></aside></div></section>
<section id="lesen"><div class="card"><h2>Lesen</h2><p>Lösen Sie die Aufgaben 1 bis 25. Die Zeit läuft automatisch ab dem Öffnen dieses Teils. Wenn Sie eine Aufgabe nicht lösen können, gehen Sie weiter.</p></div>
<div class="layout"><div class="card">{L}<div class="actions">{save}</div></div><aside class="qnav" data-p="l"></aside></div></section>
<section id="schreiben"><div class="card"><h2>Schreiben</h2><p>Schreiben Sie möglichst viel (ca. 80–100 Wörter) und behandeln Sie alle vier Punkte. Anrede und Gruß gehören dazu.</p>{S}
<textarea id="brief" rows="14" placeholder="Schreiben Sie hier Ihren Brief …" spellcheck="false"></textarea><div class="wc" id="wc">0 Wörter</div>
<div class="actions">{save}<button class="btn ghost" id="copy">Text kopieren</button></div></div></section>
<section id="sprechen"><div class="card"><h2>Sprechen</h2><p>Die mündliche Prüfung ist eine Paarprüfung. Sprechen Sie laut, am besten mit Aufnahme, und schreiben Sie danach Ihre Antworten in das Feld unten.</p>{P}
<h3>Ihre Antworten (getippt oder diktiert)</h3><textarea id="sprech" rows="10" placeholder="Teil 1 … Teil 2 … Teil 3 …" spellcheck="false"></textarea>
<div class="actions">{save}<button class="btn" id="finish">Prüfung beenden</button></div>
<p class="hint">Bewertung durch Claude: Schreiben Sie im Chat „Schreiben bewerten, Modelltest {n}“ oder „Ich bin fertig, Modelltest {n}“ und fügen Sie Ihren Text ein.</p></div></section>
<section id="antworten"><div class="card"><h2>Antworten und Erklärungen</h2><div id="ans-sum"></div></div>
<div class="card"><div class="filter"><button class="btn ghost on" data-f="wrong">Nur falsche und offene</button><button class="btn ghost" data-f="all">Alle Aufgaben</button></div><div id="ans-list"></div></div>
<div class="card"><h3>Hörtexte</h3><details><summary>Alle Hörtexte anzeigen</summary>{TR}</details>
<h3>Schreiben: Modellbrief</h3><div class="text">{E(model).replace(chr(10), "<br>")}</div><p><b>Checkliste:</b></p><ul>{chk}<li>Anrede und Gruß</li><li>Verbindungswörter (weil, deshalb, außerdem, aber)</li><li>Höfliche Formen (Könnten Sie …? Ich würde mich freuen …)</li></ul>
<h3>Sprechen: Beispielantworten</h3><div class="player"><audio controls preload="none" src="sprechen_modell.mp3"></audio><div class="noaudio">Die Audiodatei fehlt noch (gen_audio.py ausführen).</div></div>{P_model}
<div class="self"><b>Selbsteinschätzung Schreiben:</b> <label><input type="radio" name="s" value="0"> A1</label> <label><input type="radio" name="s" value="1"> A2</label> <label><input type="radio" name="s" value="2"> B1</label></div>
<div class="self"><b>Selbsteinschätzung Sprechen:</b> <label><input type="radio" name="p" value="0"> A1</label> <label><input type="radio" name="p" value="1"> A2</label> <label><input type="radio" name="p" value="2"> B1</label></div><div id="verdict"></div></div></section>
</main>
<footer class="nav">{prev}{nxt}</footer>
<div id="modal" hidden><div class="dlg"><h2>Prüfung beenden?</h2><p>Prüfen Sie Ihre Antworten in jedem Teil noch einmal. Nach dem Abgeben können Sie nichts mehr ändern.</p><div id="chk"></div><div class="acts"><button class="btn ghost" id="back">Zurück zur Prüfung</button><button class="btn" id="submit" disabled>Endgültig abgeben</button></div></div></div>
<div id="toast" hidden></div>
<script id="meta" type="application/json">{meta}</script><script src="../assets/app.js"></script>
</body></html>"""


def build_index(mocks):
    meta = json.dumps([{"n": i + 1, "f": folder(i + 1), "d": date_of(i + 1)[1], "th": M["th"]} for i, M in enumerate(mocks)], ensure_ascii=False)
    return f"""<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DTZ B1 · Modelltests</title>{FONTS}<link rel="stylesheet" href="assets/style.css"></head>
<body class="home-page"><header class="hero"><div class="hero-in"><div><div class="eyebrow">Deutsch-Test für Zuwanderer B1</div><h1>{len(mocks)} Modelltests</h1><div class="theme">Prüfung am Donnerstag, 10. Dezember 2026 · <span id="count"></span></div></div><div class="stats" id="stats"></div></div></header>
<main><div class="card"><div class="bar"><i id="bar"></i></div><p id="sum"></p><p class="hint">Jeder Tag ist eine komplette Prüfung mit Zeitlimit. Bestanden: B1 im Sprechen und in Hören/Lesen (ab 33 von 45) oder im Schreiben. Dein Fortschritt wird nur in diesem Browser gespeichert.</p></div>
<div id="list"></div></main>
<script>const MOCKS={meta};</script><script src="assets/index.js"></script></body></html>"""


FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">'

CSS = """
:root{--ink:#10192b;--ink2:#1c2942;--desk:#eef0f3;--paper:#fff;--tx:#18202e;--mut:#5b6678;--pri:#1b4f9c;--pri-d:#123a77;--sel:#e8effa;--hl:#f6c026;--ok:#17744a;--okbg:#e2f3ea;--bad:#b3261e;--badbg:#fbe9e7;--line:#d9dee6;--serif:'Fraunces',Georgia,serif;--sans:'Inter','Segoe UI',system-ui,sans-serif}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:170px}
body{margin:0;font:16px/1.6 var(--sans);background:var(--desk);color:var(--tx);-webkit-font-smoothing:antialiased}
:focus-visible{outline:3px solid var(--hl);outline-offset:2px}
.top{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:20px;padding:12px 26px;background:var(--ink);color:#eaf0f8}
.ttl{min-width:0}.top h1{margin:0;font:700 1.25rem/1.15 var(--serif)}.top small{font:400 .8rem var(--sans);color:#9fb0c8;margin-left:8px}
.eyebrow{font-size:.78rem;color:#9fb0c8;margin-bottom:2px}
.home{color:#eaf0f8;text-decoration:none;border:1px solid #3a4a66;padding:7px 14px;border-radius:99px;font-size:.85rem}.home:hover{background:var(--ink2)}
.clock{margin-left:auto;display:grid;grid-template-columns:auto auto;align-items:center;column-gap:14px;row-gap:5px;min-width:230px}
.clock span{font-size:.85rem;color:#b7c4d8}.clock b{font:600 2.1rem/1 'Inter',ui-monospace,monospace;font-variant-numeric:tabular-nums;letter-spacing:.02em;justify-self:end}
.clock.low b{color:#ffb4a8;animation:pulse 1s infinite}.meter{grid-column:1/3;height:4px;background:#2a3a57;border-radius:9px;overflow:hidden}.meter i{display:block;height:100%;width:100%;background:var(--hl);transition:width 1s linear}
@keyframes pulse{50%{opacity:.55}}
.tabs{position:sticky;top:73px;z-index:25;display:flex;background:var(--paper);border-bottom:1px solid var(--line);overflow:auto}
.tabs button{flex:1;min-width:150px;display:grid;grid-template-columns:auto 1fr;column-gap:10px;align-items:center;text-align:left;border:0;border-bottom:4px solid transparent;background:none;padding:10px 16px 8px;font:600 .98rem var(--sans);color:var(--mut);cursor:pointer}
.tabs button span{grid-row:1/3;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#e6eaf0;color:var(--mut);font-size:.85rem}
.tabs button small{font-weight:400;font-size:.76rem;color:#8a96a8}
.tabs button:hover:not(:disabled){background:#f5f7fa}.tabs button.on{color:var(--ink);border-bottom-color:var(--hl)}.tabs button.on span{background:var(--ink);color:#fff}
.tabs button.done span{background:var(--ok);color:#fff}.tabs button:disabled{opacity:.45;cursor:not-allowed}
main{max-width:1080px;margin:0 auto;padding:22px 14px 56px}section{display:none}section.on{display:block}
.layout{display:grid;grid-template-columns:minmax(0,1fr) 190px;gap:16px;align-items:start}
.qnav{position:sticky;top:150px;background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:14px}
.qnav b{font:700 .9rem var(--serif)}.qnav .g{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-top:10px}
.qnav a{display:grid;place-items:center;height:30px;font-size:.8rem;font-weight:600;text-decoration:none;color:var(--mut);border:1px solid var(--line);border-radius:6px;background:#fff}
.qnav a.done{background:var(--ink);border-color:var(--ink);color:#fff}.qnav a.r{background:var(--ok);border-color:var(--ok);color:#fff}.qnav a.w{background:var(--bad);border-color:var(--bad);color:#fff}
.card{background:var(--paper);border:1px solid var(--line);border-radius:12px;padding:24px 28px;margin:0 0 16px}
h2{margin:.1em 0 .5em;font:700 1.7rem/1.15 var(--serif)}
h3{margin:1.8em 0 .35em;padding-top:1em;border-top:2px solid var(--ink);font:700 1.2rem/1.3 var(--serif)}
.card>h3:first-child{margin-top:0;border-top:0;padding-top:0}.hint{color:var(--mut);font-size:.92rem;max-width:66ch}
.sub{margin:20px 0 2px;font-weight:600;color:var(--pri-d)}
.item{display:flex;gap:16px;padding:16px 0;border-top:1px solid var(--line)}
.qn{width:36px;flex:none;font:700 1.7rem/1 var(--serif);color:var(--pri);text-align:right}
.qb{flex:1;min-width:0}.q{margin:.1em 0 .6em;font:600 1.03rem/1.45 var(--sans)}
.opt{display:flex;gap:12px;align-items:flex-start;padding:10px 14px;border:1.5px solid var(--line);border-radius:10px;margin:7px 0;cursor:pointer;background:#fff;transition:background .12s,border-color .12s,transform .12s}
.opt:hover{border-color:#9db3d3;background:#f6f9fd}.opt:has(input:checked){background:var(--sel);border-color:var(--pri)}
.opt input{appearance:none;flex:none;width:18px;height:18px;margin:3px 0 0;border:2px solid #7d8da3;border-radius:50%;background:#fff}
.opt input:checked{border-color:var(--pri);background:radial-gradient(var(--pri) 0 45%,#fff 50%)}
.k{font-weight:700;color:var(--pri);min-width:1.1em}
.opts.row{display:flex;flex-wrap:wrap;gap:6px}.opts.row .opt{margin:0;padding:8px 15px}
.text,.ad{background:#fbfbf9;border:1px solid var(--line);border-left:5px solid var(--ink);padding:16px 20px;border-radius:6px;margin:14px 0;font:1.06rem/1.8 var(--serif);max-width:72ch}
.ads{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}.ad{margin:0;font-size:.95rem;line-height:1.55}
.stm{list-style:none;padding:0;margin:.6em 0}.stm li{padding:5px 0}.gap{color:var(--pri);border-bottom:2px solid var(--pri);padding:0 4px}
.btn{background:var(--ink);color:#fff;border:1.5px solid var(--ink);border-radius:99px;padding:11px 26px;font:600 .95rem var(--sans);cursor:pointer;transition:background .15s}
.btn:hover:not(:disabled){background:var(--pri-d)}.btn:disabled{opacity:.4;cursor:not-allowed}
.btn.ghost{background:#fff;color:var(--ink)}.btn.ghost:hover{background:#f1f4f8}.btn.ghost.on{background:var(--ink);color:#fff}
.actions{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}.saved{color:var(--ok);font-size:.88rem}
.player{border:1px solid var(--line);border-radius:10px;padding:12px 14px;background:#f6f8fb;margin:12px 0}audio{width:100%}
.noaudio{display:none;margin-top:8px;padding:8px 12px;background:#fff4e5;border:1px solid #f0c37a;border-radius:6px;color:#7a4a00;font-size:.9rem}
textarea{width:100%;font:1.05rem/1.7 var(--serif);padding:14px 16px;border:1.5px solid #9aa8bb;border-radius:10px;background:#fff;min-height:260px;resize:vertical}
.wc{color:var(--mut);margin:4px 0 6px;font-size:.9rem}
.self{margin-top:16px;padding:12px 14px;background:#f3f6fa;border-radius:10px}.self label{margin-right:16px;cursor:pointer}
details{margin-top:12px;border:1px solid var(--line);border-radius:10px;padding:0 16px}summary{cursor:pointer;font-weight:600;color:var(--pri);padding:12px 0}details[open]{padding-bottom:14px}
footer.nav{display:flex;justify-content:space-between;max-width:1080px;margin:0 auto;padding:0 18px 50px}footer.nav a{color:var(--pri);font-weight:600;text-decoration:none}
.locked .opt{cursor:default;opacity:.75}.banner{margin:0 0 14px;padding:10px 14px;background:#fff4e5;border:1px solid #f0c37a;border-radius:8px;color:#7a4a00;font-weight:600}
#modal{position:fixed;inset:0;background:#0a1220b8;z-index:60;display:grid;place-items:center;padding:16px}#modal[hidden]{display:none}
.dlg{background:#fff;border-radius:14px;max-width:560px;width:100%;padding:26px 28px;max-height:92vh;overflow:auto}
.chk{display:flex;gap:12px;align-items:center;padding:10px 12px;border:1.5px solid var(--line);border-radius:10px;margin:8px 0}.chk label{flex:1;cursor:pointer}.chk small{display:block;color:var(--mut)}.chk button{border:0;background:none;color:var(--pri);font-weight:600;cursor:pointer}
.acts{display:flex;gap:12px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap}
#toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;padding:10px 20px;border-radius:99px;z-index:70;font-weight:600}#toast[hidden]{display:none}
.filter{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px}
.sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:12px 0}.sum div{border:1px solid var(--line);border-radius:10px;padding:12px 14px}.sum b{display:block;font:700 1.7rem var(--serif)}.sum small{color:var(--mut)}
.a-item{border:1.5px solid var(--line);border-radius:12px;margin:12px 0;overflow:hidden}.a-item.r{border-color:#a9d9bf}.a-item.w{border-color:#efb2ab}
.a-head{display:flex;gap:12px;align-items:center;padding:10px 16px;background:#f6f8fb;font-weight:600}.a-item.r .a-head{background:var(--okbg)}.a-item.w .a-head{background:var(--badbg)}
.a-head .n{font:700 1.2rem var(--serif);min-width:30px}.a-body{padding:14px 18px}.a-body p{margin:.5em 0}.a-body .lab{font-weight:700;color:var(--pri-d)}
.tag{display:inline-block;padding:2px 10px;border-radius:99px;font-size:.8rem;font-weight:700}.tag.ok{background:var(--okbg);color:var(--ok)}.tag.no{background:var(--badbg);color:var(--bad)}.tag.nil{background:#e8ebf0;color:#44546a}
.mem{margin-top:10px;padding:10px 14px;background:#fff8dc;border-left:5px solid var(--hl);border-radius:6px}.quote{padding:8px 14px;background:#f6f8fb;border-left:4px solid var(--ink);border-radius:4px;font-family:var(--serif)}
.vs{margin:.4em 0 .4em 1.1em;padding:0}.vs li{margin:.2em 0}
.hero{background:var(--ink);color:#eaf0f8;padding:34px 26px 30px;border-bottom:4px solid var(--hl)}.hero-in{max-width:1080px;margin:0 auto;display:flex;gap:30px;flex-wrap:wrap;align-items:flex-end;justify-content:space-between}
.hero h1{margin:0;font:700 2.6rem/1.05 var(--serif)}.hero .theme{margin-top:8px;color:#b7c4d8}
.stats{display:grid;grid-template-columns:repeat(4,minmax(110px,1fr));gap:12px;flex:1;min-width:320px;max-width:560px}
.stat{background:var(--ink2);border-radius:10px;padding:10px 12px}.stat small{color:#9fb0c8;font-size:.78rem}.stat b{display:block;font:700 1.4rem var(--serif)}.stat .m{height:5px;background:#2e3f5e;border-radius:9px;margin-top:6px;overflow:hidden}.stat .m i{display:block;height:100%;background:var(--hl)}.stat.weak{outline:2px solid #ff8a7a}.stat.weak small::after{content:' · mehr üben';color:#ffb4a8}
.bar{height:10px;background:#dfe4ea;border-radius:99px;overflow:hidden}.bar i{display:block;height:100%;width:0;background:var(--pri);transition:width .5s}
.day{display:flex;gap:16px;align-items:center;flex-wrap:wrap;background:#fff;border:1px solid var(--line);border-radius:12px;padding:12px 16px;margin:10px 0;text-decoration:none;color:inherit}
.day:hover{border-color:var(--pri);background:#f8fafd}.day .n{width:46px;height:46px;border-radius:10px;background:var(--ink);color:#fff;display:grid;place-items:center;font:700 1.2rem var(--serif)}
.day.today{border-color:var(--hl);box-shadow:inset 5px 0 0 var(--hl)}.day .t{flex:1;min-width:200px}.day small{color:var(--mut)}
.marks{display:flex;gap:6px;flex-wrap:wrap}.pill{padding:3px 11px;border-radius:99px;font-size:.78rem;font-weight:700;background:#e4e8ee;color:#44546a;white-space:nowrap}.pill.b1{background:var(--okbg);color:var(--ok)}.pill.a2{background:#fdf0c8;color:#7a5500}.pill.lo{background:var(--badbg);color:var(--bad)}
@media(max-width:860px){.layout{grid-template-columns:1fr}.qnav{position:static}.top{flex-wrap:wrap;padding:10px 14px;gap:10px}.clock{min-width:0;margin-left:0;width:100%}.tabs{top:128px}.tabs button{min-width:132px}.card{padding:18px 16px}html{scroll-padding-top:210px}.hero h1{font-size:2rem}.stats{min-width:0;grid-template-columns:repeat(2,1fr)}.qn{font-size:1.3rem;width:26px}}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important;scroll-behavior:auto!important}}
"""

APP = r"""
(function(){
const meta=JSON.parse(document.getElementById('meta').textContent),N=meta.n,KEY=meta.key,EX=meta.ex,SK='dtz:'+N;
const SECS=['hoeren','lesen','schreiben','sprechen'],DUR={hoeren:25,lesen:45,schreiben:30,sprechen:15},LAB={hoeren:'Hören',lesen:'Lesen',schreiben:'Schreiben',sprechen:'Sprechen'},PFX={hoeren:'h',lesen:'l'},LET='abcdefghx';
let st={};try{st=JSON.parse(localStorage.getItem(SK)||'{}')}catch(e){}
st.sel=st.sel||{};st.t=st.t||{};st.lock=st.lock||{};
const save=()=>{try{localStorage.setItem(SK,JSON.stringify(st))}catch(e){}};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let cur='hoeren';
function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toast.i);toast.i=setTimeout(()=>t.hidden=true,2200)}
function startSec(s){if(!st.fin&&!st.t[s]){st.t[s]=Date.now();save()}}
function go(s){cur=s;$$('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===s));$$('section').forEach(x=>x.classList.toggle('on',x.id===s));if(SECS.includes(s))startSec(s);window.scrollTo(0,0);tick()}
$$('.tabs button').forEach(b=>b.onclick=()=>{if(!b.disabled)go(b.dataset.t)});
function lockSec(s,why){st.lock[s]=true;const sec=$('#'+s);sec.classList.add('locked');sec.querySelectorAll('input,textarea').forEach(i=>i.disabled=true);
if(!sec.querySelector('.banner')){const b=document.createElement('div');b.className='banner';b.textContent=why;sec.insertBefore(b,sec.firstChild)}save()}
function remaining(s){return st.t[s]?DUR[s]*60000-(Date.now()-st.t[s]):DUR[s]*60000}
function fmt(ms){ms=Math.max(0,ms);const s=Math.ceil(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function tick(){
if(!st.fin){SECS.forEach(s=>{if(st.t[s]&&!st.lock[s]&&remaining(s)<=0){lockSec(s,'Die Zeit für diesen Teil ist abgelaufen. Ihre Antworten wurden gespeichert.');toast(LAB[s]+': Zeit abgelaufen, gespeichert');
if(cur===s){const i=SECS.indexOf(s);if(i<SECS.length-1)go(SECS[i+1]);else openFinish()}}})}
const ck=$('#clock');if(!ck)return;
if(st.fin||cur==='antworten'){$('#clk-l').textContent='Prüfung abgegeben';$('#clk-t').textContent='–';$('#clk-m').style.width='0';ck.classList.remove('low')}
else{const r=remaining(cur);$('#clk-l').textContent=LAB[cur];$('#clk-t').textContent=st.lock[cur]?'00:00':fmt(r);$('#clk-m').style.width=Math.max(0,r/(DUR[cur]*600))+'%';ck.classList.toggle('low',r<5*60000&&!st.lock[cur])}
$$('.tabs button').forEach(b=>{const s=b.dataset.t;b.classList.toggle('done',st.lock[s]||(s==='antworten'&&st.fin))})}
setInterval(tick,1000);
// inputs
$$('input[type=radio]').forEach(r=>{const n=r.name;if(n==='s'||n==='p'){if(st[n]===r.value)r.checked=true}else if(st.sel[n]===r.value)r.checked=true;
r.addEventListener('change',()=>{if(n==='s'||n==='p'){st[n]=r.value;verdict()}else st.sel[n]=r.value;save();paint()})});
const ta=$('#brief'),sp=$('#sprech');if(st.brief)ta.value=st.brief;if(st.sprech)sp.value=st.sprech;
const wc=()=>{const n=(ta.value.trim().match(/\S+/g)||[]).length;$('#wc').textContent=n+' Wörter';st.brief=ta.value;save()};ta.oninput=wc;wc();sp.oninput=()=>{st.sprech=sp.value;save()};
$('#copy').onclick=()=>{ta.select();try{navigator.clipboard.writeText(ta.value);toast('Text kopiert')}catch(e){document.execCommand('copy')}};
$$('[data-save]').forEach(b=>b.onclick=()=>{save();const t=new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});$$('.saved').forEach(x=>x.textContent='');b.parentNode.querySelector('.saved').textContent='Gespeichert um '+t;toast('Gespeichert')});
// navigator
$$('.qnav').forEach(q=>{const p=q.dataset.p;const ks=Object.keys(KEY).filter(k=>k[0]===p);q.innerHTML='<b>Aufgaben</b><div class="g">'+ks.map((k,i)=>'<a href="#i-'+k+'" data-k="'+k+'">'+(i+1)+'</a>').join('')+'</div>'});
function paint(){$$('.qnav a').forEach(a=>{const k=a.dataset.k;a.classList.remove('done','r','w');if(st.fin)a.classList.add(String(KEY[k])===st.sel[k]?'r':'w');else if(st.sel[k]!==undefined)a.classList.add('done')})}
// audio fallback
$$('audio').forEach(a=>{const n=a.parentNode.querySelector('.noaudio');const bad=()=>{if(n)n.style.display='block'};a.addEventListener('error',bad);a.addEventListener('loadedmetadata',()=>{if(n)n.style.display='none'});fetch(a.src,{method:'HEAD'}).then(r=>{if(!r.ok)bad()}).catch(()=>{})});
// finish
function counts(){const o={};['h','l'].forEach(p=>{const ks=Object.keys(KEY).filter(k=>k[0]===p);o[p]=[ks.filter(k=>st.sel[k]!==undefined).length,ks.length]});return o}
function openFinish(){const c=counts();const rows=[['hoeren','Hören',c.h[0]+' von '+c.h[1]+' beantwortet'],['lesen','Lesen',c.l[0]+' von '+c.l[1]+' beantwortet'],['schreiben','Schreiben',((st.brief||'').trim().match(/\S+/g)||[]).length+' Wörter geschrieben'],['sprechen','Sprechen',(st.sprech||'').trim()?'Antworten notiert':'keine Notizen (Sprechen wird im Chat bewertet)']];
$('#chk').innerHTML=rows.map(r=>'<div class="chk"><input type="checkbox" id="c-'+r[0]+'"><label for="c-'+r[0]+'"><b>Ich habe '+r[1]+' noch einmal geprüft.</b><small>'+r[2]+'</small></label><button data-go="'+r[0]+'">Ansehen</button></div>').join('');
$$('#chk [data-go]').forEach(b=>b.onclick=()=>{$('#modal').hidden=true;go(b.dataset.go)});
$$('#chk input').forEach(i=>i.onchange=()=>{$('#submit').disabled=!$$('#chk input').every(x=>x.checked)});
$('#submit').disabled=true;$('#modal').hidden=false}
$('#finish').onclick=openFinish;$('#back').onclick=()=>$('#modal').hidden=true;
$('#submit').onclick=()=>{$('#modal').hidden=true;finalize()};
function score(p){return Object.keys(KEY).filter(k=>k[0]===p&&String(KEY[k])===st.sel[k]).length}
function finalize(){st.fin=true;st.h=score('h');st.l=score('l');SECS.forEach(s=>lockSec(s,'Die Prüfung ist abgegeben. Änderungen sind nicht mehr möglich.'));save();$('button[data-t=antworten]').disabled=false;render();go('antworten');paint()}
// answers
let filt='wrong';
$$('.filter button').forEach(b=>b.onclick=()=>{filt=b.dataset.f;$$('.filter button').forEach(x=>x.classList.toggle('on',x===b));list()});
const GT={h1:'Hören 1',h2:'Hören 2',h3:'Hören 3',h4:'Hören 4',l1:'Lesen 1',l2:'Lesen 2',l3:'Lesen 3',l4:'Lesen 4',l5:'Lesen 5'};
const TIPS=%TIPS%;
function lab(e,i){return (e.k==='h4'||e.k==='l2')?(LET[i]+': '+e.ot[i]):e.ot[i]}
function card(k,idx){const e=EX[k],s=st.sel[k],a=e.a,ok=String(a)===s,none=s===undefined;const cls=none?'':(ok?'r':'w');
let h='<div class="a-item '+cls+'" data-ok="'+(ok?1:0)+'"><div class="a-head"><span class="n">'+idx+'</span><span>'+GT[e.k]+'</span><span class="tag '+(none?'nil':ok?'ok':'no')+'">'+(none?'nicht beantwortet':ok?'richtig':'falsch')+'</span></div><div class="a-body">';
h+='<p><span class="lab">Aufgabe:</span> '+esc(e.q)+'</p>';
if(e.k==='l5'){h+='<p><span class="lab">Satz:</span> '+esc(e.sent.replace(e.ot[a],'«'+e.ot[a]+'»'))+'</p>'}
h+='<p><span class="lab">Deine Antwort:</span> '+(none?'–':esc(lab(e,+s)))+'</p><p><span class="lab">Richtig:</span> '+esc(lab(e,a))+'</p>';
const rf=e.ot[0]==='richtig';
if(e.k==='l5'){const g=e.gap;h+='<p><span class="lab">Warum richtig?</span> '+esc(g.rule)+'</p>';
const other=g.vs.filter(v=>none||ok||true).map(v=>'<li><b>'+esc(v[0])+'</b>: '+esc(v[1])+(v[0]===(e.ot[+s])?' <i>(deine Wahl)</i>':'')+'</li>').join('');h+='<p><span class="lab">Warum nicht die anderen?</span></p><ul class="vs">'+other+'</ul>'}
else if(e.k==='l1'){h+='<p><span class="lab">Warum richtig?</span> '+esc(e.why)+'</p>'}
else if(e.k==='l2'){h+='<p><span class="lab">Warum richtig?</span> '+(a===8?'Keine Anzeige erfüllt alle genannten Punkte der Situation. Die ähnlichste Anzeige lässt mindestens einen Punkt offen – deshalb x.':'Die Anzeige '+LET[a]+' enthält genau das, was die Situation verlangt.')+'</p>';
if(!ok&&!none&&+s!==8)h+='<p><span class="lab">Warum nicht '+LET[+s]+'?</span> Die Anzeige passt nur zu einem Teil der Situation (Thema oder Zielgruppe stimmt, aber Zeit, Preis oder Bedingung passen nicht).</p>'}
else if(rf){const q=e.ev[0];h+='<p><span class="lab">Warum '+(a===0?'richtig':'falsch')+'?</span> '+(q?'Im Text steht: <span class="quote">'+esc(q)+'</span> Die Aussage '+(a===0?'stimmt damit überein.':'weicht davon ab (Zahl, Zeit, Person oder ein Wort wie „nur“, „immer“, „nicht“).'):'Die Aussage '+(a===0?'stimmt':'stimmt nicht')+' mit dem Text überein; vergleiche Zahlen und Wörter genau.')+'</p>'}
else{const q=e.ev[a];h+='<p><span class="lab">Warum richtig?</span> '+(q?'Im Text steht: <span class="quote">'+esc(q)+'</span>':'Die Antwort ergibt sich aus dem Zusammenhang des Textes (siehe Hörtexte unten).')+'</p>';
if(!ok&&!none){const w=e.ev[+s];h+='<p><span class="lab">Warum nicht „'+esc(e.ot[+s]).slice(0,120)+'“?</span> '+(w&&w!==q?'Dazu steht im Text nur: <span class="quote">'+esc(w)+'</span> Das beantwortet die Frage nicht oder gehört zu einer anderen Information – das ist die typische Falle.':'Diese Aussage steht so nicht im Text. Sie klingt ähnlich wie die richtige, sagt aber etwas anderes – achte auf den genauen Wortlaut.')+'</p>'}}
const t=e.k==='l5'?[TIPS.l5[0],e.gap.tip]:TIPS[e.k];
h+='<p><span class="lab">So findest du die Antwort:</span> '+esc(t[0])+'</p><div class="mem"><b>Merksatz:</b> '+esc(t[1])+'</div></div></div>';return h}
function list(){const out=[];[['h','hoeren'],['l','lesen']].forEach(([p,s])=>{let i=0;Object.keys(KEY).filter(k=>k[0]===p).forEach(k=>{i++;const ok=String(KEY[k])===st.sel[k];if(filt==='all'||!ok)out.push('<h3>'+LAB[s]+' · Aufgabe '+i+'</h3>'+card(k,i))})});
$('#ans-list').innerHTML=out.length?out.join(''):'<p>Alle Aufgaben richtig – sehr gut!</p>'}
function lvl(x){return x>=33?'B1':x>=20?'A2':'unter A2'}
function verdict(){const L=['A1','A2','B1'];const hl=(st.h||0)+(st.l||0);const hlB=hl>=33,sB=st.s==='2',pB=st.p==='2';const v=$('#verdict');if(!v)return;
v.innerHTML=(st.p===undefined?'<p class="hint">Wähle deine Selbsteinschätzung für Sprechen und Schreiben, dann siehst du das Gesamtergebnis.</p>':'<h3>'+(pB&&(hlB||sB)?'Gesamt: B1 erreicht':'Gesamt: noch nicht B1')+'</h3><p>B1 gesamt = Sprechen B1 und (Hören+Lesen B1 oder Schreiben B1).</p>');st.done=(st.p!==undefined);save()}
function render(){const c=counts();$('#ans-sum').innerHTML='<div class="sum"><div><b>'+st.h+' / 20</b><small>Hören</small></div><div><b>'+st.l+' / 25</b><small>Lesen</small></div><div><b>'+(st.h+st.l)+' / 45</b><small>Hören + Lesen · '+lvl(st.h+st.l)+'</small></div></div><p class="hint">Ab 33 von 45 richtig = B1, ab 20 = A2. Unten erklärt jede Karte, warum eine Antwort stimmt oder nicht, und wie du sie im Text findest.</p>';list();verdict()}
// init
SECS.forEach(s=>{if(st.fin||(st.t[s]&&remaining(s)<=0))lockSec(s,st.fin?'Die Prüfung ist abgegeben. Änderungen sind nicht mehr möglich.':'Die Zeit für diesen Teil ist abgelaufen. Ihre Antworten wurden gespeichert.')});
paint();
if(st.fin){st.h=score('h');st.l=score('l');$('button[data-t=antworten]').disabled=false;render();go('antworten');paint()}else{go('hoeren')}
tick();
})();
"""

INDEX_JS = r"""
(function(){const L=document.getElementById('list');let done=0;const today=new Date();const S={h:[],l:[],s:[],p:[]};
const pill=(txt,cls)=>'<span class="pill '+cls+'">'+txt+'</span>';const LV=['A1','A2','B1'];
MOCKS.forEach(m=>{let st={};try{st=JSON.parse(localStorage.getItem('dtz:'+m.n)||'{}')}catch(e){}
let marks;if(st.fin){S.h.push(st.h/20);S.l.push(st.l/25);if(st.s!==undefined)S.s.push((+st.s+1)/3);if(st.p!==undefined)S.p.push((+st.p+1)/3);const hl=st.h+st.l;
marks=pill('Hören '+st.h+'/20',st.h>=15?'b1':st.h>=9?'a2':'lo')+pill('Lesen '+st.l+'/25',st.l>=18?'b1':st.l>=11?'a2':'lo')+pill('Σ '+hl+'/45',hl>=33?'b1':hl>=20?'a2':'lo')+pill('Schreiben '+(st.s!==undefined?LV[st.s]:'offen'),st.s==='2'?'b1':st.s==='1'?'a2':st.s==='0'?'lo':'')+pill('Sprechen '+(st.p!==undefined?LV[st.p]:'offen'),st.p==='2'?'b1':st.p==='1'?'a2':st.p==='0'?'lo':'');if(st.done)done++}
else marks=st.t&&Object.keys(st.t).length?pill('begonnen','a2'):pill('offen','');
const a=document.createElement('a');a.className='day';const d0=new Date(2026,10,12+m.n);if(d0.toDateString()===today.toDateString())a.className+=' today';a.href=m.f+'/';
a.innerHTML='<div class="n">'+m.n+'</div><div class="t"><b>Modelltest '+m.n+'</b><br><small>'+m.d+' · '+m.th+'</small></div><div class="marks">'+marks+'</div>';L.appendChild(a)});
document.getElementById('bar').style.width=(done/MOCKS.length*100)+'%';document.getElementById('sum').textContent=done+' von '+MOCKS.length+' Modelltests komplett abgeschlossen.';
const avg=x=>x.length?x.reduce((a,b)=>a+b,0)/x.length:null;const R=[['Hören',avg(S.h)],['Lesen',avg(S.l)],['Schreiben',avg(S.s)],['Sprechen',avg(S.p)]];
const vals=R.filter(r=>r[1]!==null);const min=vals.length>1?Math.min(...vals.map(r=>r[1])):null;
document.getElementById('stats').innerHTML=R.map(r=>'<div class="stat'+(r[1]!==null&&r[1]===min&&vals.length>1?' weak':'')+'"><small>'+r[0]+'</small><b>'+(r[1]===null?'–':Math.round(r[1]*100)+' %')+'</b><div class="m"><i style="width:'+(r[1]===null?0:r[1]*100)+'%"></i></div></div>').join('');
const d=Math.ceil((new Date('2026-12-10T00:00:00')-today)/864e5);document.getElementById('count').textContent=d>0?'noch '+d+' Tage':'Prüfungstag';})();
"""


def main():
    mocks = load_mocks()
    os.makedirs(os.path.join(DOCS, "assets"), exist_ok=True)
    app = APP.replace("%TIPS%", json.dumps({k: list(v) for k, v in X.TIPS.items()}, ensure_ascii=False))
    for name, txt in (("style.css", CSS), ("app.js", app), ("index.js", INDEX_JS)):
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
    sys.path.insert(0, ROOT)
    main()
