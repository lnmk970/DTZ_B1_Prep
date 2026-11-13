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
import re, shutil
import explain as X

MAXN = 7  # only mocks 1..MAXN are published for now


def mc(name, opts):
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


def task(sec, i, total, title, hint, left, items):
    first = "" if i == 0 else '<button class="btn ghost" data-prev>← Zurück</button>'
    last = "" if i == total - 1 else '<button class="btn" data-next>Weiter →</button>'
    body = f'<div class="pane left">{left}</div><div class="pane right">{items}</div>' if left else f'<div class="pane wide">{items}</div>'
    return f'<div class="task" data-sec="{sec}" data-i="{i}"><div class="tband"><b>{title}</b>{("<span>"+hint+"</span>") if hint else ""}</div><div class="tbody {"two" if left else "one"}">{body}</div><div class="tnav"><div>{first}</div><div class="mid"><button class="btn ghost" data-save>Speichern</button><span class="saved"></span></div><div>{last}</div></div></div>'


def pimg(src, desc):
    d = E(desc).replace('"', '&quot;')
    return f'<img class="pimg" src="{src}" alt="{d}" onerror="this.outerHTML=\'<div class=ph>\'+this.alt+\'</div>\'">'


def build_page(n, M, total):
    d, ds = date_of(n)
    key, ex, TK = {}, {}, {"hoeren": [], "lesen": []}

    def reg(nm, kind, q, ot, a, src, ev=None, extra=None):
        e = {"k": kind, "q": q, "ot": ot, "a": a, "ev": ev if ev is not None else X.evidence(src, q, ot), "src": src}
        if extra:
            e.update(extra)
        ex[nm] = e

    # ----- Hören tasks -----
    HT, c = [], 0
    ks, it = [], ""
    for t, q, o, a in M["h1"]:
        o, a = rot(o, a); c += 1; nm = f"h{c}"; key[nm] = a; ol = o.split("|")
        it += item(c, q, ol, nm); reg(nm, "h1", q, ol, a, t); ks.append(nm)
    HT.append(("Aufgabe 1 · Ansagen am Telefon oder per Lautsprecher", "Sie hören jeden Text einmal. Zu jedem Text gibt es eine Aufgabe.", "", it)); TK["hoeren"].append(ks)
    ks, it = [], ""
    for t, q, o, a in M["h2"]:
        o, a = rot(o, a); c += 1; nm = f"h{c}"; key[nm] = a; ol = o.split("|")
        it += item(c, q, ol, nm); reg(nm, "h2", q, ol, a, t); ks.append(nm)
    HT.append(("Aufgabe 2 · Ansagen im Radio", "Sie hören jeden Text einmal.", "", it)); TK["hoeren"].append(ks)
    ks, it = [], ""
    for gi, (setting, turns, qs) in enumerate(M["h3"]):
        it += f'<div class="sub">Gespräch {gi+1} · {E(setting)}</div>'
        src = " ".join(l for w, l in turns)
        for q, o, a in qs:
            o, a = rot(o, a); c += 1; nm = f"h{c}"; key[nm] = a; ol = o.split("|"); ks.append(nm)
            it += item(c, q, ol, nm)
            if ol[0] == "richtig":
                s = X.best_sent(src, X.toks(q), []); reg(nm, "h3", q, ol, a, src, ev=[s, s])
            else:
                reg(nm, "h3", q, ol, a, src)
    HT.append(("Aufgabe 3 · Gespräche", "Zu jedem Gespräch lösen Sie zwei Aufgaben.", "", it)); TK["hoeren"].append(ks)
    th, speakers, stm, ans = M["h4"]
    ks, it = [], ""
    left = f'<h4>{E(th)}</h4><p class="hint">Ordnen Sie die Aussagen den drei Personen zu. Nicht jede Aussage passt. Sie haben eine Minute Zeit zum Lesen.</p><ul class="stm">' + "".join(f'<li><b>{LET[i]}</b> {E(x)}</li>' for i, x in enumerate(stm)) + "</ul>"
    for i in range(3):
        c += 1; nm = f"h{c}"; key[nm] = ans[i]; ks.append(nm)
        it += item(c, f"Person {i+1}", [f"{LET[j]}" for j in range(len(stm))], nm).replace('class="opts"', 'class="opts row"')
        reg(nm, "h4", f"Person {i+1}", list(stm), ans[i], speakers[i], ev=[X.best_sent(speakers[i], X.toks(s), []) for s in stm])
    HT.append((f"Aufgabe 4 · Meinungen: {E(th)}", "Sie hören drei Personen.", left, it)); TK["hoeren"].append(ks)
    assert c == 20, (n, c)
    TR = ""
    for i, (t, q, o, a) in enumerate(M["h1"] + M["h2"]):
        TR += f"<p><b>Text {i+1}:</b> {E(t)}</p>"
    for gi, (setting, turns, qs) in enumerate(M["h3"]):
        TR += f"<p><b>Gespräch {gi+1}</b> ({E(setting)})<br>" + "<br>".join(f"{'Frau' if w in 'FG' else 'Mann'}: {E(l)}" for w, l in turns) + "</p>"
    for i, t in enumerate(speakers):
        TR += f"<p><b>Person {i+1}:</b> {E(t)}</p>"
    # ----- Lesen tasks -----
    LT, c = [], 0
    ks, it = [], ""
    for t, q, o, a in M["l1"]:
        o, a = rot(o, a); c += 1; nm = f"l{c}"; key[nm] = a; ol = o.split("|"); ks.append(nm)
        it += item(c, q, ol, nm); reg(nm, "l1", q, ol, a, "", ev=["" for _ in ol], extra={"why": X.l1_text(q, ol, a)})
    LT.append(("Aufgabe 1 · Kataloge, Verzeichnisse, Rubriken", "Wo finden Sie das? Wählen Sie die richtige Rubrik.", "", it)); TK["lesen"].append(ks)
    ads, sits, sans = M["l2"]
    ks, it = [], ""
    left = '<p class="hint">Welche Anzeige passt zu welcher Situation? Eine Situation hat keine passende Anzeige: Wählen Sie dann <b>x</b>.</p><div class="ads">' + "".join(f'<div class="ad"><b>{LET[i]}</b> {E(x)}</div>' for i, x in enumerate(ads)) + "</div>"
    for i, sit in enumerate(sits):
        c += 1; nm = f"l{c}"; a = 8 if sans[i] == "x" else LET.index(sans[i]); key[nm] = a; ks.append(nm)
        it += item(c, sit, list(LET[:len(ads)]) + ["x"], nm).replace('class="opts"', 'class="opts row"')
        reg(nm, "l2", sit, list(ads) + ["Keine Anzeige passt (x)"], a, "", ev=list(ads) + [""])
    LT.append(("Aufgabe 2 · Anzeigen", "Lesen Sie die Anzeigen und ordnen Sie zu.", left, it)); TK["lesen"].append(ks)
    ks, it, left = [], "", ""
    for ti, (text, qs) in enumerate(M["l3"]):
        left += f'<div class="sub">Text {ti+1}</div><div class="text">{E(text).replace(chr(10), "<br>")}</div>'
        it += f'<div class="sub">Zu Text {ti+1}</div>'
        for q, o, a in qs:
            o, a = rot(o, a); c += 1; nm = f"l{c}"; key[nm] = a; ol = o.split("|"); ks.append(nm)
            it += item(c, q, ol, nm)
            if ol[0] == "richtig":
                s = X.best_sent(text, X.toks(q), []); reg(nm, "l3", q, ol, a, text, ev=[s, s])
            else:
                reg(nm, "l3", q, ol, a, text)
    LT.append(("Aufgabe 3 · Presse und formelle Mitteilungen", "Lesen Sie die Texte. Zu jedem Text gibt es zwei Aufgaben.", left, it)); TK["lesen"].append(ks)
    text, qs = M["l4"]
    ks, it = [], ""
    for q, a in qs:
        c += 1; nm = f"l{c}"; key[nm] = a; ks.append(nm)
        it += item(c, q, ["richtig", "falsch"], nm)
        s = X.best_sent(text, X.toks(q), []); reg(nm, "l4", q, ["richtig", "falsch"], a, text, ev=[s, s])
    LT.append(("Aufgabe 4 · Informationsbroschüre", "Sind die Aussagen richtig oder falsch?", f'<div class="text">{E(text).replace(chr(10), "<br>")}</div>', it)); TK["lesen"].append(ks)
    text, gaps = M["l5"]
    body = E(text).replace(chr(10), "<br>")
    for i in range(len(gaps)):
        body = body.replace(f"[{i+1}]", f"<b class='gap'>({20+i})</b>")
    ks, it = [], ""
    for gi, (o, a) in enumerate(gaps):
        o, a = rot(o, a); c += 1; nm = f"l{c}"; key[nm] = a; ol = o.split("|"); ks.append(nm)
        it += item(c, f"Lücke ({c})", ol, nm).replace('class="opts"', 'class="opts row"')
        gs = gap_sentence(text, gi + 1, ol[a])
        reg(nm, "l5", f"Lücke ({c})", ol, a, gs, ev=["" for _ in ol], extra={"gap": X.gap_rule(ol[a], ol, gs), "sent": gs})
    LT.append(("Aufgabe 5 · Brief ergänzen (Sprachbausteine)", "Welches Wort passt? Lösen Sie die Aufgaben 20 bis 25.", f'<div class="text">{body}</div>', it)); TK["lesen"].append(ks)
    assert c == 25, (n, c)
    Hh = "".join(task("hoeren", i, len(HT), *t) for i, t in enumerate(HT))
    Ll = "".join(task("lesen", i, len(LT), *t) for i, t in enumerate(LT))
    # ----- Schreiben -----
    sit, lp, model = M["s"]
    sitB, lpB, modelB = M["sB"]
    def sblock(tag, sit, lp, reg_):
        return f'<div class="wtask" id="w{tag}"><div class="text">{E(sit).replace(chr(10), "<br>")}</div><p><b>Schreiben Sie auf alle vier Punkte:</b></p><ol>' + "".join(f"<li>{E(x)}</li>" for x in lp) + "</ol></div>"
    S_left = '<p class="hint">Wählen Sie Aufgabe A oder B. Schreiben Sie ca. 80–100 Wörter, behandeln Sie alle vier Punkte, und vergessen Sie Anrede und Gruß nicht.</p><div class="choice"><label><input type="radio" name="wt" value="A" checked> Aufgabe A (halbformell/informell)</label><label><input type="radio" name="wt" value="B"> Aufgabe B (formell/informell)</label></div>' + sblock("A", sit, lp, "") + sblock("B", sitB, lpB, "")
    S_right = '<textarea id="brief" placeholder="Schreiben Sie hier Ihren Brief …" spellcheck="false"></textarea><div class="wc" id="wc">0 Wörter</div><div class="actions"><button class="btn ghost" data-save>Speichern</button><span class="saved"></span><button class="btn ghost" id="copy">Text kopieren</button><button class="btn" data-endsec="schreiben">Schreiben beenden</button></div>'
    # ----- Sprechen -----
    p1, p2, p3, p2b = M["p1"], M["p2"], M["p3"], M["p2b"]
    P_left = '<h4>Teil 1 · Sich vorstellen</h4><p class="hint">Sie stellen sich vor (ca. 1 Minute). Danach folgen ein bis zwei Fragen.</p><ul>' + "".join(f"<li>{E(x)}</li>" for x in p1[0]) + "</ul><p><b>Mögliche Nachfragen:</b> " + E(" · ".join(p1[1])) + "</p>"
    P_left += f'<h4>Teil 2 · Von Erfahrungen berichten</h4><div class="picgrid"><div class="pic"><b>Teilnehmer A · Bild A</b>{pimg('bild-a.png',p2[0])}<ul>' + "".join(f"<li>{E(x)}</li>" for x in p2[1]) + f'</ul></div><div class="pic"><b>Teilnehmer B · Bild B</b>{pimg('bild-b.png',p2b[0])}<ul>' + "".join(f"<li>{E(x)}</li>" for x in p2b[1]) + "</ul></div></div>"
    P_left += f'<h4>Teil 3 · Gemeinsam etwas planen</h4><div class="text">{E(p3[0])}</div><ul>' + "".join(f"<li>{E(x)}</li>" for x in p3[1]) + "</ul>"
    P_right = '<p class="hint">Sprechen Sie laut, am besten mit Aufnahme. Schreiben Sie danach Ihre Antworten hier auf. Die Bewertung machen wir im Claude-Chat.</p><textarea id="sprech" placeholder="Teil 1 … Teil 2 … Teil 3 …" spellcheck="false"></textarea><div class="actions"><button class="btn ghost" data-save>Speichern</button><span class="saved"></span><button class="btn" id="finish2">Prüfung beenden</button></div>'
    P_model = f"<p><b>Teil 1:</b> {E(p1[2])}</p><p><b>Teil 2 · Bild A:</b> {E(p2[2])}</p><p><b>Teil 2 · Bild B:</b> {E(p2b[2])}</p><p><b>Teil 3:</b><br>" + "<br>".join(f"{'Person A' if w in 'FG' else 'Person B'}: {E(l)}" for w, l in p3[2]) + "</p>"
    chk = "".join(f"<li>Leitpunkt: {E(x)}</li>" for x in lp)
    meta = json.dumps({"n": n, "key": key, "ex": ex, "tk": TK}, ensure_ascii=False).replace("</", "<\\/")
    save = ""
    return f"""<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DTZ B1 · Modelltest {n}</title>{FONTS}<link rel="stylesheet" href="../assets/style.css"></head>
<body class="exam">
<div id="start"><div class="hero-l"><div><span class="logo">DTZ B1</span><div class="big">{n}</div><h1>Modelltest {n}</h1><p>{E(M['th'])} · {ds}</p></div><p>Deutsch-Test für Zuwanderer · Probeprüfung unter Prüfungsbedingungen</p></div>
<div class="hero-r"><h2>So läuft die Prüfung ab</h2><div class="flow"><div><b>Hören · 25 Minuten</b><small>20 Aufgaben. Audio läuft einmal, automatisch.</small></div><div><b>Lesen · 45 Minuten und Schreiben · 30 Minuten</b><small>Beliebige Reihenfolge. Jeder Teil startet erst, wenn Sie ihn starten.</small></div><div><b>Sprechen · ca. 15 Minuten</b><small>3 Teile, Paarprüfung.</small></div></div>
<ul class="rules"><li>Die Zeit startet erst mit „Prüfung starten“. Der schriftliche Teil dauert insgesamt 100 Minuten.</li><li>Während Hören läuft, sind alle anderen Teile gesperrt.</li><li>Läuft die Zeit eines Teils ab, werden Ihre Antworten gespeichert und der Teil wird gesperrt.</li><li>Antworten und Erklärungen sehen Sie erst nach der Abgabe.</li></ul>
<div class="startacts"><button class="btn big" id="begin">Prüfung starten</button><button class="btn ghost" id="reset" hidden>Neu beginnen</button><a href="../">Zur Übersicht</a></div></div></div>
<div id="app" hidden>
<header class="bar"><div class="bl"><span class="logo sm">DTZ B1</span><div><b>Modelltest {n}</b><small>{E(M['th'])}</small></div></div>
<div class="bc"><div class="tm main"><small id="tm-l">Schriftliche Prüfung</small><b id="tm-main">100:00</b></div><div class="tm sub"><small id="tm-sl">Hören</small><b id="tm-sub">25:00</b></div></div>
<div class="br"><button class="btn" id="finish">Prüfung beenden</button></div></header>
<div class="shell"><nav class="side"><button class="sbtn" data-t="hoeren"><i>1</i><span>Hören<small>25 Min</small></span></button><button class="sbtn" data-t="lesen"><i>2</i><span>Lesen<small>45 Min</small></span></button><button class="sbtn" data-t="schreiben"><i>3</i><span>Schreiben<small>30 Min</small></span></button><button class="sbtn" data-t="sprechen"><i>4</i><span>Sprechen<small>ca. 15 Min</small></span></button><button class="sbtn" data-t="antworten" disabled><i>★</i><span>Antworten<small>nach der Abgabe</small></span></button><div class="sidehint" id="sidehint"></div></nav>
<main id="main">
<section id="hoeren"><div class="audbar"><b>Hörtext</b><div class="prog"><i id="aprog"></i></div><span id="astat">Wartet auf Start</span><button class="btn ghost small" id="aplay" hidden>Wiedergabe starten</button><button class="btn small" id="hdone" disabled>Hören beenden</button></div><audio id="aud" preload="auto" src="hoeren.mp3"></audio><div class="noaudio" id="noaudio">Die Audiodatei fehlt oder kann nicht geladen werden. Sie können „Hören beenden“ klicken und trotzdem die Aufgaben ansehen.</div>{Hh}</section>
<section id="lesen"><div class="gate"><div><h2>Lesen</h2><div class="dur">45 Min</div><p>25 Aufgaben. Die Zeit läuft erst, wenn Sie starten. Sie können auch zuerst Schreiben wählen (links).</p><button class="btn big" data-begin="lesen">Lesen starten</button></div></div><div class="endbar"><button class="btn small" data-endsec="lesen">Lesen beenden</button></div>{Ll}</section>
<section id="schreiben"><div class="gate"><div><h2>Schreiben</h2><div class="dur">30 Min</div><p>Ein Brief, Aufgabe A oder B. Die Zeit läuft erst, wenn Sie starten. Sie können auch zuerst Lesen wählen (links).</p><button class="btn big" data-begin="schreiben">Schreiben starten</button></div></div><div class="task on"><div class="tband"><b>Schreiben</b><span>30 Minuten · ein Brief</span></div><div class="tbody two"><div class="pane left">{S_left}</div><div class="pane right">{S_right}</div></div></div></section>
<section id="sprechen"><div class="task on"><div class="tband"><b>Sprechen</b><span>Paarprüfung · ca. 15 Minuten</span></div><div class="tbody two"><div class="pane left">{P_left}</div><div class="pane right">{P_right}</div></div></div></section>
<section id="antworten"><div class="card"><h2>Antworten und Erklärungen</h2><div id="ans-sum"></div></div>
<div class="card"><div class="filter"><button class="btn ghost on" data-f="wrong">Nur falsche und offene</button><button class="btn ghost" data-f="all">Alle Aufgaben</button></div><div id="ans-list"></div></div>
<div class="card"><h3>Hörtexte</h3><details><summary>Alle Hörtexte anzeigen</summary>{TR}</details>
<h3>Schreiben: Modellbriefe</h3><p><b>Aufgabe A</b> <span class="mine" data-mine="A"></span></p><div class="text">{E(model).replace(chr(10), "<br>")}</div><p><b>Aufgabe B</b> <span class="mine" data-mine="B"></span></p><div class="text">{E(modelB).replace(chr(10), "<br>")}</div><p><b>Checkliste:</b></p><ul>{chk}<li>Anrede und Gruß</li><li>Verbindungswörter (weil, deshalb, außerdem, aber)</li><li>Höfliche Formen (Könnten Sie …? Ich würde mich freuen …)</li></ul>
<h3>Sprechen: Beispielantworten</h3><div class="player"><audio controls preload="none" src="sprechen_modell.mp3"></audio><div class="noaudio">Die Audiodatei fehlt noch.</div></div>{P_model}
<div class="self"><b>Selbsteinschätzung Schreiben:</b> <label><input type="radio" name="s" value="0"> A1</label> <label><input type="radio" name="s" value="1"> A2</label> <label><input type="radio" name="s" value="2"> B1</label></div>
<div class="self"><b>Selbsteinschätzung Sprechen:</b> <label><input type="radio" name="p" value="0"> A1</label> <label><input type="radio" name="p" value="1"> A2</label> <label><input type="radio" name="p" value="2"> B1</label></div><div id="verdict"></div>
<div class="actions"><button class="btn ghost" id="redo">Prüfung wiederholen</button><a href="../">Zur Übersicht</a></div></div></section>
</main>
<aside class="pal" id="pal"></aside></div></div>
<div id="modal" hidden><div class="dlg"><h2>Prüfung beenden?</h2><p>Prüfen Sie Ihre Antworten in jedem Teil noch einmal. Nach dem Abgeben können Sie nichts mehr ändern.</p><div id="chk"></div><div class="acts"><button class="btn ghost" id="back">Zurück zur Prüfung</button><button class="btn" id="submit" disabled>Endgültig abgeben</button></div></div></div>
<div id="toast" hidden></div>
<script id="meta" type="application/json">{meta}</script><script src="../assets/app.js"></script>
</body></html>"""


