/* Resultaten en rangschikking voor Scoreblad. De gepubliceerde bundel blijft de bron. */
(() => {
  "use strict";
  const w = window;
  const config = w.DIESTROYERS_CONFIG_DATA || {};
  const rawResults = w.DIESTROYERS_RESULTATEN || [];
  const rawSellers = w.DIESTROYERS_VERKOPERS || [];
  const rawDetail = w.DIESTROYERS_KPI_DETAIL || [];
  const rawHistory = w.DIESTROYERS_HISTORIEK_MAAND || [];
  const nps = w.DIESTROYERS_NPS || {};
  const avv = w.DIESTROYERS_AVV || {};
  const registry = w.Diestroyers.registry;
  const rules = w.Diestroyers.config;
  const shopId = String(config.shop?.shopNr || "208");
  const shopName = config.shop?.naam || "Diest";
  const store = {id:shopId, name:shopName, type:"Winkel"};
  const periodPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
  const norm = value => String(value ?? "").trim().toLowerCase();
  const id = value => String(value ?? "").trim();
  const number = value => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(String(value).trim().replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  };
  const amount = new Intl.NumberFormat("nl-BE", {style:"currency", currency:"EUR", maximumFractionDigits:2});
  const decimal = new Intl.NumberFormat("nl-BE", {maximumFractionDigits:2});
  const monthName = new Intl.DateTimeFormat("nl-BE", {month:"long", year:"numeric", timeZone:"UTC"});
  const type = row => norm(row.EntiteitType || row.entiteitType);
  const rowId = row => id(row.PersoneelsNr || row.personeelsNr);
  const rowName = row => row.Naam || row.naam;
  const active = row => !["nee","no","0","false","n","inactief"].includes(norm(row.Actief ?? row.actief ?? "ja"));
  const periods = [...new Set(rawResults.filter(row => type(row) === "winkel").map(row => row.Periode))].filter(value => periodPattern.test(value)).sort();
  const latest = periods.at(-1) || new Date().toISOString().slice(0,7);
  const kpis = registry.kpis;
  const big7 = (rules.big7 || []).filter(key => registry.kpiById[key]);
  const average = items => items.length ? items.reduce((a,b) => a+b,0) / items.length : null;
  const sum = items => items.length ? items.reduce((a,b) => a+b,0) : null;
  const ratio = (count, chances) => chances > 0 && count !== null ? count / chances * 100 : null;
  const resultIndex = new Map();
  const detailIndex = new Map();
  const sellerMap = new Map();
  const districtSource = w.DIESTROYERS_DISTRICT || [];

  const configuredSellers = Array.isArray(config.verkopers) ? config.verkopers : null;
  for (const row of rawSellers) {
    const key = rowId(row) || norm(rowName(row));
    if (key && rowName(row)) sellerMap.set(key,{id:key, name:rowName(row), type:"Verkoper", active:!configuredSellers && active(row)});
  }
  for (const row of configuredSellers || []) {
    const key = rowId(row) || norm(rowName(row));
    if (key && rowName(row)) sellerMap.set(key,{id:key, name:rowName(row), type:"Verkoper", active:active(row)});
  }
  for (const row of rawResults) {
    const key = rowId(row) || norm(rowName(row));
    if (type(row) === "verkoper" && key && rowName(row) && !sellerMap.has(key)) {
      sellerMap.set(key,{id:key,name:rowName(row),type:"Verkoper",active:false});
    }
  }
  const sellers=[...sellerMap.values()].sort((a,b) => Number(b.active)-Number(a.active) || a.name.localeCompare(b.name,"nl-BE"));

  function entityKey(row) {
    return type(row) === "verkoper" ? "seller:" + (rowId(row) || norm(rowName(row))) : "store:" + id(row.ShopNr || row.shopNr || shopId);
  }
  function entityId(entity) {
    return entity.type === "Verkoper" ? "seller:" + entity.id : "store:" + entity.id;
  }
  function createIndexes() {
    for (const row of [...rawResults, ...(w.DIESTROYERS_RESULTATEN || [])]) {
      resultIndex.set(entityKey(row) + "|" + row.Periode,row);
    }
    for (const row of [...rawHistory, ...rawDetail, ...(w.DIESTROYERS_HISTORIEK_MAAND || []), ...(w.DIESTROYERS_KPI_DETAIL || [])]) {
      const key = [entityKey(row),row.Periode,norm(row.KPI)].join("|");
      if (!detailIndex.has(key)) detailIndex.set(key,new Map());
      detailIndex.get(key).set(norm(row.SubKPI),row);
    }
    const visible=sellers.filter(person=>person.active ||
      Object.values(npsProfile(person)?.month || {}).some(row=>row.cards>0) ||
      Object.values(avvProfile(person)?.ytd || {}).some(row=>row.responses>0) ||
      periods.some(period=>kpis.some(kpi=>month(person,kpi.id,period).value!==null)));
    sellers.splice(0,sellers.length,...visible);
  }

  function region() {
    const mostRecent = regionPeriod();
    return (w.DIESTROYERS_DISTRICT || []).filter(row => row.Periode === mostRecent && active(row)).map(row => ({
      id:id(row.ShopNr), name:row.Winkel || row.Naam || id(row.ShopNr), type:"DistrictWinkel", row
    }));
  }

  function targetFor(entity, def, period, row, detail) {
    if (def.id === "s") return ["01","07"].includes(period.slice(5)) ? rules.sTargets.januaryJulyGreen : rules.sTargets.defaultGreen;
    const key = def.type === "ratio" || def.type === "percentage" || def.id === "accessoires" ? def.key + "TargetPct" : def.key + "Target";
    const knownType = norm(entity.type);
    const numberForEntity = entity.type === "DistrictWinkel" ? entity.id : id(row?.ShopNr || shopId);
    const matching = (config.targets || []).filter(target => target.Periode === period && type(target) === knownType &&
      norm(rowName(target)) === norm(entity.name) && (!target.ShopNr || id(target.ShopNr) === numberForEntity));
    const configured = matching.find(target => id(target.ShopNr) === numberForEntity) || matching[0];
    const detailKey = def.type === "ratio" || def.type === "percentage" || def.id === "accessoires" ? "TargetPct" : "Target";
    const target = number(configured?.[key]) ?? number(row?.[key]) ?? number(detail?.[detailKey]);
    return target > 0 ? target : null;
  }

  function details(entity, key, period) {
    return detailIndex.get([entityId(entity),period,norm(key)].join("|")) || new Map();
  }
  function npsProfile(entity) {
    if (entity.type === "Verkoper") return nps.sellers?.[entity.id];
    if (entity.id === shopId) return nps.store;
    return null;
  }
  function avvProfile(entity) {
    return entity.type === "Verkoper" ? avv.sellers?.[entity.id] : avv.store;
  }

  function month(entity, kpiId, period) {
    const def = registry.kpiById[kpiId];
    const row = entity.type === "DistrictWinkel" ? (entity.row?.Periode === period ? entity.row : null) : resultIndex.get(entityId(entity) + "|" + period);
    const breakdown = details(entity,def.key,period);
    const detail = breakdown.get("") || breakdown.get("totaal");
    const targetRate = def.id === "accessoires" ? targetFor(entity,def,period,row,detail) : null;
    const revenue = def.id === "accessoires" ? number(row?.Omzet) : null;
    const target = def.id === "accessoires" ? targetRate !== null && revenue !== null ? revenue * targetRate / 100 : null : targetFor(entity,def,period,row,detail);
    const hasActivity = entity.type !== "Verkoper" || Boolean(number(row?.Omzet) || number(row?.Life) || number(row?.InsuranceKansen) || number(row?.DSPKansen) || number(row?.SPGKansen) || number(row?.SRPKansen));
    let value = null, count = null, chances = null, euro = null;
    if (kpiId === "nps") {
      const survey = npsProfile(entity)?.month?.[period];
      if (survey) value = survey.cards > 0 ? number(survey.nps) : null;
      else if (entity.type !== "Verkoper" || hasActivity) {
        value = number(row?.NPS) ?? number(detail?.Waarde);
        if (value === 0 && npsProfile(entity)) value = null;
      }
      count = number(survey?.cards);
    } else if (def.type === "ratio") {
      count = number(row?.[def.key+"Stuks"]) ?? number(detail?.Stuks);
      chances = number(row?.[def.key+"Kansen"]) ?? number(detail?.Kansen);
      value = ratio(count,chances);
      if (value === null && !chances) {
        const stored = number(row?.[def.key+"Pct"]) ?? number(detail?.WaardePct);
        if (stored) value = stored;
      }
    } else if (row || detail) {
      if (kpiId === "s") {
        value = number(row?.SRatio) ?? number(detail?.WaardePct);
        count = number(row?.SStuks) ?? number(detail?.Stuks);
        euro = number(row?.SEuro) ?? number(detail?.Waarde);
      } else if (def.type === "percentage") value = number(row?.[def.key+"Pct"]) ?? number(detail?.WaardePct);
      else {
        value = number(row?.[def.key]) ?? number(detail?.Waarde);
        if (def.type === "stuks") count = value;
      }
      if (!hasActivity && !value && !count && !euro && norm(detail?.Bron)!=="admin") value = count = euro = null;
    }
    const prior = number(detail?.[["percentage","ratio"].includes(def.type) ? "VorigJaarPct" : "VorigJaar"]);
    return {value,target,count,chances,euro,targetRate,revenue,prior:prior || null,coverage:value === null ? 0 : 1};
  }

  function annual(entity,kpiId,period) {
    const def = registry.kpiById[kpiId];
    const calendar = Array.from({length:Number(period.slice(5))},(_,index) => period.slice(0,5) + String(index+1).padStart(2,"0"));
    const all = calendar.map(item => month(entity,kpiId,item));
    const items = all.filter(item => item.value !== null);
    const values = items.map(item => item.value);
    const targets = all.map(item => def.id === "accessoires" ? item.targetRate : item.target).filter(value => value !== null);
    const counts = items.map(item => item.count).filter(value => value !== null);
    const chances = items.map(item => item.chances).filter(value => value !== null);
    const euros = items.map(item => item.euro).filter(value => value !== null);
    let value = sum(values), target = sum(targets);
    let count = sum(counts), opportunity = sum(chances);
    if (def.type === "ratio") {
      const measurable = items.filter(item => item.chances > 0 && item.count !== null);
      count = sum(measurable.map(item => item.count));
      opportunity = sum(measurable.map(item => item.chances));
      value = ratio(count,opportunity);
      target = average(targets);
    } else if (def.type === "percentage" || def.type === "score") {
      value = average(values);
      target = average(targets);
    } else if (def.id === "accessoires") {
      const revenue = sum(items.map(item=>item.revenue).filter(value=>value !== null));
      target = targets.length && revenue !== null ? revenue * average(targets) / 100 : null;
    }
    if (kpiId === "nps") {
      const survey = npsProfile(entity)?.ytd?.[period];
      if (survey) { value = survey.cards > 0 ? number(survey.nps) : null; count = number(survey.cards); }
    }
    return {value,target,count,chances:opportunity,euro:sum(euros),targetCoverage:targets.length,targetTotal:calendar.length,
      coverage:def.type === "ratio" ? items.filter(item=>item.chances > 0 && item.count !== null).length : items.length,total:calendar.length};
  }

  function components(entity,kpiId,period) {
    const def = registry.kpiById[kpiId];
    return [...details(entity,def.key,period)].filter(([key]) => key && key !== "totaal").map(([key,row]) => {
      const count = number(row.Stuks), chances = number(row.Kansen);
      const value = ratio(count,chances) ?? number(row.WaardePct);
      return {id:key,label:row.SubKPI,value:value || chances > 0 || def.id === "link" ? value : null,target:number(row.TargetPct) || null,count,chances,prior:number(row.VorigJaarPct) || null};
    }).sort((a,b) => a.label.localeCompare(b.label,"nl-BE"));
  }

  function points(result) {
    if (result.value === null || !result.target) return null;
    const completion = result.value / result.target * 100;
    const scale = rules.points;
    return completion >= scale.greenThreshold ? scale.green : completion >= scale.yellowThreshold ? scale.yellow : scale.red;
  }
  function resultState(result,def) {
    if (!result) return "Ontbrekend cijfer";
    if (def.type==="ratio" && result.chances===0) return "Geen geregistreerde kansen";
    if (def.id==="nps" && result.count===0) return "Geen enquêtes";
    if (result.value===null || result.value===undefined) return "Ontbrekend cijfer";
    return result.value===0 ? "Gemeten nul" : "Gemeten";
  }

  function compare({scope, term, metric, period}) {
    const regional = scope === "regio";
    const entrants = regional ? region() : [...sellerMap.values()].filter(entity => entity.active);
    const read = term === "jaar" && !regional ? annual : month;
    const group = metric === "big7" ? big7 : metric === "alle" ? kpis.map(def => def.id) : null;
    const places = entrants.map(entity => {
      const breakdown = (group || [metric]).map(key => {
        const result = read(entity,key,period);
        return {key, result, points:points(result)};
      });
      const earned = breakdown.map(item => item.points).filter(point => point !== null);
      const value = group ? sum(earned) : breakdown[0].result.value;
      return {entity,breakdown,value,available:earned.length,total:breakdown.length};
    }).sort((a,b) => (b.value ?? -Infinity) - (a.value ?? -Infinity) || b.available - a.available || a.entity.name.localeCompare(b.entity.name,"nl-BE"));
    return places.map((item,index) => {
      const previous = places[index-1];
      const tie = previous?.value === item.value;
      if (item.value === null) item.rank = null;
      else item.rank = tie ? previous.rank : index + 1;
      return item;
    });
  }

  function regionPeriod() {
    return districtSource.map(row => row.Periode).filter(period => periodPattern.test(period)).sort().at(-1);
  }

  function format(value, def) {
    if (value === null || value === undefined) return "Geen data";
    if (["bedrag","accessoires"].includes(def.type)) return amount.format(value);
    if (["ratio","percentage"].includes(def.type)) return decimal.format(value) + "%";
    return decimal.format(value);
  }

  w.addEventListener("DOMContentLoaded",createIndexes,{once:true});
  w.ScorebladData = {
    config,kpis,store,sellers,
    periods,latest,month,annual,components,compare,points,resultState,format,region,regionPeriod,nps,avv,npsProfile,avvProfile,
    monthLabel:period => periodPattern.test(period || "") ? monthName.format(new Date(period+"-01T00:00:00Z")) : "Geen periode",
    byId:registry.kpiById
  };
})();
