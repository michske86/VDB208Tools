/* Analyse en rapporten gebruiken dezelfde gepubliceerde cijfers als Resultaten. */
(() => {
  "use strict";
  const w = window;
  const data = w.ScorebladData;
  const importStatus = w.DIESTROYERS_IMPORT_STATUS || {};
  const sales = w.DIESTROYERS_SALES_EXTRA || {};
  const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
  const minimumChances = 10;
  const format = new Intl.NumberFormat("nl-BE",{maximumFractionDigits:2});
  const average = values => values.length ? values.reduce((sum,value)=>sum+value,0)/values.length : null;
  const available = value => value !== null && value !== undefined;
  const activeMonth = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Brussels",month:"2-digit",year:"numeric"}).formatToParts(date);
    return parts.find(part=>part.type==="year").value+"-"+parts.find(part=>part.type==="month").value;
  };
  function before(period) {
    const date = new Date(period+"-01T00:00:00Z");
    date.setUTCMonth(date.getUTCMonth()-1);
    return date.toISOString().slice(0,7);
  }
  function monthsThrough(period,limit=12) {
    const months=[];
    for (let current=period; MONTH.test(current) && months.length<limit && current>=data.periods[0]; current=before(current)) months.push(current);
    return months;
  }
  function fromParams(q) {
    const period = data.periods.includes(q.get("periode")) ? q.get("periode") : data.latest;
    const person = data.sellers.find(item=>item.id===q.get("verkoper"));
    const def = data.byId[q.get("kpi")];
    const candidates = data.periods.filter(item=>item<period && item<activeMonth());
    const comparison = candidates.includes(q.get("vergelijk")) ? q.get("vergelijk") : candidates.at(-1);
    const entity=person || data.store;
    const requestedDetail=q.get("detail");
    const detail=def && requestedDetail && data.components(entity,def.id,period).some(item=>item.id===requestedDetail) ? requestedDetail : null;
    const term = q.get("termijn")==="jaar" && !detail ? "jaar" : "maand";
    const sort=q.get("sortering")==="kansen"?"kansen":"impact";
    const show=q.get("toon")==="alle"?"alle":"aandacht";
    return {period,person,entity,def,term,comparison,candidates,detail,sort,show};
  }
  function metric(ctx,def,entity=ctx.entity) {
    return (ctx.term==="jaar" ? data.annual : data.month)(entity,def.id,ctx.period);
  }
  function deltaLabel(value,def,positive=false) {
    if (!Number.isFinite(value)) return "—";
    const sign = value > 0 && positive ? "+" : value < 0 ? "−" : "";
    const unit = ["ratio","percentage"].includes(def.type) ? " pp" : def.type==="score" ? " pt" : def.type==="stuks" ? " stuks" : "";
    return sign + (["bedrag","accessoires"].includes(def.type) ? data.format(Math.abs(value),def) : format.format(Math.abs(value))+unit);
  }
  function lack(result,def) {
    if (!available(result.value) || !available(result.target)) return null;
    if (gapDef(result,def).type==="stuks" && def.type==="ratio") {
      return Math.max(0,Math.ceil(result.chances*result.target/100-1e-9)-result.count);
    }
    return Math.max(0,result.target-result.value);
  }
  function gapDef(result,def) {
    return def.type==="ratio" && result.chances>0 && available(result.count) ? {type:"stuks"} : def;
  }
  function comparisonFor(ctx,def,result) {
    if (ctx.term==="jaar") {
      if (ctx.period>=activeMonth() || result.coverage!==result.total || result.value===null) return null;
      const prevYear=String(Number(ctx.period.slice(0,4))-1)+ctx.period.slice(4);
      if (!data.periods.includes(prevYear)) return null;
      const prior=data.annual(ctx.entity,def.id,prevYear);
      return prior.coverage===prior.total && prior.value!==null ? {
        value:result.value-prior.value,prior:prior.value,label:"YTD t.e.m. "+data.monthLabel(prevYear)
      } : null;
    }
    if (ctx.period>=activeMonth()) {
      if (!ctx.person && def.id==="omzet" && sales.periode===ctx.period && importStatus.valid && importStatus.omzetTot?.startsWith(ctx.period)
        && Number.isFinite(sales.omzetMtdActueel) && sales.omzetMtdLy>0) {
        return {value:sales.omzetMtdActueel-sales.omzetMtdLy,prior:sales.omzetMtdLy,label:"Vorig jaar op dezelfde peildatum",date:importStatus.omzetTot};
      }
      return null;
    }
    if (!ctx.comparison || !available(result.value)) return null;
    const prior = data.month(ctx.entity,def.id,ctx.comparison);
    return available(prior.value) ? {value:result.value-prior.value,prior:prior.value,label:data.monthLabel(ctx.comparison)} : null;
  }
  function opportunityChange(ctx,def,result=metric(ctx,def)) {
    if (def.type!=="ratio" || !comparisonFor(ctx,def,result)) return null;
    const period=ctx.term==="jaar" ? String(Number(ctx.period.slice(0,4))-1)+ctx.period.slice(4) : ctx.comparison;
    const prior=metric({...ctx,period},def);
    if (![result,prior].every(row=>row.chances>0 && Number.isFinite(row.count))) return null;
    const oldRate=prior.count/prior.chances, newRate=result.count/result.chances;
    const volume=(result.chances-prior.chances)*oldRate;
    return {prior,volume,rate:result.chances*(newRate-oldRate),total:result.count-prior.count};
  }
  function monthlyPace(def,period,result) {
    if (!["omzet","life"].includes(def.id) || period!==activeMonth() || sales.periode!==period || !importStatus.valid ||
        !(result.target>0) || !Number.isFinite(result.value)) return null;
    const date=def.id==="omzet" ? importStatus.omzetTot : importStatus.winkelTot;
    const elapsed=sales.werkdagenVoorbij, total=sales.werkdagenMaand;
    if (!date?.startsWith(period) || date!==sales.pvmDatum || !Number.isInteger(total) || !Number.isInteger(elapsed) ||
        elapsed<=0 || elapsed>total) return null;
    const remaining=total-elapsed;
    const outstanding=Math.max(0,result.target-result.value);
    return {date,elapsed,total,remaining,guide:result.target*elapsed/total,
      perDay:remaining>0?outstanding/remaining:null,outstanding};
  }
  function overview(ctx) {
    return data.kpis.map(def=>{
      const result=metric(ctx,def);
      return {def,result,missing:lack(result,def),comparison:comparisonFor(ctx,def,result)};
    });
  }
  function analysisKpis(ctx,rows=overview(ctx)) {
    return ctx.show==="alle"?rows:rows.filter(row=>row.missing>0)
      .sort((a,b)=>a.result.value/a.result.target-b.result.value/b.result.target);
  }
  function previousResults(entity,def,ctx) {
    const start=ctx.term==="jaar" ? ctx.period.slice(0,5)+"01" : ctx.period;
    return monthsThrough(before(start),6).map(p=>data.month(entity,def.id,p));
  }
  function sample(row) {
    return Number.isFinite(row.chances) && row.chances>=minimumChances && Number.isFinite(row.count) && row.count>=0;
  }
  function sellerImpact(ctx,def) {
    const store=metric(ctx,def,data.store);
    const rows=data.sellers.map(person=>{
      const result=metric(ctx,def,person);
      const history=def.type==="ratio" ? previousResults(person,def,ctx).filter(sample) : [];
      const share=def.type==="ratio" && store.chances>0 && result.chances>=0 && result.chances<=store.chances &&
        available(result.chances) ? result.chances/store.chances*100 : null;
      const reference=history.length>=2 ? history.reduce((sum,item)=>sum+item.count,0)/history.reduce((sum,item)=>sum+item.chances,0)*100 : null;
      const upside=reference!==null && sample(result) ? Math.max(0,Math.round(result.chances*(reference-result.value)/100)) : null;
      const storeGain=upside!==null && store.chances>0 && result.chances<=store.chances ? upside/store.chances*100 : null;
      return {person,result,share,reference,upside,storeGain,historyCount:history.length,missing:lack(result,def)};
    });
    return rows.filter(row=>row.person.active || available(row.result.value) || row.result.chances>0)
      .sort((a,b)=>(ctx.sort==="kansen"?(b.result.chances??-1)-(a.result.chances??-1):(b.storeGain??-1)-(a.storeGain??-1)) ||
        (b.result.chances??-1)-(a.result.chances??-1) ||
        (b.result.value??-Infinity)-(a.result.value??-Infinity) || a.person.name.localeCompare(b.person.name,"nl-BE"));
  }
  function personal(ctx) {
    const end=ctx.period<activeMonth()?ctx.period:before(activeMonth());
    const strengthPeriods=ctx.term==="jaar"
      ? monthsThrough(end).filter(period=>period.slice(0,4)===ctx.period.slice(0,4))
      : monthsThrough(end,6);
    const rows=overview(ctx).map(row=>{
      const history=previousResults(ctx.person,row.def,ctx).filter(item=>
        available(item.value) && available(item.target) &&
        (row.def.type!=="ratio" || sample(item)) && (row.def.id!=="nps" || item.count>=minimumChances));
      const measured=row.def.type==="ratio" ? sample(row.result) : row.def.id==="nps" ? row.result.count>=minimumChances : true;
      const hits=history.filter(item=>item.value>=item.target).length;
      const reference=row.def.type==="ratio" ? (history.length>=2
        ? history.reduce((total,item)=>total+item.count,0)/history.reduce((total,item)=>total+item.chances,0)*100 : null)
        : ctx.term==="jaar" ? row.comparison?.prior??null : history.length>=2?average(history.map(item=>item.value)):null;
      const improvement=reference!==null && row.result.value!==null ? reference-row.result.value : null;
      return {...row,measured,hits,months:history.length,reference,improvement};
    });
    const strengths=rows.map(row=>{
      const measured=strengthPeriods.map(period=>data.month(ctx.person,row.def.id,period)).filter(item=>
        available(item.value) && available(item.target) &&
        (row.def.type!=="ratio" || (item.chances>0 && available(item.count))) &&
        (row.def.id!=="nps" || item.count>=minimumChances));
      return {...row,months:measured.length,periods:strengthPeriods.length,hits:measured.filter(item=>item.value>=item.target).length,
        totalChances:measured.reduce((sum,item)=>sum+(item.chances??0),0)};
    }).filter(row=>row.hits>=2 && row.hits>=row.months*.5)
      .sort((a,b)=>b.hits/b.months-a.hits/a.months || b.hits-a.hits);
    const focus=rows.filter(row=>row.measured && row.missing>0)
      .sort((a,b)=>Number(b.months>=2 && b.improvement>0)-Number(a.months>=2 && a.improvement>0) ||
        Number(b.def.type==="ratio")-Number(a.def.type==="ratio") ||
        (b.result.chances??0)-(a.result.chances??0) ||
        (b.result.target-b.result.value)/b.result.target-(a.result.target-a.result.value)/a.result.target).slice(0,2);
    return {strengths,focus,rows};
  }
  function series(ctx,def) {
    return monthsThrough(ctx.period).map(period=>{
      const result=ctx.detail
        ? data.components(ctx.entity,def.id,period).find(item=>item.id===ctx.detail)
        : data.month(ctx.entity,def.id,period);
      return {period,metric:result || null};
    });
  }
  function metricUnit(def) {
    return ({bedrag:"€",accessoires:"€",stuks:"stuks",ratio:"%",percentage:"%",score:"score"})[def.type];
  }
  function report(q) {
    const source=q.get("weergave");
    if (!["resultaten","analyse"].includes(source)) return null;
    if (q.has("verkoper") && !data.sellers.some(item=>item.id===q.get("verkoper"))) return null;
    if (q.has("kpi") && !data.byId[q.get("kpi")]) return null;
    const ctx=fromParams(q);
    const title=(source==="analyse"?"Analyse":"Resultaten")+" · "+ctx.entity.name+(ctx.def?" · "+ctx.def.label:"");
    const period=(ctx.term==="jaar"?"YTD t.e.m. ":"")+data.monthLabel(ctx.period);
    const stats=(result,def)=>[result?.value??null,result?.target??null,result?.count??null,result?.chances??null,
      data.resultState(result,def),result?.target==null?"Ontbrekend target":"Beschikbaar",
      result?.total===undefined?null:`${result.coverage}/${result.total}`,
      result?.targetTotal===undefined?null:`${result.targetCoverage}/${result.targetTotal}`];
    const resultHeads=["Resultaat","Target","Stuks / enquêtes","Kansen","Resultaatstatus","Targetstatus","Mnd resultaat","Mnd target"];
    const tables=[];
    const charts=[];
    const add=(title,headers,rows)=>tables.push({title,headers,rows});
    if (ctx.def) {
      const def=ctx.def;
      const selected=ctx.detail && data.components(ctx.entity,def.id,ctx.period).find(item=>item.id===ctx.detail);
      const result=selected || metric(ctx,def);
      const unit=selected?"%":metricUnit(def);
      const history=series(ctx,def).reverse();
      charts.push({title:"Maandgrafiek · "+(selected?.label||def.label),unit,history});
      if (def.type==="ratio") charts.push({title:"Aantal kansen per maand",unit:"stuks",
        history:history.map(item=>({...item,metric:{value:item.metric?.chances??null}}))});
      const componentDef=selected ? {type:selected.chances===null?"percentage":"ratio"} : def;
      const summary=[[period,unit,...stats(result,componentDef)]];
      if (source==="resultaten" && !selected) {
        const other=ctx.term==="jaar" ? "maand" : "jaar";
        summary.push([(other==="jaar"?"YTD t.e.m. ":"")+data.monthLabel(ctx.period),unit,...stats(metric({...ctx,term:other},def),def)]);
      }
      add(selected?.label || def.label,["Periode","Eenheid",...resultHeads],summary);
      add("Maandgrafiek · gegevens",["Maand","Eenheid",...resultHeads],
        [...history].reverse().map(item=>[data.monthLabel(item.period),unit,...stats(item.metric,componentDef)]));
      if (!ctx.detail) {
        const components=data.components(ctx.entity,def.id,ctx.period);
        if (components.length) add("Uitsplitsing · gekozen maand",["Onderdeel","Eenheid",...resultHeads],components.map(item=>[item.label,"%",...stats(item,def)]));
      }
      if (source==="analyse" && !ctx.person) {
        const sellers=sellerImpact(ctx,def);
        add("Verkopersresultaten",["Verkoper",...resultHeads],sellers.map(row=>[row.person.name,...stats(row.result,def)]));
        if (def.type==="ratio") add("Verdeling en winkelimpact",["Verkoper","Aandeel kansen (%)","Eigen referentie (%)","Extra stuks bij referentie","Winkelimpact (pp)"],
          sellers.map(row=>[row.person.name,row.share,row.reference,row.upside,row.storeGain]));
      } else if (source==="resultaten" && !ctx.person && !ctx.detail) {
        for (const term of ["maand","jaar"]) add(term==="maand"?"Verkopers · gekozen maand":"Verkopers · YTD",["Verkoper",...resultHeads],
          sellerImpact({...ctx,term},def).map(row=>[row.person.name,...stats(row.result,def)]));
      }
      if (source==="analyse") {
        const change=comparisonFor(ctx,def,result);
        if (change) add("Periodevergelijking",["Vergelijking","Eenheid","Vorig resultaat","Verschil"],[[change.label,unit,change.prior,change.value]]);
        const own=ctx.person && personal(ctx).rows.find(row=>row.def.id===def.id);
        if (own && own.reference!==null) add("Eigen eerdere resultaten",["Eenheid","Referentie","Verschil tegenover eigen referentie"],
          [[unit,own.reference,own.improvement===null?null:-own.improvement]]);
        const split=opportunityChange(ctx,def,result);
        if (split) add("Volume en resultaat per kans",["Kansen vooraf","Kansen nu","Verschil stuks","Door aantal kansen","Door stuks per kans"],
          [[split.prior.chances,result.chances,split.total,split.volume,split.rate]]);
      } else if (!ctx.person && !selected && ctx.term==="maand") {
        const pace=monthlyPace(def,ctx.period,result);
        if (pace) add("Tempo deze maand",["Peildatum","Verkoopdagen verwerkt","Verkoopdagen totaal","Richtpunt","Nog nodig per verkoopdag"],
          [[pace.date,pace.elapsed,pace.total,def.id==="life"?Math.ceil(pace.guide):pace.guide,
            def.id==="life" && pace.perDay!==null?Math.ceil(pace.perDay):pace.perDay]]);
      }
    } else if (source==="resultaten" && !ctx.person && q.get("groep")==="verkopers") {
      add("Verkopers per KPI",["Verkoper","KPI","Eenheid",...resultHeads],
        data.sellers.flatMap(person=>data.kpis.flatMap(def=>{
          const result=metric(ctx,def,person);
          return person.active || result.value!==null ? [[person.name,def.label,metricUnit(def),...stats(result,def)]] : [];
        })));
    } else {
      if (source==="analyse" && ctx.person) {
        const {strengths,focus}=personal(ctx);
        for (const [title,rows] of [["Sterktes",strengths],["Focus",focus]]) {
          if (rows.length) add(title,["KPI","Eenheid",...resultHeads,...(title==="Sterktes"?["Meetbare maanden op target","Afgesloten maanden meetbaar","Afgesloten maanden bekeken","Kansen in die maanden"]:["Eigen referentie","Verschil tegenover eigen referentie"])],
            rows.map(({def,result,hits,months,periods,totalChances,reference,improvement})=>[def.label,metricUnit(def),...stats(result,def),
              ...(title==="Sterktes"?[hits,months,periods,def.type==="ratio"?totalChances:null]:[reference,improvement===null?null:-improvement])]));
        }
      }
      add("Overzicht",["KPI","Eenheid",...resultHeads,...(source==="analyse"?["Vergelijking","Verschil","Tekort","Eenheid tekort"]:[])],
        (source==="analyse"?analysisKpis(ctx):overview(ctx)).map(({def,result,missing,comparison})=>[def.label,metricUnit(def),...stats(result,def),
          ...(source==="analyse"?[comparison?.label??null,comparison?.value??null,missing,
            gapDef(result,def).type==="stuks"?"stuks":["ratio","percentage"].includes(def.type)?"pp":metricUnit(def)]:[])]));
    }
    const scope=source==="resultaten" && !ctx.person && q.get("groep")==="verkopers"?"Alle verkopers":ctx.entity.name;
    return {title,period,sourceDate:importStatus.omzetTot??null,tables,charts:charts.filter(chart=>chart.history.some(item=>Number.isFinite(item.metric?.value))),ctx,source,scope};
  }
  w.ScorebladReview={activeMonth,fromParams,metric,deltaLabel,lack,gapDef,comparisonFor,opportunityChange,monthlyPace,overview,analysisKpis,sellerImpact,personal,series,report,minimumChances,importStatus};
})();
