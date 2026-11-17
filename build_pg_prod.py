import glob,json,re
from bs4 import BeautifulSoup
def clean(h):
    for img in h.select('img'):
        img.replace_with(BeautifulSoup('<div class="ph">'+(img.get('alt') or '')+'</div>','lxml').div)
    for t in h.select('button,textarea,[hidden],.sp-prep'):t.decompose()
    return h.decode_contents()
for ex,pat in [('dtz','docs/dtz/b1/mock-test-*/index.html'),('telc','docs/telc/b1/mock-test-*/index.html')]:
    S=[];P=[]
    for f in sorted(glob.glob(pat)):
        n=int(re.search(r'mock-test-(\d+)',f).group(1));s=BeautifulSoup(open(f).read(),'lxml')
        sc=s.select_one('#schreiben')
        if sc:
            if ex=='dtz':
                for k in 'AB':
                    w=sc.select_one('#w'+k)
                    if w:S.append({'id':f'{n}:s{k}','test':n,'title':'Aufgabe '+k,'html':clean(w),'words':[80,100]})
            else:
                for i,t in enumerate(sc.select('.task')):
                    l=t.select_one('.pane.left,.pane')
                    h=l.select_one('h4');ttl=h.get_text(strip=True) if h else 'Schreiben'
                    if h:h.decompose()
                    for x in l.select('p.hint'):x.decompose()
                    S.append({'id':f'{n}:s{i}','test':n,'title':ttl,'html':clean(l),'words':[80,100]})
        sp=s.select_one('#sprechen')
        if sp:
            l=sp.select_one('.pane.left') or sp.select_one('.pane.wide')
            cur=None;parts=[]
            for el in l.children:
                if getattr(el,'name',None) in('h3','h4'):
                    cur={'t':el.get_text(strip=True),'h':''};parts.append(cur)
                elif cur is not None and getattr(el,'name',None):cur['h']+=str(el)
            for i,pt in enumerate(parts):
                m=re.match(r'Teil (\d)',pt['t'])
                if not m:continue
                P.append({'id':f'{n}:p{i}','test':n,'teil':int(m.group(1)),'title':pt['t'],'html':clean(BeautifulSoup(pt['h'],'lxml').body)})
    for k,v in(('schreiben',S),('sprechen',P)):
        json.dump({'exam':ex,'sec':k,'units':v},open(f'docs/playground/bank-{ex}-{k}.json','w'),ensure_ascii=False,separators=(',',':'))
        print(ex,k,len(v))
