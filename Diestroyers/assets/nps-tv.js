(() => {
  'use strict';

  const number = Intl.NumberFormat('nl-BE', {maximumFractionDigits: 1});
  const dateFormat = Intl.DateTimeFormat('nl-BE', {day: '2-digit', month: '2-digit'});
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char =>
    ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[char]);
  const key = value => String(value ?? '').trim().toLowerCase();
  const valid = value => value != null && Number.isFinite(Number(value));
  const format = value => valid(value) ? number.format(value) : '—';
  const count = value => Math.max(0, Number(value) || 0);
  const percentage = value => (Math.max(-100, Math.min(100, Number(value))) + 100) / 2;
  const metrics = ['promoters', 'passives', 'detractors'];
  const classNames = ['npsP', 'npsN', 'npsD'];
  const status = (value, target) => !valid(value) ? 'none' : value >= target ? 'ok' : value >= target * .9 ? 'close' : 'bad';

  function mix(result) {
    const parts = metrics.map((name, index) => {
      const amount = count(result[name]);
      return amount ? `<span class="${classNames[index]}" style="flex:${amount} 0 0"></span>` : '';
    });
    return `<div class="npsMix" aria-hidden="true">${parts.join('')}</div>`;
  }

  function storeCard(label, result, target) {
    const value = result.nps;
    const fill = valid(value) ? percentage(value) : 0;
    return `<section class="npsStoreCard">
      <div class="npsStoreDial ${status(value, target)}">
        <svg viewBox="0 0 130 130" aria-hidden="true">
          <circle class="npsDialTrack" cx="65" cy="65" r="59" />
          <circle class="npsDialFill" cx="65" cy="65" r="59" pathLength="100" stroke-dasharray="${fill} ${100 - fill}" transform="rotate(-90 65 65)" />
          <line class="npsDialTarget" x1="65" y1="0" x2="65" y2="13" transform="rotate(${percentage(target) * 3.6} 65 65)" />
        </svg>
        <strong>${format(value)}</strong>
      </div>
      <div class="npsStoreDetails">
        <h2>NPS ${label}</h2>
        <div class="npsLegend"><span>Target ${format(target)}</span><span class="npsP">Promotoren 9–10</span><span class="npsN">Neutralen 7–8</span><span class="npsD">Detractoren 0–6</span></div>
        ${mix(result)}
        <div class="npsStoreTotals">
          ${metrics.map((name, index) => `<span class="${classNames[index]}">${['P','N','D'][index]} ${format(count(result[name]))}</span>`).join('')}
          <span>${format(count(result.cards))} kaartjes</span>
        </div>
      </div>
    </section>`;
  }

  function sellerLine(label, result) {
    return `<div class="npsSellerLine ${label.toLowerCase()}">
      <span class="npsSellerPeriod">${label}</span><strong class="npsSellerScore">${format(result.nps)}</strong>${mix(result)}
      <div class="npsCounts">
        ${metrics.map((name, index) => `<span class="${classNames[index]}">${format(count(result[name]))}</span>`).join('')}
        <span>${format(count(result.cards))}</span>
      </div>
    </div>`;
  }

  function sellerRows(config, sellers, period) {
    return config.map(person => {
      const id = String(person.PersoneelsNr ?? '').trim();
      const data = sellers[id] || {};
      return {
        name: String(person.Naam ?? '').trim() || data.name || id,
        active: key(person.Actief || 'ja') !== 'nee',
        month: data.month?.[period] || {},
        ytd: data.ytd?.[period] || {}
      };
    }).filter(row => row.active || count(row.month.cards) || count(row.ytd.cards)).sort((a, b) => {
      const aCards = count(a.month.cards);
      const bCards = count(b.month.cards);
      if (Boolean(aCards) !== Boolean(bCards)) return bCards ? 1 : -1;
      return (aCards && (Number(b.month.nps) - Number(a.month.nps) || bCards - aCards)) || a.name.localeCompare(b.name, 'nl-BE');
    });
  }

  function ranking(rows) {
    if (!rows.length) return '<p>Geen verkopersgegevens beschikbaar.</p>';
    return `<div class="npsSellerHead">
      <span>Verkoper</span><div class="npsSellerLine"><span></span><span class="npsScoreHeading">NPS</span><span>Verdeling</span>
      <div class="npsCounts"><span>P</span><span>N</span><span>D</span><span>Kaartjes</span></div></div>
    </div><div class="npsSellerList">${rows.map((row, index) => `<article class="npsSellerRow">
      <strong class="npsSellerName">${index + 1}. ${esc(row.name)}</strong>
      <div class="npsSellerValues">${sellerLine('MTD', row.month)}${sellerLine('YTD', row.ytd)}</div>
    </article>`).join('')}</div>`;
  }

  function review(item) {
    const type = key(item.type);
    const tone = ['promotor', 'neutraal', 'detractor'].includes(type) ? type : '';
    const score = valid(item.score) ? Math.max(0, Math.min(10, Number(item.score))) : null;
    const stars = score == null ? '' : `<span class="npsReviewStars" role="img" aria-label="${format(score / 2)} uit 5 sterren">${Array.from({length: 5}, (_, index) =>
      `<span aria-hidden="true" style="--nps-star-fill:${Math.max(0, Math.min(1, score / 2 - index)) * 100}%">☆</span>`).join('')}</span>`;
    const rawDate = item.dateIso || item.date || '';
    const date = new Date(String(rawDate).replace(' ', 'T'));
    const displayDate = Number.isNaN(date.getTime()) ? rawDate : dateFormat.format(date);
    return `<article class="npsTvComment ${tone}">
      <header class="npsTvCommentHead"><div>${stars}<strong>${score == null ? '—' : format(score) + '/10'} · ${esc(item.type)}</strong></div>
        <time datetime="${esc(rawDate)}">${esc(displayDate)} · ${esc(item.sellerName || 'Winkel')}</time>
      </header><p class="npsReviewText">${esc(item.comment)}</p>
    </article>`;
  }

  function fit() {
    const sellers = document.querySelector('#npsTvRanking .npsSellerList');
    if (sellers?.clientHeight && sellers.children.length) {
      const rows = sellers.children.length;
      const gap = Math.min(5, Math.max(0, Math.floor(sellers.clientHeight / (rows * 12))));
      const height = (sellers.clientHeight - gap * (rows - 1)) / rows;
      const lineGap = Math.min(4, height * .06);
      const sizes = {
        'row-gap': gap, 'line-gap': lineGap,
        'name-size': Math.min(23, height * .4),
        'detail-size': Math.min(17, height * .26),
        'mtd-size': Math.min(34, (height - lineGap) * .51),
        'ytd-size': Math.min(26, (height - lineGap) * .38),
        'bar-size': Math.min(7, height * .15)
      };
      for (const name of Object.keys(sizes)) sellers.style.setProperty('--nps-' + name, sizes[name] + 'px');
    }
    for (const paragraph of document.querySelectorAll('#npsTvComments .npsReviewText')) {
      let size = 21;
      paragraph.style.setProperty('--nps-review-size', size + 'px');
      while (paragraph.scrollHeight > paragraph.clientHeight + 1 && size > 13) {
        size -= 1;
        paragraph.style.setProperty('--nps-review-size', size + 'px');
      }
      if (paragraph.scrollHeight > paragraph.clientHeight + 1) paragraph.tabIndex = 0;
      else paragraph.removeAttribute('tabindex');
    }
  }

  function render(data, config, period, target) {
    document.getElementById('npsTvPeriod').textContent = period;
    document.getElementById('npsTvStats').innerHTML = storeCard('maand', data.store?.month?.[period] || {}, target) +
      storeCard('YTD', data.store?.ytd?.[period] || {}, target);
    const rows = sellerRows(config, data.sellers || {}, period);
    document.getElementById('npsTvRanking').innerHTML = ranking(rows);
    const comments = (data.comments || []).slice().sort((a, b) =>
      String(b.dateIso || b.date).localeCompare(String(a.dateIso || a.date))).slice(0, 6);
    document.getElementById('npsTvComments').innerHTML = comments.length ? comments.map(review).join('') : '<p>Geen recente commentaren.</p>';
    requestAnimationFrame(fit);
  }

  window.DIESTROYERS_TV_NPS = {render, fit};
})();
