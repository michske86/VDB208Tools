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

  function sparks(count, spread, type) {
    return Array.from({length:count},(_,i)=>{
      const x=(i*137%101), y=(i*61%101);
      return `<i class="dec-particle ${type}" style="--px:${x}%;--py:${y}%;--dx:${(x-50)*spread}px;--dy:${(y-56)*spread}px;--delay:${i*17}ms;--size:${3+i%5}px"></i>`;
    }).join('');
  }

  function calendar(state, rule) {
    const all = state.calendar.map(day=>{
      const active = day.date === state.current?.date;
      const css = !day.eligible ? ' is-rest' : active && day.open ? ' is-open' :
        active ? ' is-current' : day.open ? ' was-open' : '';
      return `<li class="dec-door${css}"${active?' aria-current="date"':''}><span>${day.day}</span>${day.open?`<small>${kpis[day.kpi]}</small>`:!day.eligible?'<small>Rustdag</small>':''}</li>`;
    }).join('');
    const current = state.pending ? ['Deurtje '+state.pending.day,'Verzegeld',labelDate(state.pending.date)] :
      state.today ? ['KPI van de dag',kpis[state.today.kpi],'1 stuk = 1 cadeau'] :
      state.ended ? ['Incentive afgelopen','Eindstand','Bekijk de sleestand'] :
      state.current ? [labelDate(state.current.date),'Rustdag','De sleeën blijven aan de grond'] :
      ['Eerste deurtje',labelDate(rule.startDate),'De kalender is nog gesloten'];
    return `<div class="dec-calendar"><ol class="dec-doors" aria-label="Adventskalender">${all}</ol>
      <div class="dec-portal${state.today?' is-unsealed':''}">
        <div class="dec-portal-frame" aria-hidden="true"><div class="dec-portal-light"></div><img class="dec-portal-gift" alt="" src="${files}gift-alt.webp"><div class="dec-portal-shutter"></div></div>
        <div class="dec-portal-burst" aria-hidden="true">${sparks(32,9,'dec-shard')}</div>
        <img class="dec-bell" alt="" src="${files}bell.webp">
        <article class="dec-reveal" aria-live="polite"><span>${current[0]}</span><strong>${current[1]}</strong><small>${current[2]}</small></article>
      </div></div>`;
  }

  function race(state) {
    const cards = state.ranking.map((row,i)=>{
      const low = row.gifts < state.wallTarget;
      const top = 6 + i*88/Math.max(1,state.ranking.length-1);
      const left = low ? 38+Math.min(11,(state.wallTarget-row.gifts)/state.wallTarget*11) :
        13+Math.min(24,row.gifts/Math.max(state.ranking[0].gifts,1)*24);
      return `<article class="dec-racer${low?' near-wall':''}" style="--lane:${top}%;--track:${left}%;--rank:${i}" data-gifts="${row.gifts}">
        <div class="dec-racer-scene">${sled(row.gifts)}<span class="dec-name">${esc(row.name)} <b>${fmt.format(row.gifts)}</b></span></div>
      </article>`;
    }).join('');
    return `<div class="dec-race">${cards}
      <div class="dec-race-wind" aria-hidden="true"></div>
      <div class="dec-wall-flare" aria-hidden="true">${sparks(22,7,'dec-shard')}</div>
      <img class="dec-claw" alt="" src="${files}claw.webp"></div>`;
  }

  function garage(state) {
    return `<div class="dec-garage"><div class="dec-workshop-haze" aria-hidden="true"></div>${state.ranking.map(row=>`<article class="dec-garage-card" data-gifts="${row.gifts}">
      <div class="dec-runner" aria-hidden="true"></div><div class="dec-garage-info"><h3>${esc(row.name)}</h3><strong>${fmt.format(row.gifts)}</strong><small>${row.gifts===1?'cadeau':'cadeaus'}${row.latestGifts?` · +${fmt.format(row.latestGifts)} op de laatste dag`:''}</small></div>
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
    replayTimer=setTimeout(()=>slide.classList.remove('dec-replaying'),2750);
  }

  function render(slide, index, state, rule, unavailable) {
    const {key,title,draw} = panels[index];
    slide.dataset.scene = key;
    let note = state.latestDate ? `Laatste dagstand ${labelDate(state.latestDate)}` : 'Cadeaus volgen na Dagstart';
    if (state.preview) note = 'Voorbeeldstand';
    else if (state.ended && key!=='garage') note = 'Eindstand op de sleestand · '+note;
    else if (state.missingDays) note += ` · ${state.missingDays} ${state.missingDays===1?'dagstand ontbreekt':'dagstanden ontbreken'}`;
    if (key==='race') note += ` · Vanaf ${fmt.format(state.wallTarget)} cadeaus over de muur`;
    if (unavailable) note = 'Dagstanden tijdelijk niet beschikbaar';
    slide.innerHTML = `
      <div class="dec-fog" aria-hidden="true"></div><div class="dec-snow" aria-hidden="true"></div>
      <div class="dec-flurries" aria-hidden="true">${sparks(28,4,'dec-flake')}</div>
      <header class="dec-heading"><div><span>Incentive december</span><h2>${key==='garage'&&state.ended?'Eindstand':title}</h2></div>${state.preview?'<b class="dec-preview">Voorbeeld</b>':''}</header>
      <div class="dec-stage">${draw(state,rule)}</div>
      <footer class="dec-meta">${esc(note)}</footer>`;
    replay(slide);
  }

  window.DIESTROYERS_DECEMBER_TV = {render,replay};
})();
