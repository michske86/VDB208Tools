(function(){
  const moneyFmt=new Intl.NumberFormat('nl-BE',{maximumFractionDigits:0});
  const pctFmt=new Intl.NumberFormat('nl-BE',{maximumFractionDigits:1});
  const R=Array.isArray(window.DIESTROYERS_RESULTATEN)?window.DIESTROYERS_RESULTATEN:[];
  const V=Array.isArray(window.DIESTROYERS_VERKOPERS)?window.DIESTROYERS_VERKOPERS:[];
  const A=Array.isArray(window.DIESTROYERS_AGENDA)?window.DIESTROYERS_AGENDA:[];
  const I=Array.isArray(window.DIESTROYERS_INCENTIVES)?window.DIESTROYERS_INCENTIVES:[];
  const S=Array.isArray(window.DIESTROYERS_INCENTIVE_SCORES)?window.DIESTROYERS_INCENTIVE_SCORES:[];
  const kpis=[
    {key:'Omzet',label:'Omzet',type:'amount',val:'Omzet',target:'OmzetTarget',unit:'€'},
    {key:'Life',label:'Life',type:'count',val:'Life',target:'LifeTarget',unit:'stuks'},
    {key:'Insurance',label:'Insurance',short:'Ins',type:'ratio',teller:'InsuranceStuks',noemer:'InsuranceKansen',target:'InsuranceTargetPct'},
    {key:'Abo',label:'Abonnementen',short:'Abo',type:'ratio',teller:'AboStuks',noemer:'AboKansen',target:'AboTargetPct'},
    {key:'DSP',label:'DSP',type:'ratio',teller:'DSPStuks',noemer:'DSPKansen',target:'DSPTargetPct'},
    {key:'SPG',label:'SPG',type:'ratio',teller:'SPGStuks',noemer:'SPGKansen',target:'SPGTargetPct'},
    {key:'SRP',label:'SRP',type:'ratio',teller:'SRPStuks',noemer:'SRPKansen',target:'SRPTargetPct'},
    {key:'Accessoires',label:'Accessoires',short:'Acc',type:'accessoires',val:'Accessoires',target:'AccessoiresTargetPct',unit:'€'},
    {key:'Link',label:'Link',type:'pct',val:'LinkPct',target:'LinkTargetPct'},
    {key:'Monster',label:'Monster',short:'Mon',type:'amount',val:'Monster',target:'MonsterTarget',unit:'€'},
    {key:'NPS',label:'NPS',type:'score',val:'NPS',target:'NPSTarget'}
  ];
  const mainKpis=['Omzet','Life','Insurance','Abo','DSP','SPG','SRP','Accessoires','Link','Monster'];
  function s(v){return String(v??'').trim()}
  function n(v){if(v===null||v===undefined||v==='')return 0;return Number(String(v).replace(',','.'))||0}
  function norm(v){return s(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
  function esc(v){return s(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function todayStr(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
  function currentPeriod(){const p=R.map(x=>s(x.Periode)).filter(Boolean).sort();return p.at(-1)||new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0')}
  const period=currentPeriod();
  window.DM={R,V,A,I,S,kpis,mainKpis,s,n,norm,esc,period,currentPeriod,todayStr,activeSellers,storeRow,sellerRows,def,metric,score,avatar,renderHeader,cardHtml,sellerListHtml,miniChart,query};
  function activeSellers(){return V.filter(v=>!['nee','no','0','false'].includes(norm(v.Actief))).filter(v=>s(v.PersoneelsNr)||s(v.Naam))}
  function storeRow(){return R.find(r=>s(r.Periode)===period&&(norm(r.EntiteitType)==='winkel'||norm(r.Naam)==='diest'))||{}}
  function sellerRows(){const active=activeSellers();return R.filter(r=>s(r.Periode)===period&&norm(r.EntiteitType)==='verkoper').filter(r=>{const id=s(r.PersoneelsNr);const name=norm(r.Naam);return active.some(v=>(s(v.PersoneelsNr)&&s(v.PersoneelsNr)===id)||norm(v.Naam)===name)})}
  function def(key){return kpis.find(k=>norm(k.key)===norm(key)||norm(k.label)===norm(key)||norm(k.short)===norm(key))}
  function metric(row,k){let actual=0,target=0,pct=0,display='—',todo='—',raw=0;
    if(!k)return {actual,target,pct,display,todo,points:0,status:'bad'};
    if(k.type==='ratio'){const teller=n(row[k.teller]),noemer=n(row[k.noemer]);target=n(row[k.target]);actual=noemer?teller/noemer*100:0;raw=teller;pct=target?actual/target*100:0;display=noemer?`${pctFmt.format(actual)}%`:'—';const need=Math.max(0,Math.ceil(target/100*noemer-teller));todo=need>0?`${need} to do`:'On track'}
    else if(k.type==='accessoires'){actual=n(row[k.val]);target=n(row.Omzet)*n(row[k.target])/100;raw=actual;pct=target?actual/target*100:0;display='€ '+moneyFmt.format(actual);const diff=Math.max(0,target-actual);todo=diff>0?`€ ${moneyFmt.format(diff)} to do`:'On track'}
    else if(k.type==='pct'){actual=n(row[k.val]);target=n(row[k.target]);raw=actual;pct=target?actual/target*100:0;display=pctFmt.format(actual)+'%';const diff=Math.max(0,target-actual);todo=diff>0?`${pctFmt.format(diff)}% to do`:'On track'}
    else {actual=n(row[k.val]);target=n(row[k.target]);raw=actual;pct=target?actual/target*100:0;display=k.unit==='€'?'€ '+moneyFmt.format(actual):moneyFmt.format(actual);const diff=Math.max(0,target-actual);todo=diff>0?(k.unit==='€'?`€ ${moneyFmt.format(diff)} to do`:`${moneyFmt.format(diff)} to do`):'On track'}
    const points=pct>=100?3:(pct>=90?1:0);return {actual,target,pct,display,todo,points,status:pct>=100?'ok':(pct>=90?'close':'bad'),raw};}
  function score(row){return mainKpis.reduce((a,key)=>a+metric(row,def(key)).points,0)}
  function avatar(rowOrName){let name=typeof rowOrName==='string'?rowOrName:s(rowOrName.Naam);let id=typeof rowOrName==='object'?s(rowOrName.PersoneelsNr):'';const v=V.find(x=>(id&&s(x.PersoneelsNr)===id)||norm(x.Naam)===norm(name));return v&&s(v.Avatar)?'assets/'+s(v.Avatar):'assets/'+norm(name)+'.png'}
  function query(){return Object.fromEntries(new URLSearchParams(location.search).entries())}
  function cardHtml(key,row){const k=def(key),m=metric(row,k);return `<div class="card ${m.status}"><div class="k-label">${esc(k.label)}</div><div class="k-value">${esc(m.display)}</div><div class="k-todo">${esc(m.todo)}</div></div>`}
  function sellerListHtml(rows){rows=[...rows].sort((a,b)=>score(b)-score(a));return `<div class="list">${rows.map((r,i)=>`<a class="row" href="mobile-verkoper.html?id=${encodeURIComponent(s(r.PersoneelsNr)||s(r.Naam))}"><div class="rank">${i+1}</div><img class="avatar" src="${avatar(r)}" onerror="this.style.display='none'"><div class="grow"><div class="row-title">${esc(r.Naam)}</div><div class="row-sub">${score(r)} rankingpunten</div></div><span class="pill">Open</span></a>`).join('')}</div>`}
  function miniChart(values){const nums=values.map(n).filter(x=>isFinite(x)); if(!nums.length)return ''; const max=Math.max(...nums,1),min=Math.min(...nums,0),range=max-min||1; const pts=nums.map((v,i)=>`${i*(100/(Math.max(nums.length-1,1)))},${50-((v-min)/range*44+3)}`).join(' ');return `<svg class="mini-chart" viewBox="0 0 100 56" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="rgba(225,25,25,.95)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><line x1="0" y1="53" x2="100" y2="53" stroke="rgba(255,255,255,.09)" stroke-width="1"/></svg>`}
})();