def build_index(mocks):
    meta = json.dumps([{"n": i + 1, "f": folder(i + 1), "d": date_of(i + 1)[1], "th": M["th"]} for i, M in enumerate(mocks)], ensure_ascii=False)
    return f"""<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DTZ B1 · Modelltests</title>{FONTS}<link rel="stylesheet" href="assets/style.css"></head>
<body class="home-page"><header class="hero"><div class="hero-in"><div><div class="logo">DTZ B1</div><h1>{len(mocks)} Modelltests</h1><div class="theme">Prüfung am Donnerstag, 10. Dezember 2026 · <span id="count"></span></div></div><div class="stats" id="stats"></div></div></header>
<main class="homemain"><div class="card"><div class="bar"><i id="bar"></i></div><p id="sum"></p><p class="hint">Jeder Test ist eine komplette Prüfung mit Zeitlimit. Bestanden: B1 im Sprechen und in Hören/Lesen (ab 33 von 45) oder im Schreiben. Dein Fortschritt wird nur in diesem Browser gespeichert.</p></div>
<div id="list"></div></main>
<script>const MOCKS={meta};</script><script src="assets/index.js"></script></body></html>"""


FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Newsreader:opsz,wght@6..72,400;6..72,600&display=swap" rel="stylesheet">'

CSS = """
:root{--ink:#0d1b2e;--ink2:#17304f;--bg:#e8edf3;--card:#fff;--bd:#d3dbe6;--tx:#14233a;--mut:#62728a;--pri:#0b7a75;--pri-d:#075e5a;--sel:#e1f4f2;--ok:#16a067;--warn:#f0a22e;--bad:#d6402f;--okbg:#e2f5ec;--badbg:#fdeceb;--gold:#f6c25b;--sans:'Manrope','Segoe UI',system-ui,sans-serif;--serif:'Newsreader',Georgia,serif}
*{box-sizing:border-box}body{margin:0;font:15px/1.55 var(--sans);background:var(--bg);color:var(--tx);-webkit-font-smoothing:antialiased}
:focus-visible{outline:3px solid var(--gold);outline-offset:2px}
.logo{display:inline-block;background:var(--gold);color:var(--ink);font-weight:800;letter-spacing:.04em;padding:6px 12px;border-radius:6px}.logo.sm{padding:5px 9px;font-size:.82rem}
.btn{background:var(--pri);color:#fff;border:1.5px solid var(--pri);border-radius:10px;padding:10px 22px;font:700 .92rem var(--sans);cursor:pointer;transition:background .15s,transform .1s}.btn:hover:not(:disabled){background:var(--pri-d)}.btn:active:not(:disabled){transform:translateY(1px)}.btn:disabled{opacity:.4;cursor:not-allowed}
.btn.ghost{background:#fff;color:var(--pri)}.btn.ghost:hover:not(:disabled){background:var(--sel)}.btn.ghost.on{background:var(--pri);color:#fff}.btn.small{padding:6px 14px;font-size:.85rem}.btn.big{padding:15px 44px;font-size:1.1rem;background:var(--gold);border-color:var(--gold);color:var(--ink)}.btn.big:hover:not(:disabled){background:#ffd37e}
#start{min-height:100vh;display:grid;grid-template-columns:minmax(380px,5fr) 6fr}#start[hidden]{display:none}
.hero-l{background:radial-gradient(1200px 600px at 0% 0%,#1d4170 0,transparent 60%),var(--ink);color:#fff;padding:56px 54px;display:flex;flex-direction:column;justify-content:space-between}
.hero-l .big{font:800 clamp(7rem,15vw,13rem)/.85 var(--sans);letter-spacing:-.06em;color:var(--gold);margin:30px 0 0}.hero-l h1{font:700 2rem/1.15 var(--sans);margin:18px 0 6px}.hero-l p{color:#b8c7dc;margin:0;max-width:34ch}
.hero-r{padding:56px 60px;display:flex;flex-direction:column;justify-content:center;max-width:760px}.hero-r h2{font-size:1.3rem;margin:0 0 14px}
.flow{display:grid;gap:0;margin:0 0 22px;border-left:3px solid var(--bd);padding-left:22px}.flow div{position:relative;padding:10px 0}.flow div::before{content:'';position:absolute;left:-30px;top:17px;width:13px;height:13px;border-radius:50%;background:var(--pri);border:3px solid var(--bg)}.flow b{display:block}.flow small{color:var(--mut)}
.rules{padding-left:18px;color:#34455e;margin:0}.rules li{margin:.45em 0}.startacts{display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-top:28px}.startacts a{color:var(--pri);font-weight:700;text-decoration:none}
#app[hidden]{display:none}
.bar{position:sticky;top:0;z-index:30;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;padding:8px 24px;height:88px;background:var(--ink);color:#fff}
.bl{display:flex;gap:12px;align-items:center;min-width:0}.bl b{display:block;line-height:1.2}.bl small{color:#9db0c9}.br{justify-self:end}.bar .btn{background:transparent;border-color:#6f86a6}.bar .btn:hover{background:#ffffff1a}
.bc{display:flex;flex-direction:column;align-items:center;line-height:1}.tm small{display:block;color:#9db0c9;font-size:.72rem}
.tm.main b{font:800 2rem/1.1 var(--sans);font-variant-numeric:tabular-nums;color:var(--gold)}.tm.sub{display:flex;gap:8px;align-items:baseline;margin-top:3px;background:#ffffff18;border-radius:99px;padding:2px 14px}.tm.sub small{display:inline}.tm.sub b{color:#fff;font:700 1rem var(--sans);font-variant-numeric:tabular-nums}
.bc.low .tm.main b{color:#ff7b6b;animation:pulse 1s infinite}@keyframes pulse{50%{opacity:.5}}
.shell{display:grid;grid-template-columns:220px minmax(0,1fr) 310px;gap:16px;padding:16px;align-items:start}
.side{position:sticky;top:104px;background:var(--ink2);border-radius:14px;padding:10px;color:#dbe6f5}
.sbtn{display:flex;gap:12px;align-items:center;width:100%;text-align:left;border:0;background:none;padding:11px;border-radius:10px;font:700 .95rem var(--sans);color:#dbe6f5;cursor:pointer}
.sbtn i{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#ffffff1c;font-style:normal;font-size:.82rem;flex:none}
.sbtn small{display:block;font-weight:500;font-size:.75rem;color:#8ea3c0}.sbtn:hover:not(:disabled){background:#ffffff14}.sbtn.on{background:#fff;color:var(--ink)}.sbtn.on i{background:var(--pri);color:#fff}.sbtn.on small{color:var(--mut)}.sbtn:disabled{opacity:.35;cursor:not-allowed}.sbtn.end small::after{content:' · beendet'}
.sidehint{font-size:.78rem;color:#8ea3c0;padding:12px 10px 6px;border-top:1px solid #ffffff22;margin-top:8px}
main#main{min-width:0}section{display:none}section.on{display:block}
.task{display:none;flex-direction:column;height:calc(100vh - 150px);min-height:520px;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 2px #0d1b2e14,0 8px 28px #0d1b2e0d}.task.on{display:flex}
.tband{display:flex;flex-wrap:wrap;gap:6px 18px;align-items:baseline;padding:14px 26px;background:var(--ink);color:#fff}.tband b{font-size:1.05rem}.tband span{color:#a9bcd6;font-size:.9rem}
.tbody{flex:1;display:grid;min-height:0}.tbody.two{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.tbody.one{grid-template-columns:1fr}
.pane{overflow:auto;padding:22px 28px}.pane.left{border-right:1px solid var(--bd);background:#f7f9fc}.pane.wide{columns:2 440px;column-gap:40px}.pane.wide .item,.pane.wide .sub{break-inside:avoid}
.tnav{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;padding:10px 24px;border-top:1px solid var(--bd);background:#f7f9fc}.tnav>div:last-child{justify-self:end}.tnav .mid{display:flex;gap:10px;align-items:center}.saved{color:var(--ok);font-size:.85rem;font-weight:600}
h4{margin:.2em 0 .4em;font-size:1.05rem}.pane h4:not(:first-child){margin-top:1.6em}.hint{color:var(--mut);font-size:.9rem}
.sub{margin:16px 0 4px;font-weight:800;color:var(--pri-d)}.pane .sub:first-child{margin-top:0}
.item{display:flex;gap:14px;padding:15px 0;border-bottom:1px solid #e9eef4}.qn{width:34px;height:34px;flex:none;border-radius:10px;background:var(--ink);color:var(--gold);display:grid;place-items:center;font-weight:800;font-size:.85rem}
.qb{flex:1;min-width:0}.q{margin:.2em 0 .55em;font-weight:700}
.opt{display:flex;gap:11px;align-items:flex-start;padding:10px 14px;border:1.5px solid var(--bd);border-radius:11px;margin:7px 0;cursor:pointer;background:#fff;transition:background .12s,border-color .12s}
.opt:hover{border-color:#7fc3be;background:#f6fcfb}.opt:has(input:checked){background:var(--sel);border-color:var(--pri);box-shadow:inset 4px 0 0 var(--pri)}
.opt input{appearance:none;flex:none;width:18px;height:18px;margin:3px 0 0;border:2px solid #8593a6;border-radius:50%;background:#fff}.opt input:checked{border-color:var(--pri);background:radial-gradient(var(--pri) 0 45%,#fff 50%)}
.k{font-weight:800;color:var(--pri);min-width:1.1em}.opts.row{display:flex;flex-wrap:wrap;gap:6px}.opts.row .opt{margin:0;padding:8px 15px}
.text,.ad{background:#fff;border:1px solid var(--bd);border-left:4px solid var(--gold);padding:15px 20px;border-radius:8px;margin:10px 0 16px;font:1.06rem/1.75 var(--serif)}
.ads{display:grid;gap:8px}.ad{margin:0;font-size:.95rem;line-height:1.5;font-family:var(--sans)}.stm{list-style:none;padding:0}.stm li{padding:7px 0;border-bottom:1px solid #e3e9f0}.gap{color:var(--pri);border-bottom:2px solid var(--pri);padding:0 4px}
.audbar{display:flex;gap:14px;align-items:center;flex-wrap:wrap;padding:12px 18px;background:var(--ink);color:#fff;border-radius:14px;margin-bottom:12px}.prog{flex:1;min-width:140px;height:8px;background:#ffffff2b;border-radius:9px;overflow:hidden}.prog i{display:block;height:100%;width:0;background:var(--gold)}
#astat{font-size:.88rem;color:#b8c9e0}.audbar .btn.ghost{background:transparent;color:#fff;border-color:#8aa0bf}.audbar .btn:not(.ghost){background:var(--gold);border-color:var(--gold);color:var(--ink)}.noaudio{display:none;margin:0 0 12px;padding:9px 13px;background:#fff4e5;border:1px solid #f0c37a;border-radius:8px;color:#7a4a00;font-size:.9rem}.endbar{display:flex;justify-content:flex-end;margin-bottom:8px}
.gate{display:none;min-height:calc(100vh - 140px);place-items:center;background:#fff;border-radius:14px;padding:40px;text-align:center;box-shadow:0 8px 28px #0d1b2e0d}.gated .gate{display:grid}.gated .task,.gated .endbar,.gated .banner{display:none!important}
.gate h2{font-size:2rem;margin:0}.gate p{color:var(--mut);max-width:48ch;margin:10px auto 26px}.gate .dur{font:800 3.4rem/1 var(--sans);color:var(--pri);margin:14px 0 4px}
textarea{width:100%;min-height:340px;font:1.06rem/1.7 var(--serif);padding:15px 17px;border:1.5px solid #9aa8bb;border-radius:11px;background:#fff;resize:vertical}.wc{color:var(--mut);margin:4px 0 8px;font-size:.88rem}
.actions{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:14px}.choice{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0}.choice label{border:1.5px solid var(--bd);padding:9px 15px;border-radius:11px;cursor:pointer;background:#fff;font-weight:600}.choice label:has(input:checked){border-color:var(--pri);background:var(--sel)}
.wtask{display:none}.wtask.on{display:block}.picgrid{display:grid;gap:12px}.pic{border:1.5px solid var(--bd);border-radius:12px;padding:12px 16px;background:#fff}.pimg{display:block;width:100%;height:auto;border-radius:10px;margin:8px 0;background:#e4e9f0}.ph{margin:8px 0;padding:14px;background:#eef2f7;border-radius:8px;color:#4b586a;font-style:italic}
.pal{position:sticky;top:104px;background:#fff;border-radius:14px;padding:18px;max-height:calc(100vh - 120px);overflow:auto;box-shadow:0 1px 2px #0d1b2e14,0 8px 28px #0d1b2e0d}
.pal h5{margin:0 0 4px;font-size:1rem}.pal .grp{margin-top:14px;font-size:.78rem;font-weight:800;color:var(--mut)}.pal .g{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:6px}
.pal a{display:grid;place-items:center;height:38px;border-radius:9px;border:1.5px solid var(--bd);background:#f1f4f8;color:#5a6779;font-weight:800;font-size:.85rem;text-decoration:none;cursor:pointer}
.pal a.ans{background:var(--ok);border-color:var(--ok);color:#fff}.pal a.vis{background:var(--warn);border-color:var(--warn);color:#fff}.pal a.curT{box-shadow:0 0 0 3px #b9e3df}.pal a.r{background:var(--ok);border-color:var(--ok);color:#fff}.pal a.w{background:var(--bad);border-color:var(--bad);color:#fff}
.legend{display:flex;flex-direction:column;gap:6px;margin-top:16px;font-size:.8rem;color:var(--mut)}.legend span::before{content:'';display:inline-block;width:14px;height:14px;border-radius:4px;margin-right:8px;vertical-align:-2px;background:#f1f4f8;border:1.5px solid var(--bd)}.legend .a::before{background:var(--ok);border-color:var(--ok)}.legend .o::before{background:var(--warn);border-color:var(--warn)}
.card{background:#fff;border-radius:14px;padding:24px 28px;margin:0 0 16px;box-shadow:0 1px 2px #0d1b2e14,0 8px 28px #0d1b2e0d}h2{margin:.1em 0 .5em;font-size:1.5rem}h3{margin:1.6em 0 .4em;padding-top:.9em;border-top:2px solid var(--ink);font-size:1.15rem}.card>h3:first-child{margin-top:0;border-top:0;padding-top:0}
.locked .opt{cursor:default;opacity:.78}.banner{margin:0 0 12px;padding:10px 14px;background:#fff4e5;border:1px solid #f0c37a;border-radius:10px;color:#7a4a00;font-weight:700}
#modal{position:fixed;inset:0;background:#0a1220c4;z-index:60;display:grid;place-items:center;padding:16px}#modal[hidden]{display:none}.dlg{background:#fff;border-radius:16px;max-width:560px;width:100%;padding:28px 30px;max-height:92vh;overflow:auto}
.chk{display:flex;gap:12px;align-items:center;padding:10px 12px;border:1.5px solid var(--bd);border-radius:11px;margin:8px 0}.chk label{flex:1;cursor:pointer}.chk small{display:block;color:var(--mut)}.chk button{border:0;background:none;color:var(--pri);font-weight:700;cursor:pointer}.acts{display:flex;gap:12px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap}
#toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--ink);color:#fff;padding:10px 20px;border-radius:99px;z-index:70;font-weight:700}#toast[hidden]{display:none}
.filter{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px}.sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:12px 0}.sum div{border:1px solid var(--bd);border-radius:12px;padding:12px 14px}.sum b{display:block;font-size:1.6rem}.sum small{color:var(--mut)}
.a-item{border:1.5px solid var(--bd);border-radius:12px;margin:12px 0;overflow:hidden}.a-item.r{border-color:#a9d9bf}.a-item.w{border-color:#efb2ab}.a-head{display:flex;gap:12px;align-items:center;padding:9px 16px;background:#f5f7fa;font-weight:700}.a-item.r .a-head{background:var(--okbg)}.a-item.w .a-head{background:var(--badbg)}.a-head .n{font-weight:800;min-width:26px}
.a-body{padding:12px 18px}.a-body p{margin:.5em 0}.lab{font-weight:800;color:var(--pri-d)}.tag{display:inline-block;padding:2px 10px;border-radius:99px;font-size:.78rem;font-weight:800}.tag.ok{background:var(--okbg);color:var(--ok)}.tag.no{background:var(--badbg);color:var(--bad)}.tag.nil{background:#e8ebf0;color:#44546a}
.mem{margin-top:10px;padding:10px 14px;background:#fff8dc;border-left:5px solid var(--gold);border-radius:6px}.quote{display:inline-block;padding:4px 12px;background:#f3f5f8;border-left:4px solid var(--pri);border-radius:4px;font-family:var(--serif)}.vs{margin:.4em 0 .4em 1.1em;padding:0}.vs li{margin:.2em 0}
.self{margin-top:14px;padding:12px 14px;background:#f1f5f9;border-radius:12px}.self label{margin-right:16px;cursor:pointer}.player{border:1px solid var(--bd);border-radius:12px;padding:12px 14px;background:#f6f8fb;margin:12px 0}audio{width:100%}details{margin-top:10px;border:1px solid var(--bd);border-radius:12px;padding:0 16px}summary{cursor:pointer;font-weight:700;color:var(--pri);padding:10px 0}details[open]{padding-bottom:12px}.mine{color:var(--pri);font-weight:700}
.hero{background:var(--ink);color:#fff;padding:36px 30px}.hero-in{max-width:1500px;margin:0 auto;display:flex;gap:30px;flex-wrap:wrap;align-items:flex-end;justify-content:space-between}.hero h1{margin:12px 0 4px;font-size:2.4rem;line-height:1.05}.hero .theme{color:#a9bcd6}
.stats{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:12px;flex:1;min-width:320px;max-width:640px}.stat{border:1px solid #ffffff2b;border-radius:12px;padding:10px 14px;background:#ffffff10}.stat small{color:#a9bcd6;font-size:.8rem}.stat b{display:block;font-size:1.5rem;color:#fff}.stat .m{height:6px;background:#ffffff2b;border-radius:9px;margin-top:6px;overflow:hidden}.stat .m i{display:block;height:100%;background:var(--gold)}.stat.weak{border-color:var(--warn)}.stat.weak small::after{content:' · mehr üben';color:var(--gold);font-weight:700}
.homemain{max-width:1500px;margin:0 auto;padding:20px 28px 50px}.home-page .bar{position:static;height:10px;display:block;padding:0;background:#d3dbe6;border-radius:99px;overflow:hidden}.home-page .bar i{display:block;height:100%;width:0;background:var(--pri);transition:width .5s}
.day{display:flex;gap:16px;align-items:center;flex-wrap:wrap;background:#fff;border-radius:12px;padding:12px 18px;margin:10px 0;text-decoration:none;color:inherit;box-shadow:0 1px 2px #0d1b2e14}.day:hover{box-shadow:0 0 0 2px var(--pri)}.day .n{width:44px;height:44px;border-radius:10px;background:var(--ink);color:var(--gold);display:grid;place-items:center;font-weight:800;font-size:1.15rem}
.day.today{box-shadow:inset 5px 0 0 var(--gold),0 1px 2px #0d1b2e14}.day .t{flex:1;min-width:220px}.day small{color:var(--mut)}.marks{display:flex;gap:6px;flex-wrap:wrap}.pill{padding:3px 11px;border-radius:99px;font-size:.78rem;font-weight:800;background:#e4e8ee;color:#44546a;white-space:nowrap}.pill.b1{background:var(--okbg);color:var(--ok)}.pill.a2{background:#fdf0c8;color:#7a5500}.pill.lo{background:var(--badbg);color:var(--bad)}
@media(max-width:1180px){.shell{grid-template-columns:190px minmax(0,1fr)}.pal{grid-column:1/3;position:static;max-height:none}}
@media(max-width:860px){#start{grid-template-columns:1fr}.hero-l{padding:30px}.hero-l .big{font-size:6rem}.hero-r{padding:28px}.shell{grid-template-columns:1fr;padding:10px}.side{position:static;display:flex;overflow:auto}.sbtn{min-width:140px}.task{height:auto;min-height:0}.tbody.two{grid-template-columns:1fr}.pane{overflow:visible}.pane.left{border-right:0;border-bottom:1px solid var(--bd)}.pane.wide{columns:1}.bar{grid-template-columns:1fr auto;height:auto;padding:8px 12px}.bl small{display:none}.pal{grid-column:1}}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
"""

