/* Analyse van enquêtegegevens en opvolging van coachingsafspraken op dit toestel. */
(() => {
  "use strict";
  const data = window.ScorebladData;
  const review = window.ScorebladReview;
  const storageKey = "diestroyers.scoreblad.coaching.v1";
  const themes = [
    {key:"wachttijd",label:"Wachttijd",pattern:/\b(?:wacht\w*|aanschuiv\w*|aangeschoven|wachtrij\w*|rij aan de kassa|file aan de kassa)\b/iu},
    {key:"uitleg",label:"Uitleg en advies",pattern:/\b(?:uitleg\w*|uitgelegd|advis\w*|advies|inlichtingen|toelicht\w*|kennis van zaken|geïnformeerd)\b/iu},
    {key:"verwachting",label:"Verwachting en belofte",pattern:/\b(?:beloof\w*|belofte\w*|verwacht\w*|prijsverschil\w*|laagste prijs\w*|prijs\s?garantie\w*|akte van vertrouwen)\b/iu},
    {key:"opvolging",label:"Opvolging en service",pattern:/\b(?:opvolg\w*|terugbel\w*|teruggebeld|levering\w*|herstelling\w*|reparatie\w*|dienst na verkoop|retour\w*|omruil\w*|omgeruild)\b/iu},
    {key:"onthaal",label:"Onthaal en vriendelijkheid",pattern:/\b(?:vriendelijk\w*|onvriendelijk\w*|beleefd\w*|onbeleefd\w*|onthaal\w*|begroet\w*|behulpzaam\w*|luister\w*)\b/iu}
  ];
  const metricThemes = {trust:"verwachting",price:"verwachting",information:"uitleg",wait:"wachttijd",friendly:"onthaal"};
  const matches = (comment,theme) => theme.pattern.test(String(comment.comment || "").normalize("NFC"));
  const isMonth = value => /^\d{4}-(?:0[1-9]|1[0-2])$/.test(value || "");
  function shiftMonth(period,offset) {
    const date = new Date(period+"-01T00:00:00Z");
    date.setUTCMonth(date.getUTCMonth()+offset);
    return date.toISOString().slice(0,7);
  }
  function snapshot(entity,key,period,bucket="month") {
    if (key==="nps") {
      const row = data.npsProfile(entity)?.[bucket]?.[period];
      return row?.cards>0 && Number.isFinite(row.nps) ? {value:row.nps,count:row.cards} : null;
    }
    const row = period===data.avv.latestPeriod ? data.avvProfile(entity)?.[bucket]?.[key] : null;
    return row?.responses>0 && Number.isFinite(row.value) ? {value:row.value,count:row.responses} : null;
  }
  function previousClosed(period) {
    return isMonth(period) ? shiftMonth([period,review.activeMonth()].sort()[0],-1) : null;
  }
  function personalSignals(entity,definitions,period,bucket) {
    const historyEnd = previousClosed(period);
    const readings = definitions.flatMap(({key,label,target})=>{
      const current = snapshot(entity,key,period,bucket);
      if (!current || current.count<review.minimumChances || !Number.isFinite(target)) return [];
      const positive = current.value>=target;
      const previous = historyEnd ? [historyEnd,shiftMonth(historyEnd,-1)]
        .filter(month=>bucket==="month" || month.slice(0,4)===period.slice(0,4)).map(month=>({
        month,reading:snapshot(entity,key,month,bucket)
      })).filter(item=>item.reading?.count>=review.minimumChances) : [];
      // Overlapping YTD readings provide context. They do not count as repeated months.
      const repeated = bucket==="month" ? previous.filter(item=>(item.reading.value>=target)===positive).length : 0;
      return [{key,label,target,positive,current,previous,repeated}];
    }).sort((a,b)=>b.repeated-a.repeated || b.current.count-a.current.count);
    return {strength:readings.find(row=>row.positive),focus:readings.find(row=>!row.positive)};
  }
  function readAgreements() {
    try {
      const raw = localStorage.getItem(storageKey);
      const records = raw ? JSON.parse(raw) : [];
      return Array.isArray(records) ? records : null;
    } catch { return null; }
  }
  function writeAgreement(record) {
    const records = readAgreements();
    if (!records) return false;
    const index = records.findIndex(item=>item.id===record.id);
    if (index===-1) records.push(record);
    else records[index]=record;
    try {
      localStorage.setItem(storageKey,JSON.stringify(records));
      return true;
    } catch { return false; }
  }
  window.ScorebladKlantbeleving = {
    themes,metricThemes,matches,isMonth,shiftMonth,snapshot,previousClosed,personalSignals,readAgreements,writeAgreement
  };
})();
