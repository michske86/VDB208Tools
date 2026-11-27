/* Mobiele router en weergaven voor het Diestroyers-prestatieplatform. */
(() => {
  "use strict";
  const data = window.ScorebladData;
  const root = document.getElementById("score-main");
  const home = root.innerHTML;
  const nav = document.querySelector(".score-nav");
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  const routes = ["home","resultaten","rankings","nps"];
  const metrics = [["trust","Akte van Vertrouwen"],["price","Laagste Prijs Garantie"],["information","Inlichtingen"],["wait","Wachttijd"],["friendly","Vriendelijkheid"]];
  const integer = new Intl.NumberFormat("nl-BE");
  const dateFormat = new Intl.DateTimeFormat("nl-BE",{dateStyle:"medium",timeZone:"UTC"});
  const dateLabel = value => {
    const date = new Date(value);
    return isNaN(date) ? value : dateFormat.format(date);
  };
  const ratioDef = {type:"percentage"};

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
  function row({label, meta, value, href, rank, own, empty}) {
    const body = `<span class="score-name">${rank !== undefined ? `<span class="score-rank">${rank ?? "—"}</span>` : ""}
      <span>${escape(label)}${meta ? `<small class="score-meta">${escape(meta)}</small>` : ""}</span></span>
      <span class="score-value${empty ? " empty" : ""}">${escape(value)}</span>`;
    const cls = "score-row" + (own ? " own" : "");
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
      .map(([name,value]) => `<div><dt>${escape(name)}</dt><dd>${escape(value)}</dd></div>`).join("")}</dl>`;
  }
  function section(title, html) {
    return `<section class="score-section"><h2>${escape(title)}</h2>${html}</section>`;
  }
  function targetLabel(result, def) {
    return result.target === null ? "Geen target" : "Target " + data.format(result.target,def);
  }
  function metricFacts(result, def, periodText = "Resultaat") {
    const score = data.points(result);
    const count = result.count === null || result.count === undefined ? null : integer.format(result.count);
    const chances = result.chances > 0 ? integer.format(result.chances) : null;
    const items = [[periodText,data.format(result.value,def)],["Target",result.target === null ? "Geen target" : data.format(result.target,def)]];
    if (def.type === "ratio" || def.id === "s" || def.id === "nps") items.push([def.id === "nps" ? "Enquêtes" : "Stuks",count]);
    if (def.type === "ratio") items.push(["Kansen",chances]);
    if (result.euro !== null && result.euro !== undefined) items.push(["Bedrag",data.format(result.euro,{type:"bedrag"})]);
    if (result.prior !== null && result.prior !== undefined) items.push(["Vorig jaar",data.format(result.prior,def)]);
    if (result.total !== undefined) items.push(["Maanden met data",result.coverage + " / " + result.total]);
    return facts(items) + (score === null ? "" : `<p class="score-section"><span class="score-status${score === 3 ? " good" : score === 1 ? " close" : ""}">${score === 3 ? "Target behaald" : score === 1 ? "Binnen 10% van target" : "Onder target"}</span></p>`);
  }
  function resultLink(values) { return url("resultaten",values); }
  function resultPage(q) {
    const entity = data.sellers.find(person => person.id === q.get("verkoper"));
    const mode = entity || q.get("weergave") === "verkopers" ? "verkopers" : "kpis";
    const period = data.periods.includes(q.get("periode")) ? q.get("periode") : data.latest;
    const def = data.kpis.find(item => item.id === q.get("kpi"));
    const base = {weergave:mode,periode:period,verkoper:entity?.id,kpi:def?.id,detail:q.get("detail")};
    const source = entity || data.store;
    const subtitle = data.monthLabel(period);
    const periods = data.periods.length ? data.periods : [period];
    const selector = periodPicker(periods,period,data.monthLabel,value => resultLink({...base,periode:value}));
    if (def) {
      const result = data.month(source,def.id,period);
      const subdivisions = data.components(source,def.id,period);
      const requested = subdivisions.find(item => item.id === base.detail);
      if (requested) {
        const history = [...periods].reverse().map(item => ({period:item,metric:data.components(source,def.id,item).find(component => component.id === requested.id)}))
          .filter(item => item.metric);
        return back(def.label,resultLink({...base,detail:null})) + heading(requested.label,`${source.name} · ${def.label} · ${subtitle}`)
          + selector + metricFacts(requested,ratioDef)
          + section("Maandhistoriek",list(history.map(item => ({label:data.monthLabel(item.period),value:data.format(item.metric.value,ratioDef),
            meta:targetLabel(item.metric,ratioDef),href:resultLink({...base,periode:item.period})})),"Maandhistoriek"));
      }
      const annual = data.annual(source,def.id,period);
      const history = [...periods].reverse().map(item => ({period:item,metric:data.month(source,def.id,item)}));
      return back(entity ? source.name : "Alle KPI’s",resultLink({...base,kpi:null,detail:null}))
        + heading(def.label,`${source.name} · ${subtitle}`) + `<div class="score-filters inline">${selector}</div>`
        + metricFacts(result,def)
        + (subdivisions.length ? section("Uitsplitsing",list(subdivisions.map(detail => ({
            label:detail.label, value:data.format(detail.value,ratioDef), meta:targetLabel(detail,ratioDef), href:resultLink({...base,detail:detail.id})
          })),"Uitsplitsing")) : "")
        + (def.id === "nps" ? section("Klantbeleving",list([{label:"NPS en commentaren",href:url("nps",{verkoper:entity?.id,periode:period,onderdeel:"nps"})}],"Klantbeleving")) : "")
        + section("Jaar t.e.m. " + subtitle,metricFacts(annual,def,"Jaarresultaat"))
        + section("Maandhistoriek",list(history.map(item => ({
            label:data.monthLabel(item.period), value:data.format(item.metric.value,def), empty:item.metric.value === null,
            meta:targetLabel(item.metric,def),href:resultLink({...base,periode:item.period,detail:null})
          })),"Maandhistoriek"));
    }

    if (entity) {
      return back("Alle verkopers",resultLink({...base,verkoper:null,kpi:null}))
        + heading(entity.name,subtitle + (entity.active ? "" : " · Historiek"))
        + `<div class="score-filters inline">${selector}</div>` + kpiList(source,base,period);
    }
    const switches = segment("Resultaten bekijken voor",[
      ["kpis","KPI’s",resultLink({...base,weergave:"kpis"})],["verkopers","Verkopers",resultLink({...base,weergave:"verkopers"})]
    ],mode);
    if (mode === "verkopers") {
      const sellers = data.sellers.map(person => {
        const sales = data.month(person,"omzet",period).value;
        return {label:person.name,meta:person.active ? "Omzet" : "Historiek",value:data.format(sales,data.byId.omzet),
          empty:sales === null,href:resultLink({...base,verkoper:person.id})};
      });
      return heading("Resultaten",subtitle) + `<div class="score-filters">${switches}${selector}</div>` + list(sellers,"Verkopers");
    }
    return heading("Resultaten",`${data.store.name} · ${subtitle}`) + `<div class="score-filters">${switches}${selector}</div>` + kpiList(source,base,period);
  }
  function kpiList(entity,base,period) {
    return list(data.kpis.map(def => {
      const result = data.month(entity,def.id,period);
      return {label:def.label,meta:targetLabel(result,def),value:data.format(result.value,def),empty:result.value === null,href:resultLink({...base,kpi:def.id})};
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
            href:resultLink({weergave:"verkopers",verkoper:entity.id,kpi:def.id,periode:period})}],"Resultaatdetails")) : "");
      }
      return back("Ranglijst",rankLink(base)) + heading(entity.name,`${name} · ${subtitle}`)
        + facts([["Positie",chosen.rank ?? "Geen data"],["Score",format(chosen.value)],...(group ? [["KPI’s met score",chosen.available + " / " + chosen.total]] : [])])
        + section(group ? "Score per KPI" : "Resultaat",list(chosen.breakdown.map(item => {
          const def = data.byId[item.key];
          const value = data.format(item.result.value,def);
          return {label:def.label,value,empty:item.result.value === null,meta:targetLabel(item.result,def) + (group ? " · " + (item.points === null ? "Geen puntenberekening" : item.points + " pt") : ""),
            href:rankLink({...base,entiteit:entity.id,kpi:item.key})};
        }),"Resultaat per KPI"))
        + (regional ? section("Winkelresultaten",list(data.kpis.map(def => {
          const result = data.month(entity,def.id,period);
          return {label:def.label,value:data.format(result.value,def),empty:result.value === null,meta:targetLabel(result,def),
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
          meta:showCoverage ? `${item.available} van ${item.total} KPI’s met score` : "",own:regional && item.entity.id === data.store.id,
          href:rankLink({...base,entiteit:item.entity.id})})),"Ranglijst")
      + (showCoverage ? '<p class="score-muted score-section">Punten per KPI met resultaat en target: 3 bij target, 1 vanaf 90%, anders 0.</p>' : "");
  }

  function npsLink(values) { return url("nps",values); }
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
      const target = data.month(source,"nps",period).target;
      return back(source.name,npsLink({...base,onderdeel:null})) + heading("NPS",subtitle)
        + `<div class="score-filters">${selector}${segment("NPS-periode",[
            ["maand","Maand",npsLink({...base,termijn:"maand"})],["jaar","Jaar t.e.m. gekozen maand",npsLink({...base,termijn:"jaar"})]
          ],viewYear ? "jaar" : "maand")}</div>`
        + facts([["NPS",survey?.cards > 0 ? data.format(survey.nps,data.byId.nps) : "Geen data"],
            ["Target",target === null ? "Geen target" : data.format(target,data.byId.nps)],["Enquêtes",survey?.cards ?? 0],
            ["Promotoren",survey?.promoters ?? 0],["Neutralen",survey?.passives ?? 0],["Detractoren",survey?.detractors ?? 0]])
        + section("Klantcommentaren · " + visible.length,commentList + paging)
        + section("Maandhistoriek",list([...surveyPeriods].sort().reverse().map(month => ({
            label:data.monthLabel(month),value:profile?.month?.[month]?.cards > 0 ? data.format(profile.month[month].nps,data.byId.nps) : "Geen data",
            empty:!profile?.month?.[month]?.cards,meta:`${profile?.month?.[month]?.cards ?? 0} enquêtes`,href:npsLink({...base,periode:month})
          })),"NPS-maandhistoriek"));
    }
    if (activeMetric) {
      const [key,label] = activeMetric;
      const renderAnswer = stats => facts([["Score",data.format(stats?.responses > 0 ? stats.value : null,ratioDef)],["Antwoorden",stats?.responses ?? 0]]);
      return back(source.name,npsLink({...base,onderdeel:null})) + heading(label,source.name)
        + section(data.monthLabel(avvPeriod),renderAnswer(experience?.month?.[key]))
        + section("Jaar t.e.m. " + data.monthLabel(avvPeriod),renderAnswer(experience?.ytd?.[key]));
    }

    const switches = segment("Klantbeleving voor",[
      ["winkel","Winkel",npsLink({periode:period})],["verkopers","Verkopers",npsLink({weergave:"verkopers",periode:period})]
    ],mode);
    if (mode === "verkopers" && !entity) {
      return heading("NPS",data.monthLabel(period)) + `<div class="score-filters">${switches}</div>`
        + list(data.sellers.map(person => {
          const survey = data.npsProfile(person)?.month?.[period];
          return {label:person.name,value:survey?.cards > 0 ? data.format(survey.nps,data.byId.nps) : "Geen data",meta:person.active ? "NPS" : "Historiek",
            empty:!survey?.cards,href:npsLink({...base,verkoper:person.id})};
        }),"NPS per verkoper");
    }
    return (entity ? back("Alle verkopers",npsLink({weergave:"verkopers",periode:period})) : "") + heading(entity ? entity.name : "NPS",entity ? data.monthLabel(period) : subtitle)
      + (entity ? "" : `<div class="score-filters">${switches}</div>`)
      + list([{label:"NPS en klantcommentaren",meta:`${mtd?.cards ?? 0} enquêtes`,value:mtd?.cards > 0 ? data.format(mtd.nps,data.byId.nps) : "Geen data",
            empty:!mtd?.cards,href:npsLink({...base,onderdeel:"nps"})}],"NPS")
      + section("Klantbeleving · " + data.monthLabel(avvPeriod),list(metrics.map(([key,label]) => ({
          label,value:data.format(experience?.month?.[key]?.responses > 0 ? experience.month[key].value : null,ratioDef),
          empty:!experience?.month?.[key]?.responses,href:npsLink({...base,onderdeel:key})
        })),"Klantbeleving"));
  }

  const views = {home:() => home,resultaten:resultPage,rankings:rankingPage,nps:npsPage};
  function render(focus = false) {
    const [requested,query] = location.hash.slice(1).split("?",2);
    const page = routes.includes(requested) ? requested : "home";
    for (const link of nav.querySelectorAll("a")) {
      if (link.getAttribute("href") === "#" + page) link.setAttribute("aria-current","page");
      else link.removeAttribute("aria-current");
    }
    root.innerHTML = views[page](new URLSearchParams(query));
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