APP = r"""
(function(){
const meta=JSON.parse(document.getElementById('meta').textContent),N=meta.n,KEY=meta.key,EX=meta.ex,TK=meta.tk,SK='dtz:'+N;
const SECS=['hoeren','lesen','schreiben','sprechen'],WR=['hoeren','lesen','schreiben'],M60=60000,B={hoeren:25*M60,lesen:45*M60,schreiben:30*M60,sprechen:15*M60};
const LAB={hoeren:'Hören',lesen:'Lesen',schreiben:'Schreiben',sprechen:'Sprechen'},LET='abcdefghx';
let st={};try{st=JSON.parse(localStorage.getItem(SK)||'{}')}catch(e){}
st.sel=st.sel||{};st.vis=st.vis||{};st.el=st.el||{};st.lock=st.lock||{};st.cur=st.cur||{};
const save=()=>{try{localStorage.setItem(SK,JSON.stringify(st))}catch(e){}};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const now=()=>Date.now();let cur='hoeren';
function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toast.i);toast.i=setTimeout(()=>t.hidden=true,2200)}
/* time accounting */
function elapsed(s){return (st.el[s]||0)+(st.act===s&&st.since?now()-st.since:0)}
function rem(s){return st.lock[s]?0:B[s]-elapsed(s)}
function commit(){if(st.act&&st.since){st.el[st.act]=(st.el[st.act]||0)+now()-st.since}st.since=now()}
function setAct(s){commit();st.act=s;st.since=now();save()}
const fmt=ms=>{ms=Math.max(0,ms);const s=Math.ceil(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
function avail(s){if(!st.t0)return false;if(s==='hoeren')return true;if(s==='lesen'||s==='schreiben')return !!st.lock.hoeren;if(s==='sprechen')return !!(st.lock.hoeren&&st.lock.lesen&&st.lock.schreiben);return !!st.fin}
function tabs(){$$('.sbtn').forEach(b=>{const s=b.dataset.t;b.disabled=st.fin?false:!avail(s);b.classList.toggle('on',s===cur);b.classList.toggle('end',!!st.lock[s]&&s!=='antworten')});
const h=$('#sidehint');h.textContent=st.fin?'Prüfung abgegeben.':!st.lock.hoeren?'Hören läuft. Die anderen Teile sind gesperrt, bis Hören beendet ist.':(!st.lock.lesen||!st.lock.schreiben)?'Lesen und Schreiben können Sie in beliebiger Reihenfolge bearbeiten. Sprechen folgt danach.':'Sprechen ist freigeschaltet.'}
$$('[data-begin]').forEach(b=>b.onclick=()=>{const k=b.dataset.begin;st.began=st.began||{};st.began[k]=1;save();go(k)});
/* navigation */
function leaveTask(sec){const i=st.cur[sec];if(i===undefined||!TK[sec])return;(TK[sec][i]||[]).forEach(k=>{st.vis[k]=1})}
function go(s,keep){if(s!=='antworten'&&!st.fin&&!avail(s))return;if(SECS.includes(cur)&&cur!==s)leaveTask(cur);cur=s;
$$('section').forEach(x=>x.classList.toggle('on',x.id===s));
if(!st.fin&&SECS.includes(s)&&!st.lock[s]){if(s==='lesen'||s==='schreiben'){if(!st.began||!st.began[s]){commit();st.act=null;st.since=0}else setAct(s)}else setAct(s)}
$$('#lesen,#schreiben').forEach(x=>x.classList.toggle('gated',!st.lock[x.id]&&!st.fin&&!(st.began&&st.began[x.id])));
if(TK[s]){showTask(s,st.cur[s]||0)}else{pal()}
tabs();tick();if(!keep)window.scrollTo(0,0)}
function showTask(sec,i){if(st.cur[sec]!==undefined&&st.cur[sec]!==i)leaveTask(sec);st.cur[sec]=i;$$('#'+sec+' .task').forEach((t,j)=>t.classList.toggle('on',j===i));pal();save()}
$$('.sbtn').forEach(b=>b.onclick=()=>{if(!b.disabled)go(b.dataset.t)});
document.addEventListener('click',e=>{const t=e.target.closest('.task');if(!t)return;const sec=t.dataset.sec,i=+t.dataset.i;if(e.target.closest('[data-next]')){showTask(sec,i+1);window.scrollTo(0,0)}if(e.target.closest('[data-prev]')){showTask(sec,i-1);window.scrollTo(0,0)}});
/* palette */
function pal(){const P=$('#pal');if(TK[cur]){const ti=st.cur[cur]||0;let n=0;let h='<h5>'+LAB[cur]+' · Aufgaben</h5><div class="hint">Klicken zum Springen</div>';
TK[cur].forEach((ks,gi)=>{h+='<div class="grp">Aufgabe '+(gi+1)+'</div><div class="g">';ks.forEach(k=>{n++;let c='';if(st.fin)c=String(KEY[k])===st.sel[k]?'r':'w';else if(st.sel[k]!==undefined)c='ans';else if(st.vis[k])c='vis';if(gi===ti)c+=' curT';h+='<a class="'+c+'" data-k="'+k+'" data-g="'+gi+'">'+n+'</a>'});h+='</div>'});
h+='<div class="legend"><span class="a">beantwortet</span><span class="o">nicht beantwortet (übersprungen)</span><span>noch nicht gesehen</span></div>';P.innerHTML=h;
$$('#pal a').forEach(a=>a.onclick=()=>{showTask(cur,+a.dataset.g);const el=document.getElementById('i-'+a.dataset.k);if(el)el.scrollIntoView({block:'center'})})}
else if(cur==='schreiben'){P.innerHTML='<h5>Schreiben</h5><p class="hint">Wählen Sie Aufgabe A oder B. Ziel: ca. 80–100 Wörter, alle vier Leitpunkte, Anrede und Gruß.</p><p><b id="pwc"></b></p>';pwc()}
else if(cur==='sprechen'){P.innerHTML='<h5>Sprechen</h5><p class="hint">Üben Sie alle drei Teile laut. Teil 2: Bild beschreiben, dann Fragen beantworten. Teil 3: Vorschläge machen, zustimmen, ablehnen, einigen.</p>'}
else{P.innerHTML='<h5>Antworten</h5><p class="hint">Rechts sehen Sie Ihr Ergebnis, links die Erklärungen.</p>'}}
function pwc(){const e=$('#pwc');if(e)e.textContent=((st.brief||'').trim().match(/\S+/g)||[]).length+' Wörter'}
/* locking */
function lockSec(s,why){commit();st.lock[s]=true;const sec=$('#'+s);sec.classList.add('locked');sec.querySelectorAll('input,textarea').forEach(i=>i.disabled=true);
if(!sec.querySelector('.banner')){const b=document.createElement('div');b.className='banner';b.textContent=why;sec.insertBefore(b,sec.firstChild)}
if(s==='hoeren'){try{aud.pause()}catch(e){}$('#hdone').disabled=true}
save();tabs()}
function autoNext(from){if(from==='hoeren'){go('lesen')}else if(from==='lesen'){if(!st.lock.schreiben)go('schreiben');else if(avail('sprechen'))go('sprechen');else openFinish()}else if(from==='schreiben'){if(!st.lock.lesen)go('lesen');else if(avail('sprechen'))go('sprechen');else openFinish()}else openFinish()}
function endSec(s,msg){lockSec(s,msg);toast(LAB[s]+' beendet, gespeichert');autoNext(s)}
$$('[data-endsec]').forEach(b=>b.onclick=()=>{const s=b.dataset.endsec;if(confirm(LAB[s]+' jetzt beenden? Danach können Sie diesen Teil nicht mehr ändern.'))endSec(s,'Dieser Teil wurde beendet. Ihre Antworten sind gespeichert.')});
/* timers */
function tick(){if(!st.t0)return;
if(!st.fin){SECS.forEach(s=>{if(!st.lock[s]&&st.act===s&&rem(s)<=0){endSec(s,'Die Zeit für diesen Teil ist abgelaufen. Ihre Antworten wurden gespeichert.')}})}
const bc=$('.bc');if(st.fin){$('#tm-l').textContent='Prüfung abgegeben';$('#tm-main').textContent='–';$('.tm.sub').style.visibility='hidden';bc.classList.remove('low');return}
const open=WR.filter(s=>!st.lock[s]);let main,lab;if(open.length){main=open.reduce((a,s)=>a+rem(s),0);lab='Schriftliche Prüfung'}else{main=rem('sprechen');lab='Sprechen'}
$('#tm-l').textContent=lab;$('#tm-main').textContent=fmt(main);
const a=st.act&&!st.lock[st.act]?st.act:null;const sub=$('.tm.sub');
if(a&&open.length){$('#tm-sl').textContent=LAB[a];$('#tm-sub').textContent=fmt(rem(a));sub.style.visibility='visible'}else sub.style.visibility='hidden';
bc.classList.toggle('low',(a?rem(a):main)<5*M60)}
setInterval(tick,1000);
/* inputs */
$$('input[type=radio]').forEach(r=>{const n=r.name;if(n==='s'||n==='p'){if(st[n]===r.value)r.checked=true}else if(n==='wt'){if((st.wt||'A')===r.value)r.checked=true}else if(st.sel[n]===r.value)r.checked=true;
r.addEventListener('change',()=>{if(n==='s'||n==='p'){st[n]=r.value;verdict()}else if(n==='wt'){st.wt=r.value;wt()}else st.sel[n]=r.value;save();pal()})});
function wt(){const w=st.wt||'A';$('#wA').classList.toggle('on',w==='A');$('#wB').classList.toggle('on',w==='B')}wt();
const ta=$('#brief'),sp=$('#sprech');if(st.brief)ta.value=st.brief;if(st.sprech)sp.value=st.sprech;
ta.oninput=()=>{st.brief=ta.value;const n=(ta.value.trim().match(/\S+/g)||[]).length;$('#wc').textContent=n+' Wörter';pwc();save()};ta.oninput();sp.oninput=()=>{st.sprech=sp.value;save()};
$('#copy').onclick=()=>{ta.select();try{navigator.clipboard.writeText(ta.value);toast('Text kopiert')}catch(e){document.execCommand('copy')}};
document.addEventListener('click',e=>{const b=e.target.closest('[data-save]');if(!b)return;save();const t=new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});$$('.saved').forEach(x=>x.textContent='');const sv=b.parentNode.querySelector('.saved');if(sv)sv.textContent='Gespeichert um '+t;toast('Gespeichert')});
/* audio */
const aud=$('#aud');let ended=false;
function aStat(t){$('#astat').textContent=t}
aud.addEventListener('timeupdate',()=>{if(aud.duration)$('#aprog').style.width=(aud.currentTime/aud.duration*100)+'%'});
aud.addEventListener('playing',()=>{aStat('Wiedergabe läuft …');$('#aplay').hidden=true;$('#noaudio').style.display='none'});
aud.addEventListener('ended',()=>{ended=true;aStat('Wiedergabe beendet');$('#hdone').disabled=false});
aud.addEventListener('error',()=>{$('#noaudio').style.display='block';aStat('Audio nicht verfügbar');$('#hdone').disabled=false});
$('#aplay').onclick=()=>{aud.play().catch(()=>{})};
$('#hdone').onclick=()=>{if(confirm('Hören jetzt beenden?'))endSec('hoeren','Hören ist beendet. Ihre Antworten sind gespeichert.')};
function startAudio(){if(st.lock.hoeren)return;aStat('Wiedergabe startet …');aud.play().catch(()=>{aStat('Bitte „Wiedergabe starten“ klicken');$('#aplay').hidden=false})}
/* finish */
function counts(){const o={};['h','l'].forEach(p=>{const ks=Object.keys(KEY).filter(k=>k[0]===p);o[p]=[ks.filter(k=>st.sel[k]!==undefined).length,ks.length]});return o}
function openFinish(){const c=counts();const rows=[['hoeren','Hören',c.h[0]+' von '+c.h[1]+' beantwortet'],['lesen','Lesen',c.l[0]+' von '+c.l[1]+' beantwortet'],['schreiben','Schreiben',((st.brief||'').trim().match(/\S+/g)||[]).length+' Wörter geschrieben'],['sprechen','Sprechen',(st.sprech||'').trim()?'Antworten notiert':'keine Notizen (Sprechen wird im Chat bewertet)']];
$('#chk').innerHTML=rows.map(r=>'<div class="chk"><input type="checkbox" id="c-'+r[0]+'"><label for="c-'+r[0]+'"><b>Ich habe '+r[1]+' noch einmal geprüft.</b><small>'+r[2]+'</small></label><button data-go="'+r[0]+'">Ansehen</button></div>').join('');
$$('#chk [data-go]').forEach(b=>b.onclick=()=>{$('#modal').hidden=true;if(avail(b.dataset.go)||st.lock[b.dataset.go])go(b.dataset.go,0)});
$$('#chk input').forEach(i=>i.onchange=()=>{$('#submit').disabled=!$$('#chk input').every(x=>x.checked)});$('#submit').disabled=true;$('#modal').hidden=false}
$('#finish').onclick=openFinish;$('#finish2').onclick=openFinish;$('#back').onclick=()=>$('#modal').hidden=true;$('#submit').onclick=()=>{$('#modal').hidden=true;finalize()};
function score(p){return Object.keys(KEY).filter(k=>k[0]===p&&String(KEY[k])===st.sel[k]).length}
function finalize(){commit();st.fin=true;st.h=score('h');st.l=score('l');SECS.forEach(s=>lockSec(s,'Die Prüfung ist abgegeben. Änderungen sind nicht mehr möglich.'));save();render();go('antworten')}
/* answers */
let filt='wrong';$$('.filter button').forEach(b=>b.onclick=()=>{filt=b.dataset.f;$$('.filter button').forEach(x=>x.classList.toggle('on',x===b));list()});
const GT={h1:'Hören 1',h2:'Hören 2',h3:'Hören 3',h4:'Hören 4',l1:'Lesen 1',l2:'Lesen 2',l3:'Lesen 3',l4:'Lesen 4',l5:'Lesen 5'};const TIPS=%TIPS%;
function lab(e,i){return (e.k==='h4'||e.k==='l2')?(LET[i]+': '+e.ot[i]):e.ot[i]}
function card(k,idx){const e=EX[k],s=st.sel[k],a=e.a,ok=String(a)===s,none=s===undefined;const cls=none?'':(ok?'r':'w');
let h='<div class="a-item '+cls+'"><div class="a-head"><span class="n">'+idx+'</span><span>'+GT[e.k]+'</span><span class="tag '+(none?'nil':ok?'ok':'no')+'">'+(none?'nicht beantwortet':ok?'richtig':'falsch')+'</span></div><div class="a-body">';
h+='<p><span class="lab">Aufgabe:</span> '+esc(e.q)+'</p>';if(e.k==='l5')h+='<p><span class="lab">Satz:</span> '+esc(e.sent.replace(e.ot[a],'«'+e.ot[a]+'»'))+'</p>';
h+='<p><span class="lab">Deine Antwort:</span> '+(none?'–':esc(lab(e,+s)))+'</p><p><span class="lab">Richtig:</span> '+esc(lab(e,a))+'</p>';const rf=e.ot[0]==='richtig';
if(e.k==='l5'){const g=e.gap;h+='<p><span class="lab">Warum richtig?</span> '+esc(g.rule)+'</p><p><span class="lab">Warum nicht die anderen?</span></p><ul class="vs">'+g.vs.map(v=>'<li><b>'+esc(v[0])+'</b>: '+esc(v[1])+(v[0]===e.ot[+s]?' <i>(deine Wahl)</i>':'')+'</li>').join('')+'</ul>'}
else if(e.k==='l1'){h+='<p><span class="lab">Warum richtig?</span> '+esc(e.why)+'</p>'}
else if(e.k==='l2'){h+='<p><span class="lab">Warum richtig?</span> '+(a===8?'Keine Anzeige erfüllt alle genannten Punkte der Situation. Die ähnlichste Anzeige lässt mindestens einen Punkt offen – deshalb x.':'Die Anzeige '+LET[a]+' enthält genau das, was die Situation verlangt.')+'</p>';if(!ok&&!none&&+s!==8)h+='<p><span class="lab">Warum nicht '+LET[+s]+'?</span> Die Anzeige passt nur zu einem Teil der Situation (Thema oder Zielgruppe stimmt, aber Zeit, Preis oder Bedingung passen nicht).</p>'}
else if(rf){const q=e.ev[0];h+='<p><span class="lab">Warum '+(a===0?'richtig':'falsch')+'?</span> '+(q?'Im Text steht: <span class="quote">'+esc(q)+'</span> Die Aussage '+(a===0?'stimmt damit überein.':'weicht davon ab (Zahl, Zeit, Person oder ein Wort wie „nur“, „immer“, „nicht“).'):'Die Aussage '+(a===0?'stimmt':'stimmt nicht')+' mit dem Text überein; vergleiche Zahlen und Wörter genau.')+'</p>'}
else{const q=e.ev[a];h+='<p><span class="lab">Warum richtig?</span> '+(q?'Im Text steht: <span class="quote">'+esc(q)+'</span>':'Die Antwort ergibt sich aus dem Zusammenhang des Textes (siehe Hörtexte unten).')+'</p>';
if(!ok&&!none){const w=e.ev[+s];h+='<p><span class="lab">Warum nicht „'+esc(e.ot[+s]).slice(0,120)+'“?</span> '+(w&&w!==q?'Dazu steht im Text nur: <span class="quote">'+esc(w)+'</span> Das beantwortet die Frage nicht oder gehört zu einer anderen Information – das ist die typische Falle.':'Diese Aussage steht so nicht im Text. Sie klingt ähnlich wie die richtige, sagt aber etwas anderes – achte auf den genauen Wortlaut.')+'</p>'}}
const t=e.k==='l5'?[TIPS.l5[0],e.gap.tip]:TIPS[e.k];h+='<p><span class="lab">So findest du die Antwort:</span> '+esc(t[0])+'</p><div class="mem"><b>Merksatz:</b> '+esc(t[1])+'</div></div></div>';return h}
function list(){const out=[];[['h','hoeren'],['l','lesen']].forEach(([p,s])=>{let i=0;Object.keys(KEY).filter(k=>k[0]===p).forEach(k=>{i++;const ok=String(KEY[k])===st.sel[k];if(filt==='all'||!ok)out.push('<h3>'+LAB[s]+' · Aufgabe '+i+'</h3>'+card(k,i))})});$('#ans-list').innerHTML=out.length?out.join(''):'<p>Alle Aufgaben richtig – sehr gut!</p>'}
const lvl=x=>x>=33?'B1':x>=20?'A2':'unter A2';
function verdict(){const hl=(st.h||0)+(st.l||0);const v=$('#verdict');if(!v)return;const pB=st.p==='2',sB=st.s==='2',hlB=hl>=33;
v.innerHTML=st.p===undefined?'<p class="hint">Wähle deine Selbsteinschätzung für Sprechen und Schreiben, dann siehst du das Gesamtergebnis.</p>':'<h3>'+(pB&&(hlB||sB)?'Gesamt: B1 erreicht':'Gesamt: noch nicht B1')+'</h3><p>B1 gesamt = Sprechen B1 und (Hören+Lesen B1 oder Schreiben B1).</p>';st.done=(st.p!==undefined);save()}
function render(){$('#ans-sum').innerHTML='<div class="sum"><div><b>'+st.h+' / 20</b><small>Hören</small></div><div><b>'+st.l+' / 25</b><small>Lesen</small></div><div><b>'+(st.h+st.l)+' / 45</b><small>Hören + Lesen · '+lvl(st.h+st.l)+'</small></div></div><p class="hint">Ab 33 von 45 richtig = B1, ab 20 = A2. Jede Karte erklärt, warum eine Antwort stimmt oder nicht, und wie du sie im Text findest.</p>';
$$('.mine').forEach(m=>m.textContent=(st.wt||'A')===m.dataset.mine?'(von dir gewählt)':'');list();verdict();$('button[data-t=antworten]').disabled=false}
$$('audio:not(#aud)').forEach(a=>{const n=a.parentNode.querySelector('.noaudio');a.addEventListener('error',()=>{if(n)n.style.display='block'})});
$('#redo').onclick=()=>{if(confirm('Alle Antworten dieses Tests löschen und neu beginnen?')){try{localStorage.removeItem(SK)}catch(e){}location.reload()}};
/* start */
function showApp(){$('#start').hidden=true;$('#app').hidden=false}
function begin(){if(!st.t0){st.t0=now();st.act='hoeren';st.since=now();save()}showApp();SECS.forEach(s=>{if(st.lock[s])lockSec(s,'Dieser Teil ist beendet.')});go(st.fin?'antworten':'hoeren',1);if(!st.fin)startAudio()}
$('#begin').onclick=begin;$('#reset').onclick=()=>{if(confirm('Test zurücksetzen?')){try{localStorage.removeItem(SK)}catch(e){}location.reload()}};
if(st.fin){showApp();SECS.forEach(s=>lockSec(s,'Die Prüfung ist abgegeben. Änderungen sind nicht mehr möglich.'));st.h=score('h');st.l=score('l');render();go('antworten',1)}
else if(st.t0){$('#begin').textContent='Prüfung fortsetzen';$('#reset').hidden=false}
})();
"""

