/* Mobiele router en weergaven voor het Diestroyers-prestatieplatform. */
(() => {
  "use strict";
  const data = window.ScorebladData;
  const review = window.ScorebladReview;
  const root = document.getElementById("score-main");
  const home = root.innerHTML;
  const nav = document.querySelector(".score-nav");
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  const routes = ["home","analyse","resultaten","rankings","nps"];
  const metrics = [
    ["trust","Akte van Vertrouwen",70,80],["price","Laagste Prijs Garantie",70,80],
    ["information","Inlichtingen",90,95],["wait","Wachttijd",90,95],["friendly","Vriendelijkheid",90,95]
  ];
  const integer = new Intl.NumberFormat("nl-BE");
  const axisNumber = new Intl.NumberFormat("nl-BE",{notation:"compact",maximumFractionDigits:1});
  const axisMonth = new Intl.DateTimeFormat("nl-BE",{month:"short",timeZone:"UTC"});
  const dateFormat = new Intl.DateTimeFormat("nl-BE",{dateStyle:"medium",timeZone:"UTC"});
  const dateLabel = value => {
    const date = new Date(value);
    return isNaN(date) ? value : dateFormat.format(date);
  };
  const ratioDef = {type:"percentage"};
  const statuses = {
    3:{tone:"good",symbol:"✓",label:"Target behaald"},
    1:{tone:"close",symbol:"≈",label:"Bijna op target"},
    0:{tone:"bad",symbol:"↓",label:"Onder target"}
  };

  function url(page, values = {}) {
    const query = new URLSearchParams();
    for (const [key,value] of Object.entries(values)) if (value !== null && value !== undefined && value !== "") query.set(key,value);
    return "#" + page + (query.size ? "?" + query : "");
  }
  function heading(name, sub = "") {
    return `<div class="score-title"><h1 tabindex="-1">${escape(name)}</h1>${sub ? `<p>${escape(sub)}</p>` : ""}</div>`;
  }
  function back(label, href) {
    return `<a class="score-back" href="${escape(href)}">${escape(label)}</a>`;
  }
  function resultStatus(value, status, announce = true) {
    if (!status) return escape(value);
    return `<span class="score-result ${status.tone}"><span aria-hidden="true">${status.symbol}</span><span>${escape(value)}</span>${announce ? `<span class="score-sr-only"> (${status.label})</span>` : ""}</span>`;
  }
  function scoreFields(result, def) {
    return {value:data.format(result.value,def),empty:result.value === null,status:statuses[data.points(result)]};
  }
  function colorGuide() {
    return `<ul class="score-color-guide" aria-label="Betekenis van de resultaatkleuren">${[3,1,0].map(points =>
      `<li>${resultStatus(statuses[points].label,statuses[points],false)}</li>`).join("")}</ul>`;
  }
  function row({label, meta, value, href, rank, own, empty, status}) {
    const body = `<span class="score-name">${rank !== undefined ? `<span class="score-rank">${rank ?? "—"}</span>` : ""}
      <span>${escape(label)}${meta ? `<small class="score-meta">${escape(meta)}</small>` : ""}</span></span>
      ${value === undefined ? "" : `<span class="score-value${empty ? " empty" : ""}">${resultStatus(value,status)}</span>`}`;
    const cls = "score-row" + (own ? " own" : "") + (value === undefined ? " name-only" : "");
    return href ? `<li><a class="${cls}" href="${escape(href)}">${body}</a></li>` : `<li class="${cls}">${body}</li>`;
  }
  function list(items, label) {
    return items.length ? `<ul class="score-list" aria-label="${escape(label)}">${items.map(row).join("")}</ul>` : '<p class="score-empty">Geen gegevens beschikbaar.</p>';
  }
  function segment(label, options, selected) {
    return `<div class="score-segments" role="group" aria-label="${escape(label)}">${options.map(([value,text,href]) =>
      `<a href="${escape(href)}"${value === selected ? ' aria-current="true"' : ""}>${escape(text)}</a>`).join("")}</div>`;
  }
  function picker(label, options, selected) {
    return `<label class="score-field"><span>${escape(label)}</span><select data-score-select>${options.map(([value,text,href]) =>
      `<option value="${escape(href)}"${value === selected ? " selected" : ""}>${escape(text)}</option>`).join("")}</select></label>`;
  }
  function periodPicker(periods, selected, format, link, label = "Periode") {
    return picker(label,[...periods].sort().reverse().map(period => [period,format(period),link(period)]),selected);
  }
  function facts(items) {
    return `<dl class="score-facts">${items.filter(([,value]) => value !== null && value !== undefined)
      .map(([name,value,status]) => `<div><dt>${escape(name)}</dt><dd>${resultStatus(value,status)}</dd></div>`).join("")}</dl>`;
  }
  function section(title, html) {
    return `<section class="score-section"><h2>${escape(title)}</h2>${html}</section>`;
  }
  function exportView(view,values) {
    const q=new URLSearchParams({weergave:view});
    for (const [key,value] of Object.entries(values)) if (value) q.set(key,value);
    return `<p class="score-view-export"><a class="score-button" href="export.html?${escape(q)}">Exporteer deze weergave</a></p>`;
  }
  function analysisLink(values) { return url("analyse",values); }
  function sellerLists(label, toRow, hasHistory) {
    const current = data.sellers.filter(person => person.active).map(toRow);
    const historical = data.sellers.filter(person => !person.active && hasHistory(person)).map(toRow);
    return list(current,label) + (historical.length
      ? section("Historische verkopers",list(historical,"Historische verkopers"))
      : "");
  }
  function targetLabel(result, def) {
    return result.target === null ? "Geen target" : "Target " + data.format(result.target,def);
  }
  function metricFacts(result, def, periodText = "Resultaat") {
    const score = data.points(result);
    const count = result.count === null || result.count === undefined ? null : integer.format(result.count);
    const chances = result.chances > 0 ? integer.format(result.chances) : null;
    const items = [[periodText,data.format(result.value,def),statuses[score]],["Target",result.target === null ? "Geen target" : data.format(result.target,def)]];
    if (def.type === "ratio" || def.id === "s" || def.id === "nps") items.push([def.id === "nps" ? "Enquêtes" : "Stuks",count]);
    if (def.type === "ratio") items.push(["Kansen",chances]);
    if (result.euro !== null && result.euro !== undefined) items.push(["Bedrag",data.format(result.euro,{type:"bedrag"})]);
    if (result.prior !== null && result.prior !== undefined) items.push(["Vorig jaar",data.format(result.prior,def)]);
    if (result.total !== undefined) items.push(["Maanden met data",result.coverage + " / " + result.total]);
    if (result.targetTotal !== undefined && result.targetCoverage<result.targetTotal) {
      items.push(["Maanden met target",result.targetCoverage + " / " + result.targetTotal]);
    }
    return facts(items) + (score === null ? "" : `<p class="score-section"><span class="score-status ${statuses[score].tone}">${score === 1 ? "Binnen 10% van target" : statuses[score].label}</span></p>`);
  }
  function resultLink(values) { return url("resultaten",values); }
  function trendChart(history, def, period, legend="Resultaat") {
    const months = history.filter(item => item.period <= period).slice(0,12).reverse();
    const hasValue = value => Number.isFinite(value);
    if (!months.some(item => hasValue(item.metric?.value))) return '<p class="score-empty">Geen gegevens voor deze maandgrafiek.</p>';
    const values = months.flatMap(item => [item.metric?.value,item.metric?.target]).filter(hasValue);
    const min = Math.min(...values), max = Math.max(...values);
    const pad = (max-min || Math.abs(max) || 1) * .12;
    const bottom = min >= 0 ? Math.max(0,min-pad) : min-pad;
    const top = max+pad;
    const box = {left:81,right:420,top:16,bottom:151};
    const x = index => months.length === 1 ? (box.right+box.left)/2 : box.left+(box.right-box.left)*index/(months.length-1);
    const y = value => box.bottom-(value-bottom)/(top-bottom)*(box.bottom-box.top);
    const targetLine = months.some(item => hasValue(item.metric?.target));
    const line = key => months.map((item,index) => {
      const value = item.metric?.[key];
      if (!hasValue(value)) return "";
      return (hasValue(months[index-1]?.metric?.[key]) ? "L" : "M")+x(index).toFixed(2)+" "+y(value).toFixed(2);
    }).join(" ");
    const ticks = [0,1,2,3].map(index => {
      const value = bottom+(top-bottom)*index/3;
      const label = axisNumber.format(value);
      return `<line x1="${box.left}" x2="${box.right}" y1="${y(value)}" y2="${y(value)}"/>
        <text x="${box.left-8}" y="${y(value)+5}" text-anchor="end">${escape(["bedrag","accessoires"].includes(def.type) ? "€ "+label : ["ratio","percentage"].includes(def.type) ? label+"%" : label)}</text>`;
    }).join("");
    const indices = [...new Set([0,Math.round((months.length-1)/3),Math.round((months.length-1)*2/3),months.length-1])];
    const labels = indices.map(index => `<text x="${x(index)}" y="176" text-anchor="middle">${escape(axisMonth.format(new Date(months[index].period+"-01T00:00:00Z")))}</text>`).join("");
    const dots = months.map((item,index) => {
      const value = item.metric?.value;
      if (!hasValue(value)) return "";
      return `<circle class="${item.period === period ? "selected" : ""}" cx="${x(index)}" cy="${y(value)}" r="${item.period === period ? 5.5 : 3.4}">
        <title>${escape(data.monthLabel(item.period)+" · "+data.format(value,def))}</title></circle>`;
    }).join("");
    const targetDots=months.map((item,index)=>{
      const value=item.metric?.target;
      if (!hasValue(value) || hasValue(months[index-1]?.metric?.target) || hasValue(months[index+1]?.metric?.target)) return "";
      return `<circle class="score-trend-target-dot" cx="${x(index)}" cy="${y(value)}" r="3.2"/>`;
    }).join("");
    return `<figure class="score-trend">
      <svg viewBox="0 0 440 190" role="img" aria-label="${escape(legend+" per maand t.e.m. "+data.monthLabel(period))}">
        <g class="score-trend-grid">${ticks}${labels}</g>
        ${targetLine ? `<path class="score-trend-target" d="${line("target")}"/>` : ""}
        ${targetDots}
        <path class="score-trend-value" d="${line("value")}"/>
        <g class="score-trend-dots">${dots}</g>
      </svg>
      <figcaption><span class="score-trend-key">${escape(legend)}</span>${targetLine ? '<span class="score-trend-key target">Target</span>' : ""}
        <span>T.e.m. ${escape(data.monthLabel(period))}</span></figcaption>
    </figure>`;
  }
  function trendSection(history,def,period) {
    const volume=history.map(item=>({...item,metric:{value:item.metric?.chances??null}}));
    return section("Maandevolutie",trendChart(history,def,period)+
      (def.type==="ratio" && volume.some(item=>item.metric.value!==null)
        ? `<details class="score-chart-more"><summary>Verloop van de kansen</summary>${trendChart(volume,{type:"stuks"},period,"Kansen")}</details>` : ""));
  }
  function targetGap(row) {
    if (row.missing===null) return row.result.value===null ? "Geen resultaat" : "Geen target";
    if (!row.missing) return "Target behaald";
    return review.deltaLabel(row.missing,review.gapDef(row.result,row.def))+" tot target";
  }
  function analysisPage(q) {
    const ctx=review.fromParams(q);
    const {person,entity,def,period,term,comparison,candidates}=ctx;
    const base={verkoper:person?.id,kpi:def?.id,periode:period,termijn:term,vergelijk:comparison};
    const subtitle=(term==="jaar"?"YTD t.e.m. ":"")+data.monthLabel(period);
    const currentPeriod=period>=review.activeMonth();
    const reportDate=review.importStatus.omzetTot;
    const periodFilters=periodPicker(data.periods.length?data.periods:[data.latest],period,data.monthLabel,
      value=>analysisLink({...base,periode:value,vergelijk:null}))+segment("Analyseperiode",[
        ["maand","Maand",analysisLink({...base,termijn:"maand"})],
        ["jaar","YTD",analysisLink({...base,termijn:"jaar"})]
      ],term);
    const people=[["winkel",data.store.name,analysisLink({...base,verkoper:null})],
      ...data.sellers.map(item=>[item.id,item.name+(item.active?"":" · Historiek"),analysisLink({...base,verkoper:item.id})])];
    const filters=`<div class="score-filters score-analysis-filters">${picker("Voor",people,person?.id||"winkel")}${periodFilters}
      ${term==="maand"&&!currentPeriod&&candidates.length?periodPicker(candidates,comparison,data.monthLabel,
        value=>analysisLink({...base,vergelijk:value}),"Vergelijk met"):""}</div>`;
    const asOf=reportDate?.startsWith(period) && currentPeriod ? `<p class="score-muted">Omzetgegevens t.e.m. ${escape(dateLabel(reportDate))}</p>` : "";
    const head=(def?back("Analyse · "+entity.name,analysisLink({...base,kpi:null})):"")+
      heading(def?.label || (person?"Analyse · "+person.name:"Analyse"),def?entity.name+" · "+subtitle:subtitle)+filters+asOf;
    const resultDetails=key=>resultLink({kpi:key,periode:period,verkoper:person?.id,termijn:term});
    if (def) {
      const result=review.metric(ctx,def);
      const missing=review.lack(result,def);
      const change=review.comparisonFor(ctx,def,result);
      const people=person ? [] : review.sellerImpact(ctx,def);
      const notable=people.filter(row=>row.person.active && row.upside>0 && row.storeGain!==null);
      const nilVolume=def.type==="ratio" && people.some(row=>row.result.chances>0 && row.result.chances<review.minimumChances);
      const breakdown=people.map(({person:member,result,share,reference,upside,storeGain,missing})=>{
        const meta=[targetLabel(result,def)];
        if (def.type==="ratio") {
          if (result.chances!==null) meta.push(`${result.count ?? "—"} / ${integer.format(result.chances)} kansen`);
          if (share!==null) meta.push(`${integer.format(share)}% van winkelkansen`);
          if (reference!==null) meta.push("Eigen referentie "+data.format(reference,ratioDef));
          if (storeGain!==null && upside>0) meta.push(`+${upside} stuks · ${review.deltaLabel(storeGain,ratioDef,true)} voor Diest`);
        }
        if (missing>0) meta.push(targetGap({missing,def,result}));
        return {label:member.name,meta:meta.join(" · "),...scoreFields(result,def),
          href:analysisLink({...base,verkoper:member.id})};
      });
      const components=data.components(entity,def.id,period);
      return head+metricFacts(result,def,term==="jaar"?"Jaarresultaat":"Maandresultaat") +
        (missing>0?`<p class="score-analysis-note">${escape(targetGap({missing,def,result}))}
          ${def.type==="ratio" && review.gapDef(result,def).type==="stuks"?"bij het huidige aantal kansen.":""}</p>`:"")+
        (change?section("Vergelijking",facts([["Vergeleken met",change.label],["Referentiewaarde",data.format(change.prior,def)],
          ["Verschil",review.deltaLabel(change.value,def,true)]])):"") +
        (people.length?section(def.type==="ratio"?"Kansen en mogelijke winkelimpact":"Verkopersresultaten",
          (notable.length?`<p class="score-analysis-note">Grootste berekende ruimte bij ${escape(notable[0].person.name)} · ${escape(review.deltaLabel(notable[0].storeGain,ratioDef,true))} voor Diest.</p>`:"") +
          list(breakdown,"Verkopers per KPI")+
          (def.type==="ratio"?`<p class="score-muted">Winkelimpact per verkoper bij hetzelfde aantal kansen, afgezet tegen diens eigen resultaat uit maximaal zes maanden vóór ${term==="jaar"?"het gekozen jaar":"de gekozen maand"}. Minstens twee referentiemaanden met elk ${review.minimumChances} kansen.${nilVolume?" Bij weinig kansen weegt één verkoop zwaar door.":""}</p>`:"")):"") +
        trendSection(review.series(ctx,def),def,period) +
        (components.length?section("Uitsplitsing · gekozen maand",list(components.map(item=>({label:item.label,...scoreFields(item,ratioDef),
          meta:item.chances>0?`${item.count ?? "—"} / ${item.chances} kansen`:null,href:resultLink({kpi:def.id,verkoper:person?.id,periode:period,detail:item.id})})),"Uitsplitsing")):"") +
        (def.id==="nps"?`<a class="score-button" href="${escape(url("nps",{onderdeel:"nps",verkoper:person?.id,periode:period,termijn:term}))}">Lees de klantreacties</a>`:"") +
        `<p><a class="score-back" href="${escape(resultDetails(def.id))}">Volledige resultaatdetails</a></p>`+exportView("analyse",base);
    }
    const rowLink=row=>analysisLink({...base,kpi:row.def.id});
    const notes=term==="jaar"?"YTD bevat de gekozen maand. Een vergelijking vereist volledige cijfers voor dezelfde afgesloten periode van vorig jaar."
      : currentPeriod?"Voor de lopende maand vergelijken we alleen cijfers met een overeenkomstige peildatum."
        : !comparison?"Er is nog geen eerdere afgesloten maand beschikbaar.":"";
    const rows=review.overview(ctx);
    const ranked=rows.filter(row=>row.missing>0).sort((a,b)=>a.result.value/a.result.target-b.result.value/b.result.target);
    const movers=rows.filter(row=>row.comparison?.value);
    const normalized=row=>row.comparison.value/(row.result.target>0 ? row.result.target : Math.max(1,Math.abs(row.comparison.prior)));
    const deltas=movers.sort((a,b)=>normalized(b)-normalized(a));
    const listTo=(values,label,meta)=>list(values.map(row=>({
      label:row.def.label,meta:meta(row),...scoreFields(row.result,row.def),href:rowLink(row)
    })),label);
    const gapList=ranked.length ? listTo(ranked,"Afstand tot target",targetGap) : '<p class="score-empty">Geen gemeten KPI’s onder target in deze periode.</p>';
    const movementList=(label,values)=>list(values.map(row=>({label:row.def.label,
      meta:row.comparison.label,value:review.deltaLabel(row.comparison.value,row.def,true),href:rowLink(row)})),label);
    const personal=person?review.personal(ctx):null;
    const focus=personal?section("Sterktes",personal.strengths.length?listTo(personal.strengths,"Sterktes",
      row=>`${row.hits} van ${row.months} meetbare maanden op target`+
        (row.def.type==="ratio"?` · ${integer.format(row.totalChances)} kansen`:"")):'<p class="score-empty">Nog geen terugkerende sterkte zichtbaar.</p>')+
      section("Persoonlijke focus",personal.focus.length?listTo(personal.focus,"Persoonlijke focus",row=>
        targetGap(row)+(row.def.type==="ratio"?` · ${row.result.chances} kansen`:"")):'<p class="score-empty">Geen duidelijke focus op basis van resultaten en meetvolume.</p>')+
      `<p class="score-muted">Focus gebruikt beschikbare targets en eerdere resultaten. Voor ratio’s en NPS gebruiken we minstens ${review.minimumChances} kansen of enquêtes.</p>`:"";
    return head+focus+section("Afstand tot target",gapList)+
      (deltas.length?section("Verandering tegenover de referentie",`<div class="score-compare"><div><h3>Stijgers</h3>${movementList("Stijgers",deltas.filter(row=>row.comparison.value>0).slice(0,3))}</div>
         <div><h3>Dalers</h3>${movementList("Dalers",deltas.filter(row=>row.comparison.value<0).reverse().slice(0,3))}</div></div>`):"")+
      (notes?`<p class="score-muted">${escape(notes)}</p>`:"")+
      section("Alle KPI’s",listTo(rows,"KPI's",targetGap))+exportView("analyse",base);
  }
  function sellerKpiResults(def, period, annual) {
    const read = annual ? data.annual : data.month;
    const store = read(data.store,def.id,period);
    const people = data.sellers.map(person => ({person,result:read(person,def.id,period)}))
      .filter(({person,result}) => person.active || result.value !== null)
      .sort((a,b) => (b.result.value ?? -Infinity)-(a.result.value ?? -Infinity) || a.person.name.localeCompare(b.person.name,"nl-BE"));
    return list(people.map(({person,result}) => {
      const meta = person.active ? [targetLabel(result,def)] : ["Historische verkoper",targetLabel(result,def)];
      if (result.count !== null) {
        if (def.type === "ratio" && result.chances > 0) meta.push(`${integer.format(result.count)} stuks / ${integer.format(result.chances)} kansen`);
        if (def.id === "nps") meta.push(`${integer.format(result.count)} enquêtes`);
        if (def.id === "s") meta.push(`${integer.format(result.count)} stuks`);
      }
      if (["bedrag","accessoires","stuks"].includes(def.type) && result.value >= 0 && result.value !== null && store.value > 0) {
        meta.push(data.format(result.value/store.value*100,ratioDef)+" van winkelresultaat");
      }
      if (annual && result.coverage < result.total && result.value !== null) meta.push(`${result.coverage}/${result.total} maanden`);
      return {label:person.name,meta:meta.join(" · "),...scoreFields(result,def),
        href:resultLink({weergave:"verkopers",verkoper:person.id,kpi:def.id,periode:period,termijn:annual?"jaar":null,van:"winkel"})};
    }),annual ? "Verkopersresultaten YTD" : "Verkopersresultaten maand");
  }
  function resultPage(q) {
    const entity = data.sellers.find(person => person.id === q.get("verkoper"));
    const mode = entity || q.get("weergave") === "verkopers" ? "verkopers" : "kpis";
    const period = data.periods.includes(q.get("periode")) ? q.get("periode") : data.latest;
    const def = data.kpis.find(item => item.id === q.get("kpi"));
    const annualSeller = q.get("termijn") === "jaar";
    const fromStore = Boolean(entity && q.get("van") === "winkel");
    const base = {weergave:mode,periode:period,verkoper:entity?.id,kpi:def?.id,detail:q.get("detail"),termijn:annualSeller?"jaar":null,van:fromStore?"winkel":null};
    const exportResults=exportView("resultaten",{...base,weergave:null,groep:mode});
    const source = entity || data.store;
    const subtitle = data.monthLabel(period);
    const periods = data.periods.length ? data.periods : [period];
    const selector = periodPicker(periods,period,data.monthLabel,value => resultLink({...base,periode:value}));
    if (def) {
      const result = data.month(source,def.id,period);
      const subdivisions = data.components(source,def.id,period);
      const requested = subdivisions.find(item => item.id === base.detail);
      if (requested) {
        const history = review.series({entity:source,period,detail:requested.id},def);
        return back(def.label,resultLink({...base,detail:null})) + heading(requested.label,`${source.name} · ${def.label} · ${subtitle}`)
          + selector + metricFacts(requested,ratioDef)
          + trendSection(history,{type:requested.chances!==null?"ratio":"percentage"},period)
          + section("Maandhistoriek",list(history.filter(item=>item.metric).map(item => ({label:data.monthLabel(item.period),...scoreFields(item.metric,ratioDef),
            meta:targetLabel(item.metric,ratioDef),href:resultLink({...base,periode:item.period})})),"Maandhistoriek"))+exportResults;
      }
      const annual = data.annual(source,def.id,period);
      const history = review.series({entity:source,period,detail:null},def);
      return (fromStore ? back("Winkelresultaat "+def.label,resultLink({weergave:"kpis",periode:period,kpi:def.id}))
        : back(entity ? source.name : "Alle KPI’s",resultLink({...base,kpi:null,detail:null})))
        + heading(def.label,`${source.name} · ${subtitle}`) + `<div class="score-filters inline">${selector}</div>`
        + metricFacts(annualSeller?annual:result,def,annualSeller?"Jaarresultaat":"Maandresultaat")
        + (subdivisions.length ? section("Uitsplitsing",list(subdivisions.map(detail => ({
            label:detail.label, ...scoreFields(detail,ratioDef), meta:targetLabel(detail,ratioDef), href:resultLink({...base,detail:detail.id})
          })),"Uitsplitsing")) : "")
        + (def.id === "nps" ? section("Klantbeleving",list([{label:"NPS en commentaren",href:url("nps",{verkoper:entity?.id,periode:period,onderdeel:"nps"})}],"Klantbeleving")) : "")
        + section(annualSeller?subtitle:"Jaar t.e.m. "+subtitle,metricFacts(annualSeller?result:annual,def,annualSeller?"Maandresultaat":"Jaarresultaat"))
        + trendSection(history,def,period)
        + (!entity ? section("Verkopersresultaten",`<div class="score-compare">
              <div><h3>${escape(subtitle)}</h3>${sellerKpiResults(def,period,false)}</div>
              <div><h3>YTD t.e.m. ${escape(subtitle)}</h3>${sellerKpiResults(def,period,true)}</div>
            </div>`):"")
        + section("Maandhistoriek",list(history.map(item => ({
            label:data.monthLabel(item.period), ...scoreFields(item.metric,def),
            meta:targetLabel(item.metric,def),href:resultLink({...base,periode:item.period,detail:null})
          })),"Maandhistoriek"))
        + `<p><a class="score-back" href="${escape(analysisLink({periode:period,verkoper:entity?.id,kpi:def.id,termijn:base.termijn}))}">Analyse van deze KPI</a></p>`+exportResults;
    }

    if (entity) {
      const terms = segment("Periode verkopersresultaten",[
        ["maand","Gekozen maand",resultLink({...base,termijn:null})],
        ["jaar","YTD t.e.m. gekozen maand",resultLink({...base,termijn:"jaar"})]
      ],annualSeller?"jaar":"maand");
      return back("Alle verkopers",resultLink({weergave:mode,periode:period}))
        + heading(entity.name,(annualSeller ? "YTD t.e.m. " : "") + subtitle + (entity.active ? "" : " · Historiek"))
        + `<div class="score-filters">${terms}${selector}</div>` + colorGuide() + kpiList(source,base,period,annualSeller)
        + `<p><a class="score-back" href="${escape(analysisLink({periode:period,verkoper:entity.id,termijn:base.termijn}))}">Persoonlijke analyse</a></p>`+exportResults;
    }
    const switches = segment("Resultaten bekijken voor",[
      ["kpis","KPI’s",resultLink({...base,weergave:"kpis"})],["verkopers","Verkopers",resultLink({...base,weergave:"verkopers"})]
    ],mode);
    if (mode === "verkopers") {
      const sellers = sellerLists("Verkopers",person => ({label:person.name,href:resultLink({...base,verkoper:person.id})}),
        person => data.kpis.some(def => data.month(person,def.id,period).value !== null));
      return heading("Resultaten",subtitle) + `<div class="score-filters">${switches}${selector}</div>` + sellers+exportResults;
    }
    return heading("Resultaten",`${data.store.name} · ${subtitle}`) + `<div class="score-filters">${switches}${selector}</div>` + colorGuide() + kpiList(source,base,period)+exportResults;
  }
  function kpiList(entity,base,period,annual = false) {
    const read = annual ? data.annual : data.month;
    return list(data.kpis.map(def => {
      const result = read(entity,def.id,period);
      return {label:def.label,meta:targetLabel(result,def),...scoreFields(result,def),href:resultLink({...base,kpi:def.id})};
    }),"KPI’s");
  }

  function rankLink(values) { return url("rankings",values); }
  function rankingPage(q) {
    const scope = q.get("scope") === "regio" ? "regio" : "team";
    const term = scope === "team" && q.get("termijn") === "jaar" ? "jaar" : "maand";
    const metricKeys = [["big7","BIG 7"],["alle","Alle 14 KPI’s"],...data.kpis.map(def => [def.id,def.label])];
    const key = metricKeys.some(([item]) => item === q.get("rang")) ? q.get("rang") : "big7";
    const base = {scope,termijn:term,rang:key};
    const regional = scope === "regio";
    const period = regional ? data.regionPeriod() || data.latest : data.latest;
    const picks = data.compare({scope,term,metric:key,period});
    const chosen = picks.find(item => item.entity.id === q.get("entiteit"));
    const group = !data.byId[key];
    const name = metricKeys.find(([item]) => item === key)[1];
    const subtitle = (term === "jaar" ? "Jaar t.e.m. " : "") + data.monthLabel(period);
    const format = value => group ? value === null ? "Geen data" : integer.format(value) + " pt" : data.format(value,data.byId[key]);
    if (chosen) {
      const entity = chosen.entity;
      const requestedKpi = data.kpis.find(item => item.id === q.get("kpi"));
      const drill = chosen.breakdown.find(item => item.key === requestedKpi?.id) ||
        (regional && requestedKpi ? {key:requestedKpi.id,result:data.month(entity,requestedKpi.id,period)} : null);
      if (drill) {
        const def = data.byId[drill.key];
        const related = regional ? [] : data.components(entity,def.id,period);
        return back(entity.name,rankLink({...base,entiteit:entity.id}))
          + heading(def.label,`${entity.name} · ${subtitle}`)
          + metricFacts(drill.result,def,term === "jaar" ? "Jaarresultaat" : "Maandresultaat")
          + (related.length || !regional ? section("Resultaatdetails",list([{label:term === "jaar" ? "Maandcijfers en historiek" : "Uitsplitsing en historiek",
            href:resultLink({weergave:"verkopers",verkoper:entity.id,kpi:def.id,periode:period,termijn:term==="jaar"?"jaar":null})}],"Resultaatdetails")) : "");
      }
      return back("Ranglijst",rankLink(base)) + heading(entity.name,`${name} · ${subtitle}`)
        + facts([["Positie",chosen.rank ?? "Geen data"],["Score",format(chosen.value),group ? null : statuses[chosen.breakdown[0].points]],...(group ? [["KPI’s met score",chosen.available + " / " + chosen.total]] : [])])
        + section(group ? "Score per KPI" : "Resultaat",list(chosen.breakdown.map(item => {
          const def = data.byId[item.key];
          return {label:def.label,...scoreFields(item.result,def),meta:targetLabel(item.result,def) + (group ? " · " + (item.points === null ? "Geen puntenberekening" : item.points + " pt") : ""),
            href:rankLink({...base,entiteit:entity.id,kpi:item.key})};
        }),"Resultaat per KPI"))
        + (regional ? section("Winkelresultaten",list(data.kpis.map(def => {
          const result = data.month(entity,def.id,period);
          return {label:def.label,...scoreFields(result,def),meta:targetLabel(result,def),
            href:rankLink({...base,entiteit:entity.id,kpi:def.id})};
        }),"Winkelresultaten")) : "");
    }
    const filters = segment("Regio of team",[
      ["team","Team Diest",rankLink({...base,scope:"team"})],["regio","Regio",rankLink({...base,scope:"regio",termijn:"maand"})]
    ],scope) + (regional ? "" : segment("Rankingperiode",[
      ["maand","Actieve maand",rankLink({...base,termijn:"maand"})],["jaar","Jaar t.e.m. actieve maand",rankLink({...base,termijn:"jaar"})]
    ],term)) + picker("Rangschikking",metricKeys.map(([id,label]) => [id,label,rankLink({...base,rang:id})]),key);
    const showCoverage = group && picks.some(item => item.available < item.total);
    return heading("Rankings",subtitle) + `<div class="score-filters">${filters}</div>`
      + list(picks.map(item => ({label:item.entity.name,value:format(item.value),empty:item.value === null,rank:item.rank,
          status:group ? null : statuses[item.breakdown[0].points],
          meta:showCoverage ? `${item.available} van ${item.total} KPI’s met score` : "",own:regional && item.entity.id === data.store.id,
          href:rankLink({...base,entiteit:item.entity.id})})),"Ranglijst")
      + (showCoverage ? '<p class="score-muted score-section">Punten per KPI met resultaat en target: 3 bij target, 1 vanaf 90%, anders 0.</p>' : "");
  }

  function npsLink(values) { return url("nps",values); }
  function surveyResult(entity, period, survey) {
    return {value:survey?.cards > 0 ? survey.nps ?? null : null,target:data.month(entity,"nps",period).target};
  }
  function experienceResult(stats, warning, target) {
    const value = stats?.responses > 0 ? stats.value ?? null : null;
    const status = value === null ? null : statuses[value >= target ? 3 : value >= warning ? 1 : 0];
    return {value:data.format(value,ratioDef),empty:value === null,status};
  }
  function npsPage(q) {
    const entity = data.sellers.find(person => person.id === q.get("verkoper"));
    const mode = entity || q.get("weergave") === "verkopers" ? "verkopers" : "winkel";
    const source = entity || data.store;
    const surveyPeriods = [...new Set(data.nps.periods || Object.keys(data.nps.store?.month || {}))];
    const latest = data.nps.latestPeriod || data.latest;
    const period = surveyPeriods.includes(q.get("periode")) ? q.get("periode") : latest;
    const activeMetric = metrics.find(([key]) => key === q.get("onderdeel"));
    const chosenMetric = activeMetric?.[0] || (q.get("onderdeel") === "nps" ? "nps" : null);
    const base = {weergave:mode,verkoper:entity?.id,periode:period,onderdeel:chosenMetric};
    const profile = data.npsProfile(source);
    const experience = data.avvProfile(source);
    const mtd = profile?.month?.[period], ytd = profile?.ytd?.[period];
    const avvPeriod = data.avv.latestPeriod;
    const subtitle = source.name + " · " + data.monthLabel(period);

    if (chosenMetric === "nps") {
      const selector = periodPicker(surveyPeriods.length ? surveyPeriods : [period],period,data.monthLabel,value => npsLink({...base,periode:value}));
      const viewYear = q.get("termijn") === "jaar";
      const survey = viewYear ? ytd : mtd;
      const comments = (entity ? profile?.comments : data.nps.comments) || [];
      const visible = [...comments].filter(comment => viewYear ? comment.period?.startsWith(period.slice(0,4)) && comment.period <= period : comment.period === period)
        .sort((a,b) => String(b.dateIso).localeCompare(String(a.dateIso)));
      const commentSize = 15;
      const pageCount = Math.max(1,Math.ceil(visible.length/commentSize));
      const current = Math.max(1,Math.min(pageCount,Math.floor(Number(q.get("reacties")) || 1)));
      const commentUrl = page => npsLink({...base,termijn:viewYear ? "jaar" : "maand",reacties:page});
      const commentList = visible.length
        ? `<ul class="score-comments">${visible.slice((current-1)*commentSize,current*commentSize).map(comment => `<li>
          <span class="score-muted">${escape([dateLabel(comment.dateIso || comment.date),comment.score,comment.type,entity ? null : comment.sellerName].filter(x => x !== null && x !== undefined && x !== "").join(" · "))}</span>
          <p>${escape(comment.comment)}</p></li>`).join("")}</ul>` : '<p class="score-empty">Geen commentaren in deze periode.</p>';
      const paging = pageCount > 1 ? `<div class="score-pager">
        ${current > 1 ? `<a class="score-button" href="${escape(commentUrl(current-1))}">Vorige</a>` : ""}
        <span class="score-muted">Pagina ${current} van ${pageCount}</span>
        ${current < pageCount ? `<a class="score-button" href="${escape(commentUrl(current+1))}">Volgende</a>` : ""}</div>` : "";
      const result = surveyResult(source,period,survey);
      if (viewYear) result.target=data.annual(source,"nps",period).target;
      const {value,status} = scoreFields(result,data.byId.nps);
      return back(source.name,npsLink({...base,onderdeel:null})) + heading("NPS",subtitle)
        + `<div class="score-filters">${selector}${segment("NPS-periode",[
            ["maand","Maand",npsLink({...base,termijn:"maand"})],["jaar","Jaar t.e.m. gekozen maand",npsLink({...base,termijn:"jaar"})]
          ],viewYear ? "jaar" : "maand")}</div>`
        + facts([["NPS",value,status],
            ["Target",data.format(result.target,data.byId.nps)],["Enquêtes",survey?.cards ?? 0],
            ["Promotoren",survey?.promoters ?? 0],["Neutralen",survey?.passives ?? 0],["Detractoren",survey?.detractors ?? 0]])
        + section("Maandevolutie",trendChart([...surveyPeriods].sort().reverse().map(month=>({
          period:month,metric:surveyResult(source,month,profile?.month?.[month])
        })),data.byId.nps,period)+trendChart([...surveyPeriods].sort().reverse().map(month=>({
          period:month,metric:{value:profile?.month?.[month]?.cards??null}
        })),{type:"stuks"},period,"Enquêtes"))
        + section("Klantcommentaren · " + visible.length,commentList + paging)
        + section("Maandhistoriek",list([...surveyPeriods].sort().reverse().map(month => ({
            label:data.monthLabel(month),...scoreFields(surveyResult(source,month,profile?.month?.[month]),data.byId.nps),
            meta:`${profile?.month?.[month]?.cards ?? 0} enquêtes`,href:npsLink({...base,periode:month})
          })),"NPS-maandhistoriek"));
    }
    if (activeMetric) {
      const [key,label,warning,target] = activeMetric;
      const renderAnswer = stats => {
        const {value,status} = experienceResult(stats,warning,target);
        return facts([["Score",value,status],["Target",data.format(target,ratioDef)],["Antwoorden",stats?.responses ?? 0]]);
      };
      return back(source.name,npsLink({...base,onderdeel:null})) + heading(label,source.name)
        + section(data.monthLabel(avvPeriod),renderAnswer(experience?.month?.[key]))
        + section("Jaar t.e.m. " + data.monthLabel(avvPeriod),renderAnswer(experience?.ytd?.[key]));
    }

    const switches = segment("Klantbeleving voor",[
      ["winkel","Winkel",npsLink({periode:period})],["verkopers","Verkopers",npsLink({weergave:"verkopers",periode:period})]
    ],mode);
    if (mode === "verkopers" && !entity) {
      return heading("NPS",data.monthLabel(period)) + `<div class="score-filters">${switches}</div>`
        + sellerLists("NPS per verkoper",person => {
          const survey = data.npsProfile(person)?.month?.[period];
          return {label:person.name,...scoreFields(surveyResult(person,period,survey),data.byId.nps),meta:"NPS",
            href:npsLink({...base,verkoper:person.id})};
        },person => data.npsProfile(person)?.month?.[period]?.cards > 0 ||
          (period === avvPeriod && Object.values(data.avvProfile(person)?.month || {}).some(metric => metric.responses > 0)));
    }
    return (entity ? back("Alle verkopers",npsLink({weergave:"verkopers",periode:period})) : "") + heading(entity ? entity.name : "NPS",entity ? data.monthLabel(period) : subtitle)
      + (entity ? "" : `<div class="score-filters">${switches}</div>`)
      + list([{label:"NPS en klantcommentaren",meta:`${mtd?.cards ?? 0} enquêtes`,...scoreFields(surveyResult(source,period,mtd),data.byId.nps),
            href:npsLink({...base,onderdeel:"nps"})}],"NPS")
      + section("Klantbeleving · " + data.monthLabel(avvPeriod),list(metrics.map(([key,label,warning,target]) => ({
          label,...experienceResult(experience?.month?.[key],warning,target),href:npsLink({...base,onderdeel:key})
        })),"Klantbeleving"));
  }

  const views = {home:() => home,analyse:analysisPage,resultaten:resultPage,rankings:rankingPage,nps:npsPage};
  function render(focus = false) {
    const [requested,query] = location.hash.slice(1).split("?",2);
    const page = routes.includes(requested) ? requested : "home";
    for (const link of nav.querySelectorAll("a")) {
      if (link.getAttribute("href") === "#" + page) link.setAttribute("aria-current","page");
      else link.removeAttribute("aria-current");
    }
    root.innerHTML = views[page](new URLSearchParams(query));
    if (page === "home" && review.importStatus.omzetTot) {
      root.querySelector("[data-report-date]").textContent="Omzetgegevens t.e.m. "+dateLabel(review.importStatus.omzetTot);
    }
    if (page !== "home") root.querySelector("h1").tabIndex = -1;
    document.title = page === "home" ? "The Diestroyers | Prestatieplatform" : root.querySelector("h1").textContent + " | The Diestroyers";
    if (focus) {
      window.scrollTo(0,0);
      root.querySelector("h1").focus({preventScroll:true});
    }
  }

  root.addEventListener("change",event => {
    if (event.target.matches("select[data-score-select]")) location.hash = event.target.value;
  });
  window.addEventListener("hashchange",() => render(true));
  window.addEventListener("DOMContentLoaded",() => {
    const shop = document.querySelector(".score-brand span");
    shop.textContent = `${data.store.name} · ${data.store.id}`;
    render();
  },{once:true});
})();
