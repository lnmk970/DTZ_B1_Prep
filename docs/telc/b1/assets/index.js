(function(){const L=document.getElementById('list');let done=0;const today=new Date();const S={l:[],s:[],h:[]};
const pill=(t,c)=>'<span class="pill '+c+'">'+t+'</span>';
MOCKS.forEach(m=>{let st={};try{st=JSON.parse(localStorage.getItem('telc:mt:'+m.n)||'{}')}catch(e){}
let marks;
if(st.fin&&st.sc){done++;const c=st.sc;S.l.push(c.l/20);S.s.push(c.s/20);S.h.push(c.h/20);
const P=st.pt||{l:c.l*3.75,s:c.s*1.5,h:c.h*3.75},tot=P.l+P.s+P.h;
marks=pill('Lesen '+c.l+'/20',c.l>=14?'b1':c.l>=9?'a2':'lo')+pill('Sprachb. '+c.s+'/20',c.s>=14?'b1':c.s>=9?'a2':'lo')+pill('Hören '+c.h+'/20',c.h>=14?'b1':c.h>=9?'a2':'lo')+pill('Σ '+String(tot).replace(/\.0$/,'')+'/180',tot>=108?'b1':tot>=72?'a2':'lo')}
else marks=st.t0?pill('begonnen','a2'):pill('offen','');
const a=document.createElement('a');a.className='day';a.href=m.f+'/';
a.innerHTML='<div class="n">'+m.n+'</div><div class="t"><b>Modelltest '+m.n+'</b><br><small>'+m.th+'</small></div><div class="marks">'+marks+'</div>'+(st.t0?'<button class="btn ghost small rst" type="button">Zurücksetzen</button>':'');
const rb=a.querySelector('.rst');if(rb)rb.onclick=e=>{e.preventDefault();e.stopPropagation();if(confirm('Modelltest '+m.n+' zurücksetzen? Alle Antworten, Zeiten und Ergebnisse dieses Tests werden gelöscht.')){try{localStorage.removeItem('telc:mt:'+m.n)}catch(x){}location.reload()}};
L.appendChild(a)});
document.getElementById('bar').style.width=(done/MOCKS.length*100)+'%';
document.getElementById('sum').textContent=done+' von '+MOCKS.length+' Modelltests abgeschlossen.';
const avg=x=>x.length?x.reduce((a,b)=>a+b,0)/x.length:null;
const R=[['Lesen',avg(S.l)],['Sprachbausteine',avg(S.s)],['Hören',avg(S.h)],['Getestet',done?done/MOCKS.length:null]];
const vals=R.slice(0,3).filter(r=>r[1]!==null);const min=vals.length>1?Math.min(...vals.map(r=>r[1])):null;
document.getElementById('stats').innerHTML=R.map((r,i)=>'<div class="stat'+(i<3&&r[1]!==null&&r[1]===min&&vals.length>1?' weak':'')+'"><small>'+r[0]+'</small><b>'+(r[1]===null?'–':Math.round(r[1]*100)+' %')+'</b><div class="m"><i style="width:'+(r[1]===null?0:Math.round(r[1]*100))+'%"></i></div></div>').join('');
const d=Math.ceil((new Date(EXAM+'T00:00:00')-today)/864e5);document.getElementById('count').textContent=d>0?'noch '+d+' Tage':'Prüfungstag';})();
