
(function(){const L=document.getElementById('list');let done=0;const today=new Date();const S={h:[],l:[],s:[],p:[]};
const pill=(txt,cls)=>'<span class="pill '+cls+'">'+txt+'</span>';const LV=['A1','A2','B1'];
MOCKS.forEach(m=>{let st={};try{st=JSON.parse(localStorage.getItem('dtz:'+m.n)||'{}')}catch(e){}
let marks;if(st.fin){S.h.push(st.h/20);S.l.push(st.l/25);if(st.s!==undefined)S.s.push((+st.s+1)/3);if(st.p!==undefined)S.p.push((+st.p+1)/3);const hl=st.h+st.l;
marks=pill('Hören '+st.h+'/20',st.h>=15?'b1':st.h>=9?'a2':'lo')+pill('Lesen '+st.l+'/25',st.l>=18?'b1':st.l>=11?'a2':'lo')+pill('Σ '+hl+'/45',hl>=33?'b1':hl>=20?'a2':'lo')+pill('Schreiben '+(st.s!==undefined?LV[st.s]:'offen'),st.s==='2'?'b1':st.s==='1'?'a2':st.s==='0'?'lo':'')+pill('Sprechen '+(st.p!==undefined?LV[st.p]:'offen'),st.p==='2'?'b1':st.p==='1'?'a2':st.p==='0'?'lo':'');if(st.done)done++}
else marks=st.t0?pill('begonnen','a2'):pill('offen','');
const a=document.createElement('a');a.className='day';const d0=new Date(2026,10,12+m.n);if(d0.toDateString()===today.toDateString())a.className+=' today';a.href=m.f+'/';
a.innerHTML='<div class="n">'+m.n+'</div><div class="t"><b>Modelltest '+m.n+'</b><br><small>'+m.d+' · '+m.th+'</small></div><div class="marks">'+marks+'</div>';L.appendChild(a)});
document.getElementById('bar').style.width=(done/MOCKS.length*100)+'%';document.getElementById('sum').textContent=done+' von '+MOCKS.length+' Modelltests komplett abgeschlossen.';
const avg=x=>x.length?x.reduce((a,b)=>a+b,0)/x.length:null;const R=[['Hören',avg(S.h)],['Lesen',avg(S.l)],['Schreiben',avg(S.s)],['Sprechen',avg(S.p)]];
const vals=R.filter(r=>r[1]!==null);const min=vals.length>1?Math.min(...vals.map(r=>r[1])):null;
document.getElementById('stats').innerHTML=R.map(r=>'<div class="stat'+(r[1]!==null&&r[1]===min&&vals.length>1?' weak':'')+'"><small>'+r[0]+'</small><b>'+(r[1]===null?'–':Math.round(r[1]*100)+' %')+'</b><div class="m"><i style="width:'+(r[1]===null?0:r[1]*100)+'%"></i></div></div>').join('');
const d=Math.ceil((new Date('2026-12-10T00:00:00')-today)/864e5);document.getElementById('count').textContent=d>0?'noch '+d+' Tage':'Prüfungstag';})();
