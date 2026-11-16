(function(){const L=document.getElementById('list');let done=0;const today=new Date();const S={l:[],s:[],h:[]};
const pill=(t,c)=>'<span class="pill '+c+'">'+t+'</span>';
MOCKS.forEach(m=>{let st={};try{st=JSON.parse(localStorage.getItem('telc:mt:'+m.n)||'{}')}catch(e){}
let marks;
if(st.fin&&st.sc){done++;const c=st.sc;S.l.push(c.l/20);S.s.push(c.s/20);S.h.push(c.h/20);
const P=st.pt||{l:c.l*3.75,s:c.s*1.5,h:c.h*3.75},tot=P.l+P.s+P.h;
const f=x=>String(Math.round(x*10)/10).replace('.',','),pc=(x,m)=>Math.round(x/m*100)+' %',cl=(x,m)=>x/m>=.6?'b1':x/m>=.4?'a2':'lo';
const sch=parseFloat(st.ssch),spr=parseFloat(st.sspr),hs=!isNaN(sch),hp=!isNaN(spr),sec=(n,x,m)=>pill(n+' '+f(x)+'/'+m+' · '+pc(x,m),cl(x,m));
marks=sec('Lesen',P.l,75)+sec('Sprachb.',P.s,30)+sec('Hören',P.h,75);
if(hs){marks+=sec('Schreiben',sch,45);const sw=tot+sch;marks+=pill('Schriftlich '+f(sw)+'/225 · '+pc(sw,225)+' (nötig 135 · 60 %)',sw>=135?'b1':'lo')}
else marks+=pill('Schriftlich bisher '+f(tot)+'/180 · '+pc(tot,180)+' (Schreiben offen)','a2');
if(hp)marks+=pill('Mündlich '+f(spr)+'/75 · '+pc(spr,75)+' (nötig 45 · 60 %)',spr>=45?'b1':'lo');else marks+=pill('Sprechen offen','');
if(hs&&hp){const sw=tot+sch,all=sw+spr,ok=sw>=135&&spr>=45;marks+=pill((ok?'Bestanden ':'Nicht bestanden ')+f(all)+'/300 · '+pc(all,300),ok?'b1':'lo')}}
else marks=st.t0?pill('begonnen','a2'):pill('offen','');
const a=document.createElement('a');a.className='day';a.href=m.f+'/';
a.innerHTML='<div class="n">'+m.n+'</div><div class="t"><b>Modelltest '+m.n+'</b><br><small>'+m.th+'</small></div><div class="marks">'+marks+'</div>'+(st.t0?'<button class="btn ghost small rst" type="button">Zurücksetzen</button>':'');
const rb=a.querySelector('.rst');if(rb)rb.onclick=e=>{e.preventDefault();e.stopPropagation();if(confirm('Modelltest '+m.n+' zurücksetzen? Alle Antworten, Zeiten und Ergebnisse dieses Tests werden gelöscht.')){try{localStorage.removeItem('telc:mt:'+m.n)}catch(x){}location.reload()}};
L.appendChild(a)});
document.getElementById('bar').style.width=(done/MOCKS.length*100)+'%';
document.getElementById('sum').textContent=done+' von '+MOCKS.length+' Modelltests abgeschlossen.';
const avg=x=>x.length?x.reduce((a,b)=>a+b,0)/x.length:null;
const R=[['Lesen',avg(S.l)],['Sprachbausteine',avg(S.s)],['Hören',avg(S.h)]];
const vals=R.filter(r=>r[1]!==null);const min=vals.length>1?Math.min(...vals.map(r=>r[1])):null;
const tile=(r)=>{const v=r[1],p=v===null?0:Math.round(v*100),weak=vals.length>1&&v===min,col=v===null?'#5b6f8c':p>=60?'#2fbf85':p>=40?'#f0a22e':'#ef6a5b';
return '<div class="stat'+(weak?' weak':'')+'"><div class="top"><small>Ø '+(r[0]==='Sprachbausteine'?'Sprachb.':r[0])+'</small>'+(weak?'<span class="up">üben</span>':'')+'</div><b>'+(v===null?'–':p+' %')+'</b><div class="m"><i style="width:'+p+'%;background:'+col+'"></i></div><span class="cap">'+(v===null?'noch kein Test':'der Aufgaben richtig')+'</span></div>'};
document.getElementById('stats').innerHTML='<div class="stat done"><div class="top"><small>Abgeschlossen</small></div><b>'+done+' <em>/ '+MOCKS.length+'</em></b><div class="dots">'+MOCKS.map((m,i)=>'<i class="'+(i<done?'on':'')+'"></i>').join('')+'</div><span class="cap">Modelltests</span></div>'+R.map(tile).join('');
const d=Math.ceil((new Date(EXAM+'T00:00:00')-today)/864e5);document.getElementById('count').textContent=d>0?'noch '+d+' Tage':'Prüfungstag';})();
