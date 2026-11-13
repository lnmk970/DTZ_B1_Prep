# -*- coding: utf-8 -*-
"""Builds explanation data (evidence sentences, tips, grammar rules) for the answers section."""
import re

STOP = set("""der die das den dem des ein eine einen einem einer und oder aber nicht auch sich ist sind war wird werden wurde hat haben bei mit von für auf aus nach vor zum zur im am um an in zu ich du er sie es wir ihr mein dein sein ihre ihren ihrem wie was wer wo wann warum welche welcher welches man kann können muss müssen soll sollen dann noch schon nur sehr mal ja nein bitte wenn dass ob weil als so da dort hier diese dieser dieses diesen wegen über unter durch ohne gegen bis seit ab""".split())
UN = "null eins zwei drei vier fünf sechs sieben acht neun zehn elf zwölf dreizehn vierzehn fünfzehn sechzehn siebzehn achtzehn neunzehn".split()
TE = {2: "zwanzig", 3: "dreißig", 4: "vierzig", 5: "fünfzig", 6: "sechzig", 7: "siebzig", 8: "achtzig", 9: "neunzig"}


def n2w(n):
    if n < 20:
        return UN[n]
    if n < 100:
        t, u = divmod(n, 10)
        return TE[t] if u == 0 else ("ein" if u == 1 else UN[u]) + "und" + TE[t]
    if n < 1000:
        h, r = divmod(n, 100)
        return ("ein" if h == 1 else UN[h]) + "hundert" + (n2w(r) if r else "")
    return str(n)


def numw(s):
    return re.sub(r"\d+", lambda m: " " + n2w(int(m.group())) + " ", s)


def toks(s):
    s = numw(s.lower())
    return [w for w in re.findall(r"[a-zäöüß]{3,}", s) if w not in STOP]


def mt(a, b):
    p = min(5, len(a), len(b))
    return (a[:p] == b[:p]) if p >= 4 else a == b


def score(sent, key):
    return sum(1 for k in set(key) if any(mt(k, s) for s in sent))


def sents(text):
    parts = re.split(r"(?<=[.!?:])\s+|\n+", text)
    return [p.strip() for p in parts if p.strip()]


def best_sent(text, key, qtok):
    best, bs = "", 0.0
    for s in sents(text):
        t = toks(s)
        sc = score(t, key) + 0.3 * score(t, qtok)
        if sc > bs:
            best, bs = s, sc
    return best if bs >= 1 else ""


def evidence(text, q, opts):
    """best supporting sentence per option"""
    qt = toks(q)
    return [best_sent(text, toks(o), qt) for o in opts]


