/* Mobiele router en weergaven voor het Diestroyers-prestatieplatform. */
(() => {
  "use strict";
  const data = window.ScorebladData;
  const review = window.ScorebladReview;
  const customer = window.ScorebladKlantbeleving;
  const root = document.getElementById("score-main");
  const home = root.innerHTML;
  const nav = document.querySelector(".score-nav");
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  const routes = ["home","analyse","resultaten","rankings","nps"];
  const metrics = [
    ["trust","Akte van Vertrouwen",70,80,"Op welk moment kun je de Akte van Vertrouwen uitleggen in woorden die de klant zelf zou gebruiken?"],
    ["price","Laagste Prijs Garantie",70,80,"Hoe leg je de Laagste Prijs Garantie kort uit en hoe check je of de klant weet wanneer die geldt?"],
    ["information","Inlichtingen",90,95,"Welke vraag blijft vaak open na het advies? Hoe check je vóór het afscheid of de uitleg duidelijk was?"],
    ["wait","Wachttijd",90,95,"Wat kun je klanten die wachten meteen meegeven, en wanneer kom je met een update?"],
    ["friendly","Vriendelijkheid",90,95,"Op welk moment in het gesprek kun je duidelijker laten merken dat je de behoefte van de klant begrijpt?"]
  ];
  const integer = new Intl.NumberFormat("nl-BE");
  const preciseNumber = new Intl.NumberFormat("nl-BE",{maximumFractionDigits:1});
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
    return {value:result.value===null ? data.resultState(result,def) : data.format(result.value,def),
      empty:result.value === null,status:statuses[data.points(result)]};
  }
  function colorGuide() {
    return `<ul class="score-color-guide" aria-label="Betekenis van de resultaatkleuren">${[3,1,0].map(points =>
      `<li>${resultStatus(statuses[points].label,statuses[points],false)}</li>`).join("")}</ul>`;
  }
  function row({label, meta, value, href, rank, own, empty, status, visual}) {
    const body = `<span class="score-name">${rank !== undefined ? `<span class="score-rank">${rank ?? "—"}</span>` : ""}
      <span>${escape(label)}${meta ? `<small class="score-meta">${escape(meta)}</small>` : ""}</span></span>
      ${value === undefined ? "" : `<span class="score-value${empty ? " empty" : ""}">${resultStatus(value,status)}</span>`}
      ${visual ? `<span class="score-row-viz">${visual}</span>` : ""}`;
    const cls = "score-row" + (own ? " own" : "") + (value === undefined ? " name-only" : "") + (visual ? " with-visual" : "");
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
    return result.target === null ? "Ontbrekend target" : "Target " + data.format(result.target,def);
  }
  function volumeLabel(result,def) {
    if (def.id==="nps") return result.count===null?"Enquêtes ontbreken":`${countValue(result.count)} enquêtes`;
    if (def.type!=="ratio") return null;
    return `${result.count==null?"Stuks ontbreken":countValue(result.count)+" stuks"} ·
      ${result.chances==null?"Kansen ontbreken":countValue(result.chances)+" kansen"}`.replace(/\s+/g," ");
  }
  function coverageLabel(result) {
    return result.total===undefined ? null :
      `${result.coverage}/${result.total} mnd resultaat · ${result.targetCoverage}/${result.targetTotal} mnd target`;
  }
  function progressBar(value,max,style,caption,marker=false) {
    const width=Math.max(0,Math.min(100,value/max*100));
    return `<span class="score-progress"><span class="score-progress-track ${style}${marker?" has-target":""}" aria-hidden="true">
      <span style="--progress:${width}%"></span></span>${caption?`<small>${escape(caption)}</small>`:""}</span>`;
  }
  function targetProgress(result) {
    if (!Number.isFinite(result.value) || !(result.target>0)) return "";
    const achieved=result.value/result.target*100;
    const text=preciseNumber.format(achieved)+"% van target";
    return progressBar(achieved,120,statuses[data.points(result)]?.tone||"",text,true);
  }
  function metricFacts(result, def, periodText = "Resultaat") {
    const score = data.points(result);
    const count = result.count === null || result.count === undefined ? null : integer.format(result.count);
    const state = data.resultState(result,def);
    const items = [[periodText,result.value===null?state:data.format(result.value,def),statuses[score]],
      ["Target",result.target === null ? "Ontbrekend target" : data.format(result.target,def)]];
    if (def.type === "ratio" || def.id === "s" || def.id === "nps") items.push([def.id === "nps" ? "Enquêtes" : "Stuks",count??"Ontbreekt"]);
    if (def.type === "ratio") items.push(["Kansen",result.chances==null?"Ontbreekt":countValue(result.chances)]);
    if (state!=="Gemeten" && result.value!==null) items.push(["Gegevensstatus",state]);
    if (result.euro !== null && result.euro !== undefined) items.push(["Bedrag",data.format(result.euro,{type:"bedrag"})]);
    if (result.prior !== null && result.prior !== undefined) items.push(["Vorig jaar",data.format(result.prior,def)]);
    if (result.total !== undefined) items.push(["Maanden met resultaat",result.coverage + " / " + result.total]);
    if (result.targetTotal !== undefined) {
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
      const label = axisNumber.format(def.type==="stuks" && top-bottom>=6 ? Math.round(value) : value);
      return `<line x1="${box.left}" x2="${box.right}" y1="${y(value)}" y2="${y(value)}"/>
        <text x="${box.left-8}" y="${y(value)+5}" text-anchor="end">${escape(["bedrag","accessoires"].includes(def.type) ? "€ "+label : ["ratio","percentage"].includes(def.type) ? label+"%" : label)}</text>`;
    }).join("");
    const indices = [...new Set([0,Math.round((months.length-1)/3),Math.round((months.length-1)*2/3),months.length-1])];
    const labels = indices.map(index => `<text x="${x(index)}" y="176" text-anchor="middle">${escape(axisMonth.format(new Date(months[index].period+"-01T00:00:00Z")))}</text>`).join("");
    const dots = months.map((item,index) => {
      const value = item.metric?.value;
      if (!hasValue(value)) return "";
      return `<circle data-trend-dot="${item.period}" class="${item.period === period ? "selected" : ""}" cx="${x(index)}" cy="${y(value)}" r="${item.period === period ? 5.5 : 3.4}">
        <title>${escape(data.monthLabel(item.period)+" · "+data.format(value,def))}</title></circle>`;
    }).join("");
    const targetDots=months.map((item,index)=>{
      const value=item.metric?.target;
      if (!hasValue(value) || hasValue(months[index-1]?.metric?.target) || hasValue(months[index+1]?.metric?.target)) return "";
      return `<circle class="score-trend-target-dot" cx="${x(index)}" cy="${y(value)}" r="3.2"/>`;
    }).join("");
    const initial=x(Math.max(0,months.findIndex(item=>item.period===period)));
    const hitWidth=Math.min(16,months.length===1?16:77/(months.length-1));
    return `<figure class="score-trend"><div class="score-trend-plot">
      <svg viewBox="0 0 440 190" role="img" aria-label="${escape(legend+" per maand t.e.m. "+data.monthLabel(period))}">
        <g class="score-trend-grid">${ticks}${labels}</g>
        <line class="score-trend-selection" data-trend-rail x1="${initial}" x2="${initial}" y1="${box.top}" y2="${box.bottom}"/>
        ${targetLine ? `<path class="score-trend-target" d="${line("target")}"/>` : ""}
        ${targetDots}
        <path class="score-trend-value" d="${line("value")}"/>
        <g class="score-trend-dots">${dots}</g>
      </svg>
      <div class="score-trend-months" role="group" aria-label="${escape(legend+" per maand")}">${months.map((item,index)=>
        `<button type="button" data-chart-month="${item.period}" data-chart-x="${x(index)}" aria-pressed="${item.period===period}"${item.period!==period?' tabindex="-1"':""}
          aria-label="${escape(data.monthLabel(item.period)+": "+data.format(item.metric?.value,def))}"
          style="--month-x:${x(index)/440*100}%;--month-width:${hitWidth}%"></button>`).join("")}</div>
      </div>
      <figcaption><span class="score-trend-key">${escape(legend)}</span>${targetLine ? '<span class="score-trend-key target">Target</span>' : ""}
        <span>T.e.m. ${escape(data.monthLabel(period))}</span></figcaption>
    </figure>`;
  }
  function trendSection(history,def,period,secondary=def.type==="ratio"?["chances","Kansen"]:null) {
    const months=history.filter(item=>item.period<=period).slice(0,12);
    if (!months.length) return section("Maandevolutie",'<p class="score-empty">Geen gegevens voor deze maandgrafiek.</p>');
    const volume=secondary ? history.map(item=>({...item,metric:{value:item.metric?.[secondary[0]]??null}})) : [];
    const readings=months.map(({period:month,metric})=>{
      const fields=[["Resultaat",data.format(metric?.value,def)],["Target",data.format(metric?.target,def)]];
      if (def.type==="ratio" || def.id==="s") fields.push(["Stuks",countValue(metric?.count)]);
      if (secondary) fields.push([secondary[1],countValue(metric?.[secondary[0]])]);
      return `<div data-chart-reading="${month}"${month!==period?" hidden":""}><strong>${escape(data.monthLabel(month))}</strong>${facts(fields)}</div>`;
    }).join("");
    return section("Maandevolutie",`<div class="score-chart" data-chart>
      <div class="score-chart-readout" aria-live="polite">${readings}</div>
      ${months.some(item=>Number.isFinite(item.metric?.value))?'<p class="score-muted score-chart-hint">Kies een maand in de grafiek.</p>':""}
      ${trendChart(history,def,period)}
      ${volume.some(item=>item.metric.value!==null)?trendChart(volume,{type:"stuks"},period,secondary[1]):""}</div>`);
  }
  function countValue(value) {
    return Number.isFinite(value)?integer.format(value):"—";
  }
  function impactFields(entry) {
    const {result,share,reference,upside,storeGain}=entry;
    const volume=result.chances===null ? "—" : countValue(result.chances);
    const portion=share===null?"":` · ${preciseNumber.format(share)}% van de winkel`;
    const impact=storeGain===null?"—":review.deltaLabel(storeGain,ratioDef,true);
    return `<span class="score-impact-fields"><span><small>Kansen</small><strong>${escape(volume)}</strong>
       <small>${escape((result.count===null?"—":countValue(result.count)+" stuks")+portion)}</small></span>
       <span><small>Mogelijke winkelimpact</small><strong>${escape(impact)}</strong>
       ${upside===null?"":`<small>${escape(review.deltaLabel(upside,{type:"stuks"},true))}${reference===null?"":" · ref. "+escape(data.format(reference,ratioDef))}</small>`}</span></span>`;
  }
  function targetGap(row) {
    if (row.missing===null) return row.result.value===null ? "Geen resultaat" : "Geen target";
    if (!row.missing) return "Target behaald";
    return review.deltaLabel(row.missing,review.gapDef(row.result,row.def))+" tot target";
  }
  function personalReference(row,term) {
    if (row?.reference==null || row.improvement==null) return null;
    const label=term==="jaar" && row.def.type!=="ratio" ? "Eigen YTD vorig jaar" : "Eigen referentie";
    return `${label} ${data.format(row.reference,row.def)} · ${review.deltaLabel(-row.improvement,row.def,true)} verschil`;
  }
  function opportunitySection(ctx,def,result) {
    if (def.type!=="ratio") return "";
    const change=review.opportunityChange(ctx,def,result);
    return section("Volume en resultaat per kans",change?facts([
      ["Kansen",`${countValue(change.prior.chances)} → ${countValue(result.chances)}`],
      ["Verschil in stuks",review.deltaLabel(change.total,{type:"stuks"},true)],
      ["Door aantal kansen",review.deltaLabel(change.volume,{type:"stuks"},true)],
      ["Door stuks per kans",review.deltaLabel(change.rate,{type:"stuks"},true)]
    ])+`<p class="score-muted">Eerst rekenen we met de vroegere verhouding en het nieuwe aantal kansen. Daarna rekenen we het verschil in stuks per kans uit bij dat nieuwe aantal. Dit is een rekenkundige uitsplitsing.${Math.min(result.chances,change.prior.chances)<review.minimumChances?" Kleine steekproef in minstens één periode.":""}</p>`
      : '<p class="score-empty">Deze uitsplitsing vraagt stuks en kansen in beide vergelijkbare periodes.</p>');
  }
  function paceSection(def,period,result) {
    const pace=review.monthlyPace(def,period,result);
    if (!pace) return "";
    const guide=def.id==="life" ? Math.ceil(pace.guide) : pace.guide;
    return section("Tempo deze maand",facts([
      ["Stand",data.format(result.value,def)],["Richtpunt",data.format(guide,def)],
      ["Resterende verkoopdagen",countValue(pace.remaining)],
      ["Nog nodig per verkoopdag",pace.perDay===null ? null : data.format(def.id==="life"?Math.ceil(pace.perDay):pace.perDay,def)]
    ])+`<p class="score-muted">${countValue(pace.elapsed)} van ${countValue(pace.total)} verkoopdagen verwerkt t.e.m. ${escape(dateLabel(pace.date))}.
      Het richtpunt verdeelt het maandtarget gelijk over de verkoopdagen.${def.id==="life"?" Stuks per dag zijn naar boven afgerond.":""}</p>`);
  }
  function analysisPage(q) {
    const ctx=review.fromParams(q);
    const {person,entity,def,period,term,comparison,candidates}=ctx;
    const base={verkoper:person?.id,kpi:def?.id,periode:period,termijn:term,vergelijk:comparison,
      sortering:ctx.sort==="kansen"?ctx.sort:null,toon:ctx.show==="alle"?ctx.show:null};
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
      const ownReference=person ? personalReference(review.personal(ctx).rows.find(row=>row.def.id===def.id),term) : null;
      const people=person ? [] : review.sellerImpact(ctx,def);
      const notable=people.filter(row=>row.person.active && row.upside>0 && row.storeGain!==null).sort((a,b)=>b.storeGain-a.storeGain);
      const nilVolume=def.type==="ratio" && people.some(row=>row.result.chances>0 && row.result.chances<review.minimumChances);
      const breakdown=people.map(entry=>{
        const {person:member,result,missing}=entry;
        const meta=[targetLabel(result,def)];
        if (missing>0) meta.push(targetGap({missing,def,result}));
        return {label:member.name,meta:meta.join(" · "),...scoreFields(result,def),
          visual:def.type==="ratio"?impactFields(entry):null,href:analysisLink({...base,verkoper:member.id})};
      });
      const components=data.components(entity,def.id,period);
      return head+metricFacts(result,def,term==="jaar"?"Jaarresultaat":"Maandresultaat") +
        (missing>0?`<p class="score-analysis-note">${escape(targetGap({missing,def,result}))}
          ${def.type==="ratio" && review.gapDef(result,def).type==="stuks"?"bij het huidige aantal kansen.":""}</p>`:"")+
        (change?section("Vergelijking",facts([["Vergeleken met",change.label],["Referentiewaarde",data.format(change.prior,def)],
          ["Verschil",review.deltaLabel(change.value,def,true)]])):"") +
        (ownReference?section("Eigen eerdere resultaten",`<p>${escape(ownReference)}</p>`):"")+
        opportunitySection(ctx,def,result)+
        (people.length?section(def.type==="ratio"?"Kansen en mogelijke winkelimpact":"Verkopersresultaten",
          (notable.length?`<p class="score-analysis-note">Grootste berekende ruimte bij ${escape(notable[0].person.name)} · ${escape(review.deltaLabel(notable[0].storeGain,ratioDef,true))} voor Diest.</p>`:"") +
          (def.type==="ratio"?`<div class="score-local-switch">${segment("Sorteer verkopers op",[
            ["impact","Winkelimpact",analysisLink({...base,sortering:null})],
            ["kansen","Kansen",analysisLink({...base,sortering:"kansen"})]
          ],ctx.sort)}</div>`:"")+
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
    const selected=review.analysisKpis(ctx,rows);
    const movers=rows.filter(row=>row.comparison?.value);
    const normalized=row=>row.comparison.value/(row.result.target>0 ? row.result.target : Math.max(1,Math.abs(row.comparison.prior)));
    const deltas=movers.sort((a,b)=>normalized(b)-normalized(a));
    const listTo=(values,label,meta)=>list(values.map(row=>({
      label:row.def.label,meta:meta(row),...scoreFields(row.result,row.def),href:rowLink(row)
    })),label);
    const targetList=selected.length ? list(selected.map(row=>({
      label:row.def.label,meta:[targetLabel(row.result,row.def),row.missing>0?targetGap(row):null].filter(Boolean).join(" · "),
      ...scoreFields(row.result,row.def),visual:targetProgress(row.result),href:rowLink(row)
    })),"KPI’s en targets") : '<p class="score-empty">Geen gemeten KPI’s onder target in deze periode.</p>';
    const maxDelta=Math.max(0,...deltas.map(row=>Math.abs(normalized(row))));
    const changes=[["Stijgers",deltas.filter(row=>row.comparison.value>0).slice(0,3)],
      ["Dalers",deltas.filter(row=>row.comparison.value<0).reverse().slice(0,3)]].filter(([,items])=>items.length);
    const movementList=(label,values)=>list(values.map(row=>({
      label:row.def.label,meta:[row.comparison.label,row.comparison.date?dateLabel(row.comparison.date):null].filter(Boolean).join(" · "),
      value:review.deltaLabel(row.comparison.value,row.def,true),href:rowLink(row),
      visual:`<span aria-hidden="true" class="score-delta-track ${row.comparison.value<0?"negative":"positive"}">
        <span style="--delta:${Math.abs(normalized(row))/maxDelta*50}%"></span></span>`
    })),label);
    const personal=person?review.personal(ctx):null;
    const focus=personal?section("Sterktes",personal.strengths.length?listTo(personal.strengths,"Sterktes",
      row=>`${row.hits} van ${row.months} meetbare afgesloten maanden op target`+
        (row.months<row.periods?` · ${row.months}/${row.periods} afgesloten maanden meetbaar`:"")+
        (row.def.type==="ratio"?` · ${integer.format(row.totalChances)} kansen`:"")):'<p class="score-empty">Nog geen terugkerende sterkte zichtbaar.</p>')+
      section("Persoonlijke focus",personal.focus.length?listTo(personal.focus,"Persoonlijke focus",row=>
        [targetGap(row),row.def.type==="ratio"?`${row.result.chances} kansen`:null,personalReference(row,term)].filter(Boolean).join(" · ")):'<p class="score-empty">Geen duidelijke focus op basis van resultaten en meetvolume.</p>')+
      `<p class="score-muted">Focus gebruikt beschikbare targets en eerdere resultaten. Voor ratio’s en NPS gebruiken we minstens ${review.minimumChances} kansen of enquêtes.</p>`:"";
    const targetFilters=segment("KPI’s tonen",[
      ["aandacht","Aandacht nodig",analysisLink({...base,toon:null})],
      ["alle","Alle KPI’s",analysisLink({...base,toon:"alle"})]
    ],ctx.show);
    return head+focus+section("Afstand tot target",`<div class="score-local-switch">${targetFilters}</div>`+targetList)+
      (changes.length?section("Verandering tegenover de referentie",`<div class="score-compare${changes.length===1?" single":""}">${changes.map(([label,items])=>
        `<div>${changes.length>1?`<h3>${label}</h3>`:""}${movementList(label,items)}</div>`).join("")}</div>`):"")+
      (notes?`<p class="score-muted">${escape(notes)}</p>`:"")+
      exportView("analyse",base);
  }
  function sellerKpiResults(def, period, annual) {
    const read = annual ? data.annual : data.month;
    const store = read(data.store,def.id,period);
    const people = data.sellers.map(person => ({person,result:read(person,def.id,period)}))
      .filter(({person,result}) => person.active || result.value !== null)
      .sort((a,b) => (b.result.value ?? -Infinity)-(a.result.value ?? -Infinity) || a.person.name.localeCompare(b.person.name,"nl-BE"));
    return list(people.map(({person,result}) => {
      const meta = person.active ? [targetLabel(result,def)] : ["Historische verkoper",targetLabel(result,def)];
      if (volumeLabel(result,def)) meta.push(volumeLabel(result,def));
      if (result.count !== null) {
        if (def.id === "s") meta.push(`${integer.format(result.count)} stuks`);
      }
      if (["bedrag","accessoires","stuks"].includes(def.type) && result.value >= 0 && result.value !== null && store.value > 0) {
        meta.push(data.format(result.value/store.value*100,ratioDef)+" van winkelresultaat");
      }
      if (annual) meta.push(coverageLabel(result));
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
        + (!entity && !annualSeller ? paceSection(def,period,result) : "")
        + (subdivisions.length ? section("Uitsplitsing",list(subdivisions.map(detail => ({
            label:detail.label, ...scoreFields(detail,ratioDef), meta:targetLabel(detail,ratioDef), href:resultLink({...base,detail:detail.id})
          })),"Uitsplitsing")) : "")
        + (def.id === "nps" ? section("Klantbeleving",list([{label:"NPS en commentaren",href:url("nps",{verkoper:entity?.id,periode:period,termijn:base.termijn,onderdeel:"nps"})}],"Klantbeleving")) : "")
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
      const pace=!annual && entity===data.store ? review.monthlyPace(def,period,result) : null;
      const paceLabel=pace ? "Richtpunt "+data.format(def.id==="life"?Math.ceil(pace.guide):pace.guide,def) : null;
      return {label:def.label,meta:[targetLabel(result,def),volumeLabel(result,def),coverageLabel(result),paceLabel].filter(Boolean).join(" · "),
        ...scoreFields(result,def),visual:targetProgress(result),href:resultLink({...base,kpi:def.id})};
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
    const provisional = item => item.rank!==null && (
      (group && item.available<item.total) || (term==="jaar" && item.breakdown.some(({result})=>
        result.coverage<result.total || (group && result.targetCoverage<result.targetTotal))));
    const resultMeta = (result,def) => [targetLabel(result,def),volumeLabel(result,def),coverageLabel(result)].filter(Boolean).join(" · ");
    const own = regional && picks.find(item=>item.entity.id===data.store.id);
    const peers = own ? picks.filter(item=>item!==own && item.value!==null && (!group || !provisional(item))) : [];
    const regionalMiddle = peers.length ? (peers[Math.floor((peers.length-1)/2)].value+peers[Math.floor(peers.length/2)].value)/2 : null;
    const nextHigher=own && own.value!==null ? picks.findLast(item=>item.value!==null && item.value>own.value) : null;
    const difference=value=>group ? new Intl.NumberFormat("nl-BE",{signDisplay:"exceptZero",maximumFractionDigits:1}).format(value)+" pt"
      : review.deltaLabel(value,data.byId[key],true);
    const peersSection = own && own.value!==null ? section("Diest in de regio",facts([
      ["Score Diest",format(own.value)],
      ["Volgende hogere score",nextHigher?nextHigher.entity.name+" · "+difference(nextHigher.value-own.value):"Geen hogere score"],
      ["Mediaan andere winkels",regionalMiddle===null?"Onvoldoende data":format(regionalMiddle)],
      ["Diest tegenover mediaan",regionalMiddle===null?null:difference(own.value-regionalMiddle)]
    ])+`<p class="score-muted">${peers.length} andere winkels in de mediaan.${group?" Voor de mediaan tellen winkels met alle KPI’s meetbaar.":""}</p>`) : "";
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
        + facts([["Positie",chosen.rank===null?"Geen data":chosen.rank+(provisional(chosen)?" · voorlopig":"")],["Score",format(chosen.value),group ? null : statuses[chosen.breakdown[0].points]],...(group ? [["KPI’s met score",chosen.available + " / " + chosen.total]] : [])])
        + section(group ? "Score per KPI" : "Resultaat",list(chosen.breakdown.map(item => {
          const def = data.byId[item.key];
          return {label:def.label,...scoreFields(item.result,def),meta:resultMeta(item.result,def) + (group ? " · " + (item.points === null ? "Geen puntenberekening" : item.points + " pt") : ""),
            href:rankLink({...base,entiteit:entity.id,kpi:item.key})};
        }),"Resultaat per KPI"))
        + (regional ? section("Winkelresultaten",list(data.kpis.map(def => {
          const result = data.month(entity,def.id,period);
          return {label:def.label,...scoreFields(result,def),meta:resultMeta(result,def),
            href:rankLink({...base,entiteit:entity.id,kpi:def.id})};
        }),"Winkelresultaten")) : "");
    }
    const filters = segment("Regio of team",[
      ["team","Team Diest",rankLink({...base,scope:"team"})],["regio","Regio",rankLink({...base,scope:"regio",termijn:"maand"})]
    ],scope) + (regional ? "" : segment("Rankingperiode",[
      ["maand","Actieve maand",rankLink({...base,termijn:"maand"})],["jaar","Jaar t.e.m. actieve maand",rankLink({...base,termijn:"jaar"})]
    ],term)) + picker("Rangschikking",metricKeys.map(([id,label]) => [id,label,rankLink({...base,rang:id})]),key);
    let preceding=null, last=null;
    const rankedRows=picks.map(item=>{
      if (item.value!==null && item.value!==last) {
        preceding=last;
        last=item.value;
      }
      const tied=item.rank!==null && picks.some(other=>other!==item && other.rank===item.rank);
      const gap=item.value!==null && preceding!==null ? preceding-item.value : null;
      const distance=gap===null?null:group?format(gap):review.deltaLabel(gap,data.byId[key]);
      const reading=item.breakdown[0].result;
      const sample=group?null:data.byId[key].type==="ratio"?reading.chances:key==="nps"?reading.count:null;
      const meta=[group?`${item.available} van ${item.total} KPI’s meetbaar`:null,
        provisional(item)?"Voorlopige plaats":null,
        !group?volumeLabel(reading,data.byId[key]):null,
        !group?coverageLabel(reading):null,
        sample>0 && sample<review.minimumChances?"Kleine steekproef":null,
        tied?`Gedeelde ${item.rank}e plaats`:null,distance?`${distance} tot de volgende hogere score`:null].filter(Boolean).join(" · ");
      const max=item.total*window.Diestroyers.config.points.green;
      return {label:item.entity.name,value:format(item.value),empty:item.value===null,rank:item.rank,meta,
        status:group?null:statuses[item.breakdown[0].points],own:regional && item.entity.id===data.store.id,
        href:rankLink({...base,entiteit:item.entity.id}),
        visual:group && item.value!==null && max>0 ? progressBar(item.value,max,"rank",`van ${max} punten`) : null};
    });
    return heading("Rankings",subtitle) + `<div class="score-filters">${filters}</div>`
      + peersSection
      + list(rankedRows,"Ranglijst")
      + (group ? '<p class="score-muted score-section">Punten per KPI met resultaat en target: 3 bij target, 1 vanaf 90%, anders 0. Bij onvolledige dekking is de plaats voorlopig.</p>' : "");
  }

  function npsLink(values) { return url("nps",values); }
  function surveyResult(entity, period, survey, term = "maand") {
    const target = (term === "jaar" ? data.annual : data.month)(entity,"nps",period).target;
    return {value:survey?.cards > 0 ? survey.nps ?? null : null,target,count:survey?.cards??null};
  }
  const surveyTypes=[
    {key:"promoters",label:"Promotoren",type:"Promotor",tone:"good"},
    {key:"passives",label:"Neutralen",type:"Neutraal",tone:"close"},
    {key:"detractors",label:"Detractoren",type:"Detractor",tone:"bad"}
  ];
  function surveyComment(comment,showSeller) {
    const category=surveyTypes.find(item=>item.type===comment.type);
    const name=category?.type || "Type onbekend";
    const score=comment.score;
    const meta=[dateLabel(comment.dateIso || comment.date),showSeller?comment.sellerName:null].filter(Boolean).join(" · ");
    return `<li><div class="score-comment-head">
      <span class="score-result score-comment-badge${category?" "+category.tone:""}">${escape(name)}
        ${Number.isFinite(score)?`<strong>${escape(score)}/10</strong>`:""}</span>
      ${meta?`<span class="score-muted score-comment-meta">${escape(meta)}</span>`:""}</div>
      <p>${escape(comment.comment)}</p></li>`;
  }
  function surveyDistribution(survey,selected,link) {
    const categories=surveyTypes.map(group=>({...group,count:survey?.[group.key]??0}));
    const count=categories.reduce((sum,item)=>sum+item.count,0);
    const volume=item=>survey?.cards>0 ? `${countValue(item.count)} van ${countValue(survey.cards)}` : countValue(item.count);
    const control=item=>`href="${escape(link(item.key))}" aria-label="${escape(item.label+" · "+volume(item))}"
      ${item.key===selected?' aria-current="true"':""}`;
    return `<div class="score-nps-distribution">
      ${count?`<div class="score-nps-bar" role="group" aria-label="Verdeling van de enquêtes">${categories.filter(item=>item.count>0).map(item=>
        `<a class="${item.key}" style="--portion:${item.count}" ${control(item)}></a>`).join("")}</div>`:""}
      <div class="score-nps-legend" role="group" aria-label="Filter klantcommentaren">${categories.map(item=>
        `<a class="${item.key}" ${control(item)}><span>${item.label}</span><strong>${volume(item)}</strong></a>`).join("")}</div></div>`;
  }
  function commentFilters(selected,link) {
    const options=[{key:null,type:"Alle",label:"Alle reacties"},...surveyTypes];
    return `<div class="score-segments score-comment-filters" role="group" aria-label="Filter reacties op type">
      ${options.map(item=>`<a class="${item.tone||""}" href="${escape(link(item.key))}"
        aria-label="${escape(item.label)}"${item.key===selected?' aria-current="true"':""}>${escape(item.type)}</a>`).join("")}</div>`;
  }
  function experienceResult(stats, warning, target) {
    const value = stats?.responses > 0 && Number.isFinite(stats.value) ? stats.value : null;
    const status = value === null ? null : statuses[value >= target ? 3 : value >= warning ? 1 : 0];
    return {value,status,gap:value===null ? null : target-value,count:stats?.responses??0};
  }
  function surveySample(count,unit) {
    return count>0 && count<review.minimumChances ? `${countValue(count)} ${unit} · Kleine steekproef` : `${countValue(count)} ${unit}`;
  }
  function surveyGap(gap,unit) {
    return gap===null ? "" : gap>0 ? `${preciseNumber.format(gap)} ${unit} onder target` : "Target behaald";
  }
  function experienceFields(result) {
    return {value:data.format(result.value,ratioDef),empty:result.value===null,status:result.status};
  }
  function experienceMeta(result) {
    return [surveyGap(result.gap,"pp"),surveySample(result.count,"antwoorden")].filter(Boolean).join(" · ");
  }
  function experienceUnavailable(latest,base) {
    return latest
      ? `<p class="score-empty">Klantbeleving is beschikbaar voor de laatst gepubliceerde maand.
          <a href="${escape(npsLink({...base,periode:latest}))}">Bekijk ${escape(data.monthLabel(latest))}</a></p>`
      : '<p class="score-empty">Er zijn nog geen cijfers voor klantbeleving gepubliceerd.</p>';
  }
  function customerReading(reading,key) {
    if (!reading) return "Cijfers ontbreken";
    const isNps = key==="nps";
    return data.format(reading.value,isNps?data.byId.nps:ratioDef)+" · "+surveySample(reading.count,isNps?"enquêtes":"antwoorden");
  }
  function customerChange(current,previous,key) {
    const value = current.value-previous.value;
    const unit = key==="nps" ? "pt" : "pp";
    return (value>0 ? "+" : "")+preciseNumber.format(value)+" "+unit;
  }
  function closedComparison(source,key,period,viewYear) {
    if (viewYear) return "";
    const previous = customer.previousClosed(period);
    if (!previous) return "";
    const current = customer.snapshot(source,key,period);
    const before = customer.snapshot(source,key,previous);
    return section("Vorige afgesloten maand",`<p class="score-nps-note">${escape(data.monthLabel(previous))} ·
      ${escape(before ? customerReading(before,key) : "Geen cijfers beschikbaar")}</p>
      ${current && before ? `<p class="score-muted">Verschil: ${escape(customerChange(current,before,key))}.
        ${period>=review.activeMonth()?"De gekozen maand loopt nog. ":""}${Math.min(current.count,before.count)<review.minimumChances?"Kleine steekproef in minstens één periode.":""}</p>` : ""}`);
  }
  function themeOptions(comments) {
    return customer.themes.map(theme=>({...theme,comments:comments.filter(comment=>customer.matches(comment,theme))}))
      .sort((a,b)=>b.comments.length-a.comments.length);
  }
  function themeGroups(groups,link,showSeller) {
    const rows = groups.filter(group=>group.comments.length).map(group=>({
      label:group.label,value:countValue(group.comments.length),href:link(null,group.key),
      examples:["Promotor","Neutraal","Detractor"].map(type=>group.comments.find(comment=>comment.type===type)).filter(Boolean),
      visual:`<span class="score-theme-types">${surveyTypes.map(type=>{
        const count = group.comments.filter(comment=>comment.type===type.type).length;
        return count ? `<a class="score-result ${type.tone}" href="${escape(link(type.key,group.key))}">${countValue(count)} ${escape(type.label.toLowerCase())}</a>` : "";
      }).join("")}</span>`
    }));
    return section("Thema’s in klantfeedback",rows.length
      ? `<p class="score-muted score-nps-note">Automatisch op trefwoorden. Eén reactie kan bij meerdere thema’s staan.</p>
        <ul class="score-theme-list">${rows.map(item=>`<li><a class="score-theme-title" href="${escape(item.href)}">
          <strong>${escape(item.label)}</strong><span>${item.value} reacties ›</span></a>${item.visual}
          ${item.examples.length ? `<details><summary>Voorbeelden lezen</summary><ul class="score-comments">
            ${item.examples.map(comment=>surveyComment(comment,showSeller)).join("")}</ul></details>` : ""}</li>`).join("")}</ul>`
      : '<p class="score-empty">Geen reacties bij de huidige thema’s gevonden.</p>');
  }
  function personalCustomerSignals(source,period,bucket,npsTarget,comments,base,feedbackLink) {
    const definitions = [{key:"nps",label:"NPS",target:npsTarget},...metrics.map(([key,label,,target])=>({key,label,target}))];
    const signals = customer.personalSignals(source,definitions,period,bucket);
    return section("Jouw coaching",`<div class="score-coaching-cards">
      ${[[signals.strength,true],[signals.focus,false]].map(([signal,positive])=>{
        const title = positive?"Sterkte om vast te houden":"Aandachtspunt om te oefenen";
        if (!signal) return `<article><h3>${title}</h3><p class="score-muted">Geen passend signaal met minstens ${review.minimumChances} antwoorden.</p></article>`;
        const theme = customer.themes.find(item=>item.key===customer.metricThemes[signal.key]);
        const type = comment=>positive ? comment.type==="Promotor" : ["Neutraal","Detractor"].includes(comment.type);
        const quote = comments.filter(comment=>type(comment) && (theme ? customer.matches(comment,theme) : true))
          .sort((a,b)=>String(b.dateIso).localeCompare(String(a.dateIso)))[0];
        return `<article><h3>${title}</h3><a class="score-coaching-metric" href="${escape(npsLink({...base,onderdeel:signal.key}))}">${escape(signal.label)} ›</a>
          <p>${escape(customerReading(signal.current,signal.key))} · Target ${escape(data.format(signal.target,signal.key==="nps"?data.byId.nps:ratioDef))}</p>
          ${signal.previous.length ? `<p class="score-muted">Eigen eerdere ${bucket==="ytd"?"YTD-stand":"score"} ·
            ${bucket==="ytd"?"t.e.m. ":""}${escape(data.monthLabel(signal.previous[0].month))} ·
            ${escape(customerReading(signal.previous[0].reading,signal.key))}</p>` : '<p class="score-muted">Geen eigen eerdere score met voldoende antwoorden beschikbaar.</p>'}
          ${quote ? `<ul class="score-comments">${surveyComment(quote,false)}</ul>
            <a href="${escape(feedbackLink(null,theme?.key))}">Lees de klantfeedback</a>` : ""}
        </article>`;
      }).join("")}</div>`);
  }
  const agreementMetrics = [["nps","NPS"],...metrics.map(([key,label])=>[key,label])];
  const coachingScope = source => source.type==="Verkoper" ? source.id : "winkel";
  function agreementsPage(source,period,selected,base) {
    const scope = coachingScope(source);
    const records = customer.readAgreements();
    const activeMonth = review.activeMonth();
    const baseline = customer.isMonth(period) && period<=activeMonth ? period : activeMonth;
    const due = customer.shiftMonth(activeMonth,1);
    const key = agreementMetrics.some(([key])=>key===selected) ? selected : "nps";
    const prefill = key==="wait" ? "We spreken wachtende klanten meteen aan en geven een realistische inschatting." : "";
    return back("Overzicht klantbeleving",npsLink({...base,onderdeel:null}))
      + heading("Coachingsafspraken",source.name)
      + '<p class="score-muted score-nps-note">Afspraken worden in deze browser bewaard. Formuleer welk gedrag je wil oefenen en volg het op na afloop van de evaluatiemaand.</p>'
      + (records===null ? '<p class="score-empty">Opslag in deze browser is niet beschikbaar.</p>' : `
        <section class="score-section"><h2>Nieuwe afspraak</h2>
          <form class="score-coaching-form" data-coaching-scope="${escape(scope)}">
            <input type="hidden" name="baseline" value="${escape(baseline)}">
            <div class="score-nps-filters score-filters">
              <label class="score-field">Meting<select name="metric">${agreementMetrics.map(([id,label])=>
                `<option value="${id}"${id===key?" selected":""}>${escape(label)}</option>`).join("")}</select></label>
              <label class="score-field">Evaluatiemaand<input name="due" type="month" required min="${customer.shiftMonth(baseline,1)}" value="${due}"></label>
            </div>
            <p class="score-muted">Nulmeting · ${escape(data.monthLabel(baseline))}${baseline===activeMonth?" (lopende maandstand bij opslaan)":""}</p>
            <label class="score-field">Wat gaan we oefenen?<textarea name="action" rows="3" maxlength="500" required>${escape(prefill)}</textarea></label>
            <p class="score-muted" data-coaching-message role="status"></p>
            <button class="score-button primary">Afspraak bewaren</button>
          </form>
        </section>
        ${[false,true].map(done=>section(done?"Opgevolgd":"Open afspraken",
          records.filter(record=>record.scope===scope && Boolean(record.completed)===done).map(record=>{
            const {metric} = record;
            const label = agreementMetrics.find(([key])=>key===metric)?.[1] || metric;
            const closed = record.due<activeMonth;
            const published = closed ? customer.snapshot(source,metric,record.due) : null;
            const evaluation = done ? record.completed.reading : published;
            const change = evaluation && record.start ? customerChange(evaluation,record.start,metric) : "";
            const delta = change ? ` · verschil ${escape(change)}` : "";
            return `<details class="score-agreement"><summary><strong>${escape(label)}</strong> · ${escape(data.monthLabel(record.due))}
                ${!done && closed?" · te evalueren":""}</summary>
              <form class="score-coaching-form" data-coaching-scope="${escape(scope)}" data-agreement="${escape(record.id)}">
                <label class="score-field">Afspraak<textarea name="action" rows="2" maxlength="500" required${done?" readonly":""}>${escape(record.action)}</textarea></label>
                <dl class="score-coaching-measurements">
                  <div><dt>Nulmeting · ${escape(data.monthLabel(record.baseline))}</dt><dd>${escape(customerReading(record.start,metric))}</dd></div>
                  <div><dt>Evaluatie · ${escape(data.monthLabel(record.due))}</dt><dd>${escape(closed || done ?
                    customerReading(evaluation,metric) : "Beschikbaar zodra de maand is afgesloten")}${done && record.completed.manual?" · handmatig":""}${delta}</dd></div>
                </dl>
                ${!done && closed && !published ? `<fieldset class="score-coaching-manual"><legend>Eventueel invullen uit een eigen bevestigd maandrapport</legend>
                  <label class="score-field">Score<input name="manualScore" type="number" inputmode="decimal" min="${metric==="nps"?-100:0}" max="100" step="0.01"></label>
                  <label class="score-field">Aantal antwoorden<input name="manualCount" type="number" inputmode="numeric" min="1" step="1"></label>
                </fieldset>` : ""}
                <label class="score-field">Wat zagen of hoorden we?<textarea name="note" rows="3" maxlength="800"${done?" readonly":""}>${escape(record.note)}</textarea></label>
                <p class="score-muted" data-coaching-message role="status"></p>
                <div class="score-actions">
                  ${done ? '<button class="score-button" name="submit" value="reopen">Heropen</button>'
                    : '<button class="score-button" name="submit" value="save">Bewaar notities</button>'
                    + (closed?'<button class="score-button primary" name="submit" value="finish">Markeer als opgevolgd</button>':"")}
                </div>
              </form></details>`;
          }).join("") || `<p class="score-empty">${done?"Nog geen opgevolgde afspraken.":"Nog geen open afspraken."}</p>`)).join("")}
      `);
  }
  function npsPage(q) {
    const entity = data.sellers.find(person => person.id === q.get("verkoper"));
    const mode = entity || q.get("weergave") === "verkopers" ? "verkopers" : "winkel";
    const source = entity || data.store;
    const avvPeriod = data.avv.latestPeriod;
    const surveyPeriods = data.nps.periods || Object.keys(data.nps.store?.month || {});
    const latest = [data.nps.latestPeriod,avvPeriod].filter(Boolean).sort().at(-1) || data.latest;
    const periods = [...new Set([...surveyPeriods,avvPeriod,latest].filter(Boolean))];
    const period = periods.includes(q.get("periode")) ? q.get("periode") : latest;
    const activeMetric = metrics.find(([key]) => key === q.get("onderdeel"));
    const chosenMetric = q.get("onderdeel") === "nps" ? "nps" : null;
    const tracking = q.get("onderdeel")==="afspraken";
    const term = q.get("termijn") === "jaar" ? "jaar" : "maand";
    const viewYear = term === "jaar";
    const base = {weergave:mode,verkoper:entity?.id,periode:period,termijn:term,onderdeel:tracking?"afspraken":activeMetric?.[0] || chosenMetric};
    if (tracking) return agreementsPage(source,period,q.get("meting"),base);
    const overview = {...base,onderdeel:null};
    const comparing = mode === "verkopers" && !entity && !base.onderdeel;
    const compareMetric = metrics.find(([key])=>key===q.get("meting"));
    const profile = data.npsProfile(source);
    const experience = data.avvProfile(source);
    const bucket = viewYear ? "ytd" : "month";
    const survey = profile?.[bucket]?.[period];
    const periodText = (viewYear ? "YTD t.e.m. " : "") + data.monthLabel(period);
    const subtitle = source.name + " · " + periodText;
    const hasExperience = Boolean(avvPeriod && period === avvPeriod);
    const hasFeedback = person => data.npsProfile(person)?.[bucket]?.[period]?.cards > 0
      || (hasExperience && Object.values(data.avvProfile(person)?.[bucket] || {}).some(metric=>metric.responses>0));
    const people = data.sellers.filter(person=>person.active || person===entity || hasFeedback(person));
    const scope = (id,state) => npsLink({...state,weergave:id?"verkopers":"winkel",verkoper:id,meting:null});
    const compare = (key) => npsLink({...overview,weergave:"verkopers",verkoper:null,meting:key});
    const filters = (state,showScope = false) => `<div class="score-filters score-nps-filters">
        ${showScope ? picker("Voor",[
          ["winkel",data.store.name,scope(null,state)],
          ...people.map(person=>[person.id,person.name+(person.active?"":" · Historiek"),scope(person.id,state)])
        ],entity?.id||"winkel") : ""}
        ${periodPicker(periods,period,data.monthLabel,value=>npsLink({...state,periode:value}),"Peilmaand")}
        ${segment("NPS-periode",[
          ["maand","Maand",npsLink({...state,termijn:"maand"})],["jaar","YTD",npsLink({...state,termijn:"jaar"})]
        ],term)}
      </div>`;
    const comments = ((entity ? profile?.comments : data.nps.comments) || []).filter(comment=>
      comment.comment?.trim() && period && (viewYear ? comment.period?.startsWith(period.slice(0,4)) && comment.period<=period : comment.period===period))
      .sort((a,b)=>String(b.dateIso).localeCompare(String(a.dateIso)));
    const feedbackLink = (type,theme) => npsLink({...base,onderdeel:"nps",reactietype:type,thema:theme,reacties:1});
    const agreementsLink = key => npsLink({...base,onderdeel:"afspraken",meting:key});
    const result = surveyResult(source,period,survey,term);
    const npsGap = result.target!==null && result.value!==null ? result.target-result.value : null;
    const sampleNote = count => count>0 && count<review.minimumChances ?
      '<p class="score-muted score-nps-note">Bij weinig reacties weegt één antwoord sterk door. Lees de feedback vóór je conclusies trekt.</p>' : "";

    if (chosenMetric === "nps") {
      const category=surveyTypes.find(item=>item.key===q.get("reactietype"));
      const theme=customer.themes.find(item=>item.key===q.get("thema"));
      const reactionBase={...base,reactietype:category?.key,thema:theme?.key};
      const visible = comments.filter(comment=>(!category || comment.type===category.type) && (!theme || customer.matches(comment,theme)));
      const commentSize = 15;
      const pageCount = Math.max(1,Math.ceil(visible.length/commentSize));
      const current = Math.max(1,Math.min(pageCount,Math.floor(Number(q.get("reacties")) || 1)));
      const commentUrl = page => npsLink({...reactionBase,reacties:page});
      const filterUrl=reactietype=>npsLink({...reactionBase,reactietype,reacties:1});
      const commentList = visible.length
        ? `<ul class="score-comments">${visible.slice((current-1)*commentSize,current*commentSize)
          .map(comment=>surveyComment(comment,!entity)).join("")}</ul>` : '<p class="score-empty">Geen commentaren in deze periode.</p>';
      const paging = pageCount > 1 ? `<div class="score-pager">
        ${current > 1 ? `<a class="score-button" href="${escape(commentUrl(current-1))}">Vorige</a>` : ""}
        <span class="score-muted">Pagina ${current} van ${pageCount}</span>
        ${current < pageCount ? `<a class="score-button" href="${escape(commentUrl(current+1))}">Volgende</a>` : ""}</div>` : "";
      const {value,status} = scoreFields(result,data.byId.nps);
      const history = viewYear ? [] : periods.filter(month=>month<=period && (profile?.month?.[month]?.cards>0 || month===period))
        .sort().reverse().slice(0,12).map(month=>({period:month,metric:surveyResult(source,month,profile?.month?.[month])}));
      return back("Overzicht klantbeleving",npsLink(overview)) + heading("NPS en klantfeedback",subtitle)
        + filters(reactionBase,true)
        + `<div class="score-nps-summary">${facts([["NPS",value,status],
            ["Target",data.format(result.target,data.byId.nps)],["Enquêtes",countValue(result.count??0)]])}
            ${sampleNote(result.count)}
            ${surveyDistribution(survey,category?.key,filterUrl)}</div>`
        + closedComparison(source,"nps",period,viewYear)
        + (viewYear ? "" : `<details class="score-nps-trend"><summary>Evolutie per maand</summary>
          ${trendSection(history,data.byId.nps,period,["count","Enquêtes"])}
          ${list(history.map(({period:month,metric})=>({label:data.monthLabel(month),
            ...scoreFields(metric,data.byId.nps),meta:surveySample(metric.count??0,"enquêtes"),
            href:npsLink({...reactionBase,periode:month})})),"NPS-maandhistoriek")}</details>`)
        + `<section class="score-section" id="nps-comments">
            <h2 tabindex="-1">Klantcommentaren · ${category?escape(category.label)+" · ":""}${visible.length}</h2>
            ${commentFilters(category?.key??null,filterUrl)}
            ${picker("Thema",[[null,"Alle thema’s",npsLink({...reactionBase,thema:null,reacties:1})],
              ...customer.themes.map(item=>[item.key,item.label,npsLink({...reactionBase,thema:item.key,reacties:1})])],theme?.key??null)}
            ${commentList}${paging}</section>`;
    }

    if (comparing) {
      const state = {...base,meting:compareMetric?.[0]};
      const label = compareMetric?.[1] || "NPS";
      const detail = compareMetric?.[0] || "nps";
      const rows = people.map(person=>{
        const metric = compareMetric
          ? experienceResult(data.avvProfile(person)?.[bucket]?.[detail],compareMetric[2],compareMetric[3])
          : surveyResult(person,period,data.npsProfile(person)?.[bucket]?.[period],term);
        return {label:person.name,...(compareMetric?experienceFields(metric):scoreFields(metric,data.byId.nps)),
          meta:[compareMetric?experienceMeta(metric):surveySample(metric.count??0,"enquêtes"),person.active?"":"Historiek"].filter(Boolean).join(" · "),
          count:metric.count??0,href:npsLink({...state,verkoper:person.id,onderdeel:detail,meting:null})};
      }).sort((a,b)=>b.count-a.count);
      return back("Overzicht klantbeleving",scope(null,overview))
        + heading("Verkopers vergelijken",periodText) + filters(state)
        + `<div class="score-filters">${picker("Meting",[["nps","NPS",compare(null)],
          ...metrics.map(([key,name])=>[key,name,compare(key)])],detail)}</div>`
        + (compareMetric && !hasExperience ? experienceUnavailable(avvPeriod,state)
          : section(label,`<p class="score-nps-note score-muted">Gesorteerd op aantal ${compareMetric?"antwoorden":"enquêtes"}. Open een verkoper voor details.</p>
            ${list(rows,"Resultaten per verkoper")}`));
    }
    if (activeMetric) {
      const [key,label,warning,target,prompt] = activeMetric;
      const measurement = experienceResult(experience?.[bucket]?.[key],warning,target);
      const {value,status} = experienceFields(measurement);
      return back("Overzicht klantbeleving",npsLink(overview))
        + heading(label,subtitle) + filters(base,true)
        + (hasExperience ? facts([["Score",value,status],["Target",data.format(target,ratioDef)],
            ["Antwoorden",countValue(measurement.count)],
            ["Afstand tot target",surveyGap(measurement.gap,"pp") || null]]) + sampleNote(measurement.count)
          + closedComparison(source,key,period,viewYear)
          + (measurement.gap>0 && measurement.count>=review.minimumChances
            ? section("Coachingsvraag",`<p class="score-nps-coaching">${escape(prompt)}</p>`) : "")
          : experienceUnavailable(avvPeriod,base))
        + section("Verder kijken",list([
          ...(hasExperience && !entity ? [{label:"Vergelijk verkopers op deze meting",href:compare(key)}] : []),
          {label:"Maak een coachingsafspraak",href:agreementsLink(key)},
          {label:"Bekijk feedback over dit thema",href:feedbackLink(null,customer.metricThemes[key])},
          {label:"Lees klantcommentaren",meta:"Alle onderwerpen in deze periode",href:feedbackLink(null)}
        ],"Verder kijken"));
    }
    const measurements = metrics.map(([key,label,warning,target])=>{
      const result = experienceResult(experience?.[bucket]?.[key],warning,target);
      const priority = result.gap>0 && result.count>=review.minimumChances ? result.gap : 0;
      return {label,meta:experienceMeta(result),...experienceFields(result),priority,href:npsLink({...base,onderdeel:key})};
    }).sort((a,b)=>b.priority-a.priority);
    const coaching = measurements.some(row=>row.priority>0)
      ? '<p class="score-muted score-nps-note">Metingen onder target met minstens '+review.minimumChances+' antwoorden staan bovenaan, met de grootste afstand eerst.</p>'
      : "";
    return heading("Klantbeleving",subtitle) + filters(base,true)
      + (entity ? personalCustomerSignals(source,period,bucket,result.target,comments,base,feedbackLink) : "")
      + section("NPS",list([{label:"Bekijk NPS en verdeling",meta:[surveyGap(npsGap,"punten"),surveySample(result.count??0,"enquêtes")].filter(Boolean).join(" · "),
        ...scoreFields(result,data.byId.nps),href:npsLink({...base,onderdeel:"nps"})}],"NPS"))
      + `<section class="score-section" aria-labelledby="score-experience-heading">
        <h2 tabindex="-1" id="score-experience-heading">Metingen klantbeleving</h2>
        ${hasExperience ? coaching+list(measurements,"Metingen klantbeleving") : experienceUnavailable(avvPeriod,base)}
      </section>`
      + section("Klantfeedback",list([{label:"Alle klantcommentaren",value:countValue(comments.length),href:feedbackLink(null)},
        ...surveyTypes.map(item=>({label:item.label,value:countValue(comments.filter(comment=>comment.type===item.type).length),
          href:feedbackLink(item.key)}))],"Geschreven klantfeedback"))
      + themeGroups(themeOptions(comments),feedbackLink,!entity)
      + section("Opvolging",list([
        {label:"Coachingsafspraken",meta:"Leg een actie vast en evalueer na de gekozen maand",href:agreementsLink(null)},
        ...(!entity ? [{label:"Vergelijk verkopers",meta:"Kies NPS of een meting klantbeleving",href:compare(null)}] : [])
      ],"Opvolging"));
  }

  const views = {home:() => home,analyse:analysisPage,resultaten:resultPage,rankings:rankingPage,nps:npsPage};
  let localSwitch=null;
  function render(focus = false) {
    const [requested,query] = location.hash.slice(1).split("?",2);
    const page = routes.includes(requested) ? requested : "home";
    const params=new URLSearchParams(query);
    for (const link of nav.querySelectorAll("a")) {
      if (link.getAttribute("href") === "#" + page) link.setAttribute("aria-current","page");
      else link.removeAttribute("aria-current");
    }
    root.innerHTML = views[page](params);
    if (page === "home" && review.importStatus.omzetTot) {
      root.querySelector("[data-report-date]").textContent="Omzet bijgewerkt t.e.m. "+dateLabel(review.importStatus.omzetTot);
    }
    if (page !== "home") root.querySelector("h1").tabIndex = -1;
    document.title = page === "home" ? "The Diestroyers | Prestatieplatform" : root.querySelector("h1").textContent + " | The Diestroyers";
    if (page==="nps") {
      const destination=params.has("reacties") ? root.querySelector("#nps-comments h2")
        : params.get("onderdeel")==="klantbeleving" ? root.querySelector("#score-experience-heading") : null;
      if (destination) {
        requestAnimationFrame(()=>{
          if (!destination.isConnected) return;
          destination.scrollIntoView({block:"start"});
          destination.focus({preventScroll:true});
        });
        localSwitch=null;
        return;
      }
    }
    if (focus) {
      if (localSwitch) {
        const group=[...root.querySelectorAll(".score-local-switch [role=group]")].find(item=>item.getAttribute("aria-label")===localSwitch.label);
        window.scrollTo(0,localSwitch.top);
        group?.querySelector('[aria-current="true"]')?.focus({preventScroll:true});
      } else {
        window.scrollTo(0,0);
        root.querySelector("h1").focus({preventScroll:true});
      }
    }
    localSwitch=null;
  }

  function selectChartMonth(button) {
    const chart=button.closest("[data-chart]");
    const month=button.dataset.chartMonth;
    for (const control of chart.querySelectorAll("[data-chart-month]")) {
      const selected=control.dataset.chartMonth===month;
      control.setAttribute("aria-pressed",String(selected));
      control.tabIndex=selected?0:-1;
    }
    for (const reading of chart.querySelectorAll("[data-chart-reading]")) reading.hidden=reading.dataset.chartReading!==month;
    for (const figure of chart.querySelectorAll(".score-trend")) {
      const selected=[...figure.querySelectorAll("[data-chart-month]")].find(item=>item.dataset.chartMonth===month);
      if (!selected) continue;
      const rail=figure.querySelector("[data-trend-rail]");
      rail.setAttribute("x1",selected.dataset.chartX);
      rail.setAttribute("x2",selected.dataset.chartX);
      for (const dot of figure.querySelectorAll("[data-trend-dot]")) {
        const current=dot.dataset.trendDot===month;
        dot.classList.toggle("selected",current);
        dot.setAttribute("r",current?"5.5":"3.4");
      }
    }
  }
  root.addEventListener("click",event=>{
    const month=event.target.closest("[data-chart-month]");
    if (month) selectChartMonth(month);
    const link=event.target.closest(".score-local-switch a");
    if (link && link.hash!==location.hash && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      localSwitch={top:window.scrollY,label:link.parentElement.getAttribute("aria-label")};
    }
  });
  root.addEventListener("keydown",event=>{
    const month=event.target.closest("[data-chart-month]");
    if (!month || !["ArrowLeft","ArrowRight"].includes(event.key)) return;
    const next=event.key==="ArrowLeft"?month.previousElementSibling:month.nextElementSibling;
    if (!next) return;
    event.preventDefault();
    selectChartMonth(next);
    next.focus({preventScroll:true});
  });
  root.addEventListener("change",event => {
    if (event.target.matches("select[data-score-select]")) location.hash = event.target.value;
  });
  root.addEventListener("submit",event=>{
    const form = event.target;
    if (!form.matches("[data-coaching-scope]")) return;
    event.preventDefault();
    const message = form.querySelector("[data-coaching-message]");
    const input = new FormData(form);
    const scope = form.dataset.coachingScope;
    const source = scope==="winkel" ? data.store : data.sellers.find(person=>person.id===scope);
    if (!source) return;
    const records = customer.readAgreements();
    if (!records) {
      message.textContent = "Opslaan in deze browser is niet beschikbaar.";
      return;
    }
    const id = form.dataset.agreement;
    const record = records.find(item=>item.scope===scope && item.id===id);
    const action = input.get("action").trim();
    const activeMonth = review.activeMonth();
    if (!action) {
      message.textContent = "Beschrijf eerst welke actie je wil oefenen.";
      return;
    }
    let update;
    if (!id) {
      const metric = input.get("metric"), baseline = input.get("baseline"), due = input.get("due");
      if (!agreementMetrics.some(([key])=>key===metric) || !customer.isMonth(baseline) ||
          !customer.isMonth(due) || baseline>activeMonth || due<=baseline) {
        message.textContent = "Kies een evaluatiemaand na de nulmeting.";
        return;
      }
      update = {id:crypto.randomUUID(),scope,metric,baseline,due,action,start:customer.snapshot(source,metric,baseline),note:""};
    } else {
      if (!record) {
        message.textContent = "Deze afspraak is niet meer beschikbaar.";
        return;
      }
      const kind = event.submitter?.value;
      const note = (input.get("note")||"").trim();
      update = {...record,action,note};
      if (kind==="reopen") delete update.completed;
      if (kind==="finish") {
        if (record.due>=activeMonth) {
          message.textContent = "Evalueer zodra de gekozen maand is afgesloten.";
          return;
        }
        let reading = customer.snapshot(source,record.metric,record.due);
        let manual = false;
        const score = input.get("manualScore"), count = input.get("manualCount");
        if (!reading && (score || count)) {
          const value = Number(score), volume = Number(count);
          if (!score || !count || !Number.isFinite(value) || value<(record.metric==="nps"?-100:0) ||
              value>100 || !Number.isSafeInteger(volume) || volume<1) {
            message.textContent = "Vul een geldige score én het aantal antwoorden in.";
            return;
          }
          reading = {value,count:volume};
          manual = true;
        }
        if (!reading && !note) {
          message.textContent = "Leg een observatie vast als er geen cijfers beschikbaar zijn.";
          return;
        }
        update.completed = {reading,manual};
      }
    }
    if (!customer.writeAgreement(update)) {
      message.textContent = "De afspraak kon niet worden opgeslagen in deze browser.";
      return;
    }
    render();
    const saved = root.querySelector(`[data-agreement="${CSS.escape(update.id)}"]`);
    saved.closest("details").open = true;
    saved.closest("details").querySelector("summary").focus();
    saved.querySelector("[data-coaching-message]").textContent = "Afspraak bewaard.";
  });
  window.addEventListener("hashchange",() => render(true));
  window.addEventListener("DOMContentLoaded",() => {
    const shop = document.querySelector(".score-brand span");
    shop.textContent = `${data.store.name} · ${data.store.id}`;
    render();
  },{once:true});
})();
