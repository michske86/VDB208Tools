/* The Diestroyers - Simulation Engine */
(function(w){
  const D = w.Diestroyers = w.Diestroyers || {};
  function simulateKpi(kpiId, adjustments){
    const calc = D.calculations;
    const base = calc.storeRow();
    const current = calc.value(base,kpiId);
    const target = calc.target(base,kpiId);
    const delta = (adjustments || []).reduce((sum,a)=>sum + calc.num(a.delta),0);
    const value = current + delta;
    return {kpi:kpiId,current,target,delta,value,pct:target?value/target*100:0};
  }
  function simulateSellerToTarget(kpiId, sellerRows){
    const calc = D.calculations;
    const adjustments = (sellerRows || []).map(r => ({seller:r.Naam, delta:Math.max(0,calc.target(r,kpiId,r.Periode)-calc.value(r,kpiId))}));
    return simulateKpi(kpiId, adjustments);
  }
  D.simulation = {simulateKpi, simulateSellerToTarget};
})(window);
