/* The Diestroyers - Central Calculation Engine */
(function(w){
  const D = w.Diestroyers = w.Diestroyers || {};
  const cfg = D.config || {};
  const registry = D.registry || {};
  const admin = () => w.DIESTROYERS_CONFIG_DATA || {}; // Admin configuration source priority
  const kpis = registry.kpis || [];

  function num(v){
    if(v === null || v === undefined || v === "") return 0;
    if(typeof v === "number") return isFinite(v) ? v : 0;
    const s = String(v).replace(/\s/g,"").replace("%","").replace(/\./g,"").replace(",",".");
    const n = Number(s);
    return isFinite(n) ? n : 0;
  }
  // Centrale definitie voor service-KPI's.
  // 0 stuks / 0 kansen blijft 0%; zodra er stuks zijn, telt 0 kansen als 1.
  function servicePercentage(stuks, kansen){
    const actual = num(stuks), opportunities = num(kansen);
    if(actual === 0 && opportunities === 0) return 0;
    return actual / Math.max(1, opportunities) * 100;
  }
  function period(){
    if(typeof w.currentPeriod === "function") return w.currentPeriod();
    const rows = w.DIESTROYERS_RESULTATEN || [];
    const periods = [...new Set(rows.map(r => String(r.Periode||"").trim()).filter(Boolean))].sort();
    return periods.at(-1) || cfg.currentPeriodFallback;
  }
  function rowsForPeriod(p=period()){
    return (w.DIESTROYERS_RESULTATEN || []).filter(r => String(r.Periode||"").trim() === String(p).trim());
  }
  function storeRow(p=period()){
    const row = rowsForPeriod(p).find(r => String(r.EntiteitType||"").toLowerCase()==="winkel" || String(r.Naam||"").toLowerCase()==="diest") || {};
    if(num(row.SRatio)) return row;
    const own = (w.DIESTROYERS_DISTRICT || []).find(d =>
      String(d.Periode||"")===String(p) &&
      (String(d.EigenWinkel||"").toLowerCase()==="ja" || String(d.ShopNr||"")===String(admin().shop?.shopNr||"208") || String(d.Winkel||"").toLowerCase()===String(admin().shop?.naam||"Diest").toLowerCase())
    );
    return own ? {...row, SRatio:num(own.SRatio)||num(row.SRatio), SStuks:num(own.SStuks)||num(row.SStuks), SEuro:num(own.SEuro)||num(row.SEuro)} : row;
  }
  function sellerRows(p=period()){
    const active = (admin().verkopers || w.DIESTROYERS_VERKOPERS || []).filter(v => !["nee","no","0","false","n"].includes(String(v.Actief||"ja").toLowerCase()));
    const ids = new Set(active.map(v=>String(v.PersoneelsNr||"").trim()).filter(Boolean));
    const names = new Set(active.map(v=>String(v.Naam||"").trim().toLowerCase()).filter(Boolean));
    return rowsForPeriod(p).filter(r => {
      if(String(r.EntiteitType||"").toLowerCase()!=="verkoper") return false;
      if(!active.length) return true;
      return ids.has(String(r.PersoneelsNr||"").trim()) || names.has(String(r.Naam||"").trim().toLowerCase());
    });
  }
  function def(k){
    return registry.kpiById?.[k] || registry.kpiByKey?.[k] || kpis.find(x => x.id === k || x.key === k) || {id:k,key:k,label:k,type:"stuks"};
  }
  function sTarget(p=period()){
    const m = String(p||"").split("-")[1] || "";
    return (m === "01" || m === "07") ? cfg.sTargets?.januaryJulyGreen || 50 : cfg.sTargets?.defaultGreen || 35;
  }
  function value(row, k){
    const d = def(k), key = d.key;
    if(key === "Link") return num(row.LinkPct);
    if(key === "S") return num(row.SRatio);
    if(d.type === "ratio") {
      const st = num(row[key+"Stuks"]), ka = num(row[key+"Kansen"]);
      return ka ? st / ka * 100 : num(row[key+"Pct"]);
    }
    if(d.type === "accessoires") return num(row.Accessoires);
    if(d.type === "percentage") return num(row[key+"Pct"] ?? row[key]);
    return num(row[key]);
  }
  function target(row, k, p=period()){
    const d = def(k), key = d.key;
    if(key === "Link") return num(row.LinkTargetPct);
    if(key === "S") return sTarget(p);
    if(d.type === "ratio") return num(row[key+"TargetPct"]);
    if(d.type === "accessoires") return num(row.Omzet) * num(row.AccessoiresTargetPct) / 100;
    if(d.type === "percentage") return num(row[key+"TargetPct"] ?? row[key+"Target"]);
    return num(row[key+"Target"]);
  }
  function percent(row,k,p=period()){
    const t = target(row,k,p);
    return t ? value(row,k) / t * 100 : 0;
  }
  function points(row,k,p=period()){
    const t = target(row,k,p), pct = percent(row,k,p);
    if(!t) return cfg.points?.red || 0;
    if(pct >= (cfg.points?.greenThreshold || 100)) return cfg.points?.green || 3;
    if(pct >= (cfg.points?.yellowThreshold || 90)) return cfg.points?.yellow || 1;
    return cfg.points?.red || 0;
  }
  function status(row,k,p=period()){
    const t = target(row,k,p), pct = percent(row,k,p);
    if(!t) return {label:"Geen target", className:"bad", points:0, pct};
    if(pct >= 100) return {label:"On track", className:"ok", points:3, pct};
    if(pct >= 90) return {label:"Binnen 10%", className:"close", points:1, pct};
    return {label:"Focus nodig", className:"bad", points:0, pct};
  }
  function format(v,type){
    if(typeof w.fmt === "function"){
      if(type === "amount") return w.fmt(v,"bedrag");
      return w.fmt(v,type);
    }
    if(type === "bedrag" || type === "amount" || type === "accessoires") return new Intl.NumberFormat("nl-BE",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(num(v));
    if(type === "ratio" || type === "percentage") return num(v).toFixed(1).replace(".",",") + "%";
    if(type === "score") return String(Math.round(num(v)));
    return String(Math.round(num(v)));
  }
  function calculateYTD(k, rows){
    const d = def(k);
    if(!rows || !rows.length) return {result:0,target:0,pct:0,display:"—",targetDisplay:"—",stuks:0,kansen:0};
    if(d.type === "ratio"){
      const st = rows.reduce((a,r)=>a+num(r[d.key+"Stuks"]),0);
      const ka = rows.reduce((a,r)=>a+num(r[d.key+"Kansen"]),0);
      const result = ka ? st / ka * 100 : 0;
      const targetStuks = rows.reduce((a,r)=>a + num(r[d.key+"Kansen"]) * num(r[d.key+"TargetPct"]) / 100, 0);
      const targetPct = ka ? targetStuks / ka * 100 : 0;
      return {result,target:targetPct,pct:targetPct?result/targetPct*100:0,display:format(result,"ratio"),targetDisplay:format(targetPct,"ratio"),stuks:st,kansen:ka};
    }
    if(d.key === "Link" || d.key === "S" || d.type === "percentage" || d.type === "score"){
      const vals = rows.map(r=>value(r,k)).filter(x=>isFinite(x)&&x!==0);
      const tars = rows.map(r=>target(r,k,r.Periode)).filter(x=>isFinite(x)&&x!==0);
      const result = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
      const tar = tars.length ? tars.reduce((a,b)=>a+b,0)/tars.length : 0;
      return {result,target:tar,pct:tar?result/tar*100:0,display:format(result,d.type==="score"?"score":"ratio"),targetDisplay:format(tar,d.type==="score"?"score":"ratio")};
    }
    const result = rows.reduce((a,r)=>a+value(r,k),0);
    const tar = rows.reduce((a,r)=>a+target(r,k,r.Periode),0);
    return {result,target:tar,pct:tar?result/tar*100:0,display:format(result,d.type),targetDisplay:format(tar,d.type)};
  }
  function calculateRanking(rows, kpiIds){
    return [...rows].sort((a,b)=>{
      const sb = kpiIds.reduce((s,k)=>s+points(b,k,b.Periode),0);
      const sa = kpiIds.reduce((s,k)=>s+points(a,k,a.Periode),0);
      return sb-sa || String(a.Naam||a.Winkel||"").localeCompare(String(b.Naam||b.Winkel||""));
    }).map((row,i)=>({rank:i+1,row,score:kpiIds.reduce((s,k)=>s+points(row,k,row.Periode),0)}));
  }
  function impactRows(k, rows=sellerRows()){
    const d = def(k);
    const totalImpact = rows.reduce((a,r)=>{
      if(d.type === "ratio") return a + num(r[d.key+"Kansen"]);
      return a + Math.max(value(r,k), target(r,k,r.Periode));
    },0) || 1;
    return rows.map(r=>{
      const raw = d.type === "ratio" ? num(r[d.key+"Kansen"]) : Math.max(value(r,k), target(r,k,r.Periode));
      const pct = percent(r,k,r.Periode);
      const needed = Math.max(0, target(r,k,r.Periode) - value(r,k));
      return {row:r, name:r.Naam||r.Winkel||"", rawImpact:raw, impactShare:raw/totalImpact*100, performance:pct, needed, status:status(r,k,r.Periode)};
    }).sort((a,b)=>b.impactShare-a.impactShare);
  }
  function trend(k, rows){
    const ordered = [...rows].filter(r=>r.Periode).sort((a,b)=>String(a.Periode).localeCompare(String(b.Periode)));
    const values = ordered.map(r=>value(r,k));
    const delta = values.length >= 2 ? values.at(-1) - values[Math.max(0, values.length-4)] : 0;
    return {periods:ordered.map(r=>r.Periode), values, delta, direction: delta>0 ? "up" : delta<0 ? "down" : "flat"};
  }
  function priority(k){
    const row = storeRow(), st = status(row,k), drivers = impactRows(k);
    const gap = Math.max(0, 100 - st.pct);
    const leverage = drivers.slice(0,3).reduce((a,d)=>a + d.impactShare * (d.needed>0?1:0.25), 0);
    const score = Math.round(gap * 0.65 + leverage * 0.35);
    return {kpi:k, score, status:st, drivers};
  }
  function forecastWith(k, changedRows){
    const base = storeRow();
    const baseVal = value(base,k);
    const extra = (changedRows||[]).reduce((sum,r)=>sum + Math.max(0,target(r,k,r.Periode)-value(r,k)),0);
    const t = target(base,k,base.Periode);
    return {value:baseVal+extra, target:t, pct:t?(baseVal+extra)/t*100:0};
  }

  D.data = {
    get resultaten(){return w.DIESTROYERS_RESULTATEN || [];},
    get verkopers(){return admin().verkopers || w.DIESTROYERS_VERKOPERS || [];},
    get targets(){return admin().targets || w.DIESTROYERS_TARGETS || [];},
    get historiekMaand(){return w.DIESTROYERS_HISTORIEK_MAAND || [];},
    get historiekDag(){return w.DIESTROYERS_HISTORIEK_DAG || [];},
    get district(){return w.DIESTROYERS_DISTRICT || [];}
  };

  D.calculations = {num, servicePercentage, period, rowsForPeriod, storeRow, sellerRows, def, value, target, percent, points, status, format, calculateYTD, calculateRanking, impactRows, trend, priority, forecastWith};
})(window);
