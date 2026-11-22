
const STORE='Diest';
const KPI_DEFS={
  omzet:{key:'Omzet',label:'Omzet',type:'bedrag',page:'omzet.html'},
  life:{key:'Life',label:'Life',type:'stuks',page:'life.html'},
  insurance:{key:'Insurance',label:'Insurance',type:'ratio',page:'insurance.html'},
  abonnementen:{key:'Abo',label:'Abonnementen',type:'ratio',page:'abonnementen.html'},
  dsp:{key:'DSP',label:'DSP',type:'ratio',page:'dsp.html'},
  spg:{key:'SPG',label:'SPG',type:'ratio',page:'spg.html'},
  srp:{key:'SRP',label:'SRP',type:'ratio',page:'srp.html'},
  accessoires:{key:'Accessoires',label:'Accessoires',type:'accessoires',page:'accessoires.html'},
  nps:{key:'NPS',label:'NPS',type:'score',page:'nps.html'},
  link:{key:'Link',label:'Link',type:'percentage',page:'link.html'},
  monster:{key:'Monster',label:'Monster',type:'bedrag'},
  buyway:{key:'BuyWay',label:'BuyWay',type:'ratio',page:'buyway.html'},
  leaders:{key:'Leaders',label:'Leaders',type:'ratio',page:'leaders.html'},
  s:{key:'S',label:'Laatste stuks - S',type:'percentage',page:'laatste-stuks.html'}
};
function n(v){ if(v===null||v===undefined||v==='')return 0; return Number(String(v).replace(',','.'))||0; }
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function todayIso(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function currentPeriod(){ const rows=window.DIESTROYERS_RESULTATEN||[]; const periods=[...new Set(rows.map(r=>String(r.Periode||'').trim()).filter(Boolean))].sort(); return periods.at(-1)||new Date().toISOString().slice(0,7); }
function rowsForPeriod(p=currentPeriod()){return (window.DIESTROYERS_RESULTATEN||[]).filter(r=>String(r.Periode||'').trim()===String(p||'').trim())}
function storeRow(p=currentPeriod()){return rowsForPeriod(p).find(r=>(r.EntiteitType||'').toLowerCase()==='winkel' || (r.Naam||'').toLowerCase()==='diest')||{};}
function sellerRows(p=currentPeriod()){return rowsForPeriod(p).filter(r=>(r.EntiteitType||'').toLowerCase()==='verkoper');}
function pct(a,b){return b? a/b*100:0}
function sTarget(){const m=(currentPeriod().split('-')[1]||''); return (m==='01'||m==='07')?50:35;}
function kpiValue(row,def){const k=def.key; if(k==='Link')return n(row.LinkPct); if(k==='S')return n(row.SRatio); if(def.type==='bedrag'||def.type==='stuks'||def.type==='score')return n(row[k]); if(def.type==='ratio')return pct(n(row[k+'Stuks']),n(row[k+'Kansen'])); if(def.type==='accessoires')return n(row.Accessoires); return n(row[k]);}
function kpiTarget(row,def){const k=def.key; if(k==='Link')return n(row.LinkTargetPct); if(k==='S')return sTarget(); if(def.type==='bedrag'||def.type==='stuks'||def.type==='score')return n(row[k+'Target']); if(def.type==='ratio')return n(row[k+'TargetPct']); if(def.type==='accessoires')return n(row.Omzet)*n(row.AccessoiresTargetPct)/100; return n(row[k+'Target']);}
function kpiPct(row,def){let val=kpiValue(row,def), tar=kpiTarget(row,def); return tar? val/tar*100:0;}
function fmt(v,type){v=n(v); if(type==='bedrag'||type==='accessoires')return new Intl.NumberFormat('nl-BE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(v); if(type==='ratio'||type==='percentage')return v.toFixed(1).replace('.',',')+'%'; if(type==='score')return v.toFixed(0); return String(Math.round(v));}
function behind(row,def){const k=def.key; let val=kpiValue(row,def), tar=kpiTarget(row,def); if(def.type==='ratio'){let kansen=n(row[k+'Kansen']), stuks=n(row[k+'Stuks']), target=n(row[k+'TargetPct']); return Math.max(0, Math.ceil(kansen*target/100 - stuks))+' stuks';} if(def.key==='Link') return Math.max(0, tar-val).toFixed(1).replace('.',',')+' procentpunt'; if(def.type==='accessoires') return fmt(Math.max(0,tar-val),'bedrag'); if(def.type==='bedrag') return fmt(Math.max(0,tar-val),'bedrag'); if(def.type==='score') return Math.max(0,tar-val).toFixed(0)+' punten'; return Math.max(0,Math.ceil(tar-val))+' stuks';}
const RANK_KEYS=['omzet','life','insurance','abonnementen','dsp','spg','srp','accessoires','nps','link','monster','buyway','leaders','s'];
function statusInfo(row,def){
  const tar=kpiTarget(row,def);
  const p=tar?kpiPct(row,def):0;
  if(!tar) return {pct:0,points:0,cls:'status-bad',scoreCls:'score-bad',label:'geen target'};
  if(p>=100) return {pct:p,points:3,cls:'status-ok',scoreCls:'score-ok',label:'gehaald'};
  if(p>=90) return {pct:p,points:1,cls:'status-close',scoreCls:'score-close',label:'binnen 10%'};
  return {pct:p,points:0,cls:'status-bad',scoreCls:'score-bad',label:'achter'};
}
function scoreRow(r){return RANK_KEYS.reduce((sum,k)=>sum+statusInfo(r,KPI_DEFS[k]||{}).points,0);}
function todoText(row,def){
  const st=statusInfo(row,def);
  if(st.points===3) return 'On track';
  const b=behind(row,def);
  return (b||'0').replace(/^nog\s+/i,'') + ' to do';
}
function cardFor(row,def,title,extraClass=''){
  const st=statusInfo(row,def);
  return `<div class="card result-card ${st.cls} ${extraClass}"><h3>${esc(title||def.label)}</h3><div class="metric">${esc(fmt(kpiValue(row,def),def.type))}</div><div class="muted">Target: ${esc(fmt(kpiTarget(row,def),def.type))}</div><div class="progress"><div class="bar" style="width:${Math.max(0,Math.min(120,st.pct))}%"></div></div><div class="todo ${st.scoreCls}">${esc(todoText(row,def))}</div></div>`
}
function card(title,value,target,def){return `<div class="card"><h3>${esc(title)}</h3><div class="metric">${esc(value)}</div><div class="muted">Target: ${esc(target)}</div><div class="progress"><div class="bar" style="width:0%"></div></div></div>`}
function drawLine(canvas, labels, values){
  if(!canvas)return;
  labels=(labels&&labels.length?labels:['']);
  values=(values&&values.length?values:[0]).map(n);
  const ctx=canvas.getContext('2d'), W=Math.max(240,canvas.offsetWidth||320), H=210;
  canvas.width=W*2; canvas.height=H*2; ctx.setTransform(2,0,0,2,0,0);
  ctx.clearRect(0,0,W,H);
  const pad=22;
  const max=Math.max(...values,1), min=Math.min(...values,0);
  const spread=(max===min)?1:(max-min);
  ctx.strokeStyle='rgba(255,255,255,.10)'; ctx.lineWidth=1;
  for(let i=0;i<3;i++){let y=pad+(H-2*pad)*i/2;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(W-pad,y);ctx.stroke();}
  const pts=values.map((v,i)=>[
    pad+(W-2*pad)*(values.length===1?0.5:i/(values.length-1)),
    H-pad-(H-2*pad)*((v-min)/spread)
  ]);
  ctx.strokeStyle='#e11919'; ctx.lineWidth=3; ctx.beginPath();
  pts.forEach((p,i)=>{ if(i)ctx.lineTo(p[0],p[1]); else ctx.moveTo(p[0],p[1]); });
  ctx.stroke();
  ctx.fillStyle='#e11919';
  pts.forEach(p=>{ctx.beginPath();ctx.arc(p[0],p[1],4,0,Math.PI*2);ctx.fill();});
  ctx.fillStyle='rgba(255,255,255,.68)'; ctx.font='11px Rajdhani';
  labels.forEach((l,i)=>{ if(labels.length<=1||i%Math.ceil(labels.length/4)===0){let x=pts[i][0];ctx.fillText(String(l).slice(5)||String(l),x-12,H-6);} });
}
function setupNav(){document.querySelector('.hamb')?.addEventListener('click',()=>document.querySelector('.menu')?.classList.toggle('open')); document.querySelectorAll('.dropdown .dropbtn').forEach(btn=>btn.addEventListener('click',e=>{if(matchMedia('(max-width:820px)').matches){e.preventDefault(); btn.closest('.dropdown').classList.toggle('open');}})); const f=location.pathname.split('/').pop()||'home.html'; document.querySelectorAll('a[href]').forEach(a=>{if(a.getAttribute('href')===f)a.classList.add('active')});}
function renderAgenda(){const root=document.getElementById('agenda-root'); if(!root)return; const items=(window.DIESTROYERS_AGENDA||[]).filter(i=>i.datum&&i.titel).sort((a,b)=>a.datum.localeCompare(b.datum)); const today=todayIso(); const todayItems=items.filter(i=>i.datum===today); const upcomingEdu=items.filter(i=>i.datum>=today && ['dagopleiding','avondopleiding','meeting'].includes(String(i.type).toLowerCase())).slice(0,9); const overview=items.filter(i=>i.datum>=today).slice(0,25); root.innerHTML=`<div class="agenda-layout"><div><h1 class="title">Agenda</h1>${todayItems.length?`<section class="section"><h2>Vandaag</h2><div class="cards">${todayItems.map(i=>`<div class="card agenda-card"><h3>${esc(i.titel)}</h3><span class="label float">${esc(i.type)}</span></div>`).join('')}</div></section>`:''}<section class="section"><h2>Aankomende opleidingen en meetings</h2><div class="cards">${upcomingEdu.length?upcomingEdu.map(i=>`<div class="card agenda-card"><h3>${esc(i.titel)}</h3><div class="muted">${esc(i.datum)}</div><p>${esc(i.info||'')}</p><span class="label float">${esc(i.type)}</span></div>`).join(''):'<div class="placeholder">Geen aankomende opleidingen of meetings.</div>'}</div></section></div><aside><section class="section"><h2>Overzicht</h2><div class="rightlist">${overview.length?overview.map(i=>`<div class="card mini agenda-compact"><h3>${esc(i.titel)}</h3><div class="muted">${esc(i.datum)}</div><span class="label float">${esc(i.type)}</span>${i.info?`<div class="agenda-detail">${esc(i.info)}</div>`:''}</div>`).join(''):'<div class="placeholder">Geen agenda-items gevonden.</div>'}</div></section></aside></div>`; document.querySelectorAll('.agenda-compact').forEach(c=>c.addEventListener('click',()=>c.classList.toggle('open')));}
function renderDiest(){const root=document.getElementById('diest-root'); if(!root)return; const p=currentPeriod(), row=storeRow(p), sellers=sellerRows(p).sort((a,b)=>scoreRow(b)-scoreRow(a)); const main=RANK_KEYS; root.innerHTML=`<div class="hero"><img src="assets/diest.png" class="logoimg"><div><h1 class="title">Diest</h1><div class="label">${p}</div></div></div><div class="cards diest-cards">${main.map(k=>{const d=KPI_DEFS[k]; return cardFor(row,d,d.label)}).join('')}</div><section class="section"><h2>Ranking & overzicht</h2><div class="tablewrap"><table class="table"><thead><tr><th>#</th><th>Naam</th>${main.map(k=>`<th>${KPI_DEFS[k].label}</th>`).join('')}<th>Score</th></tr></thead><tbody>${sellers.map((seller,i)=>`<tr><td>${i+1}</td><td><strong>${esc(seller.Naam)}</strong></td>${main.map(k=>{const d=KPI_DEFS[k]; const st=statusInfo(seller,d); return `<td class="${st.scoreCls}"><span class="score-dot"></span>${fmt(kpiValue(seller,d),d.type)}</td>`}).join('')}<td><strong>${scoreRow(seller)} pt</strong></td></tr>`).join('')}</tbody></table></div></section>`;}
function renderKpi(page){const root=document.getElementById('kpi-root'); if(!root)return; const slug=page.replace('.html',''), def=KPI_DEFS[slug]; if(!def){root.innerHTML='<div class="placeholder">KPI niet gevonden.</div>'; return;} const p=currentPeriod(), row=storeRow(p), sellers=sellerRows(p).sort((a,b)=>kpiPct(b,def)-kpiPct(a,def)); const periods=[...new Set((window.DIESTROYERS_RESULTATEN||[]).map(r=>r.Periode).filter(Boolean))].sort().slice(-12); const vals=periods.map(per=>kpiValue(storeRow(per),def)); root.innerHTML=`<div class="kpi-hero"><h1 class="title">${esc(def.label)}</h1>${cardFor(row,def,'Winkelresultaat','kpi-focus-card')}</div>${slug==='accessoires'?renderAccessoriesSubs(row,p):''}${renderDetailBlock(slug,row)}<section class="section kpi-main-grid"><div><h2>Voorbije maanden</h2><div class="canvasbox"><canvas id="trend"></canvas></div></div><div><h2>Ranking verkopers</h2><div class="tablewrap"><table class="table"><thead><tr><th>#</th><th>Naam</th><th>Resultaat</th><th>Target</th><th>Achterstand</th></tr></thead><tbody>${sellers.map((seller,i)=>{const si=statusInfo(seller,def); return `<tr><td>${i+1}</td><td><strong>${esc(seller.Naam)}</strong></td><td class="${si.scoreCls}"><span class="score-dot"></span>${fmt(kpiValue(seller,def),def.type)}</td><td>${fmt(kpiTarget(seller,def),def.type)}</td><td>${kpiPct(seller,def)>=100?'<span class="ok">On track</span>':'<span class="warn">'+esc(todoText(seller,def))+'</span>'}</td></tr>`}).join('')}</tbody></table></div></div></section>`; setTimeout(()=>drawLine(document.getElementById('trend'),periods,vals),0);}
function renderAccessoriesSubs(row,p){const link=KPI_DEFS.link, mon=KPI_DEFS.monster;return `<section class="section"><h2>Sub-KPI's</h2><div class="subgrid">${cardFor(row,link,'Link')}${cardFor(row,mon,'Monster')}</div></section>`}
function sellerTrendValues(name,def){const periods=[...new Set((window.DIESTROYERS_RESULTATEN||[]).map(r=>r.Periode).filter(Boolean))].sort().slice(-12); const vals=periods.map(per=>{const r=rowsForPeriod(per).find(x=>String(x.Naam).toLowerCase()===String(name).toLowerCase())||{}; return kpiValue(r,def);}); return {periods,vals};}
function renderSeller(name){const root=document.getElementById('seller-root'); if(!root)return; const p=currentPeriod(), rows=sellerRows(p), r=rows.find(x=>String(x.Naam).toLowerCase()===name.toLowerCase())||{}; const v=(window.DIESTROYERS_VERKOPERS||[]).find(x=>String(x.naam||x.Naam).toLowerCase()===name.toLowerCase())||{}; const main=RANK_KEYS; const sorted=[...rows].sort((a,b)=>scoreRow(b)-scoreRow(a)); const pos=sorted.findIndex(x=>x.Naam===r.Naam)+1; root.innerHTML=`<div class="seller-hero"><div><h1 class="title">${esc(name)}</h1><div class="pillrow"><span class="label">${p}</span><span class="label">Ranking #${pos||'-'}</span><span class="label">${scoreRow(r)} pt</span></div></div><img src="assets/${esc(v.avatar||v.Avatar||name+'.png')}" class="avatar seller-avatar"></div><div class="seller-kpi-list">${main.map((k,idx)=>{const d=KPI_DEFS[k];return `<div class="seller-kpi-row">${cardFor(r,d,d.label,'seller-result-card')}<div class="canvasbox seller-chart"><canvas id="seller-chart-${idx}"></canvas></div></div>`}).join('')}</div>`; setTimeout(()=>{main.forEach((k,idx)=>{const d=KPI_DEFS[k], tv=sellerTrendValues(name,d); drawLine(document.getElementById('seller-chart-'+idx),tv.periods,tv.vals);});},0);}
function renderIncentives(){return;}
function renderIncentiveFocus(i){const scores=(window.DIESTROYERS_INCENTIVE_SCORES||[]).filter(s=>s.incentiveId===i.id).sort((a,b)=>n(b.score)-n(a.score));return `<div class="card"><div class="pillrow"><span class="label">${esc(i.status||'')}</span><span class="label">${esc(i.type||'')}</span><span class="label">${esc(i.kpi||'')}</span></div><h2 class="title" style="font-size:48px">${esc(i.titel)}</h2><p>${esc(i.beschrijving||'')}</p><div class="cards"><div class="card"><h3>Doel</h3><div class="metric">${esc(i.doelstelling||'-')} ${esc(i.eenheid||'')}</div></div><div class="card"><h3>Beloning</h3><div class="metric" style="font-size:26px">${esc(i.beloning||'-')}</div></div><div class="card"><h3>Periode</h3><div class="metric" style="font-size:24px">${esc(i.startdatum||'-')}</div><div class="muted">tot ${esc(i.einddatum||'-')}</div></div></div><section class="section"><h2>Leaderboard</h2>${scores.length?`<div class="tablewrap"><table class="table"><tbody>${scores.map((s,idx)=>`<tr><td>${idx+1}</td><td>${esc(s.naam)}</td><td>${esc(s.score)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="placeholder">Nog geen tussenstand.</div>'}</section></div>`}
function renderMiniInc(i){return `<div class="card mini"><h3>${esc(i.titel)}</h3><div class="muted">${esc(i.startdatum||'')} ${i.einddatum?'– '+esc(i.einddatum):''}</div><span class="label float">${esc(i.status||i.type||'')}</span></div>`}
window.addEventListener('DOMContentLoaded',()=>{if(window.setupNav)window.setupNav(); const page=(location.pathname.split('/').pop()||'home.html'); renderAgenda(); if(window.renderDiest)window.renderDiest(); if(document.getElementById('kpi-root'))renderKpi(page); if(document.getElementById('seller-root')&&window.renderSeller)window.renderSeller(document.body.dataset.seller); if(window.renderSellersOverview)window.renderSellersOverview(); renderIncentives();});


/* Future-proof dynamic seller navigation and seller page.
   Internal key = PersoneelsNr. Display = Naam. */
function sellerId(v){ return String(v?.PersoneelsNr ?? v?.personeelsNr ?? v?.id ?? '').trim(); }
function sellerName(v){ return String(v?.Naam ?? v?.naam ?? '').trim(); }
function sellerAvatarFile(v){ return String(v?.Avatar ?? v?.avatar ?? '').trim(); }
function isActiveSeller(v){
  const a=String(v?.Actief ?? v?.actief ?? 'Ja').trim().toLowerCase();
  return !(a==='nee'||a==='no'||a==='0'||a==='false'||a==='n');
}
function activeSellers(){
  return (window.DIESTROYERS_VERKOPERS||[])
    .filter(v=>sellerName(v) && isActiveSeller(v))
    .sort((a,b)=>sellerName(a).localeCompare(sellerName(b),'nl'));
}
function sellerByIdOrName(value){
  const q=String(value||'').trim().toLowerCase();
  return (window.DIESTROYERS_VERKOPERS||[]).find(v=>sellerId(v).toLowerCase()===q)
      || (window.DIESTROYERS_VERKOPERS||[]).find(v=>sellerName(v).toLowerCase()===q)
      || null;
}
function sellerRows(p=currentPeriod()){
  const rows = rowsForPeriod(p).filter(r=>(r.EntiteitType||'').toLowerCase()==='verkoper');
  const active = activeSellers();
  if(!active.length) return rows;
  const activeIds = new Set(active.map(sellerId).filter(Boolean));
  const activeNames = new Set(active.map(v=>sellerName(v).toLowerCase()).filter(Boolean));
  return rows.filter(r=>{
    const rid=String(r.PersoneelsNr||r.personeelsNr||'').trim();
    if(rid && activeIds.size) return activeIds.has(rid);
    return activeNames.has(String(r.Naam||r.naam||'').trim().toLowerCase());
  });
}
function setupNav(){
  const menu=document.querySelector('.menu');
  document.querySelector('.hamb')?.addEventListener('click',()=>menu?.classList.toggle('open'));
  const dropdowns=document.querySelectorAll('.dropdown');
  const sellersSub=dropdowns[0]?.querySelector('.submenu');
  if(sellersSub){
    const links=['<a href="diest.html">Diest</a>'];
    activeSellers().forEach(v=>{
      const id=sellerId(v), name=sellerName(v);
      if(id && name) links.push(`<a href="verkoper.html?id=${encodeURIComponent(id)}">${esc(name)}</a>`);
    });
    sellersSub.innerHTML=links.join('');
  }
  dropdowns.forEach((dd,idx)=>{
    const btn=dd.querySelector('.dropbtn');
    if(idx===0 && btn) btn.setAttribute('href','diest.html');
    if(idx===1 && btn) btn.setAttribute('href','omzet.html');
    btn?.addEventListener('click',e=>{if(matchMedia('(max-width:820px)').matches){e.preventDefault(); dd.classList.toggle('open');}});
  });
  const file=location.pathname.split('/').pop()||'home.html';
  const params=new URLSearchParams(location.search);
  const currentId=params.get('id');
  document.querySelectorAll('a[href]').forEach(a=>{
    const href=a.getAttribute('href')||'';
    if(href===file) a.classList.add('active');
    if(file==='verkoper.html' && currentId && href.includes('verkoper.html?id=') && href.split('id=')[1]===encodeURIComponent(currentId)) a.classList.add('active');
  });
}
function renderSeller(input){
  const root=document.getElementById('seller-root'); if(!root)return;
  const params=new URLSearchParams(location.search);
  const id=params.get('id') || input || document.body.dataset.seller || '';
  const v=sellerByIdOrName(id) || {};
  const name=sellerName(v) || String(id||'Verkoper');
  const pid=sellerId(v);
  const p=currentPeriod(), rows=sellerRows(p);
  let r={};
  if(pid) r=rows.find(x=>String(x.PersoneelsNr||x.personeelsNr||'').trim()===pid) || {};
  if(!r.Naam) r=rows.find(x=>String(x.Naam||'').toLowerCase()===name.toLowerCase()) || {};
  const main=RANK_KEYS;
  const sorted=[...rows].sort((a,b)=>scoreRow(b)-scoreRow(a));
  const pos=sorted.findIndex(x=>{
    if(pid && String(x.PersoneelsNr||x.personeelsNr||'').trim()===pid) return true;
    return String(x.Naam||'').toLowerCase()===name.toLowerCase();
  })+1;
  const avatar=sellerAvatarFile(v) || (name.toLowerCase()+'.png');
  root.innerHTML=`<div class="seller-hero"><div><h1 class="title">${esc(name)}</h1><div class="pillrow"><span class="label">${p}</span><span class="label">Ranking #${pos||'-'}</span><span class="label">${scoreRow(r)} pt</span></div></div><img src="assets/${esc(avatar)}" class="avatar seller-avatar"></div><div class="seller-kpi-list">${main.map((k,idx)=>{const d=KPI_DEFS[k];return `<div class="seller-kpi-row">${cardFor(r,d,d.label,'seller-result-card')}<div class="canvasbox seller-chart"><canvas id="seller-chart-${idx}"></canvas></div></div>`}).join('')}</div>`;
  setTimeout(()=>{main.forEach((k,idx)=>{const d=KPI_DEFS[k], tv=sellerTrendValues(name,d); drawLine(document.getElementById('seller-chart-'+idx),tv.periods,tv.vals);});},0);
}


function detailRows(kpi, naam){
  const arr=window.DIESTROYERS_KPI_DETAIL||[];
  return arr.filter(x=>String(x.KPI||'').toLowerCase()===String(kpi||'').toLowerCase() && (!naam || String(x.Naam||'').toLowerCase()===String(naam||'').toLowerCase()));
}
function renderDetailBlock(slug,row){
  const name=row?.Naam||'';
  const detail=(window.DIESTROYERS_KPI_DETAIL||[]).filter(x=>!name || String(x.Naam||'').toLowerCase()===String(name).toLowerCase());
  const pick=(kpi,sub)=>detail.find(x=>String(x.KPI).toLowerCase()===kpi.toLowerCase() && (!sub || String(x.SubKPI).toLowerCase()===sub.toLowerCase()));
  const pill=(label,val,sub='')=>`<div class="card mini"><h3>${esc(label)}</h3><div class="metric">${esc(val||'—')}</div>${sub?`<div class="muted">${esc(sub)}</div>`:''}</div>`;
  if(slug==='insurance'){
    const m=pick('Insurance','Mobiel'), mm=pick('Insurance','Multimedia');
    return `<section class="section"><h2>Onderverdeling Insurance</h2><div class="subgrid">${pill('Mobiel',m?fmt(n(m.WaardePct),'ratio'):'—',m?`${n(m.Stuks)} / ${n(m.Kansen)}`:'')}${pill('Multimedia',mm?fmt(n(mm.WaardePct),'ratio'):'—',mm?`${n(mm.Stuks)} / ${n(mm.Kansen)}`:'')}</div></section>`;
  }
  if(slug==='link'){
    const subs=['GEM','PEM','RTV','COMM','MM'];
    return `<section class="section"><h2>Link per afdeling</h2><div class="subgrid">${subs.map(su=>{const x=pick('Link',su);return pill(su,x?fmt(n(x.WaardePct),'ratio'):'—');}).join('')}</div></section>`;
  }
  if(slug==='laatste-stuks'){
    const x=pick('S','');
    return `<section class="section"><h2>Laatste stuks - S</h2><div class="subgrid">${pill('Ratio',x?fmt(n(x.WaardePct),'ratio'):'—')}${pill('Stuks',x?n(x.Stuks):'—')}${pill('Euro',x?fmt(n(x.Waarde),'bedrag'):'—')}${pill('Vorig jaar',x&&n(x.VorigJaarPct)?fmt(n(x.VorigJaarPct),'ratio'):'—')}</div></section>`;
  }
  return '';
}



/* ============================================================
   Diestroyers V3 - Performance Dossiers
   Future-proof seller pages: verkoper.html?id=PersoneelsNr
   ============================================================ */
(function(){
  const KPI_PROFILE_KEYS = ['omzet','life','insurance','abonnementen','dsp','spg','srp','accessoires','link','monster','buyway','leaders','s','nps'];
  const KPI_TREND_KEYS = ['omzet','insurance','life','accessoires','link','buyway','leaders','s'];
  const DETAIL_KPIS = ['insurance','link','laatste-stuks'];
  function safeDef(key){return KPI_DEFS[key] || {key:key,label:key,type:'stuks'};}
  function sellerKeyFromRow(r){return String(r?.PersoneelsNr||r?.personeelsNr||'').trim();}
  function currentSellerRows(id,name){
    const p=currentPeriod();
    return rowsForPeriod(p).filter(r=>(String(r.EntiteitType||'').toLowerCase()==='verkoper') &&
      ((id && sellerKeyFromRow(r)===id) || (!id && String(r.Naam||'').toLowerCase()===String(name||'').toLowerCase())));
  }
  function allSellerRows(id,name){
    return (window.DIESTROYERS_RESULTATEN||[]).filter(r=>(String(r.EntiteitType||'').toLowerCase()==='verkoper') &&
      ((id && sellerKeyFromRow(r)===id) || (!id && String(r.Naam||'').toLowerCase()===String(name||'').toLowerCase())));
  }
  function rowPeriod(r){return String(r?.Periode||'').trim();}
  function rowsLast12(id,name){
    return allSellerRows(id,name).filter(r=>rowPeriod(r)).sort((a,b)=>rowPeriod(a).localeCompare(rowPeriod(b))).slice(-12);
  }
  function rowsYear(id,name,year){
    return allSellerRows(id,name).filter(r=>String(rowPeriod(r)).startsWith(String(year)+'-')).sort((a,b)=>rowPeriod(a).localeCompare(rowPeriod(b)));
  }
  function activeSellerRecordFromUrl(){
    const params = new URLSearchParams(location.search);
    const id = params.get('id') || params.get('pers') || '';
    const nm = params.get('naam') || document.body.dataset.seller || '';
    return sellerByIdOrName(id || nm) || {};
  }
  function sellerNameFromRowOrRecord(row,rec,fallback='Verkoper'){
    return sellerName(rec) || String(row?.Naam||fallback).trim();
  }
  function rowForSeller(id,name,period=currentPeriod()){
    const rows=rowsForPeriod(period).filter(r=>String(r.EntiteitType||'').toLowerCase()==='verkoper');
    return rows.find(r=>id && sellerKeyFromRow(r)===id) || rows.find(r=>String(r.Naam||'').toLowerCase()===String(name||'').toLowerCase()) || {};
  }
  function ytdMetric(rows,key){
    const def=safeDef(key);
    if(!rows.length) return {value:0, display:'—', raw:0};
    if(def.key==='Link' || def.key==='S' || def.type==='percentage' || def.type==='score'){
      const vals=rows.map(r=>kpiValue(r,def)).filter(v=>isFinite(v) && v!==0);
      const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
      return {value:avg, raw:avg, display:fmt(avg, def.type==='score'?'score':'ratio')};
    }
    if(def.type==='ratio'){
      const st=rows.reduce((a,r)=>a+n(r[def.key+'Stuks']),0);
      const ka=rows.reduce((a,r)=>a+n(r[def.key+'Kansen']),0);
      const val=ka?st/ka*100:0;
      return {value:val, raw:val, stuks:st, kansen:ka, display:fmt(val,'ratio')};
    }
    if(def.type==='accessoires'){
      const val=rows.reduce((a,r)=>a+n(r.Accessoires),0);
      return {value:val, raw:val, display:fmt(val,'bedrag')};
    }
    const val=rows.reduce((a,r)=>a+kpiValue(r,def),0);
    return {value:val, raw:val, display:fmt(val,def.type)};
  }
  function monthMetric(row,key){
    const def=safeDef(key);
    const val=kpiValue(row||{},def);
    return {value:val, raw:val, display:fmt(val,def.type)};
  }
  function metricSeries(id,name,key){
    const rows=rowsLast12(id,name);
    const def=safeDef(key);
    return {periods:rows.map(r=>rowPeriod(r)), vals:rows.map(r=>kpiValue(r,def)), rows};
  }
  function metricStats(id,name,key){
    const srs=metricSeries(id,name,key);
    const vals=srs.vals.filter(v=>isFinite(v));
    const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
    const best=vals.length?Math.max(...vals):0;
    const worst=vals.length?Math.min(...vals):0;
    const trend=vals.length>=2?vals.at(-1)-vals[Math.max(0,vals.length-4)]:0;
    return {avg,best,worst,trend,count:vals.length};
  }
  function statusFromPct(p){return p>=100?'ok':p>=90?'close':'bad'}
  function statusText(cls){return cls==='ok'?'On track':cls==='close'?'Binnen 10%':'Focus nodig'}
  function performancePct(row,key){
    const def=safeDef(key);
    const tar=kpiTarget(row||{},def);
    return tar?kpiPct(row||{},def):0;
  }
  function topAndGap(row){
    const scored=KPI_PROFILE_KEYS.map(k=>{
      const def=safeDef(k), p=performancePct(row,k), val=kpiValue(row||{},def);
      return {k,def,p,val};
    }).filter(x=>isFinite(x.p) && (x.p>0 || x.val>0));
    const strongest=[...scored].sort((a,b)=>b.p-a.p)[0];
    const gap=[...scored].filter(x=>x.def.key!=='NPS').sort((a,b)=>a.p-b.p)[0];
    return {strongest,gap};
  }
  function trendLabel(rows){
    if(rows.length<2) return 'Nieuwe data';
    const scores=rows.map(r=>KPI_PROFILE_KEYS.reduce((a,k)=>a+(statusInfo(r,safeDef(k)).points||0),0));
    const delta=scores.at(-1)-scores[Math.max(0,scores.length-4)];
    if(delta>2) return 'Stijgende trend';
    if(delta<-2) return 'Dalende trend';
    return 'Stabiele trend';
  }
  function dossierSummary(row,name){
    const tg=topAndGap(row);
    const strong=tg.strongest?tg.strongest.def.label:'nog geen duidelijke uitschieter';
    const gap=tg.gap?tg.gap.def.label:'geen uitgesproken aandachtspunt';
    return `${name} scoort momenteel het sterkst op ${strong}. De grootste groeikans zit in ${gap}.`;
  }
  function drawRadar(canvas, labels, values){
    if(!canvas) return;
    const box=canvas.getBoundingClientRect();
    const W=Math.max(320,box.width||360), H=Math.max(320,box.height||340);
    canvas.width=W*2; canvas.height=H*2;
    const ctx=canvas.getContext('2d'); ctx.setTransform(2,0,0,2,0,0);
    ctx.clearRect(0,0,W,H);
    const cx=W/2, cy=H/2+8, R=Math.min(W,H)*0.36;
    const max=120;
    ctx.font='13px Rajdhani'; ctx.textAlign='center'; ctx.textBaseline='middle';
    for(let ring=1; ring<=4; ring++){
      const r=R*ring/4;
      ctx.beginPath();
      labels.forEach((_,i)=>{
        const a=-Math.PI/2 + i*2*Math.PI/labels.length;
        const x=cx+Math.cos(a)*r, y=cy+Math.sin(a)*r;
        if(i)ctx.lineTo(x,y); else ctx.moveTo(x,y);
      });
      ctx.closePath(); ctx.strokeStyle='rgba(255,255,255,.12)'; ctx.lineWidth=1; ctx.stroke();
    }
    labels.forEach((lab,i)=>{
      const a=-Math.PI/2 + i*2*Math.PI/labels.length;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*R, cy+Math.sin(a)*R); ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.72)';
      ctx.fillText(String(lab).slice(0,11), cx+Math.cos(a)*(R+30), cy+Math.sin(a)*(R+25));
    });
    ctx.beginPath();
    values.forEach((v,i)=>{
      const r=R*Math.max(0,Math.min(max,v||0))/max;
      const a=-Math.PI/2 + i*2*Math.PI/labels.length;
      const x=cx+Math.cos(a)*r, y=cy+Math.sin(a)*r;
      if(i)ctx.lineTo(x,y); else ctx.moveTo(x,y);
    });
    ctx.closePath();
    ctx.fillStyle='rgba(225,25,25,.26)'; ctx.fill();
    ctx.strokeStyle='#e11919'; ctx.lineWidth=3; ctx.stroke();
    values.forEach((v,i)=>{
      const r=R*Math.max(0,Math.min(max,v||0))/max;
      const a=-Math.PI/2 + i*2*Math.PI/labels.length;
      ctx.beginPath(); ctx.arc(cx+Math.cos(a)*r, cy+Math.sin(a)*r, 4, 0, Math.PI*2); ctx.fillStyle='#e11919'; ctx.fill();
    });
  }
  function linkToSeller(v){
    const id=sellerId(v), name=sellerName(v);
    return id?`verkoper.html?id=${encodeURIComponent(id)}`:`verkoper.html?naam=${encodeURIComponent(name)}`;
  }
  function rankOf(row){
    const p=currentPeriod();
    const rows=sellerRows(p).sort((a,b)=>scoreRow(b)-scoreRow(a));
    const id=sellerKeyFromRow(row), nm=String(row?.Naam||'').toLowerCase();
    return rows.findIndex(x=>(id && sellerKeyFromRow(x)===id) || String(x.Naam||'').toLowerCase()===nm)+1;
  }
  function renderSellersOverview(){
    const root=document.getElementById('sellers-overview-root'); if(!root) return;
    const p=currentPeriod();
    const rows=sellerRows(p).sort((a,b)=>scoreRow(b)-scoreRow(a));
    const active=activeSellers();
    const cards=active.map(v=>{
      const id=sellerId(v), name=sellerName(v);
      const row=rows.find(r=>id && sellerKeyFromRow(r)===id) || rows.find(r=>String(r.Naam||'').toLowerCase()===name.toLowerCase()) || {};
      const tg=topAndGap(row);
      const av=sellerAvatarFile(v)||`${name}.png`;
      const rank=rankOf(row);
      return `<a class="seller-overview-card" href="${linkToSeller(v)}"><img src="assets/${esc(av)}" onerror="this.style.display='none'"><div><h3>${esc(name)}</h3><div class="seller-overview-meta"><span>#${rank||'-'}</span><span>${scoreRow(row)} pt</span><span>${esc(tg.strongest?tg.strongest.def.label:'opbouwen')}</span></div></div></a>`;
    }).join('');
    root.innerHTML=`<div class="hero"><div><h1 class="title">Performance Dossiers</h1><p class="muted" style="font-size:22px">Automatische verkopersdossiers op basis van maandhistoriek, KPI-detaildata en actieve verkopers uit de XLSM.</p></div></div><section class="section"><h2>Actieve verkopers</h2><div class="sellers-overview-grid">${cards||'<div class="placeholder">Geen actieve verkopers gevonden.</div>'}</div></section>`;
  }
  function renderSellerDossier(input){
    const root=document.getElementById('seller-root'); if(!root) return;
    const rec=activeSellerRecordFromUrl();
    const params=new URLSearchParams(location.search);
    const id=params.get('id') || sellerId(rec) || '';
    const name=sellerName(rec) || params.get('naam') || input || document.body.dataset.seller || '';
    const row=rowForSeller(id,name);
    const displayName=sellerNameFromRowOrRecord(row,rec,name);
    const pid=id || sellerKeyFromRow(row);
    const period=currentPeriod();
    const year=(period||new Date().getFullYear()).slice(0,4);
    const rows12=rowsLast12(pid,displayName);
    const rowsYtd=rowsYear(pid,displayName,year);
    const av=sellerAvatarFile(rec) || `${displayName}.png`;
    const rank=rankOf(row);
    const score=scoreRow(row);
    const maxScore=KPI_PROFILE_KEYS.length*3;
    const tg=topAndGap(row);
    const executive=dossierSummary(row,displayName);
    const trend=trendLabel(rows12);
    const radarKeys=['omzet','life','insurance','dsp','spg','srp','accessoires','link','buyway','leaders'];
    const radarLabels=radarKeys.map(k=>safeDef(k).label.replace('Abonnementen','Abo'));
    const radarVals=radarKeys.map(k=>performancePct(row,k));
    const healthCards=KPI_PROFILE_KEYS.map(k=>{
      const def=safeDef(k), st=statusInfo(row,def), stats=metricStats(pid,displayName,k), ym=ytdMetric(rowsYtd,k);
      const cls=statusFromPct(st.pct||0);
      return `<div class="health-card ${cls}"><div class="health-name">${esc(def.label)}</div><div class="health-value">${esc(fmt(kpiValue(row,def),def.type))}</div><div class="health-meta">YTD: ${esc(ym.display)} · 12m gem.: ${esc(fmt(stats.avg,def.type==='percentage'?'ratio':def.type))}</div><div class="health-status">${esc(statusText(cls))}</div></div>`;
    }).join('');
    const monthRows=KPI_PROFILE_KEYS.map(k=>{
      const def=safeDef(k), st=statusInfo(row,def), stats=metricStats(pid,displayName,k), ym=ytdMetric(rowsYtd,k);
      return `<tr><td><strong>${esc(def.label)}</strong></td><td class="num">${esc(fmt(kpiValue(row,def),def.type))}</td><td class="num">${esc(fmt(kpiTarget(row,def),def.type==='percentage'?'ratio':def.type))}</td><td class="num">${esc(ym.display)}</td><td class="num">${esc(fmt(stats.best,def.type==='percentage'?'ratio':def.type))}</td><td class="num">${esc(todoText(row,def))}</td><td class="num ${st.scoreCls}">${esc(st.label)}</td></tr>`;
    }).join('');
    const coaching=coachingItems(row,pid,displayName);
    const awards=awardItems(row,pid,displayName);
    root.innerHTML=`
      <section class="dossier-hero">
        <div class="dossier-hero-card">
          <div class="dossier-kicker">Performance Dossier</div>
          <h1 class="dossier-title">${esc(displayName)}</h1>
          <p class="dossier-summary">${esc(executive)}</p>
          <div class="dossier-pillrow">
            <span class="dossier-pill">Periode ${esc(period)}</span>
            <span class="dossier-pill">Ranking #${rank||'-'}</span>
            <span class="dossier-pill">${score}/${maxScore} punten</span>
            <span class="dossier-pill">${esc(trend)}</span>
          </div>
        </div>
        <div class="dossier-photo"><img src="assets/${esc(av)}" onerror="this.style.display='none'"></div>
      </section>

      <section class="dossier-grid">
        <div class="dossier-tile"><h3>Overall score</h3><div class="big">${score}/${maxScore}</div><div class="small">op basis van alle KPI's</div></div>
        <div class="dossier-tile"><h3>Sterkste KPI</h3><div class="big">${esc(tg.strongest?tg.strongest.def.label:'—')}</div><div class="small">${tg.strongest?fmt(tg.strongest.val,tg.strongest.def.type):'nog geen data'}</div></div>
        <div class="dossier-tile"><h3>Grootste groeikans</h3><div class="big">${esc(tg.gap?tg.gap.def.label:'—')}</div><div class="small">${tg.gap?Math.round(tg.gap.p)+'% van target':'nog geen data'}</div></div>
        <div class="dossier-tile"><h3>YTD maanden</h3><div class="big">${rowsYtd.length}</div><div class="small">maanden in historiek ${esc(year)}</div></div>
      </section>

      <section class="analysis-panel">
        <h2>KPI-profiel</h2>
        <div class="dossier-two">
          <div class="radarbox"><canvas id="sellerRadar"></canvas></div>
          <div class="kpi-health-grid">${healthCards}</div>
        </div>
      </section>

      <section class="analysis-panel">
        <h2>Maandbasis + jaarbasis</h2>
        <div class="tablewrap"><table class="dossier-table"><thead><tr><th>KPI</th><th>Maand</th><th>Target</th><th>YTD</th><th>Beste maand</th><th>Vandaag focus</th><th>Status</th></tr></thead><tbody>${monthRows}</tbody></table></div>
      </section>

      <section class="analysis-panel">
        <h2>Detailanalyse</h2>
        ${renderDeepDive(row,pid,displayName)}
      </section>

      <section class="analysis-panel">
        <h2>Trends laatste 12 maanden</h2>
        <div class="trend-grid">${KPI_TREND_KEYS.map((k,i)=>`<div class="trend-card"><h3>${esc(safeDef(k).label)}</h3><canvas id="trendV3_${i}"></canvas></div>`).join('')}</div>
      </section>

      <section class="analysis-panel">
        <h2>Benchmark met winkel</h2>
        <div class="benchmark-list">${renderBenchmark(row)}</div>
      </section>

      <section class="analysis-panel">
        <h2>Coaching & awards</h2>
        <div class="coach-grid">
          <div><h3>Focuspunten</h3><div class="coach-list">${coaching.map(x=>`<div class="coach-item">${esc(x)}</div>`).join('')}</div></div>
          <div><h3>Automatische awards</h3><div class="award-row">${awards.map(x=>`<span class="award-badge">${esc(x)}</span>`).join('') || '<span class="award-badge">In opbouw</span>'}</div></div>
        </div>
      </section>
    `;
    setTimeout(()=>{
      drawRadar(document.getElementById('sellerRadar'),radarLabels,radarVals);
      KPI_TREND_KEYS.forEach((k,i)=>{const s=metricSeries(pid,displayName,k); drawLine(document.getElementById('trendV3_'+i),s.periods,s.vals);});
    },0);
  }
  function renderDeepDive(row,id,name){
    const details=window.DIESTROYERS_KPI_DETAIL||[];
    const same=x=>((id && String(x.PersoneelsNr||'').trim()===id) || String(x.Naam||'').toLowerCase()===String(name).toLowerCase()) && String(x.Periode||'')===currentPeriod();
    const detail=details.filter(same);
    const pick=(k,sub)=>detail.find(x=>String(x.KPI||'').toLowerCase()===k.toLowerCase() && (!sub || String(x.SubKPI||'').toLowerCase()===sub.toLowerCase()));
    const ratioBlock=(title, items)=>`<div class="deep-card"><h3>${esc(title)}</h3>${items.map(([label,x])=>`<div class="deep-row"><span>${esc(label)}</span><strong>${x?esc(fmt(n(x.WaardePct),'ratio')):'—'}</strong></div>${x?`<div class="deep-row"><span>Stuks/kansen</span><strong>${esc(n(x.Stuks))}/${esc(n(x.Kansen))}</strong></div>`:''}`).join('')}</div>`;
    const insurance=ratioBlock('Insurance', [['Mobiel',pick('Insurance','Mobiel')],['Multimedia',pick('Insurance','Multimedia')]]);
    const linkSubs=['GEM','PEM','RTV','COMM','MM'].map(su=>[su,pick('Link',su)]);
    const link=`<div class="deep-card"><h3>Link</h3>${linkSubs.map(([label,x])=>`<div class="deep-row"><span>${esc(label)}</span><strong>${x?esc(fmt(n(x.WaardePct),'ratio')):'—'}</strong></div>`).join('')}</div>`;
    const s=pick('S','')||{};
    const sBlock=`<div class="deep-card"><h3>Laatste stuks - S</h3><div class="deep-row"><span>Ratio</span><strong>${s.WaardePct?esc(fmt(n(s.WaardePct),'ratio')):'—'}</strong></div><div class="deep-row"><span>Stuks</span><strong>${s.Stuks?esc(n(s.Stuks)):'—'}</strong></div><div class="deep-row"><span>Euro</span><strong>${s.Waarde?esc(fmt(n(s.Waarde),'bedrag')):'—'}</strong></div><div class="deep-row"><span>Vorig jaar</span><strong>${s.VorigJaarPct?esc(fmt(n(s.VorigJaarPct),'ratio')):'—'}</strong></div></div>`;
    const buyway=pick('BuyWay','')||{};
    const leaders=pick('Leaders','')||{};
    const extra=`<div class="deep-card"><h3>BuyWay / Leaders</h3><div class="deep-row"><span>BuyWay</span><strong>${buyway.WaardePct?esc(fmt(n(buyway.WaardePct),'ratio')):esc(fmt(kpiValue(row,safeDef('buyway')),'ratio'))}</strong></div><div class="deep-row"><span>Leaders</span><strong>${leaders.WaardePct?esc(fmt(n(leaders.WaardePct),'ratio')):esc(fmt(kpiValue(row,safeDef('leaders')),'ratio'))}</strong></div></div>`;
    return `<div class="deep-grid">${insurance}${link}${sBlock}${extra}</div>`;
  }
  function renderBenchmark(row){
    const store=storeRow(currentPeriod());
    return KPI_PROFILE_KEYS.filter(k=>k!=='nps').slice(0,12).map(k=>{
      const def=safeDef(k), sellerVal=kpiValue(row,def), storeVal=kpiValue(store,def);
      const max=Math.max(sellerVal,storeVal,1);
      return `<div class="benchmark-item"><div class="benchmark-head"><span>${esc(def.label)}</span><span>${esc(fmt(sellerVal,def.type))}</span></div><div class="benchmark-bars"><div class="benchmark-line"><span>Verkoper</span><div class="benchmark-bar"><div class="benchmark-fill" style="width:${Math.min(100,sellerVal/max*100)}%"></div></div><span>${esc(fmt(sellerVal,def.type))}</span></div><div class="benchmark-line"><span>Winkel</span><div class="benchmark-bar"><div class="benchmark-fill store" style="width:${Math.min(100,storeVal/max*100)}%"></div></div><span>${esc(fmt(storeVal,def.type))}</span></div></div></div>`;
    }).join('');
  }
  function coachingItems(row,id,name){
    const scored=KPI_PROFILE_KEYS.map(k=>({k,def:safeDef(k),p:performancePct(row,k),todo:todoText(row,safeDef(k))}))
      .filter(x=>x.def.key!=='NPS' && isFinite(x.p))
      .sort((a,b)=>a.p-b.p);
    const items=scored.slice(0,4).map(x=>`${x.def.label}: ${x.todo}`);
    return items.length?items:['Nog onvoldoende data voor coaching.'];
  }
  function awardItems(row,id,name){
    const awards=[];
    const checks=[
      ['Monster Hunter','monster'],['Life Hero','life'],['Insurance Master','insurance'],['DSP Legend','dsp'],['Link King','link'],['S Closer','s'],['Leaders Builder','leaders'],['BuyWay Driver','buyway']
    ];
    checks.forEach(([label,k])=>{if(performancePct(row,k)>=100) awards.push(label);});
    const score=scoreRow(row);
    if(score>=30) awards.unshift('Elite Performer');
    if(score>=24 && !awards.includes('Elite Performer')) awards.unshift('High Performer');
    return awards.slice(0,8);
  }
  function renderDiestV3(){
    const root=document.getElementById('diest-root'); if(!root)return;
    const p=currentPeriod(), row=storeRow(p), sellers=sellerRows(p).sort((a,b)=>scoreRow(b)-scoreRow(a));
    const main=RANK_KEYS;
    root.innerHTML=`<div class="hero"><img src="assets/diest.png" class="logoimg"><div><h1 class="title">Diest</h1><div class="label">${p}</div></div></div><div class="cards diest-cards">${main.map(k=>{const d=safeDef(k); return cardFor(row,d,d.label)}).join('')}</div><section class="section"><h2>Ranking & overzicht</h2><div class="tablewrap"><table class="table"><thead><tr><th>#</th><th>Naam</th>${main.map(k=>`<th>${safeDef(k).label}</th>`).join('')}<th>Score</th></tr></thead><tbody>${sellers.map((seller,i)=>{const rec=sellerByIdOrName(sellerKeyFromRow(seller)||seller.Naam)||{}; return `<tr><td>${i+1}</td><td><a href="${linkToSeller(rec)}"><strong>${esc(seller.Naam)}</strong></a></td>${main.map(k=>{const d=safeDef(k); const st=statusInfo(seller,d); return `<td class="${st.scoreCls}"><span class="score-dot"></span>${fmt(kpiValue(seller,d),d.type)}</td>`}).join('')}<td><strong>${scoreRow(seller)} pt</strong></td></tr>`}).join('')}</tbody></table></div></section>`;
  }
  function setupNavV3(){
    const menu=document.querySelector('.menu');
    document.querySelector('.hamb')?.addEventListener('click',()=>menu?.classList.toggle('open'));
    const dropdowns=document.querySelectorAll('.dropdown');
    const sellersSub=dropdowns[0]?.querySelector('.submenu');
    if(sellersSub){
      const links=['<a href="diest.html">Diest</a>','<a href="verkopersresultaten.html">Alle verkopers</a>'];
      activeSellers().forEach(v=>links.push(`<a href="${linkToSeller(v)}">${esc(sellerName(v))}</a>`));
      sellersSub.innerHTML=links.join('');
    }
    dropdowns.forEach((dd)=>{
      const btn=dd.querySelector('.dropbtn');
      btn?.addEventListener('click',e=>{if(matchMedia('(max-width:820px)').matches){e.preventDefault(); dd.classList.toggle('open');}});
    });
    const file=location.pathname.split('/').pop()||'home.html';
    document.querySelectorAll('a[href]').forEach(a=>{
      const href=a.getAttribute('href')||'';
      if(href===file) a.classList.add('active');
    });
  }
  window.renderSeller = renderSellerDossier;
  window.renderSellerDossier = renderSellerDossier;
  window.renderSellersOverview = renderSellersOverview;
  window.renderDiest = renderDiestV3;
  window.setupNav = setupNavV3;
  window.addEventListener('DOMContentLoaded',()=>{
    renderSellersOverview();
    if(document.getElementById('seller-root')) renderSellerDossier();
  });
})();

/* V3 emergency dossier rerender: ensures the dynamic dossier replaces legacy seller markup. */
window.addEventListener('load',()=>{
  if(document.getElementById('seller-root') && window.renderSellerDossier){
    window.renderSellerDossier();
  }
  if(document.getElementById('sellers-overview-root') && window.renderSellersOverview){
    window.renderSellersOverview();
  }
});



/* ============================================================
   Diestroyers V3.1 - Structured Performance Dossier
   Sections:
   1. YTD resultaten
   2. Maandresultaten met maandkeuze
   3. Awards & rankings
   4. Coaching
   ============================================================ */
(function(){
  const KPI_SET_V31 = ['omzet','life','insurance','abonnementen','dsp','spg','srp','accessoires','link','monster','buyway','leaders','s','nps'];
  const TREND_SET_V31 = ['omzet','insurance','life','accessoires','link','buyway','leaders','s'];

  function def31(k){return KPI_DEFS[k] || {key:k,label:k,type:'stuks'};}
  function sellerId31(v){return String(v?.PersoneelsNr ?? v?.personeelsNr ?? v?.id ?? '').trim();}
  function rowId31(r){return String(r?.PersoneelsNr ?? r?.personeelsNr ?? '').trim();}
  function sellerRowsAll31(id,name){
    return (window.DIESTROYERS_RESULTATEN||[]).filter(r=>String(r.EntiteitType||'').toLowerCase()==='verkoper' &&
      ((id && rowId31(r)===id) || (!id && String(r.Naam||'').toLowerCase()===String(name||'').toLowerCase())));
  }
  function sellerRow31(id,name,period){
    return sellerRowsAll31(id,name).find(r=>String(r.Periode||'')===String(period)) || {};
  }
  function periodsForSeller31(id,name){
    return [...new Set(sellerRowsAll31(id,name).map(r=>String(r.Periode||'')).filter(Boolean))].sort();
  }
  function ytdRows31(id,name,year){
    return sellerRowsAll31(id,name).filter(r=>String(r.Periode||'').startsWith(String(year)+'-')).sort((a,b)=>String(a.Periode).localeCompare(String(b.Periode)));
  }
  function activeSellerRecord31(){
    const params=new URLSearchParams(location.search);
    const id=params.get('id')||params.get('pers')||'';
    const nm=params.get('naam')||document.body.dataset.seller||'';
    return sellerByIdOrName(id||nm)||{};
  }
  function value31(row,k){return kpiValue(row||{},def31(k));}
  function target31(row,k){return kpiTarget(row||{},def31(k));}
  function scorePct31(row,k){const t=target31(row,k);return t?value31(row,k)/t*100:0;}
  function ytdMetric31(rows,k){
    const d=def31(k);
    if(!rows.length)return {value:0,display:'—',stuks:0,kansen:0};
    if(d.key==='Link'||d.key==='S'||d.type==='percentage'||d.type==='score'){
      const vals=rows.map(r=>value31(r,k)).filter(v=>isFinite(v)&&v!==0);
      const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
      return {value:avg,display:fmt(avg,d.type==='score'?'score':'ratio')};
    }
    if(d.type==='ratio'){
      const st=rows.reduce((a,r)=>a+n(r[d.key+'Stuks']),0);
      const ka=rows.reduce((a,r)=>a+n(r[d.key+'Kansen']),0);
      const val=ka?st/ka*100:0;
      return {value:val,display:fmt(val,'ratio'),stuks:st,kansen:ka};
    }
    if(d.type==='accessoires'){
      const val=rows.reduce((a,r)=>a+n(r.Accessoires),0);
      return {value:val,display:fmt(val,'bedrag')};
    }
    const val=rows.reduce((a,r)=>a+value31(r,k),0);
    return {value:val,display:fmt(val,d.type)};
  }
  function kpiStatus31(row,k){
    const d=def31(k), st=statusInfo(row||{},d);
    const cls=(st.pct>=100)?'ok':(st.pct>=90?'close':'bad');
    return {...st,cls};
  }
  function strongestAndFocus31(row){
    const rows=KPI_SET_V31.map(k=>({k,def:def31(k),pct:scorePct31(row,k),val:value31(row,k)}))
      .filter(x=>isFinite(x.pct)&&(x.pct>0||x.val>0));
    return {
      strong:[...rows].sort((a,b)=>b.pct-a.pct)[0],
      focus:[...rows].filter(x=>x.def.key!=='NPS').sort((a,b)=>a.pct-b.pct)[0]
    };
  }
  function monthOptions31(periods,current){
    return periods.map(p=>`<option value="${esc(p)}" ${p===current?'selected':''}>${esc(p)}</option>`).join('');
  }
  function detailRows31(id,name,period,kpi,sub){
    return (window.DIESTROYERS_KPI_DETAIL||[]).filter(x=>{
      const same=((id && String(x.PersoneelsNr||'').trim()===id) || (!id && String(x.Naam||'').toLowerCase()===String(name||'').toLowerCase()));
      const kp=String(x.KPI||'').toLowerCase()===String(kpi||'').toLowerCase();
      const su=!sub || String(x.SubKPI||'').toLowerCase()===String(sub).toLowerCase();
      const pe=!period || String(x.Periode||'')===String(period);
      return same&&kp&&su&&pe;
    });
  }
  function drawRadar31(canvas, labels, values){
    if(!canvas)return;
    const W=Math.max(320,canvas.offsetWidth||360), H=340;
    canvas.width=W*2; canvas.height=H*2;
    const ctx=canvas.getContext('2d'); ctx.setTransform(2,0,0,2,0,0);
    ctx.clearRect(0,0,W,H);
    const cx=W/2, cy=H/2+8, R=Math.min(W,H)*.34;
    for(let ring=1; ring<=4; ring++){
      ctx.beginPath();
      labels.forEach((_,i)=>{const a=-Math.PI/2+i*2*Math.PI/labels.length,x=cx+Math.cos(a)*R*ring/4,y=cy+Math.sin(a)*R*ring/4;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});
      ctx.closePath();ctx.strokeStyle='rgba(255,255,255,.12)';ctx.stroke();
    }
    ctx.font='13px Rajdhani';ctx.fillStyle='rgba(255,255,255,.72)';ctx.textAlign='center';ctx.textBaseline='middle';
    labels.forEach((lab,i)=>{const a=-Math.PI/2+i*2*Math.PI/labels.length;ctx.fillText(String(lab).slice(0,11),cx+Math.cos(a)*(R+32),cy+Math.sin(a)*(R+27));});
    ctx.beginPath();
    values.forEach((v,i)=>{const a=-Math.PI/2+i*2*Math.PI/labels.length,r=R*Math.max(0,Math.min(120,v||0))/120,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});
    ctx.closePath();ctx.fillStyle='rgba(225,25,25,.26)';ctx.fill();ctx.strokeStyle='#e11919';ctx.lineWidth=3;ctx.stroke();
  }
  function sellerRank31(row){
    const rows=sellerRows(currentPeriod()).sort((a,b)=>scoreRow(b)-scoreRow(a));
    const id=rowId31(row), nm=String(row?.Naam||'').toLowerCase();
    return rows.findIndex(x=>(id&&rowId31(x)===id)||String(x.Naam||'').toLowerCase()===nm)+1;
  }
  function rankings31(row,id,name){
    const p=currentPeriod(), rows=sellerRows(p);
    const overall=sellerRank31(row);
    const podiums=[];
    KPI_SET_V31.forEach(k=>{
      const sorted=[...rows].sort((a,b)=>value31(b,k)-value31(a,k));
      const rank=sorted.findIndex(x=>(id&&rowId31(x)===id)||String(x.Naam||'').toLowerCase()===String(name).toLowerCase())+1;
      if(rank>0&&rank<=3&&value31(row,k)>0)podiums.push({k,rank});
    });
    const green=KPI_SET_V31.filter(k=>kpiStatus31(row,k).cls==='ok').length;
    const yellow=KPI_SET_V31.filter(k=>kpiStatus31(row,k).cls==='close').length;
    const red=KPI_SET_V31.filter(k=>kpiStatus31(row,k).cls==='bad').length;
    return {overall,podiums,green,yellow,red};
  }
  function awards31(row,id,name){
    const out=[];
    const checks=[['Elite Performer',()=>scoreRow(row)>=30],['High Performer',()=>scoreRow(row)>=24],['Monster Hunter',()=>scorePct31(row,'monster')>=100],['Life Hero',()=>scorePct31(row,'life')>=100],['Insurance Master',()=>scorePct31(row,'insurance')>=100],['DSP Legend',()=>scorePct31(row,'dsp')>=100],['Link King',()=>scorePct31(row,'link')>=100],['S Closer',()=>scorePct31(row,'s')>=100],['Leaders Builder',()=>scorePct31(row,'leaders')>=100],['BuyWay Driver',()=>scorePct31(row,'buyway')>=100]];
    checks.forEach(([label,fn])=>{try{if(fn())out.push(label)}catch(e){}});
    return out;
  }
  function coaching31(row,id,name){
    const sf=strongestAndFocus31(row);
    const focusRows=KPI_SET_V31.map(k=>({k,def:def31(k),pct:scorePct31(row,k),todo:todoText(row,def31(k))}))
      .filter(x=>x.def.key!=='NPS'&&isFinite(x.pct)).sort((a,b)=>a.pct-b.pct).slice(0,4);
    const facts=[];
    if(sf.strong) facts.push(`${sf.strong.def.label} is momenteel de sterkste KPI (${Math.round(sf.strong.pct)}% van target).`);
    if(sf.focus) facts.push(`${sf.focus.def.label} is de duidelijkste hefboom (${Math.round(sf.focus.pct)}% van target).`);
    return {
      statement:facts.join(' '),
      focus:focusRows.map(x=>`${x.def.label}: ${x.todo}`),
      positive:KPI_SET_V31.filter(k=>scorePct31(row,k)>=100).map(k=>`${def31(k).label}: on track`).slice(0,5)
    };
  }
  function kpiHealthCards31(row,rowsYtd){
    return KPI_SET_V31.map(k=>{
      const d=def31(k), st=kpiStatus31(row,k), ym=ytdMetric31(rowsYtd,k);
      return `<div class="health-card ${st.cls}"><div class="health-name">${esc(d.label)}</div><div class="health-value">${esc(fmt(value31(row,k),d.type))}</div><div class="health-meta">YTD: ${esc(ym.display)} · Target: ${esc(fmt(target31(row,k),d.type==='percentage'?'ratio':d.type))}</div><div class="health-status">${esc(st.cls==='ok'?'On track':st.cls==='close'?'Binnen 10%':'Focus nodig')}</div></div>`;
    }).join('');
  }
  function ytdTable31(row,rowsYtd){
    return KPI_SET_V31.map(k=>{
      const d=def31(k), ym=ytdMetric31(rowsYtd,k), current=fmt(value31(row,k),d.type), st=kpiStatus31(row,k);
      return `<tr><td><strong>${esc(d.label)}</strong></td><td class="num">${esc(ym.display)}</td><td class="num">${esc(current)}</td><td class="num ${st.scoreCls}">${esc(st.label)}</td></tr>`;
    }).join('');
  }
  function monthTable31(row){
    return KPI_SET_V31.map(k=>{
      const d=def31(k), st=kpiStatus31(row,k);
      return `<tr><td><strong>${esc(d.label)}</strong></td><td class="num">${esc(fmt(value31(row,k),d.type))}</td><td class="num">${esc(fmt(target31(row,k),d.type==='percentage'?'ratio':d.type))}</td><td class="num">${esc(todoText(row,d))}</td><td class="num ${st.scoreCls}">${esc(st.label)}</td></tr>`;
    }).join('');
  }
  function detailBlocks31(row,id,name,period){
    const pick=(k,sub)=>(detailRows31(id,name,period,k,sub)[0]||{});
    const insurance=`<div class="deep-card"><h3>Insurance detail</h3><div class="deep-row"><span>Mobiel</span><strong>${pick('Insurance','Mobiel').WaardePct?fmt(n(pick('Insurance','Mobiel').WaardePct),'ratio'):'—'}</strong></div><div class="deep-row"><span>Multimedia</span><strong>${pick('Insurance','Multimedia').WaardePct?fmt(n(pick('Insurance','Multimedia').WaardePct),'ratio'):'—'}</strong></div></div>`;
    const link=`<div class="deep-card"><h3>Link detail</h3>${['GEM','PEM','RTV','COMM','MM'].map(s=>`<div class="deep-row"><span>${s}</span><strong>${pick('Link',s).WaardePct?fmt(n(pick('Link',s).WaardePct),'ratio'):'—'}</strong></div>`).join('')}</div>`;
    const s=pick('S','');
    const sBlock=`<div class="deep-card"><h3>Laatste stuks - S</h3><div class="deep-row"><span>Ratio</span><strong>${s.WaardePct?fmt(n(s.WaardePct),'ratio'):'—'}</strong></div><div class="deep-row"><span>Stuks</span><strong>${s.Stuks?n(s.Stuks):'—'}</strong></div><div class="deep-row"><span>Euro</span><strong>${s.Waarde?fmt(n(s.Waarde),'bedrag'):'—'}</strong></div></div>`;
    const bw=pick('BuyWay',''), le=pick('Leaders','');
    const extra=`<div class="deep-card"><h3>BuyWay / Leaders</h3><div class="deep-row"><span>BuyWay</span><strong>${bw.WaardePct?fmt(n(bw.WaardePct),'ratio'):fmt(value31(row,'buyway'),'ratio')}</strong></div><div class="deep-row"><span>Leaders</span><strong>${le.WaardePct?fmt(n(le.WaardePct),'ratio'):fmt(value31(row,'leaders'),'ratio')}</strong></div></div>`;
    return `<div class="deep-grid">${insurance}${link}${sBlock}${extra}</div>`;
  }
  function trendBlock31(id,name){
    return `<div class="trend-grid">${TREND_SET_V31.map((k,i)=>`<div class="trend-card"><h3>${esc(def31(k).label)}</h3><canvas id="trendSec_${i}"></canvas></div>`).join('')}</div>`;
  }
  function renderStructuredDossier31(){
    const root=document.getElementById('seller-root'); if(!root)return;
    const rec=activeSellerRecord31();
    const params=new URLSearchParams(location.search);
    const id=params.get('id')||sellerId31(rec)||'';
    const name=sellerName(rec)||params.get('naam')||document.body.dataset.seller||'Verkoper';
    const periods=periodsForSeller31(id,name);
    const selected=params.get('periode') || currentPeriod();
    const monthRow=sellerRow31(id,name,selected);
    const currentRow=sellerRow31(id,name,currentPeriod());
    const year=String(selected||currentPeriod()).slice(0,4);
    const rowsYtd=ytdRows31(id,name,year);
    const displayName=sellerName(rec)||String(monthRow.Naam||currentRow.Naam||name);
    const avatar=sellerAvatarFile(rec)||`${displayName}.png`;
    const sf=strongestAndFocus31(monthRow);
    const rank=rankings31(monthRow,id,displayName);
    const coach=coaching31(monthRow,id,displayName);
    const awards=awards31(monthRow,id,displayName);
    const radarKeys=['omzet','life','insurance','dsp','spg','srp','accessoires','link','buyway','leaders'];
    const radarLabels=radarKeys.map(k=>def31(k).label.replace('Abonnementen','Abo'));
    const radarVals=radarKeys.map(k=>scorePct31(monthRow,k));

    root.innerHTML=`
      <section class="dossier-hero">
        <div class="dossier-hero-card">
          <div class="dossier-kicker">Performance Dossier</div>
          <h1 class="dossier-title">${esc(displayName)}</h1>
          <p class="dossier-summary">${esc(coach.statement || 'Er is nog onvoldoende data voor een feitelijke samenvatting.')}</p>
          <div class="dossier-pillrow">
            <span class="dossier-pill">Actuele periode ${esc(currentPeriod())}</span>
            <span class="dossier-pill">Geselecteerd ${esc(selected)}</span>
            <span class="dossier-pill">Ranking #${rank.overall||'-'}</span>
            <span class="dossier-pill">${scoreRow(monthRow)} pt</span>
          </div>
        </div>
        <div class="dossier-photo"><img src="assets/${esc(avatar)}" onerror="this.style.display='none'"></div>
      </section>
      <nav class="dossier-section-nav">
        <a href="#ytd">1. YTD resultaten</a>
        <a href="#maand">2. Maandresultaten</a>
        <a href="#awards">3. Awards & rankings</a>
        <a href="#coaching">4. Coaching</a>
      </nav>

      <section class="analysis-panel" id="ytd">
        <h2>1. YTD resultaten</h2>
        <p class="section-intro">Jaarbeeld voor ${esc(year)}. Dit gedeelte gebruikt alle beschikbare maanden in de historiek voor deze verkoper.</p>
        <div class="dossier-grid">
          <div class="dossier-tile"><h3>YTD maanden</h3><div class="big">${rowsYtd.length}</div><div class="small">maanden beschikbaar</div></div>
          <div class="dossier-tile"><h3>Sterkste KPI</h3><div class="big">${esc(sf.strong?sf.strong.def.label:'—')}</div><div class="small">${sf.strong?Math.round(sf.strong.pct)+'% van target':'geen data'}</div></div>
          <div class="dossier-tile"><h3>Groeikans</h3><div class="big">${esc(sf.focus?sf.focus.def.label:'—')}</div><div class="small">${sf.focus?Math.round(sf.focus.pct)+'% van target':'geen data'}</div></div>
          <div class="dossier-tile"><h3>Score</h3><div class="big">${scoreRow(monthRow)}</div><div class="small">punten geselecteerde maand</div></div>
        </div>
        <div class="dossier-two">
          <div class="radarbox"><canvas id="radarSection"></canvas></div>
          <div class="kpi-health-grid">${kpiHealthCards31(monthRow,rowsYtd)}</div>
        </div>
        <div class="tablewrap" style="margin-top:18px"><table class="dossier-table"><thead><tr><th>KPI</th><th>YTD</th><th>Geselecteerde maand</th><th>Status</th></tr></thead><tbody>${ytdTable31(monthRow,rowsYtd)}</tbody></table></div>
        <p class="factual-note">Motiverend, maar feitelijk: dit blok toont enkel waarden die in de historiek of actuele Resultaten-tabel zitten.</p>
      </section>

      <section class="analysis-panel" id="maand">
        <h2>2. Maandresultaten</h2>
        <div class="month-picker-row">
          <label for="monthSelect">Kies maand</label>
          <select id="monthSelect">${monthOptions31(periods,selected)}</select>
        </div>
        <div class="tablewrap"><table class="dossier-table"><thead><tr><th>KPI</th><th>Resultaat</th><th>Target</th><th>Focus</th><th>Status</th></tr></thead><tbody>${monthTable31(monthRow)}</tbody></table></div>
        <h2 style="margin-top:24px">Detail van de maand</h2>
        ${detailBlocks31(monthRow,id,displayName,selected)}
        <h2 style="margin-top:24px">Trends laatste 12 maanden</h2>
        ${trendBlock31(id,displayName)}
      </section>

      <section class="analysis-panel" id="awards">
        <h2>3. Awards & rankings</h2>
        <div class="rank-grid">
          <div class="rank-card"><h3>Overall ranking</h3><div class="rank-big">#${rank.overall||'-'}</div><div class="muted">geselecteerde maand</div></div>
          <div class="rank-card"><h3>Groen / Geel / Rood</h3><div class="rank-big">${rank.green}/${rank.yellow}/${rank.red}</div><div class="muted">KPI-statussen</div></div>
          <div class="rank-card"><h3>Podiums</h3><div class="rank-big">${rank.podiums.length}</div><div class="muted">top 3 KPI-posities</div></div>
        </div>
        <h2 style="margin-top:24px">Awards</h2>
        <div class="award-row">${awards.map(a=>`<span class="award-badge">${esc(a)}</span>`).join('') || '<span class="award-badge">In opbouw</span>'}</div>
        <h2 style="margin-top:24px">Podiumposities</h2>
        <div class="tablewrap"><table class="dossier-table"><thead><tr><th>KPI</th><th>Ranking</th></tr></thead><tbody>${rank.podiums.map(x=>`<tr><td>${esc(def31(x.k).label)}</td><td class="num">#${x.rank}</td></tr>`).join('') || '<tr><td colspan="2">Nog geen top 3-posities in deze maand.</td></tr>'}</tbody></table></div>
      </section>

      <section class="analysis-panel" id="coaching">
        <h2>4. Coaching</h2>
        <div class="coach-statement">${esc(coach.statement || 'Er is nog onvoldoende data voor een betrouwbare coachinganalyse.')}</div>
        <div class="coach-grid" style="margin-top:18px">
          <div><h3>Focuspunten</h3><div class="coach-list">${coach.focus.map(x=>`<div class="coach-item">${esc(x)}</div>`).join('')}</div></div>
          <div><h3>Positieve bevestiging</h3><div class="coach-list">${coach.positive.map(x=>`<div class="coach-item">${esc(x)}</div>`).join('') || '<div class="coach-item">Nog geen KPI volledig on track in deze maand.</div>'}</div></div>
        </div>
        <p class="factual-note">De coaching is automatisch gegenereerd uit targets, achterstand en huidige scores. Ze is dus motiverend geformuleerd, maar blijft cijfermatig onderbouwd.</p>
      </section>
    `;
    document.getElementById('monthSelect')?.addEventListener('change',e=>{
      const u=new URL(location.href); u.searchParams.set('periode',e.target.value); location.href=u.toString();
    });
    setTimeout(()=>{
      drawRadar31(document.getElementById('radarSection'),radarLabels,radarVals);
      TREND_SET_V31.forEach((k,i)=>{const rows=sellerRowsAll31(id,displayName).filter(r=>String(r.Periode||'')).sort((a,b)=>String(a.Periode).localeCompare(String(b.Periode))).slice(-12); drawLine(document.getElementById('trendSec_'+i),rows.map(r=>String(r.Periode)),rows.map(r=>value31(r,k)));});
    },0);
  }
  window.renderSeller = renderStructuredDossier31;
  window.renderSellerDossier = renderStructuredDossier31;
  window.addEventListener('load',()=>{if(document.getElementById('seller-root'))renderStructuredDossier31();});
})();


/* Diestroyers V3.2 - Cleaner, sectioned, fact-based dossier */
(function(){
  const KPI_SET = ['omzet','life','insurance','abonnementen','dsp','spg','srp','accessoires','link','monster','buyway','leaders','s','nps'];
  const TREND_SET = ['omzet','insurance','life','dsp','spg','srp','accessoires','link','buyway','leaders','s','monster'];
  function D(k){return KPI_DEFS[k] || {key:k,label:k,type:'stuks'};}
  function sid(v){return String(v?.PersoneelsNr ?? v?.personeelsNr ?? v?.id ?? '').trim();}
  function rid(r){return String(r?.PersoneelsNr ?? r?.personeelsNr ?? '').trim();}
  function rec(){const p=new URLSearchParams(location.search);return sellerByIdOrName(p.get('id')||p.get('pers')||p.get('naam')||document.body.dataset.seller||'')||{};}
  function allRows(id,name){return (window.DIESTROYERS_RESULTATEN||[]).filter(r=>String(r.EntiteitType||'').toLowerCase()==='verkoper'&&((id&&rid(r)===id)||(!id&&String(r.Naam||'').toLowerCase()===String(name||'').toLowerCase())));}
  function periods(id,name){return [...new Set(allRows(id,name).map(r=>String(r.Periode||'')).filter(Boolean))].sort();}
  function rowFor(id,name,per){return allRows(id,name).find(r=>String(r.Periode||'')===String(per))||{};}
  function ytdRows(id,name,year){return allRows(id,name).filter(r=>String(r.Periode||'').startsWith(String(year)+'-')).sort((a,b)=>String(a.Periode).localeCompare(String(b.Periode)));}
  function V(row,k){return kpiValue(row||{},D(k));}
  function T(row,k){return kpiTarget(row||{},D(k));}
  function FT(k,v){return fmt(v,(D(k).type==='percentage')?'ratio':D(k).type);}
  function ytd(k,rows){
    const def=D(k); if(!rows.length)return {result:0,target:0,display:'—',targetDisplay:'—',pct:0};
    let result=0,target=0;
    if(def.key==='Link'||def.key==='S'||def.type==='percentage'||def.type==='score'){
      const vals=rows.map(r=>V(r,k)).filter(x=>isFinite(x)&&x!==0);
      const tars=rows.map(r=>T(r,k)).filter(x=>isFinite(x)&&x!==0);
      result=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
      target=tars.length?tars.reduce((a,b)=>a+b,0)/tars.length:0;
      return {result,target,display:fmt(result,def.type==='score'?'score':'ratio'),targetDisplay:FT(k,target),pct:target?result/target*100:0};
    }
    if(def.type==='ratio'){
      const st=rows.reduce((a,r)=>a+n(r[def.key+'Stuks']),0);
      const ka=rows.reduce((a,r)=>a+n(r[def.key+'Kansen']),0);
      result=ka?st/ka*100:0;
      const tars=rows.map(r=>T(r,k)).filter(x=>isFinite(x)&&x!==0);
      target=tars.length?tars.reduce((a,b)=>a+b,0)/tars.length:0;
      return {result,target,display:fmt(result,'ratio'),targetDisplay:fmt(target,'ratio'),pct:target?result/target*100:0};
    }
    if(def.type==='accessoires'){
      result=rows.reduce((a,r)=>a+n(r.Accessoires),0); target=rows.reduce((a,r)=>a+T(r,k),0);
      return {result,target,display:fmt(result,'bedrag'),targetDisplay:fmt(target,'bedrag'),pct:target?result/target*100:0};
    }
    result=rows.reduce((a,r)=>a+V(r,k),0); target=rows.reduce((a,r)=>a+T(r,k),0);
    return {result,target,display:fmt(result,def.type),targetDisplay:fmt(target,def.type),pct:target?result/target*100:0};
  }
  function ST(pct,target){if(!target)return{cls:'bad',label:'Geen target',scoreCls:'score-bad'};if(pct>=100)return{cls:'ok',label:'On track',scoreCls:'score-ok'};if(pct>=90)return{cls:'close',label:'Binnen 10%',scoreCls:'score-close'};return{cls:'bad',label:'Focus nodig',scoreCls:'score-bad'};}
  function Rank(row){const rows=sellerRows(currentPeriod()).sort((a,b)=>scoreRow(b)-scoreRow(a));const id=rid(row),nm=String(row?.Naam||'').toLowerCase();return rows.findIndex(x=>(id&&rid(x)===id)||String(x.Naam||'').toLowerCase()===nm)+1;}
  function awards(row,yMap){const out=[]; if(scoreRow(row)>=30)out.push('Elite Performer'); else if(scoreRow(row)>=24)out.push('High Performer'); [['Monster Hunter','monster'],['Life Hero','life'],['Insurance Master','insurance'],['DSP Legend','dsp'],['Link King','link'],['S Closer','s'],['Leaders Builder','leaders'],['BuyWay Driver','buyway']].forEach(([label,k])=>{if((yMap[k]?.pct||0)>=100)out.push(label);}); return out;}
  function coach(row,yMap){const list=KPI_SET.filter(k=>k!=='nps').map(k=>({k,def:D(k),pct:yMap[k]?.pct||0})).filter(x=>isFinite(x.pct)); const strong=[...list].sort((a,b)=>b.pct-a.pct)[0]; const focus=[...list].sort((a,b)=>a.pct-b.pct).slice(0,4); const positive=list.filter(x=>x.pct>=100).sort((a,b)=>b.pct-a.pct).slice(0,5); return {statement:strong?`${strong.def.label} is YTD de sterkste KPI (${Math.round(strong.pct)}% van target). De grootste winst zit in ${focus[0]?.def.label||'de laagste KPI'}.`:'Er is nog onvoldoende data voor een betrouwbare analyse.',focus:focus.map(x=>`${x.def.label}: ${Math.round(x.pct)}% van YTD-target`),positive:positive.map(x=>`${x.def.label}: on track YTD`)};}
  function detail(id,name,per,kpi,sub){return (window.DIESTROYERS_KPI_DETAIL||[]).filter(x=>{const same=(id&&String(x.PersoneelsNr||'').trim()===id)||(!id&&String(x.Naam||'').toLowerCase()===String(name).toLowerCase());return same&&String(x.Periode||'')===String(per)&&String(x.KPI||'').toLowerCase()===String(kpi).toLowerCase()&&(!sub||String(x.SubKPI||'').toLowerCase()===String(sub).toLowerCase());})[0]||{};}
  function deep(row,id,name,per){const p=(k,s)=>detail(id,name,per,k,s);const ins=`<div class="deep-card"><h3>Insurance</h3><div class="deep-row"><span>Mobiel</span><strong>${p('Insurance','Mobiel').WaardePct?fmt(n(p('Insurance','Mobiel').WaardePct),'ratio'):'—'}</strong></div><div class="deep-row"><span>Multimedia</span><strong>${p('Insurance','Multimedia').WaardePct?fmt(n(p('Insurance','Multimedia').WaardePct),'ratio'):'—'}</strong></div></div>`;const link=`<div class="deep-card"><h3>Link</h3>${['GEM','PEM','RTV','COMM','MM'].map(s=>`<div class="deep-row"><span>${s}</span><strong>${p('Link',s).WaardePct?fmt(n(p('Link',s).WaardePct),'ratio'):'—'}</strong></div>`).join('')}</div>`;const s=p('S','');const sb=`<div class="deep-card"><h3>Laatste stuks - S</h3><div class="deep-row"><span>Ratio</span><strong>${s.WaardePct?fmt(n(s.WaardePct),'ratio'):'—'}</strong></div><div class="deep-row"><span>Stuks</span><strong>${s.Stuks?n(s.Stuks):'—'}</strong></div><div class="deep-row"><span>Euro</span><strong>${s.Waarde?fmt(n(s.Waarde),'bedrag'):'—'}</strong></div></div>`;return `<div class="deep-grid">${ins}${link}${sb}</div>`;}
  function drawRadarLocal(canvas,labels,values){if(!canvas)return;const W=Math.max(320,canvas.offsetWidth||360),H=340;canvas.width=W*2;canvas.height=H*2;const ctx=canvas.getContext('2d');ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,W,H);const cx=W/2,cy=H/2+8,R=Math.min(W,H)*.34;for(let ring=1;ring<=4;ring++){ctx.beginPath();labels.forEach((_,i)=>{const a=-Math.PI/2+i*2*Math.PI/labels.length,x=cx+Math.cos(a)*R*ring/4,y=cy+Math.sin(a)*R*ring/4;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();ctx.strokeStyle='rgba(255,255,255,.12)';ctx.stroke();}ctx.font='13px Rajdhani';ctx.fillStyle='rgba(255,255,255,.72)';ctx.textAlign='center';ctx.textBaseline='middle';labels.forEach((lab,i)=>{const a=-Math.PI/2+i*2*Math.PI/labels.length;ctx.fillText(String(lab).slice(0,11),cx+Math.cos(a)*(R+32),cy+Math.sin(a)*(R+27));});ctx.beginPath();values.forEach((v,i)=>{const a=-Math.PI/2+i*2*Math.PI/labels.length,r=R*Math.max(0,Math.min(120,v||0))/120,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();ctx.fillStyle='rgba(225,25,25,.26)';ctx.fill();ctx.strokeStyle='#e11919';ctx.lineWidth=3;ctx.stroke();}
  function renderDossierV32(){
    const root=document.getElementById('seller-root'); if(!root)return;
    const R=rec(); const params=new URLSearchParams(location.search); const id=params.get('id')||sid(R)||''; const name=sellerName(R)||params.get('naam')||document.body.dataset.seller||'Verkoper'; const per=params.get('periode')||currentPeriod(); const pList=periods(id,name); const row=rowFor(id,name,per); const current=rowFor(id,name,currentPeriod()); const display=sellerName(R)||row.Naam||current.Naam||name; const year=String(per||currentPeriod()).slice(0,4); const yRows=ytdRows(id,display,year); const yMap={}; KPI_SET.forEach(k=>yMap[k]=ytd(k,yRows)); const C=coach(row,yMap); const A=awards(row,yMap); const radarKeys=['omzet','life','insurance','dsp','spg','srp','accessoires','link','buyway','leaders']; const radarLabels=radarKeys.map(k=>D(k).label.replace('Abonnementen','Abo')); const radarVals=radarKeys.map(k=>yMap[k]?.pct||0); const avatar=sellerAvatarFile(R)||`${display}.png`;
    const ytdTable=KPI_SET.map(k=>{const m=yMap[k],st=ST(m.pct,m.target),def=D(k);return `<tr><td><strong>${esc(def.label)}</strong></td><td class="num">${esc(m.display)}</td><td class="num">${esc(m.targetDisplay)}</td><td class="num ${st.scoreCls}">${esc(st.label)}</td></tr>`}).join('');
    const monthTable=KPI_SET.map(k=>{const def=D(k),st=statusInfo(row,def);return `<tr><td><strong>${esc(def.label)}</strong></td><td class="num">${esc(fmt(V(row,k),def.type))}</td><td class="num">${esc(FT(k,T(row,k)))}</td><td class="num">${esc(todoText(row,def))}</td><td class="num ${st.scoreCls}">${esc(st.label)}</td></tr>`}).join('');
    const health=KPI_SET.map(k=>{const m=yMap[k],st=ST(m.pct,m.target),def=D(k);return `<div class="health-card ${st.cls}"><div class="health-name">${esc(def.label)}</div><div class="health-value">${esc(m.display)}</div><div class="health-meta">Target YTD: ${esc(m.targetDisplay)}</div><div class="health-status">${esc(st.label)}</div></div>`}).join('');
    const podiums=KPI_SET.map(k=>{const rows=sellerRows(per).sort((a,b)=>V(b,k)-V(a,k));const r=rows.findIndex(x=>(id&&rid(x)===id)||String(x.Naam||'').toLowerCase()===String(display).toLowerCase())+1;return {k,rank:r,value:V(row,k)}}).filter(x=>x.rank>0&&x.rank<=3&&x.value>0);
    root.innerHTML=`<section class="dossier-hero compact"><div class="dossier-hero-card"><div class="dossier-kicker">Performance Dossier</div><h1 class="dossier-title">${esc(display)}</h1></div><div class="dossier-photo"><img src="assets/${esc(avatar)}" onerror="this.style.display='none'"></div></section><nav class="dossier-nav-cards"><a class="dossier-nav-card" href="#performance"><span>1</span><strong>Performance YTD</strong></a><a class="dossier-nav-card" href="#evolutie"><span>2</span><strong>Evolutie</strong></a><a class="dossier-nav-card" href="#maand"><span>3</span><strong>Maandresultaten</strong></a><a class="dossier-nav-card" href="#awards"><span>4</span><strong>Awards & Rankings</strong></a><a class="dossier-nav-card" href="#coaching"><span>5</span><strong>Coaching</strong></a></nav><section class="analysis-panel" id="performance"><h2>1. Performance YTD ${esc(year)}</h2><div class="dossier-grid"><div class="dossier-tile"><h3>YTD maanden</h3><div class="big">${yRows.length}</div><div class="small">beschikbaar</div></div><div class="dossier-tile"><h3>Ranking</h3><div class="big">#${Rank(row)||'-'}</div><div class="small">geselecteerde maand</div></div><div class="dossier-tile"><h3>Score</h3><div class="big">${scoreRow(row)}</div><div class="small">punten geselecteerde maand</div></div><div class="dossier-tile"><h3>On track YTD</h3><div class="big">${KPI_SET.filter(k=>ST(yMap[k].pct,yMap[k].target).cls==='ok').length}</div><div class="small">KPI's</div></div></div><div class="dossier-two"><div class="radarbox"><canvas id="radarV32"></canvas></div><div class="kpi-health-grid">${health}</div></div><div class="tablewrap" style="margin-top:18px"><table class="dossier-table"><thead><tr><th>KPI</th><th>Resultaat YTD</th><th>Target YTD</th><th>Status YTD</th></tr></thead><tbody>${ytdTable}</tbody></table></div></section><section class="analysis-panel" id="evolutie"><h2>2. Evolutie laatste 12 maanden</h2><div class="trend-grid">${TREND_SET.map((k,i)=>`<div class="trend-card"><h3>${esc(D(k).label)}</h3><canvas id="evoV32_${i}"></canvas></div>`).join('')}</div></section><section class="analysis-panel" id="maand"><h2>3. Maandresultaten</h2><div class="month-picker-row"><label for="monthSelect">Kies maand</label><select id="monthSelect">${pList.map(p=>`<option value="${esc(p)}" ${p===per?'selected':''}>${esc(p)}</option>`).join('')}</select></div><div class="tablewrap"><table class="dossier-table"><thead><tr><th>KPI</th><th>Resultaat</th><th>Target</th><th>Focus</th><th>Status</th></tr></thead><tbody>${monthTable}</tbody></table></div><h2 style="margin-top:24px">Detail van ${esc(per)}</h2>${deep(row,id,display,per)}</section><section class="analysis-panel" id="awards"><h2>4. Awards & Rankings</h2><div class="rank-grid"><div class="rank-card"><h3>Overall ranking</h3><div class="rank-big">#${Rank(row)||'-'}</div><div class="muted">${esc(per)}</div></div><div class="rank-card"><h3>YTD groen</h3><div class="rank-big">${KPI_SET.filter(k=>ST(yMap[k].pct,yMap[k].target).cls==='ok').length}</div><div class="muted">KPI's on track</div></div><div class="rank-card"><h3>Podiums</h3><div class="rank-big">${podiums.length}</div><div class="muted">top 3 KPI-posities</div></div></div><h2 style="margin-top:24px">Awards</h2><div class="award-row">${A.map(a=>`<span class="award-badge">${esc(a)}</span>`).join('')||'<span class="award-badge">In opbouw</span>'}</div><h2 style="margin-top:24px">Podiumposities</h2><div class="tablewrap"><table class="dossier-table"><thead><tr><th>KPI</th><th>Ranking</th></tr></thead><tbody>${podiums.map(x=>`<tr><td>${esc(D(x.k).label)}</td><td class="num">#${x.rank}</td></tr>`).join('')||'<tr><td colspan="2">Nog geen top 3-posities in deze maand.</td></tr>'}</tbody></table></div></section><section class="analysis-panel" id="coaching"><h2>5. Coaching</h2><div class="coach-statement">${esc(C.statement)}</div><div class="coach-grid" style="margin-top:18px"><div><h3>Focuspunten</h3><div class="coach-list">${C.focus.map(x=>`<div class="coach-item">${esc(x)}</div>`).join('')}</div></div><div><h3>Positieve bevestiging</h3><div class="coach-list">${C.positive.map(x=>`<div class="coach-item">${esc(x)}</div>`).join('')||'<div class="coach-item">Nog geen KPI volledig on track YTD.</div>'}</div></div></div></section>`;
    document.getElementById('monthSelect')?.addEventListener('change',e=>{const u=new URL(location.href);u.searchParams.set('periode',e.target.value);location.href=u.toString();});
    setTimeout(()=>{drawRadarLocal(document.getElementById('radarV32'),radarLabels,radarVals);TREND_SET.forEach((k,i)=>{const rows=allRows(id,display).filter(r=>String(r.Periode||'')).sort((a,b)=>String(a.Periode).localeCompare(String(b.Periode))).slice(-12);drawLine(document.getElementById('evoV32_'+i),rows.map(r=>String(r.Periode)),rows.map(r=>V(r,k)));});},0);
  }
  window.renderSeller=renderDossierV32; window.renderSellerDossier=renderDossierV32; window.addEventListener('load',()=>{if(document.getElementById('seller-root'))renderDossierV32();});
})();


/* ============================================================
   Diestroyers V4 - KPI Management Dossiers + Mission Control
   ============================================================ */
(function(){
  const KPI_LIST=['omzet','life','insurance','abonnementen','dsp','spg','srp','accessoires','link','monster','buyway','leaders','s','nps'];
  const RATIO_KPIS=['insurance','abonnementen','dsp','spg','srp','buyway','leaders'];
  function def(k){return KPI_DEFS[k]||{key:k,label:k,type:'stuks',page:`${k}.html`};}
  function pageFor(k){return ({abonnementen:'abonnementen.html',s:'laatste-stuks.html'}[k])||((def(k).page)||`${k}.html`);}
  function activeRows(p=currentPeriod()){const active=new Set((activeSellers()||[]).map(v=>String(sellerName(v)).toLowerCase()));return sellerRows(p).filter(r=>active.has(String(r.Naam||'').toLowerCase()));}
  function value(row,k){return kpiValue(row||{},def(k));}
  function target(row,k){return kpiTarget(row||{},def(k));}
  function statusPct(row,k){const t=target(row,k);return t?value(row,k)/t*100:0;}
  function chance(row,k){const d=def(k); if(RATIO_KPIS.includes(k))return n(row[d.key+'Kansen']); if(k==='s')return n(row.SStuks)||n(row.SEuro); if(k==='life')return n(row.Life); if(k==='accessoires')return n(row.Accessoires); if(k==='monster')return n(row.Monster); if(k==='link')return 1; if(k==='omzet')return n(row.Omzet); return value(row,k);}
  function stuks(row,k){const d=def(k); if(RATIO_KPIS.includes(k))return n(row[d.key+'Stuks']); if(k==='life')return n(row.Life); if(k==='s')return n(row.SStuks); return value(row,k);}
  function needed(row,k){const d=def(k); if(RATIO_KPIS.includes(k)){return Math.max(0,Math.ceil(n(row[d.key+'Kansen'])*n(row[d.key+'TargetPct'])/100-n(row[d.key+'Stuks'])))} return Math.max(0,target(row,k)-value(row,k));}
  function storeForecastWith(rowList,k){const store=storeRow(currentPeriod()), d=def(k); if(RATIO_KPIS.includes(k)){const add=rowList.reduce((a,r)=>a+needed(r,k),0);const kansen=n(store[d.key+'Kansen']);const st=n(store[d.key+'Stuks'])+add;return kansen?st/kansen*100:0;} return value(store,k)+rowList.reduce((a,r)=>a+needed(r,k),0);}
  function ytdRowsStore(year){return (window.DIESTROYERS_RESULTATEN||[]).filter(r=>(String(r.EntiteitType||'').toLowerCase()==='winkel'||String(r.Naam||'').toLowerCase()==='diest')&&String(r.Periode||'').startsWith(String(year)+'-')).sort((a,b)=>String(a.Periode).localeCompare(String(b.Periode)));}
  function ytdStore(k,year){const rows=ytdRowsStore(year), d=def(k); if(!rows.length)return {res:0,tar:0,pct:0,display:'—',tdisplay:'—'}; if(RATIO_KPIS.includes(k)){const st=rows.reduce((a,r)=>a+n(r[d.key+'Stuks']),0),ka=rows.reduce((a,r)=>a+n(r[d.key+'Kansen']),0);const res=ka?st/ka*100:0;const tv=rows.map(r=>target(r,k)).filter(Boolean);const tar=tv.length?tv.reduce((a,b)=>a+b,0)/tv.length:0;return {res,tar,pct:tar?res/tar*100:0,display:fmt(res,'ratio'),tdisplay:fmt(tar,'ratio')};} if(k==='link'||k==='s'||d.type==='percentage'||d.type==='score'){const vals=rows.map(r=>value(r,k)).filter(x=>x);const tars=rows.map(r=>target(r,k)).filter(x=>x);const res=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;const tar=tars.length?tars.reduce((a,b)=>a+b,0)/tars.length:0;return {res,tar,pct:tar?res/tar*100:0,display:fmt(res,d.type==='score'?'score':'ratio'),tdisplay:fmt(tar,d.type==='score'?'score':'ratio')};} const res=rows.reduce((a,r)=>a+value(r,k),0),tar=rows.reduce((a,r)=>a+target(r,k),0);return {res,tar,pct:tar?res/tar*100:0,display:fmt(res,d.type),tdisplay:fmt(tar,d.type)};}
  function drivers(k,p=currentPeriod()){const rows=activeRows(p);const total=rows.reduce((a,r)=>a+chance(r,k),0)||1;return rows.map(r=>{const imp=chance(r,k);const pct=statusPct(r,k);return {row:r,name:r.Naam,k,impact:imp,share:imp/total*100,perf:pct,needed:needed(r,k),value:value(r,k),target:target(r,k),stuks:stuks(r,k)}}).sort((a,b)=>b.share-a.share);}
  function priorityScore(k){const store=storeRow(currentPeriod()), p=statusPct(store,k), gap=Math.max(0,100-p);const pot=drivers(k).reduce((a,x)=>a+x.needed,0);const red=drivers(k).filter(x=>x.perf<90).length;return Math.round(Math.min(100,gap*0.9+Math.min(30,pot/2)+red*4));}
  function insightList(k){const dr=drivers(k);const top=dr[0];const top2=dr.slice(0,2).reduce((a,x)=>a+x.share,0);const low=dr.filter(x=>x.share>=dr.reduce((a,b)=>a+b.share,0)/Math.max(1,dr.length)&&x.perf<100)[0];const out=[]; if(top)out.push(`${top.name} heeft de grootste impact op ${def(k).label} (${top.share.toFixed(0)}% van de kansen/impact).`); if(top2)out.push(`De top 2 vertegenwoordigt ${top2.toFixed(0)}% van de totale impact.`); if(low)out.push(`${low.name} is de grootste hefboom: hoge impact en nog ${Math.round(low.needed)} te gaan.`); if(!out.length)out.push('Nog onvoldoende data voor concrete inzichten.');return out;}
  function matrix(k){const dr=drivers(k), avg=dr.reduce((a,x)=>a+x.share,0)/Math.max(1,dr.length);const q={star:[],lever:[],nice:[],develop:[]};dr.forEach(x=>{const hi=x.share>=avg, good=x.perf>=100;if(hi&&good)q.star.push(x);else if(hi&&!good)q.lever.push(x);else if(!hi&&good)q.nice.push(x);else q.develop.push(x);});return q;}
  function renderDriverTable(k){return `<div class="tablewrap"><table class="driver-table"><thead><tr><th>Verkoper</th><th class="num">Impact</th><th class="num">Resultaat</th><th class="num">Target</th><th class="num">Hefboom</th></tr></thead><tbody>${drivers(k).map(x=>`<tr><td><strong>${esc(x.name)}</strong></td><td class="num">${x.share.toFixed(1)}%</td><td class="num">${esc(fmt(x.value,def(k).type))}</td><td class="num">${esc(fmt(x.target,def(k).type))}</td><td class="num">${esc(String(Math.round(x.needed)))}</td></tr>`).join('')}</tbody></table></div>`;}
  function renderMatrix(k){const q=matrix(k);const block=(title,arr,cls)=>`<div class="matrix-box ${cls||''}"><h3>${title}</h3>${arr.map(x=>`<div class="matrix-item"><span>${esc(x.name)}</span><strong>${x.share.toFixed(0)}% · ${Math.round(x.perf)}%</strong></div>`).join('')||'<div class="matrix-item"><span>Geen verkopers</span><strong>—</strong></div>'}</div>`;return `<div class="impact-matrix">${block('Hoge impact + hoog resultaat',q.star,'star')}${block('Hoge impact + groeikans',q.lever,'hot')}${block('Lage impact + hoog resultaat',q.nice)}${block('Lage impact + groeikans',q.develop)}</div>`;}
  function renderKpiDeep(k){if(k==='insurance')return `<div class="deep-grid"><div class="deep-card"><h3>Mobiel vs Multimedia</h3><div class="deep-row"><span>Detail</span><strong>via verkopersdetails</strong></div></div><div class="deep-card"><h3>Managementfocus</h3><div class="deep-row"><span>Stuur op</span><strong>kansen × conversie</strong></div></div></div>`; if(k==='link')return `<div class="deep-grid">${['GEM','PEM','RTV','COMM','MM'].map(s=>`<div class="deep-card"><h3>${s}</h3><div class="deep-row"><span>Analyse</span><strong>per verkoper</strong></div></div>`).join('')}</div>`; if(k==='s')return `<div class="deep-grid"><div class="deep-card"><h3>Laatste stuks</h3><div class="deep-row"><span>Stuks</span><strong>verkoperimpact</strong></div><div class="deep-row"><span>Euro</span><strong>winkelkorf</strong></div></div></div>`; return `<div class="deep-grid"><div class="deep-card"><h3>${esc(def(k).label)}</h3><div class="deep-row"><span>Analyse</span><strong>resultaat, target, impact</strong></div></div></div>`;}
  function renderKpiDossier(){const root=document.getElementById('kpi-dossier-root'); if(!root)return;let k=root.dataset.kpi||new URLSearchParams(location.search).get('k')||'insurance';const d=def(k), store=storeRow(currentPeriod()), y=ytdStore(k,String(currentPeriod()).slice(0,4));const score=statusPct(store,k);const pr=priorityScore(k);const dr=drivers(k);const top=dr[0];const sim1=storeForecastWith(dr.slice(0,1).map(x=>x.row),k);const sim2=storeForecastWith(dr.slice(0,2).map(x=>x.row),k);root.innerHTML=`<section class="intel-hero"><div class="intel-kicker">KPI Performance Dossier</div><h1 class="intel-title">${esc(d.label)}</h1><div class="intel-sub">Doel: bepalen hoe deze KPI op groen geraakt, wie de grootste impact heeft en waar coaching het meeste oplevert.</div></section><section class="intel-grid"><div class="intel-tile"><h3>Maand</h3><div class="big">${esc(fmt(value(store,k),d.type))}</div><div class="small">Target: ${esc(fmt(target(store,k),d.type))}</div></div><div class="intel-tile"><h3>YTD</h3><div class="big">${esc(y.display)}</div><div class="small">Target YTD: ${esc(y.tdisplay)}</div></div><div class="intel-tile"><h3>Status</h3><div class="big">${Math.round(score)}%</div><div class="small">t.o.v. target</div></div><div class="intel-tile"><h3>Prioriteit</h3><div class="big">${pr}</div><div class="small">managementscore</div></div></section><section class="intel-panel"><h2>1. Evolutie</h2><div class="trend-card"><canvas id="kpiTrendMain"></canvas></div></section><section class="intel-panel"><h2>2. Drivers & impact</h2>${renderDriverTable(k)}</section><section class="intel-panel"><h2>3. Impact Matrix</h2>${renderMatrix(k)}</section><section class="intel-panel"><h2>4. Opportuniteiten & simulatie</h2><div class="sim-grid"><div class="sim-card"><h3>Grootste hefboom</h3><div class="big">${top?esc(top.name):'—'}</div><div class="small">${top?Math.round(top.needed)+' extra nodig':'geen data'}</div></div><div class="sim-card"><h3>Als top 1 target haalt</h3><div class="big">${esc(fmt(sim1,d.type))}</div></div><div class="sim-card"><h3>Als top 2 target halen</h3><div class="big">${esc(fmt(sim2,d.type))}</div></div></div></section><section class="intel-panel"><h2>5. Deep Dive</h2>${renderKpiDeep(k)}</section><section class="intel-panel"><h2>6. Coachingprioriteiten</h2><div class="priority-list">${dr.filter(x=>x.needed>0).slice(0,5).map((x,i)=>`<div class="priority-item"><div class="priority-score">${i+1}</div><div><div class="priority-title">${esc(x.name)}</div><div class="priority-meta">Impact ${x.share.toFixed(1)}% · resultaat ${Math.round(x.perf)}%</div></div><div class="priority-action">${Math.round(x.needed)} extra nodig</div></div>`).join('')||'<div class="insight">Geen concrete coachingprioriteiten: KPI lijkt op schema of data ontbreekt.</div>'}</div></section><section class="intel-panel"><h2>7. Management insights</h2><div class="insight-list">${insightList(k).map(x=>`<div class="insight">${esc(x)}</div>`).join('')}</div></section>`;setTimeout(()=>{const rows=ytdRowsStore(String(currentPeriod()).slice(0,4)).slice(-12);drawLine(document.getElementById('kpiTrendMain'),rows.map(r=>r.Periode),rows.map(r=>value(r,k)));},0);}
  function renderMissionControl(){const root=document.getElementById('mission-control-root'); if(!root)return;const priorities=KPI_LIST.map(k=>({k,d:def(k),score:priorityScore(k),store:storeRow(currentPeriod()),drivers:drivers(k)})).sort((a,b)=>b.score-a.score);const green=KPI_LIST.filter(k=>statusPct(storeRow(currentPeriod()),k)>=100).length;const yellow=KPI_LIST.filter(k=>statusPct(storeRow(currentPeriod()),k)>=90&&statusPct(storeRow(currentPeriod()),k)<100).length;const red=KPI_LIST.length-green-yellow;const topCoaching=[];priorities.forEach(p=>p.drivers.filter(x=>x.needed>0).slice(0,2).forEach(x=>topCoaching.push({...x,k:p.k,label:p.d.label,ps:p.score})));topCoaching.sort((a,b)=>(b.share*b.needed)-(a.share*a.needed));root.innerHTML=`<section class="intel-hero"><div class="intel-kicker">Mission Control</div><h1 class="intel-title">Performance Intelligence</h1><div class="intel-sub">Waar moet je vandaag je aandacht op richten?</div></section><section class="intel-grid"><div class="intel-tile"><h3>Groen</h3><div class="big">${green}</div><div class="small">KPI's op schema</div></div><div class="intel-tile"><h3>Geel</h3><div class="big">${yellow}</div><div class="small">binnen 10%</div></div><div class="intel-tile"><h3>Rood</h3><div class="big">${red}</div><div class="small">focus nodig</div></div><div class="intel-tile"><h3>Hoogste prioriteit</h3><div class="big">${esc(priorities[0]?.d.label||'—')}</div><div class="small">score ${priorities[0]?.score||0}</div></div></section><section class="intel-panel"><h2>1. KPI-prioriteiten</h2><div class="priority-list">${priorities.map(p=>`<div class="priority-item"><div class="priority-score">${p.score}</div><div><a class="mc-kpi-link priority-title" href="${pageFor(p.k)}">${esc(p.d.label)}</a><div class="priority-meta">${Math.round(statusPct(p.store,p.k))}% van target · ${p.drivers.length} actieve verkopers</div></div><div class="priority-action">Open dossier</div></div>`).join('')}</div></section><section class="intel-panel"><h2>2. Coachinglijst</h2><div class="priority-list">${topCoaching.slice(0,8).map((x,i)=>`<div class="priority-item"><div class="priority-score">${i+1}</div><div><div class="priority-title">${esc(x.name)} → ${esc(x.label)}</div><div class="priority-meta">Impact ${x.share.toFixed(1)}% · resultaat ${Math.round(x.perf)}%</div></div><div class="priority-action">${Math.round(x.needed)} extra nodig</div></div>`).join('')||'<div class="insight">Geen coachingprioriteiten gevonden.</div>'}</div></section><section class="intel-panel"><h2>3. Opportuniteiten</h2><div class="insight-list">${priorities.slice(0,6).map(p=>`<div class="insight">${esc(p.d.label)}: grootste hefboom is ${esc(p.drivers[0]?.name||'—')} (${p.drivers[0]?p.drivers[0].share.toFixed(0):0}% impact).</div>`).join('')}</div></section>`;}
  window.renderKpiDossier=renderKpiDossier;window.renderMissionControl=renderMissionControl;window.addEventListener('load',()=>{renderKpiDossier();renderMissionControl();});
})();


/* ============================================================
   Diestroyers District Dashboard
   Informative regional comparison, current month only.
   ============================================================ */
(function(){
  const BIG7_DISTRICT = ['life','dsp','insurance','spg','srp','abonnementen','link'];
  const ALL_DISTRICT = ['omzet','life','insurance','abonnementen','dsp','spg','srp','accessoires','link','monster','buyway','leaders','s','nps'];

  function dDef(k){return KPI_DEFS[k] || {key:k,label:k,type:'stuks'};}
  function dRows(){return (window.DIESTROYERS_DISTRICT||[]).filter(r=>String(r.Actief||r.actief||'JA').toLowerCase()!=='nee');}
  function dN(v){return n(v);}
  function dVal(row,k){
    const def=dDef(k), key=def.key;
    if(key==='Link')return dN(row.LinkPct);
    if(key==='S')return dN(row.SRatio);
    if(def.type==='ratio')return row[key+'Kansen']?dN(row[key+'Stuks'])/dN(row[key+'Kansen'])*100:dN(row[key+'Pct']);
    if(def.type==='accessoires')return dN(row.Accessoires);
    return dN(row[key]);
  }
  function dTarget(row,k){
    const def=dDef(k), key=def.key;
    if(key==='Link')return dN(row.LinkTargetPct);
    if(key==='S'){
      const m=String(row.Periode||currentPeriod()).split('-')[1]||'';
      return (m==='01'||m==='07')?50:35;
    }
    if(def.type==='ratio')return dN(row[key+'TargetPct']);
    if(def.type==='accessoires')return dN(row.Omzet)*dN(row.AccessoiresTargetPct)/100;
    return dN(row[key+'Target']);
  }
  function dPct(row,k){const t=dTarget(row,k); return t?dVal(row,k)/t*100:0;}
  function dPoints(row,k){const p=dPct(row,k); if(!dTarget(row,k))return 0; if(p>=100)return 3; if(p>=90)return 1; return 0;}
  function dScore(row,keys){return keys.reduce((a,k)=>a+dPoints(row,k),0);}
  function dFmt(row,k){
    const def=dDef(k), v=dVal(row,k);
    if(def.type==='bedrag'||def.type==='accessoires')return fmt(v,'bedrag');
    if(def.type==='ratio'||def.type==='percentage'||def.key==='Link'||def.key==='S')return fmt(v,'ratio');
    if(def.type==='score')return fmt(v,'score');
    return fmt(v,def.type);
  }
  function storeName(row){return row.Winkel||row.Naam||row.ShopNaam||row.ShopNr||'Winkel';}
  function isOwn(row){return String(row.ShopNr||'')==='208'||String(row.EigenWinkel||'').toLowerCase()==='ja'||String(row.EigenWinkel||'').toLowerCase()==='true';}
  function ranking(keys){return [...dRows()].sort((a,b)=>dScore(b,keys)-dScore(a,keys));}
  function podium(rows,keys){const top=rows.slice(0,3);return `<div class="district-podium">${[top[1],top[0],top[2]].map((r,idx)=>{if(!r)return '<div></div>';const place=idx===1?1:(idx===0?2:3);return `<div class="district-podium-card ${place===1?'gold':''}"><div class="place">${place===1?'🥇':place===2?'🥈':'🥉'}</div><div class="store">${esc(storeName(r))}</div><div class="score">${dScore(r,keys)} pt</div></div>`}).join('')}</div>`}
  function rankTable(rows,keys){
    return `<table class="district-table"><thead><tr><th>#</th><th>Winkel</th><th>Score</th>${keys.map(k=>`<th>${esc(dDef(k).label)}</th>`).join('')}</tr></thead><tbody>${rows.map((r,i)=>`<tr class="${isOwn(r)?'own':''}"><td>${i+1}</td><td><strong>${esc(storeName(r))}</strong></td><td class="num"><strong>${dScore(r,keys)}</strong></td>${keys.map(k=>`<td class="num">${esc(dFmt(r,k))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function champions(){
    return ALL_DISTRICT.map(k=>{
      const rows=[...dRows()].filter(r=>dVal(r,k)!==0).sort((a,b)=>dVal(b,k)-dVal(a,k));
      const w=rows[0];
      return `<div class="champion-card"><h3>${esc(dDef(k).label)}</h3><div class="winner">${w?esc(storeName(w)):'—'}</div><div class="muted">${w?esc(dFmt(w,k)):'geen data'}</div></div>`;
    }).join('');
  }
  function heatmap(){
    const rows=dRows(), own=rows.find(isOwn)||{};
    return `<table class="district-table"><thead><tr><th>KPI</th><th>Diest</th><th>District gem.</th><th>Beste</th><th>Status</th></tr></thead><tbody>${ALL_DISTRICT.map(k=>{
      const vals=rows.map(r=>dVal(r,k)).filter(v=>isFinite(v)&&v!==0);
      const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0;
      const best=vals.length?Math.max(...vals):0;
      const ownVal=dVal(own,k);
      const cls=ownVal>=best?'heat-good':(ownVal>=avg?'heat-mid':'heat-bad');
      const status=ownVal>=best?'Districtleider':ownVal>=avg?'Boven gemiddelde':'Aanvalskans';
      return `<tr><td><strong>${esc(dDef(k).label)}</strong></td><td class="num">${esc(dFmt(own,k))}</td><td class="num">${esc(fmt(avg,(dDef(k).type==='bedrag'||dDef(k).type==='accessoires')?'bedrag':(dDef(k).type==='score'?'score':'ratio')))}</td><td class="num">${esc(fmt(best,(dDef(k).type==='bedrag'||dDef(k).type==='accessoires')?'bedrag':(dDef(k).type==='score'?'score':'ratio')))}</td><td class="${cls}"><strong>${status}</strong></td></tr>`;
    }).join('')}</tbody></table>`;
  }
  function renderDistrict(){
    const root=document.getElementById('district-root'); if(!root)return;
    const rows=dRows();
    if(!rows.length){root.innerHTML='<div class="district-hero"><h1>District</h1><p>Geen districtdata gevonden. Voer eerst Website bijwerken uit nadat DistrictActueel gevuld is.</p></div>';return;}
    const allRank=ranking(ALL_DISTRICT), bigRank=ranking(BIG7_DISTRICT);
    const own=rows.find(isOwn)||{};
    const ownAll=allRank.findIndex(isOwn)+1, ownBig=bigRank.findIndex(isOwn)+1;
    root.innerHTML=`
      <section class="district-hero">
        <h1>District Dashboard</h1>
        <p>Actuele maandvergelijking met de gekozen regiowinkels. Informatief en motiverend, niet historisch.</p>
      </section>
      <section class="district-kpi-grid">
        <div class="district-card"><h3>District winkels</h3><div class="district-big">${rows.length}</div><div class="district-small">actief in vergelijking</div></div>
        <div class="district-card"><h3>Diest algemeen</h3><div class="district-big">#${ownAll||'-'}</div><div class="district-small">${dScore(own,ALL_DISTRICT)} punten</div></div>
        <div class="district-card"><h3>Diest BIG 7</h3><div class="district-big">#${ownBig||'-'}</div><div class="district-small">${dScore(own,BIG7_DISTRICT)} punten</div></div>
        <div class="district-card"><h3>KPI kampioen</h3><div class="district-big">${ALL_DISTRICT.filter(k=>{const vals=rows.map(r=>dVal(r,k));return dVal(own,k)===Math.max(...vals)&&dVal(own,k)>0}).length}</div><div class="district-small">keer Diest #1</div></div>
      </section>
      <section class="district-layout">
        <div class="district-panel"><h2>Algemene ranking</h2>${podium(allRank,ALL_DISTRICT)}<div class="tablewrap">${rankTable(allRank,ALL_DISTRICT)}</div></div>
        <div class="district-panel"><h2>BIG 7 ranking</h2>${podium(bigRank,BIG7_DISTRICT)}<div class="tablewrap">${rankTable(bigRank,BIG7_DISTRICT)}</div></div>
      </section>
      <section class="district-panel"><h2>KPI Champions</h2><div class="champion-grid">${champions()}</div></section>
      <section class="district-panel" style="margin-top:22px"><h2>District Heatmap</h2><div class="tablewrap">${heatmap()}</div></section>
    `;
  }
  window.renderDistrict=renderDistrict;
  window.addEventListener('DOMContentLoaded',renderDistrict);
  window.addEventListener('load',renderDistrict);
})();
