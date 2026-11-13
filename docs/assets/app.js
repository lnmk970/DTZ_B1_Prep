
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
const TIPS={"h1": ["Lies die Frage VOR dem Hören und unterstreiche das Fragewort (Wann? Wo? Was? Wie viel?). Achte auf Zahlen, Zeiten und Korrekturen („leider“, „nicht … sondern“, „aber“): Die letzte Information gilt meistens.", "Frage zuerst, dann hören: Die Antwort ist oft eine neue Information nach „aber“ oder „leider“."], "h2": ["Im Radio kommen viele Details. Notiere beim Hören nur Zahl/Ort/Zeit, die zur Frage passt. Falsche Antworten nennen oft eine andere Zahl oder Person aus dem Text.", "Eine Frage – eine Information. Die Falle ist ein Detail, das auch im Text steht, aber zur falschen Frage gehört."], "h3": ["Bei Gesprächen: Wer sagt was? Notiere die Meinung der Person, nach der gefragt wird. Wenn jemand zuerst zustimmt und dann „aber“ sagt, gilt meist das Zweite.", "Personen auseinanderhalten: Die Frage nennt immer eine Person – nur ihre Aussagen zählen."], "h4": ["Lies alle Aussagen vorher. Pro Person suchst du ein Schlüsselwort (Wunsch, Problem, Erfahrung). Nicht jede Aussage passt – drei bleiben übrig.", "Schlüsselwörter statt Wort-für-Wort: Die Aussage umschreibt den Text mit anderen Wörtern."], "l1": ["Finde das Hauptthema der Situation (ein Wort) und suche die Rubrik, die dieses Thema enthält. Die anderen Rubriken passen thematisch nicht.", "Situation → Hauptthema → Rubrik. Nicht auf einzelne Wörter hereinfallen."], "l2": ["Lies zuerst die Situation und markiere: WAS wird gesucht, für WEN, WANN, zu welchem PREIS. Prüfe jede Anzeige darauf. Wenn ein wichtiger Punkt fehlt, passt sie nicht. Passt keine, wähle x.", "Alle Punkte der Situation müssen in der Anzeige stehen – sonst x."], "l3": ["Suche im Text das Schlüsselwort aus der Frage. Antwort steht meist im selben oder im nächsten Satz. Achte auf Verneinung, „nur“, „immer“, „nie“, Zahlen.", "Schlüsselwort in der Frage → gleiche Stelle im Text → Aussage vergleichen."], "l4": ["Richtig/falsch: Finde die Stelle zum Thema der Aussage und vergleiche Zahlen, Fristen und Personen genau. Eine einzige Abweichung macht die Aussage falsch.", "Ein Wort kann alles ändern: nur, immer, mindestens, innerhalb von."], "l5": ["Lies den ganzen Satz mit der Lücke und setze jede Möglichkeit ein. Prüfe Verbposition, Endung und Sinn – meist scheitern zwei Möglichkeiten sofort.", "Lücke → Satz lesen → drei Wörter einsetzen → nur eins passt."]};
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
