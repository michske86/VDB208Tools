/* The Diestroyers - Runtime Data Bridge
   Configuratie is leidend voor actieve verkopers en targets.
   Resultaten/district blijven leidend voor prestaties. */
(function(w){
  "use strict";

  const cfg = w.DIESTROYERS_CONFIG_DATA || {};
  const rawResults = Array.isArray(w.DIESTROYERS_RESULTATEN) ? w.DIESTROYERS_RESULTATEN : [];
  const rawDistrict = Array.isArray(w.DIESTROYERS_DISTRICT) ? w.DIESTROYERS_DISTRICT : [];
  const rawSellers = Array.isArray(w.DIESTROYERS_VERKOPERS) ? w.DIESTROYERS_VERKOPERS : [];
  const rawDetail = Array.isArray(w.DIESTROYERS_KPI_DETAIL) ? w.DIESTROYERS_KPI_DETAIL : [];
  const rawHistory = Array.isArray(w.DIESTROYERS_HISTORIEK_MAAND) ? w.DIESTROYERS_HISTORIEK_MAAND : [];
  const cfgSellers = Array.isArray(cfg.verkopers) ? cfg.verkopers : [];
  const cfgTargets = Array.isArray(cfg.targets) ? cfg.targets : [];
  const cfgDistrict = Array.isArray(cfg.district) ? cfg.district : [];

  const norm = v => String(v ?? "").trim().toLowerCase();
  const num = v => {
    if(v === null || v === undefined || v === "") return 0;
    if(typeof v === "number") return Number.isFinite(v) ? v : 0;
    let s = String(v).trim().replace(/\s/g,"").replace("%","");
    if(s.includes(",") && s.includes(".")) s = s.replace(/\./g,"").replace(",",".");
    else s = s.replace(",",".");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const isActive = row => !["nee","no","0","false","n","inactief"].includes(norm(row?.Actief ?? row?.actief ?? "ja"));

  const activeSellers = (cfgSellers.length ? cfgSellers : rawSellers).filter(v => isActive(v) && norm(v.Naam || v.naam));
  const activeById = new Map(activeSellers.map(v => [norm(v.PersoneelsNr || v.personeelsNr), v]).filter(([k])=>k));
  const activeByName = new Map(activeSellers.map(v => [norm(v.Naam || v.naam), v]).filter(([k])=>k));

  function sellerIsActive(row){
    if(!activeSellers.length) return true;
    const id = norm(row.PersoneelsNr || row.personeelsNr);
    const name = norm(row.Naam || row.naam);
    return (id && activeById.has(id)) || (name && activeByName.has(name));
  }

  const targetFields = [
    "OmzetTarget","LifeTarget","InsuranceTargetPct","AboTargetPct","DSPTargetPct",
    "SPGTargetPct","SRPTargetPct","AccessoiresTargetPct","NPSTarget","LinkTargetPct","MonsterTarget"
  ];

  function targetScore(t){
    return targetFields.reduce((s,k)=>s+(Math.abs(num(t?.[k]))>0?1:0),0);
  }

  function targetCandidates(period,type,name,shopNr){
    const p = norm(period), ty = norm(type), nm = norm(name), sh = norm(shopNr);
    return cfgTargets.filter(t =>
      norm(t.Periode || t.periode) === p &&
      norm(t.EntiteitType || t.entiteitType) === ty &&
      norm(t.Naam || t.naam) === nm &&
      (!sh || !norm(t.ShopNr || t.shopNr) || norm(t.ShopNr || t.shopNr) === sh)
    ).sort((a,b)=>{
      const aExact = sh && norm(a.ShopNr || a.shopNr) === sh ? 1 : 0;
      const bExact = sh && norm(b.ShopNr || b.shopNr) === sh ? 1 : 0;
      return bExact-aExact || targetScore(b)-targetScore(a);
    });
  }

  function findTarget(row, forcedType){
    const type = forcedType || row.EntiteitType || row.entiteitType;
    return targetCandidates(
      row.Periode || row.periode,
      type,
      row.Naam || row.naam || row.Winkel || row.winkel,
      row.ShopNr || row.shopNr
    )[0] || null;
  }

  function mergeTarget(row, forcedType){
    const t = findTarget(row, forcedType);
    if(!t) return {...row};
    const out = {...row};
    targetFields.forEach(k => {
      if(t[k] !== undefined && t[k] !== null && t[k] !== "") out[k] = num(t[k]);
      const lower = k[0].toLowerCase()+k.slice(1);
      if(out[lower] !== undefined || row[lower] !== undefined) out[lower] = out[k];
    });
    return out;
  }

  const activeShopSet = new Set(
    cfgDistrict.filter(isActive).map(d=>norm(d.ShopNr || d.shopNr)).filter(Boolean)
  );

  let district = rawDistrict.filter(d => {
    if(!cfgDistrict.length) return isActive(d);
    const sh = norm(d.ShopNr || d.shopNr);
    return isActive(d) && (!activeShopSet.size || activeShopSet.has(sh));
  }).map(d => mergeTarget(d, "DistrictWinkel"));

  // Fallback: if a district target field is zero/unset, use own store's target for that period.
  district = district.map(d => {
    const own = targetCandidates(d.Periode, "Winkel", cfg.shop?.naam || "Diest", cfg.shop?.shopNr || "208")[0];
    if(!own) return d;
    const out = {...d};
    targetFields.forEach(k => {
      if(!num(out[k]) && num(own[k])) out[k] = num(own[k]);
    });
    return out;
  });

  const ownDistrictForPeriod = p => district.find(d =>
    norm(d.Periode) === norm(p) &&
    (
      norm(d.EigenWinkel) === "ja" ||
      norm(d.ShopNr) === norm(cfg.shop?.shopNr || "208") ||
      norm(d.Winkel) === norm(cfg.shop?.naam || "Diest")
    )
  );

  let results = rawResults.filter(r => {
    if(norm(r.EntiteitType || r.entiteitType) !== "verkoper") return true;
    return sellerIsActive(r);
  }).map(r => {
    let out = mergeTarget(r);
    if(norm(out.EntiteitType || out.entiteitType) === "winkel"){
      const d = ownDistrictForPeriod(out.Periode || out.periode);
      if(d && !num(out.SRatio) && num(d.SRatio)){
        out.SRatio = num(d.SRatio);
        out.sRatio = out.SRatio;
      }
      if(d && !num(out.SStuks) && num(d.SStuks)){
        out.SStuks = num(d.SStuks);
        out.sStuks = out.SStuks;
      }
      if(d && !num(out.SEuro) && num(d.SEuro)){
        out.SEuro = num(d.SEuro);
        out.sEuro = out.SEuro;
      }
    }
    return out;
  });

  function sameEntity(detail,row){
    const dType=norm(detail.EntiteitType), rType=norm(row.EntiteitType);
    if(dType && rType && dType!==rType) return false;
    const dId=norm(detail.PersoneelsNr), rId=norm(row.PersoneelsNr);
    if(dId && rId) return dId===rId;
    return norm(detail.Naam)===norm(row.Naam);
  }

  const detail = rawDetail.filter(d => {
    if(norm(d.EntiteitType)!=="verkoper") return true;
    return sellerIsActive(d);
  }).map(d => {
    if(norm(d.KPI)!=="s") return d;
    const rr=results.find(r => norm(r.Periode)===norm(d.Periode) && sameEntity(d,r));
    if(!rr) return d;
    return {
      ...d,
      Waarde:num(rr.SEuro),
      WaardePct:num(rr.SRatio),
      Stuks:num(rr.SStuks),
      VorigJaar:num(rr.SEuroLY),
      VorigJaarPct:num(rr.SRatioLY)
    };
  });

  const historyMap = new Map();
  rawHistory.filter(h => {
    if(norm(h.EntiteitType)!=="verkoper") return true;
    return sellerIsActive(h);
  }).forEach(h => {
    const key=[h.Periode,h.EntiteitType,h.PersoneelsNr,h.Naam,h.KPI,h.SubKPI].map(norm).join("|");
    const old=historyMap.get(key);
    if(norm(h.KPI)!=="s"){
      historyMap.set(key,h);
    }else{
      const richness=x=>Math.abs(num(x?.Waarde))+Math.abs(num(x?.Stuks));
      if(!old || richness(h)>richness(old)) historyMap.set(key,h);
    }
  });
  const history=[...historyMap.values()].map(h => {
    if(norm(h.KPI)!=="s") return h;
    const rr=results.find(r => norm(r.Periode)===norm(h.Periode) && sameEntity(h,r));
    if(!rr) return h;
    return {...h,Waarde:num(rr.SEuro),WaardePct:num(rr.SRatio),Stuks:num(rr.SStuks),VorigJaar:num(rr.SEuroLY),VorigJaarPct:num(rr.SRatioLY)};
  });

  w.DIESTROYERS_RESULTATEN_ARCHIEF = rawResults;
  w.DIESTROYERS_RESULTATEN = results;
  w.DIESTROYERS_VERKOPERS = activeSellers;
  w.DIESTROYERS_TARGETS = cfgTargets.length ? cfgTargets : (w.DIESTROYERS_TARGETS || []);
  w.DIESTROYERS_DISTRICT = district;
  w.DIESTROYERS_KPI_DETAIL = detail;
  w.DIESTROYERS_HISTORIEK_MAAND = history;
})(window);