# ---------------- grammar rules for the cloze ----------------
CONJ = {
    "dass": "leitet einen Nebensatz ein, der sagt, WAS jemand denkt, hofft, sagt oder weiß (Ich hoffe, dass …). Das Verb steht am Ende.",
    "ob": "leitet eine indirekte Ja/Nein-Frage ein (Ich weiß nicht, ob …). Das Verb steht am Ende.",
    "wenn": "nennt eine Bedingung oder eine Wiederholung (Wenn …, dann …). Das Verb steht am Ende.",
    "weil": "nennt den GRUND und antwortet auf „Warum?“. Das Verb steht am Ende.",
    "damit": "nennt das ZIEL und antwortet auf „Wozu?“. Das Verb steht am Ende; oft hat der Nebensatz ein anderes Subjekt.",
    "obwohl": "nennt einen GEGENSATZ („trotzdem“). Das Verb steht am Ende.",
    "denn": "nennt einen Grund, hat aber Hauptsatz-Wortstellung (Verb an Position 2).",
    "aber": "drückt einen Gegensatz aus (Hauptsatz, Verb an Position 2).",
    "oder": "nennt eine Alternative zwischen zwei Möglichkeiten.",
    "und": "verbindet zwei gleichwertige Teile.",
    "sondern": "folgt auf eine Verneinung (nicht A, sondern B).",
}
PREP = {
    "nach": "Richtung zu Städten/Ländern (nach Berlin) und „danach“ in der Zeit; Dativ.",
    "in": "ein Ort/Raum (in der Stadt) oder „in zwei Wochen“.",
    "zu": "Richtung zu Personen/Institutionen (zum Arzt, zur Bank); Dativ.",
    "an": "Kontakt an einer Fläche (an der Wand) oder an Tagen (am Montag).",
    "auf": "auf einer Fläche (auf dem Tisch); auch „auf Antwort warten“.",
    "für": "Zweck oder Empfänger (für dich); Akkusativ.",
    "über": "Thema (über Politik sprechen); Akkusativ bei Thema.",
    "bei": "Ort bei Personen/Firmen (bei der Arbeit); Dativ.",
    "seit": "Beginn in der Vergangenheit bis heute (seit zwei Jahren); Dativ.",
    "bis": "Endpunkt (bis Freitag).",
    "ab": "Anfang in der Zukunft (ab Montag).",
    "am": "an + dem: Tage und Tageszeiten (am Montag, am Abend).",
    "im": "in + dem: Monate, Jahreszeiten, Räume (im Mai, im Büro).",
    "um": "genaue Uhrzeit (um acht Uhr).",
    "von": "Herkunft/Ausgangspunkt (von Montag bis Freitag); Dativ.",
    "mit": "Begleitung/Mittel (mit dem Bus); Dativ.",
    "aus": "Herkunft/Material (aus Indien); Dativ.",
    "vor": "zeitlich/örtlich davor (vor drei Tagen).",
}
ART = {
    "ein": "Nominativ (wer/was?) bei maskulin/neutrum oder Akkusativ bei neutrum",
    "einen": "Akkusativ maskulin (wen/was?): Ich suche einen Termin.",
    "eine": "feminin im Nominativ oder Akkusativ: eine Frage, ich habe eine Frage.",
    "einem": "Dativ maskulin/neutrum (wem?): mit einem Freund.",
    "einer": "Dativ feminin (wem?): mit einer Freundin.",
}
PRON = {
    "mich": "Akkusativ (wen?): Das freut mich. / Ich bedanke mich.",
    "mir": "Dativ (wem?): Das gefällt mir. / Hilf mir.",
    "dich": "du im Akkusativ (wen?): Ich rufe dich an.",
    "dir": "du im Dativ (wem?): Ich helfe dir.",
    "sich": "er/sie/es/Sie reflexiv: Er freut sich.",
    "uns": "wir im Akkusativ oder Dativ.",
}
MODAL = {
    "möchte": "ich/er/sie/es möchte",
    "möchten": "wir/sie (Plural)/Sie möchten",
    "möchtest": "du möchtest",
    "kann": "ich/er/sie/es kann",
    "können": "wir/sie/Sie können",
    "könnte": "Konjunktiv II: höfliche Bitte („Könnten Sie …?“)",
    "könnten": "Konjunktiv II Plural/Sie: höfliche Bitte",
    "muss": "ich/er/sie/es muss",
    "müssen": "wir/sie/Sie müssen",
}
VERBS = {
    "würde": "Konjunktiv II von werden: höfliche Bitte/Wunsch (Ich würde gern …).",
    "werde": "Futur oder Absicht: ich werde + Infinitiv.",
    "wurde": "Präteritum von werden: Passiv in der Vergangenheit (wurde bearbeitet).",
    "worden": "Partizip des Passivs im Perfekt (ist bearbeitet worden).",
    "werden": "Infinitiv/Plural von werden (sie werden bearbeitet).",
    "habe": "Hilfsverb haben (ich habe + Partizip II).",
    "bin": "Hilfsverb sein (ich bin + Partizip II bei Bewegung/Zustandswechsel).",
    "wäre": "Konjunktiv II von sein: höflicher Wunsch („Ich wäre dankbar …“).",
    "hätte": "Konjunktiv II von haben: höflicher Wunsch.",
    "danke": "ich danke Ihnen / ich danke im Voraus (Dativ der Person).",
    "bedanke": "ich bedanke mich (reflexiv) für …",
}
WORDS = {}
for d in (CONJ, PREP, ART, PRON, MODAL, VERBS):
    for k, v in d.items():
        WORDS.setdefault(k, (d, v))

CAT = {id(CONJ): "Konjunktion", id(PREP): "Präposition", id(ART): "Artikel", id(PRON): "Pronomen", id(MODAL): "Modalverb", id(VERBS): "Verbform"}


