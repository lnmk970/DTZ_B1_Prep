
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
function avail(s){if(!st.t0)return false;if(s==='hoeren')return !st.lock.hoeren||!!st.fin;if(s==='lesen'||s==='schreiben')return !!st.lock.hoeren;if(s==='sprechen')return !!(st.lock.hoeren&&st.lock.lesen&&st.lock.schreiben);return !!st.fin}
function updEnd(){const b=$('#endcur');const ok=!st.fin&&['hoeren','lesen','schreiben'].includes(cur)&&!st.lock[cur]&&(cur==='hoeren'||(st.began&&st.began[cur]));b.hidden=!ok;if(ok)b.textContent=LAB[cur]+' beenden'}
function tabs(){updEnd();$$('.sbtn').forEach(b=>{const s=b.dataset.t;b.disabled=st.fin?false:!avail(s);b.classList.toggle('on',s===cur);b.classList.toggle('end',!!st.lock[s]&&s!=='antworten')});
const h=$('#sidehint');h.textContent=st.fin?'Prüfung abgegeben.':!st.lock.hoeren?'Hören läuft. Die anderen Teile sind gesperrt, bis Hören beendet ist.':(!st.lock.lesen||!st.lock.schreiben)?'Lesen und Schreiben können Sie in beliebiger Reihenfolge bearbeiten. Sprechen folgt danach.':'Sprechen ist freigeschaltet.'}
$$('[data-begin]').forEach(b=>b.onclick=()=>{const k=b.dataset.begin;st.began=st.began||{};st.began[k]=1;save();go(k)});
/* navigation */
function leaveTask(sec){const i=st.cur[sec];if(i===undefined||!TK[sec])return;(TK[sec][i]||[]).forEach(k=>{st.vis[k]=1})}
function go(s,keep){if(rcur&&s!=='sprechen')recStop();st.where=s;if(s!=='antworten'&&!st.fin&&!avail(s))return;if(SECS.includes(cur)&&cur!==s)leaveTask(cur);cur=s;
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
if(s==='hoeren'){clearInterval(preT);preT=null;try{aud.pause()}catch(e){}$('#hdone').disabled=true}
save();tabs()}
function autoNext(from){if(from==='hoeren'){go('lesen')}else if(from==='lesen'){if(!st.lock.schreiben)go('schreiben');else if(avail('sprechen'))go('sprechen');else openFinish()}else if(from==='schreiben'){if(!st.lock.lesen)go('lesen');else if(avail('sprechen'))go('sprechen');else openFinish()}else openFinish()}
function endSec(s,msg){lockSec(s,msg);toast(LAB[s]+' beendet, gespeichert');autoNext(s)}
$$('[data-endsec]').forEach(b=>b.onclick=()=>{const s=b.dataset.endsec;if(confirm(LAB[s]+' jetzt beenden? Danach können Sie diesen Teil nicht mehr ändern.'))endSec(s,'Dieser Teil wurde beendet. Ihre Antworten sind gespeichert.')});
/* timers */
function tick(){if(!st.t0)return;
if(!st.fin){SECS.forEach(s=>{if(!st.lock[s]&&st.act===s&&rem(s)<=0){endSec(s,'Die Zeit für diesen Teil ist abgelaufen. Ihre Antworten wurden gespeichert.')}})}
const bc=$('.bc');if(st.fin){$('#tm-l').textContent='Prüfung abgegeben';$('#tm-main').textContent='–';$('.tm.sub').style.visibility='hidden';bc.classList.remove('low');return}
const open=WR.filter(s=>!st.lock[s]);let main,lab;if(!st.lock.hoeren){main=rem('hoeren');lab='Hören'}else if(open.length){main=open.reduce((a,s)=>a+rem(s),0);lab='Schriftliche Prüfung'}else{main=rem('sprechen');lab='Sprechen'}
$('#tm-l').textContent=lab;$('#tm-main').textContent=fmt(main);
const a=st.act&&!st.lock[st.act]?st.act:null;const sub=$('.tm.sub');
if(a&&open.length&&st.lock.hoeren){$('#tm-sl').textContent=LAB[a];$('#tm-sub').textContent=fmt(rem(a));sub.style.visibility='visible'}else sub.style.visibility='hidden';
bc.classList.toggle('low',(a?rem(a):main)<5*M60)}
setInterval(tick,1000);
/* inputs */
$$('input[type=radio]').forEach(r=>{const n=r.name;if(n==='s'||n==='p'){if(st[n]===r.value)r.checked=true}else if(n==='wt'){if((st.wt||'A')===r.value)r.checked=true}else if(st.sel[n]===r.value)r.checked=true;
r.addEventListener('change',()=>{if(n==='s'||n==='p'){st[n]=r.value;verdict()}else if(n==='wt'){st.wt=r.value;wt()}else st.sel[n]=r.value;save();pal()})});
function wt(){const w=st.wt||'A';$('#wA').classList.toggle('on',w==='A');$('#wB').classList.toggle('on',w==='B')}wt();
const ta=$('#brief'),sp=$('#sprech');if(st.brief)ta.value=st.brief;if(st.sprech)sp.value=st.sprech;
ta.oninput=()=>{st.brief=ta.value;const n=(ta.value.trim().match(/\S+/g)||[]).length;$('#wc').textContent=n+' Wörter';pwc();save()};ta.oninput();sp.oninput=()=>{st.sprech=sp.value;save()};
$('#copy').onclick=()=>{st.brief=ta.value;wsCopy($('#copy'))};
document.addEventListener('click',e=>{const b=e.target.closest('[data-save]');if(!b)return;save();const t=new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});$$('.saved').forEach(x=>x.textContent='');const sv=b.parentNode.querySelector('.saved');if(sv)sv.textContent='Gespeichert um '+t;toast('Gespeichert')});
/* audio */
const aud=$('#aud');let ended=false;
function aStat(t){$('#astat').textContent=t}
aud.addEventListener('timeupdate',()=>{if(aud.duration)$('#aprog').style.width=(aud.currentTime/aud.duration*100)+'%';if(!ended&&Math.abs(aud.currentTime-(st.apos||0))>2){st.apos=aud.currentTime;save()}});
aud.addEventListener('loadedmetadata',()=>{if(st.apos&&!st.aend)try{aud.currentTime=st.apos}catch(e){}});
aud.addEventListener('playing',()=>{aStat('Wiedergabe läuft …');$('#aplay').hidden=true;$('#noaudio').style.display='none'});
aud.addEventListener('ended',()=>{ended=true;st.aend=true;save();aStat('Wiedergabe beendet');$('#hdone').disabled=false});
aud.addEventListener('error',()=>{$('#noaudio').style.display='block';aStat('Audio nicht verfügbar');$('#hdone').disabled=false});
$('#aplay').onclick=()=>{aud.play().catch(()=>{})};
$('#endcur').onclick=()=>{const s=cur;const m=s==='hoeren'?'Hören jetzt beenden? Der Hörtext kann nicht noch einmal abgespielt werden.':LAB[s]+' jetzt beenden? Danach können Sie diesen Teil nicht mehr ändern.';if(confirm(m))endSec(s,LAB[s]+' ist beendet. Ihre Antworten sind gespeichert.')};
$('#hdone').onclick=()=>{if(confirm('Hören jetzt beenden?'))endSec('hoeren','Hören ist beendet. Ihre Antworten sind gespeichert.')};
let preT=null,preLeft=0;
function preStart(sec){preLeft=sec;clearInterval(preT);const up=()=>{aStat('Der Hörtext startet in '+preLeft+' Sekunden. Lesen Sie jetzt die Aufgaben.')};up();preT=setInterval(()=>{preLeft--;if(preLeft<=0){clearInterval(preT);preT=null;st.preLeft=0;save();startAudio()}else up()},1000)}
function startAudio(){if(st.lock.hoeren)return;if(st.aend){aStat('Wiedergabe beendet');$('#hdone').disabled=false;return}aStat('Wiedergabe startet …');aud.play().catch(()=>{aStat('Bitte „Wiedergabe starten“ klicken');$('#aplay').hidden=false})}
/* finish */
function counts(){const o={};['h','l'].forEach(p=>{const ks=Object.keys(KEY).filter(k=>k[0]===p);o[p]=[ks.filter(k=>st.sel[k]!==undefined).length,ks.length]});return o}
function openFinish(){const c=counts();const rows0=[['hoeren','Hören',c.h[0]+' von '+c.h[1]+' beantwortet'],['lesen','Lesen',c.l[0]+' von '+c.l[1]+' beantwortet'],['schreiben','Schreiben',((st.brief||'').trim().match(/\S+/g)||[]).length+' Wörter geschrieben'],['sprechen','Sprechen',(Object.keys(st.rc||{}).length||(st.sprech||'').trim())?'Aufnahmen: '+Object.keys(st.rc||{}).filter(k=>st.rc[k].aud).length+' von 4':'nichts aufgenommen (Sprechen wird im Chat bewertet)']];
const rows=rows0.filter(r=>!st.lock[r[0]]);const done=rows0.filter(r=>st.lock[r[0]]).map(r=>r[1]);
$('#chk').innerHTML=(done.length?'<p class="hint">Bereits beendet und gespeichert: '+done.join(', ')+'. Diese Teile können nicht mehr geändert werden.</p>':'')+rows.map(r=>'<div class="chk"><input type="checkbox" id="c-'+r[0]+'"><label for="c-'+r[0]+'"><b>Ich habe '+r[1]+' noch einmal geprüft.</b><small>'+r[2]+'</small></label><button data-go="'+r[0]+'">Ansehen</button></div>').join('');
$$('#chk [data-go]').forEach(b=>b.onclick=()=>{$('#modal').hidden=true;if(avail(b.dataset.go)||st.lock[b.dataset.go])go(b.dataset.go,0)});
$$('#chk input').forEach(i=>i.onchange=()=>{$('#submit').disabled=!$$('#chk input').every(x=>x.checked)});$('#submit').disabled=true;$('#modal').hidden=false}
$('#finish').onclick=$('#finish2').onclick=()=>{if(st.fin){location.href='../'}else openFinish()};$('#back').onclick=()=>$('#modal').hidden=true;$('#submit').onclick=()=>{$('#modal').hidden=true;finalize()};
function score(p){return Object.keys(KEY).filter(k=>k[0]===p&&String(KEY[k])===st.sel[k]).length}
function finalize(){commit();st.fin=true;st.h=score('h');st.l=score('l');SECS.forEach(s=>lockSec(s,'Die Prüfung ist abgegeben. Änderungen sind nicht mehr möglich.'));save();location.reload()}
/* answers */
let filt='wrong';$$('.filter button').forEach(b=>b.onclick=()=>{filt=b.dataset.f;$$('.filter button').forEach(x=>x.classList.toggle('on',x===b));list()});
const GT={h1:'Hören 1',h2:'Hören 2',h3:'Hören 3',h4:'Hören 4',l1:'Lesen 1',l2:'Lesen 2',l3:'Lesen 3',l4:'Lesen 4',l5:'Lesen 5'};const TIPS={"h1": ["Lies die Frage VOR dem Hören und unterstreiche das Fragewort (Wann? Wo? Was? Wie viel?). Achte auf Zahlen, Zeiten und Korrekturen („leider“, „nicht … sondern“, „aber“): Die letzte Information gilt meistens.", "Frage zuerst, dann hören: Die Antwort ist oft eine neue Information nach „aber“ oder „leider“."], "h2": ["Im Radio kommen viele Details. Notiere beim Hören nur Zahl/Ort/Zeit, die zur Frage passt. Falsche Antworten nennen oft eine andere Zahl oder Person aus dem Text.", "Eine Frage – eine Information. Die Falle ist ein Detail, das auch im Text steht, aber zur falschen Frage gehört."], "h3": ["Bei Gesprächen: Wer sagt was? Notiere die Meinung der Person, nach der gefragt wird. Wenn jemand zuerst zustimmt und dann „aber“ sagt, gilt meist das Zweite.", "Personen auseinanderhalten: Die Frage nennt immer eine Person – nur ihre Aussagen zählen."], "h4": ["Lies alle Aussagen vorher. Pro Person suchst du ein Schlüsselwort (Wunsch, Problem, Erfahrung). Nicht jede Aussage passt – drei bleiben übrig.", "Schlüsselwörter statt Wort-für-Wort: Die Aussage umschreibt den Text mit anderen Wörtern."], "l1": ["Finde das Hauptthema der Situation (ein Wort) und suche die Rubrik, die dieses Thema enthält. Die anderen Rubriken passen thematisch nicht.", "Situation → Hauptthema → Rubrik. Nicht auf einzelne Wörter hereinfallen."], "l2": ["Lies zuerst die Situation und markiere: WAS wird gesucht, für WEN, WANN, zu welchem PREIS. Prüfe jede Anzeige darauf. Wenn ein wichtiger Punkt fehlt, passt sie nicht. Passt keine, wähle x.", "Alle Punkte der Situation müssen in der Anzeige stehen – sonst x."], "l3": ["Suche im Text das Schlüsselwort aus der Frage. Antwort steht meist im selben oder im nächsten Satz. Achte auf Verneinung, „nur“, „immer“, „nie“, Zahlen.", "Schlüsselwort in der Frage → gleiche Stelle im Text → Aussage vergleichen."], "l4": ["Richtig/falsch: Finde die Stelle zum Thema der Aussage und vergleiche Zahlen, Fristen und Personen genau. Eine einzige Abweichung macht die Aussage falsch.", "Ein Wort kann alles ändern: nur, immer, mindestens, innerhalb von."], "l5": ["Lies den ganzen Satz mit der Lücke und setze jede Möglichkeit ein. Prüfe Verbposition, Endung und Sinn – meist scheitern zwei Möglichkeiten sofort.", "Lücke → Satz lesen → drei Wörter einsetzen → nur eins passt."]};
function lab(e,i){return (e.k==='h4'||e.k==='l2')?(LET[i]+': '+e.ot[i]):e.ot[i]}
function card(k,idx,inl){const e=EX[k],s=st.sel[k],a=e.a,ok=String(a)===s,none=s===undefined;const cls=none?'':(ok?'r':'w');
const tg='<span class="tag '+(none?'nil':ok?'ok':'no')+'">'+(none?'nicht beantwortet':ok?'richtig':'falsch')+'</span>';
let h=inl?'<div class="a-item inl '+cls+'"><div class="a-body"><p>'+tg+'</p>':'<div class="a-item '+cls+'"><div class="a-head"><span class="n">'+idx+'</span><span>'+GT[e.k]+'</span>'+tg+'</div><div class="a-body">';
if(!inl)h+='<p><span class="lab">Aufgabe:</span> '+esc(e.q)+'</p>';if(e.k==='l5')h+='<p><span class="lab">Satz:</span> '+esc(e.sent.replace(e.ot[a],'«'+e.ot[a]+'»'))+'</p>';
h+='<p><span class="lab">Deine Antwort:</span> '+(none?'–':esc(lab(e,+s)))+'</p><p><span class="lab">Richtig:</span> '+esc(lab(e,a))+'</p>';const rf=e.ot[0]==='richtig';
if(e.k==='l5'){const g=e.gap;h+='<p><span class="lab">Warum richtig?</span> '+esc(g.rule)+'</p><p><span class="lab">Warum nicht die anderen?</span></p><ul class="vs">'+g.vs.map(v=>'<li><b>'+esc(v[0])+'</b>: '+esc(v[1])+(v[0]===e.ot[+s]?' <i>(deine Wahl)</i>':'')+'</li>').join('')+'</ul>'}
else if(e.k==='l1'){h+='<p><span class="lab">Warum richtig?</span> '+esc(e.why)+'</p>'}
else if(e.k==='l2'){h+='<p><span class="lab">Warum richtig?</span> '+(a===8?'Keine Anzeige erfüllt alle genannten Punkte der Situation. Die ähnlichste Anzeige lässt mindestens einen Punkt offen – deshalb x.':'Die Anzeige '+LET[a]+' enthält genau das, was die Situation verlangt.')+'</p>';if(!ok&&!none&&+s!==8)h+='<p><span class="lab">Warum nicht '+LET[+s]+'?</span> Die Anzeige passt nur zu einem Teil der Situation (Thema oder Zielgruppe stimmt, aber Zeit, Preis oder Bedingung passen nicht).</p>'}
else if(rf){const q=e.ev[0];h+='<p><span class="lab">Warum '+(a===0?'richtig':'falsch')+'?</span> '+(q?'Im Text steht: <span class="quote">'+esc(q)+'</span> Die Aussage '+(a===0?'stimmt damit überein.':'weicht davon ab (Zahl, Zeit, Person oder ein Wort wie „nur“, „immer“, „nicht“).'):'Die Aussage '+(a===0?'stimmt':'stimmt nicht')+' mit dem Text überein; vergleiche Zahlen und Wörter genau.')+'</p>'}
else{const q=e.ev[a];h+='<p><span class="lab">Warum richtig?</span> '+(q?'Im Text steht: <span class="quote">'+esc(q)+'</span>':'Die Antwort ergibt sich aus dem Zusammenhang des Textes (siehe Hörtexte unten).')+'</p>';
if(!ok&&!none){const w=e.ev[+s];h+='<p><span class="lab">Warum nicht „'+esc(e.ot[+s]).slice(0,120)+'“?</span> '+(w&&w!==q?'Dazu steht im Text nur: <span class="quote">'+esc(w)+'</span> Das beantwortet die Frage nicht oder gehört zu einer anderen Information – das ist die typische Falle.':'Diese Aussage steht so nicht im Text. Sie klingt ähnlich wie die richtige, sagt aber etwas anderes – achte auf den genauen Wortlaut.')+'</p>'}}
const t=e.k==='l5'?[TIPS.l5[0],e.gap.tip]:TIPS[e.k];h+='<p><span class="lab">So findest du die Antwort:</span> '+esc(t[0])+'</p><div class="mem"><b>Merksatz:</b> '+esc(t[1])+'</div></div></div>';return h}

