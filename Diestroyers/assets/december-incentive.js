(function(root) {
  'use strict';

  const kpis = Object.freeze({
    life: 'Life', insurance: 'Insurance', abo: 'Abonnementen', dsp: 'DSP', spg: 'SPG', srp: 'SRP'
  });
  const keys = Object.keys(kpis);
  const clock = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const longDate = new Intl.DateTimeFormat('nl-BE', {timeZone: 'UTC', day: 'numeric', month: 'long'});
  const decemberDate = /^\d{4}-12-(0[1-9]|[12]\d|3[01])$/;
  const timeOfDay = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  const previewPoints = [18, 15, 13, 11, 8, 6];

  function belgianTime(now = new Date()) {
    const fields = Object.fromEntries(clock.formatToParts(now).map(({type,value}) => [type,value]));
    return {date: `${fields.year}-${fields.month}-${fields.day}`, time: `${fields.hour}:${fields.minute}`};
  }

  function defaults(now) {
    const year = belgianTime(now).date.slice(0,4);
    return {active: false, startDate: `${year}-12-01`, endDate: `${year}-12-24`, revealTime: '08:45', wallTarget: 12};
  }

  function issues(rule) {
    if (!rule) return [];
    return [
      (!decemberDate.test(rule.startDate) || !decemberDate.test(rule.endDate) ||
        rule.startDate.slice(0,4) !== rule.endDate.slice(0,4) || rule.startDate > rule.endDate)
        && 'Kies een start- en einddatum in dezelfde decembermaand.',
      !timeOfDay.test(rule.revealTime) && 'Kies een geldig uur voor het openen van de deurtjes.',
      (!Number.isInteger(rule.wallTarget) || rule.wallTarget < 1 || rule.wallTarget > 500)
        && 'Vul een veilige vlieghoogte tussen 1 en 500 cadeaus in.'
    ].filter(Boolean);
  }

  // A shuffled bag per six December days. Its seed is independent of the
  // configured display dates so extending a campaign never changes old draws.
  function kpiFor(date) {
    const day = Number(date.slice(-2)) - 1;
    let seed = (Number(date.slice(0,4)) * 100 + Math.floor(day / keys.length) + 208) >>> 0;
    const bag = [...keys];
    for (let i=bag.length-1; i>0; i--) {
      seed = (Math.imul(seed,1664525) + 1013904223) >>> 0;
      const j = Math.floor(seed / 4294967296 * (i+1));
      [bag[i],bag[j]] = [bag[j],bag[i]];
    }
    return bag[day % bag.length];
  }

  function doors(rule) {
    const d = new Date(rule.startDate + 'T12:00:00Z');
    const days = [];
    while (d.toISOString().slice(0,10) <= rule.endDate) {
      const date = d.toISOString().slice(0,10);
      days.push({date, day: Number(date.slice(-2)), kpi:kpiFor(date)});
      d.setUTCDate(d.getUTCDate()+1);
    }
    return days;
  }

  const labelDate = date => longDate.format(new Date(date+'T12:00:00Z'));

  function sellers(config, fallback) {
    const rows = Array.isArray(config) && config.length ? config : fallback || [];
    return rows.filter(row => !['nee','no','0','false','inactief'].includes(String(row.Actief ?? row.actief ?? 'ja').trim().toLowerCase()))
      .map(row => ({
        id: String(row.PersoneelsNr ?? row.personeelsNr ?? row.id ?? '').trim(),
        name: String(row.Naam ?? row.naam ?? row.name ?? '').trim(), gifts:0, latestGifts:0
      })).filter(row => row.id && row.name);
  }

  function snapshot(rule, roster, archive, options = {}) {
    const preview = options.preview === true;
    const calendar = doors(rule);
    const sample = calendar[Math.min(9,calendar.length-1)].date;
    const now = preview ? {date:sample,time:'12:00'} : belgianTime(options.now);
    const open = day => day.date < now.date || day.date === now.date && now.time >= (preview ? '00:00' : rule.revealTime);
    const revealed = calendar.filter(open);
    const today = revealed.at(-1);
    const pending = calendar.find(day => day.date === now.date && !open(day));
    const totals = new Map(roster.map(row => [row.id,{...row,gifts:0,latestGifts:0}]));
    const days = archive?.version === 1 ? archive.days || {} : {};
    const counted = revealed.filter(day => Array.isArray(days[day.date]));
    const gaps = new Set(Array.isArray(archive?.gaps) ? archive.gaps : []);
    for (const day of counted) {
      for (const record of days[day.date]) {
        if (!record?.id || !record.name) continue;
        const value = record.counts?.[day.kpi];
        if (!Number.isInteger(value) || value < 0) continue;
        if (!totals.has(record.id)) totals.set(record.id,{id:record.id,name:record.name,gifts:0,latestGifts:0});
        const row = totals.get(record.id);
        row.gifts += value;
        if (day === counted.at(-1)) row.latestGifts = value;
      }
    }
    if(preview) [...totals.values()].forEach((row,i) => {
      row.gifts = previewPoints[i] ?? 4;
      row.latestGifts = (i % 3) + 1;
    });
    const ranking = [...totals.values()].sort((a,b) => b.gifts - a.gifts || a.name.localeCompare(b.name,'nl'));
    return {calendar: calendar.map(day=>({...day,open:open(day)})), today, pending, ranking,
      preview, latestDate: counted.at(-1)?.date, reportedDays: counted.length,
      missingDays: revealed.filter(day=>gaps.has(day.date)&&!Array.isArray(days[day.date])).length,
      wallTarget: rule.wallTarget, ended: now.date > rule.endDate};
  }

  root.DIESTROYERS_DECEMBER = {kpis, defaults, issues, belgianTime, labelDate, sellers, snapshot};
})(typeof window === 'undefined' ? globalThis : window);