def gap_rule(ans, opts, sentence):
    kind = None
    for w in opts:
        if w in WORDS:
            kind = CAT[id(WORDS[w][0])]
            break
    a_txt = WORDS[ans][1] if ans in WORDS else None
    rule = f"„{ans}“ " + (a_txt if (a_txt and kind == "Konjunktion") else ("passt hier: " + a_txt if a_txt else "passt hier grammatisch und vom Sinn."))
    vs = []
    for w in opts:
        if w == ans:
            continue
        if w in WORDS:
            vs.append((w, WORDS[w][1]))
        else:
            vs.append((w, "passt hier nicht zu Endung oder Satzstellung."))
    tips = {
        "Konjunktion": "Merke: dass = WAS (Inhalt) · ob = JA/NEIN-Frage · weil = WARUM · damit = WOZU · obwohl = TROTZDEM · denn = Grund + Verb auf Position 2.",
        "Präposition": "Merke: Frage dich erst WOHIN/WO/WANN/WOFÜR, dann wähle die Präposition — viele sind fest mit dem Verb verbunden (warten auf, danken für, sich freuen über).",
        "Artikel": "Merke: Verb fragen — wer/was? = Nominativ · wen/was? = Akkusativ (einen!) · wem? = Dativ (einem!).",
        "Pronomen": "Merke: mich = wen? (Akkusativ) · mir = wem? (Dativ). Prüfe, ob das Verb Akkusativ oder Dativ verlangt.",
        "Modalverb": "Merke: Das Subjekt bestimmt die Endung: ich möchte · du möchtest · wir/Sie möchten.",
        "Verbform": "Merke: werde + Infinitiv (Zukunft) · wurde + Partizip II (Passiv) · würde + Infinitiv (höflich/Wunsch) · habe/bin + Partizip II (Perfekt).",
    }
    tip = tips.get(kind or "", "Merke: Lies den ganzen Satz. Prüfe Satzstellung (Verb am Ende?), Endung und Sinn. Setze jede Möglichkeit ein und lies laut.")
    return {"rule": rule, "vs": vs, "tip": tip, "kind": kind or "Grammatik"}


TIPS = {
    "h1": ("Lies die Frage VOR dem Hören und unterstreiche das Fragewort (Wann? Wo? Was? Wie viel?). Achte auf Zahlen, Zeiten und Korrekturen („leider“, „nicht … sondern“, „aber“): Die letzte Information gilt meistens.",
           "Frage zuerst, dann hören: Die Antwort ist oft eine neue Information nach „aber“ oder „leider“."),
    "h2": ("Im Radio kommen viele Details. Notiere beim Hören nur Zahl/Ort/Zeit, die zur Frage passt. Falsche Antworten nennen oft eine andere Zahl oder Person aus dem Text.",
           "Eine Frage – eine Information. Die Falle ist ein Detail, das auch im Text steht, aber zur falschen Frage gehört."),
    "h3": ("Bei Gesprächen: Wer sagt was? Notiere die Meinung der Person, nach der gefragt wird. Wenn jemand zuerst zustimmt und dann „aber“ sagt, gilt meist das Zweite.",
           "Personen auseinanderhalten: Die Frage nennt immer eine Person – nur ihre Aussagen zählen."),
    "h4": ("Lies alle Aussagen vorher. Pro Person suchst du ein Schlüsselwort (Wunsch, Problem, Erfahrung). Nicht jede Aussage passt – drei bleiben übrig.",
           "Schlüsselwörter statt Wort-für-Wort: Die Aussage umschreibt den Text mit anderen Wörtern."),
    "l1": ("Finde das Hauptthema der Situation (ein Wort) und suche die Rubrik, die dieses Thema enthält. Die anderen Rubriken passen thematisch nicht.",
           "Situation → Hauptthema → Rubrik. Nicht auf einzelne Wörter hereinfallen."),
    "l2": ("Lies zuerst die Situation und markiere: WAS wird gesucht, für WEN, WANN, zu welchem PREIS. Prüfe jede Anzeige darauf. Wenn ein wichtiger Punkt fehlt, passt sie nicht. Passt keine, wähle x.",
           "Alle Punkte der Situation müssen in der Anzeige stehen – sonst x."),
    "l3": ("Suche im Text das Schlüsselwort aus der Frage. Antwort steht meist im selben oder im nächsten Satz. Achte auf Verneinung, „nur“, „immer“, „nie“, Zahlen.",
           "Schlüsselwort in der Frage → gleiche Stelle im Text → Aussage vergleichen."),
    "l4": ("Richtig/falsch: Finde die Stelle zum Thema der Aussage und vergleiche Zahlen, Fristen und Personen genau. Eine einzige Abweichung macht die Aussage falsch.",
           "Ein Wort kann alles ändern: nur, immer, mindestens, innerhalb von."),
    "l5": ("Lies den ganzen Satz mit der Lücke und setze jede Möglichkeit ein. Prüfe Verbposition, Endung und Sinn – meist scheitern zwei Möglichkeiten sofort.",
           "Lücke → Satz lesen → drei Wörter einsetzen → nur eins passt."),
}


def l1_text(q, opts, a):
    return f"Hauptthema der Situation → Rubrik „{opts[a]}“. Die anderen Rubriken ({', '.join(o for i, o in enumerate(opts) if i != a)}) behandeln andere Themen."
