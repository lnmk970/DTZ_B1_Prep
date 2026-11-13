
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
function go(s,keep){st.where=s;if(s!=='antworten'&&!st.fin&&!avail(s))return;if(SECS.includes(cur)&&cur!==s)leaveTask(cur);cur=s;
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
$('#copy').onclick=()=>{ta.select();try{navigator.clipboard.writeText(ta.value);toast('Text kopiert')}catch(e){document.execCommand('copy')}};
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
function openFinish(){const c=counts();const rows0=[['hoeren','Hören',c.h[0]+' von '+c.h[1]+' beantwortet'],['lesen','Lesen',c.l[0]+' von '+c.l[1]+' beantwortet'],['schreiben','Schreiben',((st.brief||'').trim().match(/\S+/g)||[]).length+' Wörter geschrieben'],['sprechen','Sprechen',(st.sprech||'').trim()?'Antworten notiert':'keine Notizen (Sprechen wird im Chat bewertet)']];
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
function revWS(){const t=(st.brief||'').trim(),w=st.wt||'A',n=(t.match(/\S+/g)||[]).length;const ck=(ok,y,no)=>'<li class="'+(ok?'ok':'no')+'">'+(ok?'✔ ':'✘ ')+(ok?y:no)+'</li>';
let h='<div class="st"><b>Dein Brief · Aufgabe '+w+'</b></div>';
if(!t){h+='<p>Du hast keinen Brief geschrieben. Unten siehst du einen Modellbrief zum Vergleichen.</p>'}else{h+='<ul class="rl">'+ck(n>=70,n+' Wörter (Ziel: ca. 80–100)',n+' Wörter – zu kurz, Ziel ca. 80–100')+ck(/^\s*(sehr geehrte|liebe|lieber|hallo|guten tag)/i.test(t),'Anrede vorhanden','Anrede fehlt (Sehr geehrte Damen und Herren / Liebe …)')+ck(/(mit freundlichen gr|viele gr|liebe gr|herzliche gr|beste gr|freundliche gr)/i.test(t),'Gruß am Ende vorhanden','Gruß fehlt (Mit freundlichen Grüßen / Viele Grüße)')+ck(/\b(weil|deshalb|außerdem|aber|denn|trotzdem|obwohl|dass|deswegen)\b/i.test(t),'Verbindungswörter benutzt','Keine Verbindungswörter (weil, deshalb, außerdem, aber)')+ck(/(könnten sie|könntest du|würde mich freuen|ich möchte|würde gern|würde ich)/i.test(t),'höfliche Form benutzt','Keine höfliche Form (Könnten Sie …? Ich würde mich freuen …)')+'</ul><p class="hint">Das ist nur ein Formcheck. Ob alle vier Leitpunkte inhaltlich stimmen und wie gut deine Grammatik ist, bewertet Claude im Chat: kopiere deinen Brief dorthin.</p>'}
h+='<p><b>Diese vier Punkte musste dein Brief enthalten:</b></p><ol>'+meta.wl[w].map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol><p><b>Modellbrief:</b></p><div class="text">'+esc(meta.wm[w]).replace(/\n/g,'<br>')+'</div>';revBox('schreiben',h)}
function revSP(){const t=(st.sprech||'').trim();revBox('sprechen','<div class="st"><b>Deine Notizen und die Beispielantworten</b></div>'+(t?'':'<p>Du hast keine Notizen gemacht.</p>')+'<p class="hint">Vergleiche mit den Beispielantworten. Die Bewertung deiner Antworten machen wir im Claude-Chat: kopiere deine Notizen dorthin.</p>'+meta.pm+'<div class="player"><audio controls preload="none" src="sprechen_modell.mp3"></audio></div>')}
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
/* start */
function showApp(){$('#start').hidden=true;$('#app').hidden=false}
function begin(){const resume=!!st.paused;const fresh=!st.t0;if(!st.t0){st.t0=now();st.act='hoeren';st.since=now();save()}if(resume){st.paused=false;st.act=st.pact||null;st.since=now();save()}showApp();SECS.forEach(s=>{if(st.lock[s])lockSec(s,'Dieser Teil ist beendet.')});const tg=st.fin?'antworten':(st.where&&(avail(st.where)||st.lock[st.where])?st.where:'hoeren');go(tg,1);if(!st.fin&&!st.lock.hoeren&&tg==='hoeren'){if(fresh)preStart(30);else if(st.preLeft>0&&!st.apos)preStart(st.preLeft);else startAudio()}}
$('#home').onclick=()=>{if(st.fin||!st.t0){location.href='../';return}if(confirm('Sie sind mitten in der Prüfung. Prüfung pausieren und zur Startseite gehen?\n\nDie Zeit wird angehalten. Beim Fortsetzen machen Sie genau hier weiter.')){if(preT){clearInterval(preT);preT=null;st.preLeft=preLeft}commit();st.pact=st.act;st.act=null;st.since=0;st.paused=true;st.where=cur;save();location.href='../'}};
$('#begin').onclick=begin;$('#reset').onclick=()=>{if(confirm('Test zurücksetzen?')){try{localStorage.removeItem(SK)}catch(e){}location.reload()}};
if(st.fin){showApp();SECS.forEach(s=>lockSec(s,'Die Prüfung ist abgegeben. Änderungen sind nicht mehr möglich.'));st.h=score('h');st.l=score('l');render();go('antworten',1)}
else if(st.t0){$('#begin').textContent=st.paused?'Pausierte Prüfung fortsetzen':'Prüfung fortsetzen';$('#reset').hidden=false}
})();
