# -*- coding: utf-8 -*-
"""Shared helpers: render a telc Modelltest page from a spec dict, and extract a spec from a page."""
import re, json, html as H

def esc(s): return s  # specs hold ready-made HTML snippets (already escaped where needed)

NAV = '<div class="tnav"><div><button class="btn ghost small" data-prev type="button">Zurück</button></div><div class="mid"><span class="saved"></span></div><div><button class="btn small" data-next type="button">Weiter</button></div></div>'

def opt(name, v, k, t=None):
    return ('<label class="opt"><input type="radio" name="%s" value="%s"><span class="k">%s</span>%s</label>'
            % (name, v, k, ('<span>%s</span>' % t) if t is not None else ''))

def item_html(it, num):
    iid = it['id']
    if it.get('tf'):
        o = ''.join([opt(iid, 'r', 'R', 'Richtig'), opt(iid, 'f', 'F', 'Falsch')]); row = ' row'
    elif 'letters' in it:
        o = ''.join(opt(iid, c, c) for c in it['letters']); row = ' row'
    else:
        o = ''.join(opt(iid, 'abcdefghijklmnopqrstuvwxyz'[i], 'abcdefghijklmnopqrstuvwxyz'[i], t) for i, t in enumerate(it['opts'])); row = ''
    return ('<div class="item" id="i-%s"><div class="qn">%d</div><div class="qb"><p class="q">%s</p><div class="opts%s">%s</div></div></div>'
            % (iid, num, it['q'], row, o))

def task_html(t, idx, num0, kind_cls):
    """returns (html, next_num)"""
    num = num0; items = []
    for it in t['items']:
        items.append(item_html(it, num)); num += 1
    left = ('<div class="pane left">%s</div>' % t['left']) if t.get('left') is not None else ''
    pane = '<div class="pane wide">' if not left else '<div class="pane">'
    body = 'two' if left else 'one'
    return ('<div class="task%s" data-i="%d"><div class="tband"><b>%s</b><span>%s</span></div><div class="tbody %s">%s%s%s</div></div>%s</div>'
            % (' on' if idx == 0 else '', idx, t['title'], t['instr'], body, left, pane, ''.join(items), NAV)), num
