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

  // These anchors follow the centres of the thirty hand-painted hatches.
  const doorColumns = [9.4,20.45,31.5,42.53,53.53,64.59];
  const doorRows = [14.9,33.5,52.3,69.7,87.25];

  function calendar(state, rule) {
    const all = state.calendar.map(day=>{
      const active = day.date === state.current?.date;
      const css = !day.eligible ? ' is-rest' : active && day.open ? ' is-open' :
        active ? ' is-current' : day.open ? ' was-open' : '';
      const slot = day.day - 1;
      const x = doorColumns[slot%6], y = doorRows[Math.floor(slot/6)];
      const leaf = active && day.open ? '<i class="dec-hatch" aria-hidden="true"></i>' : '';
      return `<li class="dec-door${css}" style="--door-x:${x}%;--door-y:${y}%;--leaf-x:${(x-4.5)/.91}%;--leaf-y:${(y-8.5)/.83}%"${active?' aria-current="date"':''}>
        ${leaf}<span>${day.day}</span>${day.open?`<small>${kpis[day.kpi]}</small>`:!day.eligible?'<small>Rustdag</small>':''}</li>`;
    }).join('');
    const current = state.pending ? ['Deurtje '+state.pending.day,'Verzegeld',labelDate(state.pending.date)] :
      state.today ? ['KPI van de dag',kpis[state.today.kpi],'1 stuk = 1 cadeau'] :
      state.ended ? ['Incentive afgelopen','Eindstand','Volgende scène: de kerstsleerace'] :
      state.current ? [labelDate(state.current.date),'Rustdag','De deuren blijven vandaag dicht'] :
      ['Eerste deurtje',labelDate(rule.startDate),'De kalender is nog gesloten'];
    return `<div class="dec-calendar">
      <ol class="dec-doors" aria-label="Adventskalender">${all}</ol>
      <div class="dec-portal${state.today?' is-unsealed':''}">
        <div class="dec-portal-light" aria-hidden="true"></div>
        <div class="dec-portal-burst" aria-hidden="true">${sparks(32,9,'dec-shard')}</div>
        <article class="dec-reveal" aria-live="polite"><span>${current[0]}</span><strong>${current[1]}</strong><small>${current[2]}</small></article>
      </div></div>`;
  }

  function race(state) {
    const best = state.ranking[0]?.gifts ?? 0;
    const leaders = best > 0 ? state.ranking.filter(row => row.gifts === best).length : 0;
    const falling = state.ranking.length - leaders;
    const caption = !leaders ? 'Startklaar' : leaders > 1 ?
      (state.ended?'Gedeelde winst':'Gedeelde leiding') : '';
    const cards = state.ranking.map((row,i)=>{
      const lead = i < leaders;
      const index = lead ? i : i-leaders;
      const span = index / Math.max(1,falling-1);
      const x = lead ? leaders===1 ? 68 : 45+(index%3)*17 : 22+span*18;
      const y = lead ? leaders===1 ? 12 : 13+Math.floor(index/3)*13 : 33+span*53;
      const status = lead ? 'escapes' : leaders ? 'doomed' : 'waiting';
      const delta = row.latestGifts > 0 ?
        `<em aria-label="${row.latestGifts} cadeaus erbij op de laatste dag">+${fmt.format(row.latestGifts)}</em>` : '';
      return `<article class="dec-racer ${status}" style="--track:${x}%;--lane:${y}%;--flight-delay:${index*180}ms;--lean:${2+span*10}deg" data-gifts="${row.gifts}">
        <div class="dec-flight" aria-hidden="true"><div class="dec-racer-scene">${sled(row.gifts)}</div></div>
        <span class="dec-name"><span>${esc(row.name)}</span> <b>${fmt.format(row.gifts)}</b>${delta}</span>
      </article>`;
    }).join('');
    const fire = leaders && falling ? `<div class="dec-wall-flare" aria-hidden="true" style="--fire-duration:${1000+(falling-1)*180}ms">
      <img class="dec-mouth-fire" src="${files}hellfire.webp" alt="">
      ${sparks(32,8,'dec-shard')}
    </div>` : '';
    return `<div class="dec-race">${cards}
      ${caption?`<div class="dec-race-caption">${caption}</div>`:''}
      ${fire}</div>`;
  }

  const panels = [
    {key:'calendar',title:'Adventskalender',draw:calendar},
    {key:'race',title:'De kerstsleerace',draw:race}
  ];

  function replay(slide) {
    if (!slide || slide.hidden) return;
    clearTimeout(replayTimer);
    slide.classList.remove('dec-replaying');
    void slide.offsetWidth;
    slide.classList.add('dec-replaying');
    replayTimer=setTimeout(()=>slide.classList.remove('dec-replaying'),4550);
  }

  function render(slide, index, state, rule, unavailable) {
    const {key,title,draw} = panels[index];
    slide.dataset.scene = key;
    let note = state.latestDate ? `Laatste dagstand ${labelDate(state.latestDate)}` : 'Cadeaus volgen na Dagstart';
    if (state.preview) note = 'Voorbeeldstand';
    else if (state.missingDays) note += ` · ${state.missingDays} ${state.missingDays===1?'dagstand ontbreekt':'dagstanden ontbreken'}`;
    if (unavailable) note = 'Dagstanden tijdelijk niet beschikbaar';
    slide.innerHTML = `
      <div class="dec-fog" aria-hidden="true"></div>
      <div class="dec-flurries" aria-hidden="true">${sparks(28,4,'dec-flake')}</div>
      <header class="dec-heading"><div><span>Incentive december</span><h2>${key==='race'&&state.ended?'Eindstand':title}</h2></div>${state.preview?'<b class="dec-preview">Voorbeeld</b>':''}</header>
      <div class="dec-stage">${draw(state,rule)}</div>
      <footer class="dec-meta">${esc(note)}</footer>`;
    replay(slide);
  }

  window.DIESTROYERS_DECEMBER_TV = {render,replay,sceneCount:panels.length};
})();
