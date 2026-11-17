import json,sys
sys.path.insert(0,'content')
from hoeren_telc_new import D
A="de-DE-AmalaNeural"
def h(x): return "<p>"+x+"</p>"
for n,d in D.items():
    p=f'content/telc/mock-{n:02d}.json'
    m=json.load(open(p,encoding='utf8'))
    H=m['hoeren']
    H[0]['title']="Hören · Teil 1: fünf Meinungen zu einem Thema (einmal hören)"
    H[0]['instr']=f"Sie hören fünf Personen, die ihre Meinung zum Thema „{d['th1']}“ sagen. Sie hören jeden Text nur einmal. Entscheiden Sie: richtig oder falsch. Lesen Sie zuerst die Aufgaben (im Audio: 30 Sekunden)."
    H[1]['title']="Hören · Teil 2: Interview (zweimal hören)"
    H[1]['instr']="Sie hören ein Interview. Sie hören den Text zweimal. Entscheiden Sie: richtig oder falsch. Lesen Sie zuerst die Aufgaben (im Audio: eine Minute)."
    H[1]['left']=None
    H[2]['title']="Hören · Teil 3: fünf kurze Ansagen (zweimal hören)"
    H[2]['instr']="Sie hören fünf kurze Ansagen oder Durchsagen. Sie hören jeden Text zweimal. Entscheiden Sie: richtig oder falsch. Lesen Sie zuerst die Aufgaben (im Audio: 30 Sekunden)."
    H[2]['left']=None
    for t,ss,off in ((H[0],d['s1'],1),(H[1],d['s2'],6),(H[2],d['s3'],16)):
        t['items']=[{"id":f"h{off+i}","q":q,"tf":True,"key":k,"why":w} for i,(q,k,w) in enumerate(ss)]
    m['hoertexte']=[
     {"title":"Hören Teil 1 · "+d['th1'],"texts":[[f"Sprecher {i+1}",h(t)] for i,(v,t) in enumerate(d['t1'])]},
     {"title":"Hören Teil 2 · "+d['iv_title'],"html":'<div class="text">'+"".join(h(t) for v,t in d['iv'])+"</div>"},
     {"title":"Hören Teil 3","texts":[[f"Ansage {i+1}",h(t)] for i,(v,t) in enumerate(d['t3'])]}]
    S=[]
    S+= [dict(v=A,t="Teil eins. Sie hören jetzt fünf Personen, die ihre Meinung zu einem Thema sagen. Sie hören jeden Text einmal. Lesen Sie zuerst die Aufgaben eins bis fünf. Dafür haben Sie dreißig Sekunden.",p=0.5,r="+0%"),dict(v=A,t="",p=30,r="+0%")]
    for i,(v,t) in enumerate(d['t1']): S.append(dict(v=v,t=t,p=7,r="-8%"))
    S.append(dict(v=A,t="Das ist das Ende des Teils.",p=3.0,r="+0%"))
    S+= [dict(v=A,t="Teil zwei. Sie hören jetzt ein Interview. Sie hören den Text zweimal. Lesen Sie zuerst die Aufgaben sechs bis fünfzehn. Dafür haben Sie eine Minute.",p=0.5,r="+0%"),dict(v=A,t="",p=60,r="+0%")]
    S+= [dict(v=v,t=t,p=0.6,r="-8%") for v,t in d['iv']]
    S.append(dict(v=A,t="Sie hören den Text noch einmal.",p=1.5,r="+0%"))
    S+= [dict(v=v,t=t,p=0.6,r="-8%") for v,t in d['iv']]
    S.append(dict(v=A,t="Das ist das Ende des Teils.",p=3.0,r="+0%"))
    S+= [dict(v=A,t="Teil drei. Sie hören jetzt fünf kurze Ansagen. Sie hören jeden Text zweimal. Lesen Sie zuerst die Aufgaben sechzehn bis zwanzig. Dafür haben Sie dreißig Sekunden.",p=0.5,r="+0%"),dict(v=A,t="",p=30,r="+0%")]
    for v,t in d['t3']:
        S+= [dict(v=v,t=t,p=2,r="-8%"),dict(v=A,t="Sie hören den Text noch einmal.",p=1,r="+0%"),dict(v=v,t=t,p=7,r="-8%")]
    S.append(dict(v=A,t="Ende des Hörverstehens.",p=0.5,r="+0%"))
    m['audio']=S
    json.dump(m,open(p,'w',encoding='utf8'),ensure_ascii=False,indent=1)
    ids=[i['id'] for t in H for i in t['items']]; assert ids==[f"h{i}" for i in range(1,21)]
print('ok')
