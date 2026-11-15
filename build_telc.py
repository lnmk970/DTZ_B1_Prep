#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate docs/telc/b1/mock-test-NN/index.html from content/telc/mock-NN.json.

    python build_telc.py            # build all specs found in content/telc/
    python build_telc.py 8          # build only Modelltest 8
    python build_telc.py --check    # verify spec files and report problems, write nothing
"""
import os, re, sys, json, html, time
from telc_lib import task_html

ROOT = os.path.dirname(os.path.abspath(__file__))
CONTENT = os.path.join(ROOT, 'content', 'telc')
OUT = os.environ.get('TELC_OUT') or os.path.join(ROOT, 'docs', 'telc', 'b1')
TEMPLATE = os.path.join(ROOT, 'templates', 'telc_page.html')

def plain(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s))

def tasks_html(tasks, start_num):
    out, num = [], start_num
    for i, t in enumerate(tasks):
        h, num = task_html(t, i, num, None); out.append(h)
    return ''.join(out), num

def kind(it):
    return 'rf' if it.get('tf') else ('mt' if 'letters' in it else 'mc')

def make_meta(sp):
    key, ex, tk, tt = {}, {}, {'lesen': [], 'hoeren': []}, {'lesen': [], 'hoeren': []}
    num = 1
    for part in ('lesen', 'hoeren'):
        for t in sp[part]:
            ids = []
            for pos, it in enumerate(t['items']):
                key[it['id']] = it['key']
                ex[it['id']] = {'n': num, 't': kind(it), 'q': ('Lücke %d' % (pos + 1)) if re.fullmatch(r'Lücke \d+', it['q']) else it['q'], 'why': it['why'], 'tit': t['title']}
                if 'opts' in it: ex[it['id']]['ot'] = it['opts']
                ids.append(it['id']); num += 1
            tk[part].append(ids); tt[part].append(t['title'])
    # key order in meta: lesen l*, s*, then h* (same order as the pages)
    w = sp['schreiben']
    wsit = plain(w['situation'])
    return {'n': sp['n'], 'key': key, 'ex': ex, 'tk': tk, 'tt': tt,
            'wtask': wsit + '\nLeitpunkte: ' + '; '.join(w['points']) + '\n' + w['len'],
            'kw': w['kw'], 'rg': w['rg'], 'wl': w['points'], 'wsit': wsit,
            'wtitle': w['title'], 'theme': sp['theme'], 'wlen': w['len'],
            'sp': [{'t': p['title'], 'x': plain(p['text'])} for p in sp['sprechen']]}

def hoertexte_html(groups):
    out = []
    for g in groups:
        out.append('<h4>%s</h4>' % g['title'])
        if 'html' in g: out.append(g['html'])
        else:
            for s, x in g['texts']:
                out.append('<details><summary>%s</summary><div class="text">%s</div></details>' % (s, x))
    return ''.join(out) + '</div><div class="actions endacts"><button class="btn ghost" id="redo" type="button">Prüfung wiederholen</button><a href="../">Zur Übersicht</a><a href="../../../">Hauptseite</a></div></section>'

def validate(sp):
    """Return a list of problems in a Modelltest spec (empty list = OK)."""
    e = []
    ids, nums = set(), 0
    for part, want in (('lesen', 40), ('hoeren', 20)):
        n = 0
        for t in sp.get(part, []):
            for it in t['items']:
                n += 1
                if it['id'] in ids: e.append('duplicate id ' + it['id'])
                ids.add(it['id'])
                if not it.get('why'): e.append('missing explanation (why) for ' + it['id'])
                if 'key' not in it: e.append('missing key for ' + it['id']); continue
                allowed = ('rf' if it.get('tf') else None)
                if it.get('tf') and it['key'] not in ('r', 'f'): e.append('%s: key must be r or f' % it['id'])
                if 'opts' in it and it['key'] not in 'abcdefghijklmnopqrstuvwxyz'[:len(it['opts'])]: e.append('%s: key not among options' % it['id'])
                if 'letters' in it and it['key'] not in it['letters']: e.append('%s: key not among letters' % it['id'])
        if n != want: e.append('%s: %d items (expected %d)' % (part, n, want))
    w = sp.get('schreiben', {})
    if len(w.get('points', [])) != 4: e.append('schreiben: need exactly 4 Leitpunkte')
    if len(w.get('kw', [])) != 4: e.append('schreiben: need exactly 4 kw regexes (one per Leitpunkt)')
    for r in w.get('kw', []):
        try: re.compile(r)
        except re.error as x: e.append('bad kw regex %r: %s' % (r, x))
    if w.get('rg') not in ('du', 'sie'): e.append('schreiben.rg must be "du" or "sie"')
    if len(sp.get('sprechen', [])) != 3: e.append('sprechen: need 3 parts')
    elif 'Besprechen Sie:' not in sp['sprechen'][2]['text']: e.append('sprechen Teil 3 text must contain "Besprechen Sie:" followed by points separated by " · "')
    if not sp.get('audio'): e.append('audio: missing (list of voice segments for audio.json)')
    return e

def render(sp, build):
    t = open(TEMPLATE, encoding='utf8').read()
    lesen, nxt = tasks_html(sp['lesen'], 1)
    hoeren, _ = tasks_html(sp['hoeren'], nxt)
    w, m = sp['schreiben'], sp['model']
    rep = {'N': str(sp['n']), 'THEME': sp['theme'], 'LESEN': lesen, 'HOEREN': hoeren,
           'W_TITLE': w['title'], 'W_SIT': w['situation'],
           'W_POINTS': ''.join('<li>%s</li>' % p for p in w['points']), 'W_LEN': w['len'],
           'M_LETTER': m['letter'], 'M_CHECK': ''.join('<li>%s</li>' % p for p in m['check']), 'M_SPEAK': m['speak'],
           'HOERTEXTE': hoertexte_html(sp['hoertexte']),
           'META': json.dumps(make_meta(sp), ensure_ascii=False), 'BUILD': str(build)}
    for i, p in enumerate(sp['sprechen'], 1):
        rep['SP%d_T' % i] = p['title']; rep['SP%d_X' % i] = p['text']
    return re.sub(r'\{\{(\w+)\}\}', lambda mo: rep[mo.group(1)], t)

def update_index(specs, build):
    """Refresh the Modelltest list (MOCKS) and cache-busting numbers in docs/telc/b1/index.html."""
    p = os.path.join(OUT, 'index.html')
    if not os.path.exists(p): return
    h = open(p, encoding='utf8').read()
    mocks = [{'n': sp['n'], 'f': 'mock-test-%02d' % sp['n'], 'th': sp['theme']} for sp in specs]
    h = re.sub(r'const MOCKS=\[.*?\];', lambda m: 'const MOCKS=' + json.dumps(mocks, ensure_ascii=False) + ';', h, count=1, flags=re.S)
    h = re.sub(r'\?v=\d+', '?v=%d' % build, h)
    open(p, 'w', encoding='utf8', newline='').write(h)

def main(argv):
    only = [int(a) for a in argv if a.isdigit()]
    build = int(time.time())
    files = sorted(f for f in os.listdir(CONTENT) if re.match(r'mock-\d+\.json$', f))
    specs = []
    for f in files:
        n = int(re.search(r'\d+', f).group())
        sp = json.load(open(os.path.join(CONTENT, f), encoding='utf8'))
        specs.append(sp)
        if only and n not in only: continue
        problems = validate(sp)
        if problems:
            print('Modelltest %d: PROBLEMS' % n); [print('  -', x) for x in problems]; sys.exit(1)
        page = render(sp, build)
        if '--check' in argv: print('ok', f, len(page)); continue
        d = os.path.join(OUT, 'mock-test-%02d' % n); os.makedirs(d, exist_ok=True)
        open(os.path.join(d, 'index.html'), 'w', encoding='utf8', newline='').write(page)
        if sp.get('audio'):
            open(os.path.join(d, 'audio.json'), 'w', encoding='utf8', newline='').write(json.dumps({'hoeren.mp3': sp['audio']}, ensure_ascii=False, indent=1))
        print('wrote', d)
    if '--check' not in argv: update_index(specs, build)

if __name__ == '__main__':
    main(sys.argv[1:])
