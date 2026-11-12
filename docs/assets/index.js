
(function(){const L=document.getElementById('list');let done=0;const today=new Date();
MOCKS.forEach(m=>{let st={};try{st=JSON.parse(localStorage.getItem('dtz:'+m.n)||'{}')}catch(e){}
const hl=(st.h!==undefined&&st.l!==undefined)?st.h+st.l:null;if(st.done)done++;
const p=hl===null?'<span class="pill">offen</span>':'<span class="pill '+(hl>=33?'b1':'a2')+'">'+hl+'/45 '+(hl>=33?'B1':'A2')+'</span>';
const a=document.createElement('a');a.className='day';a.href=m.f+'/';a.innerHTML='<div class="n">'+m.n+'</div><div class="t"><b>Modelltest '+m.n+' · Tag '+m.n+'</b><br><small>'+m.d+' · '+m.th+'</small></div>'+p;L.appendChild(a)});
document.getElementById('bar').style.width=(done/MOCKS.length*100)+'%';document.getElementById('sum').textContent=done+' von '+MOCKS.length+' Modelltests abgeschlossen.';
const d=Math.ceil((new Date('2026-12-10T00:00:00')-today)/864e5);document.getElementById('count').textContent=d>0?'Noch '+d+' Tage':'Prüfungstag';})();
