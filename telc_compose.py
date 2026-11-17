# -*- coding: utf-8 -*-
"""Compose content/telc/mock-NN.json from compact definitions in content/telc_new/mNN.py (dict T). Pattern: content/patterns/TELC_B1_PATTERNS.md"""
import json, sys, os, importlib.util
ROOT = os.path.dirname(os.path.abspath(__file__))
A = "de-DE-AmalaNeural"
def h(x): return "<p>" + x + "</p>"
LET = "abcdefghijklmno"

def compose(n, T):
    L = []
    # Lesen Teil 1
    texts = "".join(f'<p><b>{i+1}</b>&nbsp; {t}</p>' for i, t in enumerate(T['l1']['texts']))
    heads = "<br>".join(f'<b>{LET[i]}</b>&nbsp; {x}' for i, x in enumerate(T['l1']['heads']))
    L.append(dict(title="Lesen · Teil 1: Überschriften zuordnen",
      instr="Lesen Sie die fünf Texte und die zehn Überschriften a bis j. Wählen Sie zu jedem Text die passende Überschrift. Fünf Überschriften bleiben übrig. Jede Überschrift passt nur einmal.",
      left=f'<div class="text">{texts}</div><div class="text"><b>Überschriften</b><br>{heads}</div>',
      items=[dict(id=f"l{i+1}", q=f"Text {i+1}", letters="abcdefghij", key=k, why=w) for i, (k, w) in enumerate(T['l1']['keys'])]))
    # Teil 2
    art = "".join(h(p) for p in T['l2']['paras'])
    L.append(dict(title="Lesen · Teil 2: Zeitungsartikel verstehen",
      instr="Lesen Sie den Text und die Aufgaben 1 bis 5. Wählen Sie bei jeder Aufgabe die richtige Lösung a, b oder c. Die Aufgaben folgen nicht der Reihenfolge im Text.",
      left=f'<div class="text">{art}</div>',
      items=[dict(id=f"l{6+i}", q=q, opts=(o.split('|') if isinstance(o,str) else o), key=k, why=w) for i, (q, o, k, w) in enumerate(T['l2']['qs'])]))
    # Teil 3
    ads = "".join(f'<p><b>{LET[i]}</b>&nbsp; {a}</p>' for i, a in enumerate(T['l3']['ads']))
    L.append(dict(title="Lesen · Teil 3: Anzeigen zuordnen",
      instr="Zehn Personen suchen etwas Bestimmtes. Lesen Sie die Situationen 1 bis 10 und die Anzeigen a bis l. Welche Anzeige passt zu welcher Situation? Sie können jede Anzeige nur einmal verwenden. Wenn keine Anzeige passt, wählen Sie x.",
      left=f'<div class="text">{ads}</div>',
      items=[dict(id=f"l{11+i}", q=q, letters="abcdefghijklx", key=k, why=w) for i, (q, k, w) in enumerate(T['sb1_l3'] if False else T['l3']['sits'])]))
    # Sprachbausteine 1
    L.append(dict(title="Sprachbausteine · Teil 1: Lücken im Brief (a, b oder c)",
      instr="Lesen Sie den Brief. Wählen Sie für jede Lücke das passende Wort a, b oder c.",
      left='<div class="text">' + T['sb1']['text'] + '</div>',
      items=[dict(id=f"s{i+1}", q=f"Lücke {21+i}", opts=o, key=k, why=w) for i, (o, k, w) in enumerate(T['sb1']['gaps'])]))
    box = " &nbsp;·&nbsp; ".join(f'<b>{LET[i]}</b> {x}' for i, x in enumerate(T['sb2']['box']))
    L.append(dict(title="Sprachbausteine · Teil 2: Lücken und Wortkasten (a bis o)",
      instr="Lesen Sie den Text. Wählen Sie für jede Lücke das passende Wort aus dem Kasten. Fünf Wörter bleiben übrig. Jedes Wort passt nur einmal.",
      left='<div class="text">' + T['sb2']['text'] + f'</div><div class="text"><b>Wortkasten</b><br>{box}</div>',
      items=[dict(id=f"s{11+i}", q=f"Lücke {31+i}", letters="abcdefghijklmno", key=k, why=w) for i, (k, w) in enumerate(T['sb2']['keys'])]))
    # Hören
    d = T['hoeren']
    H = [dict(title="Hören · Teil 1: fünf Meinungen zu einem Thema (einmal hören)",
              instr=f"Sie hören fünf Personen, die ihre Meinung zum Thema „{d['th1']}“ sagen. Sie hören jeden Text nur einmal. Entscheiden Sie: richtig oder falsch. Lesen Sie zuerst die Aufgaben (im Audio: 30 Sekunden).", left=None),
         dict(title="Hören · Teil 2: Interview (zweimal hören)", instr="Sie hören ein Interview. Sie hören den Text zweimal. Entscheiden Sie: richtig oder falsch. Lesen Sie zuerst die Aufgaben (im Audio: eine Minute).", left=None),
         dict(title="Hören · Teil 3: fünf kurze Ansagen (zweimal hören)", instr="Sie hören fünf kurze Ansagen oder Durchsagen. Sie hören jeden Text zweimal. Entscheiden Sie: richtig oder falsch. Lesen Sie zuerst die Aufgaben (im Audio: 30 Sekunden).", left=None)]
    for t, ss, off in ((H[0], d['s1'], 1), (H[1], d['s2'], 6), (H[2], d['s3'], 16)):
        t['items'] = [dict(id=f"h{off+i}", q=q, tf=True, key=k, why=w) for i, (q, k, w) in enumerate(ss)]
    hoertexte = [
      dict(title="Hören Teil 1 · " + d['th1'], texts=[[f"Sprecher {i+1}", h(t)] for i, (v, t) in enumerate(d['t1'])]),
      dict(title="Hören Teil 2 · " + d['iv_title'], html='<div class="text">' + "".join(h(t) for v, t in d['iv']) + "</div>"),
      dict(title="Hören Teil 3", texts=[[f"Ansage {i+1}", h(t)] for i, (v, t) in enumerate(d['t3'])])]
    S = [dict(v=A, t="Teil eins. Sie hören jetzt fünf Personen, die ihre Meinung zu einem Thema sagen. Sie hören jeden Text einmal. Lesen Sie zuerst die Aufgaben eins bis fünf. Dafür haben Sie dreißig Sekunden.", p=0.5, r="+0%"), dict(v=A, t="", p=30, r="+0%")]
    S += [dict(v=v, t=t, p=7, r="-8%") for v, t in d['t1']]
    S += [dict(v=A, t="Das ist das Ende des Teils.", p=3.0, r="+0%"),
          dict(v=A, t="Teil zwei. Sie hören jetzt ein Interview. Sie hören den Text zweimal. Lesen Sie zuerst die Aufgaben sechs bis fünfzehn. Dafür haben Sie eine Minute.", p=0.5, r="+0%"), dict(v=A, t="", p=60, r="+0%")]
    S += [dict(v=v, t=t, p=0.6, r="-8%") for v, t in d['iv']]
    S.append(dict(v=A, t="Sie hören den Text noch einmal.", p=1.5, r="+0%"))
    S += [dict(v=v, t=t, p=0.6, r="-8%") for v, t in d['iv']]
    S += [dict(v=A, t="Das ist das Ende des Teils.", p=3.0, r="+0%"),
          dict(v=A, t="Teil drei. Sie hören jetzt fünf kurze Ansagen. Sie hören jeden Text zweimal. Lesen Sie zuerst die Aufgaben sechzehn bis zwanzig. Dafür haben Sie dreißig Sekunden.", p=0.5, r="+0%"), dict(v=A, t="", p=30, r="+0%")]
    for v, t in d['t3']:
        S += [dict(v=v, t=t, p=2, r="-8%"), dict(v=A, t="Sie hören den Text noch einmal.", p=1, r="+0%"), dict(v=v, t=t, p=7, r="-8%")]
    S.append(dict(v=A, t="Ende des Hörverstehens.", p=0.5, r="+0%"))
    return dict(n=n, theme=T['theme'], lesen=L, hoeren=H, schreiben=T['schreiben'], sprechen=T['sprechen'], model=T['model'], hoertexte=hoertexte, audio=S)

if __name__ == "__main__":
    for p in sorted(os.listdir(os.path.join(ROOT, 'content', 'telc_new'))):
        if not (p.startswith('m') and p.endswith('.py') and p[1:3].isdigit()): continue
        sp = importlib.util.spec_from_file_location("t", os.path.join(ROOT, 'content', 'telc_new', p)); m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m)
        n = int(p[1:3]); out = compose(n, m.T)
        json.dump(out, open(os.path.join(ROOT, 'content', 'telc', f'mock-{n:02d}.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
        print('wrote mock', n)