INDEX_JS = r"""
(function(){const L=document.getElementById('list');let done=0;const today=new Date();const S={h:[],l:[],s:[],p:[]};
const pill=(txt,cls)=>'<span class="pill '+cls+'">'+txt+'</span>';const LV=['A1','A2','B1'];
MOCKS.forEach(m=>{let st={};try{st=JSON.parse(localStorage.getItem('dtz:'+m.n)||'{}')}catch(e){}
let marks;if(st.fin){S.h.push(st.h/20);S.l.push(st.l/25);if(st.s!==undefined)S.s.push((+st.s+1)/3);if(st.p!==undefined)S.p.push((+st.p+1)/3);const hl=st.h+st.l;
marks=pill('Hören '+st.h+'/20',st.h>=15?'b1':st.h>=9?'a2':'lo')+pill('Lesen '+st.l+'/25',st.l>=18?'b1':st.l>=11?'a2':'lo')+pill('Σ '+hl+'/45',hl>=33?'b1':hl>=20?'a2':'lo')+pill('Schreiben '+(st.s!==undefined?LV[st.s]:'offen'),st.s==='2'?'b1':st.s==='1'?'a2':st.s==='0'?'lo':'')+pill('Sprechen '+(st.p!==undefined?LV[st.p]:'offen'),st.p==='2'?'b1':st.p==='1'?'a2':st.p==='0'?'lo':'');if(st.done)done++}
else marks=st.t0?pill('begonnen','a2'):pill('offen','');
const a=document.createElement('a');a.className='day';const d0=new Date(2026,10,12+m.n);if(d0.toDateString()===today.toDateString())a.className+=' today';a.href=m.f+'/';
a.innerHTML='<div class="n">'+m.n+'</div><div class="t"><b>Modelltest '+m.n+'</b><br><small>'+m.d+' · '+m.th+'</small></div><div class="marks">'+marks+'</div>'+(st.t0?'<button class="btn ghost small rst">Zurücksetzen</button>':'');
const rb=a.querySelector('.rst');if(rb)rb.onclick=e=>{e.preventDefault();e.stopPropagation();if(confirm('Modelltest '+m.n+' zurücksetzen? Alle Antworten, Zeiten und Ergebnisse dieses Tests werden gelöscht.')){try{localStorage.removeItem('dtz:'+m.n)}catch(x){}location.reload()}};L.appendChild(a)});
document.getElementById('bar').style.width=(done/MOCKS.length*100)+'%';document.getElementById('sum').textContent=done+' von '+MOCKS.length+' Modelltests komplett abgeschlossen.';
const avg=x=>x.length?x.reduce((a,b)=>a+b,0)/x.length:null;const R=[['Hören',avg(S.h)],['Lesen',avg(S.l)],['Schreiben',avg(S.s)],['Sprechen',avg(S.p)]];
const vals=R.filter(r=>r[1]!==null);const min=vals.length>1?Math.min(...vals.map(r=>r[1])):null;
document.getElementById('stats').innerHTML=R.map(r=>'<div class="stat'+(r[1]!==null&&r[1]===min&&vals.length>1?' weak':'')+'"><small>'+r[0]+'</small><b>'+(r[1]===null?'–':Math.round(r[1]*100)+' %')+'</b><div class="m"><i style="width:'+(r[1]===null?0:r[1]*100)+'%"></i></div></div>').join('');
const d=Math.ceil((new Date('2026-12-10T00:00:00')-today)/864e5);document.getElementById('count').textContent=d>0?'noch '+d+' Tage':'Prüfungstag';})();
"""


def main():
    sys.path.insert(0, ROOT)
    from content.extras import EXTRAS
    mocks = load_mocks()[:MAXN]
    for i, M in enumerate(mocks):
        M.update(EXTRAS[i + 1])
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
    main()
