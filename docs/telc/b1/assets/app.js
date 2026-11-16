(function(){
'use strict';
const meta=JSON.parse(document.getElementById('meta').textContent),N=meta.n,KEY=meta.key,EX=meta.ex,TK=meta.tk,SK='telc:mt:'+N;
const M60=60000;
const B={lesen:90*M60,hoeren:32*M60,schreiben:30*M60,vorb:20*M60,gespr:15*M60};
const SECS=['lesen','hoeren','schreiben','sprechen'];
const LAB={lesen:'Lesen und Sprachbausteine',hoeren:'Hören',schreiben:'Schreiben',sprechen:'Sprechen'};
/* telc B1 Punkte je Aufgabe: Lesen 1-5 je 5, 6-10 je 5, 11-20 je 2,5 · Sprachb. je 1,5 · Hören 1-5 je 5, 6-15 je 2,5, 16-20 je 5 */
function wt(k){const p=k[0],n=+k.slice(1);if(p==='s')return 1.5;if(p==='l')return n<=10?5:2.5;return (n<=5||n>=16)?5:2.5}
let st={};try{st=JSON.parse(localStorage.getItem(SK)||'{}')}catch(e){}
if(st.t0&&st.v!==3&&!st.fin)st={};/* alter Ablauf (Lesen zuerst) -> neu beginnen */
st.sel=st.sel||{};st.vis=st.vis||{};st.el=st.el||{};st.lock=st.lock||{};st.cur=st.cur||{};st.began=st.began||{};
const save=()=>{try{localStorage.setItem(SK,JSON.stringify(st))}catch(e){}};
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const now=()=>Date.now();
let cur='lesen',aud=null,graceT=null;
function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toast.i);toast.i=setTimeout(()=>t.hidden=true,2400)}
const fmt=ms=>{ms=Math.max(0,ms);const s=Math.ceil(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
/* ---------- Zeit ---------- */
// Uhren: lesen, hoeren, schreiben, vorb, gespr. Aktiv ist immer höchstens eine.
function used(k){return (st.el[k]||0)+(st.act===k&&st.since?now()-st.since:0)}
function budget(k){return k==='hoeren'&&st.hb?st.hb:B[k]}
function rem(k){return st.lock[k]?0:budget(k)-used(k)}
function commit(){if(st.act&&st.since){st.el[st.act]=(st.el[st.act]||0)+now()-st.since}st.since=now()}
function setAct(k){commit();st.act=k;st.since=k?now():0;save()}
function clockOf(sec){return sec==='sprechen'?(st.talk?'gespr':'vorb'):sec}
/* ---------- Verfügbarkeit ---------- */
function avail(s){if(!st.t0)return false;if(st.fin)return true;
 if(s==='lesen')return true;
 if(s==='hoeren')return !!st.lock.lesen;
 if(s==='schreiben')return !!st.lock.hoeren;
 if(s==='sprechen')return !!st.lock.schreiben;
 return false}
function tabs(){
 $$('.sbtn').forEach(b=>{const s=b.dataset.t;b.disabled=s==='antworten'?!st.fin:!avail(s);b.classList.toggle('on',s===cur);b.classList.toggle('end',!!st.lock[s])});
 const h=$('#sidehint');
 h.textContent=st.fin?'Prüfung abgegeben.':!st.lock.lesen?'Lesen und Sprachbausteine laufen zusammen 90 Minuten. Danach folgt Hören.':!st.lock.hoeren?'Hören läuft. Schreiben und Sprechen sind danach frei.':!st.lock.schreiben?'Als Nächstes: Schreiben (30 Minuten).':'Zum Schluss: Sprechen (20 Minuten Vorbereitung, ca. 15 Minuten Gespräch).';
 const b=$('#endcur');const ok=!st.fin&&SECS.includes(cur)&&!st.lock[cur]&&st.began[cur];
 b.hidden=!ok;if(ok)b.textContent=LAB[cur]+' beenden';
}
/* ---------- Navigation ---------- */
function go(s,keep){
 if(!st.fin&&s!=='antworten'&&!avail(s))return;
 if(s==='antworten'&&!st.fin)return;
 if(SECS.includes(cur)&&cur!==s)leaveTask(cur);
 cur=s;st.where=s;
 if(!st.fin&&(s==='lesen'||s==='schreiben')&&!st.lock[s])st.began[s]=1;
 $$('main > section').forEach(x=>x.classList.toggle('on',x.id===s));
 $$('#lesen,#hoeren,#schreiben,#sprechen').forEach(x=>x.classList.toggle('gated',!st.lock[x.id]&&!st.fin&&!st.began[x.id]));
 if(TK[s]){showTask(s,st.cur[s]||0)}else{pal()}
 if(!st.fin){let tc=null;
  if((s==='lesen'||s==='schreiben')&&!st.lock[s])tc=s;
  else if(s==='hoeren'&&st.began.hoeren&&!st.lock.hoeren)tc='hoeren';
  else if(s==='sprechen'&&st.began.sprechen&&!st.lock.sprechen)tc=clockOf('sprechen');
  if(!st.paused)setAct(tc)}
 tabs();save();
 if(s==='antworten')window.scrollTo(0,0);
}
function leaveTask(sec){const i=st.cur[sec];if(i===undefined||!TK[sec])return;(TK[sec][i]||[]).forEach(k=>{st.vis[k]=1})}
function showTask(sec,i){
 if(st.cur[sec]!==undefined&&st.cur[sec]!==i)leaveTask(sec);
 st.cur[sec]=i;
 $$('#'+sec+' .task').forEach(t=>t.classList.toggle('on',+t.dataset.i===i));
 pal();save();
}
function pal(){
 const P=$('#pal');
 if(!TK[cur]){P.innerHTML='<h5>'+(cur==='antworten'?'Auswertung':LAB[cur]||'')+'</h5><p class="hint">'+(cur==='schreiben'?'Ein Brief oder eine E-Mail zu vier Leitpunkten. Etwa 80 bis 100 Wörter.':cur==='sprechen'?'Drei Teile: Kontakt aufnehmen, Thema vortragen, gemeinsam planen.':'')+'</p>';return}
 const ti=st.cur[cur]||0;let h='<h5>'+LAB[cur]+' · Aufgaben</h5><p class="hint">Klicken zum Springen</p>';
 const titles=meta.tt[cur];
 TK[cur].forEach((ks,idx)=>{
  h+='<div class="grp">'+esc(titles[idx])+'</div><div class="g">';
  ks.forEach(k=>{const e=EX[k],a=st.sel[k]!==undefined,v=st.vis[k]&&!a&&idx!==ti;
   h+='<a data-k="'+k+'" data-t="'+idx+'" class="'+(st.fin?(a?(String(KEY[k])===st.sel[k]?'r':'w'):'vis'):(a?'ans':v?'vis':''))+(idx===ti&&false?' curT':'')+'">'+e.n+'</a>'});
  h+='</div>'});
 h+=st.fin?'<div class="legend"><span class="l-a">richtig</span><span class="l-w">falsch</span><span class="l-v">nicht beantwortet</span></div>':'<div class="legend"><span class="l-a">beantwortet</span><span class="l-v">nicht beantwortet (übersprungen)</span><span class="l-n">noch nicht gesehen</span></div>';
 P.innerHTML=h;
 $$('#pal a').forEach(a=>a.onclick=()=>{showTask(cur,+a.dataset.t);const it=document.getElementById('i-'+a.dataset.k);if(it)it.scrollIntoView({block:'center',behavior:'smooth'})});
}
/* ---------- Antworten markieren ---------- */
document.addEventListener('change',e=>{const t=e.target;if(t.type==='radio'&&t.name&&KEY[t.name]!==undefined&&!st.fin){st.sel[t.name]=t.value;save();pal()}});
function restore(){Object.keys(st.sel).forEach(k=>{const r=document.querySelector('input[name="'+k+'"][value="'+st.sel[k]+'"]');if(r)r.checked=true})}
/* ---------- Abschnitte beenden ---------- */
function lockSec(s){commit();st.lock[s]=true;if(st.act===clockOf(s)||st.act===s){st.act=null;st.since=0}
 const sec=$('#'+s);sec.classList.add('locked');sec.classList.remove('gated');
 sec.querySelectorAll('input,textarea,select').forEach(x=>x.disabled=true);save()}
function endSec(s,msg){
 if(st.lock[s])return;
 if(s==='hoeren'){try{aud&&aud.pause()}catch(e){}clearInterval(graceT)}
 lockSec(s);leaveTask(s);
 toast(msg||(LAB[s]+' beendet, gespeichert'));
 if(s==='sprechen'){finalize();return}
 if(s==='sprechen'){finalize();return}
 go({lesen:'hoeren',hoeren:'schreiben',schreiben:'sprechen'}[s]);
 save()
}
/* ---------- Tick ---------- */
function tick(){
 if(!st.t0||st.fin)return;
 const a=st.act;
 let main,lab,sub,sl;
 const sc=clockOf(SECS.includes(cur)?cur:'lesen');
 if(cur==='antworten'){$('#tm-main').textContent='—';$('#tm-sub').textContent='—';return}
 if(cur==='sprechen'||st.lock.schreiben){lab='Mündliche Prüfung';main=(st.talk?rem('gespr'):rem('vorb')+B.gespr)}
 else{lab='Schriftliche Prüfung (Rest)';main=rem('lesen')+rem('hoeren')+rem('schreiben')}
 sub=rem(sc);sl={lesen:'Lesen und Sprachbausteine',hoeren:'Hören',schreiben:'Schreiben',vorb:'Vorbereitung',gespr:'Gespräch'}[sc];
 $('#tm-l').textContent=lab;$('#tm-main').textContent=fmt(main);$('#tm-sl').textContent=sl;
 $('#tm-sub').textContent=st.began[cur]?fmt(sub):fmt(budget(sc));
 $('.bc').classList.toggle('low',sub<=5*M60&&st.began[cur]&&!st.lock[cur]);
 if(a&&!st.lock[a==='vorb'||a==='gespr'?'sprechen':a]&&rem(a)<=0){
   if(a==='vorb'){setTalk()}else endSec(a==='gespr'?'sprechen':a,'Die Zeit ist abgelaufen. Ihre Antworten sind gespeichert.')}
 if(Math.floor(now()/1000)%5===0)save();
}
/* ---------- Hören ---------- */
function setupAudio(){
 aud=$('#aud');if(!aud)return;
 aud.addEventListener('loadedmetadata',()=>{if(isFinite(aud.duration)&&aud.duration>60&&!st.began.hoeren){st.hb=Math.ceil(aud.duration*1000)+120000;save();tick()}});
 aud.addEventListener('timeupdate',()=>{if(aud.duration){$('#aprog').style.width=(aud.currentTime/aud.duration*100)+'%'}});
 aud.addEventListener('pause',()=>{if(!aud.ended&&!holdAudio&&st.began.hoeren&&!st.lock.hoeren&&!st.hend){aud.play().catch(()=>{})}});
 aud.addEventListener('ended',()=>{st.hend=true;$('#hdone').disabled=false;aStat('Der Hörtext ist zu Ende. Ergänzen Sie jetzt Ihre Antworten. Dafür haben Sie noch zwei Minuten.');
   startGrace(120000);tabs();save()});
 aud.addEventListener('error',()=>{$('#noaudio').style.display='block';$('#hdone').disabled=false;st.hend=true;tabs()});
}
let graceMs=0,graceStart=0;
function startGrace(ms){clearInterval(graceT);graceMs=ms;graceStart=now();graceT=setInterval(()=>{if(st.lock.hoeren){clearInterval(graceT);return}if(now()-graceStart>graceMs){clearInterval(graceT);endSec('hoeren','Hören beendet, gespeichert')}},1000)}
function aStat(t){$('#astat').textContent=t}
function startHoeren(){
 if(st.lock.hoeren)return;
 st.began.hoeren=1;setAct('hoeren');$('#hoeren').classList.remove('gated');$('#hdone').disabled=false;save();tabs();
 aStat('Der Hörtext läuft. Er wird nur einmal abgespielt, jeder Text je nach Aufgabe ein- oder zweimal.');
 if(aud){const p=aud.play();if(p&&p.catch)p.catch(()=>{aStat('Das Audio konnte nicht automatisch starten. Klicken Sie auf „Audio starten“.');$('#aplay').hidden=false})}
 if(st.hend){$('#hdone').disabled=false}
}
/* ---------- Sprechen ---------- */
function setTalk(){commit();st.talk=1;st.el.vorb=B.vorb;setAct('gespr');$('#spprep').hidden=true;$('#sptalk').hidden=false;$('#spstart').hidden=true;toast('Das Gespräch beginnt. Die Vorbereitungszeit ist vorbei.');tabs();save()}
/* ---------- Abgabe ---------- */
function counts(){const o={};[['l','Lesen'],['s','Sprachbausteine'],['h','Hören']].forEach(([p])=>{const ks=Object.keys(KEY).filter(k=>k[0]===p);o[p]=[ks.filter(k=>st.sel[k]!==undefined).length,ks.length]});return o}
function score(p){return Object.keys(KEY).filter(k=>k[0]===p&&String(KEY[k])===st.sel[k]).length}
function pts(p){return Object.keys(KEY).filter(k=>k[0]===p&&String(KEY[k])===st.sel[k]).reduce((a,k)=>a+wt(k),0)}
function finalize(){
 commit();st.fin=true;st.sc={l:score('l'),s:score('s'),h:score('h')};st.pt={l:pts('l'),s:pts('s'),h:pts('h')};
 SECS.forEach(s=>{if(!st.lock[s])lockSec(s)});
 st.act=null;save();render();go('antworten');
}
function openFinish(){
 const c=counts();
 const rows=[['lesen','Lesen',c.l[0]+' von '+c.l[1]],['lesen','Sprachbausteine',c.s[0]+' von '+c.s[1]],['hoeren','Hören',c.h[0]+' von '+c.h[1]],['schreiben','Schreiben',((st.brief||'').trim().match(/\S+/g)||[]).length+' Wörter geschrieben']];
 $('#chk').innerHTML=rows.map(r=>'<div class="chk"><label><b>'+r[1]+'</b><small>'+r[2]+(st.lock[r[0]]?' · beendet':'')+'</small></label></div>').join('');
 $('#modal').hidden=false;$('#submit').disabled=false;
}
/* ---------- Auswertung ---------- */
function pct(a,b){return b?Math.round(a/b*100):0}
function inline(){if(aud){aud.controls=true;aud.removeAttribute('hidden');aud.style.cssText='display:block;width:100%;margin:8px 0 12px';if(!aud.paused&&st.fin)try{aud.pause()}catch(e){}
 const ap=$('#aplay');if(ap)ap.hidden=true;const hd=$('#hdone');if(hd)hd.hidden=true;const ec=$('#endcur');if(ec)ec.hidden=true;const as=$('#astat');if(as)as.textContent='Zum Nachhören: Wiedergabe, Pause und Vor- oder Zurückspulen mit der Leiste unten.'}
 Object.keys(KEY).forEach(k=>{const it=document.getElementById('i-'+k);if(!it)return;const sv=st.sel[k],a=String(KEY[k]);
 it.querySelectorAll('.opt').forEach(l=>{const i=l.querySelector('input');if(!i)return;l.classList.remove('is-correct','is-wrong');
  if(i.value===a)l.classList.add('is-correct');else if(sv!==undefined&&i.value===sv)l.classList.add('is-wrong');
  if(sv!==undefined)i.checked=(i.value===sv)});
 const qb=it.querySelector('.qb');const old=qb.querySelector('.inexp,.inres');if(old)old.remove();it.classList.toggle('q-ok',sv===a);it.classList.toggle('q-bad',sv!==a);
 const d=document.createElement('div');d.className='inexp';d.innerHTML=card(k,true);qb.appendChild(d)})}
function render(){
 const c=counts(),L=st.sc.l,S=st.sc.s,H=st.sc.h;
 const P=st.pt||{l:L*3.75,s:S*1.5,h:H*3.75},pl=P.l,ps=P.s,ph=P.h;
 $('#ans-sum').innerHTML='<div class="sum"><div><b>'+L+' / '+c.l[1]+'</b><small>Lesen · '+pl.toFixed(1).replace('.0','')+' von 75 Punkten</small></div><div><b>'+S+' / '+c.s[1]+'</b><small>Sprachbausteine · '+ps.toFixed(1).replace('.0','')+' von 30</small></div><div><b>'+H+' / '+c.h[1]+'</b><small>Hören · '+ph.toFixed(1).replace('.0','')+' von 75</small></div></div>';
 verdict();list();inline();pal();
 $('#schmodel').hidden=false;revWS();revSP();
}
function verdict(){
 const v=$('#verdict');if(!st.sc)return;
 const sch=parseFloat(st.ssch),spr=parseFloat(st.sspr);
 const P=st.pt||{l:st.sc.l*3.75,s:st.sc.s*1.5,h:st.sc.h*3.75},base=P.l+P.s+P.h;
 let t='<p><b>Schriftlich bisher:</b> '+base.toFixed(1).replace('.0','')+' von 180 Punkten (Lesen, Sprachbausteine, Hören). Dazu kommen höchstens 45 Punkte für Schreiben. Für „bestanden“ brauchen Sie im schriftlichen Teil 135 von 225 Punkten (60 %) und im mündlichen Teil 45 von 75 Punkten.</p>';
 if(!isNaN(sch)){const w=base+sch;t+='<p><b>Schriftlich mit Schreiben'+(st.mansch?'':' (Schätzung)')+':</b> '+w.toFixed(1).replace('.0','')+' von 225 · '+(w>=135?'<span class="tag ok">60 % erreicht</span>':'<span class="tag no">unter 60 %</span>')+'</p>'}
 if(!isNaN(spr)){t+='<p><b>Mündlich'+(st.mansp?'':' (Schätzung)')+':</b> '+spr+' von 75 · '+(spr>=45?'<span class="tag ok">60 % erreicht</span>':'<span class="tag no">unter 60 %</span>')+'</p>'}
 if(!isNaN(sch)&&!isNaN(spr)){const tot=base+sch+spr,ok=base+sch>=135&&spr>=45;t+='<p><b>Gesamt:</b> '+tot.toFixed(1).replace('.0','')+' von 300 · <b>'+(ok?'Bestanden':'Nicht bestanden')+'</b>'+(ok?' ('+(tot>=270?'sehr gut':tot>=240?'gut':tot>=210?'befriedigend':'ausreichend')+')':'')+'</p>'}
 v.innerHTML=t;
}
function opt(e,i){return e.ot?(e.ot[i]):''}
function card(k,inl){
 const e=EX[k],s=st.sel[k],a=String(KEY[k]),ok=s===a,none=s===undefined;
 const cls=none?'w':ok?'r':'w';
 const show=v=>{if(v===undefined)return '<i>keine Antwort</i>';if(e.t==='mc'){const i='abc'.indexOf(v);return '<b>'+v+'</b> · '+esc(opt(e,i))}if(e.t==='rf')return '<b>'+(v==='r'?'richtig':'falsch')+'</b>';return '<b>'+esc(v)+'</b>'};
 if(inl)return '<div class="a-item inl '+cls+'"><div class="a-body"><p><span class="tag '+(ok?'ok':none?'nil':'no')+'">'+(ok?'richtig':none?'nicht beantwortet':'falsch')+'</span></p><p><span class="lab">Deine Antwort:</span> '+show(s)+'</p><p><span class="lab">Richtig:</span> '+show(a)+'</p><p class="mem"><span class="lab">Warum?</span> '+esc(e.why)+'</p></div></div>';
 return '<div class="a-item '+cls+'" data-ok="'+(ok?1:0)+'"><div class="a-head"><span>'+e.n+'</span><span class="tag '+(ok?'ok':'no')+'">'+(ok?'richtig':none?'offen':'falsch')+'</span><small>'+esc(e.tit)+'</small></div><div class="a-body"><p class="lab">Aufgabe</p><p>'+esc(e.q)+'</p><p><span class="lab">Ihre Antwort:</span> '+show(s)+'</p><p><span class="lab">Richtig:</span> '+show(a)+'</p><p class="mem"><span class="lab">Warum?</span> '+esc(e.why)+'</p></div></div>';
}
function list(f){
 f=f||st.filt||'wrong';st.filt=f;
 $$('.filter button').forEach(b=>b.classList.toggle('on',b.dataset.f===f));
 const ks=Object.keys(KEY).filter(k=>f==='all'||String(KEY[k])!==st.sel[k]);
 $('#ans-list').innerHTML=ks.length?ks.map(card).join(''):'<p class="hint">Alle Aufgaben waren richtig.</p>';
}
/* ---------- Schreiben ---------- */
function wc(){const n=((st.brief||'').trim().match(/\S+/g)||[]).length;const e=$('#wc');if(e)e.textContent=n+' Wörter (Ziel: 80 bis 100)'}
const WREG={sie:/\bSie\b|\bIhr(e|en|em|er|es)?\b|\bIhnen\b/,du:/\b(du|dich|dir|dein|deine|deinen|deinem|deiner|kannst|könntest|bist|hast|willst|musst)\b/i};
const wsN=t=>(t.match(/\S+/g)||[]).length;
const wsR=x=>Math.round(x*2)/2;
function wsLocal(t){const o=[];const m1=t.match(/\b(leider|außerdem|deshalb|deswegen|danach|dann|trotzdem)\s+(ich|wir|er|sie|du|man)\s+(kann|kannst|muss|habe|bin|will|möchte|werde|komme|bleibe|gehe)\b/i);if(m1)o.push('After „'+m1[1]+'“ the verb comes first: „'+m1[1]+' '+m1[3]+' '+m1[2]+' …“');if(/\b(Hallo|Hi)\s+(Frau|Herr)\b/.test(t))o.push('„Hallo Frau/Herr …“ does not fit. Use „Sehr geehrte Frau …“ (formal) or „Liebe/r + first name“ (informal).');return o}
function wsAnalyze(){const t=(st.brief||'').trim(),n=wsN(t),reg=meta.rg,kw=meta.kw,L=meta.wl;
 const hits=kw.map(r=>new RegExp(r,'i').test(t));const fi=hits.filter(Boolean).length/4;
 const formal=reg==='sie',hallo=/^\s*hallo\s+(herr|frau)/i.test(t);let anr;
 if(hallo)anr=0;else if(formal)anr=/^\s*sehr geehrte/i.test(t)?1:(/^\s*(liebe|lieber|guten tag)/i.test(t)?.5:0);else anr=/^\s*(liebe|lieber|hallo|hi)\b/i.test(t)?1:0;
 let gr;if(formal)gr=/mit freundlichen gr/i.test(t)?1:(/(viele|liebe|beste|herzliche|freundliche)\s+gr/i.test(t)?.5:0);else gr=/(gr(ü|ue)(ß|ss)e|bis bald|tsch(ü|ue)ss|lg\b|bis (freitag|samstag|sonntag|montag|dienstag|mittwoch|donnerstag))/i.test(t)?1:0;
 const hasS=WREG.sie.test(t.replace(/(^|[.!?]\s+)Sie\b/g,'$1 ')),hasD=WREG.du.test(t);let rg,rgTxt;
 if(reg==='sie'){if(hasD){rg=0;rgTxt='du-Form gefunden (hier: Sie)'}else if(hasS){rg=1.5;rgTxt='durchgehend Sie'}else{rg=.75;rgTxt='keine Anredeform erkannt'}}
 else{if(hasS){rg=0;rgTxt='Sie-Form gefunden (hier: du)'}else if(hasD){rg=1.5;rgTxt='durchgehend du'}else{rg=.75;rgTxt='keine Anredeform erkannt'}}
 const cs=['weil','deshalb','außerdem','aber','denn','trotzdem','obwohl','dass','deswegen','damit','wenn'].filter(c=>new RegExp('\\b'+c+'\\b','i').test(t));
 const con=cs.length>=2?.75:cs.length===1?.4:0,len=n>=80?.75:n>=60?.4:0;
 const ges=anr+gr+rg+con+len;
 return{n,hits,fi,ges,fg:ges/5,anr,gr,rg,rgTxt,cs,con,len,L}}
function wsForm(m,n){const r=n?m/n*100:99;return (r<=2?10:r<=5?8.5:r<=8?7:r<=12?5.5:r<=16?4:r<=22?2.5:r<=30?1:0)/10}
async function wsFetchLT(t,sp){const sig=((t.split(/\n/).pop())||'').split(/\s+/);const body=new URLSearchParams({text:t.replace(/\S+@\S+/g,'E-Mail'),language:'de-DE'});const r=await fetch('https://api.languagetool.org/v2/check',{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/x-www-form-urlencoded'},body});if(!r.ok)throw new Error('lt');const j=await r.json();return j.matches.filter(m=>{const c=m.rule.category.id;const bad=m.context.text.substr(m.context.offset,m.context.length);return!((sp&&(c==='CASING'||c==='PUNCTUATION'||/UPPERCASE|COMMA|SENTENCE_WHITESPACE|DASH/.test(m.rule.id)))||c==='STYLE'||c==='TYPOGRAPHY'||c==='REDUNDANCY'||m.rule.id==='WHITESPACE_RULE'||(m.rule.issueType==='misspelling'&&sig.includes(bad)))}).slice(0,40).map(m=>({bad:m.context.text.substr(m.context.offset,m.context.length),rep:(m.replacements[0]||{}).value||'',cat:m.rule.category.id}))}
const wsCat=c=>({TYPOS:'spelling',GRAMMAR:'grammar',CASING:'capital letters',PUNCTUATION:'punctuation',CONFUSED_WORDS:'wrong word',COMPOUNDING:'compound word'}[c]||'check');

/* ---------- Offizielle telc-Bewertung: Noten A/B/C/D ----------
   Schreiben: 3 Kriterien (Aufgabenbewältigung, Kommunikative Gestaltung, Formale Richtigkeit), A/B/C/D = 5/3/1/0, Summe mal 3 = max. 45.
   Sprechen: 4 Kriterien (Ausdrucksfähigkeit, Aufgabenbewältigung, Formale Richtigkeit, Aussprache und Intonation).
   Teil 1: 4/4/4/3 Punkte (A) = max. 15; Teil 2 und Teil 3: je 8/8/8/6 Punkte (A) = max. 30. B/C/D: 3/1/0 · 2/1/0 (Teil 1), 6/2/0 · 4/2/0 (Teil 2+3). */
const GR=(r,t)=>r>=t[0]?'A':r>=t[1]?'B':r>=t[2]?'C':'D';
const GNAME={A:'sehr gut',B:'gut',C:'ausreichend',D:'nicht ausreichend'};
const WGP={A:5,B:3,C:1,D:0};
const SPMAX=[[4,4,4,3],[8,8,8,6],[8,8,8,6]];
const SPSCALE={4:{A:4,B:3,C:1,D:0},3:{A:3,B:2,C:1,D:0},8:{A:8,B:6,C:2,D:0},6:{A:6,B:4,C:2,D:0}};
const SPCRIT=['Ausdrucksfähigkeit','Aufgabenbewältigung','Formale Richtigkeit','Aussprache und Intonation'];
const spPts=(part,ci,g)=>SPSCALE[SPMAX[part][ci]][g];
function setAuto(k,v){ // k: 'ssch' | 'sspr'
 const man=k==='ssch'?st.mansch:st.mansp;if(man)return;
 st[k]=String(v);const e=document.getElementById(k);if(e)e.value=st[k];save();verdict()}
function revWS(){const box=$('#wsrev');if(!box)return;const A=wsAnalyze(),t=(st.brief||'').trim(),key=t;
 const ltOk=st.lt&&st.lt.t===key,lfail=st.lt&&st.lt.t===key+'\u0000fail';
 const f=ok=>'<li class="'+(ok===1?'ok':ok===.5?'half':'no')+'">'+(ok===1?'✔ ':ok===.5?'◐ ':'✘ ');
 let h='<h4>Ihr Brief: automatische Schätzung</h4>';
 if(!t){box.innerHTML=h+'<p>Sie haben keinen Text geschrieben (0 / 45). Unten sehen Sie den Modellbrief.</p>';setAuto('ssch',0);return}
 const gI=GR(A.fi,[1,.75,.5]),gG=GR(A.fg,[.8,.55,.3]),gF=ltOk?GR(wsForm(st.lt.m.length,A.n),[.85,.55,.25]):null;
 const w3=g=>g===null?null:WGP[g],part=(w3(gI)+w3(gG))*3,tot=gF===null?null:(WGP[gI]+WGP[gG]+WGP[gF])*3;
 box.dataset.tot=tot===null?'':tot;
 if(tot!==null)setAuto('ssch',tot);
 const tile=(g,n)=>'<div><b>'+(g===null?'…':g)+'</b><small>'+n+(g===null?'':' · '+(WGP[g]*3)+' von 15')+'</small></div>';
 h+='<div class="sum"><div><b>'+(tot!==null?'≈ '+tot+' / 45':lfail?'≈ '+part+' / 30':'… / 45')+'</b><small>Schätzung'+(lfail?' ohne Formale Richtigkeit':'')+' · '+A.n+' Wörter</small></div>'+tile(gI,'Aufgabenbewältigung')+tile(gG,'Kommunikative Gestaltung')+tile(gF,'Formale Richtigkeit')+'</div>';
 h+='<p class="hint">Nach den offiziellen telc-Kriterien: drei Kriterien, jedes mit A, B, C oder D (5, 3, 1 oder 0 Punkte). Die Summe wird mit 3 multipliziert, höchstens 45 Punkte. Die Seite schätzt das nur grob: Sie sucht Schlüsselwörter, prüft Anrede, Gruß und Länge und zählt Fehler, und sie kann sich irren. Die Punkte werden automatisch eingetragen; überschreiben Sie sie, wenn Sie selbst oder mit „Brief für Claude kopieren“ bewerten. Der Grammatik-Check sendet Ihren Text an languagetool.org.</p>';
 h+='<p><b>Aufgabenbewältigung: die 4 Leitpunkte</b></p><ul class="rl">'+A.L.map((x,i)=>f(A.hits[i]?1:0)+esc(x)+(A.hits[i]?'':' – nicht erkannt')+'</li>').join('')+'</ul>';
 h+='<p><b>Kommunikative Gestaltung</b></p><ul class="rl">'+f(A.anr)+'Anrede'+(A.anr===.5?' (besser „Sehr geehrte …“)':A.anr===0?' fehlt oder passt nicht':'')+'</li>'+f(A.gr)+'Gruß'+(A.gr===.5?' (besser „Mit freundlichen Grüßen“)':A.gr===0?' fehlt oder passt nicht':'')+'</li>'+f(A.rg>=1.5?1:A.rg>0?.5:0)+'Anredeform: '+esc(A.rgTxt)+'</li>'+f(A.con>=.75?1:A.con>0?.5:0)+'Verbindungswörter: '+(A.cs.length?esc(A.cs.join(', ')):'keine')+'</li>'+f(A.len>=.75?1:A.len>0?.5:0)+'Länge: '+A.n+' Wörter (Ziel 80–100)</li></ul>';
 h+='<p><b>Formale Richtigkeit (Grammatik und Rechtschreibung)</b></p>';
 if(ltOk)h+=st.lt.m.length?'<p>'+st.lt.m.length+' mögliche Fehler:</p><ul class="rl">'+st.lt.m.map(m=>'<li class="no">✘ „'+esc(m.bad)+'“'+(m.rep?' → <b>'+esc(m.rep)+'</b>':'')+' <small>('+wsCat(m.cat)+')</small></li>').join('')+'</ul>':'<p>Keine Fehler gefunden. Sehr gut!</p>';
 else if(lfail)h+='<p>Der Grammatik-Check ist gerade nicht erreichbar (offline?). Die Punkte oben gelten ohne diesen Teil. Nutzen Sie „Brief für Claude kopieren“ für die vollständige Korrektur.</p>';
 else h+='<p>Grammatik wird geprüft …</p>';
 const loc=wsLocal(t);if(loc.length)h+='<ul class="rl">'+loc.map(x=>'<li class="no">✘ '+esc(x)+'</li>').join('')+'</ul>';
 h+='<p><button class="btn small" id="wscopy" type="button">Brief für Claude kopieren</button></p>';
 box.innerHTML=h;
 const cw=$('#wscopy');if(cw)cw.onclick=()=>copyWriting(cw);
 if(!ltOk&&!lfail&&!revWS.busy){revWS.busy=1;wsFetchLT(t).then(m=>{st.lt={t:key,m};save()}).catch(()=>{st.lt={t:key+'\u0000fail',m:[]};save()}).finally(()=>{revWS.busy=0;revWS()})}}

/* ---------- Sprechen: automatische Schätzung nach den telc-Kriterien ---------- */
const SPSTOP=new Set('ich du er sie es wir ihr und oder aber dass weil denn dann auch noch sehr mehr eine einen einem einer der die das den dem des ist sind war habe haben mit für von aus bei nach zum zur über unter auf wie was wer wo wann gemeinsam besprechen einigen sagen kurze danach'.split(' '));
const spW=t=>(String(t||'').toLowerCase().match(/[a-zäöüß]+/g)||[]);
const spKey=t=>[...new Set(spW(t).filter(w=>w.length>=5&&!SPSTOP.has(w)).map(w=>w.slice(0,5)))];
const spOv=(words,keys)=>{const a=new Set(words.filter(w=>w.length>=5).map(w=>w.slice(0,5)));return keys.filter(k=>a.has(k)).length};
const SPCONN=['weil','dass','aber','obwohl','deshalb','denn','wenn','außerdem','also','deswegen','trotzdem','damit','jedoch','sondern','zuerst','danach','dann','schließlich'];
const SPTG=[60,150,120];
function spAnalyze(){
 const rc=st.rc||{},P=[];let all='',tw=0;
 ['t1','t2','t3'].forEach((k,i)=>{const r=rc[k]||{},txt=(r.txt||'').trim(),low=txt.toLowerCase(),w=spW(txt),n=w.length;
  const sp=(meta.sp&&meta.sp[i])||{t:'Teil '+(i+1),x:''};let ch=[];
  if(i===0){ch=[['Name genannt',/ich hei(ß|ss)e|mein name|mein name ist/.test(low)],['Herkunft und Wohnort',/komme aus|wohne|lebe in|stamme/.test(low)],['Beruf oder Ausbildung',/arbeite|beruf|studiere|ausbildung|student|ingenieur|entwickler|schule/.test(low)],['Familie oder Hobbys',/familie|verheiratet|kinder|hobby|hobbys|freizeit|spiele|koche|lese|reise|sport/.test(low)],['Warum Deutsch',/lerne deutsch|deutsch lernen|deutschkurs|deutsch zu lernen|ich lerne/.test(low)],['Mindestens zwei Fragen an den Partner',(low.match(/und sie\b|und du\b|woher kommen|was machen|was sind|haben sie|hast du|wo wohnen|wie ist|was ist ihr|was gef(ä|ae)llt|und was|und wie|wie lange/g)||[]).length>=2]]}
  else if(i===1){const keys=spKey(sp.x.replace(/^Thema:[^.?]*[.?]?/,''));ch=[['Eigene Erfahrungen (Punkt 1)',/ich habe|ich bin|ich fahre|ich war|bei mir|meine erfahrung|ich mache|ich nutze|ich benutze|ich esse|ich arbeite|ich spiele|ich koche|ich lese/.test(low)],['Heimatland (Punkt 2)',/heimat|in indien|in meinem land|bei uns|in deutschland|dort|menschen in|leute in/.test(low)],['Vorteile (Punkt 3)',/vorteil|positiv|praktisch|billig|gesund|schnell|bequem|spart|g(ü|ue)nstig/.test(low)],['Nachteile (Punkt 3)',/nachteil|negativ|problem|schlecht|teuer|leider|gef(ä|ae)hrlich|anstrengend|stress/.test(low)],['Meinung (Punkt 4)',/meiner meinung|ich finde|ich denke|ich glaube|meiner ansicht|ich meine|ich bin der meinung/.test(low)],['Abschluss und Dank (Punkt 5)',/vielen dank|danke|aufmerksamkeit|zuh(ö|oe)ren/.test(low)],['Thema des Vortrags getroffen',spOv(w,keys)>=Math.min(2,keys.length)]]}
  else{const m=sp.x.split(/Besprechen Sie:/i)[1]||'';const bul=m.replace(/Einigen Sie sich\.?/i,'').split('·').map(x=>x.trim()).filter(Boolean);const bh=bul.map(x=>[x,spOv(w,spKey(x))>0]);const nb=bh.filter(x=>x[1]).length;
   ch=[['Planung: '+nb+' von '+bul.length+' Punkten besprochen',bul.length?nb>=Math.ceil(bul.length*.6):false],['Vorschlag gemacht (Wie wäre es …? Wir könnten …)',/wie w(ä|ae)re|ich schlage|wir k(ö|oe)nnten|vielleicht|was h(ä|ae)ltst|was meinst|lieber|ich finde/.test(low)],['Zugestimmt oder widersprochen (Gute Idee, einverstanden …)',/gute idee|einverstanden|stimmt|genau|ich finde auch|ja,? gern|okay|in ordnung|nicht so gut|leider/.test(low)],['Geeinigt (Dann machen wir …)',/dann machen wir|abgemacht|treffen wir|ich bringe|ich mache|ich kümmere|wir machen|dann ist|dann bringe|einverstanden/.test(low)]];}
  const ok=ch.filter(c=>c[1]).length,fr=n?ok/ch.length:0;
  const cs=SPCONN.filter(c=>w.includes(c)),uniq=n?new Set(w).size/n:0;
  const lenR=Math.min(1,n/SPTG[i]),div=n>=10?(uniq>=.6?1:uniq>=.45?.6:.3):0,conn=cs.length>=3?1:cs.length===2?.7:cs.length===1?.4:.1;
  const ausdr=n?.45*lenR+.25*div+.3*conn:0;
  const cf=r.cf&&r.cf[1]?r.cf[0]/r.cf[1]:null;
  P.push({k,i,txt,n,sec:r.sec||0,ch,fr,cs,lenR,ausdr,cf});all+=(txt?txt+'\n':'');tw+=n});
 return{P,all:all.trim(),tw}}
function spGrades(A,ltOk){ // returns {g:[[4 grades]x3], pts:[3], tot, assumed}
 const rate=ltOk&&A.tw?st.lt2.m.length/A.tw*100:null;const fr=rate===null?null:wsForm(st.lt2.m.length,A.tw);
 let assumed=false;const G=A.P.map(p=>{
  if(!p.n)return['D','D','D','D'];
  const g0=GR(p.ausdr,[.8,.55,.3]),g1=GR(p.fr,[.8,.55,.3]),g2=fr===null?null:GR(fr,[.85,.55,.25]);let g3;
  if(p.cf!==null)g3=GR(p.cf,[.85,.7,.5]);else{g3='B';assumed=true}
  return[g0,g1,g2,g3]});
 const pts=G.map((g,i)=>g.some(x=>x===null)?null:g.reduce((a,x,ci)=>a+spPts(i,ci,x),0));
 const tot=pts.every(x=>x!==null)?pts.reduce((a,b)=>a+b,0):null;
 return{G,pts,tot,assumed}}
function revSP(){const box=$('#sprev');if(!box)return;const A=spAnalyze(),key=A.all;
 const ltOk=A.tw&&st.lt2&&st.lt2.t===key,lfail=A.tw&&st.lt2&&st.lt2.t===key+'\u0000fail';
 let h='<h4>Ihr Sprechen: automatische Schätzung</h4>';
 if(!A.tw){box.innerHTML=h+'<p>Es gibt keinen Text von Ihren Aufnahmen (0 / 75). Nehmen Sie die drei Teile im Prüfungsteil „Sprechen“ auf; die Seite schreibt mit, was Sie sagen. Unten sehen Sie die Beispielantworten.</p>';setAuto('sspr',0);return}
 const R=spGrades(A,!!ltOk),pf=(p,ci)=>R.G[p][ci];
 if(R.tot!==null)setAuto('sspr',R.tot);
 const part=R.G.map((g,i)=>g.reduce((a,x,ci)=>a+(x===null?0:spPts(i,ci,x)),0));
 const pm=[15,30,30];
 h+='<div class="sum"><div><b>'+(R.tot!==null?'≈ '+R.tot+' / 75':lfail?'…':'… / 75')+'</b><small>Schätzung'+(R.assumed?' · Aussprache angenommen: B':'')+'</small></div>'+part.map((x,i)=>'<div><b>'+x+' / '+pm[i]+'</b><small>Teil '+(i+1)+'</small></div>').join('')+'</div>';
 h+='<p class="hint">Nach den offiziellen telc-Kriterien: vier Kriterien (Ausdrucksfähigkeit, Aufgabenbewältigung, Formale Richtigkeit, Aussprache und Intonation), je A bis D. Teil 1 zählt höchstens 15 Punkte, Teil 2 und Teil 3 je höchstens 30. In der echten Prüfung bewerten zwei Prüfende Ihr Gespräch. Diese Schätzung liest nur Ihren Text (Spracherkennung) und kann sich irren. Aussprache und Intonation sind nur über die Erkennungssicherheit des Browsers messbar; fehlt sie, wird B angenommen. Die Punkte werden automatisch eingetragen; überschreiben Sie sie, wenn Sie selbst oder mit Claude bewerten. Der Grammatik-Check sendet Ihren Text an languagetool.org.</p>';
 h+='<div class="tblw"><table class="sptbl"><thead><tr><th></th>'+['Teil 1','Teil 2','Teil 3'].map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+SPCRIT.map((c,ci)=>'<tr><td>'+c+'</td>'+[0,1,2].map(i=>{const g=R.G[i][ci];return'<td>'+(g===null?'…':'<b>'+g+'</b> <small>'+spPts(i,ci,g)+' / '+SPMAX[i][ci]+'</small>')+'</td>'}).join('')+'</tr>').join('')+'</tbody></table></div>';
 A.P.forEach((p,i)=>{h+='<p><b>Teil '+(i+1)+': '+(['Kontakt aufnehmen','Thema vortragen','Gemeinsam planen'][i])+'</b> <small>('+p.n+' Wörter'+(p.sec?', '+fmt(p.sec*1000):'')+')</small></p>';
  h+=p.n?'<ul class="rl">'+p.ch.map(c=>'<li class="'+(c[1]?'ok':'no')+'">'+(c[1]?'✔ ':'✘ ')+esc(c[0])+'</li>').join('')+'<li class="'+(p.cs.length>=2?'ok':p.cs.length?'half':'no')+'">'+(p.cs.length>=2?'✔ ':p.cs.length?'◐ ':'✘ ')+'Verbindungswörter: '+(p.cs.length?esc(p.cs.join(', ')):'keine')+'</li></ul>':'<p>Kein Text für diesen Teil.</p>'});
 h+='<p><b>Formale Richtigkeit (Grammatik)</b></p>';
 if(ltOk)h+=st.lt2.m.length?'<p>'+st.lt2.m.length+' mögliche Fehler:</p><ul class="rl">'+st.lt2.m.map(m=>'<li class="no">✘ „'+esc(m.bad)+'“'+(m.rep?' → <b>'+esc(m.rep)+'</b>':'')+' <small>('+wsCat(m.cat)+')</small></li>').join('')+'</ul>':'<p>Keine Fehler gefunden. Sehr gut!</p>';
 else if(lfail)h+='<p>Der Grammatik-Check ist gerade nicht erreichbar (offline?). Ohne ihn gibt es keine Gesamtschätzung. Nutzen Sie „Texte für Claude kopieren“.</p>';
 else h+='<p>Grammatik wird geprüft …</p>';
 h+='<p><button class="btn small" id="spcopy2" type="button">Texte für Claude kopieren</button></p>';
 box.innerHTML=h;const c2=$('#spcopy2');if(c2)c2.onclick=copySprechen;
 if(!ltOk&&!lfail&&!revSP.busy){revSP.busy=1;wsFetchLT(key,true).then(m=>{st.lt2={t:key,m};save()}).catch(()=>{st.lt2={t:key+'\u0000fail',m:[]};save()}).finally(()=>{revSP.busy=0;revSP()})}}
function copyWriting(btn){const t=(st.brief||'').trim();
 const reg=meta.rg==='sie'?'formell, mit Sie':'informell, mit du';
 const tx='Bitte korrigiere und bewerte meinen Brief für die telc-Prüfung Deutsch B1 (Schriftlicher Ausdruck).\n\nTest: telc B1 Modelltest '+N+' (Thema: '+meta.theme+')\nAufgabe: '+meta.wtitle.replace(/^Schreiben:\s*/,'')+'\nAnrede: '+reg+'\n\nSituation:\n'+meta.wsit+'\n\nDiese 4 Leitpunkte müssen im Brief vorkommen:\n'+meta.wl.map((x,i)=>(i+1)+'. '+x).join('\n')+'\n\nVorgabe: '+meta.wlen+'\n\nMein Brief ('+wsN(t)+' Wörter):\n'+(t||'(nicht geschrieben)')+'\n\nBitte:\n1) Gib mir Punkte von 45 nach den telc-Kriterien (Aufgabenbewältigung, Kommunikative Gestaltung, Formale Richtigkeit): gib je Kriterium die Note A, B, C oder D (5, 3, 1 oder 0 Punkte), addiere und multipliziere mit 3 (maximal 45), mit kurzer Begründung.\n2) Prüfe jeden der 4 Leitpunkte einzeln: erfüllt, teilweise oder nicht.\n3) Zeige alle Fehler mit Korrektur und kurzer Erklärung.\n4) Gib eine korrigierte Fassung.\n5) Gib drei Tipps zum Üben.\nBitte erkläre alles auf Englisch (ich bin Anfänger).';
 const done=()=>{toast('Kopiert: Test, Thema, Aufgabe, 4 Leitpunkte und Ihr Brief');if(btn){const o=btn.dataset.o||btn.textContent;btn.dataset.o=o;btn.textContent='Kopiert ✔';setTimeout(()=>btn.textContent=o,2200)}};
 if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(tx).then(done,()=>fb(tx,done))}else fb(tx,done)
}
function fb(tx,done){const a=document.createElement('textarea');a.value=tx;a.style.position='fixed';a.style.opacity='0';document.body.appendChild(a);a.select();try{document.execCommand('copy');done()}catch(e){toast('Kopieren nicht möglich')}a.remove()}
/* ---------- Pause ---------- */
let holdAudio=false;
function pauseExam(){
 commit();st.paused=true;st.pact=st.act;st.act=null;st.since=0;
 if(aud&&st.began.hoeren&&!st.lock.hoeren){st.apos=aud.currentTime||0;holdAudio=true;try{aud.pause()}catch(e){}if(st.hend){clearInterval(graceT);st.gleft=Math.max(0,graceMs-(now()-graceStart))}}
 if(st.began.hoeren&&!st.lock.hoeren&&st.hend===undefined){}
 stopRec();save();
}
function resumeExam(){
 st.paused=false;st.act=st.pact||null;st.since=st.act?now():0;st.pact=null;
 if(aud&&st.began.hoeren&&!st.lock.hoeren&&st.hend&&st.gleft!==undefined){startGrace(st.gleft)}
 if(aud&&st.began.hoeren&&!st.lock.hoeren&&!st.hend){
  holdAudio=false;
  const go2=()=>{try{if(st.apos)aud.currentTime=st.apos}catch(e){};const p=aud.play();if(p&&p.catch)p.catch(()=>{$('#aplay').hidden=false;aStat('Klicken Sie auf „Audio starten“, um an der Stelle weiterzuhören.')})};
  if(aud.readyState>=1)go2();else aud.addEventListener('loadedmetadata',go2,{once:true});
 }
 save();
}
/* ---------- Aufnahme (Sprechen) ---------- */
const IDB='telc-mt-audio';let db=null,rec=null,recPart=null,recT0=0,recIv=null,recog=null,recChunks=[],recStream=null,recTxt='';
function idb(){return new Promise((res,rej)=>{if(db)return res(db);const r=indexedDB.open(IDB,1);r.onupgradeneeded=()=>r.result.createObjectStore('a');r.onsuccess=()=>{db=r.result;res(db)};r.onerror=()=>rej(r.error)})}
function idbPut(k,v){return idb().then(d=>new Promise((res,rej)=>{const t=d.transaction('a','readwrite');t.objectStore('a').put(v,k);t.oncomplete=res;t.onerror=()=>rej(t.error)}))}
function idbGet(k){return idb().then(d=>new Promise((res,rej)=>{const q=d.transaction('a').objectStore('a').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)}))}
function recRows(){st.rc=st.rc||{};$$('.rrow').forEach(row=>{const p=row.dataset.p;const c=st.rc[p];
 const t=row.querySelector('.rtx');if(c&&c.txt!==undefined)t.value=c.txt;
 row.querySelector('.rt').textContent=c&&c.sec?fmt(c.sec*1000):'00:00';
 if(c&&c.aud)idbGet(SK+':'+p).then(b=>{if(b){const a=row.querySelector('audio');a.src=URL.createObjectURL(b);a.hidden=false}}).catch(()=>{});
 t.oninput=()=>{st.rc[p]=st.rc[p]||{};st.rc[p].txt=t.value;save()};
 row.querySelector('.rb').onclick=()=>toggleRec(row,p)})}
async function toggleRec(row,p){
 if(rec){stopRec();return}
 if(!navigator.mediaDevices||!window.MediaRecorder){toast('Aufnahme wird von diesem Browser nicht unterstützt');return}
 try{recStream=await navigator.mediaDevices.getUserMedia({audio:true})}catch(e){toast('Kein Zugriff auf das Mikrofon');return}
 recChunks=[];rec=new MediaRecorder(recStream);recPart=p;recT0=now();recTxt=(st.rc[p]&&st.rc[p].txt)||'';
 rec.ondataavailable=e=>{if(e.data.size)recChunks.push(e.data)};
 rec.onstop=()=>{const blob=new Blob(recChunks,{type:rec.mimeType||'audio/webm'});const sec=Math.round((now()-recT0)/1000);st.rc[p]=st.rc[p]||{};st.rc[p].sec=sec;st.rc[p].aud=1;
  idbPut(SK+':'+p,blob).catch(()=>{});const a=row.querySelector('audio');a.src=URL.createObjectURL(blob);a.hidden=false;row.querySelector('.rt').textContent=fmt(sec*1000);
  recStream.getTracks().forEach(t=>t.stop());rec=null;recPart=null;row.querySelector('.rb').textContent='Aufnahme starten';row.classList.remove('live');save()};
 rec.start();row.classList.add('live');row.querySelector('.rb').textContent='Aufnahme beenden';
 clearInterval(recIv);recIv=setInterval(()=>{row.querySelector('.rt').textContent=fmt(now()-recT0)},300);
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(SR){try{recog=new SR();recog.lang='de-DE';recog.continuous=true;recog.interimResults=true;
  recog.onresult=ev=>{let fin='',int='';for(let i=ev.resultIndex;i<ev.results.length;i++){const r=ev.results[i];if(r.isFinal)fin+=r[0].transcript+' ';else int+=r[0].transcript}
   if(fin)recTxt+=(recTxt&&!/\s$/.test(recTxt)?' ':'')+fin;for(let i=ev.resultIndex;i<ev.results.length;i++){const r=ev.results[i];if(r.isFinal&&r[0].confidence>0){st.rc[p]=st.rc[p]||{};const c=st.rc[p].cf||[0,0];st.rc[p].cf=[c[0]+r[0].confidence,c[1]+1]}}const t=row.querySelector('.rtx');t.value=recTxt+int;st.rc[p]=st.rc[p]||{};st.rc[p].txt=t.value;save()};
  recog.onend=()=>{if(rec&&recPart===p){try{recog.start()}catch(e){}}};recog.start()}catch(e){recog=null}}
}
function stopRec(){clearInterval(recIv);try{recog&&(recog.onend=null,recog.stop())}catch(e){}recog=null;try{rec&&rec.state!=='inactive'&&rec.stop()}catch(e){}}
function copySprechen(){
 const parts=[...$$('.rrow')].map(r=>{const c=st.rc[r.dataset.p]||{};return '['+r.dataset.n+'] Dauer: '+fmt((c.sec||0)*1000)+'\nText: '+(c.txt||'(keine Eingabe)')}).join('\n\n');
 const tx='Bitte bewerte meine Antworten im telc-B1-Modelltest '+N+' (Sprechen) nach den offiziellen telc-Kriterien: Ausdrucksfähigkeit, Aufgabenbewältigung, Formale Richtigkeit, Aussprache und Intonation (je A, B, C oder D). Teil 1 zählt höchstens 15 Punkte, Teil 2 und Teil 3 je höchstens 30, zusammen maximal 75. Aussprache kann ich nur über den Text zeigen. Zeige Fehler, erkläre sie kurz auf Englisch und gib eine bessere Version.\n\n'+parts+'\n\nNotizen:\n'+(st.notes||'');
 const done=()=>toast('Kopiert. Füge den Text jetzt in Claude ein.');
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(tx).then(done,()=>fb(tx,done));else fb(tx,done)
}
/* ---------- Start ---------- */
function showApp(){$('#start').hidden=true;$('#app').hidden=false}
function begin(){
 if(!st.t0){st.t0=now();st.v=3;st.act=null;st.since=0;save()}
 else if(st.paused){resumeExam()}
 else{st.since=st.act?now():0}
 showApp();
 if(st.began.sprechen&&!st.lock.sprechen){if(st.talk){$('#sptalk').hidden=false}else{$('#spprep').hidden=false}}
 if(st.began.hoeren&&!st.lock.hoeren){$('#hdone').disabled=false;if(st.hend&&!st.paused&&st.gleft!==undefined&&!graceMs)startGrace(st.gleft)}
 const w=st.where&&(st.fin||avail(st.where))?st.where:'lesen';
 go(st.fin?'antworten':w);
 if(st.fin)render();
}
function bind(){
 $('#begin').onclick=()=>begin();
 const r=$('#reset');if(r){r.hidden=!st.t0;r.onclick=()=>{if(confirm('Alle Antworten und Zeiten dieses Tests löschen und neu beginnen?')){try{localStorage.removeItem(SK)}catch(e){}location.reload()}}}
 const b=$('#begin');if(st.t0&&!st.fin)b.textContent='Prüfung fortsetzen';if(st.fin)b.textContent='Ergebnis ansehen';
 const goAway=u=>{
  if(!st.t0||st.fin){location.href=u;return}
  if(confirm('Sie sind mitten in der Prüfung. Jetzt speichern und zur Startseite gehen? Alle Uhren (auch Hören) stoppen und Ihre Antworten bleiben. Später machen Sie genau an dieser Stelle weiter.')){pauseExam();location.href=u}};$('#home').onclick=()=>goAway('../../../');$('#telcb').onclick=()=>goAway('../');
 $$('.sbtn').forEach(x=>x.onclick=()=>go(x.dataset.t));
 $$('[data-begin]').forEach(x=>x.onclick=()=>{const k=x.dataset.begin;st.began[k]=1;st.talk=st.talk||0;
   if(k==='hoeren'){startHoeren();go('hoeren');return}
   if(k==='sprechen'){setAct('vorb');$('#spprep').hidden=false}
   save();go(k)});
 $('#endcur').onclick=()=>{if(confirm(LAB[cur]+' jetzt beenden? Danach können Sie nichts mehr ändern.'))endSec(cur)};
 $$('[data-endsec]').forEach(x=>x.onclick=()=>{if(confirm('Jetzt beenden? Danach können Sie nichts mehr ändern.'))endSec(x.dataset.endsec)});
 $('#hdone').onclick=()=>{if(confirm('Hören jetzt beenden?'))endSec('hoeren')};
 $('#aplay').onclick=()=>{aud&&aud.play();$('#aplay').hidden=true;aStat('Der Hörtext läuft.')};
 $$('[data-next]').forEach(x=>x.onclick=()=>{const sec=x.closest('section').id;const i=(st.cur[sec]||0)+1;if(i<TK[sec].length)showTask(sec,i);else toast('Das war die letzte Aufgabe in diesem Teil.');window.scrollTo(0,0)});
 $$('[data-prev]').forEach(x=>x.onclick=()=>{const sec=x.closest('section').id;const i=(st.cur[sec]||0)-1;if(i>=0)showTask(sec,i);window.scrollTo(0,0)});
 setInterval(()=>{if(st.t0&&!st.fin){commit();save();const d=new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});$$('.saved').forEach(x=>x.textContent='Automatisch gespeichert · '+d)}},5000);
 $('#finish').onclick=openFinish;$('#back').onclick=()=>$('#modal').hidden=true;
 $('#submit').onclick=()=>{$('#modal').hidden=true;finalize()};
 $$('.filter button').forEach(x=>x.onclick=()=>list(x.dataset.f));
 const br=$('#brief');if(br){br.value=st.brief||'';br.oninput=()=>{st.brief=br.value;wc();save()}}
 const cp=$('#copy');if(cp)cp.onclick=()=>copyWriting(cp);
 const ss=$('#ssch'),sp=$('#sspr');const rd=$('#redo');if(rd)rd.onclick=()=>{if(confirm('Alle Antworten und Zeiten dieses Tests löschen und die Prüfung neu beginnen?')){try{localStorage.removeItem(SK)}catch(e){}location.href=location.pathname}};
 if(ss){ss.value=st.ssch||'';ss.oninput=()=>{st.ssch=ss.value;st.mansch=ss.value.trim()===''?0:1;save();verdict();if(!st.mansch&&st.fin)revWS()}}
 if(sp){sp.value=st.sspr||'';sp.oninput=()=>{st.sspr=sp.value;st.mansp=sp.value.trim()===''?0:1;save();verdict();if(!st.mansp&&st.fin)revSP()}}
 const t=$('#sptalkbtn');if(t)t.onclick=setTalk;
 restore();wc();setupAudio();recRows();const cs=$('#copysp');if(cs)cs.onclick=copySprechen;
 document.addEventListener('visibilitychange',()=>{if(document.hidden){commit();save()}});
 window.addEventListener('pagehide',()=>{commit();save()});
 setInterval(tick,250);
}
bind();
if(st.t0&&/[?&]r=1/.test(location.search)&&$('#begin'))$('#begin').click();
if(st.fin&&st.t0){/* Ergebnis wird erst nach „Ergebnis ansehen“ gezeigt */}
})();
