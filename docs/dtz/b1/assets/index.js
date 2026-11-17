
(function(){const L=document.getElementById('list');let done=0;const today=new Date();const S={h:[],l:[],s:[],p:[]};
const pill=(txt,cls)=>'<span class="pill '+cls+'">'+txt+'</span>';const LV=['A1','A2','B1'];const lvl=x=>x>=33?'B1':x>=20?'A2':'unter A2';
MOCKS.forEach(m=>{let st={};try{st=JSON.parse(localStorage.getItem('dtz:'+m.n)||'{}')}catch(e){}
let marks,gt='';if(st.fin){S.h.push(st.h/20);S.l.push(st.l/25);if(st.sw&&st.sw.m)S.s.push(st.sw.p/st.sw.m);if(st.ss&&st.ss.m)S.p.push(st.ss.p/st.ss.m);const hl=st.h+st.l;
const pc=(x,m)=>Math.round(x/m*100),col=q=>q>=73?'#1aa56c':q>=44?'#f0a22e':'#d6402f';
const row=(l,x,m,o)=>{o=o||{};const q=pc(x,m),c=o.c||col(q);return '<div class="rsrow'+(o.grp?' grp':'')+'"><span class="rsl">'+l+'</span><span class="rsv"><b>'+x+'</b> / '+m+(o.lv?' · '+o.lv:'')+'</span><span class="rsp" style="color:'+c+'">'+q+' %</span><div class="rsb"><i style="width:'+q+'%;background:'+c+'"></i>'+(o.need?'<u style="left:'+o.need+'%"></u>':'')+'</div>'+(o.note?'<span class="rsn">'+o.note+'</span>':'')+'</div>'};
const sw=st.sw&&st.sw.m?st.sw:null,ss=st.ss&&st.ss.m?st.ss:null;
marks='<div class="res"><div class="rscol">'+row('Hören',st.h,20,{note:'kein Einzelwert – zählt in Hören + Lesen'})+row('Lesen',st.l,25,{note:'kein Einzelwert – zählt in Hören + Lesen'})+row('Hören + Lesen',hl,45,{grp:1,need:73,c:hl>=33?'#1aa56c':hl>=20?'#f0a22e':'#d6402f',lv:lvl(hl),note:'B1 nötig: 33 von 45 (73 %) · A2: 20 (44 %)'})+'</div><div class="rscol">'
+(sw?row('Schreiben (Schätzung)',sw.p,sw.m,{grp:1,need:70,lv:st.s!==undefined?LV[st.s]:'',c:st.s==='2'?'#1aa56c':'#d6402f',note:'B1-Richtwert der App: 70 % – nicht amtlich'}):'<div class="rsrow"><span class="rsl">Schreiben</span><span class="rsv">'+(st.s!==undefined?LV[st.s]:'offen')+'</span><span class="rsp">–</span><div class="rsb"></div></div>')
+(ss?row('Sprechen (Schätzung)',ss.p,ss.m,{grp:1,need:65,lv:st.p!==undefined?LV[st.p]:'',c:st.p==='2'?'#1aa56c':'#d6402f',note:'B1-Richtwert der App: 65 % – nicht amtlich'}):'<div class="rsrow"><span class="rsl">Sprechen</span><span class="rsv">'+(st.p!==undefined?LV[st.p]:'offen')+'</span><span class="rsp">–</span><div class="rsb"></div></div>')+'</div></div>';gt=(()=>{if(st.p===undefined||st.s===undefined)return'<div class="gtot open"><small>Gesamt</small><b>offen</b></div>';const P=+st.p,S=+st.s;const o=P===2&&(hl>=33||S===2)?2:(P>=1&&(hl>=20||S>=1))?1:0;return'<div class="gtot '+(o===2?'ok':'bad')+'"><small>Gesamt</small><b>'+LV[o]+'</b></div>'})();if(st.done)done++}
else marks=st.t0?pill('begonnen','a2'):pill('offen','');
const a=document.createElement('a');a.className='day';const d0=new Date(2026,10,12+m.n);if(d0.toDateString()===today.toDateString())a.className+=' today';a.href=m.f+'/';
a.innerHTML='<div class="n">'+m.n+'</div><div class="t"><b>Modelltest '+m.n+'</b></div><div class="marks">'+marks+'</div>'+gt+(st.t0?'<button class="btn ghost small rst">Zurücksetzen</button>':'');
const rb=a.querySelector('.rst');if(rb)rb.onclick=e=>{e.preventDefault();e.stopPropagation();if(confirm('Modelltest '+m.n+' zurücksetzen? Alle Antworten, Zeiten und Ergebnisse dieses Tests werden gelöscht.')){try{localStorage.removeItem('dtz:'+m.n)}catch(x){}location.reload()}};L.appendChild(a)});
document.getElementById('bar').style.width=(done/MOCKS.length*100)+'%';document.getElementById('sum').textContent=done+' von '+MOCKS.length+' Modelltests komplett abgeschlossen.';
const avg=x=>x.length?x.reduce((a,b)=>a+b,0)/x.length:null;const R=[['Hören',avg(S.h)],['Lesen',avg(S.l)],['Schreiben',avg(S.s)],['Sprechen',avg(S.p)]];
const vals=R.filter(r=>r[1]!==null);const min=vals.length>1?Math.min(...vals.map(r=>r[1])):null;
document.getElementById('stats').innerHTML=R.map(r=>'<div class="stat'+(r[1]!==null&&r[1]===min&&vals.length>1?' weak':'')+'"><small>'+r[0]+'</small><b>'+(r[1]===null?'–':Math.round(r[1]*100)+' %')+'</b><div class="m"><i style="width:'+(r[1]===null?0:r[1]*100)+'%"></i></div></div>').join('');
})();
(function(def,key){let ex=def;try{ex=localStorage.getItem(key)||def}catch(e){}const th=document.querySelector('.theme');if(!th)return;
const fmt=s=>new Date(s+'T00:00:00').toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
function draw(){const d=Math.ceil((new Date(ex+'T00:00:00')-new Date(new Date().toDateString()))/864e5);
th.innerHTML='Prüfung am '+fmt(ex)+' · <span id="count">'+(d>0?'noch '+d+' Tage':d===0?'Prüfungstag':'Prüfung vorbei')+'</span> · <label>Prüfungsdatum ändern <input type="date" id="examin" value="'+ex+'" style="margin-left:6px;padding:3px 8px;border-radius:8px;border:1px solid #6f86a6;background:#ffffff14;color:#fff;font:inherit;color-scheme:dark"></label>';
document.getElementById('examin').onchange=e=>{if(!e.target.value)return;ex=e.target.value;try{localStorage.setItem(key,ex)}catch(x){}draw()}}
draw()})('2026-12-10','dtz:exam');
