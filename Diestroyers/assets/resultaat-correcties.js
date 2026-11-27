/* Invoerdefinities en gepubliceerde bronwaarden voor historische Excel-correcties. */
(() => {
  "use strict";
  const w = window;
  const config = w.DIESTROYERS_CONFIG_DATA || {};
  const outcomes = w.DIESTROYERS_RESULTATEN || [];
  const district = w.DIESTROYERS_DISTRICT || [];
  const histories = [...(w.DIESTROYERS_HISTORIEK_MAAND || []),...(w.DIESTROYERS_KPI_DETAIL || [])];
  const initialNps = w.DIESTROYERS_NPS || {};
  const now = text(config.shop?.shopNr || "208");
  const currency = (key,label) => ({key,label,step:"any"});
  const count = (key,label) => ({key,label,step:"1",min:0});
  const percentage = (key,label) => ({key,label,step:"any",min:0,max:100});
  const ratio = (id,key,label,target) => ({id,key,label,target,fields:[count(key+"Stuks","Stuks"),count(key+"Kansen","Kansen")]});
  const kpis = [
    {id:"omzet",key:"Omzet",label:"Omzet",target:"OmzetTarget",fields:[currency("Omzet","Omzet in €")]},
    {id:"life",key:"Life",label:"Life",target:"LifeTarget",fields:[count("Life","Stuks")]},
    ratio("insurance","Insurance","Insurance","InsuranceTargetPct"),
    ratio("abonnementen","Abo","Abonnementen","AboTargetPct"),ratio("dsp","DSP","DSP","DSPTargetPct"),
    ratio("spg","SPG","SPG","SPGTargetPct"),ratio("srp","SRP","SRP","SRPTargetPct"),
    {id:"accessoires",key:"Accessoires",label:"Accessoires",target:"AccessoiresTargetPct",fields:[currency("Accessoires","Omzet in €")]},
    {id:"link",key:"Link",label:"Link",target:"LinkTargetPct",fields:[percentage("LinkPct","Link in %")]},
    {id:"monster",key:"Monster",label:"Monster",target:"MonsterTarget",fields:[currency("Monster","Omzet in €")]},
    ratio("buyway","BuyWay","BuyWay",null),ratio("leaders","Leaders","Leaders",null),
    {id:"s",key:"S",label:"Laatste stuks – S",fields:[percentage("SRatio","Ratio in %"),count("SStuks","Stuks"),currency("SEuro","Bedrag in €")]},
    {id:"nps",key:"NPS",label:"NPS",target:"NPSTarget",fields:[{key:"NPS",label:"NPS-score",min:-100,max:100,step:"any"},count("NPSResponses","Enquêtes")]}
  ];
  const fields = new Map(kpis.flatMap(kpi => kpi.fields.map(field => [field.key,field])));
  const norm = value => text(value).toLowerCase();
  const alias = key => key[0].toLowerCase()+key.slice(1);
  const sellerId = row => text(row?.PersoneelsNr || row?.personeelsNr);
  const shopId = row => text(row?.ShopNr || row?.shopNr);
  const nameOf = row => row?.Naam || row?.naam || row?.Winkel || row?.winkel;
  const rawPeriod = row => text(row?.Periode || row?.periode);
  const rawType = row => norm(row?.EntiteitType || row?.entiteitType);
  const validPeriod = /^\d{4}-(0[1-9]|1[0-2])$/;
  function text(value) { return String(value ?? "").trim(); }
  function numeric(value) {
    if (value===null || value===undefined || text(value)==="") return null;
    const parsed = Number(text(value).replace(",","."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  function get(row,key) { return numeric(row?.[key] ?? row?.[alias(key)]); }
  function valid(type,key,value) {
    const field=fields.get(key);
    return ["Winkel","Verkoper"].includes(type) && !["NPS","NPSResponses"].includes(key) && field && typeof value==="number" &&
      Number.isFinite(value) && Math.abs(value)<=Number.MAX_SAFE_INTEGER &&
      (field.min===undefined || value>=field.min) && (field.max===undefined || value<=field.max) &&
      (field.step!=="1" || Number.isSafeInteger(value));
  }
  function canonical(entity) {
    const id=text(entity.id);
    return {type:entity.type==="DistrictWinkel" && id===now ? "Winkel" : entity.type,id};
  }
  function keyFor(entity,per) {
    const id=canonical(entity);
    return [id.type,id.id,per].join("|");
  }
  function allowed(row) {
    return row && ["Winkel","DistrictWinkel","Verkoper"].includes(row.type) && text(row.id)!=="" && validPeriod.test(row.periode);
  }
  function lookup(records,entity,per) {
    const key=keyFor(entity,per);
    return records.find(row => allowed(row) && keyFor(row,row.periode)===key);
  }
  function sameRow(row,entity,per) {
    if (rawPeriod(row)!==per) return false;
    if (entity.type==="Verkoper") {
      return rawType(row)==="verkoper" && (sellerId(row) ? sellerId(row)===text(entity.id) : norm(nameOf(row))===norm(entity.name));
    }
    if (entity.type==="DistrictWinkel") return shopId(row)===text(entity.id);
    return rawType(row)==="winkel" && (shopId(row) ? shopId(row)===text(entity.id) : text(entity.id)===now);
  }
  function importedRow(entity,per) {
    return (entity.type==="DistrictWinkel" ? district : outcomes).find(row => sameRow(row,entity,per));
  }
  function hasActivity(row) {
    return ["Omzet","Life","InsuranceKansen","AboKansen","DSPKansen","SPGKansen","SRPKansen","LinkPct","SRatio"].some(key=>get(row,key));
  }
  function importedNps(entity,per) {
    return entity.type==="Verkoper" ? initialNps.sellers?.[entity.id]?.month?.[per]
      : text(entity.id)===now ? initialNps.store?.month?.[per] : null;
  }
  function imported(entity,per,field) {
    const row=importedRow(entity,per);
    if (field==="NPS" || field==="NPSResponses") {
      const survey=importedNps(entity,per);
      if (survey) return field==="NPS" ? survey.cards>0 ? numeric(survey.nps) : null : numeric(survey.cards);
      if (entity.type!=="DistrictWinkel") return null;
    }
    const direct=get(row,field);
    if (direct!==null && (direct!==0 || entity.type!=="Verkoper" || hasActivity(row))) return direct;
    if (entity.type==="DistrictWinkel") return null;
    const kpi=kpis.find(item=>item.fields.some(entry=>entry.key===field));
    if (!kpi) return null;
    const detail=histories.find(item=>sameRow(item,entity,per) &&
      norm(item.KPI)===norm(kpi.key) && ["","totaal"].includes(norm(item.SubKPI)));
    if (!detail) return null;
    const matches={SRatio:"WaardePct",SStuks:"Stuks",SEuro:"Waarde",LinkPct:"WaardePct"};
    const detailKey=matches[field] || (field.endsWith("Stuks")?"Stuks":field.endsWith("Kansen")?"Kansen":"Waarde");
    const backup=get(detail,detailKey);
    return backup===0 && entity.type==="Verkoper" && !hasActivity(row) && !get(detail,"Kansen") && norm(detail.Bron)!=="admin" ? null : backup;
  }

  function closedMonth(nowDate = new Date()) {
    const localDate = new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Brussels",year:"numeric",month:"2-digit"}).formatToParts(nowDate);
    return localDate.find(part=>part.type==="year").value+"-"+localDate.find(part=>part.type==="month").value;
  }

  w.ScorebladResultEdits={kpis,valid,canonical,lookup,imported,importedRow,closedMonth};
})();
