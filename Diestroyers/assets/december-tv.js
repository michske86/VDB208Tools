(() => {
  'use strict';
  const {kpis,labelDate} = window.DIESTROYERS_DECEMBER;
  const files = 'assets/december/';
  const fmt = Intl.NumberFormat('nl-BE');
  let replayTimer;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

  function sled(gifts) {
    const visible = Math.min(45,gifts);
    const size = Math.max(20,Math.min(46,53-visible*.85));
    const columns = Math.max(3,Math.floor(160/(size*.82)));
    const boxes = Array.from({length:visible},(_,i)=>{
      const row = Math.floor(i/columns), col = i%columns;
      return `<i style="--x:${52+col*size*.78+(row%2)*size*.18}px;--y:${38+row*size*.42}px;--box:${size}px;--gift-index:${Math.min(i,10)}"></i>`;
    }).join('');
    return `<div class="dec-sled" aria-hidden="true"><div class="dec-load">${boxes}</div><img alt="" src="${files}sled.webp"></div>`;
  }

  function calendar(state, rule) {
    const focused = state.pending || state.today;
    const all = state.calendar.map(day=>{
      const active = day === focused || day.date === focused?.date;
      const css = active && day.open ? ' is-open' : day.open ? ' was-open' : '';
      return `<li class="dec-door${css}"${active?' aria-current="date"':''}><span>${day.day}</span>${day.open?`<small>${kpis[day.kpi]}</small>`:''}</li>`;
    }).join('');
    const current = state.pending ? ['Vandaag',labelDate(state.pending.date),`Opent om ${rule.revealTime}`] :
      state.today ? [state.ended?'Laatste deurtje':'KPI van de dag',kpis[state.today.kpi],'1 stuk = 1 cadeau'] :
      ['Eerste deurtje',labelDate(rule.startDate),`Opent om ${rule.revealTime}`];
    return `<div class="dec-calendar"><ol class="dec-doors" aria-label="Adventskalender">${all}</ol>
      <article class="dec-reveal"><div class="dec-reveal-beam"></div><span>${current[0]}</span><strong>${current[1]}</strong>
      <small>${state.today&&!state.pending?`${labelDate(state.today.date)} · `:''}${current[2]}</small></article></div>`;
  }

  function race(state) {
    const cards = state.ranking.map((row,i)=>{
      const low = row.gifts < state.wallTarget && i >= Math.floor(state.ranking.length/2);
      const top = 6 + i*88/Math.max(1,state.ranking.length-1);
      const left = low ? 48+Math.min(20,(state.wallTarget-row.gifts)/state.wallTarget*20) :
        15+Math.min(30,row.gifts/Math.max(state.ranking[0].gifts,1)*30);
      return `<article class="dec-racer${low?' near-wall':''}" style="--lane:${top}%;--track:${left}%;--rank:${i}" data-gifts="${row.gifts}">
        <div class="dec-racer-scene">${sled(row.gifts)}<span class="dec-name">${esc(row.name)} <b>${fmt.format(row.gifts)}</b></span></div>
      </article>`;
    }).join('');
    return `<div class="dec-race">${cards}
      <div class="dec-wall-flare" aria-hidden="true"></div></div>`;
  }

  function garage(state) {
    return `<div class="dec-garage">${state.ranking.map(row=>`<article class="dec-garage-card" data-gifts="${row.gifts}">
      <div class="dec-garage-info"><h3>${esc(row.name)}</h3><strong>${fmt.format(row.gifts)}</strong><small>${row.gifts===1?'cadeau':'cadeaus'}${row.latestGifts?` · +${fmt.format(row.latestGifts)} op de laatste dag`:''}</small></div>
      ${sled(row.gifts)}</article>`).join('')}</div>`;
  }

  const panels = [
    {key:'calendar',title:'Adventskalender',draw:calendar},
    {key:'race',title:'De kerstsleerace',draw:race},
    {key:'garage',title:'Sleestand',draw:garage}
  ];

  function replay(slide) {
    if (!slide || slide.hidden) return;
    clearTimeout(replayTimer);
    slide.classList.remove('dec-replaying');
    void slide.offsetWidth;
    slide.classList.add('dec-replaying');
    replayTimer=setTimeout(()=>slide.classList.remove('dec-replaying'),2300);
  }

  function render(slide, index, state, rule, unavailable) {
    const {key,title,draw} = panels[index];
    slide.dataset.scene = key;
    let note = state.latestDate ? `Laatste dagstand ${labelDate(state.latestDate)}` : 'Cadeaus volgen na Dagstart';
    if (state.preview) note = 'Voorbeeldstand';
    else if (state.missingDays) note += ` · ${state.missingDays} ${state.missingDays===1?'dagstand ontbreekt':'dagstanden ontbreken'}`;
    if (key==='race') note += ` · Vanaf ${fmt.format(state.wallTarget)} cadeaus over de muur`;
    if (unavailable) note = 'Dagstanden tijdelijk niet beschikbaar';
    slide.innerHTML = `
      <div class="dec-snow" aria-hidden="true"></div>
      <header class="dec-heading"><div><span>Incentive december</span><h2>${title}</h2></div>${state.preview?'<b class="dec-preview">Voorbeeld</b>':''}</header>
      <div class="dec-stage">${draw(state,rule)}</div>
      <footer class="dec-meta">${esc(note)}</footer>`;
    replay(slide);
  }

  window.DIESTROYERS_DECEMBER_TV = {render,replay};
})();
