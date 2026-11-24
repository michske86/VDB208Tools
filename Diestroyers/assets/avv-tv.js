(() => {
  'use strict';
  const number = Intl.NumberFormat('nl-BE', { maximumFractionDigits: 1 });
  const text = value => String(value ?? '').trim();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char =>
    ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[char]);
  const readable = value => value != null && Number.isFinite(Number(value));
  const percent = value => readable(value) ? number.format(value) + '%' : '—';
  const sample = metric => Number(metric?.responses) || 0;
  const metrics = [
    {key:'trust', label:'Akte van Vertrouwen', short:'AVV', warn:70, goal:80},
    {key:'price', label:'Laagste Prijs Garantie', short:'LPG', warn:70, goal:80},
    {key:'information', label:'Inlichtingen', short:'Info', warn:90, goal:95},
    {key:'wait', label:'Wachttijd', short:'Wacht', warn:90, goal:95},
    {key:'friendly', label:'Vriendelijkheid', short:'Vriend.', warn:90, goal:95}
  ];

  function status(metric, value) {
    if (!readable(value)) return 'avvNone';
    return value >= metric.goal ? 'avvGood' : value >= metric.warn ? 'avvWatch' : 'avvLow';
  }

  function threshold(value, className) {
    const angle = Math.PI * (1 - value / 100);
    const xy = radius => [47 + radius * Math.cos(angle), 45 - radius * Math.sin(angle)];
    const [x1,y1] = xy(34), [x2,y2] = xy(44);
    return `<line class="avvMark ${className}" data-threshold="${value}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  }

  function dial(metric, period, stats) {
    const value = stats?.value;
    const fill = readable(value) ? Math.max(0, Math.min(100, Number(value))) : 0;
    return `<div class="avvDial" data-period="${period}">
      <span class="avvScope">${period.toUpperCase()}</span>
      <svg viewBox="0 0 94 52" aria-hidden="true">
        <path class="avvTrack" d="M 8 45 A 39 39 0 0 1 86 45"/>
        ${fill ? `<path class="avvStroke ${status(metric,value)}" d="M 8 45 A 39 39 0 0 1 86 45" pathLength="100" stroke-dasharray="${fill} 100"/>` : ''}
        ${threshold(metric.warn,'avvWatch')}${threshold(metric.goal,'avvGood')}
      </svg>
      <strong>${percent(value)}</strong><span class="avvResponses">${number.format(sample(stats))} antw.</span>
    </div>`;
  }

  function storeCard(metric, store, index) {
    return `<article class="avvDialCard ${index < 2 ? 'primary' : ''}" data-kpi="${metric.key}">
      <h3>${metric.label}</h3><div class="avvDialPair">${dial(metric,'mtd',store.month?.[metric.key])}${dial(metric,'ytd',store.ytd?.[metric.key])}</div>
    </article>`;
  }

  function sellerRows(config, sellers) {
    const active = config.filter(person => (text(person.Actief) || 'ja').toLowerCase() !== 'nee')
      .map(person => ({id:text(person.PersoneelsNr),name:text(person.Naam) || text(person.PersoneelsNr)}));
    const people = active.length ? active : Object.entries(sellers).map(([id,person]) => ({id,name:text(person.name) || id}));
    return people.map(person => {
      const data = sellers[person.id] || {};
      const month = data.month || {}, ytd = data.ytd || {};
      const hasScore = sample(month.trust) || sample(month.price);
      const ordering = hasScore ? (Number(month.trust?.value) || 0) + (Number(month.price?.value) || 0) : -Infinity;
      return {...person, month, ytd, ordering};
    }).sort((a,b) => b.ordering - a.ordering || a.name.localeCompare(b.name,'nl-BE'));
  }

  function rankingCell(metric, person) {
    const result = (scope, period) => {
      const value = person[scope][metric.key]?.value;
      return `<span class="avvRankValue ${period} ${status(metric,value)}" aria-label="${period.toUpperCase()} ${percent(value)}">${percent(value)}</span>`;
    };
    return `<div class="avvRankCell" role="cell" data-kpi="${metric.key}">${result('month','mtd')}${result('ytd','ytd')}</div>`;
  }

  function answers(person, scope, label) {
    const count = Math.max(...metrics.map(metric => sample(person[scope][metric.key])));
    return `<span class="avvSellerResponses">${label}: ${number.format(count)} antw.</span>`;
  }

  function ranking(people) {
    if (!people.length) return '<p>Geen verkopersgegevens beschikbaar.</p>';
    return `<div class="avvRankHead" role="row"><span role="columnheader">Verkoper</span>${metrics.map(metric => `<span role="columnheader" aria-label="${metric.label}">${metric.short}</span>`).join('')}</div>
      <div class="avvRankRows" role="rowgroup">${people.map(person => `<div class="avvRankRow" role="row" data-seller="${esc(person.id)}">
        <div class="avvRankSeller" role="rowheader"><strong>${esc(person.name)}</strong>${answers(person,'month','MTD')}${answers(person,'ytd','YTD')}</div>
        ${metrics.map(metric => rankingCell(metric,person)).join('')}
      </div>`).join('')}</div>`;
  }

  function fit() {
    const list = document.querySelector('#avvRanking .avvRankRows');
    if (!list?.clientHeight || !list.children.length) return;
    const count = list.children.length;
    const gap = Math.min(5, Math.floor(list.clientHeight / (count * 12)));
    const height = (list.clientHeight - gap * (count - 1)) / count;
    const sizes = {
      gap,'row-gap':Math.min(3,height*.035),'name-size':Math.min(24,height*.36),
      'detail-size':Math.min(16,height*.25),'mtd-size':Math.min(27,height*.48),'ytd-size':Math.min(22,height*.38)
    };
    for (const [key,value] of Object.entries(sizes)) list.style.setProperty('--avv-'+key,value+'px');
  }

  function render(data, config, period) {
    document.getElementById('avvPeriod').textContent = period ? 'PERIODE '+period : 'GEEN NPS-DATA';
    document.getElementById('avvOverview').innerHTML = metrics.map((metric,index) => storeCard(metric,data.store || {},index)).join('');
    document.getElementById('avvRanking').innerHTML = ranking(sellerRows(config,data.sellers || {}));
    requestAnimationFrame(fit);
  }

  window.DIESTROYERS_TV_AVV = {render, fit};
})();
