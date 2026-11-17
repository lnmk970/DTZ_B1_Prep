(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s),$$=(s,r)=>Array.from((r||document).querySelectorAll(s));
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const EXAMS={dtz:{name:'DTZ B1',def:'2026-12-10',mock:n=>'dtz:'+n,N:24,dir:'dtz/b1'},telc:{name:'telc B1',def:'2027-02-25',mock:n=>'telc:mt:'+n,N:12,dir:'telc/b1'}};
const SECS={hoeren:'Hören',lesen:'Lesen',schreiben:'Schreiben',sprechen:'Sprechen',grammatik:'Grammatik'};const PROD={schreiben:1,sprechen:1};const HOE=true;
const LS={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const DB=()=>{const d=LS.get('pg:v1',null)||{};d.ev=d.ev||[];d.rounds=d.rounds||[];return d};
const saveDB=d=>{if(d.ev.length>30000)d.ev=d.ev.slice(-30000);if(d.rounds.length>3000)d.rounds=d.rounds.slice(-3000);LS.set('pg:v1',d)};
const banks={};
async function bank(ex,sec){const k=ex+'-'+sec;if(!banks[k]){const r=await fetch('bank-'+k+'.json?v=1');if(!r.ok)throw new Error('bank');banks[k]=await r.json()}return banks[k]}
const dayKey=t=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const view=$('#view');let cur=null,activity={last:0,sec:0,timer:null};

/* ---------- router ---------- */
function route(){const h=(location.hash||'#ueben').slice(1).split('?');const v=h[0]||'ueben';const q=new URLSearchParams(h[1]||'');
 $$('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));stopTimer();
 if(v==='stats')renderStats();else if(v==='plan')renderPlan();else renderSetup(q)}
$$('#tabs button').forEach(b=>b.onclick=()=>{location.hash='#'+b.dataset.v});
window.addEventListener('hashchange',route);

/* ---------- activity timer (counts only while the page is visible and being used) ---------- */
function startTimer(){activity={last:Date.now(),sec:0,timer:null};const bump=()=>{activity.last=Date.now()};
 ['pointerdown','keydown','change','scroll','play'].forEach(e=>document.addEventListener(e,bump,true));
 activity.timer=setInterval(()=>{if(document.visibilityState==='visible'&&Date.now()-activity.last<120000)activity.sec++},1000)}
function stopTimer(){if(activity.timer){clearInterval(activity.timer);activity.timer=null}}

/* ---------- setup ---------- */
let sel={ex:'dtz',sec:'lesen',teil:'0',mode:'new'};
async function renderSetup(q){
 if(q&&q.get('ex')){sel.ex=q.get('ex')==='telc'?'telc':'dtz';sel.sec=['lesen','schreiben','sprechen','grammatik'].includes(q.get('sec'))?q.get('sec'):(HOE?'hoeren':'lesen');sel.teil=q.get('teil')||'0';sel.mode=q.get('mode')||'new';if(q.get('go')){history.replaceState(null,'','#ueben');return startRound(q.get('go')==='qids'?(q.get('ids')||'').split(','):null)}}
 if(sel.sec==='grammatik')return setupGram();
 let b;try{b=await bank(sel.ex,sel.sec)}catch(e){view.innerHTML='<div class="card empty">Die Aufgaben konnten nicht geladen werden. Bitte Seite neu laden.</div>';return}
 const teile={};b.units.forEach(u=>{if(u.teil&&!teile[u.teil])teile[u.teil]=u.title});
 const seg=(arr,key,fn)=>'<div class="seg">'+arr.map(a=>'<button data-k="'+key+'" data-v="'+a[0]+'"'+(a[2]?' disabled':'')+(String(sel[key])===String(a[0])?' class="on"':'')+'>'+esc(a[1])+'</button>').join('')+'</div>';
 const db=DB(),today=dayKey(Date.now());const tq=db.ev.filter(e=>dayKey(e[0])===today).length,tn=db.rounds.filter(r=>dayKey(r[0])===today).reduce((a,r)=>a+r[1],0);
 view.innerHTML='<div class="card"><h2>Neue Runde</h2>'
 +'<div class="grp"><label>Prüfung</label>'+seg([['dtz','DTZ B1'],['telc','telc B1']],'ex')+'</div>'
 +'<div class="grp"><label>Niveau</label>'+seg([['a1','A1 (bald)',1],['a2','A2 (bald)',1],['b1','B1']],'lv')+'</div>'
 +'<div class="grp"><label>Bereich</label>'+seg([['hoeren','Hören',!HOE],['lesen','Lesen'],['schreiben','Schreiben'],['sprechen','Sprechen'],['grammatik','Grammatik']],'sec')+'</div>'
 +'<div class="grp"><label>Teil</label>'+seg([['0','Alle Teile']].concat(Object.keys(teile).map(t=>[t,'Teil '+t])),'teil')+'<p class="mut" style="margin:6px 0 0">'+(sel.teil==='0'?'Gemischt aus verschiedenen Modelltests.':esc(teile[sel.teil]||''))+'</p></div>'
 +(PROD[sel.sec]?'':'<div class="grp"><label>Auswahl</label>'+seg([['new','Neue Fragen zuerst'],['wrong','Meine Fehler wiederholen'],['mix','Gemischt']],'mode')+'</div>')
 +'<div class="row"><button class="btn big" id="go">Runde starten (ca. 10 Fragen)</button><span class="mut">Heute: '+tq+' Fragen · '+Math.round(tn/60)+' Min.</span></div></div>'
 +'<div class="card"><h3>So funktioniert es</h3><p class="mut" style="margin:0">Kein Timer. Du beantwortest etwa 10 Fragen und siehst danach alle richtigen Antworten mit Erklärung. Bei Hören spielt jeder Teil seine eigene Audiodatei. Die Statistik zeigt deine Schwächen und wiederholte Fehler.</p></div>';
 $$('.seg button',view).forEach(bt=>bt.onclick=()=>{const k=bt.dataset.k;if(k==='lv')return;sel[k]=bt.dataset.v;if(k==='ex'||k==='sec')sel.teil='0';renderSetup()});
 $('#go').onclick=()=>startRound(null)}

/* ---------- round ---------- */
function stat(db){const m={};db.ev.forEach(e=>{const s=m[e[4]]||(m[e[4]]={n:0,w:0,last:null});s.n++;if(!e[5])s.w++;s.last=e[5]});return m}
function pickUnits(b,mode,teil,ids){
 let c=b.units.slice();const db=DB(),st=stat(db);
 if(ids){const set=new Set(ids);c=c.filter(u=>u.qids.some(q=>set.has(q)))}
 else{if(teil!=='0')c=c.filter(u=>String(u.teil)===teil);
  if(mode==='wrong'){const w=c.filter(u=>u.qids.some(q=>st[q]&&st[q].last===0));if(w.length)c=w}}
 const att=u=>u.qids.reduce((a,q)=>a+(st[q]?st[q].n:0),0)/u.qids.length;
 c.forEach(u=>u._r=Math.random());
 if(mode==='new'&&!ids)c.sort((a,b)=>att(a)-att(b)||a._r-b._r);else c.sort((a,b)=>a._r-b._r);
 const out=[];let n=0;for(const u of c){if(n>=10)break;if(n+u.qids.length>15&&n>0)continue;out.push(u);n+=u.qids.length}
 return out}
async function startRound(ids){
 if(sel.sec==='grammatik')return startGram();
 if(PROD[sel.sec])return startProd();
 const b=await bank(sel.ex,sel.sec);const units=pickUnits(b,sel.mode,sel.teil,ids);
 if(!units.length){view.innerHTML='<div class="card empty">Keine passenden Aufgaben gefunden.<br><a class="btn ghost" href="#ueben">Zurück</a></div>';return}
 cur={ex:sel.ex,sec:sel.sec,units,start:Date.now(),checked:false};startTimer();renderRound()}
function renderRound(){
 const total=cur.units.reduce((a,u)=>a+u.qids.length,0);
 view.innerHTML='<div class="bar"><span><b>'+EXAMS[cur.ex].name+' · '+SECS[cur.sec]+'</b> · <span id="cnt">0</span> / '+total+' beantwortet</span><div class="prog"><i id="pb" style="width:0"></i></div><button class="btn sm" id="chk" style="background:var(--gold);border-color:var(--gold);color:var(--ink)">Antworten prüfen</button></div><div id="units"></div>';
 const U=$('#units');
 cur.units.forEach(u=>{const d=document.createElement('section');d.className='pg-unit';d.id='u-'+u.id;
  d.innerHTML='<div class="uh"><b>'+esc(u.title)+' <span style="opacity:.7">· Modelltest '+u.test+'</span></b><span>'+esc(u.sub)+'</span>'
   +(u.sec==='hoeren'?(u.audio?'<audio controls preload="none" src="../'+u.audio+'"></audio><div class="anote" hidden>Audio für diesen Teil ist noch nicht verfügbar.</div>':'<div class="anote">Audio für diesen Teil ist noch nicht verfügbar.</div>'):'')+'</div>'+u.html;
  const a=$('audio',d);if(a)a.addEventListener('error',()=>{$('.anote',d).hidden=false;a.hidden=true});
  U.appendChild(d)});
 const upd=()=>{const n=cur.units.reduce((a,u)=>a+u.qids.filter(q=>$('input[name="'+q+'"]:checked',U)).length,0);$('#cnt').textContent=n;$('#pb').style.width=(n/total*100)+'%'};
 U.addEventListener('change',upd);
 $('#chk').onclick=()=>{const un=total-cur.units.reduce((a,u)=>a+u.qids.filter(q=>$('input[name="'+q+'"]:checked',U)).length,0);if(un&&!confirm(un+' Frage(n) sind noch offen und zählen als falsch. Trotzdem prüfen?'))return;checkRound()};
 window.scrollTo(0,0)}
function checkRound(){
 stopTimer();const U=$('#units'),db=DB(),now=Date.now();let ok=0,tot=0;const wrong=[];
 cur.units.forEach(u=>{const d=$('#u-'+CSS.escape(u.id),U);
  u.qids.forEach(q=>{tot++;const key=String(u.key[q]);const inp=$$('input[name="'+q+'"]',d);const ch=inp.find(i=>i.checked);const good=!!ch&&ch.value===key;if(good)ok++;else wrong.push(q);
   db.ev.push([now,cur.ex,cur.sec,u.teil,q,good?1:0]);
   inp.forEach(i=>{const lab=i.closest('label');i.disabled=true;if(i.value===key)lab.classList.add('is-correct');else if(i.checked)lab.classList.add('is-wrong')});
   const item=inp[0]&&inp[0].closest('.item');if(item){const e=u.ex[q]||{};let opt='';if(Array.isArray(e.ot)&&e.ot[+key]!==undefined)opt=e.ot[+key];
    let txt=e.why||e.ev||'';if(Array.isArray(txt))txt=txt[+key]||'';const w=document.createElement('div');w.className='why'+(good?'':' bad');
    w.innerHTML='<b>'+(good?'Richtig':(ch?'Falsch':'Nicht beantwortet'))+(opt?' · Richtig ist: '+esc(opt):' · Richtig ist: '+esc(key.toUpperCase()))+'</b>'+(txt?esc(txt):'')+(e.gap?'<div>'+esc(e.gap.rule)+'</div>'+(e.gap.vs&&e.gap.vs.length?'<ul style="margin:6px 0 0 18px;padding:0">'+e.gap.vs.map(v=>'<li><b>'+esc(v[0])+'</b>: '+esc(v[1])+'</li>').join('')+'</ul>':'')+(e.gap.tip?'<div class="mut" style="margin-top:6px">'+esc(e.gap.tip)+'</div>':''):'')+(!txt&&!e.gap&&e.tip?'<div class="mut">'+esc(e.tip)+'</div>':'')+(e.src?'<details><summary>'+(u.sec==='hoeren'?'Hörtext':'Text')+' anzeigen</summary>'+esc(e.src)+'</details>':'');
    item.querySelector('.qb').appendChild(w)}})});
 const dur=Math.min(activity.sec,3600);db.rounds.push([now,dur,tot,ok,cur.ex,cur.sec]);saveDB(db);cur.checked=true;cur.wrong=wrong;
 const pct=Math.round(ok/tot*100);const cls=pct>=75?'ok':pct>=50?'mid':'bad';
 const bar=$('.bar');bar.outerHTML='<div class="card"><div class="score '+cls+'"><div class="big">'+ok+' / '+tot+'</div><div><b>'+pct+' % richtig</b><div class="mut">'+(wrong.length?wrong.length+' Fehler – sie werden in der Statistik gezählt.':'Alles richtig!')+'</div></div></div>'
  +'<div class="row" style="margin-top:12px"><button class="btn" id="nx">Nächste Runde</button>'+(wrong.length?'<button class="btn ghost" id="rw">Nur Fehler wiederholen</button>':'')+'<a class="btn ghost" href="#stats">Statistik</a><a class="btn ghost" href="#ueben" id="bk">Auswahl ändern</a></div></div>';
 $('#nx').onclick=()=>startRound(null);const rw=$('#rw');if(rw)rw.onclick=()=>startRound(cur.wrong.slice());
 window.scrollTo(0,0)}



/* ---------- Grammatik ---------- */
let gb=null;async function gbank(){if(!gb){const r=await fetch('bank-grammatik.json?v=1');gb=await r.json()}return gb}
async function setupGram(){
 const b=await gbank();const db=DB();const m={};db.ev.filter(e=>e[1]==='gram').forEach(e=>{const s=m[e[3]]||(m[e[3]]={n:0,o:0});s.n++;if(e[5])s.o++});
 const seg=(arr,key)=>'<div class="seg">'+arr.map(a=>'<button data-k="'+key+'" data-v="'+a[0]+'"'+(String(sel[key])===String(a[0])?' class="on"':'')+'>'+esc(a[1])+'</button>').join('')+'</div>';
 const tp=sel.teil==='0'?null:b.topics.find(t=>t.id===sel.teil);
 view.innerHTML='<div class="card"><h2>Grammatik üben</h2><div class="grp"><label>Bereich</label>'+seg([['hoeren','Hören'],['lesen','Lesen'],['schreiben','Schreiben'],['sprechen','Sprechen'],['grammatik','Grammatik']],'sec')+'</div>'
 +'<div class="grp"><label>Thema</label>'+seg([['0','Alle Themen']].concat(b.topics.map(t=>[t.id,t.name+(m[t.id]?' · '+Math.round(m[t.id].o/m[t.id].n*100)+' %':'')])),'teil')+'</div>'
 +(tp?'<p class="mut" style="margin:0 0 10px">'+esc(tp.tip)+'</p>':'')
 +'<div class="row"><button class="btn big" id="go">Runde starten (10 Fragen)</button></div></div>';
 $$('.seg button',view).forEach(bt=>bt.onclick=()=>{const k=bt.dataset.k;sel[k]=bt.dataset.v;if(k==='sec')sel.teil='0';renderSetup()});
 $('#go').onclick=()=>startGram()}
async function startGram(){
 const b=await gbank();const db=DB();const st={};db.ev.filter(e=>e[1]==='gram').forEach(e=>{const s=st[e[4]]||(st[e[4]]={n:0,last:1});s.n++;s.last=e[5]});
 let items=[];b.topics.forEach(t=>{if(sel.teil==='0'||t.id===sel.teil)t.items.forEach(i=>items.push(Object.assign({topic:t.id,tname:t.name,tip:t.tip},i)))});
 items.forEach(i=>i._r=Math.random()+(st[i.id]?(st[i.id].last===0?-0.5:st[i.id].n):0));items.sort((a,c)=>a._r-c._r);items=items.slice(0,10);
 items.forEach(i=>{const o=[i.ok].concat(i.bad);for(let k=o.length-1;k>0;k--){const j=Math.floor(Math.random()*(k+1));[o[k],o[j]]=[o[j],o[k]]}i.o=o});
 cur={gram:true,items};startTimer();
 view.innerHTML='<div class="bar"><span><b>Grammatik</b> · <span id="cnt">0</span> / '+items.length+' beantwortet</span><div class="prog"><i id="pb" style="width:0"></i></div><button class="btn sm" id="chk" style="background:var(--gold);border-color:var(--gold);color:var(--ink)">Antworten prüfen</button></div><div id="units" class="pg-unit">'
 +items.map((it,n)=>'<div class="item"><span class="qn">'+(n+1)+'</span><div class="qb"><div class="q"><b>'+esc(it.q)+'</b> <small class="mut">'+esc(it.tname)+'</small></div><div class="opts row">'+it.o.map(o=>'<label class="opt"><input type="radio" name="g'+n+'" value="'+esc(o)+'"><span>'+esc(o)+'</span></label>').join('')+'</div></div></div>').join('')+'</div>';
 const U=$('#units');const upd=()=>{const n=items.filter((_,i)=>$('input[name="g'+i+'"]:checked',U)).length;$('#cnt').textContent=n;$('#pb').style.width=(n/items.length*100)+'%'};U.addEventListener('change',upd);
 $('#chk').onclick=()=>{const un=items.filter((_,i)=>!$('input[name="g'+i+'"]:checked',U)).length;if(un&&!confirm(un+' Frage(n) sind noch offen und zählen als falsch. Trotzdem prüfen?'))return;stopTimer();
  const now=Date.now(),d=DB();let ok=0;const wrong=[];
  items.forEach((it,i)=>{const inp=$$('input[name="g'+i+'"]',U),ch=inp.find(x=>x.checked),good=!!ch&&ch.value===it.ok;if(good)ok++;else wrong.push(it.id);d.ev.push([now,'gram','grammatik',it.topic,it.id,good?1:0]);
   inp.forEach(x=>{const l=x.closest('label');x.disabled=true;if(x.value===it.ok)l.classList.add('is-correct');else if(x.checked)l.classList.add('is-wrong')});
   const w=document.createElement('div');w.className='why'+(good?'':' bad');w.innerHTML='<b>'+(good?'Richtig':(ch?'Falsch':'Nicht beantwortet'))+' · Richtig ist: '+esc(it.ok)+'</b>'+esc(it.why)+'<div class="mut" style="margin-top:6px">'+esc(it.tip)+'</div>';inp[0].closest('.qb').appendChild(w)});
  d.rounds.push([now,Math.min(activity.sec,3600),items.length,ok,'gram','grammatik']);saveDB(d);
  const pct=Math.round(ok/items.length*100);$('.bar').outerHTML='<div class="card"><div class="score '+(pct>=75?'ok':pct>=50?'mid':'bad')+'"><div class="big">'+ok+' / '+items.length+'</div><div><b>'+pct+' % richtig</b></div></div><div class="row" style="margin-top:12px"><button class="btn" id="nx">Nächste Runde</button><a class="btn ghost" href="#stats">Statistik</a></div></div>';$('#nx').onclick=()=>startGram();window.scrollTo(0,0)};
 window.scrollTo(0,0)}

/* ---------- Schreiben & Sprechen ---------- */
const CHK={schreiben:['Anrede passt (Sehr geehrte Damen und Herren / Liebe …)','Alle Leitpunkte behandelt','Gruß am Ende (Mit freundlichen Grüßen / Viele Grüße) und Name','Sie/du passt zum Adressaten','Verb steht im Hauptsatz an Position 2, im Nebensatz am Ende','Mindestens zwei Sätze mit weil/dass/wenn','Text laut gelesen, Fehler korrigiert (Artikel, Endungen, Komma)'],
 sprechen:['Laut und ohne Notizen gesprochen','Alle Punkte der Aufgabe genannt','Mindestens ein Beispiel oder eine Begründung (weil …)','Verbindungswörter benutzt (und dann, außerdem, deshalb)','Ganze Sätze, keine langen Pausen','Zum Schluss kurz abgeschlossen / Frage gestellt']};
const PW=()=>LS.get('pg:pw',[]);
async function startProd(){
 const b=await bank(sel.ex,sel.sec);let c=b.units.slice();if(sel.sec==='sprechen'&&sel.teil!=='0')c=c.filter(u=>String(u.teil)===sel.teil);
 const done=new Set(PW().map(r=>r[3]));c.forEach(u=>u._r=Math.random()+(done.has(u.id)?1:0));c.sort((a,b)=>a._r-b._r);
 const u=c[0];if(!u){view.innerHTML='<div class="card empty">Keine Aufgabe gefunden.</div>';return}
 startTimer();const sec=sel.sec,ex=sel.ex,sk='pg:w:'+u.id;const saved=LS.get(sk,'');
 const items=Array.from(new DOMParser().parseFromString('<div>'+u.html+'</div>','text/html').querySelectorAll('li')).map(l=>l.textContent.trim());
 const ck=(sec==='schreiben'?items.map(t=>'Leitpunkt: '+t):[]).concat(CHK[sec]);
 view.innerHTML='<div class="bar"><span><b>'+EXAMS[ex].name+' · '+SECS[sec]+'</b> · Modelltest '+u.test+'</span><button class="btn sm ghost" id="skip">Andere Aufgabe</button></div><div class="pg-unit"><div class="uh"><b>'+esc(u.title)+'</b><span>Kein Timer.</span></div><div class="card" style="margin:0">'+u.html+'</div></div>'
 +'<div class="card"><h3>'+(sec==='schreiben'?'Dein Text':'Deine Notizen')+'</h3><textarea id="tx" spellcheck="false" style="width:100%;min-height:'+(sec==='schreiben'?'200':'90')+'px;font:inherit;padding:10px;border:1px solid var(--line,#d5deea);border-radius:10px" placeholder="'+(sec==='schreiben'?'Schreibe hier deinen Brief …':'Stichwörter (freiwillig) – sprich die Antwort danach laut.')+'">'+esc(saved)+'</textarea><div class="mut" id="wc">0 Wörter</div></div>'
 +'<div class="card"><h3>Selbstcheck</h3>'+ck.map((t,i)=>'<label class="task"><input type="checkbox" data-i="'+i+'"><span>'+esc(t)+'</span></label>').join('')
 +'<div class="row" style="margin-top:12px"><button class="btn" id="fin">Fertig – speichern</button>'+(sec==='schreiben'?'<button class="btn ghost" id="cp">Für Claude kopieren</button>':'')+'</div><p class="mut" id="res" style="margin:8px 0 0">'+(sec==='schreiben'?'Für eine echte Bewertung: Text kopieren und im Claude-Chat einfügen.':'')+'</p></div>';
 const tx=$('#tx'),wc=$('#wc');const cnt=()=>{const n=(tx.value.trim().match(/\S+/g)||[]).length;wc.textContent=n+' Wörter'+(sec==='schreiben'?' (Ziel: '+u.words[0]+'–'+u.words[1]+')':'');return n};cnt();
 tx.oninput=()=>{cnt();LS.set(sk,tx.value)};
 $('#skip').onclick=()=>{stopTimer();startProd()};
 const cp=$('#cp');if(cp)cp.onclick=()=>{const t=$('.pg-unit .card').innerText+'\n\nMein Text:\n'+tx.value+'\n\nBitte bewerte nach den '+EXAMS[ex].name+'-Kriterien.';(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>$('#res').textContent='Kopiert.',()=>{tx.select();$('#res').textContent='Bitte manuell kopieren.'})};
 $('#fin').onclick=()=>{stopTimer();const n=cnt(),ok=$$('input[type=checkbox]',view).filter(c=>c.checked).length,pct=Math.round(ok/ck.length*100);
  const pw=PW();pw.push([Date.now(),ex,sec,u.id,pct,n,Math.min(activity.sec,3600)]);LS.set('pg:pw',pw.slice(-2000));
  const db=DB();db.rounds.push([Date.now(),Math.min(activity.sec,3600),0,0,ex,sec]);saveDB(db);
  view.innerHTML='<div class="card"><div class="score '+(pct>=75?'ok':pct>=50?'mid':'bad')+'"><div class="big">'+pct+' %</div><div><b>Selbstcheck: '+ok+' von '+ck.length+'</b><div class="mut">'+(sec==='schreiben'?n+' Wörter':'')+'</div></div></div><div class="row" style="margin-top:12px"><button class="btn" id="nx">Nächste Aufgabe</button><a class="btn ghost" href="#stats">Statistik</a></div></div>';$('#nx').onclick=()=>startProd()};
 window.scrollTo(0,0)}

/* ---------- statistics ---------- */
function mockResults(ex,units){ // question id -> 1/0 from finished or partially answered mock tests (same prefixed ids)
 const out={};for(let n=1;n<=EXAMS[ex].N;n++){const st=LS.get(EXAMS[ex].mock(n),null);if(!st||!st.sel)continue;
  units.forEach(u=>{if(u.test!==n)return;u.qids.forEach(q=>{const loc=q.split(':')[1];const v=st.sel[loc];if(v!==undefined&&v!==null&&v!=='')out[q]=String(v)===String(u.key[q])?1:0})})}
 return out}
function bars(days){const mx=Math.max(1,...days.map(d=>d.n));return '<svg viewBox="0 0 '+days.length*22+' 70" width="100%" height="80" role="img" aria-label="Fragen pro Tag">'+days.map((d,i)=>{const h=d.n/mx*56,h2=d.ok/mx*56;return '<rect x="'+(i*22+3)+'" y="'+(60-h)+'" width="16" height="'+h+'" rx="3" fill="#e3b0aa"><title>'+d.label+': '+d.n+' Fragen, '+d.ok+' richtig</title></rect><rect x="'+(i*22+3)+'" y="'+(60-h2)+'" width="16" height="'+h2+'" rx="3" fill="#16a067"/><text x="'+(i*22+11)+'" y="69" font-size="7" text-anchor="middle" fill="#62728a">'+d.label.slice(0,2)+'</text>'}).join('')+'</svg>'}
let sx='dtz';let GN={};
async function renderStats(){
 view.innerHTML='<div class="empty">Lade …</div>';
 try{(await gbank()).topics.forEach(t=>GN[t.id]=t.name)}catch(e){}
 const ex=sx;const [bh,bl]=await Promise.all([bank(ex,'hoeren'),bank(ex,'lesen')]);const units=bh.units.concat(bl.units);
 const db=DB(),ev=db.ev.filter(e=>e[1]===ex),rounds=db.rounds.filter(r=>r[4]===ex);
 const mock=mockResults(ex,units);const qinfo={};units.forEach(u=>u.qids.forEach(q=>qinfo[q]={u:u}));
 const secTeil={};units.forEach(u=>{const k=u.sec+u.teil;if(!secTeil[k])secTeil[k]={sec:u.sec,teil:u.teil,title:u.title,qids:[]};secTeil[k].qids.push(...u.qids)});
 const tot=ev.length,okc=ev.filter(e=>e[5]).length,pct=tot?Math.round(okc/tot*100):0;
 const today=dayKey(Date.now());const tmin=Math.round(rounds.filter(r=>dayKey(r[0])===today).reduce((a,r)=>a+r[1],0)/60);
 const days=[];for(let i=13;i>=0;i--){const t=new Date();t.setDate(t.getDate()-i);const k=dayKey(t);const es=ev.filter(e=>dayKey(e[0])===k);days.push({n:es.length,ok:es.filter(e=>e[5]).length,label:['So','Mo','Di','Mi','Do','Fr','Sa'][t.getDay()]+t.getDate()})}
 const dset=new Set(db.rounds.map(r=>dayKey(r[0])));let streak=0;for(let i=0;;i++){const t=new Date();t.setDate(t.getDate()-i);if(dset.has(dayKey(t)))streak++;else if(i>0)break;else if(i===0)continue;else break}
 const mins7=days.map((d,i)=>0);const last=new Date();const wk=rounds.filter(r=>Date.now()-r[0]<7*864e5).reduce((a,r)=>a+r[1],0);
 // per Teil rows
 const rows=Object.values(secTeil).map(t=>{const e=ev.filter(x=>x[2]===t.sec&&String(x[3])===String(t.teil));const n=e.length,o=e.filter(x=>x[5]).length;
  const half=Math.floor(n/2),a=e.slice(0,Math.max(0,n-10)),b=e.slice(-10);const pa=a.length>=5?a.filter(x=>x[5]).length/a.length:null,pb=b.length?b.filter(x=>x[5]).length/b.length:null;
  const mk=t.qids.filter(q=>mock[q]!==undefined);const mo=mk.filter(q=>mock[q]).length;
  return {t,n,o,p:n?o/n:null,trend:(pa!==null&&pb!==null)?pb-pa:null,mn:mk.length,mp:mk.length?mo/mk.length:null}}).sort((a,b)=>a.t.sec.localeCompare(b.t.sec)||a.t.teil-b.t.teil);
 const weak=rows.filter(r=>r.n>=5).sort((a,b)=>a.p-b.p).slice(0,3);
 // repeated mistakes and mock comparison
 const byQ={};ev.forEach(e=>{const s=byQ[e[4]]||(byQ[e[4]]={n:0,w:0,last:1});s.n++;if(!e[5])s.w++;s.last=e[5]});
 const rep=Object.keys(byQ).filter(q=>byQ[q].w>=2);const stillWrong=Object.keys(byQ).filter(q=>byQ[q].last===0);
 const mrpw=Object.keys(byQ).filter(q=>mock[q]===1&&byQ[q].last===0),mwpr=Object.keys(byQ).filter(q=>mock[q]===0&&byQ[q].last===1),both=Object.keys(byQ).filter(q=>mock[q]===0&&byQ[q].last===0);
 const pctf=v=>v===null?'–':Math.round(v*100)+' %';
 const meter=v=>'<div class="meter '+(v===null?'':v<.5?'low':v<.75?'mid':'')+'"><i style="width:'+(v===null?0:Math.round(v*100))+'%"></i></div>';
 view.innerHTML='<div class="seg" style="margin-bottom:12px"><button data-e="dtz"'+(ex==='dtz'?' class="on"':'')+'>DTZ B1</button><button data-e="telc"'+(ex==='telc'?' class="on"':'')+'>telc B1</button><button disabled>A1/A2 (bald)</button></div>'
 +'<div class="stats"><div class="stat"><small>Fragen beantwortet</small><b>'+tot+'</b></div><div class="stat"><small>Davon richtig</small><b>'+okc+' · '+pct+' %</b></div><div class="stat"><small>Heute geübt</small><b>'+tmin+' Min.</b></div><div class="stat"><small>Letzte 7 Tage</small><b>'+Math.round(wk/60)+' Min.</b></div><div class="stat"><small>Serie (Tage)</small><b>'+streak+'</b></div></div>'
 +'<div class="card"><h2>Fragen pro Tag (14 Tage)</h2>'+bars(days)+'<p class="mut" style="margin:0">Grün = richtig, rot = falsch.</p></div>'
 +'<div class="card"><h2>Nach Prüfungsteil</h2>'+(tot?'':'<p class="mut">Noch keine Runde gespielt. Starte unter „Üben“.</p>')+'<table class="tbl"><tr><th>Teil</th><th class="n">Fragen</th><th class="n">Richtig</th><th>Quote</th><th class="n">Trend</th><th class="n">Modelltest</th></tr>'
 +rows.map(r=>'<tr><td>'+esc(SECS[r.t.sec])+' · '+esc(r.t.title.replace(/^.*?(\d)/,'Teil $1').slice(0,46))+'</td><td class="n">'+r.n+'</td><td class="n">'+r.o+'</td><td>'+meter(r.p)+'<small class="mut">'+pctf(r.p)+'</small></td><td class="n">'+(r.trend===null?'–':'<span class="'+(r.trend>=0?'up':'down')+'">'+(r.trend>=0?'▲':'▼')+' '+Math.abs(Math.round(r.trend*100))+'</span>')+'</td><td class="n">'+(r.mn?pctf(r.mp)+' <small class="mut">('+r.mn+')</small>':'–')+'</td></tr>').join('')+'</table><p class="mut" style="margin:8px 0 0">Trend = letzte 10 Antworten gegenüber davor (in Prozentpunkten). „Modelltest“ = deine Quote im Modelltest für denselben Teil (Anzahl Fragen).</p></div>'
 +(function(){const g=db.ev.filter(e=>e[1]==='gram');if(!g.length)return '';const m={};g.forEach(e=>{const s=m[e[3]]||(m[e[3]]={n:0,o:0});s.n++;if(e[5])s.o++});return '<div class="card"><h2>Grammatik</h2><table class="tbl"><tr><th>Thema</th><th class="n">Fragen</th><th>Quote</th></tr>'+Object.keys(m).map(k=>'<tr><td>'+esc(GN[k]||k)+'</td><td class="n">'+m[k].n+'</td><td>'+meter(m[k].o/m[k].n)+'<small class="mut">'+Math.round(m[k].o/m[k].n*100)+' %</small></td></tr>').join('')+'</table></div>'})()
 +(function(){const pw=PW().filter(r=>r[1]===ex);if(!pw.length)return '';const g=k=>{const a=pw.filter(r=>r[2]===k);return a.length?a.length+' Aufgaben · Selbstcheck Ø '+Math.round(a.reduce((x,r)=>x+r[4],0)/a.length)+' %':'–'};return '<div class="card"><h2>Schreiben und Sprechen</h2><div class="stats"><div class="stat"><small>Schreiben</small><b style="font-size:1rem">'+g('schreiben')+'</b></div><div class="stat"><small>Sprechen</small><b style="font-size:1rem">'+g('sprechen')+'</b></div></div></div>'})()
 +'<div class="card"><h2>Schwächen</h2>'+(weak.length?weak.map(r=>'<div class="row" style="justify-content:space-between;margin:6px 0"><span><b>'+esc(SECS[r.t.sec])+' Teil '+r.t.teil+'</b> – '+pctf(r.p)+' bei '+r.n+' Fragen</span><a class="btn sm ghost" href="#ueben?ex='+ex+'&sec='+r.t.sec+'&teil='+r.t.teil+'&mode=wrong&go=1">Üben</a></div>').join(''):'<p class="mut" style="margin:0">Sobald du mindestens 5 Fragen pro Teil beantwortet hast, siehst du hier deine drei schwächsten Teile.</p>')+'</div>'
 +'<div class="card"><h2>Wiederholte Fehler</h2><div class="stats"><div class="stat"><small>Mehrfach falsch</small><b>'+rep.length+'</b></div><div class="stat"><small>Aktuell noch falsch</small><b>'+stillWrong.length+'</b></div><div class="stat"><small>Im Modelltest richtig, hier falsch</small><b>'+mrpw.length+'</b></div><div class="stat"><small>Im Modelltest falsch, hier richtig</small><b>'+mwpr.length+'</b></div><div class="stat"><small>In beiden falsch</small><b>'+both.length+'</b></div></div>'
 +'<div class="row">'+[['Mehrfach falsch wiederholen',rep],['Noch falsche Fragen wiederholen',stillWrong],['Modelltest richtig – hier falsch',mrpw]].map((x,i)=>'<button class="btn ghost sm" data-r="'+i+'"'+(x[1].length?'':' disabled')+'>'+x[0]+' ('+x[1].length+')</button>').join('')+'</div>'
 +'<p class="mut" style="margin:8px 0 0">Der Vergleich mit dem Modelltest zählt nur Fragen, die du im Modelltest schon beantwortet hast (Hören und Lesen).</p></div>'
 +'<div class="card"><h3>Daten sichern</h3><p class="mut" style="margin:0 0 8px">Die Statistik liegt nur in diesem Browser. Auf der Hauptseite kannst du sie mit dem Fortschritt exportieren.</p></div>';
 $$('.seg button[data-e]',view).forEach(b=>b.onclick=()=>{sx=b.dataset.e;renderStats()});
 const lists=[rep,stillWrong,mrpw];$$('button[data-r]',view).forEach(b=>b.onclick=async()=>{sel.ex=ex;const ids=lists[+b.dataset.r];const qs=new Set(ids);const hq=HOE&&bh.units.some(u=>u.qids.some(q=>qs.has(q)));sel.sec=hq?'hoeren':'lesen';sel.teil='0';sel.mode='mix';
  const secIds=ids.filter(q=>(sel.sec==='hoeren'?bh:bl).units.some(u=>u.qids.includes(q)));history.replaceState(null,'','#ueben');$$('#tabs button').forEach(b=>b.classList.toggle('on',b.dataset.v==='ueben'));await startRound(secIds)})}

/* ---------- study plan ---------- */
function nextMock(ex){for(let n=1;n<=EXAMS[ex].N;n++){const st=LS.get(EXAMS[ex].mock(n),null);if(!st||!st.fin)return n}return null}
function mockLink(ex,n){if(!n)return null;const pad=String(n).padStart(2,'0');const dtz=ex==='dtz'?'../dtz/b1/mock-test-'+pad+'-day-'+pad+'/':'../telc/b1/mock-test-'+pad+'/';return dtz}
let px='dtz';
function renderPlan(){
 const cfg=LS.get('pg:plan',{wd:1,we:2,share:{dtz:70,telc:30}});const ex=px,E=EXAMS[ex];
 const exam=(function(){try{return localStorage.getItem(ex+':exam')||E.def}catch(e){return E.def}})();
 const left=Math.ceil((new Date(exam+'T00:00:00')-new Date(new Date().toDateString()))/864e5);
 const otherLeft=Math.ceil((new Date((function(){try{return localStorage.getItem((ex==='dtz'?'telc':'dtz')+':exam')||EXAMS[ex==='dtz'?'telc':'dtz'].def}catch(e){return ''}})()+'T00:00:00')-new Date(new Date().toDateString()))/864e5);
 const sh=(cfg.share&&cfg.share[ex]!==undefined?cfg.share[ex]:(ex==='dtz'?70:30));
 view.innerHTML='<div class="seg" style="margin-bottom:12px"><button data-e="dtz"'+(ex==='dtz'?' class="on"':'')+'>DTZ B1</button><button data-e="telc"'+(ex==='telc'?' class="on"':'')+'>telc B1</button></div>'
 +'<div class="card"><h2>Lernplan für '+E.name+'</h2><p class="mut" style="margin:0 0 10px">Prüfung am '+new Date(exam+'T00:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+' · '+(left>0?'noch '+left+' Tage':left===0?'heute':'vorbei')+' (Datum änderst du auf der '+E.name.split(' ')[0]+'-Startseite).</p>'
 +'<div class="row"><label>Stunden an Wochentagen <input type="number" id="wd" min="0" max="8" step="0.5" value="'+cfg.wd+'"></label><label>Stunden am Wochenende <input type="number" id="we" min="0" max="12" step="0.5" value="'+cfg.we+'"></label><label>Anteil für diese Prüfung (%) <input type="number" id="sh" min="10" max="100" step="5" value="'+sh+'"></label></div>'
 +'<p class="mut" style="margin:8px 0 0">Wenn du beide Prüfungen vorbereitest, teile die Zeit auf. Nach dem DTZ-Termin kannst du den telc-Anteil auf 100 setzen.</p></div><div id="days"></div>';
 const save=()=>{cfg.wd=parseFloat($('#wd').value)||0;cfg.we=parseFloat($('#we').value)||0;cfg.share=cfg.share||{};cfg.share[ex]=parseFloat($('#sh').value)||100;LS.set('pg:plan',cfg);draw()};
 ['wd','we','sh'].forEach(id=>$('#'+id).onchange=save);$$('.seg button[data-e]',view).forEach(b=>b.onclick=()=>{px=b.dataset.e;renderPlan()});
 draw();
 function draw(){
  const box=$('#days');if(left<0){box.innerHTML='<div class="card empty">Der Prüfungstermin liegt in der Vergangenheit. Ändere das Datum auf der Startseite.</div>';return}
  const nm=nextMock(ex),ml=mockLink(ex,nm),pg=(sec,extra)=>'#ueben?ex='+ex+'&sec='+sec+'&go=1'+(extra||'');
  const h=(k,mins)=>Math.max(5,Math.round(mins/5)*5);
  const out=[];const days=Math.min(left,21);
  for(let i=0;i<=days;i++){const d=new Date();d.setDate(d.getDate()+i);const dl=left-i,wk=d.getDay(),we=(wk===0||wk===6);
   const budget=Math.round((we?cfg.we:cfg.wd)*60*(sh/100));const key='pg:plan:'+ex+':'+dayKey(d);const done=LS.get(key,{});
   let T=[];
   if(dl<0)break;
   if(dl===0)T=[['Prüfungstag: Ausweis, Anmeldung und Stifte bereit, früh losgehen. Nur kurz Redemittel lesen.',20]];
   else if(dl===1)T=[['Leichter Tag: 10 Fehler wiederholen und früh schlafen. Nichts Neues lernen.',Math.min(budget,30),pg('hoeren','&mode=wrong')]];
   else if(dl<=7){T=[['Fehler wiederholen (Hören)',.35,pg('hoeren','&mode=wrong')],['Fehler wiederholen (Lesen)',.35,pg('lesen','&mode=wrong')],['Schwächen aus der Statistik üben',.3,'#stats']]}
   else{const plan={1:[['Hören üben (Runde)',.6,pg('hoeren')],['Fehler wiederholen',.4,pg('hoeren','&mode=wrong')]],
     2:[['Lesen üben (Runde)',.6,pg('lesen')],['Wortschatz und Redemittel wiederholen',.4,null]],
     3:[['Schreiben: einen Brief aus dem nächsten Modelltest schreiben und prüfen',1,ml]],
     4:[['Sprechen: Teile laut üben und aufnehmen (nächster Modelltest)',1,ml]],
     5:[['Schwächen aus der Statistik üben',.6,'#stats'],['Fehler wiederholen',.4,pg('lesen','&mode=wrong')]],
     6:[[dl>14?'Kompletter Modelltest mit Zeitlimit (nächster offener Test)':'Ein Teil des Modelltests mit Zeitlimit',1,ml]],
     0:[['Modelltest auswerten: alle Fehler durchgehen',.6,'#stats'],['Lockere Wiederholung',.4,pg('hoeren','&mode=wrong')]]}[wk];T=plan}
   if(typeof T[0][1]==='number'&&T[0][1]<=1){T=T.map(t=>[t[0],h(0,budget*t[1]),t[2]])}
   if(!budget&&dl>1){T=[]}
   out.push('<div class="day'+(i===0?' today':'')+'"><h4><span>'+(i===0?'Heute':d.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'numeric'}))+'</span><small>'+(dl>0?'noch '+dl+' Tage':'Prüfung')+(budget?' · ca. '+budget+' Min.':' · frei')+'</small></h4>'
    +(T.length?T.map((t,j)=>'<label class="task'+(done[j]?' done':'')+'"><input type="checkbox" data-k="'+key+'" data-j="'+j+'"'+(done[j]?' checked':'')+'><span>'+esc(t[0])+' <small class="mut">('+t[1]+' Min.)</small>'+(t[2]?' <a href="'+t[2]+'">öffnen</a>':'')+'</span></label>').join(''):'<p class="mut" style="margin:0">Pausentag.</p>')+'</div>')}
  box.innerHTML=out.join('')+(left>21?'<p class="mut">Es werden die nächsten 3 Wochen gezeigt. In der letzten Woche vor der Prüfung wechselt der Plan zu Fehlern und Schwächen.</p>':'');
  $$('input[type=checkbox]',box).forEach(c=>c.onchange=()=>{const d=LS.get(c.dataset.k,{});d[c.dataset.j]=c.checked?1:0;LS.set(c.dataset.k,d);c.closest('.task').classList.toggle('done',c.checked)})}}
route();
})();
