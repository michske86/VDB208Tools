/* The Diestroyers V6 - Full Modular Render Migration
   This file makes the modular architecture the active renderer:
   - navigation.js = menu
   - registry.js = KPI source of truth
   - calculations.js = value/target/YTD/ranking/impact
   - components.js = UI blocks
   - coach-engine.js = coaching
   - simulation-engine.js = simulations
*/
(function(w){
  const D = w.Diestroyers = w.Diestroyers || {};
  const C = () => D.calculations;
  const CMP = () => D.components;
  const REG = () => D.registry || {};
  const esc = s => CMP()?.esc ? CMP().esc(s) : String(s ?? "");
  const qs = s => document.querySelector(s);
  const qid = id => document.getElementById(id);
  const kpis = () => REG().kpis || [];
  const big7 = () => D.config?.big7 || ["life","dsp","insurance","spg","srp","abonnementen","link"];
  const fmt = (v,t) => C().format(v,t);
  function kpiIdFromPage(root){
    const p = new URLSearchParams(location.search);
    const q = p.get("kpi") || p.get("k") || root?.dataset?.kpi;
    if(q) return q;
    const file = (location.pathname.split("/").pop() || "").toLowerCase();
    const hit = kpis().find(k => String(k.legacyPage||"").toLowerCase() === file);
    return hit?.id || "omzet";
  }
  function activeSellers(){
    return (w.DIESTROYERS_CONFIG_DATA?.verkopers || w.DIESTROYERS_VERKOPERS || []).filter(v=>{
      const a = String(v.Actief ?? v.actief ?? "JA").toLowerCase();
      return !["nee","no","0","false","n"].includes(a);
    });
  }
  function sellerId(v){return String(v.PersoneelsNr ?? v.personeelsNr ?? v.id ?? "").trim();}
  function sellerName(v){return String(v.Naam ?? v.naam ?? "").trim();}
  function sellerByIdOrName(x){
    const s = String(x||"").toLowerCase();
    return activeSellers().find(v => sellerId(v) === x || sellerName(v).toLowerCase() === s) || {};
  }
  function avatar(v,name){return v.Avatar || v.avatar || `${name}.png`;}
  function rowId(r){return String(r.PersoneelsNr ?? r.personeelsNr ?? "").trim();}
  function sellerRowsAll(id,name){
    return (w.DIESTROYERS_RESULTATEN || []).filter(r => String(r.EntiteitType||"").toLowerCase()==="verkoper" && ((id && rowId(r)===id) || (!id && String(r.Naam||"").toLowerCase()===String(name||"").toLowerCase())));
  }
  function periodsForSeller(id,name){
    return [...new Set(sellerRowsAll(id,name).map(r=>String(r.Periode||"")).filter(Boolean))].sort();
  }
  function rowForSeller(id,name,per){
    return sellerRowsAll(id,name).find(r=>String(r.Periode||"")===String(per)) || {};
  }
  function ytdRowsForSeller(id,name,year){
    return sellerRowsAll(id,name).filter(r=>String(r.Periode||"").startsWith(String(year)+"-")).sort((a,b)=>String(a.Periode).localeCompare(String(b.Periode)));
  }
  function lineCanvas(id,title){
    return `<div class="trend-card"><h3>${esc(title)}</h3><canvas id="${esc(id)}"></canvas></div>`;
  }
  function drawSimpleLine(canvas, labels, values){
    if(!canvas) return;
    if(typeof w.drawLine === "function"){ w.drawLine(canvas, labels, values); return; }
    const W=Math.max(320,canvas.offsetWidth||360), H=210;
    canvas.width=W*2; canvas.height=H*2;
    const ctx=canvas.getContext("2d"); ctx.setTransform(2,0,0,2,0,0);
    ctx.clearRect(0,0,W,H);
    const vals=(values||[]).map(Number).filter(v=>isFinite(v));
    if(!vals.length){ctx.fillStyle="#aaa";ctx.font="18px Rajdhani";ctx.fillText("Geen data",18,40);return;}
    const min=Math.min(...vals,0), max=Math.max(...vals,1), pad=24;
    ctx.strokeStyle="rgba(255,255,255,.12)";ctx.lineWidth=1;
    for(let i=0;i<4;i++){const y=pad+(H-pad*2)*i/3;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(W-pad,y);ctx.stroke();}
    ctx.beginPath();
    values.forEach((v,i)=>{
      const x=pad+(W-pad*2)*(values.length===1?.5:i/(values.length-1));
      const y=H-pad-(Number(v)-min)/(max-min||1)*(H-pad*2);
      if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
    });
    ctx.strokeStyle="#e11919";ctx.lineWidth=3;ctx.stroke();
  }
  function drawRadar(canvas, labels, values){
    if(!canvas)return;
    const W=Math.max(320,canvas.offsetWidth||360),H=340;canvas.width=W*2;canvas.height=H*2;
    const ctx=canvas.getContext("2d");ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,W,H);
    const cx=W/2,cy=H/2+8,R=Math.min(W,H)*.34;
    for(let ring=1;ring<=4;ring++){ctx.beginPath();labels.forEach((_,i)=>{const a=-Math.PI/2+i*2*Math.PI/labels.length,x=cx+Math.cos(a)*R*ring/4,y=cy+Math.sin(a)*R*ring/4;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();ctx.strokeStyle="rgba(255,255,255,.12)";ctx.stroke();}
    ctx.font="13px Rajdhani";ctx.fillStyle="rgba(255,255,255,.72)";ctx.textAlign="center";ctx.textBaseline="middle";
    labels.forEach((lab,i)=>{const a=-Math.PI/2+i*2*Math.PI/labels.length;ctx.fillText(String(lab).slice(0,11),cx+Math.cos(a)*(R+32),cy+Math.sin(a)*(R+27));});
    ctx.beginPath();values.forEach((v,i)=>{const a=-Math.PI/2+i*2*Math.PI/labels.length,r=R*Math.max(0,Math.min(120,v||0))/120,x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});ctx.closePath();ctx.fillStyle="rgba(225,25,25,.26)";ctx.fill();ctx.strokeStyle="#e11919";ctx.lineWidth=3;ctx.stroke();
  }

  function renderHome(){
    const main = qs("body.home-body main.page");
    if(!main) return;
    main.innerHTML = `
      <section class="intel-hero">
        <div class="intel-kicker">The Diestroyers</div>
        <h1 class="intel-title">Performance Platform</h1>
        <div class="intel-sub">Kies je cockpit: Focus Analyse, Resultaten, KPI-dossiers, District of TV-dashboard.</div>
      </section>
      <section class="intel-grid">
        ${CMP().tile("Focus Analyse","Start","managementcockpit")}
        ${CMP().tile("Resultaten","Team","verkopersdossiers")}
        ${CMP().tile("KPIs","Dossiers","impactanalyse")}
        ${CMP().tile("TV","Dashboard","fullscreen")}
      </section>
      <section class="intel-panel">
        <h2>Snelle toegang</h2>
        <div class="dossier-nav-cards">
          ${CMP().navCard(1,"Focus Analyse","mission-control.html")}
          ${CMP().navCard(2,"Resultaten","verkopersresultaten.html")}
          ${CMP().navCard(3,"KPIs","kpi.html?kpi=omzet")}
          ${CMP().navCard(4,"District","district.html")}
          ${CMP().navCard(5,"TV Dashboard","tv.html")}
        </div>
      </section>`;
  }

  function renderMission(){
    const root=qid("mission-control-root"); if(!root)return;
    const period=C().period(), store=C().storeRow(period);
    const priorities=D.coach.kpiPriorities();
    const green=kpis().filter(k=>C().status(store,k.id,period).className==="ok").length;
    const yellow=kpis().filter(k=>C().status(store,k.id,period).className==="close").length;
    const red=kpis().length-green-yellow;
    const daily=D.coach.dailyFocus(8);
    root.innerHTML=`
      <section class="intel-hero"><div class="intel-kicker">Focus Analyse</div><h1 class="intel-title">Mission Control</h1><div class="intel-sub">Waar levert aandacht vandaag het meeste op?</div></section>
      <section class="intel-grid">
        ${CMP().tile("Groen",green,"KPI's op schema")}
        ${CMP().tile("Geel",yellow,"binnen 10%")}
        ${CMP().tile("Rood",red,"focus nodig")}
        ${CMP().tile("Topprioriteit",priorities[0]?.kpi ? C().def(priorities[0].kpi).label : "—",`score ${priorities[0]?.score||0}`)}
      </section>
      ${CMP().panel("1. KPI-prioriteiten", `<div class="priority-list">${priorities.map((p,i)=>CMP().priorityItem(p.score,C().def(p.kpi).label,`${Math.round(p.status.pct)}% van target · ${p.drivers.length} actieve verkopers`,"Open dossier",`kpi.html?kpi=${encodeURIComponent(p.kpi)}`)).join("")}</div>`)}
      ${CMP().panel("2. Coachinglijst", `<div class="priority-list">${daily.map((x,i)=>CMP().priorityItem(i+1,`${C().def(x.kpi).label} · ${x.seller}`,x.reason,x.action)).join("") || CMP().insight("Geen concrete coachingprioriteiten: de data toont geen directe hefboom.")}</div>`)}
      ${CMP().panel("3. Momentum", `<div class="insight-list">${kpis().slice(0,10).map(k=>{const rows=(w.DIESTROYERS_RESULTATEN||[]).filter(r=>String(r.EntiteitType||"").toLowerCase()==="winkel").sort((a,b)=>String(a.Periode).localeCompare(String(b.Periode))).slice(-12);const tr=C().trend(k.id,rows);return CMP().insight(`${k.label}: ${tr.direction==="up"?"stijgend":tr.direction==="down"?"dalend":"stabiel"} over de laatste metingen.`)}).join("")}</div>`)}
    `;
  }

  function driverTable(kpiId){
    const rows=C().impactRows(kpiId);
    const body=rows.map((x,i)=>[
      `${i+1}`,
      `<strong>${esc(x.name)}</strong>`,
      `<span class="num">${x.impactShare.toFixed(1)}%</span>`,
      `<span class="num">${Math.round(x.performance)}%</span>`,
      `<span class="num">${Math.round(x.needed)}</span>`,
      `<span class="${x.status.className==="ok"?"heat-good":x.status.className==="close"?"heat-mid":"heat-bad"}"><strong>${esc(x.status.label)}</strong></span>`
    ]);
    return CMP().table(["#","Verkoper","Impact","Prestatie","Nodig","Status"],body,"driver-table");
  }
  function impactMatrix(kpiId){
    const rows=C().impactRows(kpiId);
    const hi=rows.length?rows.reduce((a,b)=>a+b.impactShare,0)/rows.length:0;
    const groups={star:[],lever:[],nice:[],develop:[]};
    rows.forEach(x=>{
      const highImpact=x.impactShare>=hi, good=x.performance>=100;
      if(highImpact&&good)groups.star.push(x);
      else if(highImpact&&!good)groups.lever.push(x);
      else if(!highImpact&&good)groups.nice.push(x);
      else groups.develop.push(x);
    });
    const block=(title,arr,cls="")=>`<div class="matrix-box ${cls}"><h3>${esc(title)}</h3>${arr.map(x=>`<div class="matrix-item">${esc(x.name)} · ${x.impactShare.toFixed(1)}% impact · ${Math.round(x.performance)}%</div>`).join("")||'<div class="matrix-item">Geen verkopers</div>'}</div>`;
    return `<div class="impact-matrix">${block("Hoge impact + hoog resultaat",groups.star,"star")}${block("Hoge impact + groeikans",groups.lever,"hot")}${block("Lage impact + hoog resultaat",groups.nice)}${block("Lage impact + groeikans",groups.develop)}</div>`;
  }
  function renderKpi(){
    const root=qid("kpi-dossier-root"); if(!root)return;
    const kpiId=kpiIdFromPage(root), d=C().def(kpiId), period=C().period(), store=C().storeRow(period);
    root.dataset.kpi=kpiId;
    document.title=`${d.label} | The Diestroyers`;
    const storeRows=(w.DIESTROYERS_RESULTATEN||[]).filter(r=>String(r.EntiteitType||"").toLowerCase()==="winkel");
    const year=String(period).slice(0,4);
    const ytdRows=storeRows.filter(r=>String(r.Periode||"").startsWith(year+"-"));
    const y=C().calculateYTD(kpiId,ytdRows);
    const p=C().priority(kpiId);
    const drivers=C().impactRows(kpiId);
    const sim1=D.simulation.simulateSellerToTarget(kpiId, drivers.slice(0,1).map(x=>x.row));
    const sim2=D.simulation.simulateSellerToTarget(kpiId, drivers.slice(0,2).map(x=>x.row));
    root.innerHTML=`
      <section class="intel-hero"><div class="intel-kicker">KPI Performance Dossier</div><h1 class="intel-title">${esc(d.label)}</h1><div class="intel-sub">Hoe raakt deze KPI op groen, wie heeft impact, en waar zit de grootste hefboom?</div></section>
      <section class="intel-grid">
        ${CMP().tile("Maand",fmt(C().value(store,kpiId),d.type),`Target: ${fmt(C().target(store,kpiId,period),d.type)}`)}
        ${CMP().tile("YTD",y.display,`Target YTD: ${y.targetDisplay}`)}
        ${CMP().tile("Status",`${Math.round(C().percent(store,kpiId,period))}%`,"t.o.v. target")}
        ${CMP().tile("Prioriteit",p.score,"managementscore")}
      </section>
      ${CMP().panel("1. Evolutie", `<div class="trend-card"><canvas id="kpiTrendV6"></canvas></div>`)}
      ${CMP().panel("2. Drivers & impact", driverTable(kpiId))}
      ${CMP().panel("3. Impact Matrix", impactMatrix(kpiId))}
      ${CMP().panel("4. Opportuniteiten & simulatie", `<div class="sim-grid">${CMP().tile("Grootste hefboom",drivers[0]?.name||"—",drivers[0]?`${Math.round(drivers[0].needed)} extra nodig`:"geen data")}${CMP().tile("Top 1 naar target",`${Math.round(sim1.pct)}%`,"geprojecteerde KPI-score")}${CMP().tile("Top 2 naar target",`${Math.round(sim2.pct)}%`,"geprojecteerde KPI-score")}${CMP().tile("Actieve verkopers",drivers.length,"met impactdata")}</div>`)}
      ${CMP().panel("5. Coachingprioriteiten", `<div class="priority-list">${D.coach.coachingForKpi(kpiId).slice(0,6).map(c=>CMP().priorityItem(c.priority,c.seller,c.reason,c.action)).join("") || CMP().insight("Geen directe coachingprioriteit gevonden.")}</div>`)}
    `;
    setTimeout(()=>drawSimpleLine(qid("kpiTrendV6"), storeRows.slice(-12).map(r=>r.Periode), storeRows.slice(-12).map(r=>C().value(r,kpiId))),0);
  }

  function renderSellersOverview(){
    const root=qid("sellers-overview-root"); if(!root)return;
    const period=C().period();
    const ranking=C().calculateRanking(C().sellerRows(period), kpis().map(k=>k.id));
    const cards=activeSellers().map(v=>{
      const id=sellerId(v), name=sellerName(v);
      const row=ranking.find(x=>id && rowId(x.row)===id)?.row || ranking.find(x=>String(x.row.Naam||"").toLowerCase()===name.toLowerCase())?.row || {};
      const rnk=ranking.find(x=>x.row===row);
      return `<a class="seller-overview-card" href="${id?`verkoper.html?id=${encodeURIComponent(id)}`:`verkoper.html?naam=${encodeURIComponent(name)}`}"><img src="assets/${esc(avatar(v,name))}" onerror="this.style.display='none'"><div><h3>${esc(name)}</h3><div class="seller-overview-meta"><span>#${rnk?.rank||"-"}</span><span>${rnk?.score||0} pt</span><span>${esc(period)}</span></div></div></a>`;
    }).join("");
    root.innerHTML=`<section class="intel-hero"><div class="intel-kicker">Resultaten</div><h1 class="intel-title">Performance Dossiers</h1><div class="intel-sub">Actieve verkopers, automatisch opgebouwd uit de XLSM.</div></section><section class="section"><h2>Actieve verkopers</h2><div class="sellers-overview-grid">${cards}</div></section>`;
  }

  function renderSeller(){
    const root=qid("seller-root"); if(!root)return;
    const params=new URLSearchParams(location.search);
    const rec=sellerByIdOrName(params.get("id")||params.get("naam")||document.body.dataset.seller||"");
    const id=params.get("id")||sellerId(rec)||"", name=sellerName(rec)||params.get("naam")||document.body.dataset.seller||"Verkoper";
    const pList=periodsForSeller(id,name), per=params.get("periode")||C().period(), row=rowForSeller(id,name,per), display=sellerName(rec)||row.Naam||name;
    const year=String(per).slice(0,4), yRows=ytdRowsForSeller(id,display,year);
    const yMap=Object.fromEntries(kpis().map(k=>[k.id,C().calculateYTD(k.id,yRows)]));
    const radarKeys=["omzet","life","insurance","dsp","spg","srp","accessoires","link","buyway","leaders"].filter(k=>C().def(k));
    const ranking=C().calculateRanking(C().sellerRows(per), kpis().map(k=>k.id));
    const rank=ranking.find(x=>(id&&rowId(x.row)===id)||String(x.row.Naam||"").toLowerCase()===String(display).toLowerCase());
    const coach=D.coach.coachingForSeller(row);
    const ytdTable=kpis().map(k=>{const m=yMap[k.id], st={className:m.pct>=100?"ok":m.pct>=90?"close":"bad",label:m.target?m.pct>=100?"On track":m.pct>=90?"Binnen 10%":"Focus nodig":"Geen target"};return [`<strong>${esc(k.label)}</strong>`,`<span class="num">${esc(m.display)}</span>`,`<span class="num">${esc(m.targetDisplay)}</span>`,`<span class="${st.className==="ok"?"heat-good":st.className==="close"?"heat-mid":"heat-bad"}"><strong>${esc(st.label)}</strong></span>`]}).map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("");
    const monthTable=kpis().map(k=>{const st=C().status(row,k.id,per);return `<tr><td><strong>${esc(k.label)}</strong></td><td class="num">${esc(fmt(C().value(row,k.id),k.type))}</td><td class="num">${esc(fmt(C().target(row,k.id,per),k.type))}</td><td class="${st.className==="ok"?"heat-good":st.className==="close"?"heat-mid":"heat-bad"}"><strong>${esc(st.label)}</strong></td></tr>`}).join("");
    root.innerHTML=`
      <section class="dossier-hero compact"><div class="dossier-hero-card"><div class="dossier-kicker">Performance Dossier</div><h1 class="dossier-title">${esc(display)}</h1></div><div class="dossier-photo"><img src="assets/${esc(avatar(rec,display))}" onerror="this.style.display='none'"></div></section>
      <nav class="dossier-nav-cards">${CMP().navCard(1,"Performance YTD","#performance")}${CMP().navCard(2,"Evolutie","#evolutie")}${CMP().navCard(3,"Maandresultaten","#maand")}${CMP().navCard(4,"Awards & Rankings","#awards")}${CMP().navCard(5,"Coaching","#coaching")}</nav>
      <section class="analysis-panel" id="performance"><h2>1. Performance YTD ${esc(year)}</h2><div class="dossier-grid">${CMP().tile("YTD maanden",yRows.length,"beschikbaar")}${CMP().tile("Ranking",`#${rank?.rank||"-"}`,per)}${CMP().tile("Score",rank?.score||0,"punten geselecteerde maand")}${CMP().tile("On track YTD",Object.values(yMap).filter(x=>x.target&&x.pct>=100).length,"KPI's")}</div><div class="dossier-two"><div class="radarbox"><canvas id="sellerRadarV6"></canvas></div><div class="kpi-health-grid">${kpis().map(k=>{const m=yMap[k.id], cls=m.target?(m.pct>=100?"ok":m.pct>=90?"close":"bad"):"bad";return `<div class="health-card ${cls}"><div class="health-name">${esc(k.label)}</div><div class="health-value">${esc(m.display)}</div><div class="health-meta">Target YTD: ${esc(m.targetDisplay)}</div><div class="health-status">${m.target?Math.round(m.pct)+"%":"Geen target"}</div></div>`}).join("")}</div></div><div class="tablewrap" style="margin-top:18px"><table class="dossier-table"><thead><tr><th>KPI</th><th>Resultaat YTD</th><th>Target YTD</th><th>Status YTD</th></tr></thead><tbody>${ytdTable}</tbody></table></div></section>
      <section class="analysis-panel" id="evolutie"><h2>2. Evolutie laatste 12 maanden</h2><div class="trend-grid">${radarKeys.map((k,i)=>lineCanvas(`sellerTrendV6_${i}`,C().def(k).label)).join("")}</div></section>
      <section class="analysis-panel" id="maand"><h2>3. Maandresultaten</h2><div class="month-picker-row"><label for="monthSelect">Kies maand</label><select id="monthSelect">${pList.map(p=>`<option value="${esc(p)}" ${p===per?"selected":""}>${esc(p)}</option>`).join("")}</select></div><div class="tablewrap"><table class="dossier-table"><thead><tr><th>KPI</th><th>Resultaat</th><th>Target</th><th>Status</th></tr></thead><tbody>${monthTable}</tbody></table></div></section>
      <section class="analysis-panel" id="awards"><h2>4. Awards & Rankings</h2><div class="rank-grid">${CMP().tile("Overall ranking",`#${rank?.rank||"-"}`,per)}${CMP().tile("Score",rank?.score||0,"punten")}${CMP().tile("YTD groen",Object.values(yMap).filter(x=>x.target&&x.pct>=100).length,"KPI's on track")}</div></section>
      <section class="analysis-panel" id="coaching"><h2>5. Coaching</h2><div class="priority-list">${coach.slice(0,6).map((x,i)=>CMP().priorityItem(i+1,x.label,`${Math.round(x.pct)}% van target`,x.action)).join("")}</div></section>`;
    qid("monthSelect")?.addEventListener("change",e=>{const u=new URL(location.href);u.searchParams.set("periode",e.target.value);location.href=u.toString();});
    setTimeout(()=>{drawRadar(qid("sellerRadarV6"),radarKeys.map(k=>C().def(k).label),radarKeys.map(k=>yMap[k].pct));radarKeys.forEach((k,i)=>{const rows=sellerRowsAll(id,display).sort((a,b)=>String(a.Periode).localeCompare(String(b.Periode))).slice(-12);drawSimpleLine(qid(`sellerTrendV6_${i}`),rows.map(r=>r.Periode),rows.map(r=>C().value(r,k)));});},0);
  }

  function renderDiest(){
    const root=qid("diest-root"); if(!root)return;
    const period=C().period(), store=C().storeRow(period), rows=C().sellerRows(period), ranking=C().calculateRanking(rows,kpis().map(k=>k.id));
    root.innerHTML=`<section class="intel-hero"><div class="intel-kicker">Resultaten</div><h1 class="intel-title">Diest</h1><div class="intel-sub">${esc(period)}</div></section><section class="intel-grid">${kpis().slice(0,12).map(k=>CMP().tile(k.label,fmt(C().value(store,k.id),k.type),`Target: ${fmt(C().target(store,k.id,period),k.type)}`)).join("")}</section>${CMP().panel("Ranking & overzicht",CMP().table(["#","Naam","Score",...kpis().slice(0,8).map(k=>k.label)],ranking.map(x=>[`<strong>${x.rank}</strong>`,`<a href="verkoper.html?id=${encodeURIComponent(rowId(x.row))}"><strong>${esc(x.row.Naam)}</strong></a>`,`<strong>${x.score}</strong>`,...kpis().slice(0,8).map(k=>esc(fmt(C().value(x.row,k.id),k.type)))]),"dossier-table"))}`;
  }

  function renderDistrict(){
    const root=qid("district-root"); if(!root)return;
    const rows=(w.DIESTROYERS_DISTRICT||[]).filter(r=>String(r.Actief||"JA").toLowerCase()!=="nee");
    if(!rows.length){root.innerHTML=`<section class="district-hero"><h1>District</h1><p>Geen districtdata gevonden.</p></section>`;return;}
    const all=kpis().map(k=>k.id), b7=big7();
    const val=(r,k)=>{const d=C().def(k); if(d.key==="Link")return C().num(r.LinkPct); if(d.key==="S")return C().num(r.SRatio); if(d.type==="ratio"){const ka=C().num(r[d.key+"Kansen"]),st=C().num(r[d.key+"Stuks"]);return ka?st/ka*100:C().num(r[d.key+"Pct"]);} if(d.type==="accessoires")return C().num(r.Accessoires); return C().num(r[d.key]);};
    const tar=(r,k)=>{const d=C().def(k); if(d.key==="Link")return C().num(r.LinkTargetPct); if(d.key==="S")return 35; if(d.type==="ratio")return C().num(r[d.key+"TargetPct"]); if(d.type==="accessoires")return C().num(r.Omzet)*C().num(r.AccessoiresTargetPct)/100; return C().num(r[d.key+"Target"]);};
    const pts=(r,k)=>{const t=tar(r,k),p=t?val(r,k)/t*100:0;return !t?0:p>=100?3:p>=90?1:0;};
    const score=(r,keys)=>keys.reduce((a,k)=>a+pts(r,k),0);
    const ranking=(keys)=>[...rows].sort((a,b)=>score(b,keys)-score(a,keys));
    const own=r=>String(r.ShopNr)===(D.config?.shopNr||"208")||String(r.EigenWinkel||"").toLowerCase()==="ja";
    const rankTable=(keys)=>CMP().table(["#","Winkel","Score",...keys.map(k=>C().def(k).label)],ranking(keys).map((r,i)=>[`<strong>${i+1}</strong>`,`<strong>${esc(r.Winkel||r.Naam||r.ShopNr)}</strong>`,`<strong>${score(r,keys)}</strong>`,...keys.map(k=>esc(fmt(val(r,k),C().def(k).type)))]),"district-table");
    const allRank=ranking(all), bRank=ranking(b7), ownRow=rows.find(own)||{};
    root.innerHTML=`<section class="district-hero"><h1>District Dashboard</h1><p>Actuele maandvergelijking met gekozen regiowinkels.</p></section><section class="district-kpi-grid">${CMP().tile("District winkels",rows.length,"actief")}${CMP().tile("Diest algemeen",`#${allRank.findIndex(own)+1||"-"}`,`${score(ownRow,all)} punten`)}${CMP().tile("Diest BIG 7",`#${bRank.findIndex(own)+1||"-"}`,`${score(ownRow,b7)} punten`)}${CMP().tile("KPI kampioen",all.filter(k=>val(ownRow,k)===Math.max(...rows.map(r=>val(r,k)))&&val(ownRow,k)>0).length,"keer #1")}</section><section class="district-layout"><div class="district-panel"><h2>Algemene ranking</h2>${rankTable(all)}</div><div class="district-panel"><h2>BIG 7 ranking</h2>${rankTable(b7)}</div></section>`;
  }

  function boot(){
    renderHome();
    renderMission();
    renderKpi();
    renderSellersOverview();
    renderSeller();
    renderDiest();
    renderDistrict();
  }
  D.renderers = {boot, renderHome, renderMission, renderKpi, renderSellersOverview, renderSeller, renderDiest, renderDistrict};
  document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("load", boot);
})(window);
