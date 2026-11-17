#!/usr/bin/env python3
"""Build the Playground question banks from the built mock-test pages and add per-Teil Hören audio manifests.

Run AFTER build.py and build_telc.py:   python3 build_playground.py
Writes: docs/playground/bank-<exam>-<section>.json  (exam: dtz|telc, section: hoeren|lesen)
Patches: docs/<exam>/b1/<test folder>/audio.json  (adds hoeren_t1.mp3 ... hoeren_tN.mp3, one per Hören Teil)
Then on the PC:  python gen_audio.py docs/dtz/b1  (and docs/telc/b1)   -> only the new files are created.
"""
import os, re, json, glob, sys
from bs4 import BeautifulSoup

ROOT = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(ROOT, 'docs')
OUT = os.path.join(DOCS, 'playground')
EXAMS = {'dtz': 'dtz/b1', 'telc': 'telc/b1'}
MARK = re.compile(r'^(Aufgabe|Teil) (\d|eins|zwei|drei|vier|fünf)\b')


def load(page):
    h = open(page, encoding='utf8').read()
    s = BeautifulSoup(h, 'lxml')
    meta = json.loads(s.find('script', id='meta').string)
    return s, meta


def split_audio(folder, n_teile):
    """Add hoeren_tN.mp3 entries to audio.json. Returns list of file names (or [] if the split does not match)."""
    p = os.path.join(folder, 'audio.json')
    if not os.path.exists(p):
        return []
    d = json.load(open(p, encoding='utf8'))
    base = {k: v for k, v in d.items() if not re.match(r'hoeren_t\d+\.mp3$', k)}
    segs = base.get('hoeren.mp3')
    if not segs:
        return []
    idx = [i for i, s in enumerate(segs) if MARK.match(s.get('t', '') or '')]
    if len(idx) != n_teile:
        print('  audio split skipped (%d markers, %d Teile): %s' % (len(idx), n_teile, os.path.basename(folder)))
        json.dump(base, open(p, 'w', encoding='utf8'), ensure_ascii=False)
        return []
    names = []
    idx.append(len(segs))
    for k in range(n_teile):
        name = 'hoeren_t%d.mp3' % (k + 1)
        base[name] = segs[idx[k]:idx[k + 1]]
        names.append(name)
    json.dump(base, open(p, 'w', encoding='utf8'), ensure_ascii=False)
    return names


def prefix(task, pfx):
    for el in task.find_all(True):
        if el.name == 'input' and el.get('name'):
            el['name'] = pfx + el['name']
        if el.get('data-q'):
            el['data-q'] = pfx + el['data-q']
        if el.get('id', '').startswith('i-'):
            el['id'] = 'i-' + pfx + el['id'][2:]
    for t in task.select('audio, button[data-next], button[data-prev], .tnav'):
        t.decompose()


def main():
    os.makedirs(OUT, exist_ok=True)
    for ex, rel in EXAMS.items():
        banks = {'hoeren': [], 'lesen': []}
        for page in sorted(glob.glob(os.path.join(DOCS, rel, 'mock-test-*', 'index.html'))):
            folder = os.path.dirname(page)
            s, meta = load(page)
            n = int(meta['n'])
            key = meta['key']
            exs = meta['ex']
            tk = meta['tk']
            for sec in ('hoeren', 'lesen'):
                sect = s.find('section', id=sec)
                if not sect:
                    continue
                tasks = sect.select('.task')
                groups = tk.get(sec, [])
                if len(tasks) != len(groups):
                    print('skip %s test %d %s: %d tasks vs %d groups' % (ex, n, sec, len(tasks), len(groups)))
                    continue
                audio = []
                if sec == 'hoeren':
                    audio = split_audio(folder, len(tasks))
                for ti, (task, qids) in enumerate(zip(tasks, groups)):
                    pfx = '%d:' % n
                    band = task.select_one('.tband')
                    title = band.select_one('b').get_text(' ', strip=True) if band and band.select_one('b') else ''
                    sub = band.select_one('span').get_text(' ', strip=True) if band and band.select_one('span') else ''
                    if band:
                        band.decompose()
                    prefix(task, pfx)
                    html = ''.join(str(c) for c in task.children)
                    kk, ee = {}, {}
                    for q in qids:
                        kk[pfx + q] = key[q]
                        e = exs.get(q, {})
                        o = {}
                        for f in ('q', 'ot', 'a', 'src', 'why', 'tit'):
                            if f in e:
                                o[f] = e[f]
                        ev = e.get('ev')
                        if ev:
                            o['ev'] = ev[0] if isinstance(ev, list) and len(set(ev)) == 1 else ev
                        ee[pfx + q] = o
                    banks[sec].append({
                        'id': '%s-%d-%s%d' % (ex, n, sec[0], ti + 1), 'test': n, 'sec': sec, 'teil': ti + 1,
                        'title': title, 'sub': sub, 'qids': [pfx + q for q in qids], 'key': kk, 'ex': ee, 'html': html,
                        'audio': ('%s/%s/%s' % (rel, os.path.basename(folder), audio[ti])) if audio else None,
                    })
        for sec, units in banks.items():
            p = os.path.join(OUT, 'bank-%s-%s.json' % (ex, sec))
            json.dump({'exam': ex, 'sec': sec, 'units': units}, open(p, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
            print('wrote %s: %d units, %d questions, %d KB' % (os.path.basename(p), len(units), sum(len(u['qids']) for u in units), os.path.getsize(p) // 1024))


if __name__ == '__main__':
    main()
