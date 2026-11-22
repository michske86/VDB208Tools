
(function(){
  const moneyFmt = new Intl.NumberFormat('nl-BE',{maximumFractionDigits:0});
  const pctFmt = new Intl.NumberFormat('nl-BE',{maximumFractionDigits:1});
  const DATA = () => Array.isArray(window.DIESTROYERS_RESULTATEN) ? window.DIESTROYERS_RESULTATEN : [];
  const KPIS = () => Array.isArray(window.DIESTROYERS_KPIS) ? window.DIESTROYERS_KPIS : [];
  const SELLERS = () => Array.isArray(window.DIESTROYERS_VERKOPERS) ? window.DIESTROYERS_VERKOPERS : [];
  const TARGETS = () => Array.isArray(window.DIESTROYERS_TARGETS) ? window.DIESTROYERS_TARGETS : [];
  const KPI_ALIAS = {abonnementen:'Abo'};
  function n(v){ if(v===null||v===undefined||v==='') return 0; return Number(String(v).replace(',','.'))||0; }
  function s(v){ return String(v??'').trim(); }
  function norm(v){ return s(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(); }
  function currentPeriod(){ const rows=DATA().filter(r=>s(r.Periode)); if(rows.length) return rows.map(r=>s(r.Periode)).sort().at(-1); const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
  function kpiDef(key){ key=KPI_ALIAS[key]||key; const found=KPIS().find(k=>norm(k.KPI)===norm(key)||norm(k.Label)===norm(key)); if(found) return found; const fall={Omzet:['Omzet','bedrag','Omzet','OmzetTarget','','','€'],Life:['Life','stuks','Life','LifeTarget','','','stuks'],Insurance:['Insurance','ratio','','InsuranceTargetPct','InsuranceStuks','InsuranceKansen','%'],Abo:['Abonnementen','stuks','Abo','AboTarget','','','stuks'],DSP:['DSP','ratio','','DSPTargetPct','DSPStuks','DSPKansen','%'],SPG:['SPG','stuks','SPG','SPGTarget','','','stuks'],SRP:['SRP','stuks','SRP','SRPTarget','','','stuks'],Accessoires:['Accessoires','bedrag','Accessoires','AccessoiresTarget','','','€'],NPS:['NPS','score','NPS','NPSTarget','','','score']}[key]||[key,key,'stuks',key,key+'Target','','',''];
    return {KPI:key,Label:fall[0],Type:fall[1],WaardeKolom:fall[2],TargetKolom:fall[3],TellerKolom:fall[4],NoemerKolom:fall[5],Eenheid:fall[6]}; }
  function rowsForPeriod(p){ return DATA().filter(r=>s(r.Periode)===p); }
  function storeRow(p){ return rowsForPeriod(p).find(r=>norm(r.EntiteitType)==='winkel'||norm(r.Naam)==='diest') || {}; }
  function sellerRows(p){ return rowsForPeriod(p).filter(r=>norm(r.EntiteitType)==='verkoper' || (norm(r.Naam)!=='diest' && s(r.Naam))); }
  function targetFallback(period, def){ const t=TARGETS().find(x=>s(x.Periode)===period)||{}; return n(t[def.TargetKolom]); }
  function metric(row, def, period){
    const type=norm(def.Type), unit=s(def.Eenheid);
    let actual=0,target=0,display='',targetDisplay='',pct=0,shortfall=0,shortfallText='';
    if(type==='ratio'){
      const teller=n(row[def.TellerKolom]); const noemer=n(row[def.NoemerKolom]); target=n(row[def.TargetKolom]) || targetFallback(period,def);
      actual = noemer ? (teller/noemer*100) : 0;
      pct = target ? (actual/target*100) : 0;
      display = noemer ? `${teller}/${noemer} · ${pctFmt.format(actual)}%` : '—';
      targetDisplay = target ? `${pctFmt.format(target)}%` : '—';
      shortfall = Math.max(0, Math.ceil((target/100)*noemer - teller));
      shortfallText = shortfall>0 ? `nog ${shortfall} nodig` : '';
    } else {
      actual=n(row[def.WaardeKolom]); target=n(row[def.TargetKolom]) || targetFallback(period,def);
      pct = target ? (actual/target*100) : 0;
      display = unit==='€' ? `€ ${moneyFmt.format(actual)}` : (actual ? `${moneyFmt.format(actual)} ${unit&&unit!=='score'?unit:''}` : '—');
      targetDisplay = unit==='€' ? `€ ${moneyFmt.format(target)}` : (target ? `${moneyFmt.format(target)} ${unit&&unit!=='score'?unit:''}` : '—');
      shortfall = Math.max(0, target-actual);
      shortfallText = shortfall>0 ? (unit==='€' ? `nog € ${moneyFmt.format(shortfall)}` : `nog ${moneyFmt.format(shortfall)} nodig`) : '';
    }
    return {actual,target,display,targetDisplay,pct,shortfall,shortfallText};
  }
  function sellerAvatar(name){ const v=SELLERS().find(x=>norm(x.Naam)===norm(name)); return v ? s(v.Avatar) : `${norm(name)}.png`; }
  function scoreRow(row, period){ const defs=KPIS().length?KPIS():['Omzet','Life','Insurance','Abo','DSP','SPG','SRP','Accessoires','NPS'].map(kpiDef); let total=0, weight=0; defs.forEach(d=>{ const w=n(d.RankingGewicht)||1; const m=metric(row,d,period); if(m.target>0){ total += Math.min(m.pct,150)*w; weight += w; }}); return weight?total/weight:0; }
  function esc(v){ return String(v??'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function card(def,row,period){ const m=metric(row,def,period); const ok=m.target && m.pct>=100; return `<div class="result-card ${ok?'ok':'warn'}"><span>${esc(def.Label||def.KPI)}</span><strong>${esc(m.display)}</strong><small>Target: ${esc(m.targetDisplay)}</small><div class="bar"><i style="width:${Math.max(0,Math.min(m.pct,140))}%"></i></div><em>${m.target?pctFmt.format(m.pct)+'%':''}</em></div>`; }
  function drawLine(canvas, points){ if(!canvas) return; const ctx=canvas.getContext('2d'); const w=canvas.width=canvas.offsetWidth*2, h=canvas.height=260*2; ctx.clearRect(0,0,w,h); ctx.lineWidth=4; ctx.strokeStyle='#ff1616'; ctx.fillStyle='rgba(255,22,22,.14)'; const vals=points.map(p=>p.value); const max=Math.max(1,...vals)*1.15; const pad=44; const xy=points.map((p,i)=>[pad+i*((w-pad*2)/Math.max(points.length-1,1)), h-pad-(p.value/max)*(h-pad*2)]); ctx.beginPath(); xy.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.stroke(); ctx.lineTo(w-pad,h-pad); ctx.lineTo(pad,h-pad); ctx.closePath(); ctx.fill(); ctx.fillStyle='#fff'; ctx.font='22px Rajdhani'; points.forEach((p,i)=>{ if(i%Math.ceil(points.length/6)===0) ctx.fillText(p.period.slice(5)||p.period, xy[i][0]-14, h-12); }); }
  window.DiestroyersResults = {currentPeriod,kpiDef,metric,storeRow,sellerRows,scoreRow,card,esc,drawLine,sellerAvatar,DATA,KPIS};
})();