function revBox(sec,html){const p=document.querySelector('#'+sec+' .pane.right');if(!p)return;const o=p.querySelector('.rev');if(o)o.remove();const d=document.createElement('div');d.className='rev inexp';d.innerHTML=html;p.appendChild(d)}
const WREG={sie:/\bSie\b|\bIhr(e|en|em|er|es)?\b|\bIhnen\b/,du:/\b(du|dich|dir|dein|deine|deinen|deinem|deiner|kannst|könntest|bist|hast|willst|musst)\b/i};
const wsN=t=>(t.match(/\S+/g)||[]).length;
const wsCat=c=>({TYPOS:'spelling',GRAMMAR:'grammar',CASING:'capital letters',PUNCTUATION:'punctuation',CONFUSED_WORDS:'wrong word',COMPOUNDING:'compound word'}[c]||'check');
function wsLocal(t){const o=[];const m1=t.match(/\b(leider|außerdem|deshalb|deswegen|danach|dann|trotzdem)\s+(ich|wir|er|sie|du|man)\s+(kann|kannst|muss|habe|bin|will|möchte|werde|komme|bleibe|gehe)\b/i);if(m1)o.push('After „'+m1[1]+'“ the verb comes first: „'+m1[1]+' '+m1[3]+' '+m1[2]+' …“');if(/\b(Hallo|Hi)\s+(Frau|Herr)\b/.test(t))o.push('„Hallo Frau/Herr …“ does not fit. Use „Sehr geehrte Frau …“ (formal) or „Liebe/r + first name“ (informal).');return o}
function wsAnalyze(){const w=st.wt||'A',t=(st.brief||'').trim(),n=wsN(t),reg=meta.rg[w],kw=meta.kw[w];const L=meta.wl[w];
const hits=kw.map(r=>new RegExp(r,'i').test(t));const inh=Math.round(hits.filter(Boolean).length/4*5*2)/2;
const formal=reg==='sie',hallo=/^\s*hallo\s+(herr|frau)/i.test(t);let anr;
if(hallo)anr=0;else if(formal)anr=/^\s*sehr geehrte/i.test(t)?1:(/^\s*(liebe|lieber|guten tag)/i.test(t)?.5:0);else if(reg==='du')anr=/^\s*(liebe|lieber|hallo|hi)\b/i.test(t)?1:0;else anr=/^\s*(sehr geehrte|liebe|lieber|hallo|guten tag)/i.test(t)?1:0;
let gr;if(formal)gr=/mit freundlichen gr/i.test(t)?1:(/(viele|liebe|beste|herzliche|freundliche)\s+gr/i.test(t)?.5:0);else gr=/(gr(ü|ue)(ß|ss)e|bis bald|tsch(ü|ue)ss|lg\b|bis (freitag|samstag|sonntag|montag|dienstag|mittwoch|donnerstag))/i.test(t)?1:0;
const hasS=WREG.sie.test(t.replace(/(^|[.!?]\s+)Sie\b/g,'$1 ')),hasD=WREG.du.test(t);let rg,rgTxt;
if(reg==='sie'){if(hasD){rg=0;rgTxt='du-Form gefunden (hier: Sie)'}else if(hasS){rg=1.5;rgTxt='durchgehend Sie'}else{rg=.75;rgTxt='keine Anredeform erkannt'}}
else if(reg==='du'){if(hasS){rg=0;rgTxt='Sie-Form gefunden (hier: du)'}else if(hasD){rg=1.5;rgTxt='durchgehend du'}else{rg=.75;rgTxt='keine Anredeform erkannt'}}
else{if(hasS&&hasD){rg=0;rgTxt='du und Sie gemischt'}else if(hasS||hasD){rg=1.5;rgTxt='einheitlich ('+(hasS?'Sie':'du')+')'}else{rg=.75;rgTxt='keine Anredeform erkannt'}}
const cs=['weil','deshalb','außerdem','aber','denn','trotzdem','obwohl','dass','deswegen','damit','wenn'].filter(c=>new RegExp('\\b'+c+'\\b','i').test(t));const con=cs.length>=2?.75:cs.length===1?.4:0;const len=n>=80?.75:n>=60?.4:0;
const ges=anr+gr+rg+con+len;if(!t)return{n,w,hits,inh:0,ges:0,anr:0,gr:0,rg:0,rgTxt:'',cs:[],con:0,len:0,L};
return{n,w,hits,inh,ges,anr,gr,rg,rgTxt,cs,con,len,L}}
function wsForm(m,n){const r=n?m/n*100:99;return r<=2?10:r<=5?8.5:r<=8?7:r<=12?5.5:r<=16?4:r<=22?2.5:r<=30?1:0}
const wsR=x=>Math.round(x*2)/2;
async function wsFetchLT(t,sp){const sig=((t.split(/\n/).pop())||'').split(/\s+/);const body=new URLSearchParams({text:t.replace(/\S+@\S+/g,'E-Mail'),language:'de-DE'});const r=await fetch('https://api.languagetool.org/v2/check',{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/x-www-form-urlencoded'},body});if(!r.ok)throw new Error('lt');const j=await r.json();return j.matches.filter(m=>{const c=m.rule.category.id;const bad=m.context.text.substr(m.context.offset,m.context.length);return!(c==='STYLE'||c==='TYPOGRAPHY'||(sp&&(c==='CASING'||c==='PUNCTUATION'))||c==='REDUNDANCY'||m.rule.id==='WHITESPACE_RULE'||(m.rule.issueType==='misspelling'&&sig.includes(bad)))}).slice(0,40).map(m=>({bad:m.context.text.substr(m.context.offset,m.context.length),rep:(m.replacements[0]||{}).value||'',cat:m.rule.category.id}))}
function wsCopyText(){const w=st.wt||'A',t=(st.brief||'').trim();const reg=meta.rg[w]==='sie'?'formell, mit Sie':meta.rg[w]==='du'?'informell, mit du':'halbformell, du oder Sie einheitlich';
return 'Bitte korrigiere meinen Brief für den DTZ B1 (Schreiben) und gib mir Punkte von 20.\n\nTest: Modelltest '+N+' (DTZ B1)\nAufgabe: '+w+' ('+reg+')\n\nSituation:\n'+meta.ws[w]+'\n\nDiese 4 Punkte müssen im Brief vorkommen:\n'+meta.wl[w].map((x,i)=>(i+1)+'. '+x).join('\n')+'\n\nMein Brief ('+wsN(t)+' Wörter, Ziel: ca. 80–100):\n'+(t||'(nicht geschrieben)')+'\n\nBitte:\n1) Punkte von 20 in 4 Kriterien (Inhalt, Kommunikative Gestaltung, Wortschatz, Grammatik/Rechtschreibung, je 5 Punkte)\n2) Alle Fehler mit Korrektur und kurzer Erklärung\n3) Eine korrigierte Version\n4) Drei Tipps zum Üben\nBitte erkläre alles auf Englisch (ich bin Anfänger).'}
function wsCopy(btn){const tx=wsCopyText();const done=()=>{toast('Kopiert: Test, Aufgabe, Situation, 4 Punkte und dein Brief');if(btn){const o=btn.dataset.o||btn.textContent;btn.dataset.o=o;btn.textContent='Kopiert ✔';setTimeout(()=>btn.textContent=o,2200)}};
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(tx).then(done).catch(()=>{wsCopyFb(tx);done()})}else{wsCopyFb(tx);done()}}
function wsCopyFb(tx){const a=document.createElement('textarea');a.value=tx;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();try{document.execCommand('copy')}catch(e){}a.remove()}
function revWS(){const A=wsAnalyze(),t=(st.brief||'').trim();const key=t;const ltOk=st.lt&&st.lt.t===key;const f=(ok)=>'<li class="'+(ok===1?'ok':ok===.5?'half':'no')+'">'+(ok===1?'✔ ':ok===.5?'◐ ':'✘ ');
const loc=wsLocal(t);let h='<div class="st"><b>Dein Brief · Aufgabe '+A.w+'</b></div>';
if(!t){h+='<p>Du hast keinen Brief geschrieben (0 / 20). Unten siehst du den Modellbrief.</p>'}else{
let formPts=null;const lfail=st.lt&&st.lt.t===key+'\u0000fail';if(ltOk){formPts=wsForm(st.lt.m.length,A.n)}
const total=formPts===null?null:wsR(A.inh+A.ges+formPts);
h+='<div class="sum"><div><b>'+(total!==null?'≈ '+total+' / 20':lfail?'≈ '+wsR(A.inh+A.ges)+' / 10':'… / 20')+'</b><small>Schätzung'+(lfail?' ohne Grammatik':'')+' · '+A.n+' Wörter</small></div><div><b>'+wsR(A.inh)+' / 5</b><small>Inhalt</small></div><div><b>'+wsR(A.ges)+' / 5</b><small>Gestaltung</small></div><div><b>'+(formPts===null?'…':wsR(formPts))+' / 10</b><small>Wortschatz + Grammatik</small></div></div>';
h+='<p class="hint">Automatische Schätzung, nicht amtlich. Sie sucht Schlüsselwörter und zählt Fehler und kann sich irren. Die echte Bewertung bekommst du von Claude: Knopf „Für Claude kopieren“.</p>';
h+='<p><b>Inhalt: die 4 Punkte</b></p><ul class="rl">'+A.L.map((x,i)=>f(A.hits[i]?1:0)+esc(x)+(A.hits[i]?'':' – nicht erkannt')+'</li>').join('')+'</ul>';
h+='<p><b>Gestaltung</b></p><ul class="rl">'+f(A.anr)+'Anrede'+(A.anr===.5?' (zu wenig formell, besser „Sehr geehrte …“)':A.anr===0?' fehlt oder passt nicht':'')+'</li>'+f(A.gr)+'Gruß'+(A.gr===.5?' (besser „Mit freundlichen Grüßen“)':A.gr===0?' fehlt oder passt nicht':'')+'</li>'+f(A.rg>=1.5?1:A.rg>0?.5:0)+'Anredeform: '+esc(A.rgTxt)+'</li>'+f(A.con>=.75?1:A.con>0?.5:0)+'Verbindungswörter: '+(A.cs.length?esc(A.cs.join(', ')):'keine')+'</li>'+f(A.len>=.75?1:A.len>0?.5:0)+'Länge: '+A.n+' Wörter (Ziel 80–100)</li></ul>';
h+='<p><b>Formale Richtigkeit (Grammatik und Rechtschreibung)</b></p>';
if(ltOk){h+=st.lt.m.length?'<p>'+st.lt.m.length+' mögliche Fehler gefunden:</p><ul class="rl">'+st.lt.m.map(m=>'<li class="no">✘ „'+esc(m.bad)+'“'+(m.rep?' → <b>'+esc(m.rep)+'</b>':'')+' <small>('+wsCat(m.cat)+')</small></li>').join('')+'</ul>':'<p>Keine Fehler gefunden. Sehr gut!</p>'}
else if(st.lt&&st.lt.t===key+'\u0000fail'){h+='<p>Der Grammatik-Check (LanguageTool) ist gerade nicht erreichbar. Die Punkte oben gelten ohne diesen Teil (maximal 10 von 20). Nutze „Für Claude kopieren“ für die vollständige Korrektur.</p>'}
else{h+='<p id="ltwait">Grammatik wird geprüft …</p>'}
if(loc.length)h+='<ul class="rl">'+loc.map(x=>'<li class="no">✘ '+esc(x)+'</li>').join('')+'</ul>';
}
h+='<div class="actions"><button class="btn" id="wscopy">Für Claude kopieren</button></div>';
h+='<p><b>Modellbrief:</b></p><div class="text">'+esc(meta.wm[A.w]).replace(/\n/g,'<br>')+'</div>';revBox('schreiben',h);
const b=document.getElementById('wscopy');if(b)b.onclick=()=>wsCopy(b);
if(t&&!ltOk&&!revWS.busy&&!(st.lt&&st.lt.t===key+'\u0000fail')){revWS.busy=1;wsFetchLT(t).then(m=>{st.lt={t:key,m};save()}).catch(()=>{st.lt={t:key+'\u0000fail',m:[]};save()}).finally(()=>{revWS.busy=0;revWS()})}}
/* Sprechen: recording, live transcript, estimate */
const SRC=window.SpeechRecognition||window.webkitSpeechRecognition;
const SPP=[['1','Teil 1 · Sich vorstellen','Richtwert 1–1,5 Min'],['2a','Teil 2 · Bild A','Richtwert 1–1,5 Min'],['2b','Teil 2 · Bild B','Richtwert 1–1,5 Min'],['3','Teil 3 · Gemeinsam planen','Richtwert 2–3 Min']];
const idbo=()=>new Promise((res,rej)=>{const r=indexedDB.open('dtz-audio',1);r.onupgradeneeded=()=>r.result.createObjectStore('a');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function aPut(k,b){const d=await idbo();return new Promise((res,rej)=>{const tx=d.transaction('a','readwrite');tx.objectStore('a').put(b,k);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function aGet(k){const d=await idbo();return new Promise((res,rej)=>{const q=d.transaction('a').objectStore('a').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}
async function aDel(k){const d=await idbo();return new Promise(res=>{const tx=d.transaction('a','readwrite');tx.objectStore('a').delete(k);tx.oncomplete=res})}
const mmss=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
let rcur=null;
function recRows(){const L=$('#reclist');if(!L||L.children.length)return;st.rc=st.rc||{};L.innerHTML=SPP.map(p=>'<div class="rrow" data-p="'+p[0]+'"><div class="rh"><b>'+p[1]+'</b><small>'+p[2]+'</small><span class="rt">'+(st.rc[p[0]]?mmss(st.rc[p[0]].sec):'0:00')+'</span><button class="btn small rb">● Aufnehmen</button></div><textarea class="rtx" rows="3" spellcheck="false" placeholder="Hier erscheint dein Text. Du kannst ihn verbessern oder selbst schreiben."></textarea><audio controls hidden></audio></div>').join('');
$('#recnote').textContent=SRC?'Klicke auf „Aufnehmen“, sprich laut und klicke auf „Stopp“. Dein Text wird automatisch mitgeschrieben. Beim ersten Mal fragt der Browser nach dem Mikrofon.':'Dein Browser schreibt nicht automatisch mit (nutze Chrome oder Edge). Du kannst trotzdem aufnehmen und danach selbst aufschreiben.';
$$('.rrow').forEach(row=>{const p=row.dataset.p,tx=row.querySelector('.rtx'),au=row.querySelector('audio');tx.value=(st.rc[p]&&st.rc[p].txt)||'';tx.oninput=()=>{st.rc[p]=st.rc[p]||{sec:0,txt:''};st.rc[p].txt=tx.value;save()};
row.querySelector('.rb').onclick=()=>rcur&&rcur.p===p?recStop():recStart(p,row);
if(st.rc[p]&&st.rc[p].aud)aGet(N+':'+p).then(b=>{if(b){au.src=URL.createObjectURL(b);au.hidden=false}}).catch(()=>{})})}
async function recStart(p,row){if(rcur)return;if(st.rc[p]&&st.rc[p].aud&&!confirm('Die Aufnahme für diesen Teil ersetzen?'))return;
let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:true})}catch(e){toast('Mikrofon nicht erlaubt. Bitte im Browser erlauben.');return}
const chunks=[];const mr=new MediaRecorder(stream);mr.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};const tx=row.querySelector('.rtx');const o={p,row,mr,stream,t0:Date.now(),txt:'',stop:false};
if(SRC){const sr=new SRC();sr.lang='de-DE';sr.continuous=true;sr.interimResults=true;sr.onresult=ev=>{let it='';for(let i=ev.resultIndex;i<ev.results.length;i++){const r=ev.results[i];if(r.isFinal)o.txt+=r[0].transcript+' ';else it+=r[0].transcript}tx.value=(o.txt+it).trim()};sr.onend=()=>{if(!o.stop){try{sr.start()}catch(e){}}};sr.onerror=()=>{};o.sr=sr;try{sr.start()}catch(e){}}
mr.onstop=async()=>{stream.getTracks().forEach(t=>t.stop());const blob=new Blob(chunks,{type:mr.mimeType||'audio/webm'});const sec=Math.round((Date.now()-o.t0)/1000);const txt=tx.value.trim();st.rc[p]={sec,txt,aud:true};try{await aPut(N+':'+p,blob);const au=row.querySelector('audio');au.src=URL.createObjectURL(blob);au.hidden=false}catch(e){st.rc[p].aud=false;toast('Die Aufnahme konnte nicht gespeichert werden. Der Text ist gespeichert.')}save();row.querySelector('.rt').textContent=mmss(sec);rcur=null;$$('.rb').forEach(b=>{b.disabled=false;b.textContent='● Aufnehmen'})};
o.int=setInterval(()=>{row.querySelector('.rt').textContent=mmss(Math.round((Date.now()-o.t0)/1000))},500);rcur=o;mr.start();$$('.rb').forEach(b=>b.disabled=true);const rb=row.querySelector('.rb');rb.disabled=false;rb.textContent='■ Stopp'}
function recStop(){const o=rcur;if(!o)return;o.stop=true;clearInterval(o.int);try{o.sr&&o.sr.stop()}catch(e){}try{o.mr.stop()}catch(e){}}
const SPSTOP=new Set(['sehen','sehr','dann','eine','einen','einem','haben','sind','wird','werden','sich','ihre','ihrer','oder','aber','nicht','schon','noch','auch','wenn','über']);
const spW=t=>(t.toLowerCase().match(/[a-zäöüß]+/g)||[]);
function spOverlap(words,list){const sw=new Set(words.filter(w=>w.length>=5&&!SPSTOP.has(w)).map(w=>w.slice(0,5)));const tw=list.map(w=>w.slice(0,5));return[...sw].filter(s=>tw.includes(s)).length}
const T1K=[['Name',/hei(ß|ss)e|mein name|ich bin\b/i],['Herkunft / Wohnort',/komme aus|geboren|stamme|wohne|lebe in|wohnen/i],['Beruf / Ausbildung',/arbeite|beruf|arbeit|student|sch(ü|ue)ler|ausbildung|firma|studiert|ingenieur/i],['Familie',/verheiratet|familie|meine frau|mein mann|kinder|sohn|tochter|eltern|geschwister|bruder|schwester|ledig/i],['Sprachen / Deutsch lernen',/spreche|sprache|deutsch|englisch|lerne|kurs/i],['Hobby',/hobby|freizeit|spiele|lese|koche|reise|sport|musik|gern/i]];
const SPCON=['weil','aber','deshalb','außerdem','denn','dass','obwohl','wenn','trotzdem','also','deswegen','zum beispiel','dann','und dann','damit'];
function spAnalyze(){const S=meta.sp,rc=st.rc||{};const P=[];let all='',tw=0,ts=0;
SPP.forEach(([k,ti])=>{const r=rc[k]||{sec:0,txt:''};const txt=(r.txt||'').trim();const w=spW(txt);const n=w.length;all+=(txt?txt+'. ':'');tw+=n;ts+=r.sec||0;let ch=[],tg;
if(k==='1'){ch=T1K.map(([l,rx])=>[l,rx.test(txt)]);tg=50}
else if(k==='3'){const b=S.p3.b.map(x=>[x,spOverlap(spW(x),w)>0]);const nb=b.filter(x=>x[1]).length;ch=[['Planung: '+nb+' von '+b.length+' Themen (Ort, Zeit, Essen …)',nb>=Math.ceil(b.length*.6)],['Vorschlag gemacht (Wie wäre es …? Wir könnten …)',/wie w(ä|ae)re|ich schlage|wir k(ö|oe)nnten|vielleicht|was h(ä|ae)ltst|was meinst|ich finde|lieber/i.test(txt)],['Zugestimmt oder widersprochen (Gute Idee, einverstanden …)',/gute idee|einverstanden|stimmt|genau|ich finde auch|ja,? gern|okay|in ordnung|nicht so gut|leider|lieber/i.test(txt)],['Geeinigt (Dann machen wir …)',/dann machen wir|abgemacht|treffen wir|ich bringe|ich mache|ich kümmere|wir machen|dann ist|dann bringe/i.test(txt)]];tg=80}
else{const d=(k==='2a'?S.a:S.b).d;const need=Math.min(3,Math.max(1,Math.floor(spW(d).filter(x=>x.length>=5&&!SPSTOP.has(x)).length/3)));ch=[['Bild beschrieben (Personen, Ort, was passiert)',spOverlap(spW(d),w)>=need],['Von eigener Erfahrung berichtet (Ich war … / Ich habe …)',/ich war|ich habe|ich bin|bei mir|mir ist|schon einmal|letztes|früher/i.test(txt)],['Mit Heimatland oder Deutschland verglichen',/in (indien|meinem (heimat)?land|meiner heimat|deutschland)|bei uns|dort|hier in deutschland|anders/i.test(txt)]];tg=60}
const c=ch.length?ch.filter(x=>x[1]).length/ch.length:0;P.push({k,ti,sec:r.sec||0,n,tg,ch,c,have:!!txt})});
const wts={'1':8,'2a':8,'2b':8,'3':11};let inh=0;P.forEach(p=>{inh+=p.c*wts[p.k]*(.5+.5*Math.min(1,p.n/p.tg))});
const cs=SPCON.filter(c=>new RegExp('(^|[^a-zäöüß])'+c+'([^a-zäöüß]|$)','i').test(all));const aw=spW(all);const ttr=aw.length?new Set(aw).size/aw.length:0;
const voc=(cs.length>=5?10:cs.length>=3?7:cs.length>=2?4:cs.length>=1?2:0)+(aw.length<40?0:ttr>=.55?5:ttr>=.45?3:1);
const wpm=ts?tw/ts*60:0;const flu=!ts?0:wpm>=90?10:wpm>=70?8:wpm>=50?5:wpm>=30?3:1;
return{P,inh,voc,flu,cs,wpm,tw,ts,all:all.trim()}}
const spForm=(m,n)=>{const r=n?m/n*100:99;return r<=3?25:r<=6?20:r<=10?15:r<=15?10:r<=22?5:0}

function spCopyText(){const S=meta.sp,rc=st.rc||{};const part=(k)=>{const r=rc[k]||{};return 'Dauer: '+(r.sec?mmss(r.sec):'nicht aufgenommen')+'\nMeine Antwort (Transkript):\n'+((r.txt||'').trim()||'(leer)')};
return 'Bitte bewerte meine Sprechprüfung (DTZ B1, Sprechen) und gib mir Punkte von 100.\n\nTest: Modelltest '+N+' (DTZ B1)\nIch habe jeden Teil allein aufgenommen. Das Transkript wurde automatisch erstellt und kann Erkennungsfehler enthalten (die Spracherkennung korrigiert manchmal auch Grammatikfehler von selbst). Bitte beurteile deshalb vorsichtig. Die Aussprache kannst du aus Text nicht beurteilen.\n\n=== Teil 1 · Sich vorstellen ===\nAufgabe: Stellen Sie sich vor. Themen: '+S.t1.pts.join(', ')+'. Mögliche Nachfragen: '+S.t1.q.join(' / ')+'\n'+part('1')+'\n\n=== Teil 2 · Bild A ===\nBild: '+S.a.d+'\nFragen: '+S.a.q.join(' / ')+'\n'+part('2a')+'\n\n=== Teil 2 · Bild B ===\nBild: '+S.b.d+'\nFragen: '+S.b.q.join(' / ')+'\n'+part('2b')+'\n\n=== Teil 3 · Gemeinsam etwas planen ===\nAufgabe: '+S.p3.t+'\nThemen: '+S.p3.b.join(', ')+'\n(Meine Gesprächspartnerin oder mein Partner war nicht dabei: bitte nur meine Beiträge bewerten.)\n'+part('3')+(((st.sprech||'').trim())?'\n\nMeine Notizen:\n'+st.sprech.trim():'')+'\n\nBitte:\n1) Punkte von 100 mit Kriterien (Aufgabenerfüllung, Flüssigkeit, Wortschatz, Grammatik; Aussprache nur wenn möglich)\n2) Fehler mit Korrektur und kurzer Erklärung\n3) Eine bessere Beispielantwort pro Teil (kurz)\n4) Drei Tipps zum Üben\nBitte erkläre alles auf Englisch (ich bin Anfänger).'}
function spCopy(btn){const tx=spCopyText();const done=()=>{toast('Kopiert: alle Aufgaben, deine Texte und die Bitte um Bewertung');if(btn){const o=btn.dataset.o||btn.textContent;btn.dataset.o=o;btn.textContent='Kopiert ✔';setTimeout(()=>btn.textContent=o,2200)}};
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(tx).then(done).catch(()=>{wsCopyFb(tx);done()})}else{wsCopyFb(tx);done()}}
function revSP(){const A=spAnalyze(),key=A.all;const any=A.tw>0;const ltOk=st.lt2&&st.lt2.t===key,lfail=st.lt2&&st.lt2.t===key+'\u0000fail';
let h='<div class="st"><b>Deine Sprechprüfung</b></div>';
if(!any){h+='<p>Du hast nichts aufgenommen und nichts aufgeschrieben (0 Punkte). Unten findest du die Beispielantworten.</p>'}else{
const gr=ltOk?spForm(st.lt2.m.length,A.tw):null;const inh=Math.round(A.inh*2)/2;const tot=gr===null?null:Math.round(A.inh+A.voc+A.flu+gr);
h+='<div class="sum"><div><b>'+(tot!==null?'≈ '+tot+' / 85':lfail?'≈ '+Math.round(A.inh+A.voc+A.flu)+' / 60':'… / 85')+'</b><small>Schätzung'+(lfail?' ohne Grammatik':' ohne Aussprache')+'</small></div><div><b>'+inh+' / 35</b><small>Inhalt und Umfang</small></div><div><b>'+A.voc+' / 15</b><small>Wortschatz</small></div><div><b>'+A.flu+' / 10</b><small>Redefluss</small></div><div><b>'+(gr===null?'…':gr)+' / 25</b><small>Grammatik</small></div></div>';
h+='<p class="hint">Automatische Schätzung nach dem Transkript, nicht amtlich. Die Aussprache kann nur ein Mensch hören und ist nicht dabei. Die Spracherkennung verbessert Fehler manchmal selbst, darum ist die Grammatik hier eher zu gut bewertet. Die echte Bewertung bekommst du von Claude: Knopf „Für Claude kopieren“.</p>';
A.P.forEach(p=>{h+='<p><b>'+p.ti+'</b> · '+(p.sec?mmss(p.sec):'nicht aufgenommen')+' · '+p.n+' Wörter (Ziel ab '+p.tg+')</p>'+(p.have?'<ul class="rl">'+p.ch.map(c=>'<li class="'+(c[1]?'ok':'no')+'">'+(c[1]?'✔ ':'✘ ')+esc(c[0])+'</li>').join('')+'</ul>':'<p class="hint">Kein Text für diesen Teil.</p>')});
h+='<p><b>Wortschatz:</b> Verbindungswörter: '+(A.cs.length?esc(A.cs.join(', ')):'keine')+'. <b>Tempo:</b> '+Math.round(A.wpm)+' Wörter pro Minute (gut: ab 70).</p><p><b>Grammatik</b></p>';
if(ltOk){h+=st.lt2.m.length?'<p>'+st.lt2.m.length+' mögliche Fehler:</p><ul class="rl">'+st.lt2.m.map(m=>'<li class="no">✘ „'+esc(m.bad)+'“'+(m.rep?' → <b>'+esc(m.rep)+'</b>':'')+' <small>('+wsCat(m.cat)+')</small></li>').join('')+'</ul>':'<p>Keine Fehler gefunden.</p>'}
else if(lfail){h+='<p>Der Grammatik-Check (LanguageTool) ist gerade nicht erreichbar. Nutze „Für Claude kopieren“.</p>'}else{h+='<p>Grammatik wird geprüft …</p>'}}
h+='<div class="actions"><button class="btn" id="spcopy">Für Claude kopieren</button></div><p><b>Beispielantworten:</b></p>'+meta.pm+'<div class="player"><audio controls preload="none" src="sprechen_modell.mp3"></audio></div>';
revBox('sprechen',h);const b=document.getElementById('spcopy');if(b)b.onclick=()=>spCopy(b);
if(any&&!ltOk&&!lfail&&!revSP.busy){revSP.busy=1;wsFetchLT(key,true).then(m=>{st.lt2={t:key,m};save()}).catch(()=>{st.lt2={t:key+'\u0000fail',m:[]};save()}).finally(()=>{revSP.busy=0;revSP()})}}
function inline(){Object.keys(KEY).forEach(k=>{const it=document.getElementById('i-'+k);if(!it)return;const qb=it.querySelector('.qb');const old=qb.querySelector('.inexp');if(old)old.remove();
const labs=[...it.querySelectorAll('.opt')];const pos=v=>String(v)==='8'?labs.length-1:+v;labs.forEach(l=>l.classList.remove('is-correct','is-wrong'));
if(labs[pos(KEY[k])])labs[pos(KEY[k])].classList.add('is-correct');const sv=st.sel[k];if(sv!==undefined&&String(sv)!==String(KEY[k])&&labs[pos(sv)])labs[pos(sv)].classList.add('is-wrong');
const d=document.createElement('div');d.className='inexp';d.innerHTML=card(k,it.querySelector('.qn').textContent,true);qb.appendChild(d)});
revWS();revSP();aud.controls=true;aud.removeAttribute('hidden');aud.style.display='block';$('#aplay').hidden=true;$('#hdone').hidden=true;$('#endcur').hidden=true;$('#finish').hidden=false;$('#finish').textContent='Zur Startseite';$('#finish2').textContent='Zur Startseite';$$('[data-endsec]').forEach(b=>b.hidden=true);aStat('Zum Nachhören: Wiedergabe, Pause und Vor- oder Zurückspulen mit der Leiste unten.');$('#noaudio').style.display='none'}
function list(){const out=[];[['h','hoeren'],['l','lesen']].forEach(([p,s])=>{let i=0;Object.keys(KEY).filter(k=>k[0]===p).forEach(k=>{i++;const ok=String(KEY[k])===st.sel[k];if(filt==='all'||!ok)out.push('<h3>'+LAB[s]+' · Aufgabe '+i+'</h3>'+card(k,i))})});$('#ans-list').innerHTML=out.length?out.join(''):'<p>Alle Aufgaben richtig – sehr gut!</p>'}
const lvl=x=>x>=33?'B1':x>=20?'A2':'unter A2';
function verdict(){const hl=(st.h||0)+(st.l||0);const v=$('#verdict');if(!v)return;const pB=st.p==='2',sB=st.s==='2',hlB=hl>=33;
v.innerHTML=st.p===undefined?'<p class="hint">Wähle deine Selbsteinschätzung für Sprechen und Schreiben, dann siehst du das Gesamtergebnis.</p>':'<h3>'+(pB&&(hlB||sB)?'Gesamt: B1 erreicht':'Gesamt: noch nicht B1')+'</h3><p>B1 gesamt = Sprechen B1 und (Hören+Lesen B1 oder Schreiben B1).</p>';st.done=(st.p!==undefined);save()}
function render(){$('#ans-sum').innerHTML='<div class="sum"><div><b>'+st.h+' / 20</b><small>Hören</small></div><div><b>'+st.l+' / 25</b><small>Lesen</small></div><div><b>'+(st.h+st.l)+' / 45</b><small>Hören + Lesen · '+lvl(st.h+st.l)+'</small></div></div><p class="hint">Ab 33 von 45 richtig = B1, ab 20 = A2. Jede Karte erklärt, warum eine Antwort stimmt oder nicht, und wie du sie im Text findest.</p>';
$$('.mine').forEach(m=>m.textContent=(st.wt||'A')===m.dataset.mine?'(von dir gewählt)':'');list();inline();verdict();$('button[data-t=antworten]').disabled=false}
$$('audio:not(#aud)').forEach(a=>{const n=a.parentNode.querySelector('.noaudio');a.addEventListener('error',()=>{if(n)n.style.display='block'})});
$('#redo').onclick=()=>{if(confirm('Alle Antworten dieses Tests löschen und neu beginnen?')){try{localStorage.removeItem(SK)}catch(e){}location.reload()}};
recRows();$('#spcopy0').onclick=()=>spCopy($('#spcopy0'));
recRows();$('#spcopy0').onclick=()=>spCopy($('#spcopy0'));
/* start */
function showApp(){$('#start').hidden=true;$('#app').hidden=false}
function begin(){const resume=!!st.paused;const fresh=!st.t0;if(!st.t0){st.t0=now();st.act='hoeren';st.since=now();save()}if(resume){st.paused=false;st.act=st.pact||null;st.since=now();save()}showApp();SECS.forEach(s=>{if(st.lock[s])lockSec(s,'Dieser Teil ist beendet.')});const tg=st.fin?'antworten':(st.where&&(avail(st.where)||st.lock[st.where])?st.where:'hoeren');go(tg,1);if(!st.fin&&!st.lock.hoeren&&tg==='hoeren'){if(fresh)preStart(30);else if(st.preLeft>0&&!st.apos)preStart(st.preLeft);else startAudio()}}
$('#home').onclick=()=>{if(st.fin||!st.t0){location.href='../';return}if(confirm('Sie sind mitten in der Prüfung. Prüfung pausieren und zur Startseite gehen?\n\nDie Zeit wird angehalten. Beim Fortsetzen machen Sie genau hier weiter.')){if(preT){clearInterval(preT);preT=null;st.preLeft=preLeft}commit();st.pact=st.act;st.act=null;st.since=0;st.paused=true;st.where=cur;save();location.href='../'}};
$('#begin').onclick=begin;$('#reset').onclick=()=>{if(confirm('Test zurücksetzen?')){try{localStorage.removeItem(SK)}catch(e){}location.reload()}};
if(st.fin){showApp();SECS.forEach(s=>lockSec(s,'Die Prüfung ist abgegeben. Änderungen sind nicht mehr möglich.'));st.h=score('h');st.l=score('l');render();go('antworten',1)}
else if(st.t0){$('#begin').textContent=st.paused?'Pausierte Prüfung fortsetzen':'Prüfung fortsetzen';$('#reset').hidden=false}
})();
