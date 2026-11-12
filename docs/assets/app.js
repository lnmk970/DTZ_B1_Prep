
(function(){
const meta=JSON.parse(document.getElementById('meta').textContent),N=meta.n,KEY=meta.key,SK='dtz:'+N;
let st={};try{st=JSON.parse(localStorage.getItem(SK)||'{}')}catch(e){}
const save=()=>{try{localStorage.setItem(SK,JSON.stringify(st))}catch(e){}};
st.sel=st.sel||{};
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tabs button,section').forEach(x=>x.classList.remove('on'));b.classList.add('on');document.getElementById(b.dataset.t).classList.add('on');if(b.dataset.t==='ergebnis')fin();window.scrollTo(0,0)});
document.querySelectorAll('input[type=radio]').forEach(r=>{const n=r.name;if(st.sel[n]===r.value)r.checked=true;r.addEventListener('change',()=>{if(n==='s'||n==='p'){st[n]=r.value}else st.sel[n]=r.value;save()})});
['s','p'].forEach(n=>{if(st[n]!==undefined){const r=document.querySelector('input[name='+n+'][value="'+st[n]+'"]');if(r)r.checked=true}});
function ev(p){let ok=0,tot=0;Object.keys(KEY).filter(k=>k[0]===p).forEach(k=>{tot++;const box=document.querySelector('[data-q='+k+']');const s=st.sel[k];box.querySelectorAll('.opt').forEach((o,i)=>{o.classList.remove('right','wrong');if(i===KEY[k])o.classList.add('right');else if(String(i)===s)o.classList.add('wrong')});if(String(KEY[k])===s)ok++});st[p]=ok;save();
const lv=ok>=33?'B1':ok>=20?'A2':'unter A2';return ok}
function show(p){const ok=ev(p),tot=p==='h'?20:25;document.getElementById('res-'+p).textContent=ok+' von '+tot+' richtig ('+Math.round(ok/tot*100)+' %). Richtige Antworten sind grün, deine falschen rot.'}
document.querySelectorAll('[data-eval]').forEach(b=>b.onclick=()=>show(b.dataset.eval));
if(st.h!==undefined)document.getElementById('res-h').textContent='Zuletzt: '+st.h+' von 20 richtig.';
if(st.l!==undefined)document.getElementById('res-l').textContent='Zuletzt: '+st.l+' von 25 richtig.';
function fin(){const h=st.h,l=st.l;const hl=(h!==undefined&&l!==undefined)?h+l:null;const lv=['A1','A2','B1'];
let t='<p><b>Hören + Lesen:</b> '+(hl===null?'noch nicht ausgewertet':hl+' / 45 → '+(hl>=33?'B1':hl>=20?'A2':'unter A2'))+'</p><p><b>Schreiben (Selbsteinschätzung):</b> '+(st.s===undefined?'offen':lv[st.s])+'</p><p><b>Sprechen (Selbsteinschätzung):</b> '+(st.p===undefined?'offen':lv[st.p])+'</p>';
const hlB=hl!==null&&hl>=33,sB=st.s==='2',pB=st.p==='2';
if(hl!==null&&st.p!==undefined)t+='<h3>'+(pB&&(hlB||sB)?'✅ Gesamt: B1':'Noch nicht B1 – wiederhole die schwachen Teile')+'</h3>';
document.getElementById('final').innerHTML=t;st.done=(hl!==null&&st.p!==undefined);save()}
fin();
const ta=document.getElementById('brief');if(st.brief)ta.value=st.brief;const wc=()=>{const n=(ta.value.trim().match(/\S+/g)||[]).length;document.getElementById('wc').textContent=n+' Wörter';st.brief=ta.value;save()};ta.oninput=wc;wc();
document.getElementById('copy').onclick=()=>{ta.select();try{navigator.clipboard.writeText(ta.value)}catch(e){document.execCommand('copy')}};
document.querySelectorAll('.timer').forEach(t=>{let s=+t.dataset.min*60,iv=null;const sp=t.querySelector('span'),b=t.querySelector('button');const draw=()=>{sp.textContent=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};b.onclick=()=>{if(iv){clearInterval(iv);iv=null;b.textContent='Weiter'}else{b.textContent='Pause';iv=setInterval(()=>{s--;draw();if(s<=0){clearInterval(iv);sp.style.color='#dc2626'}},1000)}}});
const c=document.getElementById('count');const days=Math.ceil((new Date('2026-12-10T00:00:00')-new Date())/864e5);c.textContent=days>0?'Noch '+days+' Tage bis zur Prüfung':'Prüfungstag';
})();
