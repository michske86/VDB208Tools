/* The Diestroyers - Coach Engine */
(function(w){
  const D = w.Diestroyers = w.Diestroyers || {};
  function kpiPriorities(){
    const calc = D.calculations;
    return (D.registry?.kpis || []).map(k => calc.priority(k.id)).sort((a,b)=>b.score-a.score);
  }
  function coachingForKpi(kpiId){
    const calc = D.calculations;
    const drivers = calc.impactRows(kpiId).filter(d => d.needed > 0);
    return drivers.map((d,i)=>({
      priority:i+1,
      seller:d.name,
      reason:`Impact ${d.impactShare.toFixed(1)}% · ${Math.round(d.performance)}% van target`,
      action:`${Math.round(d.needed)} extra nodig om target te halen`
    }));
  }
  function coachingForSeller(row){
    const calc = D.calculations;
    return (D.registry?.kpis || []).filter(k=>k.id!=="nps").map(k=>({
      kpi:k.id,
      label:k.label,
      pct:calc.percent(row,k.id,row.Periode),
      action:calc.target(row,k.id,row.Periode) ? `${Math.round(Math.max(0,calc.target(row,k.id,row.Periode)-calc.value(row,k.id)))} extra nodig` : "Geen target"
    })).sort((a,b)=>a.pct-b.pct);
  }
  function dailyFocus(limit=5){
    return kpiPriorities().flatMap(p => coachingForKpi(p.kpi).slice(0,2).map(c => ({...c,kpi:p.kpi,score:p.score}))).sort((a,b)=>b.score-a.score).slice(0,limit);
  }
  D.coach = {kpiPriorities, coachingForKpi, coachingForSeller, dailyFocus};
})(window);
