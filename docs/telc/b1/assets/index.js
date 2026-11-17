(function(){const L=document.getElementById('list');let done=0;const today=new Date();const S={l:[],s:[],h:[],w:[],p:[]};
const pill=(t,c)=>'<span class="pill '+c+'">'+t+'</span>';
MOCKS.forEach(m=>{let st={};try{st=JSON.parse(localStorage.getItem('telc:mt:'+m.n)||'{}')}catch(e){}
let marks;
if(st.fin&&st.sc){done++;const c=st.sc;
const P=st.pt||{l:c.l*3.75,s:c.s*1.5,h:c.h*3.75},tot=P.l+P.s+P.h;
S.l.push(P.l/75);S.s.push(P.s/30);S.h.push(P.h/75);const f=x=>String(Math.round(x*10)/10).replace('.',','),pc=(x,m)=>Math.round(x/m*100),col=q=>q>=60?'#1aa56c':q>=40?'#f0a22e':'#d6402f';
const sch=parseFloat(st.ssch),spr=parseFloat(st.sspr),hs=!isNaN(sch),hp=!isNaN(spr);
const row=(l,x,m,o)=>{o=o||{};if(x===null)return '<div class="rsrow"><span class="rsl">'+l+'</span><span class="rsv">offen</span><span class="rsp">–</span><div class="rsb"></div>'+(o.note?'<span class="rsn">'+o.note+'</span>':'')+'</div>';const q=pc(x,m),c=o.pass===undefined?col(q):(o.pass?'#1aa56c':'#d6402f');return '<div class="rsrow'+(o.grp?' grp':'')+'"><span class="rsl">'+l+'</span><span class="rsv"><b>'+f(x)+'</b> / '+m+'</span><span class="rsp" style="color:'+c+'">'+q+' %</span><div class="rsb"><i style="width:'+q+'%;background:'+c+'"></i>'+(o.need?'<u style="left:'+o.need+'%"></u>':'')+'</div>'+(o.note?'<span class="rsn">'+o.note+'</span>':'')+'</div>'};
const sw=hs?tot+sch:null,all=hs&&hp?sw+spr:null,okW=hs&&sw>=135,okM=hp&&spr>=45;
if(hs)S.w.push(sch/45);if(hp)S.p.push(spr/75);
marks='<div class="res"><div class="rscol">'+row('Lesen',P.l,75)+row('Sprachbausteine',P.s,30)+row('Hören',P.h,75)+row('Schreiben',hs?sch:null,45,{note:hs?'':'noch nicht bewertet'})+'</div><div class="rscol">'
+row('Schriftlich gesamt',sw,225,{grp:1,need:60,pass:hs?okW:undefined,note:'nötig: 135 von 225 (60 %) · bisher ohne Schreiben '+f(tot)+' / 180'})
+row('Mündlich (Sprechen)',hp?spr:null,75,{grp:1,need:60,pass:hp?okM:undefined,note:'nötig: 45 von 75 (60 %)'})
+(all!==null?'<div class="rsverd '+(okW&&okM?'ok':'no')+'">'+(okW&&okM?'Bestanden':'Nicht bestanden')+' <small>'+f(all)+' / 300 · '+pc(all,300)+' %</small></div>':'<div class="rsverd no" style="background:#eef1f5;color:#52627a">Gesamtergebnis offen <small>Schreiben und Sprechen fehlen</small></div>')+'</div></div>'}
else marks=st.t0?pill('begonnen','a2'):pill('offen','');
const a=document.createElement('a');a.className='day';a.href=m.f+'/';
a.innerHTML='<div class="n">'+m.n+'</div><div class="t"><b>Modelltest '+m.n+'</b><br><small>'+m.th+'</small></div><div class="marks">'+marks+'</div>'+(st.t0?'<button class="btn ghost small rst" type="button">Zurücksetzen</button>':'');
const rb=a.querySelector('.rst');if(rb)rb.onclick=e=>{e.preventDefault();e.stopPropagation();if(confirm('Modelltest '+m.n+' zurücksetzen? Alle Antworten, Zeiten und Ergebnisse dieses Tests werden gelöscht.')){try{localStorage.removeItem('telc:mt:'+m.n)}catch(x){}location.reload()}};
L.appendChild(a)});
document.getElementById('bar').style.width=(done/MOCKS.length*100)+'%';
document.getElementById('sum').textContent=done+' von '+MOCKS.length+' Modelltests abgeschlossen.';
const avg=x=>x.length?x.reduce((a,b)=>a+b,0)/x.length:null;
const R=[['Lesen',avg(S.l)],['Sprachbausteine',avg(S.s)],['Hören',avg(S.h)],['Schreiben',avg(S.w)],['Sprechen',avg(S.p)]];
const vals=R.filter(r=>r[1]!==null);const min=vals.length>1?Math.min(...vals.map(r=>r[1])):null;
const tile=(r)=>{const v=r[1],p=v===null?0:Math.round(v*100),weak=vals.length>1&&v===min,col=v===null?'#5b6f8c':p>=60?'#2fbf85':p>=40?'#f0a22e':'#ef6a5b';
return '<div class="stat'+(weak?' weak':'')+'"><div class="top"><small>Ø '+(r[0]==='Sprachbausteine'?'Sprachb.':r[0])+'</small>'+(weak?'<span class="up">üben</span>':'')+'</div><b>'+(v===null?'–':p+' %')+'</b><div class="m"><i style="width:'+p+'%;background:'+col+'"></i></div><span class="cap">'+(v===null?'noch kein Test':'der Punkte')+'</span></div>'};
document.getElementById('stats').innerHTML='<div class="stat done"><div class="top"><small>Abgeschlossen</small></div><b>'+done+' <em>/ '+MOCKS.length+'</em></b><div class="dots">'+MOCKS.map((m,i)=>'<i class="'+(i<done?'on':'')+'"></i>').join('')+'</div><span class="cap">Modelltests</span></div>'+R.map(tile).join('');
const d=Math.ceil((new Date(EXAM+'T00:00:00')-today)/864e5);document.getElementById('count').textContent=d>0?'noch '+d+' Tage':'Prüfungstag';})();
